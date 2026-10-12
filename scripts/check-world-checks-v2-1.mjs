#!/usr/bin/env node
// One-time upgrade audit: verifies the repaired City Fix v2 package and local copy.
// Does not relax test failures, update Git, access D1 or deploy anything.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log('OK '+label);};
const payload='scripts/.world-city-fix-v2/';
const manifest=JSON.parse(read(payload+'manifest.json'));
check('original v2 installer contract retained',()=>assert.equal(manifest.version,'zeffi-city-fix-v2'));
check('every v2 payload still matches its SHA-256',()=>{
 for(const [rel,info]of Object.entries(manifest.targets))assert.equal(sha(read(payload+rel)),info.after,rel);
});
check('both app copies are identical and have no trailing whitespace',()=>{
 const game=read('world/app.js'),copy=read(payload+'world/app.js');
 assert.deepEqual(game,copy);
 assert.equal(/[^\S\r\n]+$/m.test(game.toString('utf8')),false);
});
for(const file of ['.gitignore','.assetsignore'])check('repair backups excluded by '+file,()=>{
 assert.ok(read(file).toString('utf8').split(/\r?\n/).includes('.world-checks-v2-1-backup/'));
});
const tests=['extra-pack','park-ground-contact','shop-progression-v17','terrain-rollback','visual-ground-icons-v13','world-pricing-v7'];
for(const name of tests){
 const file=`world/tests/${name}.test.mjs`;
 check('syntax '+file,()=>{
  const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
 });
}
check('previous City Fix v2 install contract is preserved, and protected against downgrade of bus v3 art',()=>{
 const v3Path='world/assets/transport-v3/manifest.json';
 const current=fs.existsSync(path.join(root,v3Path))?JSON.parse(read(v3Path).toString('utf8')):null;
 const result=spawnSync('python3',['scripts/apply-world-city-fix-v2.py','--check'],{cwd:root,encoding:'utf8'});
 if(current?.version==='3.0.0'){
  // Reinstalling the old v2 package must NOT silently put procedural art over
  // the player's newer approved sprites. Only known bus art targets may differ.
  assert.equal(result.status,1,'old installer must refuse downgrade');
  const allowed=new Set(['world/bus-art.js','world/tests/city-transport-v2.test.mjs',
   'world/tests/clean-assets.test.mjs','scripts/build-world-story-v1.py']);
  assert.match(result.stderr,/Unrecognized current version: (?:world\/bus-art\.js|world\/tests\/(?:city-transport-v2|clean-assets)\.test\.mjs|scripts\/build-world-story-v1\.py)/);
  for(const [rel,info] of Object.entries(manifest.targets))if(!allowed.has(rel))assert.equal(sha(read(rel)),info.after,rel);
  assert.equal(sha(read('world/assets/transport-v3/bus-rose-atlas.webp')),current.atlasSha256);
  assert.equal(current.frames.length,4);
 }else{
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/Preflight PASSED: 0 change\(s\)/);
 }
});
for(const name of ['check-world-shop-v17.mjs','check-world-shop-lock-v18.mjs'])check('compatible guard '+name,()=>{
 const result=spawnSync(process.execPath,['scripts/'+name],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr.slice(0,2000));
});
console.log(`World Checks v2.1: ${checks} upgrade checks passed. Run the FULL world tests and production gate next.`);
