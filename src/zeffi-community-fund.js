// Server-authoritative, all-player shared fundraising in the existing D1.
import {publishedWorldContent} from './zeffi-world-content.js';
// This module never trusts a client balance, total, stage, project goal or Telegram ID.
// The existing Worker resolves signed Telegram auth and injects its canonical
// profile reader/operation gates. Absolutely no runtime DDL.
export const COMMUNITY_PROJECTS = Object.freeze({
  garden: Object.freeze({id:'garden',name:'Сад встреч',goal:60_000,milestones:Object.freeze([60_000])}),
  festival: Object.freeze({id:'festival',name:'Дом фестивалей Зеффи',goal:50_000_000,milestones:Object.freeze([12_500_000,30_000_000,50_000_000])})
});
export const COMMUNITY_MAX_REQUEST = 2_000_000; // Keep legacy receipts compatible.
export const GARDEN_DAILY_LIMIT = 2_000;
export const GARDEN_MAX_DONATION = 1_000;
const donationDayStart = (now=Date.now()) => Math.floor(now / 86_400_000)*86_400;
const headers=Object.freeze({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const enabled=value=>String(value??'').toLowerCase()==='true';
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const requestIdOk=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{12,90}$/.test(id);
export class FundError extends Error{
 constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
const fail=(status,code,message)=>{throw new FundError(status,code,message);};
const expectedStage=(project,total)=>project.milestones.filter(x=>total>=x).length;
const nextMilestone=(project,total)=>project.milestones.find(x=>x>total)??project.goal;

function validatedRow(raw){
 const def=COMMUNITY_PROJECTS[String(raw?.project_id||'')];
 const total=Number(raw?.total_points),revision=Number(raw?.revision),stage=Number(raw?.stage);
 if(!def||Number(raw?.goal_points)!==def.goal||!safe(total)||total>def.goal||!safe(revision)||stage!==expectedStage(def,total))
  fail(503,'COMMUNITY_STATE_INVALID','Сохранение общего проекта не прошло проверку; изменения остановлены.');
 return {id:def.id,title:def.name,goal:def.goal,total,stage,revision,next:nextMilestone(def,total),finished:total===def.goal,milestones:[...def.milestones]};
}
async function getProjects(db){
 let found;
 try{found=(await db.prepare('SELECT project_id,goal_points,total_points,stage,revision FROM zeffi_community_projects ORDER BY project_id').all())?.results;}
 catch{fail(503,'COMMUNITY_SCHEMA_NOT_READY','Примените миграцию 0115_zeffi_community_fund.sql.');}
 if(!Array.isArray(found)||found.length!==Object.keys(COMMUNITY_PROJECTS).length)fail(503,'COMMUNITY_SCHEMA_NOT_READY','Общие проекты пока не инициализированы.');
 const projects=Object.fromEntries(found.map(row=>{const value=validatedRow(row);return [value.id,value];}));
 if(Object.keys(projects).length!==2)fail(503,'COMMUNITY_SCHEMA_NOT_READY','Не найден один из проектов общего города.');
 return projects;
}
async function readReceipt(db,telegramId,requestId){
 return db.prepare('SELECT project_id,requested_points,amount_points,project_revision FROM zeffi_community_contributions WHERE telegram_id=? AND request_id=?')
  .bind(telegramId,requestId).first();
}
async function readSharedState(db,telegramId,profileReader,writesEnabled,publication){
 const day=donationDayStart();
 const [projects,contributions,profile]=await Promise.all([
  getProjects(db),
  db.prepare(`SELECT project_id,COALESCE(SUM(amount_points),0) AS total,
    COALESCE(SUM(CASE WHEN created_at>=? AND created_at<? THEN amount_points ELSE 0 END),0) AS today
    FROM zeffi_community_contributions WHERE telegram_id=? GROUP BY project_id`).bind(day,day+86400,telegramId).all(),
  profileReader(telegramId,'world-community-state')
 ]);
 const wallet=Number(profile?.wallet);
 if(!safe(wallet))fail(503,'COMMUNITY_PROFILE_UNAVAILABLE','Баланс игрока временно недоступен.');
 const own={garden:0,festival:0};let today=0;
 for(const row of contributions?.results||[]){
  if(Object.hasOwn(own,row.project_id)&&safe(Number(row.total))&&safe(Number(row.today))){
   own[row.project_id]=Number(row.total);today+=Number(row.today);
  }
 }
 if(!safe(today))fail(503,'COMMUNITY_CONTRIBUTION_INVALID','История взносов временно недоступна.');
 return {ok:true,mode:'shared-fund',globalSync:true,walletWrites:writesEnabled,
  projects,viewer:{contributedPoints:own,walletPoints:wallet,contributedToday:today,dailyLimitPoints:GARDEN_DAILY_LIMIT},readAt:Date.now()};
}

async function contribute(db,telegramId,body,profileReader,operationGate,publication){
 const projectId=body?.projectId,requested=body?.amountPoints,requestId=body?.requestId;
 if(!Object.hasOwn(COMMUNITY_PROJECTS,String(projectId||'')))fail(400,'COMMUNITY_PROJECT_INVALID','Неизвестный общегородской проект.');
 if(!requestIdOk(requestId))fail(400,'COMMUNITY_REQUEST_ID','Для взноса нужен уникальный requestId.');
 if(!Number.isSafeInteger(requested)||requested<=0||requested>COMMUNITY_MAX_REQUEST)fail(400,'COMMUNITY_AMOUNT_INVALID','Вклад должен быть от 1 до 2 000 000 очков.');
 if(!safe(body.expectedRevision)||!safe(body.expectedDebitPoints)||body.expectedDebitPoints>requested)
  fail(400,'COMMUNITY_QUOTE_REQUIRED','Для взноса нужна актуальная версия и подтверждённая сумма списания.');
 // The exact SAME request ID is the only safe retry after a timeout.
 const previous=await readReceipt(db,telegramId,requestId);
 if(previous){
  if(previous.project_id!==projectId||Number(previous.requested_points)!==requested||Number(previous.amount_points)!==body.expectedDebitPoints)
   fail(409,'COMMUNITY_REQUEST_REUSED','requestId уже использовался для другого взноса.');
  return {...await readSharedState(db,telegramId,profileReader,true,publication),repeated:true,receipt:{requestId,projectId,debitedPoints:Number(previous.amount_points),projectRevision:Number(previous.project_revision),repeated:true}};
 }
 if(projectId!=='garden')fail(403,'COMMUNITY_PROJECT_PAUSED','Зеффи ещё готовит чертежи. Взносы в этот проект пока закрыты.');
 if(!publication.content.projects[projectId].enabled)fail(403,'COMMUNITY_PROJECT_PAUSED','Взносы в этот проект временно приостановлены.');
 if(requested>GARDEN_MAX_DONATION)fail(400,'COMMUNITY_AMOUNT_INVALID','Для Сада встреч один вклад не может превышать 1 000 очков.');
 await operationGate(telegramId,['purchases']);
 const def=COMMUNITY_PROJECTS[projectId];
 const projects=await getProjects(db),project=projects[projectId];
 if(project.revision!==body.expectedRevision)fail(409,'COMMUNITY_REVISION_CONFLICT','Другой игрок обновил фонд. Повторно проверьте сумму перед вкладом.');
 if(project.finished)fail(409,'COMMUNITY_PROJECT_COMPLETE','Общая стройка уже завершена.');
 // Never silently debit more or less than the client showed in the confirmation.
 const amount=Math.min(requested,nextMilestone(def,project.total)-project.total);
 if(amount!==body.expectedDebitPoints)fail(409,'COMMUNITY_QUOTE_CHANGED','До следующей стадии осталось другое количество очков. Обновите сумму.');
 const seconds=Math.floor(Date.now()/1000),day=Math.floor(seconds/86400)*86400;
 const dayRow=await db.prepare('SELECT COALESCE(SUM(amount_points),0) AS used FROM zeffi_community_contributions WHERE telegram_id=? AND created_at>=? AND created_at<?').bind(telegramId,day,day+86400).first();
 const todayUsed=Number(dayRow?.used);
 if(!safe(todayUsed))fail(503,'COMMUNITY_CONTRIBUTION_INVALID','Не удалось проверить дневные взносы.');
 if(todayUsed+amount>GARDEN_DAILY_LIMIT)fail(409,'COMMUNITY_DAILY_LIMIT','Сегодня можно внести не более 2 000 очков. Попробуйте завтра.');
 const profile=await profileReader(telegramId,'world-community:precheck');
 const profileRevision=Number(profile?.revision),available=Number(profile?.wallet);
 if(!safe(profileRevision)||!safe(available))fail(503,'COMMUNITY_PROFILE_UNAVAILABLE','Не удалось подтвердить баланс игрока.');
 if(available<amount)fail(409,'COMMUNITY_INSUFFICIENT_POINTS','Недостаточно очков для вклада.');
 const revision=project.revision+1,after=project.total+amount,stage=expectedStage(def,after);
 const marker=`zeffi-community:${requestId}`;
 const statements=[
  db.prepare(`UPDATE zeffi_community_projects
    SET total_points=total_points+?,stage=?,revision=revision+1,last_request_id=?,updated_at=?
    WHERE project_id=? AND revision=? AND total_points=? AND total_points+?<=goal_points
    ${publication.schemaReady?`AND EXISTS (SELECT 1 FROM zeffi_world_content_config WHERE id=1
      AND published_revision=? AND (published_json IS NULL OR json_extract(published_json,?)=1))`:''}`)
   .bind(amount,stage,requestId,seconds,projectId,project.revision,project.total,amount,
    ...(publication.schemaReady?[publication.revision,`$.projects.${projectId}.enabled`]:[])),
  db.prepare(`UPDATE admin_profile_state
    SET wallet=wallet-?,revision=revision+1,updated_at=?,updated_by=?
    WHERE telegram_id=? AND revision=? AND wallet>=?`)
   .bind(amount,seconds,marker,telegramId,profileRevision,amount),
  db.prepare(`INSERT INTO zeffi_community_contributions
    (telegram_id,request_id,project_id,requested_points,amount_points,project_revision,created_at,project_guard,wallet_guard)
    VALUES (?,?,?,?,?,?,?,
      CASE WHEN EXISTS (SELECT 1 FROM zeffi_community_projects WHERE project_id=? AND revision=? AND total_points=? AND stage=? AND last_request_id=?) THEN 1 ELSE 0 END,
      CASE WHEN EXISTS (SELECT 1 FROM admin_profile_state WHERE telegram_id=? AND revision=? AND updated_by=?)
        AND (SELECT COALESCE(SUM(amount_points),0) FROM zeffi_community_contributions
             WHERE telegram_id=? AND created_at>=? AND created_at<?)+?<=?
        THEN 1 ELSE 0 END)`)
   .bind(telegramId,requestId,projectId,requested,amount,revision,seconds,projectId,revision,after,stage,requestId,
    telegramId,profileRevision+1,marker,telegramId,day,day+86400,amount,GARDEN_DAILY_LIMIT)
 ];
 try{await db.batch(statements);}catch{
  const existing=await readReceipt(db,telegramId,requestId).catch(()=>null);
  if(existing&&existing.project_id===projectId&&Number(existing.requested_points)===requested&&Number(existing.amount_points)===amount)
   return {...await readSharedState(db,telegramId,profileReader,true,publication),repeated:true,receipt:{requestId,projectId,debitedPoints:amount,projectRevision:Number(existing.project_revision),repeated:true}};
  fail(409,'COMMUNITY_CONFLICT','Фонд или баланс изменился одновременно. Проверьте сумму и попробуйте снова.');
 }
 return {...await readSharedState(db,telegramId,profileReader,true,publication),repeated:false,receipt:{requestId,projectId,debitedPoints:amount,projectRevision:revision,repeated:false}};
}

export async function handleCommunityFund({db,env,telegramId,pathname,body,profileReader,operationGate}){
 try{
  if(!enabled(env?.WORLD_COMMUNITY_FUND_ENABLED))fail(403,'COMMUNITY_FUND_DISABLED','Общий фонд пока не включён.');
  const story=env?.WORLD_STORY_ENABLED;
  if(story!=null&&!enabled(story))fail(403,'STORY_DISABLED','Общий сюжетный город закрыт.');
  const route=pathname==='/api/world/community/state'?'state':pathname==='/api/world/community/contribute'?'contribute':null;
  if(!route)fail(404,'COMMUNITY_ROUTE_NOT_FOUND','Неизвестная операция фонда.');
  if(!db)fail(503,'COMMUNITY_DB_UNAVAILABLE','Общая D1 временно недоступна.');
  const publication=await publishedWorldContent(db);
  // Garden-only launch is server-enforced even if an older P2 publication still enables Festival.
  const editorial={revision:publication.revision,projects:{...publication.content.projects,
   festival:{...publication.content.projects.festival,enabled:false,announcement:'Зеффи ещё готовит чертежи. Скоро здесь начнётся новая история!'}},
   events:publication.content.events};
  const writesEnabled=enabled(env?.WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED)&&enabled(env?.WORLD_PURCHASES_ENABLED);
  if(route==='state'){
   await operationGate(telegramId,[]);
   return reply({...await readSharedState(db,telegramId,profileReader,writesEnabled,publication),content:editorial});
  }
  if(!writesEnabled)fail(403,'COMMUNITY_CONTRIBUTIONS_DISABLED','Настоящие вклады пока закрыты. Баланс не изменён.');
  return reply({...await contribute(db,telegramId,body,profileReader,operationGate,publication),content:editorial});
 }catch(error){
  if(error instanceof FundError)return reply({ok:false,code:error.code,error:error.message},error.status);
  if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)
   return reply({ok:false,code:'COMMUNITY_ACCESS_DENIED',error:String(error.message||'Вклад запрещён.')},error.status);
  console.error('Zeffi community fund failed',error);
  return reply({ok:false,code:'COMMUNITY_SERVER_ERROR',error:'Не удалось обработать операцию фонда.'},500);
 }
}
