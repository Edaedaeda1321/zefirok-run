#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
let passed=0;const check=(label,fn)=>{fn();passed++;console.log('OK '+label);};
const read=file=>fs.readFileSync(file,'utf8');
check('shared 3D atlas replaces broken procedural bus faces',()=>{const s=read('world/traffic.js');assert.ok(s.includes('drawBusModel(ctx,bus,x,y)'));assert.ok(!s.includes('polygonStroke('));assert.ok(!s.includes('bus.dx||1'));});
check('normal personal mode wakes up after atlas decoding',()=>assert.ok(read('world/app.js').includes("'zeffi-transit-sprites-ready'")));
check('story preloads atlas and passes ground zones to world renderer',()=>{const s=read('world/story/app.js');assert.ok(s.includes('await preloadBusArt()'));assert.ok(s.includes('groundZones:'));});
check('standalone compiler embeds the exact atlas, without an external image request',()=>assert.ok(read('scripts/build-world-story-v1.py').includes('ZeffiEmbeddedBusAtlas')));
check('sprite atlas integrity',()=>{
 const m=JSON.parse(read('world/assets/transport-v2/manifest.json'));
 assert.equal(createHash('sha256').update(fs.readFileSync('world/assets/transport-v2/bus-atlas.webp')).digest('hex'),m.atlasSha256);
});
for(const name of ['.gitignore','.assetsignore'])check(name+' excludes private installer backups',()=>assert.ok(read(name).split('\n').includes('.world-city-fix-v2-backup/')));
for(const file of ['world/bus-art.js','world/traffic.js','world/citizens.js','world/renderer.js','world/story/app.js','world/story/map.js','world/app.js'])check('syntax '+file,()=>{const p=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);});
const test=spawnSync(process.execPath,['--test','world/tests/city-transport-v2.test.mjs'],{stdio:'inherit'});assert.equal(test.status,0,'v2 regression tests');
console.log(`City Fix v2: ${passed} wiring/syntax checks and regression tests passed.`);
