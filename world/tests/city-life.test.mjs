import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeInitialCity,connectedRoads,cityStats,cloneCity} from '../engine.js';
import {CATALOG} from '../catalog.js';
import {buildCitizenScene,sampleCitizenScene,walkableCitizenRoads} from '../citizens.js';
import {buildBusScene,sampleBusScene} from '../traffic.js';

function placed(city,kind,x,y,ready=0){
 const uid=`obj-${city.nextId++}`;
 const obj={uid,kind,x,y,rotation:0,level:1,stored:false,buildStartedAt:ready?ready-1000:0,buildReadyAt:ready};
 city.objects.push(obj);return obj;
}
function livingCity(){
 const city=makeInitialCity();
 city.roads=Array.from({length:17},(_,i)=>`${i+7},13`);
 placed(city,'coffee-kiosk',16,11);
 placed(city,'bench',12,12);
 placed(city,'fountain',19,11);
 placed(city,'playground',17,14);
 placed(city,'bus-stop',21,12);
 placed(city,'bus-stop',7,14);
 return city;
}
test('real buildings attract visitors for cafes, benches, fountains and play; no AI network state',()=>{
 const city=livingCity(),original=JSON.stringify(city),roads=walkableCitizenRoads(city,CATALOG);
 const scene=buildCitizenScene(city,CATALOG,40,10000,130);
 const stops=scene.routes.flatMap(route=>route.stops||[]);
 assert.ok(scene.routes.length>=8);
 assert.deepEqual(new Set(stops.map(stop=>stop.activity)),new Set(['cafe','bench','fountain','play']));
 assert.equal(stops.filter(stop=>stop.activity==='bench').length,1,'one bench is shared by one visitor per schedule');
 for(const route of scene.routes){
  assert.ok(route.track.every(p=>roads.has(p.id)),`all normal steps must remain on safe Road: ${route.id}`);
  for(let i=1;i<route.track.length;i++){
   const a=route.track[i-1],b=route.track[i];
   assert.ok(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1,`cannot teleport across non-neighbor road cells: ${route.id}`);
  }
  if(route.stops?.length){
   assert.equal(route.track[0].id,route.track.at(-1).id,'outings return on Road to initial point');
   assert.ok(route.duration>5000&&route.duration<240000);
   for(const stop of route.stops){
    const obj=city.objects.find(o=>o.uid===stop.uid);
    assert.ok(obj);
    const def=CATALOG[obj.kind];
    assert.ok(stop.anchor.x>=obj.x&&stop.anchor.x<=obj.x+def.w,'last meter is only at the target building');
    assert.ok(stop.anchor.y>=obj.y&&stop.anchor.y<=obj.y+def.h);
   }
  }
 }
 const phases=new Set();
 for(const route of scene.routes){
  const ownScene={routes:[route]};
  for(let t=0;t<route.duration;t+=125){
   const point=sampleCitizenScene(ownScene,t-route.offset)[0];
   if(point?.action)phases.add(point.action);
  }
 }
 assert.ok(phases.has('bench'));
 assert.ok(phases.has('fountain'));
 assert.ok(phases.has('coffee'));
 assert.equal(JSON.stringify(city),original,'visual activity never writes wallet/objects/save JSON');
});
test('construction, storage and removed road connections stop serving visual visitors',()=>{
 const city=livingCity();
 const cafe=city.objects.find(o=>o.kind==='coffee-kiosk');
 cafe.buildStartedAt=9000;cafe.buildReadyAt=50000;
 let scene=buildCitizenScene(city,CATALOG,40,10000,150);
 assert.ok(!scene.routes.flatMap(route=>route.stops||[]).some(stop=>stop.uid===cafe.uid));
 scene=buildCitizenScene(city,CATALOG,40,60000,150);
 assert.ok(scene.routes.flatMap(route=>route.stops||[]).some(stop=>stop.uid===cafe.uid));
 cafe.stored=true;
 scene=buildCitizenScene(city,CATALOG,40,60000,150);
 assert.ok(!scene.routes.flatMap(route=>route.stops||[]).some(stop=>stop.uid===cafe.uid));
 city.roads=city.roads.filter(id=>!['14,13','15,13'].includes(id));
 scene=buildCitizenScene(city,CATALOG,40,60000,150);
 for(const route of scene.routes)assert.ok(route.track.every(p=>connectedRoads(city).has(p.id)));
});
test('buses appear only with two connected completed stations and remain on roads',()=>{
 const city=livingCity();
 const original=JSON.stringify(city),roadSet=walkableCitizenRoads(city,CATALOG);
 const scene=buildBusScene(city,CATALOG,10000);
 assert.equal(scene.routes.length,1);
 const route=scene.routes[0];
 assert.equal(route.stops.length,2);
 assert.equal(route.track[0].id,route.track.at(-1).id);
 assert.ok(route.segments.some(s=>s.stopped),'bus should dwell on actual platforms');
 for(const [i,p] of route.track.entries()){
  assert.ok(roadSet.has(p.id),`bus position is on road ${p.id}`);
  if(i)assert.equal(Math.abs(p.x-route.track[i-1].x)+Math.abs(p.y-route.track[i-1].y),1);
 }
 let stopped=0,moving=0;
 for(let t=0;t<route.duration;t+=150){
  const [bus]=sampleBusScene(scene,t-route.offset);
  assert.ok(bus);
  assert.ok(bus.y>=13.5&&bus.y<=13.5);
  assert.ok(bus.x>=7.5&&bus.x<=22.5);
  if(bus.stopped){stopped++;assert.ok(bus.stationUid);}else{moving++;assert.equal(bus.stationUid,null);}
 }
 assert.ok(stopped>0&&moving>0);
 assert.equal(JSON.stringify(city),original);
 const one=cloneCity(city);one.objects.find(o=>o.kind==='bus-stop').stored=true;
 assert.equal(buildBusScene(one,CATALOG,10000).routes.length,0);
 const unfinished=cloneCity(city);
 unfinished.objects.find(o=>o.kind==='bus-stop').buildReadyAt=100000;
 assert.equal(buildBusScene(unfinished,CATALOG,10000).routes.length,0);
});
test('bus transport handles road islands and a route shared by three stations',()=>{
 const city=livingCity();
 placed(city,'bus-stop',14,14);
 const scene=buildBusScene(city,CATALOG,10000);
 assert.equal(scene.routes.length,1);
 assert.equal(scene.routes[0].stops.length,3);
 const split=cloneCity(city);
 split.roads=split.roads.filter(s=>s!=='9,13');
 // Central road splits at 9: never let a bus teleport from a disconnected stop.
 const disconnected=buildBusScene(split,CATALOG,10000);
 for(const bus of disconnected.routes){
  const safe=walkableCitizenRoads(split,CATALOG);
  assert.ok(bus.track.every(p=>safe.has(p.id)));
  for(let i=1;i<bus.track.length;i++)assert.ok(Math.abs(bus.track[i].x-bus.track[i-1].x)+Math.abs(bus.track[i].y-bus.track[i-1].y)<=1);
 }
});
test('raised legacy plaza blocks transit instead of sending buses through a 3D object',()=>{
 const city=livingCity();
 placed(city,'plaza-monument-base',12,13);
 const roads=walkableCitizenRoads(city,CATALOG);
 for(const x of [12,13,14])assert.ok(!roads.has(`${x},13`));
 const buses=buildBusScene(city,CATALOG,10000);
 assert.equal(buses.routes.length,0,'separated stations must not be connected by a ghost road');
});
test('many stations never create more than two render-only buses',()=>{
 const city=livingCity();
 placed(city,'bus-stop',14,14);
 placed(city,'bus-stop',10,14);
 const scene=buildBusScene(city,CATALOG,10000);
 assert.equal(scene.routes.length,2);
 for(const bus of scene.routes){
  assert.equal(bus.stops.length,4);
  for(let i=1;i<bus.track.length;i++){
   const a=bus.track[i-1],b=bus.track[i];
   assert.ok(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1);
  }
 }
});
test('integration stays in visual renderer and does not add server endpoints or migrations',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('../renderer.js',import.meta.url),'utf8');
 assert.match(app,/buildBusScene\(state\.city,CATALOG,Date\.now\(\)\)/);
 assert.match(app,/buses:sampleBusScene\(state\.trafficScene,now\)/);
 assert.match(renderer,/drawBus\(ctx,layer\.bus/);
 assert.match(renderer,/drawCitizen\(ctx,layer\.person/);
 assert.match(app,/document\.hidden\|\|motionReduced/);
});
