import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {CATALOG} from '../catalog.js';
import {makeInitialCity,sanitizeCity,cloneCity,applyBusRoadStroke,applyRoadStroke,addObject,roadStrokePrice,BuildError,cityStats} from '../engine.js';
import {buildBusScene,sampleBusScene} from '../traffic.js';

const road=(...cells)=>cells.map(([x,y])=>({x,y}));
const itemLine=(from,to,y=13)=>Array.from({length:to-from+1},(_,i)=>({x:from+i,y}));
const copy=value=>JSON.parse(JSON.stringify(value));
const report=()=>makeInitialCity();

test('legacy personal cities still use the old road graph and do not gain a busRoads key',()=>{
 const city=report();
 assert.equal(Object.hasOwn(city,'busRoads'),false);
 const saved=sanitizeCity(copy(city),CATALOG);
 assert.equal(Object.hasOwn(saved,'busRoads'),false);
 assert.equal(Object.hasOwn(cloneCity(city),'busRoads'),false);
});

test('bus asphalt is free on purchased Road and costs 50 points for each NEW Road cell',()=>{
 const city=report(),start=copy(city),already=itemLine(10,12),newCells=road([16,13],[17,13]);
 assert.equal(roadStrokePrice(city,already).points,0);
 let next=applyBusRoadStroke(city,CATALOG,already);
 assert.equal(next.wallet.points,city.wallet.points);
 assert.deepEqual(next.busRoads,['10,13','11,13','12,13']);
 next=applyBusRoadStroke(next,CATALOG,newCells);
 assert.equal(next.wallet.points,city.wallet.points-100);
 assert.ok(next.roads.includes('16,13'));
 assert.ok(next.roads.includes('17,13'));
 assert.ok(next.busRoads.includes('16,13'));
 assert.deepEqual(city,start,'the original city must never be mutated');
});

test('repainting asphalt never double-charges; cloning and saving preserve it',()=>{
 const a=applyBusRoadStroke(report(),CATALOG,itemLine(8,11));
 const b=applyBusRoadStroke(a,CATALOG,itemLine(8,11));
 assert.equal(b.wallet.points,a.wallet.points);
 assert.deepEqual(b.busRoads,a.busRoads);
 const cloned=cloneCity(b);cloned.busRoads.push('15,13');
 assert.deepEqual(b.busRoads,a.busRoads,'clone must not share mutable bus lanes');
 assert.deepEqual(sanitizeCity(copy(a),CATALOG).busRoads,a.busRoads);
});

test('erasing a nonexistent bus lane never disables legacy routes',()=>{
 const city=report();
 const next=applyBusRoadStroke(city,CATALOG,road([10,13]),{erasing:true});
 assert.equal(Object.hasOwn(next,'busRoads'),false);
 assert.deepEqual(next.roads,city.roads);
 assert.deepEqual(next.wallet,city.wallet);
});

test('clearing all bus markings restores the legacy route over ordinary Road',()=>{
 let city=report();city.progress.bestLevel=2;
 city=addObject(city,CATALOG,'bus-stop',7,12,0,5000);
 city=addObject(city,CATALOG,'bus-stop',12,12,0,5000);
 const now=5000+120000+1;
 assert.equal(buildBusScene(city,CATALOG,now).routes.length,1);
 city=applyBusRoadStroke(city,CATALOG,itemLine(7,12));
 assert.equal(buildBusScene(city,CATALOG,now).routes.length,1);
 const cleared=applyBusRoadStroke(city,CATALOG,itemLine(7,12),{erasing:true});
 assert.equal(Object.hasOwn(cleared,'busRoads'),false);
 assert.equal(buildBusScene(cleared,CATALOG,now).routes.length,1);
 assert.deepEqual(cleared.roads,city.roads);
 const street=applyBusRoadStroke(report(),CATALOG,itemLine(9,12));
 const clearedByRoad=applyRoadStroke(street,CATALOG,itemLine(9,12),{erasing:true});
 assert.equal(Object.hasOwn(clearedByRoad,'busRoads'),false);
 assert.equal(Object.hasOwn(sanitizeCity({...cleared,busRoads:[]},CATALOG),'busRoads'),false);
});

test('tampered city cannot save duplicate bus tiles, unowned roads or invalid types',()=>{
 const c=applyBusRoadStroke(report(),CATALOG,itemLine(8,10));
 for(const roads of [['8,13','8,13'],['-4,0'],['9999,9999'],[4]]){
  const bad=copy(c);bad.busRoads=roads;
  assert.throws(()=>sanitizeCity(bad,CATALOG),e=>e instanceof BuildError&&e.code==='INVALID_SAVE');
 }
 const bad=copy(c);bad.busRoads='8,13';
 assert.throws(()=>sanitizeCity(bad,CATALOG),e=>e.code==='INVALID_SAVE');
});

test('removing bus asphalt keeps regular Road; erasing Road also removes bus lane',()=>{
 const c=applyBusRoadStroke(report(),CATALOG,itemLine(10,12));
 const erased=applyBusRoadStroke(c,CATALOG,itemLine(10,11),{erasing:true});
 assert.ok(erased.roads.includes('10,13'));
 assert.ok(!erased.busRoads.includes('10,13'));
 assert.ok(erased.busRoads.includes('12,13'));
 assert.deepEqual(erased.wallet,c.wallet);
 const ordinary=applyRoadStroke(c,CATALOG,itemLine(11,12),{erasing:true});
 assert.ok(!ordinary.roads.includes('11,13'));
 assert.ok(!ordinary.busRoads.includes('11,13'));
 assert.ok(ordinary.busRoads.includes('10,13'));
});

test('stops at level 2 can start a bus without terminal level 7 once their lane connects',()=>{
 let city=report();city.progress.bestLevel=2;
 assert.equal(cityStats(city,CATALOG).cityLevel,2);
 city=addObject(city,CATALOG,'bus-stop',7,12,0,5000);
 city=addObject(city,CATALOG,'bus-stop',12,12,0,5000);
 const completedAt=5000+120000+1;
 assert.equal(buildBusScene(city,CATALOG,completedAt).routes.length,1,'legacy roads must remain a valid transit route');
 city=applyBusRoadStroke(city,CATALOG,itemLine(7,9));
 assert.equal(buildBusScene(city,CATALOG,completedAt).routes.length,0,'explicit incomplete bus road must not pretend to connect stops');
 city=applyBusRoadStroke(city,CATALOG,itemLine(10,15));
 const scene=buildBusScene(city,CATALOG,completedAt);
 assert.equal(scene.routes.length,1);
 for(const point of scene.routes[0].track)assert.ok(city.busRoads.includes(point.id));
 assert.ok(sampleBusScene(scene,completedAt).length>0);
});

test('unsupported new operations are validated server-side; temporary free marking respects purchase gate',()=>{
 const service=readFileSync(fileURLToPath(new URL('../../src/zeffi-world-service.js',import.meta.url)),'utf8');
 assert.match(service,/case 'bus-road':return applyBusRoadStroke/);
 assert.match(service,/case 'erase-bus-road':return applyBusRoadStroke/);
 assert.match(service,/const WORLD_ACTIONS = new Set\([^\n]*'bus-road','erase-bus-road'/);
 assert.match(service,/bill\|\|action\.kind==='bus-road'/);
 assert.match(service,/persistedCity\(next\)/);
 const app=readFileSync(fileURLToPath(new URL('../app.js',import.meta.url)),'utf8');
 assert.match(app,/if\(state\.category==='transport'\)\{/);
 assert.match(app,/performServerAction\(kind,\{positions:state\.roadDraft\}\)/);
});
