import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_ITEMS } from '../catalog.js';
import { dims, makeInitialCity, cloneCity } from '../engine.js';
import { worldSpriteGroundFit, worldGroundContactLayout } from '../renderer.js';
import { spriteMetadata, catalogSpriteId } from '../sprite-assets.js';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';

const NEW_BUILDINGS=['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square'];
const DIRECTIONS=['n','e','s','w'];
const STATES=['build_01','build_02','build_03','complete'];
const EPS=.0001;

function groundShape(meta,def,rotation=0){
 const {w,h}=dims(def,rotation);
 const fit=worldSpriteGroundFit(meta,def,rotation);
 assert.ok(fit,`${meta.id}: missing dock`);
 const {assetScale,anchorX,anchorY}=fit;
 const [left,,right,bottom]=meta.groundAlphaBounds;
 const output={
  left:(left-anchorX)/assetScale,
  right:(right-anchorX)/assetScale,
  bottom:(bottom-anchorY)/assetScale,
  plotLeft:-h*36,plotRight:w*36,plotBottom:(w+h)*18,
  width:(right-left)/assetScale,
  scale:assetScale
 };
 assert.ok(Object.values(output).every(Number.isFinite),`${meta.id}: non-finite dock`);
 return output;
}

test('each new building: all 16 frames have fitted anchors and a planted ground edge',()=>{
 let checked=0;
 for(const id of NEW_BUILDINGS){
  const def=CATALOG[id];
  assert.ok(def,`missing building: ${id}`);
  for(let rot=0;rot<4;rot++){
   for(const state of STATES){
    const artId=STATES.includes(state)&&state!=='complete'?
     `world_${id.replaceAll('-','_')}_${state}_${DIRECTIONS[rot]}`:
     `world_${id.replaceAll('-','_')}_${DIRECTIONS[rot]}`;
    const meta=spriteMetadata(artId);
    assert.ok(meta,`${artId}: missing`);
    const fit=groundShape(meta,def,rot);
    assert.ok(fit.left>=fit.plotLeft-4&&fit.right<=fit.plotRight+4,`${artId}: outside x footprint`);
    assert.ok(fit.width>(fit.plotRight-fit.plotLeft)*.90,`${artId}: undersized ground`);
    assert.ok(Math.abs(fit.bottom-(fit.plotBottom+2.5))<1.3,`${artId}: stage does not meet grass`);
    checked++;
   }
  }
 }
 assert.equal(checked,112);
});

test('older parks fill their true logical plots (including rotated 3x2 and compatible saved 2x2)',()=>{
 for(const id of ['garden','playground'])for(let rot=0;rot<4;rot++){
  const meta=spriteMetadata(catalogSpriteId(id,rot));
  const fitted=groundShape(meta,CATALOG[id],rot);
  assert.ok(Math.abs(fitted.width/(fitted.plotRight-fitted.plotLeft)-.92)<EPS);
 }
 for(let rot=0;rot<4;rot++){
  const meta=spriteMetadata(catalogSpriteId('playground',rot));
  const fitted=groundShape(meta,{...CATALOG.playground,w:2,h:2},rot);
  assert.ok(Math.abs(fitted.width/(fitted.plotRight-fitted.plotLeft)-.92)<EPS);
 }
});

test('sparse assets keep their intended visual scale but their feet are seated, not forced to fill the plot',()=>{
 for(const id of ['bench','fountain','tree','lamp','cottage','family-home','villa'])for(let r=0;r<4;r++){
  const meta=spriteMetadata(catalogSpriteId(id,r));
  if(!meta)continue;
  const fitted=groundShape(meta,CATALOG[id],r);
  assert.ok(Math.abs(fitted.scale-meta.assetScale)<EPS,`${id}: unexpected resize`);
  const visual=meta.groundAlphaBounds;
  const old=(visual[3]-meta.anchorY)/meta.assetScale;
  if(['bench','fountain'].includes(id))assert.ok(fitted.bottom>old+1,`${id}: still floating`);
 }
});

test('all purchasable visible 3D assets have robust render-only alpha docking; save and city never change',()=>{
 const city=makeInitialCity();
 const before=JSON.stringify(city);
 for(const def of CATALOG_ITEMS)for(let rotation=0;rotation<4;rotation++){
  const name=catalogSpriteId(def.id,rotation,'complete');
  const meta=name?spriteMetadata(name):null;
  const fit=worldSpriteGroundFit(meta,def,rotation);
  if(meta&&!['roads','ground','landscape','paths'].includes(meta.category)&&def.layer!=='surface'){
   assert.ok(fit,`${def.id}/${rotation}: no ground fit`);
   const loc=groundShape(meta,def,rotation);
   const [min,max]=[loc.plotLeft,loc.plotRight];
   assert.ok(loc.left>=min-8&&loc.right<=max+8,`${name}: out of plot`);
  }
  const m=worldGroundContactLayout({x:11,y:12,rotation},def,meta,fit);
  assert.ok(Object.values(m).every(Number.isFinite));
 }
 assert.equal(JSON.stringify(city),before);
 assert.equal(JSON.stringify(cloneCity(city)),before);
});

test('meta-alpha bounds are precomputed for every object, preventing expensive mobile image scans',()=>{
 let tagged=0;
 for(const meta of SPRITE_MANIFEST.assets){
  if(meta.category==='roads'||meta.category==='ground'||meta.category==='landscape'||meta.category==='paths')continue;
  assert.ok(Array.isArray(meta.groundAlphaBounds),meta.id);
  const [x1,y1,x2,y2]=meta.groundAlphaBounds;
  assert.ok(Number.isInteger(x1)&&Number.isInteger(x2)&&Number.isInteger(y1)&&Number.isInteger(y2),meta.id);
  assert.ok(x1>=0&&x2<=meta.width&&x1<x2&&y1>=0&&y2<=meta.height&&y1<y2,meta.id);
  tagged++;
 }
 assert.ok(tagged>=300);
});
