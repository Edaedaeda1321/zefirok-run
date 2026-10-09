// Мир Зеффи: isolated server-authoritative commands within the EXISTING DB binding.
// No runtime DDL, no trusted client balances/snapshots and no extra D1 database.
// Tables are provisioned only by migrations/0114_zeffi_world.sql.
import {
  makeInitialCity, sanitizeCity, addObject, moveObject, storeObject, restoreObject,
  applyRoadStroke, buyParcel, skipConstruction, cityStats, BuildError
} from '../world/engine.js';
import { CATALOG } from '../world/catalog.js';

const ZERO = Object.freeze({points:0,treats:0,coffee:0});
const MAX_CITY_JSON = 180_000;
const MAX_REQUEST_LENGTH = 20_000;
const WORLD_ACTIONS = new Set(['place','move','store','restore','road','erase-road','parcel','skip']);
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

function assertTester(env,telegramId){
  // Explicit allowlist, never trust URL flags or a Telegram username.
  const ids=String(env?.WORLD_TESTER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!ids.includes(String(telegramId)))failure(403,'WORLD_NOT_AVAILABLE','Мир Зеффи пока доступен только тестировщикам.');
}
function cityFromRow(row,wallet){
  let saved;
  try {saved=JSON.parse(row.state_json);}catch{failure(503,'WORLD_STATE_UNAVAILABLE','Сохранение города повреждено; сервер не будет его перезаписывать.');}
  try {const city=sanitizeCity(saved,CATALOG);city.wallet={...wallet};return city;}
  catch{failure(503,'WORLD_STATE_UNAVAILABLE','Сохранение города не прошло проверку.');}
}
function canonicalAction(body){
  if(!body||typeof body!=='object'||Array.isArray(body))failure(400,'BAD_ACTION','Некорректная команда.');
  const kind=String(body.kind||'');
  if(!WORLD_ACTIONS.has(kind))failure(400,'BAD_ACTION','Операция не поддерживается.');
  const args=body.args;
  if(!args||typeof args!=='object'||Array.isArray(args))failure(400,'BAD_ACTION','Аргументы операции не переданы.');
  const result={kind};
  if(kind==='place'){
    if(!/^[a-z0-9_-]{1,64}$/.test(String(args.objectKind||'')))failure(400,'BAD_ACTION','Некорректный объект.');
    result.objectKind=String(args.objectKind);
  }
  if(['place','move','restore'].includes(kind)){
    if(!coordinate(args.x)||!coordinate(args.y)||!Number.isInteger(args.rotation)||args.rotation<0||args.rotation>3)failure(400,'BAD_ACTION','Некорректные координаты или поворот.');
    Object.assign(result,{x:args.x,y:args.y,rotation:args.rotation});
  }
  if(['move','restore','store','skip'].includes(kind)){
    if(!/^obj-[1-9]\d{0,9}$/.test(String(args.uid||'')))failure(400,'BAD_ACTION','Некорректная постройка.');
    result.uid=String(args.uid);
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
function operate(city,action,now){
  switch(action.kind){
    case 'place':return addObject(city,CATALOG,action.objectKind,action.x,action.y,action.rotation,now);
    case 'move':return moveObject(city,CATALOG,action.uid,action.x,action.y,action.rotation);
    case 'store':return storeObject(city,action.uid);
    case 'restore':return restoreObject(city,CATALOG,action.uid,action.x,action.y,action.rotation);
    case 'road':return applyRoadStroke(city,CATALOG,action.positions);
    case 'erase-road':return applyRoadStroke(city,CATALOG,action.positions,{erasing:true});
    case 'parcel':return buyParcel(city,action.cx,action.cy);
    case 'skip':return skipConstruction(city,action.uid,now).city;
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
function buildView(city,revision,enabled,more={}){return {ok:true,revision,city,stats:cityStats(city,CATALOG),serverAuthoritative:true,purchasesEnabled:enabled,...more};}
async function handleMutation(db,env,telegramId,body,readProfile,operationGate){
  const requestId=String(body.requestId||'');
  if(!validRequestId(requestId))failure(400,'REQUEST_ID_REQUIRED','Для операции нужен уникальный requestId (12–90 символов).');
  if(!natural(body.expectedRevision))failure(400,'REVISION_REQUIRED','Нужна версия города для защиты от конфликтов.');
  const prior=await findReceipt(db,telegramId,requestId);
  if(prior){
    const [row,profile]=await Promise.all([ensureCity(db,telegramId,Date.now()),readProfile(telegramId,'world-retry')]);
    return buildView(cityFromRow(row,walletFromProfile(profile)),Number(row.revision),paymentsEnabled(env),{repeated:true,operation:{id:requestId,kind:prior.action_kind,state:'completed',repeated:true},cost:{points:Number(prior.cost_points),treats:Number(prior.cost_treats),coffee:Number(prior.cost_coffee)}});
  }
  const action=canonicalAction(body.action);
  await operationGate(telegramId,[]);
  const now=Date.now(), nowSeconds=Math.floor(now/1000);
  const row=await ensureCity(db,telegramId,now);
  const currentRevision=Number(row.revision);
  if(currentRevision!==body.expectedRevision)failure(409,'WORLD_REVISION_CONFLICT','Город обновлён в другом окне. Перезагрузите состояние.');
  const profile=await readProfile(telegramId,`world:${action.kind}:precheck`);
  const profileRevision=Number(profile?.revision||0);
  if(!natural(profileRevision))failure(503,'WORLD_PROFILE_NOT_READY','Баланс игрока ещё недоступен.');
  const wallet=walletFromProfile(profile);
  const before=cityFromRow(row,wallet);
  let next;
  try {next=operate(before,action,now);}catch(e){if(e instanceof BuildError)failure(e.code==='INSUFFICIENT_BALANCE'?409:400,e.code,e.code);throw e;}
  const cost=priceDifference(wallet,next.wallet);
  if(persistedCity(before)===persistedCity(next))failure(409,'WORLD_NO_CHANGES','Нет изменений для сохранения.');
  if(!quotedPriceMatches(body.expectedPrice,cost))failure(409,'WORLD_PRICE_CHANGED','Цена изменилась. Подтвердите её повторно.');
  const bill=cost.points>0||cost.treats>0||cost.coffee>0;
  if(bill){
    if(!paymentsEnabled(env))failure(403,'WORLD_PURCHASES_DISABLED','Серверные покупки пока закрыты. Балансы не списаны.');
    await operationGate(telegramId,['purchases']);
  }
  const nextCityJson=persistedCity(next);
  if(nextCityJson.length>MAX_CITY_JSON)failure(409,'WORLD_SIZE_LIMIT','Город достиг ограничения размера сохранения.');
  const nextRevision=currentRevision+1;
  const marker=`zeffi-world:${requestId}`;
  // Cloudflare D1 batch is a single transaction. An operation receipt with
  // CHECK guards *forces rollback* if either optimistic UPDATE touched no row.
  // Thus a successful receipt implies both city state and wallet charge committed.
  const statements=[db.prepare(`UPDATE zeffi_world_cities SET state_json=?,revision=revision+1,last_request_id=?,updated_at=?
    WHERE telegram_id=? AND revision=?`).bind(nextCityJson,requestId,now,telegramId,currentRevision)];
  if(bill){statements.push(db.prepare(`UPDATE admin_profile_state SET wallet=wallet-?,treats=treats-?,coffee=coffee-?,revision=revision+1,updated_at=?,updated_by=?
    WHERE telegram_id=? AND revision=? AND wallet>=? AND treats>=? AND coffee>=?`).bind(
      cost.points,cost.treats,cost.coffee,nowSeconds,marker,telegramId,profileRevision,cost.points,cost.treats,cost.coffee));}
  statements.push(db.prepare(`INSERT INTO zeffi_world_operations
   (telegram_id,request_id,action_kind,city_revision,cost_points,cost_treats,cost_coffee,created_at,city_guard,profile_guard)
   VALUES (?,?,?,?,?,?,?,?,
     CASE WHEN EXISTS (SELECT 1 FROM zeffi_world_cities WHERE telegram_id=? AND revision=? AND last_request_id=?) THEN 1 ELSE 0 END,
     CASE WHEN ?=0 OR EXISTS (SELECT 1 FROM admin_profile_state WHERE telegram_id=? AND revision=? AND updated_by=?) THEN 1 ELSE 0 END)`)
    .bind(telegramId,requestId,action.kind,nextRevision,cost.points,cost.treats,cost.coffee,nowSeconds,
      telegramId,nextRevision,requestId,bill?1:0,telegramId,profileRevision+1,marker));
  try{await db.batch(statements);}catch(error){
    const existing=await findReceipt(db,telegramId,requestId).catch(()=>null);
    if(existing){
      const [latest,p]=await Promise.all([ensureCity(db,telegramId,now),readProfile(telegramId,'world-race-retry')]);
      return buildView(cityFromRow(latest,walletFromProfile(p)),Number(latest.revision),paymentsEnabled(env),{repeated:true,operation:{id:requestId,kind:existing.action_kind,state:'completed',repeated:true}});
    }
    // A CAS change, concurrent wallet mutation or SQLite CHECK failure can
    // legitimately abort the transaction; do not retry with a new request ID.
    failure(409,'WORLD_STATE_CONFLICT','Баланс или город изменился одновременно. Обновите город перед повтором.');
  }
  const [latest,p]=await Promise.all([ensureCity(db,telegramId,now),readProfile(telegramId,'world-result')]);
  return buildView(cityFromRow(latest,walletFromProfile(p)),Number(latest.revision),paymentsEnabled(env),{
    operation:{id:requestId,kind:action.kind,state:'completed',repeated:false},cost
  });
}

// auth and economy methods are injected by the existing Worker; never create a
// second Telegram verification or a parallel player-wallet implementation.
export async function handleZeffiWorldApi(request,env,dependencies){
  try{
    if(!worldEnabled(env))failure(403,'WORLD_DISABLED','Мир Зеффи пока не включён на сервере.');
    if(request.method!=='POST')failure(405,'METHOD_NOT_ALLOWED','Используйте POST.');
    const text=await request.text();
    if(text.length>MAX_REQUEST_LENGTH)failure(413,'WORLD_REQUEST_TOO_LARGE','Слишком большой запрос.');
    let body;
    try{body=JSON.parse(text);}catch{failure(400,'BAD_JSON','Некорректный JSON.');}
    const auth=await dependencies.resolvePlayerAuth(request,body,env);
    const telegramId=String(auth?.telegramId||auth?.user?.id||'');
    if(!/^\d{4,20}$/.test(telegramId))failure(401,'WORLD_UNAUTHORIZED','Авторизация Telegram не подтверждена.');
    assertTester(env,telegramId);
    if(!env.DB)failure(503,'WORLD_DB_UNAVAILABLE','Основная D1 сейчас недоступна.');
    await assertSchema(env.DB);
    const profileReader=(id,actor)=>dependencies.ensureAuthoritativeProfileRow(env,id,actor);
    const opGate=(id,capabilities)=>dependencies.requirePlayerOperationAvailable(env,id,{capabilities,featureFlags:capabilities.includes('purchases')?['shop']:[]});
    const pathname=new URL(request.url).pathname;
    if(pathname==='/api/world/state'){
      await opGate(telegramId,[]);
      const [row,profile]=await Promise.all([ensureCity(env.DB,telegramId,Date.now()),profileReader(telegramId,'world-state')]);
      return reply(buildView(cityFromRow(row,walletFromProfile(profile)),Number(row.revision),paymentsEnabled(env)));
    }
    if(pathname==='/api/world/mutate'){
      const result=await handleMutation(env.DB,env,telegramId,body,profileReader,opGate);
      return reply(result);
    }
    failure(404,'WORLD_ROUTE_NOT_FOUND','Неизвестный маршрут «Мира Зеффи».');
  }catch(error){
    if(error instanceof WorldError)return reply({ok:false,code:error.code,error:error.message},error.status);
    if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)return reply({ok:false,code:'WORLD_ACCESS_DENIED',error:String(error.message||'Доступ запрещён.')},error.status);
    console.error('Zeffi World operation failed',error);
    return reply({ok:false,code:'WORLD_SERVER_ERROR',error:'Не удалось обработать операцию города.'},500);
  }
}
