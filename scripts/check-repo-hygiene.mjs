#!/usr/bin/env node
import { readFile, readdir, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const fail = (message) => {
  console.error(`REPO HYGIENE FAILED: ${message}`);
  process.exit(1);
};

async function exists(rel) {
  try {
    await access(path.join(root, rel), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function activeRules(source) {
  return String(source)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const [gitignore, assetsignore] = await Promise.all([
  readFile(path.join(root, '.gitignore'), 'utf8'),
  readFile(path.join(root, '.assetsignore'), 'utf8')
]);

if (/^(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/m.test(gitignore)) {
  fail('.gitignore contains unresolved merge conflict markers.');
}

const gitRules = activeRules(gitignore);
const duplicates = [...new Set(gitRules.filter((rule, index) => gitRules.indexOf(rule) !== index))];
if (duplicates.length) {
  fail(`.gitignore contains duplicate active rule(s): ${duplicates.join(', ')}`);
}

for (const required of ['node_modules/', '/*.patch', '/*.diff', '/*_test.html', '/*_testing*.html', '/*New_Version*.html', '/BASE_COMMIT.txt']) {
  if (!gitRules.includes(required)) fail(`.gitignore is missing required rule: ${required}`);
}

const assetRules = new Set(activeRules(assetsignore));
for (const required of ['node_modules/', 'dev-history/', 'package.json', 'package-lock.json', 'BASE_COMMIT.txt']) {
  if (!assetRules.has(required)) fail(`.assetsignore is missing required rule: ${required}`);
}

if (await exists('BASE_COMMIT.txt')) {
  fail('BASE_COMMIT.txt must not exist; Git history is the source of commit identity.');
}

const entries = await readdir(root, { withFileTypes: true });
const legacyRootFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /(?:\.patch$|\.diff$|_test\.html$|_testing[^/]*\.html$|New_Version[^/]*\.html$)/i.test(name))
  .sort();
if (legacyRootFiles.length) {
  fail(`legacy development files remain in production root: ${legacyRootFiles.join(', ')}`);
}

const lockCheck = spawnSync(process.execPath, ['scripts/check-package-lock.mjs', '--quiet'], { cwd: root, encoding: 'utf8' });
if (lockCheck.status !== 0) {
  fail((lockCheck.stderr || lockCheck.stdout || 'package lock validation failed').trim());
}

const gitProbe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
if (gitProbe.status === 0 && gitProbe.stdout.trim() === 'true') {
  const tracked = spawnSync('git', ['ls-files', '-z', '--', 'node_modules', 'BASE_COMMIT.txt'], {
    cwd: root,
    encoding: 'utf8'
  });
  if (tracked.status !== 0) fail(`git ls-files failed: ${tracked.stderr.trim() || 'unknown error'}`);
  const trackedFiles = tracked.stdout.split('\0').filter(Boolean);
  if (trackedFiles.length) fail(`forbidden tracked file(s): ${trackedFiles.slice(0, 12).join(', ')}`);

  const trackedRoot = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  if (trackedRoot.status !== 0) fail(`git ls-files failed: ${trackedRoot.stderr.trim() || 'unknown error'}`);
  const trackedLegacy = trackedRoot.stdout
    .split('\0')
    .filter(Boolean)
    .filter((name) => !name.includes('/'))
    .filter((name) => /(?:\.patch$|\.diff$|_test\.html$|_testing[^/]*\.html$|New_Version[^/]*\.html$)/i.test(name));
  if (trackedLegacy.length) fail(`legacy development file(s) still tracked at repository root: ${trackedLegacy.join(', ')}`);
}

console.log('Repository hygiene OK: clean ignore rules, reproducible npm metadata, no stale BASE_COMMIT, no legacy dev copies in production root.');
