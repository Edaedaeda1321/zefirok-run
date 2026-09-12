#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const manifestPath=path.join(root,'assets','images-manifest.json');
const sha=(data,length)=>createHash('sha256').update(data).digest('hex').slice(0,length);

function fail(message){throw new Error(message);}

const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(Number(manifest.version)!==2)fail(`images-manifest version must be 2, got ${manifest.version}`);
if(String(manifest.hashAlgorithm||'').toLowerCase()!=='sha256')fail('images-manifest hashAlgorithm must be sha256');
if(!Array.isArray(manifest.images))fail('images-manifest images must be an array');
if(Number(manifest.count)!==manifest.images.length)fail(`images-manifest count mismatch: ${manifest.count} != ${manifest.images.length}`);

const seen=new Set();
for(const item of manifest.images){
  const assetPath=String(item?.path||'');
  if(!assetPath.startsWith('/assets/'))fail(`invalid asset path: ${assetPath}`);
  if(seen.has(assetPath))fail(`duplicate asset path: ${assetPath}`);
  seen.add(assetPath);
  if(Object.hasOwn(item,'modified'))fail(`mtime field is forbidden in content manifest: ${assetPath}`);
  const relative=decodeURIComponent(assetPath.replace(/^\//,''));
  const absolute=path.join(root,relative);
  const data=await readFile(absolute);
  const info=await stat(absolute);
  const expectedHash=sha(data,12);
  if(String(item.hash||'')!==expectedHash)fail(`content hash mismatch: ${assetPath}`);
  if(Number(item.size)!==Number(info.size))fail(`size mismatch: ${assetPath}`);
}
const catalogHash=sha(manifest.images.map(item=>`${item.path}:${item.hash}`).join('\n'),16);
if(String(manifest.catalogHash||'')!==catalogHash)fail(`catalogHash mismatch: ${manifest.catalogHash} != ${catalogHash}`);
console.log(`Asset manifest OK: ${manifest.images.length} files, content catalog ${catalogHash}.`);
