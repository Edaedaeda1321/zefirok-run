import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitialCity,connectedRoads,keyOf,dims,cityStats} from '../engine.js';
import {CATALOG} from '../catalog.js';
import {buildCitizenScene,sampleCitizenScene,walkableCitizenRoads} from '../citizens.js';
import {worldObjectPainterDepth} from '../renderer.js';

const placed=(city,kind,x,y,rotation=0)=>({
 uid:`obj-${city.nextId++}`,kind,x,y,rotation,level:1,stored:false,buildStartedAt:0,buildReadyAt:0
});

test('legacy 3D monument plazas can no longer be walked through on old overlapping roads',()=>{
 const city=makeInitialCity();
 // A grandfathered paid raised plaza may overlap older Road in production saves.
 city.objects.push(placed(city,'plaza-monument-base',12,13));
 const actualRoads=connectedRoads(city);
 const walkerRoads=walkableCitizenRoads(city,CATALOG);
 for(const tile of ['12,13','13,13','14,13']){
  assert.ok(actualRoads.has(tile),`original road still exists: ${tile}`);
  assert.ok(!walkerRoads.has(tile),`pedestrian must not enter the plinth: ${tile}`);
 }
 for(const tile of ['7,13','8,13','9,13','10,13','11,13','15,13']){
  assert.ok(walkerRoads.has(tile),`healthy neighboring road remains walkable: ${tile}`);
 }
 const scene=buildCitizenScene(city,CATALOG,2,10_000);
 assert.equal(scene.routes.length,1,'normal residents still walk on safe part of road');
 for(const citizen of scene.routes){
  for(let i=0;i<citizen.track.length;i++){
   const point=citizen.track[i],next=citizen.track[(i+1)%citizen.track.length];
   assert.ok(walkerRoads.has(point.id));
   assert.ok(Math.abs(next.x-point.x)+Math.abs(next.y-point.y)<=1,'no teleport across blocked plaza');
  }
 }
 for(let now=0;now<300_000;now+=1234){
  for(const person of sampleCitizenScene(scene,now)){
   assert.ok(person.x>=7.5&&person.x<=11.5,`never behind plaza: ${person.x}`);
   assert.equal(person.y,13.5);
  }
 }
 assert.deepEqual(city.objects.at(-1).kind,'plaza-monument-base','no saved object is mutated');
});

test('large building footprints and raised surfaces block unsafe Road, ordinary flat paving does not',()=>{
 const city=makeInitialCity();
 city.objects.push(placed(city,'garden',12,13)); // hypothetical legacy road overlapping 3D park
 city.objects.push(placed(city,'path-straight',8,13)); // flat decorative road paving
 city.objects.push(placed(city,'plaza-playground-base',18,18)); // raised 3D plaza
 const walkable=walkableCitizenRoads(city,CATALOG);
 assert.ok(!walkable.has(keyOf(12,13)));
 assert.ok(!walkable.has(keyOf(13,13)));
 assert.ok(!walkable.has(keyOf(14,13)));
 assert.ok(walkable.has(keyOf(8,13)),'flat paving should not block pedestrians');
 assert.deepEqual(cityStats(city,CATALOG).roads,9,'no server-road mutation');
});

test('3D object center depth puts people in FRONT along south/east roads and BEHIND on north/west roads',()=>{
 for(const kind of ['cottage','family-home','playground','garden','pond-park','city-square','bus-terminal','botanical-garden']){
  const def=CATALOG[kind];
  for(const rotation of [0,1,2,3]){
   const item={kind,x:10,y:9,rotation};
   const {w,h}=dims(def,rotation);
   const depth=worldObjectPainterDepth(item,def);
   const roadSouth= (item.x+.5)+(item.y+h+.5);
   const roadEast= (item.x+w+.5)+(item.y+.5);
   const roadNorth=(item.x+w-.5)+(item.y-.5);
   const roadWest=(item.x-.5)+(item.y+h-.5);
   assert.ok(roadSouth>depth,`${kind} ${rotation}: south-side walker should be in front`);
   assert.ok(roadEast>depth,`${kind} ${rotation}: east-side walker should be in front`);
   assert.ok(roadNorth<depth,`${kind} ${rotation}: north-side walker should be behind`);
   assert.ok(roadWest<depth,`${kind} ${rotation}: west-side walker should be behind`);
  }
 }
});

test('walkable scene never changes purchases, wallets, progression or original road connection',()=>{
 const city=makeInitialCity();
 const original=JSON.stringify(city);
 const ordinary=buildCitizenScene(city,CATALOG,2,80000,15);
 assert.equal(ordinary.routes.length,1);
 assert.equal(JSON.stringify(city),original);
 assert.ok(ordinary.routes[0].track.every(t=>connectedRoads(city).has(t.id)));
 assert.deepEqual(walkableCitizenRoads(city,CATALOG),connectedRoads(city));
});

// Applies to every current solid category and rotation, including the new
// 7-building pack. A later pack is protected automatically by its footprint.
test('all currently purchasable solid kinds block walkers on legacy overlapping Road in 4 rotations',()=>{
 const base=makeInitialCity();
 const all=Object.values(CATALOG).filter(def=>def.layer!=='surface'||def.blockingSurface);
 assert.ok(all.length>=30,'expected an extensive building catalog');
 for(const def of all){
  for(const rotation of [0,1,2,3]){
   const city=makeInitialCity();
   city.objects.push(placed(city,def.id,9,13,rotation));
   assert.ok(!walkableCitizenRoads(city,CATALOG).has(keyOf(9,13)),`${def.id}: rotation ${rotation}`);
  }
 }
 // Storing a structure immediately releases the visual lane without any change
 // to the original road or to permanent ownership.
 const city=makeInitialCity();
 const park=placed(city,'pond-park',9,13);
 city.objects.push(park);
 assert.ok(!walkableCitizenRoads(city,CATALOG).has('9,13'));
 park.stored=true;
 assert.ok(walkableCitizenRoads(city,CATALOG).has('9,13'));
 assert.ok(connectedRoads(city).has('9,13'));
});
