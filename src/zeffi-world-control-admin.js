// Mir Zeffi Control Center P0. All entry points are called ONLY after the existing
// owner-only Telegram/session auth + staging write-target guard in src/worker.js.
import {readWorldControl,effectiveWorldControlFlags,WORLD_CONTROL_MODES,WORLD_CONTROL_FLAGS} from './zeffi-world-control.js';
import {handleOwnerWorldBalance} from './zeffi-world-balance-admin.js';
import {handleOwnerWorldContent} from './zeffi-world-content-admin.js';

class ControlError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new ControlError(status,message);};
const nowSeconds=()=>Math.floor(Date.now()/1000);
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
const safeId=n=>typeof n==='string'&&/^\d{4,20}$/.test(n);
const validRequestId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{12,90}$/.test(id);
const summarize=c=>Object.fromEntries(['revision','release_mode','rollout_percent',...WORLD_CONTROL_FLAGS].map(k=>[k,c[k]]));
const missing=(e,table)=>new RegExp('no such table:\\s*'+table+'\\b','i').test(String(e?.message||''));
async function state(db){const c=await readWorldControl(db,{allowLegacy:false});if(!c.schemaReady)fail(503,'Сначала примените миграцию 0120 для Центра управления миром.');return c;}
function dbQuery(db,sql,args=[]){return args.length?db.prepare(sql).bind(...args):db.prepare(sql);}
async function readOne(db,sql,args=[]){return dbQuery(db,sql,args).first();}
async function readAll(db,sql,args=[]){return (await dbQuery(db,sql,args).all()).results||[];}
const queryNumber=(r,key='n')=>Number(r?.[key]||0);
function onlyConfig(body){
  if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Неверная конфигурация.');
  const c={};for(const k of ['release_mode','rollout_percent',...WORLD_CONTROL_FLAGS]){
    if(!Object.hasOwn(body,k))fail(400,'Не передано поле '+k);
    c[k]=body[k];
  }
  if(!WORLD_CONTROL_MODES.includes(c.release_mode)||!Number.isInteger(c.rollout_percent)||c.rollout_percent<0||c.rollout_percent>100)
    fail(400,'Недопустимый режим запуска или процент аудитории.');
  if(c.release_mode==='percentage'&&(c.rollout_percent<1||c.rollout_percent>99))fail(400,'Процент тестового запуска — от 1 до 99.');
  if(c.release_mode==='all')c.rollout_percent=100;
  if(c.release_mode==='off'||c.release_mode==='testers')c.rollout_percent=0;
  for(const key of WORLD_CONTROL_FLAGS){if(![0,1].includes(c[key]))fail(400,'Недопустимый переключатель '+key);}
  return c;
}
function validateChange(body,old){
  const id=String(body?.requestId||''),rev=body?.expectedRevision,reason=String(body?.reason||'').trim();
  if(!validRequestId(id))fail(400,'Некорректный идентификатор операции.');
  if(!Number.isSafeInteger(rev)||rev<0)fail(400,'Не указана проверенная ревизия конфигурации.');
  if(reason.length<10||reason.length>280)fail(400,'Укажите причину изменения: от 10 до 280 символов.');
  if(rev!==old.revision)fail(409,'Конфигурация обновлена другим администратором. Обновите экран.');
  return {requestId:id,revision:rev,reason};
}
async function findReceipt(db,id){return readOne(db,'SELECT actor_telegram_id,action,target_telegram_id,next_json FROM zeffi_world_control_audit WHERE request_id=?',[id]);}
async function guardDuplicate(db,id,actor,action,target,next){
  const prev=await findReceipt(db,id);
  if(!prev)return false;
  if(String(prev.actor_telegram_id)!==actor||prev.action!==action||String(prev.target_telegram_id||'')!==(target||'')||prev.next_json!==JSON.stringify(next))
    fail(409,'Идентификатор операции уже использован для другого изменения.');
  return true;
}
async function metrics(db){
  const now=nowSeconds(),day=now-86400;
  const [cities,active,builders,ops,spend,projects,contributions,chapters]=await Promise.all([
    readOne(db,'SELECT COUNT(*) AS n FROM zeffi_world_cities'),
    readOne(db,'SELECT COUNT(*) AS n FROM zeffi_world_cities WHERE updated_at>=?',[day]),
    readOne(db,'SELECT COUNT(DISTINCT telegram_id) AS n FROM zeffi_world_operations WHERE created_at>=?',[day]),
    readOne(db,'SELECT COUNT(*) AS n FROM zeffi_world_operations WHERE created_at>=?',[day]),
    readOne(db,`SELECT COALESCE(SUM(cost_points),0) AS points,COALESCE(SUM(cost_treats),0) AS treats,
      COALESCE(SUM(cost_coffee),0) AS coffee FROM zeffi_world_operations WHERE created_at>=?`,[day]),
    readAll(db,'SELECT project_id,goal_points,total_points,stage,revision,updated_at FROM zeffi_community_projects ORDER BY project_id'),
    readOne(db,'SELECT COUNT(*) AS n,COALESCE(SUM(amount_points),0) AS points FROM zeffi_community_contributions WHERE created_at>=?',[day]),
    readOne(db,'SELECT COUNT(*) AS n,MAX(chapter) AS highest FROM zeffi_story_players')
      .catch(e=>missing(e,'zeffi_story_players')?null:Promise.reject(e))
  ]);
  return {sampledAt:now,cities:queryNumber(cities),activeCities24h:queryNumber(active),activeBuilders24h:queryNumber(builders),operations24h:queryNumber(ops),
    costs24h:{points:queryNumber(spend,'points'),treats:queryNumber(spend,'treats'),coffee:queryNumber(spend,'coffee')},
    contributions24h:{count:queryNumber(contributions),points:queryNumber(contributions,'points')},
    storyPlayers:chapters?queryNumber(chapters):null,
    projects:projects.map(r=>({id:String(r.project_id),goal:Number(r.goal_points),total:Number(r.total_points),stage:Number(r.stage),revision:Number(r.revision),updatedAt:Number(r.updated_at||0)}))};
}
async function accessView(env,db){
  const c=await state(db),testers=await readAll(db,`SELECT telegram_id,added_by,added_at FROM zeffi_world_control_testers ORDER BY added_at DESC LIMIT 120`);
  const count=queryNumber(await readOne(db,'SELECT COUNT(*) AS n FROM zeffi_world_control_testers'));
  return {ok:true,control:summarize(c),envMaster:String(env?.WORLD_ENABLED||'').toLowerCase()==='true',
    flags:effectiveWorldControlFlags(env,c),testerCount:count,envTesterCount:String(env?.WORLD_TESTER_IDS||'').split(',').filter(x=>/^\d{4,20}$/.test(x.trim())).length,
    testers:testers.map(r=>({telegramId:String(r.telegram_id),addedBy:String(r.added_by),addedAt:Number(r.added_at)}))};
}
async function audit(db){
  const rows=await readAll(db,`SELECT id,request_id,actor_telegram_id,action,target_telegram_id,
    previous_json,next_json,reason,created_at FROM zeffi_world_control_audit ORDER BY id DESC LIMIT 35`);
  return rows.map(row=>({id:Number(row.id),actor:String(row.actor_telegram_id),action:row.action,target:String(row.target_telegram_id||''),reason:row.reason,
    createdAt:Number(row.created_at),previous:JSON.parse(row.previous_json),next:JSON.parse(row.next_json)}));
}
async function monitor(db){
  const now=nowSeconds(),day=now-86400;
  const [tables,ops,errors,hours,history,requests,retryRows,missingReceipts,orphanedCities]=await Promise.all([
    readAll(db,"SELECT name FROM sqlite_schema WHERE type='table' AND name LIKE 'zeffi_%'"),
    readAll(db,`SELECT action_kind,COUNT(*) AS n,COALESCE(SUM(cost_points),0) AS points
      FROM zeffi_world_operations WHERE created_at>=? GROUP BY action_kind ORDER BY n DESC LIMIT 15`,[day]),
    readAll(db,`SELECT area,code,status,SUM(occurrences) AS n,MAX(last_at) AS last_at
      FROM zeffi_world_control_errors WHERE hour_start>=? GROUP BY area,code,status ORDER BY n DESC LIMIT 24`,[day]),
    readAll(db,`SELECT hour_start,SUM(occurrences) AS n FROM zeffi_world_control_errors
      WHERE hour_start>=? GROUP BY hour_start ORDER BY hour_start`,[day]),
    audit(db),
    readOne(db,"SELECT COUNT(*) AS n FROM zeffi_world_resident_requests WHERE status='ready'")
      .catch(e=>missing(e,'zeffi_world_resident_requests')?null:Promise.reject(e)),
    readAll(db,`SELECT area,SUM(occurrences) AS n FROM zeffi_world_control_retries
      WHERE hour_start>=? GROUP BY area ORDER BY n DESC`,[day]),
    readOne(db,`SELECT COUNT(*) AS n FROM zeffi_world_cities c WHERE c.last_request_id<>'' AND NOT EXISTS
      (SELECT 1 FROM zeffi_world_operations o WHERE o.telegram_id=c.telegram_id AND o.request_id=c.last_request_id)`),
    readOne(db,`SELECT COUNT(*) AS n FROM zeffi_world_cities c LEFT JOIN admin_profile_state p
      ON p.telegram_id=c.telegram_id WHERE p.telegram_id IS NULL`)
  ]);
  const names=new Set(tables.map(r=>r.name)),required=['zeffi_world_cities','zeffi_world_operations','zeffi_community_projects',
    'zeffi_community_contributions','zeffi_story_players','zeffi_world_resident_requests','zeffi_world_control','zeffi_world_control_testers','zeffi_world_control_audit','zeffi_world_control_errors','zeffi_world_control_retries'];
  const missingTables=required.filter(name=>!names.has(name));
  const total5xx=errors.filter(e=>Number(e.status)>=500).reduce((n,e)=>n+Number(e.n||0),0);
  const total409=errors.filter(e=>Number(e.status)===409).reduce((n,e)=>n+Number(e.n||0),0);
  const unmatchedOperations=queryNumber(missingReceipts),citiesWithoutProfiles=queryNumber(orphanedCities);
  const retries=retryRows.map(r=>({area:String(r.area),count:Number(r.n||0)}));
  return {ok:true,sampledAt:now,health:{ready:missingTables.length===0,missingTables,total5xx,total409,
    unmatchedOperations,citiesWithoutProfiles,retries24h:retries.reduce((n,x)=>n+x.count,0),
    level:missingTables.length||unmatchedOperations||citiesWithoutProfiles?'critical':total5xx?'warning':'ok',
    residentReadyRequests:requests?queryNumber(requests):null},
    retries,
    operations:ops.map(r=>({kind:r.action_kind,count:Number(r.n),points:Number(r.points||0)})),
    errors:errors.map(r=>({area:r.area,code:r.code,status:Number(r.status),count:Number(r.n),lastAt:Number(r.last_at)})),
    hourly:hours.map(r=>({hour:Number(r.hour_start),count:Number(r.n)})),audit:history};
}
async function configSave(db,ctx){
  const c=await state(db),actor=String(ctx.user.id),body=ctx.body||{},next=onlyConfig(body.control);
  if(await guardDuplicate(db,String(body.requestId||''),actor,'config_save','',next))return {...await accessView(ctx.env,db),repeated:true};
  const {requestId,reason}=validateChange(body,c),old=summarize(c);
  const changed=Object.keys(next).some(key=>next[key]!==c[key]);
  if(!changed)fail(409,'Изменений нет.');
  const escalation=(next.release_mode==='all'||next.release_mode==='percentage')&&
      (c.release_mode!==next.release_mode||c.rollout_percent!==next.rollout_percent)||
      WORLD_CONTROL_FLAGS.some(key=>c[key]===0&&next[key]===1);
  if(escalation&&body.confirmPhrase!=='МИР ЗЕФФИ')fail(400,'Подтвердите включение словом «МИР ЗЕФФИ».');
  const ts=nowSeconds(),rev=c.revision;
  const update=db.prepare(`UPDATE zeffi_world_control SET release_mode=?,rollout_percent=?,allow_purchases=?,allow_story=?,
      allow_fund=?,allow_contributions=?,allow_residents=?,revision=revision+1,last_request_id=?,updated_by=?,updated_at=?
      WHERE id=1 AND revision=?`)
    .bind(next.release_mode,next.rollout_percent,...WORLD_CONTROL_FLAGS.map(k=>next[k]),requestId,actor,ts,rev);
  const receipt=db.prepare(`INSERT INTO zeffi_world_control_audit
    (request_id,actor_telegram_id,action,target_telegram_id,previous_json,next_json,reason,created_at,guard)
    VALUES (?,?,?,?,?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM zeffi_world_control WHERE id=1 AND revision=? AND last_request_id=?) THEN 1 ELSE 0 END)`)
    .bind(requestId,actor,'config_save','',JSON.stringify(old),JSON.stringify(next),reason,ts,rev+1,requestId);
  try{await db.batch([update,receipt]);}
  catch{fail(409,'Конфигурация изменилась, запись не выполнена. Обновите страницу.');}
  return {...await accessView(ctx.env,db),audit:{action:'config_save',old,next,reason}};
}
async function testerUpdate(db,ctx,add){
  const c=await state(db),actor=String(ctx.user.id),body=ctx.body||{},id=String(body.telegramId||'').trim();
  if(!safeId(id))fail(400,'Укажите корректный числовой Telegram ID.');
  const action=add?'tester_add':'tester_remove',next={telegramId:id,added:add};
  if(await guardDuplicate(db,String(body.requestId||''),actor,action,id,next))return {...await accessView(ctx.env,db),repeated:true};
  const {requestId,reason}=validateChange(body,c);
  const existing=await readOne(db,'SELECT telegram_id FROM zeffi_world_control_testers WHERE telegram_id=?',[id]);
  if(Boolean(existing)===add)fail(409,add?'Этот тестер уже добавлен.':'Тестера нет в списке.');
  const ts=nowSeconds(),revision=c.revision;
  const update=db.prepare(`UPDATE zeffi_world_control SET revision=revision+1,last_request_id=?,updated_by=?,updated_at=?
    WHERE id=1 AND revision=?`).bind(requestId,actor,ts,revision);
  const mutate=add?db.prepare('INSERT INTO zeffi_world_control_testers(telegram_id,added_by,added_at) VALUES (?,?,?)').bind(id,actor,ts)
    :db.prepare('DELETE FROM zeffi_world_control_testers WHERE telegram_id=?').bind(id);
  const receipt=db.prepare(`INSERT INTO zeffi_world_control_audit
    (request_id,actor_telegram_id,action,target_telegram_id,previous_json,next_json,reason,created_at,guard)
    VALUES (?,?,?,?,?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM zeffi_world_control WHERE id=1 AND revision=? AND last_request_id=?) THEN 1 ELSE 0 END)`)
    .bind(requestId,actor,action,id,JSON.stringify({telegramId:id,added:!add}),JSON.stringify(next),reason,ts,revision+1,requestId);
  try{await db.batch([update,mutate,receipt]);}
  catch{fail(409,'Список тестеров изменился. Обновите экран и повторите операцию.');}
  return {...await accessView(ctx.env,db),audit:{action,target:id,reason}};
}
export async function handleOwnerWorldControl({env,ctx,path}){
  const db=env?.DB;if(!db)fail(503,'Основная база D1 недоступна.');
  if(!ctx?.access?.owner)fail(403,'Только владелец проекта может управлять Миром Зеффи.');
  if(path==='/api/owner/world/balance'||path.startsWith('/api/owner/world/balance/'))return handleOwnerWorldBalance({env,ctx,path});
  if(path==='/api/owner/world/content'||path.startsWith('/api/owner/world/content/'))return handleOwnerWorldContent({env,ctx,path});
  if(path==='/api/owner/world/overview'){
    const [access,overview]=await Promise.all([accessView(env,db),metrics(db)]);
    return {...access,overview};
  }
  if(path==='/api/owner/world/access')return accessView(env,db);
  if(path==='/api/owner/world/monitor')return monitor(db);
  if(path==='/api/owner/world/config/save')return configSave(db,{...ctx,env});
  if(path==='/api/owner/world/tester/add')return testerUpdate(db,{...ctx,env},true);
  if(path==='/api/owner/world/tester/remove')return testerUpdate(db,{...ctx,env},false);
  fail(404,'Неизвестная команда Мира Зеффи.');
}
