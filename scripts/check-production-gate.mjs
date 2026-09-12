#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const root=process.cwd();
const skipD1=process.argv.includes('--skip-d1');
const steps=[
  ['worker syntax','node',['--check','src/worker.js']],
  ['migration history','node',['scripts/check-migrations.mjs']],
  ['schema contract','node',['scripts/check-database-schema.mjs','--contract-only']],
  ['deploy assets','node',['scripts/check-deploy-assets.mjs']],
  ['asset manifests','node',['scripts/check-assets.mjs','--news-manifest']],
  ['production UI assets','node',['scripts/check-assets.mjs']],
  ['content-hash manifest','node',['scripts/check-asset-manifest.mjs']],
  ['live content assets','node',['scripts/check-live-content-assets.mjs']],
  ['live content authority','node',['scripts/check-live-content-authority.mjs']],
  ['operation system','node',['scripts/check-operation-system.mjs']]
];
if(!skipD1)steps.push(['D1 integration','node',['scripts/check-d1-integration.mjs']]);

function run(command,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:root,env:process.env,stdio:'inherit'});
    child.once('error',reject);
    child.once('exit',code=>code===0?resolve():reject(new Error(`${command} ${args.join(' ')} failed (${code})`)));
  });
}

for(const [label,command,args] of steps){
  console.log(`\n=== Production gate: ${label} ===`);
  await run(command,args);
}
console.log(`\nProduction gate OK: ${steps.length} checks passed${skipD1?' (D1 skipped explicitly)':''}.`);
