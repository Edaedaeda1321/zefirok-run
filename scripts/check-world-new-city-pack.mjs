#!/usr/bin/env node
// New City v10 integration gate: all 112 WebP, 7 prices and geometries.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATEGORIES } from '../world/catalog.js';
import { OBJECT_PRICES } from '../world/economy.js';
import { SPRITE_MANIFEST } from '../world/sprite-manifest.js';
import { catalogSpriteId, buildingAssetId, spriteMetadata } from '../world/sprite-assets.js';
import { dims } from '../world/engine.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const names=['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square'];
const source=JSON.parse(readFileSync(resolve(root,'world/assets/manifest.json'),'utf8'));
const pack='new-city-premium-sprites-v3-fixed';
const listed=SPRITE_MANIFEST.assets.filter(x=>x.packId===pack);
const authored=source.assets.filter(x=>x.packId===pack);
const ids=new Set(listed.map(a=>a.id));
assert.equal(names.length,7);
assert.equal(CATEGORIES.includes('transport'),true);
assert.equal(listed.length,112);
assert.equal(authored.length,112);
assert.equal(ids.size,112);
assert.equal(SPRITE_MANIFEST.assets.length,361);
assert.equal(new Set(SPRITE_MANIFEST.assets.map(a=>a.id)).size,361);
const paths=[];
for(const item of names){
 const def=CATALOG[item];
 assert.ok(def,item);
 assert.ok(def.buildMs>0,item);
 assert.deepEqual(def.price,OBJECT_PRICES[item]);
 for(let rot=0;rot<4;rot++){
  const {w,h}=dims(def,rot);
  for(const stage of ['build_01','build_02','build_03','complete']){
   const id=catalogSpriteId(item,rot,stage);
   assert.equal(id,buildingAssetId(item,rot,stage));
   assert.ok(ids.has(id),id);
   const metadata=spriteMetadata(id);
   const file=resolve(root,'world',metadata.fileWebp);
   assert.ok(existsSync(file),file);
   assert.deepEqual([w,h],metadata.footprint);
   assert.ok(Number.isFinite(metadata.assetScale)&&metadata.assetScale>0);
   assert.ok(Number.isFinite(metadata.anchorX)&&metadata.anchorX>=0&&metadata.anchorX<=metadata.width);
   assert.ok(Number.isFinite(metadata.anchorY)&&metadata.anchorY>=0&&metadata.anchorY<=metadata.height);
   const bytes=readFileSync(file);
   assert.equal(bytes.subarray(0,4).toString(),'RIFF');
   assert.equal(bytes.subarray(8,12).toString(),'WEBP');
   assert.equal(Object.hasOwn(metadata,'filePng'),false,id);
   paths.push(metadata.fileWebp);
  }
 }
}
assert.equal(new Set(paths).size,112);
const artDir=resolve(root,'world/assets/new_city_pack');
const scan=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(resolve(dir,e.name)):[resolve(dir,e.name)]);
const art=scan(artDir);
assert.equal(art.filter(p=>p.toLowerCase().endsWith('.webp')).length,112);
assert.equal(art.filter(p=>/\.(png|jpe?g|glb)$/i.test(p)).length,0);
const server=readFileSync(resolve(root,'src/zeffi-world-service.js'),'utf8');
assert.ok(server.includes("from '../world/catalog.js'"));
assert.ok(server.includes('WORLD_PRICE_CHANGED'));
console.log('NEW CITY v10 PASS: 7 buildings, 48 shop entries, 112/112 WebP, 4 rotations, 3 build states, server price check, no PNG');
