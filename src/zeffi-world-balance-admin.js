// World P1: owner-only versioned draft and atomic, audited publication.
// Caller MUST run existing requireOwnerPanelContext + staging target guard.
import {defaultWorldBalance,validateWorldBalance} from '../world/world-balance.js';
import {readWorldBalanceRecord} from './zeffi-world-balance.js';
class AdminError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new AdminError(status,message);};
const now=()=>Math.floor(Date.now()/1000);
const matchId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{12,90}$/.test(id);
const canonical=input=>validateWorldBalance(input,{reachability:true});
const parse=raw=>raw?JSON.parse(raw):defaultWorldBalance();
const query=(db,sql,args=[])=>args.length?db.prepare(sql).bind(...args):db.prepare(sql);
const read=(db,sql,args=[])=>query(db,sql,args).first();
async function row(db){
 const record=await readWorldBalanceRecord(db,{allowMissing:false});
 if(!record.schemaReady)fail(503,'Не применена миграция 0121.');
 return record;
}
async function view(db){
 const r=await row(db);
 const history=(await db.prepare(`SELECT request_id,actor_id,action,draft_revision,published_revision,reason,created_at
  FROM zeffi_world_balance_audit ORDER BY id DESC LIMIT 18`).all()).results||[];
 return {ok:true,draftRevision:r.draft_revision,publishedRevision:r.published_revision,
  draft:parse(r.draft_json),published:parse(r.published_json),hasPendingChanges:JSON.stringify(parse(r.draft_json))!==JSON.stringify(parse(r.published_json)),
  history:history.map(x=>({requestId:x.request_id,actor:x.actor_id,action:x.action,draftRevision:Number(x.draft_revision),
   publishedRevision:Number(x.published_revision),reason:x.reason,createdAt:Number(x.created_at)}))};
}
async function duplicate(db,body,actor,action,expectedJson){
 if(!matchId(body?.requestId))fail(400,'Неверный ID операции.');
 const prev=await read(db,'SELECT actor_id,action,next_json FROM zeffi_world_balance_audit WHERE request_id=?',[body.requestId]);
 if(!prev)return false;
 if(prev.actor_id!==actor||prev.action!==action||prev.next_json!==expectedJson)fail(409,'Этот requestId уже использован для другого действия.');
 return true;
}
function basics(body,revision){
 const reason=String(body?.reason||'').trim();
 if(reason.length<10||reason.length>280)fail(400,'Укажите причину от 10 до 280 символов.');
 if(!Number.isSafeInteger(body?.expectedRevision)||body.expectedRevision!==revision)fail(409,'Черновик изменился. Перезагрузите страницу.');
 return {reason,requestId:body.requestId};
}
async function claimedRewardLock(db,previous,next){
 for(let i=1;i<10;i++){
  if(JSON.stringify(previous.levels[i].reward)===JSON.stringify(next.levels[i].reward))continue;
  // JSON1 scans only for changed levels, never alters existing wallet/claim rows.
  let hit;
  try{hit=await read(db,`SELECT 1 AS used FROM zeffi_world_cities c WHERE EXISTS (
      SELECT 1 FROM json_each(c.state_json,'$.progress.claimedLevels') WHERE CAST(value AS INTEGER)=?) LIMIT 1`,[i+1]);}
  catch{fail(503,'Нельзя подтвердить историю уже полученных наград. Публикация остановлена.');}
  if(hit)fail(409,`Награда за уровень ${i+1} уже получена игроками и не может быть изменена.`);
 }
}
async function commit(db,{actor,action,body,r,nextJson,previousJson,updateSql,args,guardArgs=[]}){
 const ts=now();
 const update=db.prepare(updateSql).bind(...args,body.requestId,actor,ts,r.draft_revision,...guardArgs);
 const audit=db.prepare(`INSERT INTO zeffi_world_balance_audit
   (request_id,actor_id,action,draft_revision,published_revision,previous_json,next_json,reason,created_at,guard)
   VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN EXISTS (
     SELECT 1 FROM zeffi_world_balance_config WHERE id=1 AND draft_revision=? AND last_request_id=?) THEN 1 ELSE 0 END)`)
  .bind(body.requestId,actor,action,r.draft_revision+1,action==='publish'?r.published_revision+1:r.published_revision,previousJson,nextJson,body.reason,ts,r.draft_revision+1,body.requestId);
 try{await db.batch([update,audit]);}
 catch{fail(409,'Конфигурация изменилась либо запись не подтверждена D1. Обновите экран.');}
 return {...await view(db),audit:{action,reason:body.reason}};
}
async function save(db,ctx){
 const r=await row(db),body=ctx.body||{},actor=String(ctx.user.id);
 let spec;try{spec=canonical(body.balance);}catch(e){fail(400,String(e.message).slice(0,220));}
 const nextJson=JSON.stringify(spec),oldJson=JSON.stringify(parse(r.draft_json));
 if(await duplicate(db,body,actor,'draft_save',nextJson))return {...await view(db),repeated:true};
 basics(body,r.draft_revision);
 if(nextJson===oldJson)fail(409,'Черновик не изменился.');
 return commit(db,{actor,action:'draft_save',body,r,nextJson,previousJson:oldJson,
  updateSql:`UPDATE zeffi_world_balance_config SET draft_json=?,draft_revision=draft_revision+1,last_request_id=?,updated_by=?,updated_at=?
    WHERE id=1 AND draft_revision=?`,args:[nextJson]});
}
async function publish(db,ctx){
 const r=await row(db),body=ctx.body||{},actor=String(ctx.user.id);
 const next=canonical(parse(r.draft_json)),previous=validateWorldBalance(parse(r.published_json),{reachability:false});
 const nextJson=JSON.stringify(next),oldJson=JSON.stringify(previous);
 if(await duplicate(db,body,actor,'publish',nextJson))return {...await view(db),repeated:true};
 basics(body,r.draft_revision);
 if(body.confirmPhrase!=='ОПУБЛИКОВАТЬ БАЛАНС')fail(400,'Для публикации введите «ОПУБЛИКОВАТЬ БАЛАНС».');
 if(nextJson===oldJson)fail(409,'Опубликованная версия уже совпадает с черновиком.');
 await claimedRewardLock(db,previous,next);
 // Recheck redeemed levels IN the same atomic batch as publication. A player
 // who redeems during the preliminary scan must never lose the old reward.
 const changedLevels=next.levels.slice(1).filter((level,i)=>
  JSON.stringify(level.reward)!==JSON.stringify(previous.levels[i+1].reward)).map(level=>level.level);
 const claimedGuard=changedLevels.map(()=>` AND NOT EXISTS (SELECT 1 FROM zeffi_world_cities c
   WHERE EXISTS (SELECT 1 FROM json_each(c.state_json,'$.progress.claimedLevels')
   WHERE CAST(value AS INTEGER)=?))`).join('');
 return commit(db,{actor,action:'publish',body,r,nextJson,previousJson:oldJson,
  updateSql:`UPDATE zeffi_world_balance_config SET published_json=?,published_revision=published_revision+1,
    draft_revision=draft_revision+1,last_request_id=?,published_by=?,published_at=?
    WHERE id=1 AND draft_revision=?${claimedGuard}`,args:[nextJson],guardArgs:changedLevels});
}
async function restore(db,ctx){
 const r=await row(db),body=ctx.body||{},actor=String(ctx.user.id);
 const nextJson=JSON.stringify(validateWorldBalance(parse(r.published_json),{reachability:false}));
 if(await duplicate(db,body,actor,'restore_draft',nextJson))return {...await view(db),repeated:true};
 basics(body,r.draft_revision);
 if(nextJson===JSON.stringify(parse(r.draft_json)))fail(409,'Черновик уже совпадает с опубликованной версией.');
 return commit(db,{actor,action:'restore_draft',body,r,nextJson,previousJson:JSON.stringify(parse(r.draft_json)),
  updateSql:`UPDATE zeffi_world_balance_config SET draft_json=?,draft_revision=draft_revision+1,last_request_id=?,updated_by=?,updated_at=?
    WHERE id=1 AND draft_revision=?`,args:[nextJson]});
}
export async function handleOwnerWorldBalance({env,ctx,path}){
 if(!ctx?.access?.owner)fail(403,'Только владелец может редактировать баланс Мира Зеффи.');
 if(!env?.DB)fail(503,'База D1 недоступна.');
 if(path==='/api/owner/world/balance')return view(env.DB);
 if(path==='/api/owner/world/balance/draft/save')return save(env.DB,ctx);
 if(path==='/api/owner/world/balance/publish')return publish(env.DB,ctx);
 if(path==='/api/owner/world/balance/draft/restore')return restore(env.DB,ctx);
 fail(404,'Неизвестная операция редактора P1.');
}
