#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const root=process.cwd();
const database='zefirok-rewards';
const snapshot=path.join(root,'scripts','fixtures','d1_pre_0087_snapshot.sql');
const migration=path.join(root,'migrations','0087_p1_platform_hardening.sql');
const cases=path.join(root,'scripts','fixtures','d1_integration_cases.sql');

function run(args){
  return new Promise((resolve,reject)=>{
    const child=spawn('npx',['wrangler',...args],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
    let out='',err=''; child.stdout.on('data',c=>out+=String(c)); child.stderr.on('data',c=>err+=String(c));
    child.once('error',reject); child.once('exit',code=>code===0?resolve({out,err}):reject(new Error(`npx wrangler ${args.join(' ')} failed (${code})\n${err||out}`)));
  });
}

async function executeFile(persist,file){
  return run(['d1','execute',database,'--local','--persist-to',persist,'--file',file]);
}

const persist=await mkdtemp(path.join(os.tmpdir(),'zefirok-d1-integration-'));
try{
  await executeFile(persist,snapshot);
  await executeFile(persist,migration);
  await executeFile(persist,cases);
  console.log('D1 integration OK: migration + purchase retry + case retry + duplicate operation + reward lease + season double-claim + stale revision + price change.');
} catch(error){
  console.error(`\nD1 INTEGRATION FAILED\n${error?.message||error}`);
  process.exitCode=1;
} finally {
  await rm(persist,{recursive:true,force:true});
}
