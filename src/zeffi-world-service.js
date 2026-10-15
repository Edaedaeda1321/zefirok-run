// Мир Зеффи: isolated server-authoritative commands within the EXISTING DB binding.
// No runtime DDL, no trusted client balances/snapshots and no extra D1 database.
// Tables are provisioned only by migrations/0114_zeffi_world.sql.
import {
  makeInitialCity, sanitizeCity, addObject, addGiftDecor, addPassGarden, moveObject, storeObject, restoreObject,
  applyRoadStroke, buyParcel, skipConstruction, cityStats, reconcileCityProgress, claimCityLevelReward, CITY_LEVELS, BuildError
} from '../world/engine.js';
import { CATALOG } from '../world/catalog.js';
import {publishedWorldEconomy} from './zeffi-world-balance.js';
import {handleCommunityFund} from './zeffi-community-fund.js';
import {handleZeffiStory} from './zeffi-story-progress.js';
import {readWorldTutorial,writeWorldTutorial} from './zeffi-world-tutorial.js';
import {worldAccessPolicy,recordWorldControlError,recordWorldControlRetry} from './zeffi-world-control.js';
import {residentRequestState,residentMutationStatements,claimResidentRequest} from './zeffi-resident-requests.js';
import {readWorldExtras,claimCityChapter,assertDecorSchema,worldRewardDecor,worldDecorGiftUsage} from './zeffi-world-decor.js';

const ZERO = Object.freeze({points:0,treats:0,coffee:0});
const MAX_CITY_JSON = 180_000;
const MAX_REQUEST_LENGTH = 20_000;
const WORLD_ACTIONS = new Set(['place','place-gift','place-pass-garden','move','store','restore','road','erase-road','parcel','skip','claim-level']);
const RESULT_HEADERS = Object.freeze({ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store, private', 'X-Content-Type-Options':'nosniff' });

class WorldError extends Error {
  constructor(status,code,message) { super(message); this.name='WorldError';this.status=status;this.code=code; }
}
const failure = (status,code,message)=>{throw new WorldError(status,code,message);};
const reply = (body,status=200)=>new Response(JSON.stringify(body),{status,headers:RESULT_HEADERS});
const validRequestId = id=>typeof id==='string' && /^[A-Za-z0-9_-]{12,90}$/.test(id);
const natural = v=>Number.isSafeInteger(v)&&v>=0;
const coordinate = v=>Number.isSafeInteger(v)&&v>=-9999&&v<=9999;
const normalizedPrice = p=>({points:Number(p?.points||0),treats:Number(p?.treats||0),coffee:Number(p?.coffee||0)});
const walletFromProfile = p=>({points:Number(p?.wallet||0),treats:Number(p?.treats||0),coffee:Number(p?.coffee||0)});
const persistedCity = city=>JSON.stringify({...city,wallet:{...ZERO}});
const worldEnabled = env=>String(env?.WORLD_ENABLED||'').toLowerCase()==='true';
const paymentsEnabled = env=>String(env?.WORLD_PURCHASES_ENABLED||'').toLowerCase()==='true';
// Optional kill switch. Default-on is safe within WORLD_ENABLED + signed allowlist.
const residentsEnabled = env=>String(env?.WORLD_RESIDENT_REQUESTS_ENABLED??'true').toLowerCase()==='true';
async function residentEnvelope(db,env,telegramId,city,catalog=CATALOG){
 if(!residentsEnabled(env))return {enabled:false,requests:[],daily:{claimed:0,limit:2}};
 try{return await residentRequestState(db,telegramId,city,{catalog});}
 catch(error){
  // An unapplied optional RC migration must not break existing cities or paid
  // construction. Claim API remains fail-closed until 0119 is installed.
  console.warn('World resident requests unavailable',error?.message||String(error));
  return {enabled:false,requests:[],daily:{claimed:0,limit:2}};
 }
}

async function assertTester(env,telegramId){
  // Signed Telegram identity has been checked by the caller. Dynamic cohort
  // selection is server-only and keeps legacy env allowlisting fail-closed.
  let access;
  try {access=await worldAccessPolicy(env,telegramId);}
  catch(error){failure(503,'WORLD_CONTROL_UNAVAILABLE','Настройки доступа к Миру Зеффи временно недоступны.');}
  if(!access.allowed)failure(403,'WORLD_NOT_AVAILABLE','Мир Зеффи пока недоступен для этого аккаунта.');
  return access.effectiveEnv;
}
function cityFromRow(row,wallet,catalog=CATALOG){
  let saved;
  try {saved=JSON.parse(row.state_json);}catch{failure(503,'WORLD_STATE_UNAVAILABLE','Сохранение города повреждено; сервер не будет его перезаписывать.');}
  try {const city=sanitizeCity(saved,catalog);city.wallet={...wallet};return city;}
  catch{failure(503,'WORLD_STATE_UNAVAILABLE','Сохранение города не прошло проверку.');}
}
function canonicalAction(body){
  if(!body||typeof body!=='object'||Array.isArray(body))failure(400,'BAD_ACTION','Некорректная команда.');
  const kind=String(body.kind||'');
  if(!WORLD_ACTIONS.has(kind))failure(400,'BAD_ACTION','Операция не поддерживается.');
  const args=body.args;
  if(!args||typeof args!=='object'||Array.isArray(args))failure(400,'BAD_ACTION','Аргументы операции не переданы.');
  const result={kind};
  if(kind==='place'||kind==='place-gift'||kind==='place-pass-garden'){
    if(!/^[a-z0-9_-]{1,64}$/.test(String(args.objectKind||'')))failure(400,'BAD_ACTION','Некорректный объект.');
    result.objectKind=String(args.objectKind);
  }
  if(['place','place-gift','place-pass-garden','move','restore'].includes(kind)){
    if(!coordinate(args.x)||!coordinate(args.y)||!Number.isInteger(args.rotation)||args.rotation<0||args.rotation>3)failure(400,'BAD_ACTION','Некорректные координаты или поворот.');
    Object.assign(result,{x:args.x,y:args.y,rotation:args.rotation});
  }
  if(['move','restore','store','skip'].includes(kind)){
    if(!/^obj-[1-9]\d{0,9}$/.test(String(args.uid||'')))failure(400,'BAD_ACTION','Некорректная постройка.');
    result.uid=String(args.uid);
  }
  if(kind==='claim-level'){
    if(!Number.isInteger(args.level)||args.level<2||args.level>CITY_LEVELS.length)failure(400,'BAD_ACTION','Некорректный уровень города.');
    result.level=args.level;
  }
  if(kind==='parcel'){
    if(!coordinate(args.cx)||!coordinate(args.cy))failure(400,'BAD_ACTION','Некорректные координаты участка.');
    Object.assign(result,{cx:args.cx,cy:args.cy});
  }
  if(kind==='road'||kind==='erase-road'){
    if(!Array.isArray(args.positions)||args.positions.length===0||args.positions.length>256)failure(400,'BAD_ACTION','Слишком длинная дорога.');
    for(const pos of args.positions)if(!pos||!coordinate(pos.x)||!coordinate(pos.y))failure(400,'BAD_ACTION','Некорректные клетки Road.');
    result.positions=args.positions.map(p=>({x:p.x,y:p.y}));
  }
  return result;
}
function operate(city,action,now,catalog=CATALOG){
  switch(action.kind){
    case 'place':return addObject(city,catalog,action.objectKind,action.x,action.y,action.rotation,now);
    case 'place-gift':return addGiftDecor(city,catalog,action.objectKind,action.x,action.y,action.rotation,now);
    case 'place-pass-garden':return addPassGarden(city,catalog,action.objectKind,action.x,action.y,action.rotation,now);
    case 'move':return moveObject(city,catalog,action.uid,action.x,action.y,action.rotation);
    case 'store':return storeObject(city,action.uid);
    case 'restore':return restoreObject(city,catalog,action.uid,action.x,action.y,action.rotation);
    case 'road':return applyRoadStroke(city,catalog,action.positions);
    case 'erase-road':return applyRoadStroke(city,catalog,action.positions,{erasing:true});
    case 'parcel':return buyParcel(city,action.cx,action.cy);
    case 'skip':return skipConstruction(city,action.uid,now).city;
    case 'claim-level':return claimCityLevelReward(city,catalog,action.level,now);
    default:failure(400,'BAD_ACTION','Неизвестная операция.');
  }
}
function quotedPriceMatches(expected,actual){
  if(!expected||typeof expected!=='object'||Array.isArray(expected))return false;
  if(!['points','treats','coffee'].every(key=>natural(expected[key])))return false;
  return ['points','treats','coffee'].every(key=>expected[key]===actual[key]);
}
function priceDifference(before,after){
  const p={};
  for(const key of ['points','treats','coffee']){
    const d=Number(before[key])-Number(after[key]);
    if(!natural(d))failure(500,'WORLD_PRICE_INVALID','Неверное списание в строительном движке.');
    p[key]=d;
  }
  return p;
}
async function assertSchema(db){
  // No automatic CREATE TABLE during live player API requests.
  try {
    const result=await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('zeffi_world_cities','zeffi_world_operations')").all();
    const names=new Set((result?.results||[]).map(x=>String(x.name)));
    if(names.size!==2)failure(503,'WORLD_SCHEMA_NOT_READY','Не применена миграция «Мира Зеффи» 0114.');
  }catch(error){if(error instanceof WorldError)throw error;failure(503,'WORLD_SCHEMA_NOT_READY','Новая схема городов пока недоступна.');}
}
async function ensureCity(db,telegramId,now){
  const city=makeInitialCity();
  const starter=persistedCity(city);
  await db.prepare('INSERT OR IGNORE INTO zeffi_world_cities(telegram_id,revision,state_json,last_request_id,created_at,updated_at) VALUES (?,0,?,\'\',?,?)').bind(telegramId,starter,now,now).run();
  return db.prepare('SELECT revision,state_json,last_request_id FROM zeffi_world_cities WHERE telegram_id=?').bind(telegramId).first();
}
async function findReceipt(db,telegramId,requestId){
  return db.prepare('SELECT action_kind,city_revision,cost_points,cost_treats,cost_coffee FROM zeffi_world_operations WHERE telegram_id=? AND request_id=?').bind(telegramId,requestId).first();
}
function buildView(city,revision,enabled,more={},economy=null){
  const catalog=economy?.catalog||CATALOG;
  return {ok:true,revision,city,stats:cityStats(city,catalog),serverAuthoritative:true,purchasesEnabled:enabled,
    ...(economy?{economy:economy.config}:{}),...more};
}
async function handleMutation(db,env,telegramId,body,readProfile,operationGate,economy){
  const catalog=economy.catalog;
  const requestId=String(body.requestId||'');
  if(!validRequestId(requestId))failure(400,'REQUEST_ID_REQUIRED','Для операции нужен уникальный requestId (12–90 символов).');
  if(!natural(body.expectedRevision))failure(400,'REVISION_REQUIRED','Нужна версия города для защиты от конфликтов.');
  const prior=await findReceipt(db,telegramId,requestId);
  if(prior){
    const [row,profile]=await Promise.all([ensureCity(db,telegramId,Date.now()),readProfile(telegramId,'world-retry')]);
    const city=cityFromRow(row,walletFromProfile(profile),catalog);
    return buildView(city,Number(row.revision),paymentsEnabled(env),{repeated:true,operation:{id:requestId,kind:prior.action_kind,state:'completed',repeated:true},cost:{points:Number(prior.cost_points),treats:Number(prior.cost_treats),coffee:Number(prior.cost_coffee)},residentRequests:await residentEnvelope(db,env,telegramId,city,catalog)},economy);
  }
  const action=canonicalAction(body.action);
  if(action.kind==='place-pass-garden'){
    if(action.objectKind!=='meeting-garden-pass')failure(400,'PASS_GARDEN_ONLY','Доступен только Сад встреч.');
    try{await db.prepare('SELECT telegram_id FROM zeffi_world_pass_garden_ownership LIMIT 1').all();}catch{failure(503,'PASS_GARDEN_SCHEMA_NOT_READY','Сначала примените миграцию 0125.');}
  }
  if(action.kind==='place-gift'){if(!worldRewardDecor(action.objectKind))failure(400,'WORLD_DECOR_ONLY','Наградой можно поставить только декор.');try{await assertDecorSchema(db);}catch{failure(503,'WORLD_DECOR_SCHEMA_NOT_READY','Учёт наградного декора ещё не включён.');}}
  await operationGate(telegramId,[]);
  const now=Date.now(), nowSeconds=Math.floor(now/1000);
  const row=await ensureCity(db,telegramId,now);
  const currentRevision=Number(row.revision);
  if(currentRevision!==body.expectedRevision)failure(409,'WORLD_REVISION_CONFLICT','Город обновлён в другом окне. Перезагрузите состояние.');
  const profile=await readProfile(telegramId,`world:${action.kind}:precheck`);
  const profileRevision=Number(profile?.revision||0);
  if(!natural(profileRevision))failure(503,'WORLD_PROFILE_NOT_READY','Баланс игрока ещё недоступен.');
  const wallet=walletFromProfile(profile);
  const before=reconcileCityProgress(cityFromRow(row,wallet,catalog),catalog,now);
  let next;
  try {next=operate(before,action,now,catalog);}catch(e){if(e instanceof BuildError)failure(e.code==='INSUFFICIENT_BALANCE'?409:400,e.code,e.code);throw e;}
  next=reconcileCityProgress(next,catalog,now);
  const gift=action.kind==='place-gift';
  const passGarden=action.kind==='place-pass-garden';
  const granting=action.kind==='claim-level';
  const reward=granting?(catalog.__cityLevels||CITY_LEVELS)[action.level-1].reward:ZERO;
  // The signed client quotes ZERO for grants. The Worker alone chooses the
  // credit amounts, and every other action is forbidden from minting money.
  const cost=granting?{...ZERO}:priceDifference(wallet,next.wallet);
  if(granting){
    if(!reward||!['points','treats','coffee'].every(key=>
      Number.isSafeInteger(next.wallet[key])&&next.wallet[key]===wallet[key]+reward[key]))
      failure(500,'WORLD_REWARD_INVALID','Награда города рассчитана неверно.');
  }
  if(persistedCity(before)===persistedCity(next))failure(409,'WORLD_NO_CHANGES','Нет изменений для сохранения.');
  if(!quotedPriceMatches(body.expectedPrice,cost))failure(409,'WORLD_PRICE_CHANGED','Цена изменилась. Подтвердите её повторно.');
  const bill=cost.points>0||cost.treats>0||cost.coffee>0;
  const credit=granting&&['points','treats','coffee'].some(key=>reward[key]>0);
  const profileTouched=bill||credit;
  if(bill){
    if(!paymentsEnabled(env))failure(403,'WORLD_PURCHASES_DISABLED','Серверные покупки пока закрыты. Балансы не списаны.');
    await operationGate(telegramId,['purchases']);
  }
  const nextCityJson=persistedCity(next);
  if(nextCityJson.length>MAX_CITY_JSON)failure(409,'WORLD_SIZE_LIMIT','Город достиг ограничения размера сохранения.');
  const nextRevision=currentRevision+1;
  const giftUsed=gift?worldDecorGiftUsage(next,action.objectKind):0;
  const marker=`zeffi-world:${requestId}`;
  // Cloudflare D1 batch is a single transaction. An operation receipt with
  // CHECK guards *forces rollback* if either optimistic UPDATE touched no row.
  // Thus a successful receipt implies both city state and wallet charge committed.
  const statements=[db.prepare(`UPDATE zeffi_world_cities SET state_json=?,revision=revision+1,last_request_id=?,updated_at=?
    WHERE telegram_id=? AND revision=?`).bind(nextCityJson,requestId,now,telegramId,currentRevision)];
  if(bill){statements.push(db.prepare(`UPDATE admin_profile_state SET wallet=wallet-?,treats=treats-?,coffee=coffee-?,revision=revision+1,updated_at=?,updated_by=?
    WHERE telegram_id=? AND revision=? AND wallet>=? AND treats>=? AND coffee>=?`).bind(
      cost.points,cost.treats,cost.coffee,nowSeconds,marker,telegramId,profileRevision,cost.points,cost.treats,cost.coffee));}
  if(credit){statements.push(db.prepare(`UPDATE admin_profile_state SET wallet=wallet+?,treats=treats+?,coffee=coffee+?,revision=revision+1,updated_at=?,updated_by=?
    WHERE telegram_id=? AND revision=? AND wallet<=? AND treats<=? AND coffee<=?`).bind(
      reward.points,reward.treats,reward.coffee,nowSeconds,marker,telegramId,profileRevision,
      Number.MAX_SAFE_INTEGER-reward.points,Number.MAX_SAFE_INTEGER-reward.treats,Number.MAX_SAFE_INTEGER-reward.coffee));}
  // Only confirmed brand-new purchases/roads can complete event-based requests.
  // Optional schema detection is fail-soft so a missing 0119 does not block a paid build.
  if(residentsEnabled(env)&&((action.kind==='place'&&['flowerbed','extra-flowerbed'].includes(action.objectKind))||action.kind==='road')){
    try{
      await db.prepare('SELECT request_id FROM zeffi_world_resident_requests LIMIT 1').all();
      statements.push(...residentMutationStatements(db,telegramId,action,cityStats(before,catalog,now),cityStats(next,catalog,now),now));
    }catch(error){console.warn('Resident event tracking unavailable',error?.message||String(error));}
  }
  const balanceGuard=economy.schemaReady?' AND EXISTS (SELECT 1 FROM zeffi_world_balance_config WHERE id=1 AND published_revision=?)':'';
  const giftGuard=gift?' AND COALESCE((SELECT total FROM zeffi_world_decor_owned WHERE telegram_id=? AND decor_id=?),0)>=?':'';
  const gardenGuard=passGarden?" AND EXISTS(SELECT 1 FROM zeffi_world_pass_garden_ownership WHERE telegram_id=? AND garden_id='meeting-garden-pass' AND source_lane='premium')":'';
  statements.push(db.prepare(`INSERT INTO zeffi_world_operations
   (telegram_id,request_id,action_kind,city_revision,cost_points,cost_treats,cost_coffee,created_at,city_guard,profile_guard)
   VALUES (?,?,?,?,?,?,?,?,
     CASE WHEN EXISTS (SELECT 1 FROM zeffi_world_cities WHERE telegram_id=? AND revision=? AND last_request_id=?) THEN 1 ELSE 0 END,
     CASE WHEN (?=0 OR EXISTS (SELECT 1 FROM admin_profile_state WHERE telegram_id=? AND revision=? AND updated_by=?))${balanceGuard}${giftGuard}${gardenGuard} THEN 1 ELSE 0 END)`)
    .bind(telegramId,requestId,action.kind,nextRevision,cost.points,cost.treats,cost.coffee,nowSeconds,
      telegramId,nextRevision,requestId,profileTouched?1:0,telegramId,profileRevision+1,marker,
      ...(economy.schemaReady?[economy.config.revision]:[]),...(gift?[telegramId,action.objectKind,giftUsed]:[]),...(passGarden?[telegramId]:[])));
  try{await db.batch(statements);}catch(error){
    const existing=await findReceipt(db,telegramId,requestId).catch(()=>null);
    if(existing){
      const [latest,p]=await Promise.all([ensureCity(db,telegramId,now),readProfile(telegramId,'world-race-retry')]);
      const city=cityFromRow(latest,walletFromProfile(p),catalog);
      return buildView(city,Number(latest.revision),paymentsEnabled(env),{repeated:true,operation:{id:requestId,kind:existing.action_kind,state:'completed',repeated:true},residentRequests:await residentEnvelope(db,env,telegramId,city,catalog)},economy);
    }
    // A CAS change, concurrent wallet mutation or SQLite CHECK failure can
    // legitimately abort the transaction; do not retry with a new request ID.
    failure(409,'WORLD_STATE_CONFLICT','Баланс или город изменился одновременно. Обновите город перед повтором.');
  }
  const [latest,p]=await Promise.all([ensureCity(db,telegramId,now),readProfile(telegramId,'world-result')]);
  const latestCity=cityFromRow(latest,walletFromProfile(p),catalog);
  return buildView(latestCity,Number(latest.revision),paymentsEnabled(env),{
    operation:{id:requestId,kind:action.kind,state:'completed',repeated:false},cost,
    residentRequests:await residentEnvelope(db,env,telegramId,latestCity,catalog),
    ...(credit?{reward:{...reward}}:{})
  },economy);
}

async function observedWorldResponse(response,env,path){
  // Story and community modules return Response on errors rather than throwing.
  // Preserve those responses byte-for-byte; telemetry never changes their result.
  if(response?.status===200&&path==='/api/world/community/contribute'){
    try{const data=await response.clone().json();if(data?.repeated===true)await recordWorldControlRetry(env?.DB,{area:'fund'});}catch{}
  }
  if(response?.status===409||response?.status>=500){
    let code='WORLD_RESPONSE_ERROR';
    try{const body=await response.clone().json();if(typeof body?.code==='string')code=body.code;}catch{}
    try{await recordWorldControlError(env?.DB,{path,status:response.status,code});}catch{}
  }
  return response;
}

// auth and economy methods are injected by the existing Worker; never create a
// second Telegram verification or a parallel player-wallet implementation.
export async function handleZeffiWorldApi(request,env,dependencies){
  try{
    // Release Candidate: one emergency switch gates *all* World routes,
    // including the shared story and community fund. The explicit Telegram
    // allowlist below still gates every operation after signed authentication.
    if(!worldEnabled(env))failure(403,'WORLD_DISABLED','Мир Зеффи временно недоступен.');
    const isCommunityRequest=new URL(request.url).pathname.startsWith('/api/world/community/');
    if(request.method!=='POST')failure(405,'METHOD_NOT_ALLOWED','Используйте POST.');
    const text=await request.text();
    if(text.length>MAX_REQUEST_LENGTH)failure(413,'WORLD_REQUEST_TOO_LARGE','Слишком большой запрос.');
    let body;
    try{body=JSON.parse(text);}catch{failure(400,'BAD_JSON','Некорректный JSON.');}
    const auth=await dependencies.resolvePlayerAuth(request,body,env);
    const telegramId=String(auth?.telegramId||auth?.user?.id||'');
    if(!/^\d{4,20}$/.test(telegramId))failure(401,'WORLD_UNAUTHORIZED','Авторизация Telegram не подтверждена.');
    env=await assertTester(env,telegramId);
    // Story-world v1: read-only access gate. NO city, profile, wallet or project writes.
    if(new URL(request.url).pathname==='/api/world/story-access'){
      if(env?.WORLD_STORY_ENABLED!=null&&String(env.WORLD_STORY_ENABLED).toLowerCase()!=='true')failure(403,'STORY_DISABLED','Общий город временно недоступен.');
      return reply({ok:true,access:'tester',version:'story-rc2',mode:'server-story',globalSync:true,walletWrites:false});
    }
    // Tutorial progress is private to the signed, allowlisted user; no wallet writes.
    if(new URL(request.url).pathname==='/api/world/tutorial'){
      if(!env.DB)failure(503,'WORLD_DB_UNAVAILABLE','База мира временно недоступна.');
      if(body.op==='read')return reply({ok:true,tutorial:await readWorldTutorial(env.DB,telegramId)});
      if(body.op==='progress'){
        const tutorial=await writeWorldTutorial(env.DB,telegramId,body.mode,body.step);
        return reply({ok:true,tutorial});
      }
      failure(400,'WORLD_TUTORIAL_ACTION','Неизвестная операция обучения.');
    }
    // Story chapters, visits, events and district unlocks are D1-authoritative.
    // The signed Telegram and closed RC allowlist gates run before this branch.
    if(new URL(request.url).pathname==='/api/world/story/progress'){
      return observedWorldResponse(await handleZeffiStory({db:env.DB,env,telegramId,body}),env,new URL(request.url).pathname);
    }
    // Zeffi shared fund v1: independent signed community endpoints.
    // Authentication + WORLD_TESTER_IDS have already been checked above.
    // This does NOT turn on personal-city routes or bypass wallet restrictions.
    if(isCommunityRequest){
      const profileReader=(id,actor)=>dependencies.ensureAuthoritativeProfileRow(env,id,actor);
      const opGate=(id,capabilities)=>dependencies.requirePlayerOperationAvailable(env,id,{capabilities,featureFlags:capabilities.includes('purchases')?['shop']:[]});
      return observedWorldResponse(await handleCommunityFund({db:env.DB,env,telegramId,pathname:new URL(request.url).pathname,body,profileReader,operationGate:opGate}),env,new URL(request.url).pathname);
    }
    if(!env.DB)failure(503,'WORLD_DB_UNAVAILABLE','Основная D1 сейчас недоступна.');
    await assertSchema(env.DB);
    const profileReader=(id,actor)=>dependencies.ensureAuthoritativeProfileRow(env,id,actor);
    const opGate=(id,capabilities)=>dependencies.requirePlayerOperationAvailable(env,id,{capabilities,featureFlags:capabilities.includes('purchases')?['shop']:[]});
    const pathname=new URL(request.url).pathname;
    if(pathname==='/api/world/state'){
      await opGate(telegramId,[]);
      const economy=await publishedWorldEconomy(env.DB);
      const [row,profile]=await Promise.all([ensureCity(env.DB,telegramId,Date.now()),profileReader(telegramId,'world-state')]);
      // One read in the existing world/state response; no separate onboarding startup call.
      // Missing optional tutorial migration must never prevent opening an existing city.
      const tutorial=await readWorldTutorial(env.DB,telegramId).catch(()=>null);
      const city=cityFromRow(row,walletFromProfile(profile),economy.catalog);
      return reply(buildView(city,Number(row.revision),paymentsEnabled(env),{tutorial,residentRequests:await residentEnvelope(env.DB,env,telegramId,city,economy.catalog),...await readWorldExtras(env.DB,telegramId,city,economy.catalog)},economy));
    }
    if(pathname==='/api/world/resident/claim'){
      if(!residentsEnabled(env))failure(403,'RESIDENT_REQUESTS_DISABLED','Просьбы жителей временно недоступны.');
      try{await env.DB.prepare('SELECT request_id FROM zeffi_world_resident_requests LIMIT 1').all();}
      catch{failure(503,'RESIDENT_SCHEMA_NOT_READY','Просьбы жителей пока недоступны. Прогресс города сохранён.');}
      const result=await claimResidentRequest({db:env.DB,telegramId,
        requestId:body.residentRequestId,claimRequestId:body.requestId,
        readProfile:profileReader,operationGate:opGate});
      if(result.status!==200)return reply({ok:false,code:result.code,error:result.error},result.status);
      const [row,profile]=await Promise.all([ensureCity(env.DB,telegramId,Date.now()),profileReader(telegramId,'resident-claim:state')]);
      const economy=await publishedWorldEconomy(env.DB);
      const city=cityFromRow(row,walletFromProfile(profile),economy.catalog);
      if(result.repeated)await recordWorldControlRetry(env.DB,{area:'residents'});
      return reply({ok:true,claimed:true,repeated:result.repeated,reward:result.reward,
        residentRequests:await residentEnvelope(env.DB,env,telegramId,city,economy.catalog),
        wallet:walletFromProfile(profile),economy:economy.config});
    }
    if(pathname==='/api/world/chapter/claim'){
      await opGate(telegramId,[]);
      const chapterId=String(body.chapterId||'').trim();
      const economy=await publishedWorldEconomy(env.DB);
      const row=await ensureCity(env.DB,telegramId,Date.now());
      const profile=await profileReader(telegramId,'world-chapter-claim');
      const city=cityFromRow(row,walletFromProfile(profile),economy.catalog);
      let result;
      try{result=await claimCityChapter(env.DB,telegramId,city,economy.catalog,Number(row.revision),chapterId);}
      catch(error){if(error.code==='WORLD_DECOR_SCHEMA_NOT_READY')failure(503,error.code,error.message);if(error.status)failure(error.status,error.code||'WORLD_CHAPTER_ERROR',error.message);throw error;}
      return reply({ok:true,claimed:true,repeated:result.repeated,reward:{kind:'world_decor',id:result.reward,amount:1},...await readWorldExtras(env.DB,telegramId,city,economy.catalog)});
    }
    if(pathname==='/api/world/mutate'){
      const economy=await publishedWorldEconomy(env.DB);
      const result=await handleMutation(env.DB,env,telegramId,body,profileReader,opGate,economy);
      if(result.repeated)await recordWorldControlRetry(env.DB,{area:'personal'});
      return reply({...result,...await readWorldExtras(env.DB,telegramId,result.city,economy.catalog)});
    }
    failure(404,'WORLD_ROUTE_NOT_FOUND','Неизвестный маршрут «Мира Зеффи».');
  }catch(error){
    const status=error instanceof WorldError?error.status:Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
    const code=error instanceof WorldError?error.code:status===500?'WORLD_SERVER_ERROR':'WORLD_ACCESS_DENIED';
    // Aggregate only 409/5xx diagnostics, never Telegram initData or request bodies.
    // Failure to write telemetry must NEVER affect the original response.
    try{await recordWorldControlError(env?.DB,{path:new URL(request.url).pathname,status,code});}catch{}
    if(error instanceof WorldError)return reply({ok:false,code:error.code,error:error.message},error.status);
    if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)return reply({ok:false,code:'WORLD_ACCESS_DENIED',error:String(error.message||'Доступ запрещён.')},error.status);
    console.error('Zeffi World operation failed',error);
    return reply({ok:false,code:'WORLD_SERVER_ERROR',error:'Не удалось обработать операцию города.'},500);
  }
}
