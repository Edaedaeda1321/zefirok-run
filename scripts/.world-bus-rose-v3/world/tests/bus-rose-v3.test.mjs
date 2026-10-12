import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BUS_ART,BUS_ART_VERSION,busArtStatus,busModelHeading,preloadBusArt,drawBusModel} from '../bus-art.js';
const atlasPath=new URL('../assets/transport-v3/bus-rose-atlas.webp',import.meta.url);
const manifestPath=new URL('../assets/transport-v3/manifest.json',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const loadManifest=()=>JSON.parse(fs.readFileSync(manifestPath,'utf8'));
test('rose bus v3: all four approved original views are represented once',()=>{
 const m=loadManifest();
 assert.equal(m.version,'3.0.0');assert.equal(m.headings,4);assert.equal(m.variantCount,1);
 assert.deepEqual(m.frames.map(f=>f.direction),['se','sw','nw','ne']);
 assert.equal(new Set(m.frames.map(f=>f.sourceSha256)).size,4);
 assert.equal(new Set(m.frames.map(f=>`${f.x}:${f.y}`)).size,4);
 assert.deepEqual(m.anchor,[BUS_ART.anchorX,BUS_ART.anchorY]);
 assert.deepEqual(BUS_ART.directions,['se','sw','nw','ne']);
 for(const f of m.frames){
  assert.equal(f.anchorX,BUS_ART.anchorX);assert.equal(f.anchorY,BUS_ART.anchorY);
  assert.ok(f.opaqueBounds[0]>0&&f.opaqueBounds[2]<f.width,'side clipped '+f.direction);
  assert.ok(f.opaqueBounds[1]>0&&f.opaqueBounds[3]<f.height,'top/bottom clipped '+f.direction);
 }
});
test('rose bus v3: compact single atlas has integrity, and no new startup assets',()=>{
 const m=loadManifest(),data=fs.readFileSync(atlasPath);
 assert.equal(sha(data),m.atlasSha256);
 assert.equal(m.atlas,'bus-rose-atlas.webp');
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.ok(data.length<350000,'atlas should be smaller than former generated mesh');
 assert.equal(BUS_ART.file,'./assets/transport-v3/bus-rose-atlas.webp');
 assert.equal(BUS_ART_VERSION,'rose-bus-4-direction-v3');
});
test('rose bus v3: heading selects original, not mirrored or arbitrarily rotated images',()=>{
 const vectors=[[1,0,0],[0,1,1],[-1,0,2],[0,-1,3]];
 for(const [dx,dy,i] of vectors){assert.equal(busModelHeading({dx,dy}),i);}
 for(let n=-4;n<=4;n++)assert.equal(busModelHeading({heading:n*Math.PI/2}),(n+4)%4);
 for(const b of [{dx:1,dy:0,heading:0},{dx:0,dy:1,heading:Math.PI/2}])assert.equal(busModelHeading(b),b.heading===0?0:1);
});
test('rose bus v3: decoded atlas draws correct source quadrants with one shared road anchor',async()=>{
 const oldImage=globalThis.Image,oldWindow=globalThis.window,oldEvent=globalThis.Event;
 let loaded;
 class FakeImage{
  naturalWidth=768;naturalHeight=768;onload=null;onerror=null;
  set src(value){this._src=value;loaded=this;queueMicrotask(()=>this.onload?.());}
  get src(){return this._src;}
  decode(){return Promise.resolve();}
 }
 try{
  globalThis.Image=FakeImage;
  globalThis.window={ZeffiEmbeddedBusAtlas:null,dispatchEvent:()=>{}};
  globalThis.Event=class Event{constructor(type){this.type=type;}};
  await preloadBusArt();
  assert.ok(loaded.src.includes('?v=rose-bus-4-direction-v3'));
  assert.equal(busArtStatus().ready,true);
  const calls=[],ctx={imageSmoothingEnabled:false,save(){},restore(){},drawImage(...args){calls.push(args);}};
  for(const [index,[dx,dy]] of [[1,0],[0,1],[-1,0],[0,-1]].entries()){
   assert.equal(drawBusModel(ctx,{index:Math.max(index,1),dx,dy},100,200),true);
   const args=calls[index];
   assert.equal(args[0],loaded);
   assert.equal(args[1],(index%2)*384);
   assert.equal(args[2],Math.floor(index/2)*384);
   assert.equal(args[5],100-BUS_ART.anchorX*BUS_ART.scale);
   assert.equal(args[6],200-BUS_ART.anchorY*BUS_ART.scale);
  }
  assert.equal(calls.length,4);
 }finally{
  if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldEvent===undefined)delete globalThis.Event;else globalThis.Event=oldEvent;
 }
});
