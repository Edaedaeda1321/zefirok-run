import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,CATALOG_ITEMS} from '../catalog.js';
import {
  CITY_SIZE, makeInitialCity, cloneCity, dims, checkPlacement, addObject,
  findOccupant, moveObject, storeObject, restoreObject, keyOf, orthogonalPath,
  applyRoadStroke, checkRoadStroke, connectedRoads, isObjectConnected, cityStats,
  sanitizeCity, BuildError
} from '../engine.js';

const fresh=()=>makeInitialCity();
const rejectCode=(fn,code)=>assert.throws(fn,error=>error instanceof BuildError&&error.code===code);

test('sandbox startup includes a 24x24 map, four objects and protected road entrance',()=>{
 const city=fresh();assert.equal(city.size,CITY_SIZE);assert.equal(city.objects.length,4);
 assert.equal(city.roads.length,9);assert.deepEqual(city.lockedRoads,['7,13','8,13']);
 assert.ok(city.roads.includes('7,13'));
});
test('catalog has independent names, stable IDs, sizes and complete categories',()=>{
 assert.equal(CATALOG_ITEMS.length,41);
 assert.equal(new Set(CATALOG_ITEMS.map(x=>x.id)).size,41);
 for(const entry of CATALOG_ITEMS){assert.ok(entry.titleKey);assert.ok(entry.w>=1&&entry.h>=1);assert.equal(CATALOG[entry.id],entry);}
 assert.deepEqual([...new Set(CATALOG_ITEMS.map(x=>x.category))].sort(),['decor','homes','landscape','parks','plazas','shops']);
});
test('placement rejects occupied buildings, roads, and exterior coordinates',()=>{
 const city=fresh();assert.equal(checkPlacement(city,CATALOG,'cottage',9,11).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'cottage',9,13).code,'ROAD_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'villa',23,23).code,'OUTSIDE_CITY');
 assert.equal(checkPlacement(city,CATALOG,'tree',-1,0).code,'OUTSIDE_CITY');
 assert.equal(checkPlacement(city,CATALOG,'tree',9.3,4).code,'INVALID_POSITION');
});
test('a placed object has unique stable identity and never mutates old state',()=>{
 const city=fresh(),next=addObject(city,CATALOG,'tree',17,18);
 assert.equal(city.objects.length,4);assert.equal(next.objects.length,5);
 assert.equal(next.objects[4].uid,'obj-5');assert.equal(next.nextId,6);
 assert.equal(findOccupant(next,CATALOG,17,18)?.uid,'obj-5');
});
test('rotation swaps rectangular footprints without affecting square footprints',()=>{
 assert.deepEqual(dims(CATALOG['family-home'],0),{w:3,h:2});
 assert.deepEqual(dims(CATALOG['family-home'],1),{w:2,h:3});
 assert.deepEqual(dims(CATALOG['family-home'],2),{w:3,h:2});
 assert.deepEqual(dims(CATALOG['cottage'],3),{w:2,h:2});
 const city=addObject(fresh(),CATALOG,'family-home',20,21,0);
 assert.equal(checkPlacement(city,CATALOG,'family-home',20,22,1).code,'OUTSIDE_CITY');
});
test('moving object can overlap its own original footprint only',()=>{
 let city=addObject(fresh(),CATALOG,'family-home',17,17);
 let item=city.objects.at(-1);
 city=moveObject(city,CATALOG,item.uid,18,17,1);
 assert.equal(city.objects.at(-1).x,18);assert.equal(city.objects.at(-1).rotation,1);
 rejectCode(()=>moveObject(city,CATALOG,item.uid,9,11,0),'BUILDING_COLLISION');
});
test('warehouse keeps one owned instance and preserves its level/rotation',()=>{
 let city=addObject(fresh(),CATALOG,'family-home',17,17,1);
 const uid=city.objects.at(-1).uid;
 city=storeObject(city,uid);
 assert.equal(city.objects.at(-1).x,null);assert.equal(city.objects.at(-1).stored,true);
 assert.equal(findOccupant(city,CATALOG,17,17),null);
 city=restoreObject(city,CATALOG,uid,20,19,1);
 assert.equal(city.objects.filter(x=>x.uid===uid).length,1);
 assert.equal(city.objects.at(-1).rotation,1);assert.equal(city.objects.at(-1).level,1);
 rejectCode(()=>restoreObject(city,CATALOG,uid,5,5),'ITEM_ALREADY_PLACED');
});
test('roads draw a contiguous Manhattan path',()=>{
 for(const fromTo of [[{x:1,y:1},{x:5,y:8}],[{x:8,y:6},{x:2,y:2}]]){
  const pts=orthogonalPath(...fromTo);
  assert.equal(pts.length,Math.abs(fromTo[0].x-fromTo[1].x)+Math.abs(fromTo[0].y-fromTo[1].y)+1);
  for(let i=1;i<pts.length;i++)assert.equal(Math.abs(pts[i].x-pts[i-1].x)+Math.abs(pts[i].y-pts[i-1].y),1);
 }
});
test('building cannot be constructed on a road and road cannot cross a building',()=>{
 const city=fresh();
 rejectCode(()=>addObject(city,CATALOG,'tree',9,13),'ROAD_COLLISION');
 rejectCode(()=>applyRoadStroke(city,CATALOG,[{x:9,y:11}]),'BUILDING_COLLISION');
});

test('parks cannot overlap other already placed parks',()=>{
 let city=addObject(fresh(),CATALOG,'playground',17,17);
 rejectCode(()=>addObject(city,CATALOG,'garden',18,17),'BUILDING_COLLISION');
 rejectCode(()=>addObject(city,CATALOG,'playground',17,17),'BUILDING_COLLISION');
});
test('road drawing ignores already built sections and can extend new sections',()=>{
 let city=fresh();
 city=applyRoadStroke(city,CATALOG,[{x:15,y:13},{x:16,y:13},{x:17,y:13}]);
 assert.equal(city.roads.length,11);assert.equal(new Set(city.roads).size,11);
 assert.equal(connectedRoads(city).size,11);
});
test('removal never destroys the protected starter road',()=>{
 rejectCode(()=>applyRoadStroke(fresh(),CATALOG,[{x:7,y:13}],{erasing:true}),'LOCKED_ROAD');
 let city=applyRoadStroke(fresh(),CATALOG,[{x:15,y:13}],{erasing:true});
 assert.equal(city.roads.length,8);assert.ok(city.roads.includes('7,13'));
});
test('protected road makes removing the entrance invalid, even in multi-cell strokes',()=>{
 const city=fresh();
 assert.equal(checkRoadStroke(city,CATALOG,[{x:8,y:13},{x:9,y:13}],{erasing:true}).code,'LOCKED_ROAD');
});
test('isolating a building disconnects services without deleting the building',()=>{
 let city=fresh();const house=city.objects[0];
 assert.equal(isObjectConnected(house,city,CATALOG),true);
 city=applyRoadStroke(city,CATALOG,[{x:9,y:13},{x:10,y:13}],{erasing:true});
 assert.equal(isObjectConnected(house,city,CATALOG),false);
 assert.equal(city.objects[0].uid,house.uid);
});
test('road stroke rejects invalid and excessive tile lists',()=>{
 assert.equal(checkRoadStroke(fresh(),CATALOG,[{x:100,y:2}]).code,'OUTSIDE_CITY');
 assert.equal(checkRoadStroke(fresh(),CATALOG,[]).code,'ROAD_STROKE_LIMIT');
 assert.equal(checkRoadStroke(fresh(),CATALOG,Array(257).fill({x:0,y:0})).code,'ROAD_STROKE_LIMIT');
});
test('city metrics count stored, built, connected and disconnected objects',()=>{
 const city=fresh(),s=cityStats(city,CATALOG);
 assert.equal(s.buildings,4);assert.equal(s.roads,9);assert.equal(s.stored,0);assert.equal(s.connected,1);assert.equal(s.disconnected,0);
});
test('save is validated and restored without losing object IDs',()=>{
 const city=addObject(fresh(),CATALOG,'bakery',17,18);
 const roundtrip=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.deepEqual(roundtrip,city);
 assert.notEqual(roundtrip,city);
});
test('corrupted saves cannot hide collisions or remove starter road',()=>{
 const city=fresh();
 const badVersion=cloneCity(city);badVersion.version=99;
 rejectCode(()=>sanitizeCity(badVersion,CATALOG),'UNSUPPORTED_SAVE');
 const badRoad=cloneCity(city);badRoad.roads=badRoad.roads.filter(x=>x!=='7,13');
 rejectCode(()=>sanitizeCity(badRoad,CATALOG),'INVALID_SAVE');
 const collision=cloneCity(city);collision.objects.push({...collision.objects[0],uid:'obj-400'});
 rejectCode(()=>sanitizeCity(collision,CATALOG),'INVALID_SAVE');
});

test('one road stroke cannot teleport between disconnected tiles',()=>{
 const city=fresh();
 assert.equal(checkRoadStroke(city,CATALOG,[{x:18,y:18},{x:20,y:20}]).code,'ROAD_DISCONNECTED');
});
