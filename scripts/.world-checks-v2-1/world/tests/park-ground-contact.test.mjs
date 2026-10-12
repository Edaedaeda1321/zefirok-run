import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {CATALOG} from '../catalog.js';
import {addObject,checkPlacement,dims,makeInitialCity,sanitizeCity} from '../engine.js';
import {catalogSpriteId,parkConstructionAssetId,spriteMetadata} from '../sprite-assets.js';
import {worldSpriteVisualDock} from '../renderer.js';

// v11/v13 dock the opaque base at draw time. Raw image margins are NOT the
// rendered contact point. Do not mutate source metadata or the server footprint.
test('playground retains its current 3x2 footprint in all directions and both manifests',()=>{
 assert.deepEqual([CATALOG.playground.w,CATALOG.playground.h],[3,2]);
 for(let rotation=0;rotation<4;rotation++){
  const expected=rotation%2?{w:2,h:3}:{w:3,h:2};
  assert.deepEqual(dims(CATALOG.playground,rotation),expected);
  const ids=[catalogSpriteId('playground',rotation),...['build_01','build_02','build_03'].map(s=>parkConstructionAssetId('playground',rotation,s))];
  for(const id of ids){
   const a=spriteMetadata(id),snapshot=JSON.stringify(a);
   assert.deepEqual(a.footprint,[expected.w,expected.h],id);
   const dock=worldSpriteVisualDock(a,CATALOG.playground,rotation);
   assert.ok(dock,`${id}: missing runtime dock`);
   const [left,,right,bottom]=a.groundAlphaBounds;
   const contact=(bottom-dock.anchorY)/dock.assetScale;
   const plotBottom=(expected.w+expected.h)*18;
   assert.ok(contact>=plotBottom&&contact<=plotBottom+11,`${id}: contact ${contact} must meet the actual 3x2 plot`);
   const width=(right-left)/dock.assetScale;
   assert.ok(width>=165&&width<=185,`${id}: projected 3x2 width ${width} outside calibrated range`);
   const visualCenter=((left+right)/2-dock.anchorX)/dock.assetScale;
   assert.ok(Math.abs(visualCenter-(expected.w-expected.h)*18)<.3,`${id}: rectangular plot center drift`);
   assert.equal(JSON.stringify(a),snapshot,`${id}: rendering must not mutate shared metadata`);
  }
 }
 const source=fileURLToPath(new URL('../assets/manifest.json',import.meta.url));
 const file=JSON.parse(readFileSync(source,'utf8'));
 const retained=file.assets.filter(a=>a.catalogId==='playground');
 assert.equal(retained.length,16);
 for(const a of retained)assert.deepEqual(a,spriteMetadata(a.id),`live and source metadata mismatch for ${a.id}`);
});
test('flower square contacts 3x3 ground using the actual opaque-base render dock',()=>{
 assert.deepEqual([CATALOG.garden.w,CATALOG.garden.h],[3,3]);
 for(let rotation=0;rotation<4;rotation++){
  const a=spriteMetadata(catalogSpriteId('garden',rotation)),snapshot=JSON.stringify(a);
  assert.deepEqual(a.footprint,[3,3]);
  const dock=worldSpriteVisualDock(a,CATALOG.garden,rotation);
  assert.ok(dock,a.id);
  const [left,,right,bottom]=a.groundAlphaBounds;
  const contact=(bottom-dock.anchorY)/dock.assetScale;
  assert.ok(contact>=108&&contact<=117,`${a.id} is hovering, contactY=${contact}`);
  const width=(right-left)/dock.assetScale;
  assert.ok(width>=180&&width<=216,`${a.id}: garden width ${width} must fit 3x3 diamond (216)`);
  assert.equal(JSON.stringify(a),snapshot);
 }
});
test('shared server catalog permits adjacent rotated 3x2 playgrounds and saves remain valid',()=>{
 let city=makeInitialCity();
 city.wallet={...CATALOG.playground.price,points:CATALOG.playground.price.points*2};
 const now=1800000000000;
 city=addObject(city,CATALOG,'playground',16,16,0,now);
 assert.equal(checkPlacement(city,CATALOG,'playground',17,16,0).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'playground',18,16,0).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'playground',19,16,1).ok,true);
 city=addObject(city,CATALOG,'playground',19,16,1,now);
 assert.equal(checkPlacement(city,CATALOG,'garden',21,16,0).ok,true);
 assert.equal(city.wallet.points,0);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
 const service=readFileSync(fileURLToPath(new URL('../../src/zeffi-world-service.js',import.meta.url)),'utf8');
 assert.match(service,/import\s+\{\s*CATALOG\s*\}\s+from\s+['"]\.\.\/world\/catalog\.js['"]/);
});
