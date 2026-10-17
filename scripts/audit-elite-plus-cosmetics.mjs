#!/usr/bin/env node
/**
 * Read-only Season Pass Elite+ cosmetic audit for current production D1.
 * No writes. No deploy. --snapshot=fixture.json can be used offline.
 */
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import process from 'node:process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const option=name=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
if(args.includes('--help')){
  console.log('node scripts/audit-elite-plus-cosmetics.mjs [--database=zefirok-rewards] [--report=path.json] [--snapshot=offline.json]');
  process.exit(0);
}
const json=value=>{try{return JSON.parse(String(value||'{}'))||{}}catch{return {}}};
const rows=(value,out=[])=>{
  if(!value||typeof value!=='object')return out;
  if(Array.isArray(value)){value.forEach(v=>rows(v,out));return out}
  if(Array.isArray(value.results))out.push(...value.results);
  for(const [key,x] of Object.entries(value))if(key!=='results'&&typeof x==='object')rows(x,out);
  return out;
};
async function query(database,sql){
  const output=await new Promise((resolve,reject)=>{
    const p=spawn('npx',['--yes','wrangler','d1','execute',database,'--remote','--json','--command',sql],{cwd:root,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    p.stdout.on('data',d=>stdout+=d);p.stderr.on('data',d=>stderr+=d);
    p.on('error',reject);p.on('close',code=>code===0?resolve(stdout):reject(Error('D1 read failed: '+stderr.slice(0,600))));
  });
  const text=String(output).trim();let parsed;
  try{parsed=JSON.parse(text)}catch{
    for(let i=0;i<text.length;i++)if(text[i]==='['||text[i]==='{')try{parsed=JSON.parse(text.slice(i));break}catch{}
  }
  if(!parsed)throw Error('Wrangler D1 JSON response unavailable');
  return rows(parsed);
}
async function catalog(){
  const src=await fs.readFile(path.join(root,'src/worker.js'),'utf8');
  const a='const FUTURE_SEASON_CONTENT = Object.freeze(',b='\nconst FUTURE_SEASON_CONTENT_LABEL';
  const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
  if(i<0||j<0)throw Error('Worker future-season catalog unavailable');
  const expr=src.slice(i+'const FUTURE_SEASON_CONTENT = '.length,j).replace(/;\s*$/,'').trim();
  const content=vm.runInNewContext(`(${expr})`,{}, {timeout:1500});
  return content;
}
function analyze(snapshot,content,now=Math.floor(Date.now()/1000)){
  const seasons=Array.isArray(snapshot.seasons)?snapshot.seasons:[],registry=Array.isArray(snapshot.registry)?snapshot.registry:[];
  const active=seasons.filter(x=>Number(x.starts_at||0)<=now&&Number(x.ends_at||0)>now&&String(x.manual_status||'')!=='ended').sort((a,b)=>Number(b.starts_at)-Number(a.starts_at));
  if(active.length!==1)throw Error(`Expected exactly one active Season Pass, got ${active.length}. No changes made.`);
  const season=active[0],seasonId=String(season.season_id||'');
  const cfg=json(season.elite_plus_benefits_json);
  const cosmeticItems=Array.isArray(cfg.cosmetics)?cfg.cosmetics:[];
  const rules=new Map(registry.map(x=>[`${x.item_kind}:${x.item_id}`,x]));
  const cosmetics=cosmeticItems.map(item=>{
    const kind=String(item.kind||''),id=String(item.itemId||item.item_id||''),catalogItem=content?.[kind]?.[id]||null;
    const r=rules.get(`${kind}:${id}`)||null;
    const routes=json(r?.routes_json)?.routes||{};
    const published=r?.status==='open'&&String(r?.content_season_id||'')===seasonId;
    const allowed=routes.season_pass?.enabled===true&&String(routes.season_pass.destinationId||'')===seasonId||routes.seasonal_case?.enabled===true||routes.manual?.enabled===true;
    const otherSeason=Boolean(catalogItem?.seasonKey&&String(catalogItem.seasonKey)!=='season3');
    const valid=!catalogItem||Boolean(!otherSeason&&published&&allowed);
    return {kind,itemId:id,title:String(catalogItem?.title||id),catalogSeasonKey:String(catalogItem?.seasonKey|| (catalogItem?'season3':'evergreen')),contentSeasonId:String(r?.content_season_id||''),status:String(r?.status||'not_in_registry'),routes:Object.keys(routes).filter(x=>routes[x]?.enabled===true),expectedSeasonId:seasonId,availableForElitePlus:valid};
  });
  return {checkedAt:new Date().toISOString(),seasonId,seasonTitle:String(season.title||''),cosmetics,summary:{count:cosmetics.length,ready:cosmetics.filter(x=>x.availableForElitePlus).length,blocked:cosmetics.filter(x=>!x.availableForElitePlus).length}};
}
async function main(){
  const fixture=option('--snapshot');
  const snapshot=fixture?json(await fs.readFile(path.resolve(fixture),'utf8')):{
    seasons:await query(option('--database')||'zefirok-rewards','SELECT season_id,title,starts_at,ends_at,manual_status,elite_plus_benefits_json FROM season_pass_seasons'),
    registry:await query(option('--database')||'zefirok-rewards','SELECT item_kind,item_id,content_season_id,status,routes_json FROM live_content_registry_state')
  };
  const result=analyze(snapshot,await catalog());
  if(option('--report')){
    const dest=path.resolve(option('--report'));
    await fs.mkdir(path.dirname(dest),{recursive:true});
    await fs.writeFile(dest,JSON.stringify(result,null,2)+'\n','utf8');
  }
  console.log(`Elite+ · ${result.seasonTitle} [${result.seasonId}]`);
  for(const item of result.cosmetics)console.log(`${item.availableForElitePlus?'OK':'BLOCK'} · ${item.kind}:${item.itemId} · ${item.title} · ${item.status} · ${item.routes.join(',')||'none'}`);
  console.log('SUMMARY',JSON.stringify(result.summary));
  console.log('READ ONLY: no production data changed.');
  if(result.summary.blocked)process.exitCode=2;
}
main().catch(e=>{console.error('Elite+ audit:',e.message);process.exitCode=1});
