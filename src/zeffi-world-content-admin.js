// Control Center P2. Owner-only World LiveOps; caller guarantees the existing
// owner/staging guards. Never alters player progress, wallets or fund totals.
import {defaultWorldContent,validateWorldContent} from '../world/world-content.js';
import {readWorldContentRecord} from './zeffi-world-content.js';
class ContentAdminError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new ContentAdminError(status,message);};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{12,90}$/.test(id);
const time=()=>Math.floor(Date.now()/1000);
const q=(db,sql,args=[])=>args.length?db.prepare(sql).bind(...args):db.prepare(sql);
const one=(db,sql,args=[])=>q(db,sql,args).first();
const normalize=value=>validateWorldContent(value);
const parse=json=>json?normalize(JSON.parse(json)):defaultWorldContent();
async function row(db){const r=await readWorldContentRecord(db,{allowMissing:false});if(!r.schemaReady)fail(503,'Требуется миграция 0122 Мира Зеффи.');return r;}
async function view(db){
 const r=await row(db),history=(await db.prepare(`SELECT request_id,actor_id,action,draft_revision,published_revision,reason,created_at
  FROM zeffi_world_content_audit ORDER BY id DESC LIMIT 25`).all()).results||[];
 const published=parse(r.published_json),draft=parse(r.draft_json);
 const projects=(await db.prepare('SELECT project_id,goal_points,total_points,stage,revision FROM zeffi_community_projects ORDER BY project_id').all()).results||[];
 return {ok:true,draftRevision:r.draft_revision,publishedRevision:r.published_revision,draft,published,
  hasPendingChanges:JSON.stringify(draft)!==JSON.stringify(published),
  immutableProjects:projects.map(p=>({id:p.project_id,goal:Number(p.goal_points),total:Number(p.total_points),stage:Number(p.stage),revision:Number(p.revision)})),
  history:history.map(h=>({requestId:h.request_id,actor:h.actor_id,action:h.action,draftRevision:Number(h.draft_revision),publishedRevision:Number(h.published_revision),reason:h.reason,createdAt:Number(h.created_at)}))};
}
function required(body,revision){
 if(!validId(body?.requestId))fail(400,'Укажи корректный requestId.');
 if(!Number.isSafeInteger(body?.expectedRevision)||body.expectedRevision!==revision)fail(409,'Черновик изменился. Обнови экран.');
 const reason=String(body?.reason||'').trim();
 if(reason.length<10||reason.length>280)fail(400,'Причина должна содержать от 10 до 280 символов.');
 return reason;
}
async function duplicate(db,body,actor,action,json){
 const prev=await one(db,'SELECT actor_id,action,next_json FROM zeffi_world_content_audit WHERE request_id=?',[body?.requestId]);
 if(!prev)return false;
 if(prev.actor_id!==actor||prev.action!==action||prev.next_json!==json)fail(409,'ID операции повторно используется с другими данными.');
 return true;
}
async function transact(db,{body,actor,r,action,next,previous,update,args}){
 const stamp=time(),dRev=r.draft_revision+1,pRev=r.published_revision+(action==='publish'?1:0);
 const batch=[db.prepare(update).bind(...args,body.requestId,actor,stamp,r.draft_revision),
  db.prepare(`INSERT INTO zeffi_world_content_audit
    (request_id,actor_id,action,draft_revision,published_revision,previous_json,next_json,reason,created_at,guard)
    VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN EXISTS(
      SELECT 1 FROM zeffi_world_content_config WHERE id=1 AND draft_revision=? AND last_request_id=?) THEN 1 ELSE 0 END)`)
   .bind(body.requestId,actor,action,dRev,pRev,previous,next,body.reason,stamp,dRev,body.requestId)];
 try{await db.batch(batch);}catch{fail(409,'Операция публикации конфликтует с другой ревизией или сохранение D1 не подтвердилось.');}
 return {...await view(db),action};
}
async function mutate(db,ctx,action){
 const r=await row(db),body=ctx.body||{},actor=String(ctx.user.id);
 let spec,previous;
 try{
  if(action==='draft_save'){spec=normalize(body.content);previous=parse(r.draft_json);}
  else if(action==='publish'){spec=parse(r.draft_json);previous=parse(r.published_json);}
  else{spec=parse(r.published_json);previous=parse(r.draft_json);}
 }catch(e){fail(400,String(e.message).slice(0,240));}
 const next=JSON.stringify(spec),old=JSON.stringify(previous);
 if(await duplicate(db,body,actor,action,next))return {...await view(db),repeated:true};
 required(body,r.draft_revision);
 if(next===old)fail(409,'Черновик уже совпадает с целевой конфигурацией.');
 if(action==='publish'&&body.confirmPhrase!=='ОПУБЛИКОВАТЬ СОБЫТИЯ')fail(400,'Для публикации введи «ОПУБЛИКОВАТЬ СОБЫТИЯ».');
 const update=action==='publish'
  ?`UPDATE zeffi_world_content_config SET published_json=?,published_revision=published_revision+1,
    draft_revision=draft_revision+1,last_request_id=?,published_by=?,published_at=? WHERE id=1 AND draft_revision=?`
  :`UPDATE zeffi_world_content_config SET draft_json=?,draft_revision=draft_revision+1,
    last_request_id=?,updated_by=?,updated_at=? WHERE id=1 AND draft_revision=?`;
 return transact(db,{body,actor,r,action,next,previous:old,update,args:[next]});
}
export async function handleOwnerWorldContent({env,ctx,path}){
 if(!ctx?.access?.owner)fail(403,'Управление событиями доступно только владельцу.');
 if(!env?.DB)fail(503,'D1 недоступна.');
 if(path==='/api/owner/world/content')return view(env.DB);
 const map={'/api/owner/world/content/draft/save':'draft_save','/api/owner/world/content/publish':'publish','/api/owner/world/content/draft/restore':'restore_draft'};
 const action=map[path];if(!action)fail(404,'Неизвестная команда P2.');
 return mutate(env.DB,ctx,action);
}
