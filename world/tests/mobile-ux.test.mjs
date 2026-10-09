import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeInitialCity, cityStats } from '../engine.js';
import { CATALOG } from '../catalog.js';
import { RU } from '../ru.js';
import { catalogSpriteId, preloadSpriteSet, spriteStatus } from '../sprite-assets.js';

const read = path => readFileSync(new URL(path,import.meta.url),'utf8');

test('the city counts buildings, not trees, beds or lamps, without changing old metrics',()=>{
 const initial=makeInitialCity();
 const metrics=cityStats(initial,CATALOG);
 assert.equal(metrics.buildings,4,'legacy total-object metric is preserved');
 assert.equal(metrics.structures,1,'only the cottage is a real building');
 assert.equal(metrics.connected,1,'cottage is connected to the original road');
 const grown={...initial,objects:[...initial.objects,{...initial.objects[0],uid:'new-shop',kind:'coffee-kiosk',x:20,y:20}]};
 assert.equal(cityStats(grown,CATALOG).structures,2,'residences and shops count');
 assert.equal(RU.objects,'Здания');
 assert.equal(RU.connected,'С дорогой');
});

test('no selectable content or 3D/2D toggle in both hosted and standalone city pages',()=>{
 const style=read('../world.css');
 const runtime=read('../app.js');
 for(const html of [read('../../world.html'),read('../index.html')]){
  assert.doesNotMatch(html,/id="artModeButton"/);
  assert.match(html,/data-t="population"/);
  assert.match(html,/data-t="comfort"/);
  assert.match(html,/id="comfortTier"/);
 }
 assert.match(style,/-webkit-user-select:none!important/);
 assert.match(style,/-webkit-touch-callout:none!important/);
 assert.match(runtime,/'contextmenu','selectstart','dragstart','copy','cut'/);
 assert.doesNotMatch(runtime,/ART_KEY|artModeButton/);
 assert.match(runtime,/setSpriteMode\(true\)/);
});

test('signed server city prepares image art before displaying the D1 snapshot',()=>{
 const source=read('../app.js');
 const start=source.indexOf("const result=await serverRequest('state');");
 const prepared=source.indexOf('await prepareInitialArt(result.city);',start);
 const accepted=source.indexOf('acceptServerCity(result);unlockServer();',start);
 assert(start>=0&&prepared>start&&accepted>prepared);
 assert.match(source,/if\(art.failed\)throw new Error/);
 assert.match(source,/for\(let rotation=0;rotation<4;rotation\+\+\)/);
 assert.match(source,/stats\.population/);
 assert.match(source,/stats\.comfort/);
 assert.match(source,/sampleCitizenScene/);
 assert.match(source,/await preloadBuildFrames\(item.kind,item.rotation\);/);
 assert.doesNotMatch(source,/Promise\.race\(\[preloadBuildFrames/);
});

test('all directional house sprites can be decoded before a player rotates',async()=>{
 const saved=globalThis.Image;
 const created=[];
 class MockImage{
  #callbacks=new Map();
  complete=false;naturalWidth=0;
  decoding='async';
  addEventListener(type,fn){const old=this.#callbacks.get(type)||[];old.push(fn);this.#callbacks.set(type,old);}
  set src(value){this.url=value;created.push(value);queueMicrotask(()=>{this.complete=true;this.naturalWidth=250;this.onload?.();for(const fn of this.#callbacks.get('load')||[])fn();});}
  async decode(){if(!this.complete){await new Promise(resolve=>this.addEventListener('load',resolve));}return;}
 }
 globalThis.Image=MockImage;
 try{
  const ids=Array.from({length:4},(_,r)=>catalogSpriteId('family-home',r));
  assert.equal(new Set(ids).size,4);
  const result=await preloadSpriteSet([...ids,...ids],{pin:true});
  assert.deepEqual([result.total,result.loaded,result.failed],[4,4,0]);
  assert.equal(created.length,4,'repeated preload requests reuse decoded images');
  assert.equal(spriteStatus().loaded>=4,true);
  const retry=await preloadSpriteSet(ids,{pin:true});
  assert.equal(retry.failed,0);
  assert.equal(created.length,4,'rotations never re-fetch art after initial preloading');
 }finally{if(saved===undefined)delete globalThis.Image;else globalThis.Image=saved;}
});
