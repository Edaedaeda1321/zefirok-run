#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { listMigrationFiles } from './check-migrations.mjs';

const root = process.cwd();
const lockPath = path.join(root, 'scripts', 'migration-history.lock.json');
const migrationNumber = name => Number((/^([0-9]{4})_/.exec(String(name)) || [])[1] || 0);
const sha256 = async name => createHash('sha256')
  .update(await readFile(path.join(root, 'migrations', name)))
  .digest('hex');

async function main() {
  const names = await listMigrationFiles(root);
  let lock;
  try { lock = JSON.parse(await readFile(lockPath, 'utf8')); }
  catch (error) { throw new Error(`Не удалось прочитать scripts/migration-history.lock.json: ${error?.message || error}`); }
  if (Number(lock?.version || 0) !== 1 || String(lock?.algorithm || '') !== 'sha256' || !lock?.files || typeof lock.files !== 'object' || Array.isArray(lock.files)) {
    throw new Error('Некорректный migration-history.lock.json.');
  }

  const existing = Object.keys(lock.files).sort();
  const changed = [];
  for (const name of existing) {
    if (!names.includes(name)) { changed.push(`${name}: файл удален`); continue; }
    const actual = await sha256(name);
    if (String(lock.files[name] || '').toLowerCase() !== actual) changed.push(`${name}: checksum изменен`);
  }
  if (changed.length) {
    throw new Error(`Lock не будет обновлен: обнаружено изменение уже зафиксированной истории:\n  - ${changed.join('\n  - ')}\nСоздайте новую migration вместо изменения старой.`);
  }

  const additions = names.filter(name => !Object.prototype.hasOwnProperty.call(lock.files, name));
  if (!additions.length) {
    console.log(`Migration lock already current: ${existing.length} file(s).`);
    return;
  }

  const highestLocked = existing.length ? Math.max(...existing.map(migrationNumber)) : 0;
  const existingNumbers = new Set(existing.map(migrationNumber));
  for (const name of additions) {
    const number = migrationNumber(name);
    if (number <= highestLocked || existingNumbers.has(number)) {
      throw new Error(`Новая migration ${name} использует номер ${String(number).padStart(4, '0')} не выше зафиксированной истории ${String(highestLocked).padStart(4, '0')}.`);
    }
  }

  const files = { ...lock.files };
  for (const name of additions.sort()) files[name] = await sha256(name);
  const ordered = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(lockPath, `${JSON.stringify({ version:1, algorithm:'sha256', files:ordered }, null, 2)}\n`);
  console.log(`Migration lock updated: added ${additions.length} file(s): ${additions.join(', ')}`);
}

main().catch(error => {
  console.error(`\nMIGRATION LOCK UPDATE FAILED\n${error?.message || error}`);
  process.exitCode = 1;
});
