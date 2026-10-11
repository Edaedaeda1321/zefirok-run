#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=process.cwd();
const files=[
 'icon_Mir_zeffi_world_stranitca.webp',
 'icon_catolog_stroinka.webp',
 'icon_all_stroika.webp',
 'icon_house.webp',
 'icon_zavedenia.webp',
 'icon_parks.webp',
 'icon_ploshadki.webp',
 'icon_landshaft.webp',
 'icon_decor.webp',
 'iconScore.webp',
 'iconCoffee.webp',
 'zefir_currency.webp'
];
for(const name of files){
 const pathname=path.join(root,'assets/mir_zeffi',name);
 assert(existsSync(pathname),`Missing World Zeffi UI image: ${name}`);
 const bytes=readFileSync(pathname);
 assert(bytes.length>1000,`World Zeffi image is unexpectedly empty: ${name}`);
 assert(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP',`Not a valid WebP header: ${name}`);
 assert(bytes.length<120_000,`Mobile icon exceeds optimized 120 KB limit: ${name}`);
}
const manifest=JSON.parse(readFileSync(path.join(root,'assets/images-manifest.json'),'utf8'));
assert.equal(manifest.count,manifest.images.length,'Image manifest count mismatch');
for(const name of files){
 const asset=manifest.images.find(x=>x.path===`/assets/mir_zeffi/${name}`);
 assert(asset,`The cache/image manifest does not register World Zeffi UI art: ${name}`);
 const data=readFileSync(path.join(root,'assets/mir_zeffi',name));
 assert.equal(asset.hash,createHash('sha256').update(data).digest('hex').slice(0,12),`${name}: manifest hash is stale`);
 assert.equal(asset.size,data.length,`${name}: manifest size is stale`);
}
const actualCatalogHash=createHash('sha256').update(manifest.images.map(x=>`${x.path}:${x.hash}`).join('\n')).digest('hex').slice(0,16);
assert.equal(manifest.catalogHash,actualCatalogHash,'Cache build hash is stale');
for(const file of ['world/index.html','world.html']){
 const html=readFileSync(path.join(root,file),'utf8');
 assert(html.includes('icon_Mir_zeffi_world_stranitca.webp'),`${file}: missing world header icon`);
 assert(html.includes('icon_catolog_stroinka.webp'),`${file}: missing building catalog icon`);
 for(const name of ['iconScore.webp','iconCoffee.webp','zefir_currency.webp']){
  assert(html.includes(`../assets/mir_zeffi/${name}`),`${file}: wallet icon outside World Zeffi folder: ${name}`);
 }
 assert(html.includes('src="./premium-ui.css"')||html.includes('href="./premium-ui.css"'),`${file}: premium style not loaded`);
}
const app=readFileSync(path.join(root,'world/app.js'),'utf8');
assert(app.includes('CATEGORY_IMAGES'), 'Category images are not connected');
for(const name of ['icon_all_stroika.webp','icon_house.webp','icon_zavedenia.webp','icon_parks.webp','icon_ploshadki.webp','icon_landshaft.webp','icon_decor.webp']){
 assert(app.includes(name), `Category icon is not wired in world/app.js: ${name}`);
}
assert(app.includes('addPreviewCurrencyPrice'), 'Preview prices must contain real currency images');
assert(app.includes("if(summaryPrice)addPreviewCurrencyPrice($('editSummary'),summaryPrice)"), 'Preview cost not applied to construction summary');
assert(app.includes('const SERVER_MODE = window.ZeffiWorldServerRequired === true'), 'World client server authority was modified');
const standalone=readFileSync(path.join(root,'world/build-standalone.py'),'utf8');
for(const name of files)assert(standalone.includes(name),`Offline preview does not embed ${name}`);
assert(!readFileSync(path.join(root,'.assetsignore'),'utf8').includes('assets/mir_zeffi'), 'UI image directory must be deployable');
console.log('World Zeffi UI images v4: 12 WebP + hashed manifest, 2 game entries, all category icons, preview currency, offline preview — PASS');
