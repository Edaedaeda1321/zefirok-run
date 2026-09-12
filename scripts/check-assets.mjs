#!/usr/bin/env node
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const newOnly = process.argv.includes('--new-only');
const newsManifestOnly = process.argv.includes('--news-manifest');
const productionUiFiles = Object.freeze([
  'index.html',
  'battle-pass.html',
  'rating.html',
  'referrals.html',
  'achievements.html',
  'album.html',
  'legal.html',
  'owner.html',
  'staff-qr.html'
]);
const newsRoot = path.join(root, 'assets', 'news');
const newsManifestPath = path.join(newsRoot, 'manifest.json');
const casesRoot = path.join(root, 'assets', 'cases');
const casesManifestPath = path.join(casesRoot, 'manifest.json');
const assetsRoot = path.join(root, 'assets');
const projectImagesManifestPath = path.join(assetsRoot, 'images-manifest.json');
const newsExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg']);

function canonicalAssetText(value) {
  return String(value || '').normalize('NFC');
}

function compareCanonicalAssetNames(left, right) {
  const a = canonicalAssetText(left?.name ?? left);
  const b = canonicalAssetText(right?.name ?? right);
  const localized = a.localeCompare(b, 'ru');
  return localized || (a < b ? -1 : a > b ? 1 : 0);
}

function canonicalAssetPath(value) {
  return String(value || '').split('/').map(canonicalAssetText).join('/');
}

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
  entries.sort(compareCanonicalAssetNames);
  const images = [];
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith('.') || entry.name.startsWith('._')) continue;
    const entryName = canonicalAssetText(entry.name);
    const relativePath = canonicalAssetPath(prefix ? `${prefix}/${entryName}` : entryName);
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
  const images = (await collectNewsImages(newsRoot)).sort((a,b) => compareCanonicalAssetNames(a.fileName,b.fileName));
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

function caseAssetLabel(relativePath) {
  const base = path.basename(relativePath, path.extname(relativePath));
  const text = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : relativePath;
}

async function collectCaseImages(directory, prefix = '') {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  entries.sort(compareCanonicalAssetNames);
  const images = [];
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith('.') || entry.name.startsWith('._')) continue;
    const entryName = canonicalAssetText(entry.name);
    const relativePath = canonicalAssetPath(prefix ? `${prefix}/${entryName}` : entryName);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      images.push(...await collectCaseImages(absolutePath, relativePath));
      continue;
    }
    if (!entry.isFile() || entry.name === 'manifest.json' || !newsExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const info = await stat(absolutePath);
    if (!info.size) continue;
    const data = await readFile(absolutePath);
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
    const folder = path.posix.dirname(relativePath) === '.' ? 'root' : path.posix.dirname(relativePath);
    images.push({
      fileName: relativePath,
      label: caseAssetLabel(relativePath),
      folder,
      path: `/assets/cases/${encodeAssetPath(relativePath)}`,
      hash,
      size: info.size
    });
  }
  return images;
}


function projectImageLabel(relativePath) {
  const base = path.basename(relativePath, path.extname(relativePath));
  const text = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : relativePath;
}

async function collectProjectImages(directory, prefix = '') {
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  entries.sort(compareCanonicalAssetNames);
  const images = [];
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith('.') || entry.name.startsWith('._') || entry.name === '__MACOSX') continue;
    const entryName = canonicalAssetText(entry.name);
    const relativePath = canonicalAssetPath(prefix ? `${prefix}/${entryName}` : entryName);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      images.push(...await collectProjectImages(absolutePath, relativePath));
      continue;
    }
    if (!entry.isFile() || !newsExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const info = await stat(absolutePath);
    if (!info.size) continue;
    const data = await readFile(absolutePath);
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
    const folder = path.posix.dirname(relativePath) === '.' ? 'root' : path.posix.dirname(relativePath);
    images.push({
      fileName: relativePath,
      label: projectImageLabel(relativePath),
      folder,
      path: `/assets/${encodeAssetPath(relativePath)}`,
      hash,
      size: info.size
    });
  }
  return images;
}

async function generateProjectImagesManifest() {
  const images = (await collectProjectImages(assetsRoot)).sort((a,b) => compareCanonicalAssetNames(a.fileName,b.fileName));
  const catalogHash = createHash('sha256')
    .update(images.map(item => `${item.path}:${item.hash}`).join('\n'))
    .digest('hex')
    .slice(0, 16);
  const payload = { version: 2, hashAlgorithm: 'sha256', catalogHash, count: images.length, images };
  await writeFile(projectImagesManifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Project image manifest generated: ${images.length} image(s).`);
  return payload;
}

async function generateCasesManifest() {
  const images = (await collectCaseImages(casesRoot)).sort((a,b) => compareCanonicalAssetNames(a.fileName,b.fileName));
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
  await writeFile(casesManifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Cases manifest generated: ${images.length} image(s).`);
  return payload;
}

if (newsManifestOnly) {
  await generateNewsManifest();
  await generateCasesManifest();
  await generateProjectImagesManifest();
  process.exit(0);
}

const requiredNew = [
  'asset-cache-sw.js',
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

function isLiteralAssetReference(value) {
  const text=String(value||'');
  if (!text.startsWith('/assets/')) return false;
  if (text.includes('${') || text.includes('{') || text.includes('}') || text.includes('...') || text.includes(':') || text.includes('*')) return false;
  const clean=text.split(/[?#]/,1)[0];
  if (clean.endsWith('/')) return false;
  return /\.[A-Za-z0-9]{1,8}$/.test(clean);
}

async function exactPathExists(relativePath) {
  const normalized = relativePath.split('/').filter(Boolean);
  let current = root;
  for (const part of normalized) {
    let entries;
    try { entries = await readdir(current); } catch { return false; }
    let actual = entries.includes(part) ? part : '';
    if (!actual) {
      const canonical = canonicalAssetText(part);
      const matches = entries.filter((entry) => canonicalAssetText(entry) === canonical);
      if (matches.length !== 1) return false;
      actual = matches[0];
    }
    current = path.join(current, actual);
  }
  try {
    const info = await stat(current);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function webpFallbackPath(relativePath) {
  return /\.(?:png|jpe?g)$/i.test(relativePath)
    ? relativePath.replace(/\.(?:png|jpe?g)$/i, '.webp')
    : '';
}

async function resolvedAssetPath(relativePath) {
  if (await exactPathExists(relativePath)) return relativePath;
  const fallback = webpFallbackPath(relativePath);
  if (fallback && await exactPathExists(fallback)) return fallback;
  return '';
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
    if (lower.includes('floating-ui.core')) {
      const hasNamespace = source.includes('FloatingUICore');
      const officialBundle = data.length >= 10000 && hasNamespace;
      const localCompatibilityLayer = data.length >= 1000
        && hasNamespace
        && source.includes('rectToClientRect')
        && source.includes('__zefirokLocal');
      return officialBundle || localCompatibilityLayer;
    }
    if (lower.includes('floating-ui.dom')) return data.length >= 8000 && source.includes('FloatingUIDOM');
  }
  return data.length > 0;
}

const paths = new Set(requiredNew);
const uiReferences = new Map();
if (!newOnly) {
  for (const fileName of productionUiFiles) {
    const html = await readFile(path.join(root, fileName), 'utf8');
    let count = 0;
    for (const match of html.matchAll(/\/assets\/[^\s"'<>\\&]+/g)) {
      if (!isLiteralAssetReference(match[0])) continue;
      const assetPath = cleanAssetUrl(match[0]);
      paths.add(assetPath);
      if (!uiReferences.has(assetPath)) uiReferences.set(assetPath, new Set());
      uiReferences.get(assetPath).add(fileName);
      count += 1;
    }
    console.log(`Asset references scanned: ${fileName} (${count}).`);
  }
}

const missing = [];
const invalid = [];
for (const relativePath of [...paths].sort()) {
  const resolved = await resolvedAssetPath(relativePath);
  if (!resolved) {
    const refs = [...(uiReferences.get(relativePath) || [])];
    missing.push(refs.length ? `${relativePath} [${refs.join(', ')}]` : relativePath);
    continue;
  }
  if (!(await validateContent(resolved))) invalid.push(`${relativePath}${resolved !== relativePath ? ` -> ${resolved}` : ''}`);
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
