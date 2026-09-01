#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const workerPath = path.join(root, 'src', 'worker.js');
const worker = await readFile(workerPath, 'utf8');

const blockSpecs = [
  ['const FUTURE_SEASON_CONTENT =', 'const FUTURE_SEASON_CONTENT_LABEL'],
  ['const LIVEOPS_CONTENT_IMAGES =', 'const LIVE_CONTENT_DESTINATIONS'],
  ['const SEASON3_DRAFT_CASE_PRESET =', 'function season3DraftCasePool']
];

function sourceBlock(startMarker, endMarker) {
  const start = worker.indexOf(startMarker);
  if (start < 0) throw new Error(`Cannot find ${startMarker} in src/worker.js`);
  const end = worker.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Cannot find ${endMarker} after ${startMarker}`);
  return worker.slice(start, end);
}

function cleanAssetPath(raw) {
  const value = String(raw || '').split(/[?#]/, 1)[0];
  if (!value.startsWith('/assets/') || value.includes('..') || value.includes('\\')) return '';
  return value.slice(1);
}

const required = new Set();
for (const [start, end] of blockSpecs) {
  const block = sourceBlock(start, end);
  for (const match of block.matchAll(/["'`]([^"'`]*\/assets\/[^"'`]+)["'`]/g)) {
    const raw = match[1].slice(match[1].indexOf('/assets/'));
    const relative = cleanAssetPath(raw);
    if (relative) required.add(relative);
  }
}

async function exactFile(relativePath) {
  const parts = relativePath.split('/').filter(Boolean);
  let current = root;
  for (const part of parts) {
    let entries;
    try { entries = await readdir(current); } catch { return { kind: 'missing' }; }
    if (!entries.includes(part)) {
      const unicodeEquivalent = entries.find((entry) => entry.normalize('NFC') === part.normalize('NFC'));
      if (unicodeEquivalent) {
        return {
          kind: 'unicode-mismatch',
          expected: path.join(current, part),
          actual: path.join(current, unicodeEquivalent)
        };
      }
      return { kind: 'missing' };
    }
    current = path.join(current, part);
  }
  try {
    const info = await stat(current);
    return info.isFile() && info.size > 0
      ? { kind: 'ok', path: current, size: info.size }
      : { kind: 'missing' };
  } catch {
    return { kind: 'missing' };
  }
}

const missing = [];
const unicodeMismatches = [];
for (const relativePath of [...required].sort()) {
  const result = await exactFile(relativePath);
  if (result.kind === 'unicode-mismatch') unicodeMismatches.push({ relativePath, ...result });
  else if (result.kind !== 'ok') missing.push(relativePath);
}

if (missing.length || unicodeMismatches.length) {
  if (missing.length) {
    console.error('\nLive Content assets missing from deploy input:');
    for (const item of missing) console.error(`  - ${item}`);
  }
  if (unicodeMismatches.length) {
    console.error('\nLive Content assets have Unicode-normalization filename mismatches:');
    for (const item of unicodeMismatches) {
      console.error(`  - ${item.relativePath}`);
      console.error('    The visually identical filename on disk uses different Unicode bytes. Rename deploy-addressed assets to ASCII-safe names.');
    }
  }
  console.error(`\nLive Content asset check failed: ${missing.length} missing, ${unicodeMismatches.length} Unicode mismatch(es), ${required.size} required.`);
  process.exitCode = 1;
} else {
  console.log(`Live Content asset check passed: ${required.size} file(s).`);
}
