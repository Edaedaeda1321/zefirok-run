import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleCommunityFund,COMMUNITY_PROJECTS,GARDEN_DAILY_LIMIT} from '../../src/zeffi-community-fund.js';
const migration=n=>readFileSync(new URL(`../../migrations/${n}`,import.meta.url),'utf8');
const day=()=>Math.floor(Date.now()/86400000)*86400;
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL CHECK(wallet>=0),revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER,updated_by TEXT);');
 db.exec(migration('0115_zeffi_community_fund.sql'));
 db.exec(migration('0118_zeffi_story_progression.sql'));
 db.exec(migration('0127_zeffi_garden_community_launch.sql'));
 for(const [id,wallet] of [['12345678',70_000_000],['87654321',70_000_000]])db.prepare("INSERT INTO admin_profile_state(telegram_id,wallet,revision,updated_at,updated_by) VALUES (?,?,0,0,'')").run(id,wallet);
 let beforeBatch=()=>{},blocked=false,n=0;
 const adapter={
  prepare(sql){const statement=db.prepare(sql);return {
   bind(...values){return {async first(){return statement.get(...values)??null;},async all(){return {results:statement.all(...values)};},async run(){return statement.run(...values);}};},
   async all(){return {results:statement.all()};},async first(){return statement.get()??null;}
  };},
  async batch(stmts){beforeBatch();db.exec('BEGIN IMMEDIATE');try{for(const stmt of stmts)await stmt.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 };
 async function call(projectId='garden',amount=500,{telegramId='12345678',id=`don-${String(++n).padStart(16,'0')}`,expectedRevision,expectedDebitPoints=amount,envOverrides={},pathname='/api/world/community/contribute'}={}){
  const revision=expectedRevision??Number(db.prepare('SELECT revision FROM zeffi_community_projects WHERE project_id=?').get(projectId)?.revision||0);
  const response=await handleCommunityFund({db:adapter,env:{WORLD_COMMUNITY_FUND_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'true',WORLD_PURCHASES_ENABLED:'true',...envOverrides},telegramId,pathname,
   body:{projectId,amountPoints:amount,requestId:id,expectedRevision:revision,expectedDebitPoints},
   profileReader:async pid=>db.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').get(pid),
   operationGate:async()=>{if(blocked)throw Object.assign(new Error('Blocked'),{status:403});}
  });return {status:response.status,body:await response.json()};
 }
 function snapshot(){return {profiles:db.prepare('SELECT telegram_id,wallet,revision FROM admin_profile_state ORDER BY telegram_id').all(),projects:db.prepare('SELECT project_id,goal_points,total_points,stage,revision FROM zeffi_community_projects ORDER BY project_id').all(),ledger:db.prepare('SELECT telegram_id,request_id,project_id,amount_points FROM zeffi_community_contributions ORDER BY telegram_id,request_id').all()};}
 return {db,adapter,call,snapshot,block(){blocked=true;},intercept(fn){beforeBatch=fn;}};
}
test('0127 keeps original project IDs; Garden launches at 60k and Festival retains its history',()=>{
 const f=fixture(),s=f.snapshot();assert.equal(s.projects.length,2);
 assert.deepEqual(s.projects.map(p=>[p.project_id,p.goal_points,p.total_points]),[['festival',50_000_000,0],['garden',60_000,0]]);
 assert.equal(COMMUNITY_PROJECTS.garden.goal,60_000);assert.equal(GARDEN_DAILY_LIMIT,2_000);assert.equal(s.ledger.length,0);
});
test('two real Telegram profiles contribute to one 60k Garden; only their own wallets change',async()=>{
 const f=fixture();const a=await f.call('garden',500);assert.equal(a.status,200,JSON.stringify(a.body));
 const b=await f.call('garden',250,{telegramId:'87654321'});assert.equal(b.status,200);
 assert.equal(b.body.projects.garden.total,750);assert.equal(b.body.viewer.contributedToday,250);
 const r=await f.call('garden',0,{pathname:'/api/world/community/state'});assert.equal(r.status,200);
 assert.equal(r.body.projects.garden.total,750);assert.equal(r.body.viewer.contributedPoints.garden,500);
 assert.equal(r.body.viewer.contributedToday,500);assert.equal(r.body.viewer.dailyLimitPoints,2000);
 assert.deepEqual(f.snapshot().profiles.map(x=>x.wallet),[69_999_500,69_999_750]);
});
test('the same requestId returns a receipt but never repeats the debit',async()=>{
 const f=fixture(),id='garden-idempotent-0001';const a=await f.call('garden',500,{id});assert.equal(a.status,200);
 const before=f.snapshot();const again=await f.call('garden',500,{id,expectedRevision:0});assert.equal(again.status,200);assert.equal(again.body.repeated,true);
 assert.deepEqual(f.snapshot(),before);
 const misuse=await f.call('garden',250,{id});assert.equal(misuse.status,409);assert.equal(misuse.body.code,'COMMUNITY_REQUEST_REUSED');
});
test('Festival rejects direct signed API payments irrespective of published P2 enabled flag',async()=>{
 const f=fixture(),before=f.snapshot();const r=await f.call('festival',500);assert.equal(r.status,403);assert.equal(r.body.code,'COMMUNITY_PROJECT_PAUSED');
 assert.deepEqual(f.snapshot(),before);
 const read=await f.call('festival',0,{pathname:'/api/world/community/state'});assert.equal(read.status,200);
 assert.equal(read.body.content.projects.festival.enabled,false);assert.match(read.body.content.projects.festival.announcement,/Зеффи/);
});
test('historic Festival receipt may still be retried, but no new Festival charge occurs',async()=>{
 const f=fixture();f.db.prepare(`INSERT INTO zeffi_community_contributions(telegram_id,request_id,project_id,requested_points,amount_points,project_revision,created_at,project_guard,wallet_guard) VALUES (?,?,?,?,?,?,?,1,1)`).run('12345678','legacy-festival-0001','festival',500000,500000,1,day()-86400);
 const before=f.snapshot();const again=await f.call('festival',500000,{id:'legacy-festival-0001',expectedDebitPoints:500000});assert.equal(again.status,200);
 assert.equal(again.body.repeated,true);assert.deepEqual(f.snapshot(),before);
});
test('100/250/500/1000 are valid Garden payments; larger and invalid payloads never debit',async()=>{
 const f=fixture();f.db.prepare("UPDATE admin_profile_state SET wallet=56557 WHERE telegram_id='12345678'").run();
 for(const sum of [100,250,500,1000])assert.equal((await f.call('garden',sum)).status,200);
 assert.equal(f.snapshot().profiles[0].wallet,56557-1850);
 const before=f.snapshot();for(const [id,amount] of [['garden',1001],['garden',2000000],['gArden',500],['garden',0],['garden','500']]){
  const r=await f.call(id,amount);assert.equal(r.status,400,`${id} ${amount}`);assert.deepEqual(f.snapshot(),before);
 }
});
test('daily Garden allowance is 2,000 UTC, applies per Telegram account and resets next day',async()=>{
 const f=fixture();assert.equal((await f.call('garden',1000)).status,200);assert.equal((await f.call('garden',1000)).status,200);
 const before=f.snapshot(),blocked=await f.call('garden',100);assert.equal(blocked.status,409);assert.equal(blocked.body.code,'COMMUNITY_DAILY_LIMIT');assert.deepEqual(f.snapshot(),before);
 assert.equal((await f.call('garden',1000,{telegramId:'87654321'})).status,200);
 f.db.prepare('UPDATE zeffi_community_contributions SET created_at=created_at-86400 WHERE telegram_id=?').run('12345678');
 assert.equal((await f.call('garden',1000)).status,200);
 assert.equal((await f.call('garden',0,{pathname:'/api/world/community/state'})).body.viewer.contributedToday,1000);
});
test('daily-limit race guard rolls back wallet & project even if another donation arrives after precheck',async()=>{
 const f=fixture();f.intercept(()=>f.db.prepare(`INSERT INTO zeffi_community_contributions(telegram_id,request_id,project_id,requested_points,amount_points,project_revision,created_at,project_guard,wallet_guard) VALUES (?,?,?,?,?,?,?,1,1)`).run('12345678','other-device-0000001','garden',1800,1800,1,day()+5));
 const before=f.snapshot();const r=await f.call('garden',500);assert.equal(r.status,409);
 assert.deepEqual(f.snapshot().profiles,before.profiles);assert.deepEqual(f.snapshot().projects,before.projects);
 assert.equal(f.snapshot().ledger.length,1);
});
test('last Garden payment is capped to the remaining 60,000 goal and makes the shared map ready',async()=>{
 const f=fixture();f.db.prepare("UPDATE zeffi_community_projects SET total_points=59900,revision=7 WHERE project_id='garden'").run();
 const a=await f.call('garden',500,{expectedRevision:7,expectedDebitPoints:100});assert.equal(a.status,200,JSON.stringify(a.body));
 assert.equal(a.body.receipt.debitedPoints,100);assert.equal(a.body.projects.garden.total,60000);assert.equal(a.body.projects.garden.stage,1);
 const other=await f.call('garden',0,{telegramId:'87654321',pathname:'/api/world/community/state'});assert.equal(other.body.projects.garden.finished,true);
});
test('invalid quote or stale revision never silently changes amount charged',async()=>{
 const f=fixture();assert.equal((await f.call('garden',500,{expectedDebitPoints:250})).status,409);
 await f.call('garden',500);const before=f.snapshot();assert.equal((await f.call('garden',250,{expectedRevision:0,telegramId:'87654321'})).status,409);
 assert.deepEqual(f.snapshot(),before);
});
test('wallet CAS and project CAS conflicts in D1 batch roll back all changes',async()=>{
 const f=fixture();f.intercept(()=>f.db.prepare("UPDATE admin_profile_state SET revision=revision+1 WHERE telegram_id='12345678'").run());
 const failed=await f.call('garden',1000);assert.equal(failed.status,409);assert.equal(f.snapshot().projects[1].total_points,0);assert.equal(f.snapshot().profiles[0].wallet,70_000_000);
 const g=fixture();g.intercept(()=>g.db.prepare("UPDATE zeffi_community_projects SET revision=revision+1 WHERE project_id='garden'").run());
 assert.equal((await g.call('garden',1000)).status,409);assert.equal(g.snapshot().profiles[0].wallet,70_000_000);assert.equal(g.snapshot().ledger.length,0);
});
test('gate flags, operation blockers and missing funds protect wallets',async()=>{
 const f=fixture();f.db.prepare("UPDATE admin_profile_state SET wallet=1 WHERE telegram_id='12345678'").run();const before=f.snapshot();
 assert.equal((await f.call('garden',500)).body.code,'COMMUNITY_INSUFFICIENT_POINTS');
 assert.equal((await f.call('garden',500,{envOverrides:{WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'false'}})).status,403);
 assert.equal((await f.call('garden',500,{pathname:'/api/world/community/state',envOverrides:{WORLD_COMMUNITY_FUND_ENABLED:'false'}})).status,403);
 f.block();assert.equal((await f.call('garden',500)).status,403);assert.deepEqual(f.snapshot(),before);
});
test('D1 checks reject forged stage and invalid contribution guard',()=>{
 const f=fixture();assert.throws(()=>f.db.prepare("UPDATE zeffi_community_projects SET stage=3 WHERE project_id='garden'").run());
 assert.throws(()=>f.db.prepare("INSERT INTO zeffi_community_contributions(telegram_id,request_id,project_id,requested_points,amount_points,project_revision,created_at,project_guard,wallet_guard) VALUES ('12345678','malicious-0001','garden',100,100,1,1,0,1)").run());
});
