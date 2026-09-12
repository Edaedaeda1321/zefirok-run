#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const quiet = process.argv.includes('--quiet');
const fail = (message) => {
  console.error(`PACKAGE LOCK CHECK FAILED: ${message}`);
  process.exit(1);
};

let pkg;
let lock;
try {
  pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
} catch (error) {
  fail(`cannot parse package metadata: ${error?.message || error}`);
}

if (lock?.lockfileVersion !== 3) fail(`expected lockfileVersion=3, got ${lock?.lockfileVersion ?? 'missing'}.`);
const packages = lock?.packages;
if (!packages || typeof packages !== 'object') fail('package-lock.json has no packages map.');

const sharpVersion = pkg?.devDependencies?.sharp;
if (sharpVersion !== '0.35.4') fail(`package.json must pin sharp=0.35.4, got ${sharpVersion ?? 'missing'}.`);
if (packages['']?.devDependencies?.sharp !== sharpVersion) {
  fail('package-lock.json root devDependencies do not match package.json.');
}

const sharp = packages['node_modules/sharp'];
if (!sharp || sharp.version !== sharpVersion) fail(`node_modules/sharp must be locked at ${sharpVersion}.`);

const requireEntry = (name, expectedVersion = null) => {
  const entry = packages[`node_modules/${name}`];
  if (!entry) fail(`missing node_modules/${name} from package-lock.json.`);
  if (expectedVersion && entry.version !== expectedVersion) {
    fail(`node_modules/${name} expected ${expectedVersion}, got ${entry.version ?? 'missing'}.`);
  }
  return entry;
};

for (const name of Object.keys(sharp.dependencies || {})) requireEntry(name);
for (const [name, version] of Object.entries(sharp.optionalDependencies || {})) requireEntry(name, version);

// sharp-wasm32 is reachable through the FreeBSD/WebContainers optional branches.
const wasm = requireEntry('@img/sharp-wasm32', '0.35.4');
if (wasm.dependencies?.['@emnapi/runtime'] !== '^1.11.3') {
  fail('@img/sharp-wasm32 must depend on @emnapi/runtime ^1.11.3.');
}
const runtime = requireEntry('@emnapi/runtime', '1.11.3');
if (runtime.dependencies?.tslib !== '^2.4.0') fail('@emnapi/runtime must depend on tslib ^2.4.0.');
requireEntry('tslib', '2.8.1');

const expectedPlatformEntries = Object.keys(sharp.optionalDependencies || {}).length;
if (expectedPlatformEntries < 20) {
  fail(`sharp optional platform matrix looks truncated (${expectedPlatformEntries} entries).`);
}

if (!quiet) {
  console.log(`Package lock OK: sharp ${sharpVersion}, ${expectedPlatformEntries} optional platform package(s), npm 11-safe lock graph.`);
}
