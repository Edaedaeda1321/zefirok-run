import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {worldRoadTopology,ROAD_HALF_WIDTH} from '../renderer.js';

const keyOf = (x,y)=>`${x},${y}`;
const joinNames = topology => topology.joins.map(({x,y,axis})=>`${x},${y}:${axis}`).sort();

test('Road v16: a straight line uses one connector per shared cell edge',()=>{
 const topo=worldRoadTopology(['8,13','9,13','10,13','11,13']);
 assert.equal(topo.cells.length,4);
 assert.deepEqual(joinNames(topo),['8,13:x','9,13:x','10,13:x'].sort());
});

test('Road v16: a right-angle bend joins without doubled corner masks',()=>{
 const topo=worldRoadTopology(['10,13','11,13','11,14','11,15']);
 assert.equal(topo.cells.length,4);
 assert.deepEqual(joinNames(topo),['10,13:x','11,13:y','11,14:y'].sort());
});

test('Road v16: T and four-way crossings contain no duplicated joins',()=>{
 const road=['10,9','10,10','10,11','9,10','11,10'];
 const topo=worldRoadTopology([...road,'10,10','10,9']);
 assert.equal(topo.cells.length,5);
 assert.deepEqual(joinNames(topo),['9,10:x','10,9:y','10,10:x','10,10:y'].sort());
 const seen=new Set();
 for(const join of topo.joins){
  const end=join.axis==='x'?keyOf(join.x+1,join.y):keyOf(join.x,join.y+1);
  const hash=`${keyOf(join.x,join.y)}|${end}`;
  assert.ok(!seen.has(hash),`duplicate physical Road segment: ${hash}`);
  seen.add(hash);
 }
});

test('Road v16: logically adjacent houses retain a grassy edge clearance',()=>{
 assert.ok(ROAD_HALF_WIDTH>0 && ROAD_HALF_WIDTH<.5);
 assert.ok(.5-ROAD_HALF_WIDTH>=.10,'road should not fill a neighboring building cell');
});

test('Road v16: no separate raised mask sprites are painted per tile',()=>{
 const source=readFileSync(fileURLToPath(new URL('../renderer.js',import.meta.url)),'utf8');
 const start=source.indexOf('function drawRoads(ctx, city, viewport)');
 const end=source.indexOf('function shadow(ctx,pts)',start);
 assert.ok(start>0&&end>start,'road renderer exists');
 const roadRenderer=source.slice(start,end);
 assert.ok(roadRenderer.includes('worldRoadUnionPath(ctx,cells,joins)'));
 assert.ok(roadRenderer.includes('ctx.clip()'));
 assert.ok(!roadRenderer.includes('world_road_mask_'),'old 3D masks cannot be layered by cell');
 assert.ok(!roadRenderer.includes('drawSprite(ctx,asset'),'legacy stacked assets cannot reappear');
});
