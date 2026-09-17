#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as vm from 'node:vm';

const root = process.cwd();
const file = path.join(root, 'src/worker.js');
const source = fs.readFileSync(file, 'utf8');

if (typeof vm.SourceTextModule !== 'function') {
  console.error('Strict Worker syntax check requires node --experimental-vm-modules.');
  process.exit(2);
}

try {
  new vm.SourceTextModule(source, { identifier: file });
} catch (error) {
  console.error(`Strict Worker module syntax failed: ${error?.message || error}`);
  process.exit(1);
}

console.log(`Strict Worker module syntax OK: ${source.split('\n').length} line(s).`);
