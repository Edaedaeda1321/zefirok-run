#!/usr/bin/env node
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const root=process.cwd();
const database='zefirok-rewards';
const snapshot=path.join(root,'scripts','fixtures','d1_pre_0087_snapshot.sql');
const snapshotBaseline=Number((/d1_pre_(\d{4})_snapshot\.sql$/i.exec(snapshot)||[])[1]||0);
const cases=[
  path.join(root,'scripts','fixtures','d1_integration_cases.sql'),
  path.join(root,'scripts','fixtures','d1_retention_cases.sql'),
  path.join(root,'scripts','fixtures','d1_schema_contract_cases.sql')
];

async function migrationsAfterSnapshot(){
  const names=(await readdir(path.join(root,'migrations')))
    .filter(name=>/^\d{4}_.+\.sql$/i.test(name))
    .sort();
  return names
    .filter(name=>Number(name.slice(0,4))>=snapshotBaseline)
    .map(name=>path.join(root,'migrations',name));
}

function displayPath(file){
  const relative=path.relative(root,file);
  return relative && !relative.startsWith('..') ? relative : file;
}

async function assertRequiredFiles(migrations){
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
    const child=spawn('npx',['--yes','wrangler@4.131.1',...args],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
    let out='',err='';
    child.stdout.on('data',c=>out+=String(c));
    child.stderr.on('data',c=>err+=String(c));
    child.once('error',reject);
    child.once('exit',code=>code===0
      ? resolve({out,err})
      : reject(new Error(`npx --yes wrangler@4.131.1 ${args.join(' ')} failed (${code})\n${err||out}`)));
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
  const migrations=await migrationsAfterSnapshot();
  if(!snapshotBaseline||!migrations.length)throw new Error(`Could not resolve migrations after integration snapshot baseline ${snapshotBaseline||'(unknown)'}.`);
  await assertRequiredFiles(migrations);
  persist=await mkdtemp(path.join(os.tmpdir(),'zefirok-d1-integration-'));
  await executeFile(persist,snapshot);
  for(const migration of migrations)await executeFile(persist,migration);
  for(const file of cases)await executeFile(persist,file);
  console.log(`D1 integration OK: snapshot pre-${String(snapshotBaseline).padStart(4,'0')} + ${migrations.length} migration(s) through ${path.basename(migrations.at(-1))} + recovery/idempotency/retention/schema-contract fixtures.`);
}catch(error){
  console.error(`\nD1 INTEGRATION FAILED\n${error?.message||error}`);
  process.exitCode=1;
}finally{
  if(persist)await rm(persist,{recursive:true,force:true});
}
