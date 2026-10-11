import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {CATALOG} from '../catalog.js';
import {addObject,checkPlacement,dims,makeInitialCity,sanitizeCity} from '../engine.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {catalogSpriteId,parkConstructionAssetId,spriteMetadata} from '../sprite-assets.js';

const assets=SPRITE_MANIFEST.assets;
test('children playground footprint is truly 2x2 in all directions and both manifests',()=>{
 assert.deepEqual([CATALOG.playground.w,CATALOG.playground.h],[2,2]);
 for(let rotation=0;rotation<4;rotation++){
  assert.deepEqual(dims(CATALOG.playground,rotation),{w:2,h:2});
  for(const id of [catalogSpriteId('playground',rotation),...['build_01','build_02','build_03'].map(s=>parkConstructionAssetId('playground',rotation,s))]){
   const a=spriteMetadata(id);
   assert.deepEqual(a.footprint,[2,2],id);
   const groundBottom=(a.height-a.anchorY)/a.assetScale;
   assert.ok(groundBottom>=68&&groundBottom<=77,`${id}: contact ${groundBottom.toFixed(2)} != 2x2 floor (72)`);
   assert.ok(Math.abs((a.width/2-a.anchorX)/a.assetScale)<=0.3,`${id}: sprite should be centred above 2x2 diamond`);
  }
 }
 const source=fileURLToPath(new URL('../assets/manifest.json',import.meta.url));
 const file=JSON.parse(readFileSync(source,'utf8'));
 for(const a of file.assets.filter(a=>a.catalogId==='playground')){
  const live=spriteMetadata(a.id);
  assert.deepEqual(a,live,`live and source metadata mismatch for ${a.id}`);
 }
});
test('flower square contacts 3x3 ground instead of appearing airborne',()=>{
 assert.deepEqual([CATALOG.garden.w,CATALOG.garden.h],[3,3]);
 for(let rotation=0;rotation<4;rotation++){
  const a=spriteMetadata(catalogSpriteId('garden',rotation));
  assert.deepEqual(a.footprint,[3,3]);
  const contact=(a.height-a.anchorY)/a.assetScale;
  assert.ok(contact>=108&&contact<=117,`${a.id} is hovering, contactY=${contact}`);
  const width=a.width/a.assetScale;
  assert.ok(width>=180&&width<=216,`${a.id}: garden width ${width} must fit 3x3 diamond (216)`);
 }
});
test('server catalog permits adjacent 2x2 playgrounds and existing saves remain valid',()=>{
 let city=makeInitialCity();
 city=addObject(city,CATALOG,'playground',16,16,0,1800000000000);
 assert.equal(checkPlacement(city,CATALOG,'playground',17,16,0).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'playground',18,16,0).ok,true);
 city=addObject(city,CATALOG,'playground',18,16,1,1800000000000);
 assert.equal(checkPlacement(city,CATALOG,'garden',20,16,0).ok,true);
 const saved=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.deepEqual(saved,city);
 const service=readFileSync(fileURLToPath(new URL('../../src/zeffi-world-service.js',import.meta.url)),'utf8');
 assert.match(service,/import\s+\{\s*CATALOG\s*\}\s+from\s+['"]\.\.\/world\/catalog\.js['"]/);
});
