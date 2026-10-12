import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {dims,keyOf,makeInitialCity} from '../engine.js';
import {buildStoryMap,validateStoryMap,lockedDistricts,STORY_CATALOG as CATALOG} from '../story/map.js';
import {createDemoState,setDemoChapter,simulateCommunityHelp,openProject} from '../story/model.js';
import {buildCitizenScene,sampleCitizenScene,roadNeighborMap,walkableCitizenRoads} from '../citizens.js';
import {buildBusScene,sampleBusScene} from '../traffic.js';
import {BUS_ART,busModelHeading} from '../bus-art.js';
const map=()=>buildStoryMap(createDemoState());
const cell=p=>keyOf(Math.floor(p.x),Math.floor(p.y));
const funded=()=>{let s=createDemoState();for(let i=0;i<4;i++)s=simulateCommunityHelp(s,100000);return s;};
for(let chapter=0;chapter<3;chapter++)for(const phase of ['funding','building','opening','active'])test(`city v2: separated networks, chapter ${chapter}, ${phase}`,()=>{
 let s=phase==='funding'?createDemoState():funded();s=setDemoChapter(s,chapter);const now=phase==='building'?100001:200000;if(phase==='active')s=openProject(s,now);
 const c=buildStoryMap(s,now),asphalt=new Set(c.busRoads),foot=new Set(c.roads),gates=new Map(c.crosswalks.map(p=>[p.id,p]));
 assert.deepEqual(validateStoryMap(c),[]);assert.equal(gates.size,chapter>=2?8:7);
 assert.deepEqual([...asphalt].filter(id=>foot.has(id)).sort(),[...gates.keys()].sort());
 const people=buildCitizenScene(c,CATALOG,100,now,400),buses=buildBusScene(c,CATALOG,now);
 assert.equal(people.routes.length,12);assert.equal(buses.routes.length,2);
 for(const b of buses.routes)for(const p of b.track)assert.ok(asphalt.has(p.id));
 for(const item of c.objects){const{w,h}=dims(CATALOG[item.kind],item.rotation);for(let x=item.x;x<item.x+w;x++)for(let y=item.y;y<item.y+h;y++)assert.ok(!asphalt.has(keyOf(x,y)),`object ${item.uid} on asphalt`);}
 for(const person of people.routes)for(const s of person.timed||[]){
  if(s.stage!=='road'){assert.ok(!asphalt.has(cell(s.from)));assert.ok(!asphalt.has(cell(s.to)));continue;}
  for(const p of [s.from,s.to])if(asphalt.has(cell(p))){const g=gates.get(cell(p));assert.ok(g);assert.equal(g.axis==='x'?s.from.y:s.from.x,g.axis==='x'?s.to.y:s.to.x);assert.notDeepEqual(s.from,s.to);}
 }
 for(const d of lockedDistricts(s))for(const item of c.objects){const{w,h}=dims(CATALOG[item.kind],item.rotation);const[x,y,a,b]=d.bounds;assert.ok(!(item.x<x+a&&item.x+w>x&&item.y<y+b&&item.y+h>y),`locked ${d.id} overlaps ${item.uid}`);}
});
test('city v2: crossing nodes have only two perpendicular pedestrian exits',()=>{
 const c=map(),roads=walkableCitizenRoads(c,CATALOG),neighbors=roadNeighborMap(roads,c.crosswalks);
 for(const g of c.crosswalks){assert.equal(neighbors.get(g.id).length,2);for(const id of neighbors.get(g.id)){const[x,y]=id.split(',').map(Number);assert.equal(g.axis==='x'?y:x,g.axis==='x'?g.y:g.x);assert.ok(!c.busRoads.includes(id));}}
});
test('city v2: sampled pedestrians neither walk along asphalt nor wait on crossings',()=>{
 const c=map(),asphalt=new Set(c.busRoads),gates=new Map(c.crosswalks.map(p=>[p.id,p])),scene=buildCitizenScene(c,CATALOG,100,0,400);let crossed=0;
 for(let t=0;t<240000;t+=113)for(const p of sampleCitizenScene(scene,t))if(asphalt.has(cell(p))){
  const g=gates.get(cell(p));assert.ok(g,`walked on ${cell(p)}`);assert.ok(p.walking);assert.equal(g.axis==='x'?p.dy:p.dx,0);crossed++;
 }
 assert.ok(crossed>100,'exercise real crossing traffic');
});
test('city v2: missing crossing declarations fail closed rather than permitting street walks',()=>{
 const c=map();c.crosswalks=[];const roads=walkableCitizenRoads(c,CATALOG);assert.ok(c.busRoads.every(id=>!roads.has(id)));assert.ok(validateStoryMap(c).some(s=>s.includes('shared road')));
});
test('city v2: an explicit empty transit graph never falls back to sidewalks',()=>{const c=map();c.busRoads=[];assert.equal(buildBusScene(c,CATALOG).routes.length,0);});
test('city v2: legacy personal cities retain their own roads; map and wallet stay unchanged',()=>{
 const c=makeInitialCity();const before=JSON.stringify(c);buildBusScene(c,CATALOG);buildCitizenScene(c,CATALOG,20,0,50);assert.equal(JSON.stringify(c),before);assert.ok(!Object.hasOwn(c,'busRoads'));
});
test('city v3: approved four-direction bus sprites select all correct road headings',()=>{
 assert.equal(busModelHeading({dx:1,dy:0}),0); // south-east
 assert.equal(busModelHeading({dx:0,dy:1}),1); // south-west
 assert.equal(busModelHeading({dx:-1,dy:0}),2); // north-west
 assert.equal(busModelHeading({dx:0,dy:-1}),3); // north-east
 for(let n=0;n<4;n++)assert.equal(busModelHeading({heading:n*Math.PI/2}),n);
 assert.equal(busModelHeading({heading:-Math.PI/2}),3);
 assert.equal(busModelHeading({heading:Math.PI*2}),0);
 assert.equal(busModelHeading({heading:Math.PI/4-.001}),0);
 assert.equal(busModelHeading({heading:Math.PI/4+.001}),1);
});
test('city v3: one compact alpha-WebP atlas contains exactly four authored bus facings',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../assets/transport-v3/manifest.json',import.meta.url),'utf8'));
 assert.equal(m.version,'3.0.0');assert.equal(m.headings,4);assert.equal(m.variantCount,1);
 assert.equal(m.frames.length,4);assert.deepEqual(m.frames.map(f=>f.direction),['se','sw','nw','ne']);
 assert.deepEqual(BUS_ART.directions,['se','sw','nw','ne']);
 assert.equal(BUS_ART.width,384);assert.equal(BUS_ART.height,384);assert.equal(BUS_ART.anchorX,192);assert.equal(BUS_ART.anchorY,302);
 assert.equal(new Set(m.frames.map(f=>f.sourceSha256)).size,4);
 assert.equal(new Set(m.frames.map(f=>`${f.x},${f.y}`)).size,4);
 for(const f of m.frames){assert.ok(f.x>=0&&f.x+f.width<=768&&f.y>=0&&f.y+f.height<=768);assert.equal(f.anchorX,192);assert.equal(f.anchorY,302);}
 const data=fs.readFileSync(new URL('../assets/transport-v3/bus-rose-atlas.webp',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length<500000);
 assert.equal(createHash('sha256').update(data).digest('hex'),m.atlasSha256);
});
test('city v2: both complete bus loops remain on asphalt, with no positional seam at stops',()=>{
 const c=map(),roads=new Set(c.busRoads),scene=buildBusScene(c,CATALOG),before=JSON.stringify(scene);
 for(const route of scene.routes){
  for(let t=0;t<route.duration;t+=53){const p=sampleBusScene({routes:[route]},t)[0];assert.ok([p.x,p.y,p.dx,p.dy,p.heading].every(Number.isFinite));assert.ok(roads.has(cell(p)),`${cell(p)} outside asphalt`);}
  for(let elapsed=0,i=0;i<route.segments.length;i++){
   const a=sampleBusScene({routes:[route]},elapsed-route.offset-.001)[0],b=sampleBusScene({routes:[route]},elapsed-route.offset+.001)[0];
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001,'jump at segment '+i);elapsed+=route.segments[i].duration;
  }
 }
 assert.equal(JSON.stringify(scene),before);
});
test('city v2: future district is painted below structures, never as the final screen veil',()=>{
 const renderer=fs.readFileSync(new URL('../renderer.js',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../story/app.js',import.meta.url),'utf8');
 const begin=renderer.indexOf('export function drawWorld('),body=renderer.slice(begin);
 assert.ok(body.indexOf('drawWorldGroundZones(')>body.indexOf('drawLandscape('));assert.ok(body.indexOf('drawWorldGroundZones(')<body.indexOf('const layers='));
 const paint=app.slice(app.indexOf('function paintOverlay('),app.indexOf('function paintMiniMap('));assert.ok(!paint.includes('lockedDistricts'));assert.ok(!paint.includes('rgba(214,213,217'));
});
test('city v2: visual changes introduce no API writes, migrations, or live economy calls',()=>{
 for(const file of ['../bus-art.js','../traffic.js','../story/map.js']){const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');assert.ok(!/\bfetch\s*\(|\/api\/|\.batch\(|\.prepare\(|localStorage\.clear/.test(source));}
});
