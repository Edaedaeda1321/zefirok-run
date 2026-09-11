#!/usr/bin/env node
import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const wrangler = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
if (!/"main"\s*:\s*"src\/worker\.js"/.test(wrangler)) {
  throw new Error('Безопасное удаление остановлено: wrangler.main не указывает на src/worker.js.');
}
await access(path.join(root, 'src', 'worker.js'));
try {
  await access(path.join(root, 'worker.js'));
  await rm(path.join(root, 'worker.js'));
  console.log('Removed obsolete root worker.js. Runtime Worker remains src/worker.js.');
} catch (error) {
  if (String(error?.code || '') === 'ENOENT') console.log('Obsolete root worker.js already absent.');
  else throw error;
}
console.log('P1 5-8 local apply step complete.');
