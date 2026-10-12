import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOG,CATALOG_ITEMS} from '../catalog.js';
import {OBJECT_PRICES} from '../economy.js';
import {STORY_CATALOG,STORY_PARK_BELKINO_KIND,STORY_MAP_SIZE,buildStoryMap,validateStoryMap,placeById} from '../story/map.js';
import {createDemoState,setDemoChapter,simulateCommunityHelp,openProject} from '../story/model.js';
import {catalogSpriteId,spriteMetadata} from '../sprite-assets.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {worldSpriteGroundFit} from '../renderer.js';
import {requiredStorySpriteIds} from '../story/view.js';
import {buildCitizenScene,walkableCitizenRoads} from '../citizens.js';
import {buildBusScene} from '../traffic.js';
import {dims,keyOf} from '../engine.js';
const parkId=STORY_PARK_BELKINO_KIND;
const get=state=>buildStoryMap(state);
const funded=()=>{let s=createDemoState();for(let i=0;i<4;i++)s=simulateCommunityHelp(s,100000);return s;};

test('Belkino: one 9x9 story-only landmark; NOT available to the personal city shop or D1',()=>{
 assert.equal(STORY_MAP_SIZE,48);
 assert.equal(STORY_CATALOG[parkId].w,9);
 assert.equal(STORY_CATALOG[parkId].h,9);
 assert.equal(STORY_CATALOG[parkId].needsRoad,false);
 assert.equal(Object.hasOwn(CATALOG,parkId),false);
 assert.equal(CATALOG_ITEMS.some(item=>item.id===parkId),false);
 assert.equal(Object.hasOwn(OBJECT_PRICES,parkId),false);
 const p=placeById('belkino');assert.equal(p.kind,parkId);
 assert.deepEqual(p.focus,[12.5,26.5]);
});
for(let chapter=0;chapter<3;chapter++)for(const stateKind of ['funding','building','opening','active'])test(`Belkino map: no 9x9 overlap and roads/buses safe in chapter ${chapter}, ${stateKind}`,()=>{
 let state=stateKind==='funding'?createDemoState():funded();state=setDemoChapter(state,chapter);const now=stateKind==='building'?100001:200000;
 if(stateKind==='active')state=openProject(state,now);
 const city=get(state),objects=city.objects.filter(x=>x.kind===parkId);
 assert.deepEqual(validateStoryMap(city),[]);
 assert.equal(objects.length,1);
 const item=objects[0];assert.equal(item.uid,'story-pond');assert.equal(item.x,8);assert.equal(item.y,22);
 const roadSet=new Set(city.roads),asphalt=new Set(city.busRoads);
 for(let x=8;x<17;x++)for(let y=22;y<31;y++){
  assert.equal(roadSet.has(keyOf(x,y)),false,`footpath through park ${x},${y}`);
  assert.equal(asphalt.has(keyOf(x,y)),false,`asphalt through park ${x},${y}`);
 }
 for(const other of city.objects.filter(x=>x.uid!==item.uid)){
  const {w,h}=dims(STORY_CATALOG[other.kind],other.rotation||0);
  assert.ok(other.x+w<=8||other.x>=17||other.y+h<=22||other.y>=31,`park overlaps ${other.kind}`);
 }
 assert.ok(city.objects.some(x=>x.kind==='playground'),'playground still exists south of the park');
 assert.equal(city.objects.some(x=>x.kind==='pond-park'),false,'old miniature park is removed');
 assert.equal(buildCitizenScene(city,STORY_CATALOG,100,now,400).routes.length,12);
 assert.equal(buildBusScene(city,STORY_CATALOG).routes.length,2);
 assert.equal(city.crosswalks.length,chapter===2?8:7);
 assert.ok(walkableCitizenRoads(city,STORY_CATALOG).has('17,29'),'park has sidewalk access on eastern side');
});

test('Belkino four review WebPs are separate, correctly registered, transparent, scaled and not certified true rotations',()=>{
 const sourceLabels=new Set(),names=new Set();
 const disk=JSON.parse(fs.readFileSync(new URL('../assets/manifest.json',import.meta.url),'utf8'));
 for(const dir of ['n','e','s','w']){
  const id=catalogSpriteId(parkId,{'n':0,'e':1,'s':2,'w':3}[dir]);
  const meta=spriteMetadata(id);
  assert.ok(meta,id);assert.equal(meta.packId,'park-belkino-story-v1');
  assert.equal(meta.directionVerified,false);
  assert.deepEqual(meta.footprint,[9,9]);
  assert.ok(Number.isFinite(meta.assetScale)&&meta.assetScale>1.4&&meta.assetScale<1.9);
  assert.ok(meta.fileWebp.startsWith('assets/park-belkino-story-v1/'));
  assert.ok(meta.width===960&&meta.height===960);
  const bytes=fs.readFileSync(new URL('../'+meta.fileWebp,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>100000&&bytes.length<430000,'mobile WebP budget '+id);
  assert.ok(worldSpriteGroundFit(meta,STORY_CATALOG[parkId]));
  assert.deepEqual(disk.assets.find(x=>x.id===id),meta);
  sourceLabels.add(meta.directionSourceLabel);names.add(id);
 }
 assert.equal(sourceLabels.size,4);assert.equal(names.size,4);
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='park-belkino-story-v1').length,4);
 assert.equal(requiredStorySpriteIds().filter(id=>id.startsWith('story_park_belkino')).length,1,'fixed story district preloads only the visible facing');
});

test('Belkino visual landmark does not introduce live economy, D1 or new server actions',()=>{
 for(const file of ['../story/map.js','../story/app.js','../sprite-assets.js']){
  const code=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  assert.ok(!/\/api\/world\/mutate|\/api\/world\/state|\.prepare\(|\.batch\(|localStorage\.clear\(/.test(code));
 }
});
