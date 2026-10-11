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

test('flower garden and playground use measured opaque bounds, not the transparent WebP margins',()=>{
 for(const kind of ['garden','playground'])for(let rotation=0;rotation<4;rotation++){
  const def=CATALOG[kind];
  const id=catalogSpriteId(kind,rotation);
  const a=spriteMetadata(id);
  const fit=worldSpriteGroundFit(a,def,rotation);
  const scale=fit.assetScale;
  const alpha=a.groundAlphaBounds;
  const actualWidth=(alpha[2]-alpha[0])/scale;
  const {w,h}=dims(def,rotation);
  const footprintWidth=(w+h)*36;
  const expectedBottom=logicalBottom(def,rotation)-Math.max(0,footprintWidth-actualWidth)/4+2;
  const actualBottom=(alpha[3]-fit.anchorY)/scale;
  assert.ok(Math.abs(actualBottom-expectedBottom)<.05,`${id}: visible bottom is not seated`);
  assert.ok(actualWidth>=footprintWidth*.919,`${id}: foundation visibly undersized`);
  assert.ok(actualWidth<=footprintWidth*.921,`${id}: foundation overshoots plot`);
 }
});

test('playground grounding also supports saved 2x2 footprint variants',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const a=spriteMetadata(catalogSpriteId('playground',rotation));
  const def={...CATALOG.playground,w:2,h:2};
  const fit=worldSpriteGroundFit(a,def,rotation);
  const {w,h}=dims(def,rotation);
  const width=(a.groundAlphaBounds[2]-a.groundAlphaBounds[0])/fit.assetScale;
  const expectedBottom=(w+h)*18-Math.max(0,(w+h)*36-width)/4+2;
  assert.ok(Math.abs((a.groundAlphaBounds[3]-fit.anchorY)/fit.assetScale-expectedBottom)<.05);
  assert.ok(Math.abs(width/((w+h)*36)-.92)<.002);
 }
});

test('ready houses retain their scale, while thin decor and stages get accurate ground anchors',()=>{
 for(const kind of ['cottage','family-home','villa','coffee-house','bakery','tree','bench','fountain','lamp','flowerbed']){
  for(let rotation=0;rotation<4;rotation++){
   const a=spriteMetadata(catalogSpriteId(kind,rotation));
   if(!a||!a.groundAlphaBounds)continue;
   const fit=worldSpriteGroundFit(a,CATALOG[kind],rotation);
   assert.ok(Math.abs(fit.assetScale-a.assetScale)<1e-6,`${kind}/${rotation}: no scale changes`);
   assert.ok(Number.isFinite(fit.anchorX)&&Number.isFinite(fit.anchorY));
  }
 }
 for(const kind of ['bench','fountain']){
  const def=CATALOG[kind],a=spriteMetadata(catalogSpriteId(kind));
  const fit=worldSpriteGroundFit(a,def);
  assert.ok((a.groundAlphaBounds[3]-fit.anchorY)/fit.assetScale>(a.groundAlphaBounds[3]-a.anchorY)/a.assetScale+2,`${kind} base is still too high`);
  const contact=worldGroundContactLayout({x:12,y:13,rotation:0},def,a,fit);
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
