#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const newOnly = process.argv.includes('--new-only');
const indexPath = path.join(root, 'index.html');

const requiredNew = [
  'assets/vendor/floating-ui/floating-ui.core.umd.min.js',
  'assets/vendor/floating-ui/floating-ui.dom.umd.min.js',
  'assets/cases/legendary_closed.png',
  'assets/cases/legendary_open.png'
];

const optimizedKeys = [
  'skinDefaultPortrait', 'navGameButtonSelected', 'navGameButtonUnselected',
  'iconScore', 'cafeBackground', 'skinDefaultAvatar',
  'shopMarshmallowAssortment', 'shopMascot', 'pillowObstacle',
  'coffeePickup', 'vaseObstacle', 'iconCoffee', 'iconRecord'
];
for (const key of optimizedKeys) {
  requiredNew.push(`assets/optimized/v0.79.5/${key}.webp`);
  requiredNew.push(`assets/optimized/v0.79.5/${key}.png`);
}
requiredNew.push('assets/optimized/v0.79.5/manifest.json');

function cleanAssetUrl(value) {
  const withoutEntities = String(value).replaceAll('&amp;', '&');
  const noQuery = withoutEntities.split(/[?#]/, 1)[0];
  return decodeURIComponent(noQuery.replace(/^\//, ''));
}

async function exactPathExists(relativePath) {
  const normalized = relativePath.split('/').filter(Boolean);
  let current = root;
  for (const part of normalized) {
    let entries;
    try { entries = await readdir(current); } catch { return false; }
    if (!entries.includes(part)) return false;
    current = path.join(current, part);
  }
  try {
    const info = await stat(current);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function validateContent(relativePath) {
  const file = path.join(root, relativePath);
  const data = await readFile(file);
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.png')) {
    return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  }
  if (lower.endsWith('.webp')) {
    return data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (lower.endsWith('.js')) {
    const source = data.toString('utf8');
    if (lower.includes('floating-ui.core')) return data.length >= 10000 && source.includes('FloatingUICore');
    if (lower.includes('floating-ui.dom')) return data.length >= 8000 && source.includes('FloatingUIDOM');
  }
  return data.length > 0;
}

const paths = new Set(requiredNew);
if (!newOnly) {
  const html = await readFile(indexPath, 'utf8');
  for (const match of html.matchAll(/\/assets\/[^\s"'<>\\&]+/g)) {
    paths.add(cleanAssetUrl(match[0]));
  }
}

const missing = [];
const invalid = [];
for (const relativePath of [...paths].sort()) {
  if (!(await exactPathExists(relativePath))) {
    missing.push(relativePath);
    continue;
  }
  if (!(await validateContent(relativePath))) invalid.push(relativePath);
}

if (missing.length) {
  console.error('\nMissing assets:');
  for (const item of missing) console.error(`  - ${item}`);
}
if (invalid.length) {
  console.error('\nInvalid or empty assets:');
  for (const item of invalid) console.error(`  - ${item}`);
}

if (missing.length || invalid.length) {
  console.error(`\nAsset check failed: ${missing.length} missing, ${invalid.length} invalid.`);
  process.exitCode = 1;
} else {
  console.log(`Asset check passed: ${paths.size} files.`);
}
