#!/usr/bin/env node
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=relative=>readFile(path.join(root,relative),'utf8');
const exists=async relative=>{try{await access(path.join(root,relative));return true}catch{return false}};
const fail=message=>{console.error(`P2 HARDENING FAILED: ${message}`);process.exit(1)};

const [index,sw,album,staff,tp,ignore,deployGate,prodGate]=await Promise.all([
  read('index.html'),read('asset-cache-sw.js'),read('album.html'),read('staff-qr.html'),read('test-project.html'),read('.assetsignore'),read('scripts/check-deploy-assets.mjs'),read('scripts/check-production-gate.mjs')
]);

// P2.1: cache generation is content-addressed and cannot drift by date.
if(/STATIC_ASSET_CACHE_BUILD\s*=/.test(index)) fail('index.html still contains a manual STATIC_ASSET_CACHE_BUILD.');
if(!index.includes('/assets/images-manifest.json')||!index.includes('catalogHash')||!index.includes('resolveStaticAssetCacheBuild')) fail('index.html does not derive Service Worker cache build from images-manifest catalogHash.');
if(!sw.includes('cacheVersionFromRegistration')||!sw.includes('self.location.href')||/CACHE_VERSION\s*=\s*["\']20\d{6}/.test(sw)) fail('asset-cache-sw.js is not registration-versioned or still contains a dated cache literal.');

// P2.2: fail when a production HTML references a raster alias that exists only as WebP.
const htmlFiles=['index.html','battle-pass.html','rating.html','referrals.html','achievements.html','album.html','legal.html','owner.html','staff-qr.html','test-project.html'];
const aliasOnly=[];
const refRe=/["'`](\/assets\/[^"'`?#]+\.(?:png|jpe?g))(?:[?#][^"'`]*)?["'`]/gi;
for(const file of htmlFiles){
  const source=await read(file);
  for(const match of source.matchAll(refRe)){
    const requested=decodeURIComponent(match[1].replace(/^\//,''));
    if(await exists(requested)) continue;
    const webp=requested.replace(/\.(?:png|jpe?g)$/i,'.webp');
    if(await exists(webp)) aliasOnly.push(`${file}: /${requested} -> /${webp}`);
  }
}
if(aliasOnly.length) fail(`alias-only raster reference(s):\n  ${aliasOnly.join('\n  ')}`);
if(album.includes('icon_closed.png')||staff.includes('icon_closed.png')) fail('icon_closed.png legacy reference returned.');

// P2.3: the last staff scanner raw API is deadline-bound and reconciles an unknown redeem result.
for(const token of ['STAFF_API_TIMEOUT_MS','new AbortController()','REQUEST_TIMEOUT','outcomeUnknown','reconcileRedeemOutcome']) if(!staff.includes(token)) fail(`staff-qr network contract missing ${token}.`);
const networkContracts={
  'index.html':['gameFetchWithTimeout','AbortController'],
  'battle-pass.html':['AbortController','requestId'],
  'rating.html':['REQUEST_TIMEOUT_MS','AbortController'],
  'referrals.html':['AbortController'],
  'achievements.html':['AbortController','requestId'],
  'album.html':['AbortController','requestId'],
  'legal.html':['legalFetchJson','AbortController'],
  'staff-qr.html':['STAFF_API_TIMEOUT_MS','reconcileRedeemOutcome']
};
for(const [file,tokens] of Object.entries(networkContracts)){
  const source=await read(file);
  for(const token of tokens) if(!source.includes(token)) fail(`${file} lost required network/recovery token ${token}.`);
}

// P2.4: obsolete profile and local candidate pipeline are not deployable public assets.
const ignoreLines=new Set(ignore.split(/\r?\n/).map(v=>v.trim()).filter(Boolean));
for(const rule of ['profile.html','candidate-console.html','candidates/']) if(!ignoreLines.has(rule)) fail(`.assetsignore missing ${rule}.`);
for(const rule of ["'profile.html'","'candidate-console.html'","'candidates/'"]) if(!deployGate.includes(rule)) fail(`check-deploy-assets.mjs does not enforce ${rule}.`);
if(!tp.includes('candidatePipelineLocal')||!tp.includes("location.hostname")) fail('Test Project does not hide Candidate Pipeline outside localhost.');
if(!prodGate.includes('check-p2-hardening.mjs')) fail('Production gate does not include P2 hardening check.');

const swSize=(await stat(path.join(root,'asset-cache-sw.js'))).size;
console.log(`P2 hardening OK: content-addressed SW cache, canonical raster refs, bounded/recoverable UI requests, private legacy/staging assets (${swSize} B SW).`);
