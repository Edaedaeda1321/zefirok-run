#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { FORBIDDEN_PUBLIC_ASSET_PATTERNS } from './schema-contract.mjs';

const root = process.cwd();
const ignorePath = path.join(root, '.assetsignore');

const REQUIRED_RULES = Object.freeze([
  '.git', '.github', '.wrangler', '.gitignore', '.assetsignore', '.DS_Store', '__MACOSX',
  'node_modules/', 'dev-history/', 'src', 'migrations', 'scripts', 'wrangler.jsonc', 'worker.js', 'update.sh',
  'package.json', 'package-lock.json',
  '*.zip', '*.patch', '*.diff', '*_test.html', '*_testing*.html', '*New_Version*.html',
  'BASE_COMMIT.txt', 'CODEX_PROMPT.txt', 'PROMPT_FOR_CODEX.txt', 'DAILY_ACTIVITY_UPDATE.txt',
  'PATCH_NOTES.txt', 'CHANGELOG.md', 'README*', 'THIRD_PARTY_NOTICES.md'
]);

// test-project.html is an active owner staging surface, not an obsolete test copy.
const REQUIRED_PUBLIC_ROOT_FILES = Object.freeze([
  'index.html', 'battle-pass.html', 'rating.html', 'referrals.html', 'achievements.html',
  'album.html', 'legal.html', 'owner.html', 'staff-qr.html', 'test-project.html', 'asset-cache-sw.js'
]);

function activeIgnoreLines(source) {
  return new Set(String(source).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')));
}

function obviousPrivateRootFile(name) {
  return FORBIDDEN_PUBLIC_ASSET_PATTERNS.some(pattern => pattern.test(name));
}

const source = await readFile(ignorePath, 'utf8');
const lines = activeIgnoreLines(source);
const missingRules = REQUIRED_RULES.filter(rule => !lines.has(rule));
if (missingRules.length) {
  console.error('DEPLOY ASSET CHECK FAILED: .assetsignore missing required rules:');
  for (const rule of missingRules) console.error(`  - ${rule}`);
  process.exit(1);
}

const rootEntries = await readdir(root, { withFileTypes: true });
const names = new Set(rootEntries.map(entry => entry.name));
if (names.has('worker.js')) {
  console.error('DEPLOY ASSET CHECK FAILED: obsolete root worker.js exists. Runtime entrypoint must only be src/worker.js.');
  process.exit(1);
}
const missingPublic = REQUIRED_PUBLIC_ROOT_FILES.filter(name => !names.has(name));
if (missingPublic.length) {
  console.error('DEPLOY ASSET CHECK FAILED: expected production/staging page missing:');
  for (const name of missingPublic) console.error(`  - ${name}`);
  process.exit(1);
}

for (const name of REQUIRED_PUBLIC_ROOT_FILES) {
  if (obviousPrivateRootFile(name)) {
    console.error(`DEPLOY ASSET CHECK FAILED: production/staging file classified private by contract: ${name}`);
    process.exit(1);
  }
}

const forbiddenPresent = rootEntries
  .filter(entry => entry.isFile() && obviousPrivateRootFile(entry.name))
  .map(entry => entry.name)
  .sort();

// We use an explicit rule set rather than trying to reimplement every gitignore edge case.
// These are the dangerous root-file classes that must be covered by the rules above.
for (const name of forbiddenPresent) {
  const covered = (
    name === 'worker.js' || name === 'wrangler.jsonc' || name === 'update.sh' || name === 'BASE_COMMIT.txt' ||
    name === 'package.json' || name === 'package-lock.json' ||
    /\.patch$/i.test(name) || /\.diff$/i.test(name) || /_test\.html$/i.test(name) ||
    /_testing.*\.html$/i.test(name) || /New_Version.*\.html$/i.test(name)
  );
  if (!covered) {
    console.error(`DEPLOY ASSET CHECK FAILED: private root file has no verified .assetsignore class: ${name}`);
    process.exit(1);
  }
}

const wrangler = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
if (!/"main"\s*:\s*"src\/worker\.js"/.test(wrangler)) {
  console.error('DEPLOY ASSET CHECK FAILED: wrangler.main must remain src/worker.js.');
  process.exit(1);
}
if (!/"assets"\s*:\s*\{[\s\S]*?"directory"\s*:\s*"\."/.test(wrangler)) {
  console.error('DEPLOY ASSET CHECK FAILED: wrangler assets.directory changed; review .assetsignore contract.');
  process.exit(1);
}

console.log(
  `Deploy asset boundary OK: ${REQUIRED_RULES.length} deny rule(s), ` +
  `${REQUIRED_PUBLIC_ROOT_FILES.length} required public/staging file(s), ${forbiddenPresent.length} private root file(s) covered.`
);
