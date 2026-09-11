#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import {
  D1_DATABASE_NAME,
  PREFLIGHT_STAMP_MAX_AGE_MS,
  SCHEMA_CONTRACT_VERSION
} from './schema-contract.mjs';
import { assertNoPendingRemoteMigrations } from './check-migrations.mjs';
import { checkRemoteDatabaseSchema, checkStaticSchemaContract } from './check-database-schema.mjs';

const remote = process.argv.includes('--remote');
const writeStamp = process.argv.includes('--write-stamp');
const root = process.cwd();

function runQuiet(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.once('error', () => resolve(''));
    child.once('exit', code => resolve(code === 0 ? stdout.trim() : ''));
  });
}

async function main() {
  if (!remote) {
    throw new Error('Production deploy preflight требует --remote. Для локальной проверки используйте check-database-schema.mjs --contract-only.');
  }

  console.log('1/3 Schema contract: локальная проверка...');
  const local = await checkStaticSchemaContract(root);
  console.log(`    OK: migrations ${local.migrationFingerprint.slice(0, 12)}, contract ${local.contractFingerprint.slice(0, 12)}.`);

  console.log('2/3 Production D1: проверка pending migrations...');
  await assertNoPendingRemoteMigrations({ root, database: D1_DATABASE_NAME });
  console.log('    OK: pending migrations нет.');

  console.log('3/3 Production D1: schema contract + PRAGMA quick_check...');
  await checkRemoteDatabaseSchema({ root, database: D1_DATABASE_NAME, repair: false });
  console.log(`    OK: schema contract v${SCHEMA_CONTRACT_VERSION}, quick_check=ok.`);

  if (writeStamp) {
    const checkedAt = Date.now();
    const gitHead = await runQuiet('git', ['rev-parse', 'HEAD']);
    const stamp = {
      version: 1,
      database: D1_DATABASE_NAME,
      contractVersion: SCHEMA_CONTRACT_VERSION,
      checkedAt,
      expiresAt: checkedAt + PREFLIGHT_STAMP_MAX_AGE_MS,
      migrationFingerprint: local.migrationFingerprint,
      contractFingerprint: local.contractFingerprint,
      gitHead
    };
    const stampDir = path.join(root, '.wrangler');
    await mkdir(stampDir, { recursive: true });
    await writeFile(path.join(stampDir, 'zefirok-schema-preflight.json'), `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');
    console.log(`Predeploy stamp создан на ${Math.round(PREFLIGHT_STAMP_MAX_AGE_MS / 60000)} минут.`);
  }

  console.log('Production schema preflight PASSED. Deploy разрешен.');
}

main().catch(error => {
  console.error(`\nPRODUCTION DEPLOY BLOCKED\n${error?.message || error}`);
  process.exitCode = 1;
});
