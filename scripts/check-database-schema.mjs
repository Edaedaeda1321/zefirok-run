#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  CANONICAL_RUNTIME_TABLES,
  D1_DATABASE_NAME,
  REPAIRABLE_COMPATIBILITY_COLUMNS,
  REQUIRED_COLUMN_SPECS,
  REQUIRED_INDEXES,
  REQUIRED_SQL_FRAGMENTS,
  REQUIRED_TRIGGERS,
  RUNTIME_CANONICALIZATION_MIGRATION,
  PLATFORM_HARDENING_MIGRATION,
  SCHEMA_CONTRACT_MIGRATION,
  SCHEMA_CONTRACT_VERSION
} from './schema-contract.mjs';
import {
  RUNTIME_SCHEMA_REQUIRED_TABLES,
  RUNTIME_SCHEMA_REQUIRED_INDEXES,
  ACCOUNT_REVISION_REQUIRED_TRIGGERS,
  RUNTIME_COMPATIBILITY_REQUIRED_COLUMNS
} from '../src/runtime-schema-manifest.mjs';
import { checkLocalMigrationHistory } from './check-migrations.mjs';

function isMainModule() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function compactSql(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replaceAll('"', '').replaceAll('`', '');
}

function normalizeDefault(value) {
  let text = String(value ?? '').trim();
  while (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1).trim();
  return text.replace(/\s+/g, ' ').toLowerCase();
}

function parseDefinition(definition) {
  const text = String(definition || '').trim();
  const type = (text.match(/^([A-Za-z0-9_]+)/)?.[1] || '').toUpperCase();
  const notNull = /\bNOT\s+NULL\b/i.test(text);
  const defaultMatch = text.match(/\bDEFAULT\s+(.+)$/i);
  return {
    type,
    notNull,
    hasDefault: Boolean(defaultMatch),
    defaultValue: defaultMatch ? normalizeDefault(defaultMatch[1]) : ''
  };
}

async function migrationCorpus(root) {
  const names = (await readdir(path.join(root, 'migrations'))).filter(name => name.endsWith('.sql')).sort();
  const chunks = [];
  for (const name of names) chunks.push(`-- FILE ${name}\n${await readFile(path.join(root, 'migrations', name), 'utf8')}`);
  return { names, sql: chunks.join('\n\n') };
}

export async function schemaContractFingerprint(root = process.cwd()) {
  const hash = createHash('sha256');
  const files = [
    'scripts/schema-contract.mjs',
    'src/runtime-schema-manifest.mjs',
    `migrations/${RUNTIME_CANONICALIZATION_MIGRATION}`,
    `migrations/${PLATFORM_HARDENING_MIGRATION}`,
    `migrations/${SCHEMA_CONTRACT_MIGRATION}`
  ];
  for (const relative of files) {
    hash.update(relative);
    hash.update('\0');
    hash.update(await readFile(path.join(root, relative)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function runtimeCreateNames(worker, type) {
  const expression = type === 'table'
    ? /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi
    : /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  return [...new Set([...worker.matchAll(expression)].map(match => match[1]))].sort();
}

function migrationTriggerNames(sql) {
  return [...new Set([...String(sql || '').matchAll(/CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+[\"\x60]?([A-Za-z_][A-Za-z0-9_]*)/gi)].map(match => match[1]))].sort();
}

function compareManifest(label, actual, declared, problems) {
  const actualSet = new Set(actual);
  const declaredSet = new Set(declared);
  for (const name of actual) if (!declaredSet.has(name)) problems.push(`${label}: runtime object отсутствует в manifest: ${name}`);
  for (const name of declared) if (!actualSet.has(name)) problems.push(`${label}: manifest object больше не создаётся Worker: ${name}`);
}

export async function buildRequiredSchemaManifest(root = process.cwd()) {
  const hardeningSql = await readFile(path.join(root, 'migrations', PLATFORM_HARDENING_MIGRATION), 'utf8');
  const hardeningTriggers = migrationTriggerNames(hardeningSql);
  const triggers = [...new Set([...REQUIRED_TRIGGERS, ...hardeningTriggers])].sort();
  return {
    tables:[...RUNTIME_SCHEMA_REQUIRED_TABLES],
    indexes:[...new Set([...RUNTIME_SCHEMA_REQUIRED_INDEXES, ...REQUIRED_INDEXES])].sort(),
    triggers,
    accountRevisionTriggers:[...ACCOUNT_REVISION_REQUIRED_TRIGGERS],
    hardeningTriggers
  };
}

function migrationHasObject(corpusSql, type, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = type === 'table'
    ? new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+[\\"\\x60]?${escaped}[\\"\\x60]?\\b`, 'i')
    : new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+[\\"\\x60]?${escaped}[\\"\\x60]?\\b`, 'i');
  return expression.test(corpusSql);
}

function extractCompatibilityColumns(worker) {
  const start = worker.indexOf('async function ensureRuntimeCompatibilitySchema');
  if (start < 0) throw new Error('Worker: не найдена ensureRuntimeCompatibilitySchema().');
  const listStart = worker.indexOf('const columns = [', start);
  const listEnd = worker.indexOf('\n    ];', listStart);
  if (listStart < 0 || listEnd < 0) throw new Error('Worker: не найден compatibility columns list.');
  const block = worker.slice(listStart, listEnd + 7);
  const expression = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(?:"([^"]*)"|'([^']*)')\s*\]/g;
  return [...block.matchAll(expression)].map(match => ({
    table: match[1],
    column: match[2],
    definition: match[3] ?? match[4] ?? ''
  }));
}

function tupleKey(item) {
  return `${item.table}.${item.column}:${String(item.definition).replace(/\s+/g, ' ').trim()}`;
}

export async function checkStaticSchemaContract(root = process.cwd()) {
  const migrationState = await checkLocalMigrationHistory(root);
  const worker = await readFile(path.join(root, 'src', 'worker.js'), 'utf8');
  const corpus = await migrationCorpus(root);
  const problems = [];

  const runtimeTables = runtimeCreateNames(worker, 'table');
  compareManifest('tables', runtimeTables, RUNTIME_SCHEMA_REQUIRED_TABLES, problems);
  for (const name of runtimeTables) {
    if (!migrationHasObject(corpus.sql, 'table', name)) problems.push(`runtime CREATE TABLE без migration: ${name}`);
  }
  const canonicalMigration = await readFile(path.join(root, 'migrations', RUNTIME_CANONICALIZATION_MIGRATION), 'utf8');
  for (const name of CANONICAL_RUNTIME_TABLES) {
    if (!migrationHasObject(canonicalMigration, 'table', name)) problems.push(`${RUNTIME_CANONICALIZATION_MIGRATION}: нет canonical table ${name}`);
  }

  const runtimeIndexes = runtimeCreateNames(worker, 'index');
  compareManifest('indexes', runtimeIndexes, RUNTIME_SCHEMA_REQUIRED_INDEXES, problems);
  for (const name of runtimeIndexes) {
    if (!migrationHasObject(corpus.sql, 'index', name)) problems.push(`runtime CREATE INDEX без migration: ${name}`);
  }

  const currentColumns = extractCompatibilityColumns(worker);
  const declaredKeys = new Set(REPAIRABLE_COMPATIBILITY_COLUMNS.map(tupleKey));
  const currentKeys = new Set(currentColumns.map(tupleKey));
  for (const item of currentColumns) {
    if (!declaredKeys.has(tupleKey(item))) problems.push(`runtime compatibility column не описана contract: ${tupleKey(item)}`);
  }
  for (const item of REPAIRABLE_COMPATIBILITY_COLUMNS) {
    if (!currentKeys.has(tupleKey(item))) problems.push(`contract compatibility column больше не совпадает с Worker: ${tupleKey(item)}`);
  }
  const runtimeColumnKeys=new Set(RUNTIME_COMPATIBILITY_REQUIRED_COLUMNS.map(item=>`${item.table}.${item.column}`));
  const currentColumnKeys=new Set(currentColumns.map(item=>`${item.table}.${item.column}`));
  const contractColumnKeys=new Set(REPAIRABLE_COMPATIBILITY_COLUMNS.map(item=>`${item.table}.${item.column}`));
  for (const key of currentColumnKeys) if (!runtimeColumnKeys.has(key)) problems.push(`runtime compatibility column отсутствует в runtime manifest: ${key}`);
  for (const key of runtimeColumnKeys) if (!currentColumnKeys.has(key)) problems.push(`runtime manifest compatibility column больше не совпадает с Worker: ${key}`);
  for (const key of runtimeColumnKeys) if (!contractColumnKeys.has(key)) problems.push(`runtime manifest compatibility column отсутствует в schema contract: ${key}`);

  const manifest = await buildRequiredSchemaManifest(root);
  for (const name of manifest.indexes) {
    if (!migrationHasObject(corpus.sql, 'index', name)) problems.push(`обязательный index отсутствует в migrations: ${name}`);
  }
  const corpusTriggers = new Set(migrationTriggerNames(corpus.sql));
  for (const name of manifest.triggers) {
    if (!corpusTriggers.has(name)) problems.push(`обязательный trigger отсутствует в migrations: ${name}`);
  }
  for (const name of ACCOUNT_REVISION_REQUIRED_TRIGGERS) {
    if (!corpusTriggers.has(name)) problems.push(`accountRevision trigger отсутствует в migrations: ${name}`);
  }
  if (!corpus.sql.includes('zefirok_schema_contract')) problems.push('schema contract marker table отсутствует в migrations.');

  if (problems.length) {
    throw new Error(`Schema contract drift:\n  - ${problems.join('\n  - ')}`);
  }

  return {
    migrationFingerprint: migrationState.fingerprint,
    contractFingerprint: await schemaContractFingerprint(root),
    runtimeTables: runtimeTables.length,
    runtimeIndexes: runtimeIndexes.length,
    requiredTriggers: manifest.triggers.length,
    accountRevisionTriggers: manifest.accountRevisionTriggers.length,
    compatibilityColumns: currentColumns.length
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd || process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} завершился с кодом ${code}\n${stderr || stdout}`));
    });
  });
}

function parseWranglerJson(text) {
  const source = String(text || '').trim();
  try { return JSON.parse(source); } catch {}
  const starts = [source.indexOf('['), source.indexOf('{')].filter(index => index >= 0).sort((a, b) => a - b);
  for (const start of starts) {
    for (let end = source.length; end > start; end -= 1) {
      const char = source[end - 1];
      if (char !== ']' && char !== '}') continue;
      try { return JSON.parse(source.slice(start, end)); } catch {}
    }
  }
  throw new Error(`Wrangler вернул неожиданный JSON:\n${source.slice(0, 1000)}`);
}

function collectResultRows(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectResultRows(item, out);
    return out;
  }
  if (Array.isArray(value.results)) out.push(...value.results);
  for (const [key, child] of Object.entries(value)) {
    if (key === 'results') continue;
    if (child && typeof child === 'object') collectResultRows(child, out);
  }
  return out;
}

async function remoteSql(root, database, sql) {
  const { stdout } = await run('npx', ['--yes', 'wrangler@4.131.1', 'd1', 'execute', database, '--remote', '--json', '--command', sql], { cwd: root });
  return collectResultRows(parseWranglerJson(stdout));
}

function quoteSqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const REMOTE_SCHEMA_PRAGMA_BATCH_SIZE = 5;

function isRemoteQuickCheckResourceLimit(error) {
  const text = String(error?.message || error || '');
  return /SQLITE_NOMEM|out of memory|code:\s*7500|\"code\"\s*:\s*7500/i.test(text);
}

async function fetchRemoteSchema(root, database, { quickCheck = false } = {}) {
  const schemaRows = await remoteSql(root, database,
    "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type,name"
  );
  const tables = [...new Set(REQUIRED_COLUMN_SPECS.map(item => item.table))].sort();
  const columnRows = [];
  for (let offset = 0; offset < tables.length; offset += REMOTE_SCHEMA_PRAGMA_BATCH_SIZE) {
    const batch = tables.slice(offset, offset + REMOTE_SCHEMA_PRAGMA_BATCH_SIZE);
    const columnSql = batch.map(table =>
      `SELECT ${quoteSqlLiteral(table)} AS table_name,name AS column_name,type,\"notnull\" AS not_null,dflt_value,pk FROM pragma_table_info(${quoteSqlLiteral(table)})`
    ).join(' UNION ALL ');
    if (columnSql) columnRows.push(...await remoteSql(root, database, columnSql));
  }
  let contractRows = [];
  try {
    contractRows = await remoteSql(root, database,
      "SELECT contract_version,migration_name,updated_at,updated_by FROM zefirok_schema_contract WHERE contract_key='main'"
    );
  } catch {}
  const healthRows = await remoteSql(root, database, 'SELECT 1 AS ok');
  let quickRows = [];
  let quickCheckStatus = quickCheck ? 'pending' : 'not_requested';
  let quickCheckWarning = '';
  if (quickCheck) {
    try {
      quickRows = await remoteSql(root, database, 'PRAGMA quick_check');
      quickCheckStatus = 'completed';
    } catch (error) {
      if (!isRemoteQuickCheckResourceLimit(error)) throw error;
      quickCheckStatus = 'skipped_resource_limit';
      quickCheckWarning = 'Cloudflare D1 rejected whole-database PRAGMA quick_check with SQLITE_NOMEM/code 7500. Schema/object validation continues; DB Doctor remains the data-integrity gate.';
      console.warn(`REMOTE QUICK CHECK WARNING: ${quickCheckWarning}`);
    }
  }
  return { schemaRows, columnRows, contractRows, healthRows, quickRows, quickCheckRan: quickCheckStatus === 'completed', quickCheckStatus, quickCheckWarning };
}

function validateRemoteSnapshot(snapshot, manifest, { ignoreContractMarker = false } = {}) {
  const problems = [];
  const missingRepairable = [];
  const objects = new Map();
  for (const row of snapshot.schemaRows) {
    const key = `${String(row.type || '').toLowerCase()}:${String(row.name || '')}`;
    objects.set(key, row);
  }

  const requiredTables = new Set([
    ...manifest.tables,
    ...REQUIRED_COLUMN_SPECS.map(item => item.table),
    ...REQUIRED_SQL_FRAGMENTS.filter(item => item.type === 'table').map(item => item.name)
  ]);
  for (const table of requiredTables) {
    if (!objects.has(`table:${table}`)) problems.push(`нет таблицы ${table}`);
  }
  for (const index of manifest.indexes) if (!objects.has(`index:${index}`)) problems.push(`нет index ${index}`);
  for (const trigger of manifest.triggers) if (!objects.has(`trigger:${trigger}`)) problems.push(`нет trigger ${trigger}`);

  const columns = new Map();
  for (const row of snapshot.columnRows) columns.set(`${row.table_name}.${row.column_name}`, row);
  const repairableKeys = new Set(REPAIRABLE_COMPATIBILITY_COLUMNS.map(item => `${item.table}.${item.column}`));
  for (const spec of REQUIRED_COLUMN_SPECS) {
    const key = `${spec.table}.${spec.column}`;
    const row = columns.get(key);
    if (!row) {
      if (repairableKeys.has(key) && objects.has(`table:${spec.table}`)) missingRepairable.push(spec);
      else problems.push(`нет колонки ${key}`);
      continue;
    }
    const expected = parseDefinition(spec.definition);
    const actualType = String(row.type || '').toUpperCase();
    if (expected.type && actualType !== expected.type) problems.push(`${key}: type ${actualType || '(empty)'} != ${expected.type}`);
    if (expected.notNull && Number(row.not_null || 0) !== 1 && Number(row.pk || 0) !== 1) problems.push(`${key}: отсутствует NOT NULL`);
    if (expected.hasDefault && normalizeDefault(row.dflt_value) !== expected.defaultValue) {
      problems.push(`${key}: DEFAULT ${String(row.dflt_value ?? 'NULL')} != ${expected.defaultValue}`);
    }
  }

  for (const spec of REQUIRED_SQL_FRAGMENTS) {
    const row = objects.get(`${spec.type}:${spec.name}`);
    if (!row) continue;
    const actual = compactSql(row.sql);
    for (const fragment of spec.fragments) {
      if (!actual.includes(compactSql(fragment))) problems.push(`${spec.type} ${spec.name}: отсутствует SQL contract fragment ${fragment}`);
    }
  }

  if (!ignoreContractMarker) {
    const contract = snapshot.contractRows[0];
    if (!contract) problems.push('нет записи zefirok_schema_contract/main');
    else {
      if (Number(contract.contract_version || 0) < SCHEMA_CONTRACT_VERSION) {
        problems.push(`schema contract version ${contract.contract_version} < required ${SCHEMA_CONTRACT_VERSION}`);
      }
      if (String(contract.migration_name || '') !== SCHEMA_CONTRACT_MIGRATION) {
        problems.push(`schema contract migration ${contract.migration_name || '(empty)'} != ${SCHEMA_CONTRACT_MIGRATION}`);
      }
    }
  }

  const healthOk = snapshot.healthRows.some(row => Number(row.ok) === 1);
  if (!healthOk) problems.push('lightweight read probe failed');

  if (snapshot.quickCheckRan) {
    const quickValues = snapshot.quickRows.flatMap(row => Object.values(row)).map(value => String(value).toLowerCase());
    if (!quickValues.length || quickValues.some(value => value !== 'ok')) {
      problems.push(`PRAGMA quick_check != ok (${quickValues.join(', ') || 'no result'})`);
    }
  }

  return { problems, missingRepairable };
}

async function repairCompatibilityColumns(root, database, specs) {
  for (const spec of specs) {
    const sql = `ALTER TABLE ${quoteIdentifier(spec.table)} ADD COLUMN ${quoteIdentifier(spec.column)} ${spec.definition}`;
    console.log(`REPAIR ${spec.table}.${spec.column}`);
    await remoteSql(root, database, sql);
  }
}

export async function checkRemoteDatabaseSchema({ root = process.cwd(), database = D1_DATABASE_NAME, repair = false, quickCheck = false, ignoreContractMarker = false } = {}) {
  const manifest = await buildRequiredSchemaManifest(root);
  let snapshot = await fetchRemoteSchema(root, database, { quickCheck });
  let result = validateRemoteSnapshot(snapshot, manifest, { ignoreContractMarker });

  if (result.missingRepairable.length && repair) {
    await repairCompatibilityColumns(root, database, result.missingRepairable);
    snapshot = await fetchRemoteSchema(root, database, { quickCheck });
    result = validateRemoteSnapshot(snapshot, manifest, { ignoreContractMarker });
  }

  if (result.missingRepairable.length) {
    const missing = result.missingRepairable.map(item => `${item.table}.${item.column}`).join('\n  - ');
    throw new Error(
      `Production D1 не хватает legacy compatibility columns:\n  - ${missing}\n\n` +
      `Они не исправляются автоматически во время deploy. После проверки можно выполнить:\n` +
      `  node scripts/check-database-schema.mjs --remote --repair\n` +
      `и затем снова ./update.sh.`
    );
  }
  if (result.problems.length) {
    throw new Error(`Production D1 не соответствует schema contract:\n  - ${result.problems.join('\n  - ')}`);
  }

  return { snapshot, ...result };
}

async function main() {
  const root = process.cwd();
  const contractOnly = process.argv.includes('--contract-only');
  const remote = process.argv.includes('--remote');
  const repair = process.argv.includes('--repair');
  const quickCheck = process.argv.includes('--quick-check');
  const auditCurrent = process.argv.includes('--audit-current');
  if (repair && !remote) throw new Error('--repair разрешен только вместе с --remote.');
  if (auditCurrent && !remote) throw new Error('--audit-current разрешен только вместе с --remote.');
  if (auditCurrent && repair) throw new Error('--audit-current является read-only режимом и несовместим с --repair.');
  if (!contractOnly && !remote) {
    throw new Error('Укажите --contract-only для локальной проверки или --remote для Production D1.');
  }

  const staticResult = await checkStaticSchemaContract(root);
  console.log(
    `Schema contract static OK: ${staticResult.runtimeTables} runtime table(s), ` +
    `${staticResult.runtimeIndexes} runtime index(es), ${staticResult.requiredTriggers} required trigger(s), ` +
    `${staticResult.accountRevisionTriggers} account-revision trigger(s), ${staticResult.compatibilityColumns} compatibility column(s).`
  );
  if (remote) {
    const remoteResult = await checkRemoteDatabaseSchema({ root, repair, quickCheck, ignoreContractMarker:auditCurrent });
    const quickSuffix = !quickCheck ? '.'
      : remoteResult.snapshot.quickCheckStatus === 'skipped_resource_limit'
        ? '; whole-DB PRAGMA quick_check skipped because Cloudflare hit its memory limit; schema audit still passed.'
        : '; PRAGMA quick_check=ok.';
    console.log(
      (auditCurrent
        ? `Production D1 object audit OK; schema marker intentionally ignored; read probe=ok`
        : `Production D1 schema contract v${SCHEMA_CONTRACT_VERSION} OK; read probe=ok`) + quickSuffix
    );
  }
}

if (isMainModule()) {
  main().catch(error => {
    console.error(`\nSCHEMA CHECK FAILED\n${error?.message || error}`);
    process.exitCode = 1;
  });
}
