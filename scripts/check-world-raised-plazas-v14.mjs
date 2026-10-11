// A strict cheap regression gate for the raised plaza overlay fix.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG,CATALOG_ITEMS} from '../world/catalog.js';
import {makeInitialCity,sanitizeCity,checkPlacement,checkRoadStroke,storeObject,raisedSurfaceConflicts} from '../world/engine.js';

const plaza=CATALOG_ITEMS.filter(def=>def.id.startsWith('plaza-'));
assert.equal(plaza.length,8);
assert.ok(plaza.every(def=>def.layer==='surface'&&def.blockingSurface), 'Raised plaza metadata missing');
let city=makeInitialCity();
city.objects.push({uid:`obj-${city.nextId++}`,kind:'plaza-monument-base',x:18,y:18,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
assert.equal(checkPlacement(city,CATALOG,'cottage',19,19).code,'BUILDING_COLLISION');
assert.equal(checkRoadStroke(city,CATALOG,[{x:18,y:18}]).code,'BUILDING_COLLISION');
city.objects.push({uid:`obj-${city.nextId++}`,kind:'cottage',x:19,y:19,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
const saved=JSON.stringify(city);
const loaded=sanitizeCity(JSON.parse(saved),CATALOG);
assert.deepEqual(loaded,JSON.parse(saved));
assert.equal(raisedSurfaceConflicts(loaded,CATALOG).length,1);
const fixed=storeObject(loaded,loaded.objects.at(-2).uid);
assert.deepEqual(fixed.wallet,city.wallet);
assert.equal(raisedSurfaceConflicts(fixed,CATALOG).length,0);
assert.equal(fixed.objects.filter(x=>!x.stored&&x.kind==='cottage').length,2); // original starter + legacy house
const renderer=readFileSync(new URL('../world/renderer.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../world/app.js',import.meta.url),'utf8');
assert.match(renderer,/!catalog\[o\.kind\]\?\.blockingSurface/);
assert.match(renderer,/catalog\[o\.kind\]\?\.blockingSurface\)\)\.map/);
assert.match(app,/raisedSurfaceConflicts\(state\.city,CATALOG\)/);
assert.match(app,/performServerAction\('store',\{uid:item\.uid\}\)/);
assert.match(app,/world-raised-dialog/);
console.log('World raised plazas v14 PASS: 8 3D surfaces, collisions denied, legacy city loads, safe warehouse repair, painter and mobile dialog');
