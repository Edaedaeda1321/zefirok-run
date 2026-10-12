import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,CATALOG_ITEMS,CATEGORIES} from '../catalog.js';
import {dims,makeInitialCity,cloneCity} from '../engine.js';
import {worldSpriteGroundFit,worldSpriteVisualDock,worldGroundContactLayout} from '../renderer.js';
import {catalogSpriteId,spriteMetadata} from '../sprite-assets.js';

const PACK=['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square'];
const DIR=['n','e','s','w'];
const STAGES=['build_01','build_02','build_03','complete'];

test('v13: every new building state has deterministic ground docking independent of state clock',()=>{
 let checks=0;
 for(const kind of PACK){
  const def=CATALOG[kind];assert.ok(def,kind);
  for(let r=0;r<4;r++){
   const docked=[];
   for(const state of STAGES){
    const id=`world_${kind.replaceAll('-','_')}_${state==='complete'?'':state+'_'}${DIR[r]}`;
    const meta=spriteMetadata(id);assert.ok(meta,id);
    const baseline=worldSpriteGroundFit(meta,def,r);
    const next=worldSpriteVisualDock(meta,def,r);
    assert.ok(next,`${id} should be docked`);
    assert.equal(next.anchorX,baseline.anchorX,`${id}: X grid must remain unchanged`);
    assert.equal(next.assetScale,baseline.assetScale,`${id}: footprint width must not change`);
    const depth=(baseline.anchorY-next.anchorY)/next.assetScale;
    assert.ok(depth>=5&&depth<=8,`${id}: ground embed ${depth} outside safe range`);
    const {w,h}=dims(def,r);
    const [left,,right,bottom]=meta.groundAlphaBounds;
    const plotLeft=-h*36,plotRight=w*36,plotBottom=(w+h)*18;
    const renderLeft=(left-next.anchorX)/next.assetScale;
    const renderRight=(right-next.anchorX)/next.assetScale;
    const renderBottom=(bottom-next.anchorY)/next.assetScale;
    assert.ok(renderLeft>=plotLeft-4 && renderRight<=plotRight+4,`${id}: footprint X drift`);
    assert.ok(renderBottom>=plotBottom-6&&renderBottom<=plotBottom+15,`${id}: ground contact drift`);
    docked.push(renderBottom);
    checks++;
   }
   assert.ok(Math.max(...docked)-Math.min(...docked)<8,`${kind}/${DIR[r]}: construction jumps vertically`);
  }
 }
 assert.equal(checks,112);
});

test('v13: old buildings and premium decor are grounded without rescaling or moving saved objects',()=>{
 const city=makeInitialCity(); const before=JSON.stringify(city);
 for(const def of CATALOG_ITEMS)for(let rotation=0;rotation<4;rotation++){
  const id=catalogSpriteId(def.id,rotation,'complete');
  const meta=id?spriteMetadata(id):null;
  if(!meta)continue;
  const base=worldSpriteGroundFit(meta,def,rotation);
  const docked=worldSpriteVisualDock(meta,def,rotation);
  if(!base){assert.equal(docked,null);continue;}
  assert.equal(docked.assetScale,base.assetScale);
  assert.equal(docked.anchorX,base.anchorX);
  if(def.category==='landscape'||def.category==='paths'||(def.layer==='surface'&&!def.blockingSurface))
   assert.equal(docked.anchorY,base.anchorY,`${id}: flat terrain must not be sunk`);
  else {
   assert.ok(docked.anchorY<base.anchorY,`${id} should be placed closer to soil`);
   if(def.blockingSurface)assert.ok(Math.abs((base.anchorY-docked.anchorY)/base.assetScale-6)<1e-7,`${id}: solid v14 plaza uses six-pixel render docking`);
  }
  const m=worldGroundContactLayout({x:11,y:12,rotation},def,meta,docked);
  assert.ok(m.radiusY>0&&m.radiusY<m.radiusX*.5);
 }
 assert.equal(JSON.stringify(city),before);
 assert.equal(JSON.stringify(cloneCity(city)),before);
});

test('v13: category registry still exposes all eight sections including transport',()=>{
 assert.deepEqual([...CATEGORIES],['all','homes','shops','transport','parks','plazas','landscape','decor']);
});
