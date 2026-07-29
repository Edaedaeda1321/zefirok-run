#!/usr/bin/env node
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check');
const packages = [
  {
    name: '@floating-ui/core@1.7.3',
    target: 'assets/vendor/floating-ui/floating-ui.core.umd.min.js',
    minBytes: 10000,
    marker: 'FloatingUICore',
    urls: [
      'https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js',
      'https://cdn.jsdelivr.net/npm/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js'
    ]
  },
  {
    name: '@floating-ui/dom@1.7.4',
    target: 'assets/vendor/floating-ui/floating-ui.dom.umd.min.js',
    minBytes: 8000,
    marker: 'FloatingUIDOM',
    urls: [
      'https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js',
      'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js'
    ]
  }
];

async function isValid(entry) {
  const file = path.join(root, entry.target);
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size < entry.minBytes) return false;
    const source = await readFile(file, 'utf8');
    return source.includes(entry.marker);
  } catch {
    return false;
  }
}

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'zefirok-run-asset-vendor/0.79.5',
        Accept: 'application/javascript,text/javascript,*/*;q=0.1'
      }
    }, (res) => {
      const status = Number(res.statusCode || 0);
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location && redirects < 5) {
        res.resume();
        resolve(request(new URL(location, url).href, redirects + 1));
        return;
      }
      if (status !== 200) {
        res.resume();
        reject(new Error(`HTTP ${status} for ${url}`));
        return;
      }
      resolve(res);
    });
    req.setTimeout(30000, () => req.destroy(new Error(`Timeout for ${url}`)));
    req.on('error', reject);
  });
}

async function download(entry) {
  const target = path.join(root, entry.target);
  const temp = `${target}.tmp-${process.pid}`;
  await mkdir(path.dirname(target), { recursive: true });
  let lastError = null;
  for (const url of entry.urls) {
    try {
      const response = await request(url);
      await new Promise((resolve, reject) => {
        const stream = createWriteStream(temp, { flags: 'w' });
        response.pipe(stream);
        response.on('error', reject);
        stream.on('error', reject);
        stream.on('finish', resolve);
      });
      const source = await readFile(temp, 'utf8');
      if (Buffer.byteLength(source) < entry.minBytes || !source.includes(entry.marker)) {
        throw new Error(`Downloaded file failed validation: ${entry.name}`);
      }
      await rename(temp, target);
      return;
    } catch (error) {
      lastError = error;
      await rm(temp, { force: true });
    }
  }
  throw lastError || new Error(`Unable to download ${entry.name}`);
}

let failed = false;
for (const entry of packages) {
  const valid = await isValid(entry);
  if (checkOnly) {
    console.log(`${valid ? 'OK' : 'MISSING'} ${entry.target}`);
    failed ||= !valid;
    continue;
  }
  if (valid && !force) {
    console.log(`OK ${entry.target}`);
    continue;
  }
  try {
    await download(entry);
    console.log(`DOWNLOADED ${entry.name} -> ${entry.target}`);
  } catch (error) {
    failed = true;
    console.error(`FAILED ${entry.name}: ${error.message}`);
  }
}

if (failed) process.exitCode = 1;
