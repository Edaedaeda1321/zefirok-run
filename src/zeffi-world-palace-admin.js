// Owner-only Palace stage publication. No contribution or wallet endpoints.
// Caller supplies authenticated owner context and staging write-target gate.
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{12,90}$/.test(id);
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
function normalized(row){
 if(!row||!Number.isInteger(Number(row.stage))||Number(row.stage)<1||Number(row.stage)>10||
    !Number.isSafeInteger(Number(row.revision))||Number(row.contributions_enabled)!==0)
   fail(503,'Состояние Дворца воспоминаний не прошло серверную проверку. Миграция 0124 обязательна.');
 return {stage:Number(row.stage),stageCount:10,revision:Number(row.revision),contributionsEnabled:false,
   updatedAt:Number(row.updated_at)||0,updatedBy:String(row.updated_by||'')};
}
async function read(db){
 try{return normalized(await db.prepare('SELECT * FROM zeffi_world_palace_state WHERE id=1').first());}
 catch(error){if(error.status)throw error;fail(503,'Таблица Дворца недоступна. Примените миграцию 0124.');}
}
export async function handleOwnerPalace({env,ctx,path}){
 if(!ctx?.access?.owner)fail(403,'Изменение дворца доступно только владельцу.');
 const db=env?.DB;if(!db)fail(503,'Основная D1 недоступна.');
 const current=await read(db);
 if(path==='/api/owner/world/palace'){
  const audit=await db.prepare('SELECT actor_telegram_id,old_stage,new_stage,reason,created_at FROM zeffi_world_palace_audit ORDER BY created_at DESC LIMIT 10').all();
  return {ok:true,palace:current,history:(audit.results||[]).map(r=>({actor:String(r.actor_telegram_id),oldStage:Number(r.old_stage),newStage:Number(r.new_stage),reason:r.reason,createdAt:Number(r.created_at)}))};
 }
 if(path!=='/api/owner/world/palace/stage/save')fail(404,'Неизвестная команда Дворца.');
 const body=ctx.body||{},target=body.stage,expected=body.expectedRevision,requestId=String(body.requestId||''),reason=String(body.reason||'').trim(),actor=String(ctx.user?.id||'');
 if(!validId(requestId))fail(400,'Некорректный requestId.');
 if(!Number.isInteger(target)||target<1||target>10||!Number.isSafeInteger(expected)||expected<0)fail(400,'Некорректная стадия или ревизия.');
 if(reason.length<10||reason.length>280)fail(400,'Причина изменения должна быть от 10 до 280 символов.');
 // Any repeated requestId is read before validation of current revision;
 // retry after timeout is safe and never advances a second time.
 const previous=await db.prepare('SELECT actor_telegram_id,new_stage FROM zeffi_world_palace_audit WHERE request_id=?').bind(requestId).first();
 if(previous){
  if(String(previous.actor_telegram_id)!==actor||Number(previous.new_stage)!==target)fail(409,'requestId использован для другого изменения.');
  return {ok:true,palace:current,repeated:true};
 }
 if(expected!==current.revision)fail(409,'Стадия изменилась в другой сессии. Обновите состояние.');
 if(target!==current.stage+1)fail(409,'Этапы дворца публикуются только последовательно, без пропуска стадий.');
 const seconds=Math.floor(Date.now()/1000),revision=expected+1;
 const update=db.prepare(`UPDATE zeffi_world_palace_state
    SET stage=?,revision=revision+1,last_request_id=?,updated_by=?,updated_at=?
    WHERE id=1 AND revision=? AND stage=? AND contributions_enabled=0`)
   .bind(target,requestId,actor,seconds,expected,current.stage);
 const audit=db.prepare(`INSERT INTO zeffi_world_palace_audit
    (request_id,actor_telegram_id,old_stage,new_stage,reason,created_at,revision,guard)
    VALUES (?,?,?,?,?,?,?,CASE WHEN EXISTS(
      SELECT 1 FROM zeffi_world_palace_state WHERE id=1 AND revision=?
       AND stage=? AND last_request_id=? AND contributions_enabled=0) THEN 1 ELSE 0 END)`)
   .bind(requestId,actor,current.stage,target,reason,seconds,revision,revision,target,requestId);
 try{await db.batch([update,audit]);}
 catch{fail(409,'Конфликт обновления Дворца. Проверьте текущий этап; повторите тот же requestId только после проверки.');}
 return {ok:true,palace:await read(db),audit:{action:'palace_stage_advance',old:{stage:current.stage},next:{stage:target},reason}};
}
