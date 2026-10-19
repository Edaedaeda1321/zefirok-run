#!/usr/bin/env node
// Regression contract for Control Center direct grants and compensation XP.
// Run: node --no-warnings --experimental-sqlite scripts/check-cc-player-profile-xp.mjs
// No live credentials, network calls, or production DB access.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

const worker = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const owner = fs.readFileSync(new URL('../owner.html', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const checks=[];
const verify=(name, predicate)=>{assert.ok(predicate,name);checks.push(name);};
const block=(from,to)=>{
  const start=worker.indexOf(from),end=worker.indexOf(to,start+from.length);
  assert.ok(start!==-1&&end>start,`missing function block ${from}`);
  return worker.slice(start,end);
};

verify('direct UI has player XP distinct from season XP',owner.includes('<option value="profile_xp">⭐ XP игрового уровня (+ к текущему)</option>')&&owner.includes('<option value="season_pass_xp">XP пропуска'));
verify('compensation UI has profile XP type and preview title',owner.includes("${option('profile_xp','⭐ XP игрового уровня (+ к текущему)')}")&&owner.includes("if(kind==='profile_xp')return'XP игрового уровня (+ к текущему)'"));
verify('UI direct cap and validation',owner.includes("kind==='profile_xp')amount.max='5000000'")&&owner.includes("Number.isSafeInteger(amount)"));
verify('live XP confirmation uses human-readable award name',owner.includes("const kindLabel=payload.kind==='profile_xp'?'XP игрового уровня':payload.kind")&&owner.includes('${kindLabel}${payload.itemId?'));
verify('mail gift XP displays XP art',index.includes('kind === &quot;profile_xp&quot; || kind === &quot;season_pass_xp&quot;'));
verify('reward queue profile XP path remains atomic',worker.includes('reward_delivery_effects(queue_id,telegram_id,reward_kind')&&worker.includes('profile_xp=')&&worker.includes('profile_xp: "profile_xp"'));
verify('claiming XP causes client profile refresh for gifts and mail',
  (worker.match(/const profileRefreshRequired\s*=\s*\[\.\.\.rewardKinds\][^\n]*"profile_xp"[^\n]*\.includes\(kind\)/g)||[]).length===2);
verify('high-impact XP compensation requires existing protected path',worker.includes('["season_pass_xp_grant","profile_xp"].includes(kind)&&amount>=1000'));
verify('direct grant receipt is in same batch as economic UPDATE',worker.includes('await ownerGrantCommit(env,ctx,[')&&worker.includes('profile_xp=MIN(999999999,profile_xp+?)'));

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE admin_profile_state (telegram_id TEXT PRIMARY KEY, profile_xp INTEGER NOT NULL DEFAULT 0, profile_xp_override INTEGER, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, updated_by TEXT NOT NULL DEFAULT '');
  CREATE TABLE player_account_revisions (telegram_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE owner_grant_operations (operation_id TEXT PRIMARY KEY, actor_telegram_id TEXT NOT NULL, telegram_id TEXT NOT NULL, request_id TEXT NOT NULL, payload_json TEXT NOT NULL, result_json TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(actor_telegram_id, request_id));
  INSERT INTO admin_profile_state(telegram_id,profile_xp,profile_xp_override) VALUES('100001',10,100);
  INSERT INTO player_account_revisions(telegram_id,revision) VALUES('100001',0);
`);
class D1Statement {
  constructor(sql){this.sql=sql;this.args=[];}
  bind(...args){this.args=args;return this;}
  run(){const result=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(result.changes||0),last_row_id:Number(result.lastInsertRowid||0)}};}
  async first(){return db.prepare(this.sql).get(...this.args)||null;}
  async all(){return {results:db.prepare(this.sql).all(...this.args)};}
}
const env={DB:{prepare:(sql)=>new D1Statement(sql),batch:async(statements)=>{
  db.exec('BEGIN IMMEDIATE');
  try{const result=statements.map(s=>s.run());db.exec('COMMIT');return result;}
  catch(e){db.exec('ROLLBACK');throw e;}
}}};
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
let foldCalls=0,staffLogs=0,timelineWrites=0;
const runtime={
  ApiError,Date,Number,String,Math,JSON,Set,Map,Error,console,
  safeJson:(value,fallback={})=>{try{return JSON.parse(value);}catch{return fallback;}},
  safeRewardDescription:(reward)=>reward.kind==='profile_xp'?`+${reward.amount} XP профиля`:'mock reward',
  ensurePlayerAccountRevisionAvailable:async()=>{},
  ensureAuthoritativeProfileRow:async()=>{
    foldCalls++;
    db.prepare('UPDATE admin_profile_state SET profile_xp=COALESCE(profile_xp_override,profile_xp),profile_xp_override=NULL WHERE telegram_id=? AND profile_xp_override IS NOT NULL').run('100001');
  },
  bumpPlayerAccountRevisionStatement:(_env,id)=>env.DB.prepare('UPDATE player_account_revisions SET revision=revision+1 WHERE telegram_id=?').bind(id),
  recordPlayerTimeline:async()=>{timelineWrites++;},
  logStaffAction:async()=>{staffLogs++;},
  grantCatalogItems:()=>[],
  ownerGrantableSeasonalCaseCatalog:async()=>[],
  ACHIEVEMENT_SHOWCASE_STYLES:[],
  runBoosterCatalogItems:()=>[],
  runBoosterDefinition:()=>null,
  achievementShowcaseDirectGrantStyleDefinition:()=>null
};
vm.createContext(runtime);
vm.runInContext([
  block('function normalizePlayerGiftRewards(input)', 'function playerGiftRewardView('),
  block('function ownerPanelInteger(value,', 'const OWNER_PANEL_SESSION_TTL_SECONDS'),
  block('async function ownerV85NormalizeCustomCompensationRewards(env,input)', 'async function ownerPanelV85Compensations('),
  block('function ownerGrantRequestId(body)', 'async function ownerPanelGrantDirectReward('),
  block('async function ownerPanelGrantDirectReward(', 'async function ownerPanelGrantPlayerOnce('),
  block('async function ownerPanelGrantPlayerOnce(', 'function ownerPanelRatingSeasonView(')
].join('\n'),runtime);

const normalize=vm.runInContext('normalizePlayerGiftRewards',runtime);
const normalized=JSON.parse(JSON.stringify(normalize([{kind:'profile_xp',amount:150,id:''},{kind:'profile_xp',amount:50,id:''}])));
verify('gift bundle retains profile XP with additive merge',normalized.length===1&&normalized[0].kind==='profile_xp'&&normalized[0].amount===200&&normalized[0].id==='');
const validate=vm.runInContext('ownerV85NormalizeCustomCompensationRewards',runtime);
const comp=JSON.parse(JSON.stringify(await validate(env,[{kind:'profile_xp',id:'',amount:200}])));
verify('compensation accepts season-independent profile XP',comp.length===1&&comp[0].kind==='profile_xp'&&comp[0].amount===200);
for(const value of [0,-5,5000001,1.5,Infinity,'bad']){
  await assert.rejects(validate(env,[{kind:'profile_xp',amount:value}]),e=>e.status===400,`invalid compensation amount ${value}`);
}
checks.push('invalid compensation amounts rejected before sending');
await assert.rejects(validate(env,[{kind:'profile_xp',amount:3000000},{kind:'profile_xp',amount:2500000}]),e=>e.status===400);
checks.push('duplicate compensation XP rows cannot silently exceed 5M');

const grant=vm.runInContext('ownerPanelGrantPlayer',runtime);
const operation={telegramId:'100001',kind:'profile_xp',itemId:'',amount:60,seasonId:'',reason:'Регрессия XP',requestId:'cc_xp_20261020_unique_01'};
const ctx={body:operation,user:{id:'7007'},access:{owner:true}};
const first=await grant(env,ctx);
verify('direct grant has confirmed durable receipt',first.ok&&first.confirmed&&first.grantType==='direct');
const xpNow=Number(db.prepare('SELECT profile_xp FROM admin_profile_state WHERE telegram_id=?').get('100001').profile_xp);
verify('direct grant folds old profile override then adds XP',xpNow===160&&foldCalls===1);
verify('direct grant invalidates account revision',Number(db.prepare("SELECT revision FROM player_account_revisions WHERE telegram_id='100001'").get().revision)===1);
verify('audit and timeline are recorded once',staffLogs===1&&timelineWrites===1);
const again=await grant(env,ctx);
verify('replaying same request is idempotent',again.repeated===true&&Number(db.prepare("SELECT profile_xp FROM admin_profile_state WHERE telegram_id='100001'").get().profile_xp)===160);
verify('same request cannot change reward payload',await grant(env,{...ctx,body:{...operation,amount:90}}).then(()=>false,e=>e.status===409));
for(const value of [0,-1,1.5,5000001]){
  const body={...operation,requestId:`cc_xp_invalid_${String(value).replace('.','p')}_2026`,amount:value};
  await assert.rejects(grant(env,{...ctx,body}),e=>e.status===400,`invalid direct amount ${value}`);
}
checks.push('direct grant rejects invalid amounts');
verify('invalid operations create no new receipts',Number(db.prepare('SELECT COUNT(*) AS n FROM owner_grant_operations').get().n)===1);
db.prepare("UPDATE admin_profile_state SET profile_xp=999999995 WHERE telegram_id='100001'").run();
const capRequest={...operation,requestId:'cc_xp_20261020_cap_999m_01',amount:10};
const capResult=await grant(env,{...ctx,body:capRequest});
verify('profile XP is capped at 999999999 to preserve level engine range',capResult.confirmed&&Number(db.prepare("SELECT profile_xp FROM admin_profile_state WHERE telegram_id='100001'").get().profile_xp)===999999999);
const directXpSection=worker.slice(worker.indexOf('} else if (kind === "profile_xp") {'),worker.indexOf("} else if(kind==='streak_protection')"));
verify('season pass XP remains unchanged (no season pass SQL used)',directXpSection.includes('ownerGrantCommit')&&!directXpSection.includes('season_pass_players'));

for(const name of checks)console.log(`PASS ${name}`);
console.log(`CC profile XP checks PASSED: ${checks.length} tests/invariants.`);
