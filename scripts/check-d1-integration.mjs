#!/usr/bin/env node
import { access, mkdtemp, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const root=process.cwd();
const database='zefirok-rewards';
const snapshot=path.join(root,'scripts','fixtures','d1_pre_0087_snapshot.sql');
const migrations=[
  path.join(root,'migrations','0087_p1_platform_hardening.sql'),
  path.join(root,'migrations','0088_operational_retention.sql')
];
const cases=[
  path.join(root,'scripts','fixtures','d1_integration_cases.sql'),
  path.join(root,'scripts','fixtures','d1_retention_cases.sql')
];

function displayPath(file){
  const relative=path.relative(root,file);
  return relative && !relative.startsWith('..') ? relative : file;
}

async function assertRequiredFiles(){
  const required=[snapshot,...migrations,...cases];
  const missing=[];
  for(const file of required){
    try{
      await access(file,fsConstants.R_OK);
    }catch{
      missing.push(displayPath(file));
    }
  }
  if(missing.length){
    throw new Error(`Missing D1 integration fixture/migration file(s):\n${missing.map(file=>`  - ${file}`).join('\n')}\nRe-apply the integration-test patch before running the production gate.`);
  }
}

function run(args){
  return new Promise((resolve,reject)=>{
    const child=spawn('npx',['wrangler',...args],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
    let out='',err='';
    child.stdout.on('data',c=>out+=String(c));
    child.stderr.on('data',c=>err+=String(c));
    child.once('error',reject);
    child.once('exit',code=>code===0
      ? resolve({out,err})
      : reject(new Error(`npx wrangler ${args.join(' ')} failed (${code})\n${err||out}`)));
  });
}

async function executeFile(persist,file){
  // Wrangler resolves --file relative to cwd. Keeping project-local paths avoids
  // platform-specific issues with long/escaped absolute paths in CI and macOS shells.
  return run([
    'd1','execute',database,'--local','--persist-to',persist,
    '--file',displayPath(file)
  ]);
}

let persist='';
try{
  await assertRequiredFiles();
  persist=await mkdtemp(path.join(os.tmpdir(),'zefirok-d1-integration-'));
  await executeFile(persist,snapshot);
  for(const migration of migrations)await executeFile(persist,migration);
  for(const file of cases)await executeFile(persist,file);
  console.log('D1 integration OK: migrations + support/revision + purchase/case retries + reward idempotency/archive + season double-claim + stale revision + price change + retention.');
}catch(error){
  console.error(`\nD1 INTEGRATION FAILED\n${error?.message||error}`);
  process.exitCode=1;
}finally{
  if(persist)await rm(persist,{recursive:true,force:true});
}
