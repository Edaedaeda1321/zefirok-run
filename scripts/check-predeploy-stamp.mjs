#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { D1_DATABASE_NAME, SCHEMA_CONTRACT_VERSION } from './schema-contract.mjs';
import { checkStaticSchemaContract } from './check-database-schema.mjs';

const root = process.cwd();
const stampPath = path.join(root, '.wrangler', 'zefirok-schema-preflight.json');

function fail(message) {
  throw new Error(`${message}\n\nБезопасный Production deploy запускается через:\n  ./update.sh`);
}

async function main() {
  let stamp;
  try {
    stamp = JSON.parse(await readFile(stampPath, 'utf8'));
  } catch {
    fail('Нет свежего Production D1 preflight stamp. Прямой npx wrangler deploy заблокирован.');
  }

  const now = Date.now();
  if (Number(stamp?.expiresAt || 0) <= now) fail('Production D1 preflight stamp истек.');
  if (Number(stamp?.checkedAt || 0) > now + 60_000) fail('Production D1 preflight stamp имеет некорректное время.');
  if (String(stamp?.database || '') !== D1_DATABASE_NAME) fail('Production D1 preflight stamp относится к другой базе.');
  if (Number(stamp?.contractVersion || 0) !== SCHEMA_CONTRACT_VERSION) fail('Schema contract изменился после preflight.');

  const local = await checkStaticSchemaContract(root);
  if (String(stamp?.migrationFingerprint || '') !== local.migrationFingerprint) fail('Migration files изменились после Production D1 preflight.');
  if (String(stamp?.contractFingerprint || '') !== local.contractFingerprint) fail('Schema contract files изменились после Production D1 preflight.');

  console.log(`Production D1 preflight stamp OK (contract v${SCHEMA_CONTRACT_VERSION}).`);
}

main().catch(error => {
  console.error(`\nPREDEPLOY STAMP CHECK FAILED\n${error?.message || error}`);
  process.exitCode = 1;
});
