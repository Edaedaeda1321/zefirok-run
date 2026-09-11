#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  D1_DATABASE_NAME,
  LEGACY_DUPLICATE_MIGRATION_GROUPS,
  SCHEMA_CONTRACT_MIGRATION
} from './schema-contract.mjs';

const MIGRATION_RE = /^(\d{4})_[A-Za-z0-9][A-Za-z0-9_.-]*\.sql$/;

function isMainModule() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

export async function listMigrationFiles(root = process.cwd()) {
  const dir = path.join(root, 'migrations');
  const names = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort();
  const invalid = names.filter(name => !MIGRATION_RE.test(name));
  if (invalid.length) {
    throw new Error(`Некорректные имена migration: ${invalid.join(', ')}`);
  }
  return names;
}

function migrationNumber(name) {
  return MIGRATION_RE.exec(name)?.[1] || '';
}

export async function migrationFingerprint(root = process.cwd(), names = null) {
  const files = names || await listMigrationFiles(root);
  const hash = createHash('sha256');
  for (const name of files) {
    hash.update(name);
    hash.update('\0');
    hash.update(await readFile(path.join(root, 'migrations', name)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

export async function checkLocalMigrationHistory(root = process.cwd()) {
  const names = await listMigrationFiles(root);
  if (!names.includes(SCHEMA_CONTRACT_MIGRATION)) {
    throw new Error(`Отсутствует обязательная migration ${SCHEMA_CONTRACT_MIGRATION}`);
  }

  const groups = new Map();
  for (const name of names) {
    const number = migrationNumber(name);
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push(name);
  }

  const badDuplicates = [];
  for (const [number, files] of groups) {
    if (files.length < 2) continue;
    const allowed = [...(LEGACY_DUPLICATE_MIGRATION_GROUPS[number] || [])].sort();
    const actual = [...files].sort();
    if (allowed.length !== actual.length || allowed.some((name, index) => name !== actual[index])) {
      badDuplicates.push(`${number}: ${actual.join(', ')}`);
    }
  }
  if (badDuplicates.length) {
    throw new Error(`Обнаружены повторяющиеся номера migration, которые не входят в legacy allowlist:\n  - ${badDuplicates.join('\n  - ')}`);
  }

  const contractNumber = Number(migrationNumber(SCHEMA_CONTRACT_MIGRATION));
  const newer = names.filter(name => Number(migrationNumber(name)) > contractNumber);
  const newerNumbers = new Map();
  for (const name of newer) {
    const number = migrationNumber(name);
    newerNumbers.set(number, (newerNumbers.get(number) || 0) + 1);
  }
  const duplicateNewNumbers = [...newerNumbers].filter(([, count]) => count > 1).map(([number]) => number);
  if (duplicateNewNumbers.length) {
    throw new Error(`Новые migration не могут повторять номер: ${duplicateNewNumbers.join(', ')}`);
  }

  return {
    names,
    count: names.length,
    highestNumber: Math.max(...names.map(name => Number(migrationNumber(name)))),
    fingerprint: await migrationFingerprint(root, names)
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

export async function listPendingRemoteMigrations({ root = process.cwd(), database = D1_DATABASE_NAME } = {}) {
  const { stdout, stderr } = await run('npx', ['wrangler', 'd1', 'migrations', 'list', database, '--remote'], { cwd: root });
  const text = `${stdout}\n${stderr}`;
  const names = [...new Set(text.match(/\b\d{4}_[A-Za-z0-9][A-Za-z0-9_.-]*\.sql\b/g) || [])].sort();
  return { names, raw: text.trim() };
}

export async function assertNoPendingRemoteMigrations(options = {}) {
  const pending = await listPendingRemoteMigrations(options);
  if (pending.names.length) {
    const lines = pending.names.map(name => `  - ${name}`).join('\n');
    throw new Error(
      `Production D1 имеет непримененные migration:\n${lines}\n\n` +
      `Сначала примените их:\n  npx wrangler d1 migrations apply ${options.database || D1_DATABASE_NAME} --remote\n` +
      `Затем снова запустите ./update.sh.`
    );
  }
  return pending;
}

async function main() {
  const root = process.cwd();
  const local = await checkLocalMigrationHistory(root);
  console.log(`Migration history OK: ${local.count} file(s), fingerprint ${local.fingerprint.slice(0, 12)}.`);
  if (process.argv.includes('--remote')) {
    await assertNoPendingRemoteMigrations({ root });
    console.log('Remote D1 migration gate OK: pending migrations not found.');
  }
}

if (isMainModule()) {
  main().catch(error => {
    console.error(`\nMIGRATION CHECK FAILED\n${error?.message || error}`);
    process.exitCode = 1;
  });
}
