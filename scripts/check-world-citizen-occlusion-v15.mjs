import assert from 'node:assert/strict';
import {makeInitialCity,connectedRoads} from '../world/engine.js';
import {CATALOG} from '../world/catalog.js';
import {buildCitizenScene,walkableCitizenRoads} from '../world/citizens.js';
import {worldObjectPainterDepth} from '../world/renderer.js';

const city=makeInitialCity();
const raised={uid:'obj-999',kind:'plaza-monument-base',x:12,y:13,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0};
city.objects.push(raised);
assert.equal(connectedRoads(city).has('12,13'),true);
const walkable=walkableCitizenRoads(city,CATALOG);
assert.equal(walkable.has('12,13'),false);
assert.equal(walkable.has('11,13'),true);
const scene=buildCitizenScene(city,CATALOG,2);
assert.equal(scene.routes.length,1);
for(const walker of scene.routes)for(const step of walker.track)assert.ok(walkable.has(step.id));
for(const kind of ['playground','garden','bus-terminal','botanical-garden']){
 const def=CATALOG[kind],item={x:10,y:9,rotation:0};
 const key=worldObjectPainterDepth(item,def);
 assert.ok(10.5+9+def.h+.5>key,`${kind}: front walk sorting`);
 assert.ok(10+def.w-.5+8.5<key,`${kind}: behind walk sorting`);
}
console.log('Zeffi World NPC occlusion v15 PASS: raised Road filtered, safe routes retained, ground-centered isometric painter');
