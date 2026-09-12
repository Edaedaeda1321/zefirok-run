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
  SCHEMA_CONTRACT_MIGRATION,
  SCHEMA_CONTRACT_VERSION
} from './schema-contract.mjs';
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
  for (const relative of ['scripts/schema-contract.mjs', `migrations/${SCHEMA_CONTRACT_MIGRATION}`]) {
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
  for (const name of runtimeTables) {
    if (!migrationHasObject(corpus.sql, 'table', name)) problems.push(`runtime CREATE TABLE без migration: ${name}`);
  }
  for (const name of CANONICAL_RUNTIME_TABLES) {
    const migration = await readFile(path.join(root, 'migrations', SCHEMA_CONTRACT_MIGRATION), 'utf8');
    if (!migrationHasObject(migration, 'table', name)) problems.push(`${SCHEMA_CONTRACT_MIGRATION}: нет canonical table ${name}`);
  }

  const runtimeIndexes = runtimeCreateNames(worker, 'index');
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

  for (const name of REQUIRED_INDEXES) {
    if (!migrationHasObject(corpus.sql, 'index', name)) problems.push(`обязательный index отсутствует в migrations: ${name}`);
  }
  for (const name of REQUIRED_TRIGGERS) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`CREATE\\s+TRIGGER\\s+IF\\s+NOT\\s+EXISTS\\s+[\\"\\x60]?${escaped}[\\"\\x60]?\\b`, 'i').test(corpus.sql)) {
      problems.push(`обязательный trigger отсутствует в migrations: ${name}`);
    }
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
  const quickRows = quickCheck ? await remoteSql(root, database, 'PRAGMA quick_check') : [];
  return { schemaRows, columnRows, contractRows, healthRows, quickRows, quickCheckRan: quickCheck };
}

function validateRemoteSnapshot(snapshot) {
  const problems = [];
  const missingRepairable = [];
  const objects = new Map();
  for (const row of snapshot.schemaRows) {
    const key = `${String(row.type || '').toLowerCase()}:${String(row.name || '')}`;
    objects.set(key, row);
  }

  const requiredTables = new Set([
    ...REQUIRED_COLUMN_SPECS.map(item => item.table),
    ...REQUIRED_SQL_FRAGMENTS.filter(item => item.type === 'table').map(item => item.name)
  ]);
  for (const table of requiredTables) {
    if (!objects.has(`table:${table}`)) problems.push(`нет таблицы ${table}`);
  }
  for (const index of REQUIRED_INDEXES) if (!objects.has(`index:${index}`)) problems.push(`нет index ${index}`);
  for (const trigger of REQUIRED_TRIGGERS) if (!objects.has(`trigger:${trigger}`)) problems.push(`нет trigger ${trigger}`);

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

export async function checkRemoteDatabaseSchema({ root = process.cwd(), database = D1_DATABASE_NAME, repair = false, quickCheck = false } = {}) {
  let snapshot = await fetchRemoteSchema(root, database, { quickCheck });
  let result = validateRemoteSnapshot(snapshot);

  if (result.missingRepairable.length && repair) {
    await repairCompatibilityColumns(root, database, result.missingRepairable);
    snapshot = await fetchRemoteSchema(root, database, { quickCheck });
    result = validateRemoteSnapshot(snapshot);
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
  if (repair && !remote) throw new Error('--repair разрешен только вместе с --remote.');
  if (!contractOnly && !remote) {
    throw new Error('Укажите --contract-only для локальной проверки или --remote для Production D1.');
  }

  const staticResult = await checkStaticSchemaContract(root);
  console.log(
    `Schema contract static OK: ${staticResult.runtimeTables} runtime table(s), ` +
    `${staticResult.runtimeIndexes} runtime index(es), ${staticResult.compatibilityColumns} compatibility column(s).`
  );
  if (remote) {
    await checkRemoteDatabaseSchema({ root, repair, quickCheck });
    console.log(
      `Production D1 schema contract v${SCHEMA_CONTRACT_VERSION} OK; read probe=ok` +
      (quickCheck ? '; PRAGMA quick_check=ok.' : '.')
    );
  }
}

if (isMainModule()) {
  main().catch(error => {
    console.error(`\nSCHEMA CHECK FAILED\n${error?.message || error}`);
    process.exitCode = 1;
  });
}
