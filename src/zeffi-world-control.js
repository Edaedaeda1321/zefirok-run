// Mir Zeffi P0: server-side release gates and non-sensitive aggregate error counters.
// This module never authenticates a user. The existing Worker verifies Telegram first.
export const WORLD_CONTROL_MODES = Object.freeze(['off','testers','percentage','all']);
export const WORLD_CONTROL_FLAGS = Object.freeze(['allow_purchases','allow_story','allow_fund','allow_contributions','allow_residents']);
const DEFAULT = Object.freeze({revision:0,release_mode:'testers',rollout_percent:0,allow_purchases:1,allow_story:1,
  allow_fund:1,allow_contributions:1,allow_residents:1,last_request_id:'',updated_by:'',updated_at:0});
const safeId = v => /^\d{4,20}$/.test(String(v||''));
const enabled = v => String(v??'').toLowerCase()==='true';
const originalEnabled = (v,defaultOn=false) => v==null ? defaultOn : enabled(v);
const legacyTesters = env => new Set(String(env?.WORLD_TESTER_IDS||'').split(',').map(v=>v.trim()).filter(safeId));
const schemaMissing = e => /no such table:\s*zeffi_world_control\b/i.test(String(e?.message||e));

export async function readWorldControl(db,{allowLegacy=true}={}) {
  if(!db||typeof db.prepare!=='function'){
    if(allowLegacy)return {...DEFAULT,schemaReady:false};
    throw Object.assign(new Error('WORLD_CONTROL_DB_UNAVAILABLE'),{status:503});
  }
  try{
    const statement=db.prepare('SELECT * FROM zeffi_world_control WHERE id=1');
    const row=await (typeof statement.first==='function'?statement.first():statement.bind().first());
    if(!row)throw Object.assign(new Error('WORLD_CONTROL_MISSING_ROW'),{status:503});
    const c={...DEFAULT,...row};
    if(!WORLD_CONTROL_MODES.includes(c.release_mode)||!Number.isSafeInteger(Number(c.revision))||Number(c.revision)<0||
      !Number.isInteger(Number(c.rollout_percent))||Number(c.rollout_percent)<0||Number(c.rollout_percent)>100||
      WORLD_CONTROL_FLAGS.some(flag=>![0,1].includes(Number(c[flag]))))
      throw Object.assign(new Error('WORLD_CONTROL_INVALID_STATE'),{status:503});
    for(const key of ['revision','rollout_percent',...WORLD_CONTROL_FLAGS,'updated_at'])c[key]=Number(c[key]||0);
    return {...c,schemaReady:true};
  }catch(e){
    if(allowLegacy&&schemaMissing(e))return {...DEFAULT,schemaReady:false};
    throw Object.assign(new Error('WORLD_CONTROL_STATE_UNAVAILABLE'),{status:503});
  }
}
// Stable non-cryptographic bucket is ONLY a rollout chooser, never an authentication primitive.
export function worldRolloutBucket(id){
  const s=String(id||'');let hash=2166136261;
  for(let i=0;i<s.length;i++)hash=Math.imul(hash^s.charCodeAt(i),16777619)>>>0;
  return hash%100;
}

export async function worldAccessPolicy(env,telegramId){
  if(!safeId(telegramId))return {allowed:false,reason:'WORLD_UNAUTHORIZED',effectiveEnv:env};
  const settings=await readWorldControl(env?.DB);
  if(settings.release_mode==='off')return {allowed:false,reason:'WORLD_NOT_AVAILABLE',settings,effectiveEnv:env};
  const inLegacy=legacyTesters(env).has(String(telegramId));
  let tester=inLegacy;
  // This query is needed only when the admin-managed tester list may expand access.
  const inRollout=settings.release_mode==='all'||
    (settings.release_mode==='percentage'&&settings.rollout_percent>worldRolloutBucket(telegramId));
  if(!tester&&!inRollout&&settings.schemaReady){
    const row=await env.DB.prepare('SELECT telegram_id FROM zeffi_world_control_testers WHERE telegram_id=? LIMIT 1').bind(String(telegramId)).first();
    tester=Boolean(row);
  }
  const allowed=tester||inRollout;
  const restrictive=(flag,worldFlag,defaultOn=false)=>originalEnabled(env?.[worldFlag],defaultOn)&&Boolean(settings[flag]);
  const effectiveEnv={...env,
    WORLD_PURCHASES_ENABLED:restrictive('allow_purchases','WORLD_PURCHASES_ENABLED'),
    WORLD_STORY_ENABLED:restrictive('allow_story','WORLD_STORY_ENABLED',true),
    WORLD_COMMUNITY_FUND_ENABLED:restrictive('allow_fund','WORLD_COMMUNITY_FUND_ENABLED'),
    WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:restrictive('allow_contributions','WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED'),
    WORLD_RESIDENT_REQUESTS_ENABLED:restrictive('allow_residents','WORLD_RESIDENT_REQUESTS_ENABLED',true)};
  return {allowed,reason:allowed?'':'WORLD_NOT_AVAILABLE',tester,settings,effectiveEnv};
}

// Error recording is deliberately fail-soft and never participates in an economic transaction.
export async function recordWorldControlError(db,{path='',status=500,code='WORLD_SERVER_ERROR'}={}){
  if(!db||status!==409&&status<500||status>599)return false;
  const area=String(path).startsWith('/api/world/community/')?'fund':String(path).includes('/story/')?'story':
    String(path).includes('/resident/')?'residents':String(path).includes('/tutorial')?'tutorial':'personal';
  const cleanCode=/^[A-Z0-9_]{1,65}$/.test(String(code))?String(code):'UNEXPECTED';
  const now=Math.floor(Date.now()/1000),hour=Math.floor(now/3600)*3600;
  try{
    await db.prepare(`INSERT INTO zeffi_world_control_errors(hour_start,area,status,code,occurrences,last_at)
      VALUES (?,?,?,?,1,?) ON CONFLICT(hour_start,area,status,code)
      DO UPDATE SET occurrences=occurrences+1,last_at=excluded.last_at`).bind(hour,area,status,cleanCode,now).run();
    return true;
  }catch{return false;}
}

// Retry telemetry is non-financial and intentionally independent of wallet transactions.
export async function recordWorldControlRetry(db,{area='personal'}={}){
  if(!db||!['personal','fund','residents'].includes(area))return false;
  const now=Math.floor(Date.now()/1000),hour=Math.floor(now/3600)*3600;
  try{
    await db.prepare(`INSERT INTO zeffi_world_control_retries(hour_start,area,occurrences,last_at)
      VALUES (?,?,1,?) ON CONFLICT(hour_start,area) DO UPDATE
      SET occurrences=occurrences+1,last_at=excluded.last_at`).bind(hour,area,now).run();
    return true;
  }catch{return false;}
}

export function effectiveWorldControlFlags(env,settings){
  const lookup=[['Покупки','WORLD_PURCHASES_ENABLED','allow_purchases',false],
    ['Общий город','WORLD_STORY_ENABLED','allow_story',true],
    ['Общий фонд','WORLD_COMMUNITY_FUND_ENABLED','allow_fund',false],
    ['Взносы','WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED','allow_contributions',false],
    ['Просьбы жителей','WORLD_RESIDENT_REQUESTS_ENABLED','allow_residents',true]];
  return lookup.map(([title,envKey,flag,fallback])=>({flag,title,
    envEnabled:originalEnabled(env?.[envKey],fallback),allowed:Boolean(settings[flag]),
    effective:originalEnabled(env?.[envKey],fallback)&&Boolean(settings[flag])}));
}
