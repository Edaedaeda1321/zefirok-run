import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG, CATALOG_ITEMS} from '../catalog.js';
import {dims, makeInitialCity, sanitizeCity, cityStats} from '../engine.js';
import {worldSpriteGroundFit, worldGroundContactLayout} from '../renderer.js';
import {catalogSpriteId, spriteMetadata, drawSprite} from '../sprite-assets.js';

const EPS=1e-6;
const logicalBottom=(def,rot)=>{const {w,h}=dims(def,rot);return (w+h)*18;};

test('every purchasable object gets a finite, footprint-constrained ground contact for all four rotations',()=>{
 for(const def of CATALOG_ITEMS)for(let rotation=0;rotation<4;rotation++){
  const id=catalogSpriteId(def.id,rotation,'complete');
  const metadata=id?spriteMetadata(id):null;
  const placed={kind:def.id,rotation,x:12,y:13};
  const options=worldSpriteGroundFit(metadata,def,rotation);
  const contact=worldGroundContactLayout(placed,def,metadata,options);
  for(const n of Object.values(contact))assert.ok(Number.isFinite(n),`${def.id}/${rotation}: invalid shadow`);
  const {w,h}=dims(def,rotation);
  const expectedX=(placed.x+w/2-placed.y-h/2)*36;
  const expectedY=(placed.x+w/2+placed.y+h/2)*18;
  assert.equal(contact.x,expectedX,`${def.id}/${rotation}: wrong x ground contact`);
  assert.ok(Math.abs(contact.y-expectedY)<=5,`${def.id}/${rotation}: wrong y ground contact`);
  assert.ok(contact.radiusX>=12 && contact.radiusX<=(w+h)*18*1.12+EPS,`${def.id}/${rotation}: shadow beyond footprint`);
  assert.ok(contact.radiusY>0 && contact.radiusY < contact.radiusX*.5,`${def.id}/${rotation}: oversized shadow`);
 }
});

test('ground fit aligns flower garden foundation to its full 3x3 plot, all four facings',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const def=CATALOG.garden;
  const id=catalogSpriteId('garden',rotation);
  const a=spriteMetadata(id);
  const fit=worldSpriteGroundFit(a,def,rotation);
  const scale=fit?.assetScale||a.assetScale;
  assert.ok(Math.abs((a.height-a.anchorY)/scale-logicalBottom(def,rotation))<6,`${id} visibly hovers above terrain`);
  assert.ok(a.width/scale>(def.w+def.h)*36*.8,`${id} too small for 3x3 plot`);
 }
});

test('playground bases land on the chosen footprint, including already-corrected 2x2 installs',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const a=spriteMetadata(catalogSpriteId('playground',rotation));
  for(const [w,h] of [[3,2],[2,2]]){
   const def={...CATALOG.playground,w,h};
   const fit=worldSpriteGroundFit(a,def,rotation);
   const scale=fit?.assetScale||a.assetScale;
   // When using the original undersized pack, placement correction is exact;
   // an already-corrected pack can remain within +/- 6px of its own plot.
   assert.ok(Math.abs((a.height-a.anchorY)/scale-logicalBottom(def,rotation))<6,`${a.id} not grounded for ${w}x${h}`);
  }
 }
});

test('already-grounded v6 park asset metadata is left untouched',()=>{
 for(let rot=0;rot<4;rot++){
  const garden=spriteMetadata(catalogSpriteId('garden',rot));
  assert.equal(worldSpriteGroundFit({...garden,assetScale:3},CATALOG.garden,rot),null);
  const park=spriteMetadata(catalogSpriteId('playground',rot));
  const twoByTwo={...CATALOG.playground,w:2,h:2};
  const corrected={...park,assetScale:4.4,anchorX:park.width/2,footprint:[2,2]};
  assert.equal(worldSpriteGroundFit(corrected,twoByTwo,rot),null);
 }
});

test('correctly anchored houses and narrow benches/fountains are not scaled up or shifted',()=>{
 for(const kind of ['cottage','family-home','villa','coffee-house','bakery','tree','bench','fountain','lamp','flowerbed']){
  for(let rotation=0;rotation<4;rotation++){
   const a=spriteMetadata(catalogSpriteId(kind,rotation));
   if(a)assert.equal(worldSpriteGroundFit(a,CATALOG[kind],rotation),null,`${kind}/${rotation}: art must not move`);
  }
 }
 for(const kind of ['bench','fountain']){
  const def=CATALOG[kind],a=spriteMetadata(catalogSpriteId(kind));
  const contact=worldGroundContactLayout({x:12,y:13,rotation:0},def,a);
  assert.ok(contact.radiusX < ((def.w+def.h)*36)/2*.8,`${kind} casts an entire plot-sized shadow`);
 }
});

test('sprite-grounding renderer overrides change only the drawn rectangle, never metadata or city saves',()=>{
 const meta=spriteMetadata('extra_flower_garden_n');
 const before=JSON.stringify(meta);
 const point={x:180,y:260};
 const calls=[];
 const originalImage=globalThis.Image;
 try{
  globalThis.Image=class FakeImage{
   constructor(){this.complete=true;this.naturalWidth=meta.width;}
   set src(value){this._src=value;this.onload?.();}
  };
  const ctx={drawImage(...args){calls.push(args);}};
  const fit=worldSpriteGroundFit(meta,CATALOG.garden);
  // Sprite loader returns false while the first Image is queued.
  assert.equal(drawSprite(ctx,meta.id,point,fit),false);
  assert.equal(drawSprite(ctx,meta.id,point,fit),true);
  assert.equal(calls.length,1);
  const rect=calls[0].slice(1);
  const scale=fit?.assetScale||meta.assetScale;
  assert.deepEqual(rect,[point.x-(fit?.anchorX??meta.anchorX)/scale,point.y-(fit?.anchorY??meta.anchorY)/scale,meta.width/scale,meta.height/scale]);
  assert.equal(JSON.stringify(meta),before,'immutable source metadata was edited');
 }finally{
  if(originalImage===undefined)delete globalThis.Image;
  else globalThis.Image=originalImage;
 }
 const city=makeInitialCity();
 const original=JSON.stringify(city);
 for(const def of CATALOG_ITEMS){
  const id=catalogSpriteId(def.id,0);
  worldGroundContactLayout({x:13,y:14,rotation:0},def,id?spriteMetadata(id):null);
 }
 assert.equal(JSON.stringify(city),original,'renderer wrote to a saved city');
 assert.deepEqual(sanitizeCity(structuredClone(city),CATALOG),city);
 assert.deepEqual(cityStats(city,CATALOG),cityStats(structuredClone(city),CATALOG));
});
