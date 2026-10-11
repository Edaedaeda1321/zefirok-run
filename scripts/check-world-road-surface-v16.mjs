import assert from 'node:assert/strict';
import {worldRoadTopology,ROAD_HALF_WIDTH} from '../world/renderer.js';
const fixtures=[
 {name:'straight',roads:['0,0','1,0','2,0'],joins:2},
 {name:'bend',roads:['0,0','1,0','1,1'],joins:2},
 {name:'T junction',roads:['0,0','1,0','2,0','1,1'],joins:3},
 {name:'four-way junction',roads:['1,0','0,1','1,1','2,1','1,2'],joins:4},
 {name:'isolated',roads:['0,0'],joins:0}
];
for(const fixture of fixtures){
 const topo=worldRoadTopology(fixture.roads);
 assert.equal(topo.cells.length,fixture.roads.length,fixture.name);
 assert.equal(topo.joins.length,fixture.joins,fixture.name);
}
assert.ok(ROAD_HALF_WIDTH<.5,'Road should remain inside the cell at building edges');
console.log('World Zeffi road surface v16 PASS: single continuous pavement, 5 connectivity fixtures, building clearance');
