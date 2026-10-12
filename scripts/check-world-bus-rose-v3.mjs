#!/usr/bin/env node
// Production-safe Bus Rose v3 wiring/integrity guard. No HTTP, D1, asset writes or deploy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {BUS_ART, BUS_ART_VERSION} from '../world/bus-art.js';
let checks=0;
function check(label,fn){fn();checks++;console.log('OK '+label);}
const read=file=>fs.readFileSync(file,'utf8');
const manifest=JSON.parse(read('world/assets/transport-v3/manifest.json'));
check('approved rose bus atlas metadata',()=>{
 assert.equal(BUS_ART_VERSION,'rose-bus-4-direction-v3');
 assert.equal(manifest.version,'3.0.0');assert.equal(manifest.headings,4);
 assert.deepEqual(manifest.frames.map(f=>f.direction),['se','sw','nw','ne']);
 assert.equal(BUS_ART.columns,2);assert.equal(BUS_ART.width,384);assert.equal(BUS_ART.height,384);
});
check('single alpha WebP and SHA-256',()=>{
 const data=fs.readFileSync('world/assets/transport-v3/bus-rose-atlas.webp');
 assert.equal(createHash('sha256').update(data).digest('hex'),manifest.atlasSha256);
 assert.ok(data.length>50000&&data.length<350000);
});
check('real original sprites, no fake mirrored facings',()=>{
 assert.equal(new Set(manifest.frames.map(f=>f.sourceSha256)).size,4);
 assert.equal(new Set(manifest.frames.map(f=>`${f.x}:${f.y}`)).size,4);
 const src=read('world/bus-art.js');
 assert.ok(!src.includes('ctx.rotate(')&&!src.includes('ctx.scale(-1'));
});
check('existing road and walking simulation unchanged',()=>{
 const source=read('world/traffic.js');
 assert.ok(source.includes('drawBusModel(ctx,bus,x,y)'));
 assert.ok(source.includes('sampleBusScene('));
 const nav=read('world/citizens.js');assert.ok(nav.includes('walkableCitizenRoads('));
});
check('normal and story startup still decode the atlas',()=>{
 assert.ok(read('world/app.js').includes('zeffi-transit-sprites-ready'));
 assert.ok(read('world/story/app.js').includes('await preloadBusArt()'));
 assert.ok(read('scripts/build-world-story-v1.py').includes('ZeffiEmbeddedBusAtlas'));
});
check('no server or economy changes in rendering module',()=>{
 assert.ok(!/\bfetch\s*\(|\/api\/|\.prepare\(|\.batch\(|localStorage\.clear/.test(read('world/bus-art.js')));
});
for(const file of ['world/bus-art.js','world/tests/city-transport-v2.test.mjs','world/tests/bus-rose-v3.test.mjs','scripts/check-world-checks-v2-1.mjs']){
 check('syntax '+file,()=>{const p=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);});
}
const tests=spawnSync(process.execPath,['--test','world/tests/bus-rose-v3.test.mjs','world/tests/city-transport-v2.test.mjs'],{stdio:'inherit'});
assert.equal(tests.status,0,'bus v3 regression tests');
console.log(`Bus Rose v3: ${checks} checks passed; 4 authored directions, no new network calls or migrations.`);
