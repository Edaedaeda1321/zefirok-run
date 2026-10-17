#!/usr/bin/env node
/**
 * S3 "Тайны Белкино": production D1 reconciliation against actual Season Pass slots.
 * Read-only by default. --apply only publishes S3 items through existing Pass
 * cosmetic slots or the S3 seasonal case already assigned to a Pass slot.
 * This script does not create/change player claims, invent Season Pass levels,
 * alter economy, or touch S2/S4 items. Requires authenticated Wrangler access.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {homedir} from 'node:os';

const ACTOR='season3-pass-reconcile-v130';
const PRESET='season3_belkino_case_v1';
const WEIGHTS={common:20,rare:15,superrare:12,epic:10,mythic:5,legendary:2};
const KINDS=['avatar','frame','trail','music','skin'];
const SOURCES=['native','case','seasonal_case','shop','season_pass','story','event','manual'];
const q=(v)=>`'${String(v??'').replaceAll("'","''")}'`;
const key=(kind,id)=>`${kind}:${id}`;
const storedId=(kind,id)=>`season_cosmetic:${kind}:${id}`;
const jparse=(s)=>{try{return JSON.parse(String(s||'{}'))||{};}catch{return {};}};
const normRoute=(routes)=>Object.fromEntries(SOURCES.filter(k=>routes?.[k]?.enabled===true).map(k=>[k,routes[k]]));
const routesOf=(row)=>normRoute(jparse(row?.routes_json)?.version===1?jparse(row.routes_json).routes:{});
const stable=(v)=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

export function catalogFromWorker(src){
 const a='const FUTURE_SEASON_CONTENT = Object.freeze('; const b='\nconst FUTURE_SEASON_CONTENT_LABEL';
 const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
 if(i<0||j<0)throw Error('FUTURE_SEASON_CONTENT not found in src/worker.js');
 const expression=src.slice(i+'const FUTURE_SEASON_CONTENT = '.length,j).replace(/;\s*$/,'').trim();
 const catalog=vm.runInNewContext(`(${expression})`,{}, {timeout:1500}),out=[],foreign=new Set();
 for(const kind of KINDS)for(const [id,item] of Object.entries(catalog[kind]||{})){
   if(String(item.seasonKey||'season3')!=='season3'){foreign.add(key(kind,id));continue;}
   out.push({kind,id,title:String(item.title||id),rarity:String(item.rarity||'epic'),imageUrl:String(item.imageUrl||'')});
 }
 out.sort((a,b)=>key(a.kind,a.id).localeCompare(key(b.kind,b.id)));
 if(out.length!==32)throw Error(`Expected 32 season3 cosmetics, got ${out.length}. Inspect catalog before continuing.`);
 Object.defineProperty(out,'foreignKeys',{value:foreign,enumerable:false});
 return out;
}

export function planSeason3(snapshot,catalog,{now=Math.floor(Date.now()/1000)}={}){
 const problems=[];const warnings=[];
 const seasons=snapshot.seasons||[],rewards=snapshot.rewards||[],caseDefs=snapshot.caseDefs||[],caseItems=snapshot.caseItems||[];
 const preset=(snapshot.presets||[]).find(x=>String(x.preset_id)===PRESET),seasonId=String(preset?.season_id||'');
 const season=seasons.find(x=>String(x.season_id)===seasonId);
 if(!seasonId||!season)problems.push('Не найдена однозначная привязка «Тайн Белкино» в season_pass_case_presets.');
 if(season&&!/тайны\s+белкино/i.test(String(season.title||'')))problems.push('Привязанный сезон не называется «Тайны Белкино».');
 const active=season&&(String(season.manual_status||'')==='active'||(String(season.manual_status||'')!=='ended'&&Number(season.starts_at||0)<=now&&Number(season.ends_at||0)>now));
 if(season&&!active)problems.push('Сезон 3 сейчас не активен в server-authoritative Season Pass.');
 const sr=rewards.filter(r=>String(r.season_id)===seasonId&&Number(r.enabled)===1);
 const direct=new Map(),caseRefs=new Set();
 const catalogSet=new Set(catalog.map(x=>key(x.kind,x.id)));
 for(const r of sr){
   const id=String(r.item_id||'');
   const m=id.match(/^season_cosmetic:(avatar|frame|trail|skin|music):(.+)$/);
   if(m&&catalogSet.has(key(m[1],m[2]))){const k=key(m[1],m[2]);direct.set(k,[...(direct.get(k)||[]),r]);}
   const c=id.match(/^seasonal_case:(.+)$/);if(c)caseRefs.add(c[1]);
 }
 const eligible=caseDefs.filter(c=>String(c.season_id)===seasonId&&caseRefs.has(String(c.case_id)));
 const preferred=eligible.filter(c=>/тайны\s+белкино/i.test(String(c.title||''))||String(c.updated_by||'')==='system-season3-draft-case-v1');
 const chosen=preferred.length===1?preferred[0]:(eligible.length===1?eligible[0]:null);
 if(eligible.length>1&&!chosen)problems.push('В пропуске несколько сезонных кейсов, невозможно однозначно выбрать кейс Сезона 3.');
 if(!chosen&&eligible.length)problems.push('Не удалось определить кейс Сезона 3, выданный через Season Pass.');
 if(chosen&&String(chosen.season_id)!==seasonId)problems.push('Кейс принадлежит другому сезону.');
 if(chosen&&Number(chosen.release_at||0)>now)warnings.push('Кейс назначен в пропуск, но release_at позже начала текущего времени; исправление откроет его сейчас.');
 if(chosen&&Number(chosen.enabled)!==1)warnings.push('Кейс назначен в пропуск, но отключён; исправление включит его.');
 if(!chosen)warnings.push('Сезонный кейс не назначен в Season Pass. Исправление прямых слотов возможно, но для остального каталога нет пути получения.');
 const registry=new Map((snapshot.registry||[]).map(x=>[key(x.item_kind,x.item_id),x]));
 const shadow=new Map((snapshot.shadow||[]).map(x=>[key(x.item_kind,x.item_id),x]));
 const chosenPoolRows=caseItems.filter(x=>String(x.case_id)===String(chosen?.case_id||''));
 const pool=new Map(chosenPoolRows.map(x=>[key(x.reward_kind,x.item_id),x]));
 if(chosenPoolRows.length!==new Set(chosenPoolRows.map(x=>key(x.reward_kind,x.item_id))).size)problems.push('В сезонном кейсе есть дубликаты косметики с различными ключами: требуется ручная очистка.');
 const items=[];
 for(const item of catalog){
   const k=key(item.kind,item.id),row=registry.get(k),sh=shadow.get(k),slots=direct.get(k)||[],current=routesOf(row),issues=[];
   if(slots.length>1)issues.push(`Предмет занимает ${slots.length} разных слотов пропуска.`);
   const expected={};
   if(slots.length===1){const r=slots[0],level=Number(r.level),lane=String(r.lane);
     if(!Number.isInteger(level)||level<1||level>50||!['free','premium'].includes(lane))issues.push('Некорректные уровень/линия награды.');
     else {const route={enabled:true,destinationId:seasonId,level,lane};
       if(current.season_pass?.destinationId===seasonId&&Number(current.season_pass?.level)===level&&current.season_pass?.lane===lane&&current.season_pass.previousReward)route.previousReward=current.season_pass.previousReward;
       expected.season_pass=route;
     }
   }
   let caseRow=null;
   if(chosen){
     caseRow=pool.get(k)||null;
     const weight=Number(caseRow?.weight)>0?Number(caseRow.weight):WEIGHTS[item.rarity]||5;
     expected.seasonal_case={enabled:true,destinationId:String(chosen.case_id),weight};
   }
   if(!Object.keys(expected).length)issues.push('Нет действующей награды ни в прямом слоте, ни в сезонном кейсе пропуска.');
   if(chosen&&!pool.get(k)&&chosenPoolRows.some(row=>String(row.item_key)===k))issues.push('Ключ seasonal-case занят другим предметом.');
   if(row?.content_season_id&&String(row.content_season_id)!==seasonId)warnings.push(`Предмет ${k} ошибочно привязан к ${row.content_season_id}; восстановится привязка к Сезону 3.`);
   if(Object.keys(current).some(s=>!['season_pass','seasonal_case'].includes(s)))warnings.push(`${k}: удаляются внешние маршруты получения.`);
   const primary=expected.season_pass?'season_pass':'seasonal_case';
   const pr=expected[primary]||{};
   const cfg=primary==='season_pass'?{level:pr.level,lane:pr.lane,...(pr.previousReward?{previousReward:pr.previousReward}:{})}:{weight:pr.weight};
   const correctReg=row&&row.status==='open'&&row.content_season_id===seasonId&&Number(row.ever_released)===1&&same(current,expected);
   const correctShadow=sh&&Number(sh.released)===1&&sh.content_season_id===seasonId&&String(sh.destination_type)===primary&&String(sh.destination_id)===String(pr.destinationId||'')&&same(jparse(sh.destination_config_json),cfg);
   const poolOk=!chosen||(caseRow&&Number(caseRow.enabled)===1&&Number(caseRow.weight)>0);
   items.push({...item,key:k,slots:slots.map(r=>`${r.level}/${r.lane}`),before:row||null,shadowBefore:sh||null,caseBefore:caseRow,expected,primary,cfg,issues,needsRegistry:!correctReg,needsShadow:!correctShadow,needsPool:!poolOk});
 }
 for(const x of items)for(const issue of x.issues)problems.push(`${x.key}: ${issue}`);
 const allCaseRows=caseItems.filter(x=>String(x.case_id)===String(chosen?.case_id||'')&&Number(x.enabled)===1);
 const foreign=allCaseRows.filter(x=>catalog.foreignKeys?.has(key(x.reward_kind,x.item_id)));
 if(foreign.length)problems.push(`Кейс Сезона 3 содержит ${foreign.length} предметов другого скрытого сезона (2/4): не раскрываем их автоматически.`);
 return {seasonId,title:String(season?.title||''),active:Boolean(active),caseId:String(chosen?.case_id||''),caseBefore:chosen||null,problems,warnings:[...new Set(warnings)],items,summary:{total:items.length,direct:items.filter(x=>x.slots.length).length,pool:chosen?items.length:0,registry:items.filter(x=>x.needsRegistry).length,shadow:items.filter(x=>x.needsShadow).length,caseItems:items.filter(x=>x.needsPool).length,caseActivation:Boolean(chosen&&(Number(chosen.enabled)!==1||Number(chosen.release_at||0)>now)),blocked:problems.length}};
}

export function makeSql(plan,{now=Math.floor(Date.now()/1000)}={}){
 if(plan.problems.length)throw Error('Cannot apply blocked plan: '+plan.problems.join('; '));
 const sql=[];
 const caseId=plan.caseId,seasonId=plan.seasonId;
 if(plan.caseBefore&&(plan.summary.caseActivation)){
   const def=plan.caseBefore;
   sql.push(`UPDATE season_pass_case_definitions SET enabled=1,release_at=CASE WHEN release_at>${now} THEN ${now} ELSE release_at END,updated_at=${now},updated_by=${q(ACTOR)} WHERE case_id=${q(caseId)} AND season_id=${q(seasonId)} AND enabled=${Number(def.enabled)||0} AND release_at=${Number(def.release_at)||0} AND EXISTS(SELECT 1 FROM season_pass_rewards WHERE season_id=${q(seasonId)} AND enabled=1 AND item_id=${q('seasonal_case:'+caseId)});`);
 }
 for(const item of plan.items){
   const [kind,id]=[item.kind,item.id],where=`item_kind=${q(kind)} AND item_id=${q(id)}`;
   if(item.needsPool&&caseId){
     const w=item.expected.seasonal_case.weight;
     const before=item.caseBefore;
     if(before){sql.push(`UPDATE season_pass_case_items SET enabled=1,weight=${w} WHERE case_id=${q(caseId)} AND item_key=${q(before.item_key)} AND reward_kind=${q(kind)} AND item_id=${q(id)} AND enabled=${Number(before.enabled)||0} AND weight=${Number(before.weight)||0};`);}
     else {sql.push(`INSERT OR IGNORE INTO season_pass_case_items(case_id,item_key,reward_kind,item_id,weight,rarity,title,image_url,enabled) SELECT ${q(caseId)},${q(key(kind,id))},${q(kind)},${q(id)},${w},${q(item.rarity)},${q(item.title)},${q(item.imageUrl)},1 WHERE EXISTS(SELECT 1 FROM season_pass_rewards WHERE season_id=${q(seasonId)} AND enabled=1 AND item_id=${q('seasonal_case:'+caseId)});`);}
   }
   if(!item.needsRegistry&&!item.needsShadow)continue;
   const routeText=JSON.stringify({version:1,routes:item.expected}),prev=item.before;
   if(item.needsRegistry){
     if(!prev){sql.push(`INSERT OR IGNORE INTO live_content_registry_state(item_kind,item_id,content_season_id,status,release_at,routes_json,ever_released,updated_at,updated_by) VALUES(${q(kind)},${q(id)},${q(seasonId)},'open',0,${q(routeText)},1,${now},${q(ACTOR)});`);}
     else{sql.push(`UPDATE live_content_registry_state SET status='open',release_at=0,ever_released=1,content_season_id=${q(seasonId)},routes_json=${q(routeText)},updated_at=${now},updated_by=${q(ACTOR)} WHERE ${where} AND status=${q(prev.status)} AND content_season_id=${q(prev.content_season_id)} AND routes_json=${q(prev.routes_json)} AND updated_at=${Number(prev.updated_at)||0};`);}
   }
   const route=item.expected[item.primary],cfg=JSON.stringify(item.cfg),sh=item.shadowBefore;
   if(item.needsShadow){
     if(!sh){sql.push(`INSERT OR IGNORE INTO live_content_release_rules(item_kind,item_id,content_season_id,released,ever_released,destination_type,destination_id,destination_config_json,updated_at,updated_by) SELECT ${q(kind)},${q(id)},${q(seasonId)},1,1,${q(item.primary)},${q(route.destinationId)},${q(cfg)},${now},${q(ACTOR)} WHERE EXISTS(SELECT 1 FROM live_content_registry_state WHERE ${where} AND status='open' AND routes_json=${q(routeText)});`);}
     else{sql.push(`UPDATE live_content_release_rules SET released=1,ever_released=1,content_season_id=${q(seasonId)},destination_type=${q(item.primary)},destination_id=${q(route.destinationId)},destination_config_json=${q(cfg)},updated_at=${now},updated_by=${q(ACTOR)} WHERE ${where} AND updated_at=${Number(sh.updated_at)||0} AND EXISTS(SELECT 1 FROM live_content_registry_state WHERE ${where} AND status='open' AND routes_json=${q(routeText)});`);}
   }
   sql.push(`INSERT INTO liveops_config_history(entity_type,entity_id,action,old_json,new_json,reason,actor_telegram_id,actor_name,created_at) SELECT 'live_content_release',${q(item.key)},${q(ACTOR)},${q(JSON.stringify({status:prev?.status||'missing',seasonId:prev?.content_season_id||'',routes:routesOf(prev)}) )},${q(JSON.stringify({status:'open',seasonId,routes:item.expected}))},'Season 3 routes are exclusive to Season Pass and its case','system','S3 pass reconcile',${now} WHERE EXISTS(SELECT 1 FROM live_content_registry_state WHERE ${where} AND status='open' AND routes_json=${q(routeText)}) AND EXISTS(SELECT 1 FROM live_content_release_rules WHERE ${where} AND released=1 AND content_season_id=${q(seasonId)} AND destination_type=${q(item.primary)} AND destination_id=${q(route.destinationId)}) AND NOT EXISTS(SELECT 1 FROM liveops_config_history WHERE entity_type='live_content_release' AND entity_id=${q(item.key)} AND action=${q(ACTOR)} AND new_json=${q(JSON.stringify({status:'open',seasonId,routes:item.expected}))});`);
 }
 return sql;
}

function rows(v,out=[]){if(!v||typeof v!=='object')return out;if(Array.isArray(v)){v.forEach(x=>rows(x,out));return out;}if(Array.isArray(v.results))out.push(...v.results);for(const [k,x] of Object.entries(v))if(k!=='results'&&typeof x==='object')rows(x,out);return out;}
function wranglerJson(out){const raw=String(out).trim();try{return JSON.parse(raw);}catch{}for(let start=0;start<raw.length;start++)if(raw[start]==='['||raw[start]==='{')try{return JSON.parse(raw.slice(start))}catch{}throw Error('Wrangler JSON response not found: '+raw.slice(0,250));}
async function cmd(program,args,cwd){return new Promise((resolve,reject)=>{const c=spawn(program,args,{cwd,env:process.env,stdio:['ignore','pipe','pipe']});let so='',se='';c.stdout.on('data',d=>so+=d);c.stderr.on('data',d=>se+=d);c.on('error',reject);c.on('close',n=>n===0?resolve(so):reject(Error(`Command returned ${n}: ${se.slice(0,700)} ${so.slice(0,300)}`)));});}
async function d1Query(sql,{cwd,db}){return rows(wranglerJson(await cmd('npx',['--yes','wrangler','d1','execute',db,'--remote','--json','--command',sql],cwd)));}
async function d1Apply(path,{cwd,db}){return wranglerJson(await cmd('npx',['--yes','wrangler','d1','execute',db,'--remote','--json','--file',path],cwd));}
export async function takeSnapshot({cwd,db}){
 const query=sql=>d1Query(sql,{cwd,db});
 return {
 seasons:await query(`SELECT season_id,title,starts_at,ends_at,manual_status FROM season_pass_seasons`),
 presets:await query(`SELECT preset_id,season_id FROM season_pass_case_presets WHERE preset_id=${q(PRESET)}`),
 rewards:await query(`SELECT season_id,level,lane,item_id,enabled,reward_type FROM season_pass_rewards`),
 caseDefs:await query(`SELECT case_id,season_id,title,enabled,release_at,updated_by FROM season_pass_case_definitions`),
 caseItems:await query(`SELECT case_id,item_key,reward_kind,item_id,weight,enabled FROM season_pass_case_items`),
 registry:await query(`SELECT item_kind,item_id,content_season_id,status,release_at,routes_json,ever_released,updated_at,updated_by FROM live_content_registry_state`),
 shadow:await query(`SELECT item_kind,item_id,content_season_id,released,ever_released,destination_type,destination_id,destination_config_json,updated_at,updated_by FROM live_content_release_rules`)
 };
}

async function main(){
 const args=process.argv.slice(2),apply=args.includes('--apply'),arg=k=>args.find(x=>x.startsWith(k+'='))?.slice(k.length+1);
 if(args.includes('--help')){console.log('Run from repo root: node scripts/fix-season3-pass-content.mjs [--apply] [--report=/path/report.json] [--database=zefirok-rewards] [--snapshot=/path/fixture.json]');return;}
 const cwd=process.cwd(),db=arg('--database')||'zefirok-rewards',at=Math.floor(Date.now()/1000);
 const source=await readFile(join(cwd,'src/worker.js'),'utf8'),catalog=catalogFromWorker(source);
 const fromFixture=arg('--snapshot');if(apply&&fromFixture)throw Error('Cannot --apply with a fixture snapshot.');
 const snapshot=fromFixture?JSON.parse(await readFile(resolve(fromFixture),'utf8')):await takeSnapshot({cwd,db});
 const plan=planSeason3(snapshot,catalog,{now:at});
 const dest=resolve(arg('--report')||join(homedir(),'Downloads',`season3_pass_report_${apply?'apply':'before'}.json`));
 const report={auditedAt:new Date().toISOString(),database:db,readOnly:!apply,seasonId:plan.seasonId,seasonTitle:plan.title,caseId:plan.caseId,summary:plan.summary,problems:plan.problems,warnings:plan.warnings,items:plan.items.map(x=>({itemId:x.id,kind:x.kind,title:x.title,before:x.before?.status||'missing',seasonBefore:x.before?.content_season_id||'',expected:x.expected,slots:x.slots,needsRegistry:x.needsRegistry,needsShadow:x.needsShadow,needsCasePool:x.needsPool,issues:x.issues}))};
 await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(report,null,2)+'\n');
 console.log(`Season 3: ${plan.title||'NOT FOUND'} (${plan.seasonId||'NO ID'}) | ${catalog.length} items | seasonal case ${plan.caseId||'none'}`);
 console.log('Changes needed:',JSON.stringify(plan.summary));
 for(const problem of plan.problems)console.error('BLOCK:',problem);
 for(const warning of plan.warnings)console.log('NOTICE:',warning);
 console.log('Report:',dest);
 if(!apply){console.log('READ-ONLY. Use --apply to execute the reconciliation if BLOCK=0.');return;}
 if(plan.problems.length)throw Error('Production was NOT changed: '+plan.problems.length+' blockers. See report.');
 const sql=makeSql(plan,{now:at});if(!sql.length){console.log('All items already correct, no writes.');return;}
 const backup=resolve(join(homedir(),'Downloads',`season3_pass_backup_${at}.json`));
 const sqlpath=resolve(join(homedir(),'Downloads',`season3_pass_apply_${at}.sql`));
 await mkdir(dirname(backup),{recursive:true});
 if(existsSync(backup)||existsSync(sqlpath))throw Error('Backup/SQL file for this run already exists. Wait a second and retry.');
 await writeFile(backup,JSON.stringify(snapshot,null,2)+'\n');
 await writeFile(sqlpath,'-- Generated after live D1 validation. S3 only; no player or reward-slot mutations.\n'+sql.join('\n')+'\n');
 console.log('D1 backup:',backup,'SQL:',sqlpath,'Statements:',sql.length);
 await d1Apply(sqlpath,{cwd,db});
 const after=planSeason3(await takeSnapshot({cwd,db}),catalog);
 const pending=after.summary.registry+after.summary.shadow+after.summary.caseItems+(after.summary.caseActivation?1:0);
 if(after.problems.length||pending){console.error('Partial/concurrent changes detected. Re-run read-only audit, do not overwrite manually.');process.exitCode=2;return;}
 console.log('SUCCESS: all 32 S3 cosmetics are open and linked exclusively to Season Pass and its pass-earned case. Player rewards untouched.');
}
if(resolve(process.argv[1]||'')===fileURLToPath(import.meta.url))main().catch(e=>{console.error('SEASON3:',e.message);process.exitCode=1;});
