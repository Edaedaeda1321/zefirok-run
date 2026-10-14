// RC-3: individual resident requests. No trusted client progress, prices, or rewards.
// City and wallet are handled by existing D1-authoritative world operations.
import {cityStats} from '../world/engine.js';
import {CATALOG} from '../world/catalog.js';

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
const rows=async(db,id)=> (await db.prepare(`SELECT request_id,template_id,status,progress,assigned_at,completed_at,claimed_at
  FROM zeffi_world_resident_requests WHERE telegram_id=? ORDER BY assigned_at,request_id`).bind(id).all()).results||[];

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
function toPublic(row){
 const template=TEMPLATE_BY_ID.get(row.template_id);
 if(!template)return null;
 return {id:row.request_id,templateId:template.id,name:template.name,speaker:template.speaker,
  message:template.message,objective:template.objective,itemId:template.itemId,
  status:row.status,progress:Number(row.progress),target:1,reward:{...template.reward}};
}

// Called only inside existing state/mutation read flows, never on every map frame.
// The player cannot supply these stats; they are calculated from the D1 city JSON.
export async function residentRequestState(db,telegramId,city,{now=Date.now()}={}){
 const stats=cityStats(city,CATALOG,now);
 const existing=await rows(db,telegramId);
 for(const item of existing){
  const template=TEMPLATE_BY_ID.get(item.template_id);
  if(item.status!=='active'||!template||!fulfilledBySnapshot(template,stats))continue;
  await db.prepare(`UPDATE zeffi_world_resident_requests SET status='ready',progress=1,completed_at=?
   WHERE telegram_id=? AND request_id=? AND status='active'`).bind(now,telegramId,item.request_id).run();
 }
 let current=await rows(db,telegramId);
 let active=current.filter(r=>r.status!=='claimed').length;
 let index=0;
 for(const template of RESIDENT_TEMPLATES){
  if(active>=2)break;
  if(current.some(r=>r.template_id===template.id)||!eligible(template,stats))continue;
  const requestId=`resident-${template.id}`;
  const result=await db.prepare(`INSERT OR IGNORE INTO zeffi_world_resident_requests
    (telegram_id,request_id,template_id,assigned_at) VALUES (?,?,?,?)`)
   .bind(telegramId,requestId,template.id,now+(index++)).run();
  if(Number(result?.meta?.changes??result?.changes??0)>0)active++;
 }
 current=await rows(db,telegramId);
 const day=utcDay(now);
 const counter=await db.prepare('SELECT claims FROM zeffi_world_resident_daily_claims WHERE telegram_id=? AND day_utc=?').bind(telegramId,day).first();
 return {enabled:true,requests:current.filter(r=>r.status!=='claimed').slice(0,2).map(toPublic).filter(Boolean),
  claimedTotal:current.filter(r=>r.status==='claimed').length,
  daily:{claimed:Number(counter?.claims||0),limit:RESIDENT_DAILY_CLAIM_LIMIT,resetsAt:nextUtcDay(now)},
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
 const record=await db.prepare(`SELECT template_id,status FROM zeffi_world_resident_requests WHERE telegram_id=? AND request_id=?`).bind(telegramId,requestId).first();
 if(!record)return {status:404,code:'RESIDENT_REQUEST_NOT_FOUND',error:'Просьба больше не найдена.'};
 const template=TEMPLATE_BY_ID.get(record.template_id);
 if(!template)return {status:409,code:'RESIDENT_REQUEST_UNAVAILABLE',error:'Просьба устарела.'};
 const repeat=await db.prepare('SELECT claim_request_id FROM zeffi_world_resident_claim_receipts WHERE telegram_id=? AND request_id=?').bind(telegramId,requestId).first();
 if(repeat||record.status==='claimed')return {status:200,repeated:true,claimed:true,reward:{...template.reward}};
 if(record.status!=='ready')return {status:409,code:'RESIDENT_NOT_READY',error:'Просьба ещё не выполнена.'};
 const day=utcDay(now);
 const dayCounter=await db.prepare('SELECT claims FROM zeffi_world_resident_daily_claims WHERE telegram_id=? AND day_utc=?').bind(telegramId,day).first();
 if(Number(dayCounter?.claims||0)>=RESIDENT_DAILY_CLAIM_LIMIT)return {status:429,code:'RESIDENT_DAILY_LIMIT',error:'Сегодня уже получены две награды. Новые можно забрать завтра.'};
 await operationGate(telegramId,[]);
 const profile=await readProfile(telegramId,'world:resident-claim:precheck');
 const revision=Number(profile?.revision);
 if(!Number.isSafeInteger(revision)||revision<0)return {status:503,code:'RESIDENT_PROFILE_UNAVAILABLE',error:'Баланс пока недоступен.'};
 const reward=template.reward;
 const marker=`zeffi-resident:${claimRequestId}`;
 const stamp=nowSecs(now);
 const statements=[
  db.prepare(`INSERT OR IGNORE INTO zeffi_world_resident_daily_claims (telegram_id,day_utc,claims,last_request_id)
     VALUES (?,?,0,'')`).bind(telegramId,day),
  db.prepare(`UPDATE zeffi_world_resident_daily_claims SET claims=claims+1,last_request_id=?
     WHERE telegram_id=? AND day_utc=? AND claims<?`).bind(claimRequestId,telegramId,day,RESIDENT_DAILY_CLAIM_LIMIT),
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
      telegramId,requestId,claimRequestId,telegramId,day,claimRequestId,RESIDENT_DAILY_CLAIM_LIMIT,
      telegramId,revision+1,marker)
 ];
 try{await db.batch(statements);}catch(error){
  const settled=await db.prepare('SELECT claim_request_id FROM zeffi_world_resident_claim_receipts WHERE telegram_id=? AND request_id=?').bind(telegramId,requestId).first();
  if(settled)return {status:200,repeated:true,claimed:true,reward:{...reward}};
  return {status:409,code:'RESIDENT_CLAIM_CONFLICT',error:'Баланс или награда изменились. Обнови город и попробуй снова.'};
 }
 const updated=await readProfile(telegramId,'world:resident-claim:result');
 return {status:200,repeated:false,claimed:true,reward:{...reward},wallet:{points:Number(updated.wallet||0),treats:Number(updated.treats||0),coffee:Number(updated.coffee||0)}};
}
