// RC-3: individual resident requests. No trusted client progress, prices, or rewards.
// City and wallet are handled by existing D1-authoritative world operations.
import {cityStats} from '../world/engine.js';
import {CATALOG} from '../world/catalog.js';
import {publishedWorldContent} from './zeffi-world-content.js';

export const RESIDENT_DAILY_CLAIM_LIMIT=2;
const ZERO=Object.freeze({points:0,treats:0,coffee:0});
// One-time RC quests: future releases can append new templates without rewriting old receipts.
export const RESIDENT_TEMPLATES=Object.freeze([
 Object.freeze({id:'flowers',name:'Цветочный уголок',speaker:'Мия',message:'Нашему городку не хватает цветов! Давай посадим новую клумбу.',objective:'Купить и поставить новую клумбу',kind:'place',itemId:'flowerbed',reward:Object.freeze({points:100,treats:0,coffee:0})}),
 Object.freeze({id:'park',name:'Место для прогулок',speaker:'Лея',message:'Хочу гулять среди деревьев. Построим первый парк?',objective:'Завершить строительство первого парка',kind:'stats',itemId:'garden',reward:Object.freeze({points:300,treats:1,coffee:0})}),
 Object.freeze({id:'road',name:'Дорога к дому',speaker:'Тим',message:'До некоторых домов пока трудно добраться. Поможешь соединить дорогу?',objective:'Новой дорогой подключить постройку',kind:'road',itemId:null,reward:Object.freeze({points:150,treats:0,coffee:0})}),
 Object.freeze({id:'comfort',name:'Уютный городок',speaker:'Мия',message:'Здесь становится так уютно! Давай украсим наш район ещё немного.',objective:'Достичь 30 единиц уюта',kind:'stats',itemId:'flowerbed',reward:Object.freeze({points:200,treats:0,coffee:0})}),
 Object.freeze({id:'cafe',name:'Первое кафе',speaker:'Тим',message:'Так хочется посидеть за чашечкой кофе. Откроем первое заведение?',objective:'Завершить заведение с доступом к дороге',kind:'stats',itemId:'coffee-kiosk',reward:Object.freeze({points:400,treats:2,coffee:0})}),
 Object.freeze({id:'neighbors',name:'Новые соседи',speaker:'Лея',message:'В городке становится веселее! Пригласим ещё пару соседей?',objective:'Достичь 4 жителей',kind:'stats',itemId:'cottage',reward:Object.freeze({points:250,treats:0,coffee:0})})
]);
const TEMPLATE_BY_ID=new Map(RESIDENT_TEMPLATES.map(t=>[t.id,t]));
const utcDay=now=>new Date(now).toISOString().slice(0,10);
const validId=value=>typeof value==='string' && /^[a-zA-Z0-9_-]{12,90}$/.test(value);
const nowSecs=now=>Math.floor(now/1000);
const nextUtcDay=now=>new Date(Date.parse(utcDay(now)+'T00:00:00.000Z')+86400000).toISOString();
const rows=async(db,id,hasTerms=false)=>{
 const terms=hasTerms?',t.reward_points,t.reward_treats':'';
 const from=hasTerms?' LEFT JOIN zeffi_world_resident_terms t ON t.telegram_id=r.telegram_id AND t.request_id=r.request_id':'';
 return (await db.prepare(`SELECT r.request_id,r.template_id,r.status,r.progress,r.assigned_at,r.completed_at,r.claimed_at${terms}
  FROM zeffi_world_resident_requests r${from} WHERE r.telegram_id=? ORDER BY r.assigned_at,r.request_id`).bind(id).all()).results||[];
};
function termsFor(row,template){
 if(Number.isSafeInteger(row?.reward_points)&&Number.isSafeInteger(row?.reward_treats))
  return {points:row.reward_points,treats:row.reward_treats,coffee:0};
 return {...template.reward}; // Legacy pre-0122 assignments keep original RC-3 terms.
}

function fulfilledBySnapshot(template,stats){
 if(template.id==='park')return stats.parks>=1;
 if(template.id==='comfort')return stats.comfort>=30;
 if(template.id==='cafe')return stats.shops>=1;
 if(template.id==='neighbors')return stats.population>=4;
 return false;
}
function eligible(template,stats){
 if(template.id==='road')return stats.disconnected>0;
 if(template.kind==='stats')return !fulfilledBySnapshot(template,stats);
 return true;
}
function toPublic(row,content){
 const template=TEMPLATE_BY_ID.get(row.template_id);
 if(!template)return null;
 const t=content.residents.templates[template.id];
 return {id:row.request_id,templateId:template.id,name:t.name,speaker:t.speaker,
  message:t.message,objective:t.objective,itemId:template.itemId,
  status:row.status,progress:Number(row.progress),target:1,reward:termsFor(row,template)};
}

// Called only inside existing state/mutation read flows, never on every map frame.
// The player cannot supply these stats; they are calculated from the D1 city JSON.
export async function residentRequestState(db,telegramId,city,{now=Date.now(),catalog=CATALOG}={}){
 const stats=cityStats(city,catalog,now);
 const publication=await publishedWorldContent(db),content=publication.content;
 const existing=await rows(db,telegramId,publication.schemaReady);
 for(const item of existing){
  const template=TEMPLATE_BY_ID.get(item.template_id);
  if(item.status!=='active'||!template||!fulfilledBySnapshot(template,stats))continue;
  await db.prepare(`UPDATE zeffi_world_resident_requests SET status='ready',progress=1,completed_at=?
   WHERE telegram_id=? AND request_id=? AND status='active'`).bind(now,telegramId,item.request_id).run();
 }
 let current=await rows(db,telegramId,publication.schemaReady);
 let active=current.filter(r=>r.status!=='claimed').length;
 let index=0;
 for(const template of RESIDENT_TEMPLATES){
  if(active>=2)break;
  if(!content.residents.templates[template.id].enabled)continue;
  if(current.some(r=>r.template_id===template.id)||!eligible(template,stats))continue;
  const requestId=`resident-${template.id}`;
  const requestInsert=db.prepare(`INSERT OR IGNORE INTO zeffi_world_resident_requests
    (telegram_id,request_id,template_id,assigned_at) VALUES (?,?,?,?)`)
   .bind(telegramId,requestId,template.id,now+(index++));
  const terms=content.residents.templates[template.id].reward;
  const termInsert=publication.schemaReady?db.prepare(`INSERT OR IGNORE INTO zeffi_world_resident_terms
    (telegram_id,request_id,reward_points,reward_treats,content_revision)
    SELECT ?,?,CASE WHEN EXISTS(SELECT 1 FROM zeffi_world_content_config WHERE id=1 AND published_revision=?)
      THEN ? ELSE -1 END,?,? WHERE EXISTS(SELECT 1 FROM zeffi_world_resident_requests WHERE telegram_id=? AND request_id=?)`)
   .bind(telegramId,requestId,publication.revision,terms.points,terms.treats,publication.revision,telegramId,requestId):null;
  // D1 batch is atomic: no request may be created without its reward snapshot.
  const outcome=termInsert?await db.batch([requestInsert,termInsert]):[await requestInsert.run()];
  if(Number(outcome[0]?.meta?.changes??outcome[0]?.changes??0)>0)active++;
 }
 current=await rows(db,telegramId,publication.schemaReady);
 const day=utcDay(now);
 const counter=await db.prepare('SELECT claims FROM zeffi_world_resident_daily_claims WHERE telegram_id=? AND day_utc=?').bind(telegramId,day).first();
 return {enabled:true,requests:current.filter(r=>r.status!=='claimed').slice(0,2).map(r=>toPublic(r,content)).filter(Boolean),
  claimedTotal:current.filter(r=>r.status==='claimed').length,
  daily:{claimed:Number(counter?.claims||0),limit:content.residents.dailyLimit,resetsAt:nextUtcDay(now)},
  allCompleted:current.length===RESIDENT_TEMPLATES.length && current.every(r=>r.status==='claimed')};
}

// In-transaction events: only an actually COMMITTED new purchase/road can finish
// these requests. Restores/moves/erases/local data cannot trigger completion.
export function residentMutationStatements(db,telegramId,action,beforeStats,afterStats,now){
 const template=action.kind==='place'&&['flowerbed','extra-flowerbed'].includes(action.objectKind)?'flowers':
  action.kind==='road' && afterStats.connected>beforeStats.connected && afterStats.disconnected<beforeStats.disconnected?'road':null;
 if(!template)return [];
 return [db.prepare(`UPDATE zeffi_world_resident_requests SET status='ready',progress=1,completed_at=?
   WHERE telegram_id=? AND template_id=? AND status='active'`).bind(now,telegramId,template)];
}

export async function claimResidentRequest({db,telegramId,requestId,claimRequestId,readProfile,operationGate,now=Date.now()}){
 if(!validId(requestId)||!validId(claimRequestId))return {status:400,code:'RESIDENT_BAD_REQUEST',error:'Некорректная операция получения награды.'};
 const publication=await publishedWorldContent(db);
 const record=publication.schemaReady?await db.prepare(`SELECT r.template_id,r.status,t.reward_points,t.reward_treats
   FROM zeffi_world_resident_requests r LEFT JOIN zeffi_world_resident_terms t
   ON t.telegram_id=r.telegram_id AND t.request_id=r.request_id
   WHERE r.telegram_id=? AND r.request_id=?`).bind(telegramId,requestId).first()
  :await db.prepare(`SELECT template_id,status FROM zeffi_world_resident_requests WHERE telegram_id=? AND request_id=?`).bind(telegramId,requestId).first();
 if(!record)return {status:404,code:'RESIDENT_REQUEST_NOT_FOUND',error:'Просьба больше не найдена.'};
 const template=TEMPLATE_BY_ID.get(record.template_id);
 if(!template)return {status:409,code:'RESIDENT_REQUEST_UNAVAILABLE',error:'Просьба устарела.'};
 const reward=termsFor(record,template);
 const repeat=await db.prepare('SELECT claim_request_id,reward_points,reward_treats FROM zeffi_world_resident_claim_receipts WHERE telegram_id=? AND request_id=?').bind(telegramId,requestId).first();
 if(repeat||record.status==='claimed')return {status:200,repeated:true,claimed:true,reward:repeat?{points:Number(repeat.reward_points),treats:Number(repeat.reward_treats),coffee:0}:reward};
 if(record.status!=='ready')return {status:409,code:'RESIDENT_NOT_READY',error:'Просьба ещё не выполнена.'};
 const day=utcDay(now);
 const dayCounter=await db.prepare('SELECT claims FROM zeffi_world_resident_daily_claims WHERE telegram_id=? AND day_utc=?').bind(telegramId,day).first();
 const limit=publication.content.residents.dailyLimit;
 if(Number(dayCounter?.claims||0)>=limit)return {status:429,code:'RESIDENT_DAILY_LIMIT',error:'Лимит наград за сегодня достигнут. Новые можно забрать завтра.'};
 await operationGate(telegramId,[]);
 const profile=await readProfile(telegramId,'world:resident-claim:precheck');
 const revision=Number(profile?.revision);
 if(!Number.isSafeInteger(revision)||revision<0)return {status:503,code:'RESIDENT_PROFILE_UNAVAILABLE',error:'Баланс пока недоступен.'};
 const marker=`zeffi-resident:${claimRequestId}`;
 const stamp=nowSecs(now);
 const statements=[
  db.prepare(`INSERT OR IGNORE INTO zeffi_world_resident_daily_claims (telegram_id,day_utc,claims,last_request_id)
     VALUES (?,?,0,'')`).bind(telegramId,day),
  db.prepare(`UPDATE zeffi_world_resident_daily_claims SET claims=claims+1,last_request_id=?
     WHERE telegram_id=? AND day_utc=? AND claims<?${publication.schemaReady?' AND EXISTS(SELECT 1 FROM zeffi_world_content_config WHERE id=1 AND published_revision=?)':''}`)
    .bind(claimRequestId,telegramId,day,limit,...(publication.schemaReady?[publication.revision]:[])),
  db.prepare(`UPDATE zeffi_world_resident_requests SET status='claimed',claimed_at=?,claim_request_id=?
     WHERE telegram_id=? AND request_id=? AND status='ready'`).bind(now,claimRequestId,telegramId,requestId),
  db.prepare(`UPDATE admin_profile_state SET wallet=wallet+?, treats=treats+?, revision=revision+1,
     updated_at=?,updated_by=? WHERE telegram_id=? AND revision=? AND wallet<=? AND treats<=?`)
    .bind(reward.points,reward.treats,stamp,marker,telegramId,revision,
      Number.MAX_SAFE_INTEGER-reward.points,Number.MAX_SAFE_INTEGER-reward.treats),
  db.prepare(`INSERT INTO zeffi_world_resident_claim_receipts
   (telegram_id,request_id,claim_request_id,day_utc,reward_points,reward_treats,created_at,
     request_guard,daily_guard,profile_guard) VALUES (?,?,?,?,?,?,?,
     CASE WHEN EXISTS(SELECT 1 FROM zeffi_world_resident_requests WHERE telegram_id=? AND request_id=? AND status='claimed' AND claim_request_id=?) THEN 1 ELSE 0 END,
     CASE WHEN EXISTS(SELECT 1 FROM zeffi_world_resident_daily_claims WHERE telegram_id=? AND day_utc=? AND last_request_id=? AND claims<=?) THEN 1 ELSE 0 END,
     CASE WHEN EXISTS(SELECT 1 FROM admin_profile_state WHERE telegram_id=? AND revision=? AND updated_by=?) THEN 1 ELSE 0 END)`)
    .bind(telegramId,requestId,claimRequestId,day,reward.points,reward.treats,stamp,
      telegramId,requestId,claimRequestId,telegramId,day,claimRequestId,limit,
      telegramId,revision+1,marker)
 ];
 try{await db.batch(statements);}catch(error){
  const settled=await db.prepare('SELECT claim_request_id FROM zeffi_world_resident_claim_receipts WHERE telegram_id=? AND request_id=?').bind(telegramId,requestId).first();
  if(settled)return {status:200,repeated:true,claimed:true,reward};
  return {status:409,code:'RESIDENT_CLAIM_CONFLICT',error:'Баланс или награда изменились. Обнови город и попробуй снова.'};
 }
 const updated=await readProfile(telegramId,'world:resident-claim:result');
 return {status:200,repeated:false,claimed:true,reward:{...reward},wallet:{points:Number(updated.wallet||0),treats:Number(updated.treats||0),coffee:Number(updated.coffee||0)}};
}
