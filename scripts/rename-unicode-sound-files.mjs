#!/usr/bin/env node
import { readdir, rename, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const soundsDir = path.join(root, 'assets', 'sounds');
const selfPath = path.resolve(fileURLToPath(import.meta.url));

const renames = [
  {
    oldName: 'Moon Marshmallow Café(Epik).mp3',
    newName: 'moon_marshmallow_cafe_epic.mp3'
  },
  {
    oldName: 'Moon Marshmallow Café_2(epik).mp3',
    newName: 'moon_marshmallow_cafe_2_epic.mp3'
  }
];

const skipDirs = new Set(['.git', 'node_modules', '.wrangler']);
const binaryExts = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svgz',
  '.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac',
  '.zip', '.gz', '.7z', '.rar', '.pdf', '.woff', '.woff2', '.ttf', '.otf'
]);

function sameUnicodeName(a, b) {
  return String(a).normalize('NFC') === String(b).normalize('NFC');
}

async function renameAssets() {
  const entries = await readdir(soundsDir);
  for (const item of renames) {
    const oldEntry = entries.find((name) => sameUnicodeName(name, item.oldName));
    const newEntry = entries.find((name) => name === item.newName);

    if (oldEntry && newEntry && oldEntry !== newEntry) {
      throw new Error(`Both old and new sound files exist: ${oldEntry} / ${newEntry}. Refusing to overwrite.`);
    }

    if (newEntry) {
      console.log(`[asset] already renamed: assets/sounds/${item.newName}`);
      continue;
    }

    if (!oldEntry) {
      throw new Error(`Cannot find assets/sounds/${item.oldName} (including NFC/NFD-equivalent spelling).`);
    }

    await rename(path.join(soundsDir, oldEntry), path.join(soundsDir, item.newName));
    console.log(`[asset] renamed: assets/sounds/${oldEntry} -> assets/sounds/${item.newName}`);
  }
}

function replacementsFor(item) {
  const oldNfc = item.oldName.normalize('NFC');
  const oldNfd = item.oldName.normalize('NFD');
  return [oldNfc, oldNfd].filter((value, index, all) => all.indexOf(value) === index);
}

async function updateTextReferences() {
  const replacements = renames.map((item) => ({
    item,
    variants: replacementsFor(item)
  }));
  let changedFiles = 0;

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile() || path.resolve(full) === selfPath) continue;
      if (binaryExts.has(path.extname(entry.name).toLowerCase())) continue;

      let info;
      try { info = await stat(full); } catch { continue; }
      if (!info.isFile() || info.size > 20 * 1024 * 1024) continue;

      let text;
      try { text = await readFile(full, 'utf8'); } catch { continue; }
      if (text.includes('\u0000')) continue;

      let next = text;
      for (const { item, variants } of replacements) {
        for (const oldVariant of variants) {
          next = next.split(oldVariant).join(item.newName);
        }
      }

      if (next !== text) {
        await writeFile(full, next, 'utf8');
        changedFiles += 1;
        console.log(`[ref] updated: ${path.relative(root, full)}`);
      }
    }
  }

  await walk(root);
  console.log(`[ref] ${changedFiles} text file(s) updated.`);
}

await renameAssets();
await updateTextReferences();
console.log('\nUnicode-sensitive MP3 names removed. Run: node scripts/check-live-content-assets.mjs');
