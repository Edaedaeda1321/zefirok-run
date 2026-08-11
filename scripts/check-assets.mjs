#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const newOnly = process.argv.includes('--new-only');
const newsManifestOnly = process.argv.includes('--news-manifest');
const indexPath = path.join(root, 'index.html');
const newsRoot = path.join(root, 'assets', 'news');
const newsManifestPath = path.join(newsRoot, 'manifest.json');
const newsExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);

function newsLabel(relativePath) {
  const base = path.basename(relativePath, path.extname(relativePath));
  const aliases = new Map([
    ['cases-5.0.1', 'Кейсы 5.0.1'],
    ['relise_game_news', 'Релиз игры'],
    ['release_game_news', 'Релиз игры']
  ]);
  const alias = aliases.get(base.toLowerCase());
  if (alias) return alias;
  const text = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : relativePath;
}

function encodeAssetPath(relativePath) {
  return relativePath.split('/').map(part => encodeURIComponent(part)).join('/');
}

async function collectNewsImages(directory, prefix = '') {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const images = [];
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith('.') || entry.name.startsWith('._')) continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      images.push(...await collectNewsImages(absolutePath, relativePath));
      continue;
    }
    if (!entry.isFile() || entry.name === 'manifest.json' || !newsExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const info = await stat(absolutePath);
    if (!info.size) continue;
    const data = await readFile(absolutePath);
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
    images.push({
      fileName: relativePath,
      label: newsLabel(relativePath),
      path: `/assets/news/${encodeAssetPath(relativePath)}`,
      hash,
      size: info.size
    });
  }
  return images;
}

async function generateNewsManifest() {
  const images = await collectNewsImages(newsRoot);
  const catalogHash = createHash('sha256')
    .update(images.map(item => `${item.path}:${item.hash}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const payload = {
    version: 1,
    catalogHash,
    count: images.length,
    images
  };
  await writeFile(newsManifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`News manifest generated: ${images.length} image(s).`);
  return payload;
}

if (newsManifestOnly) {
  await generateNewsManifest();
  process.exit(0);
}

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
    if (lower.includes('floating-ui.core')) return data.length >= 500 && source.includes('FloatingUICore');
    if (lower.includes('floating-ui.dom')) {
      return data.length >= 4000
        && source.includes('FloatingUIDOM')
        && source.includes('computePosition')
        && source.includes('autoUpdate')
        && source.includes('offset')
        && source.includes('flip')
        && source.includes('shift')
        && source.includes('size');
    }
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
