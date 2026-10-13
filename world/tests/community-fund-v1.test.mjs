import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleCommunityFund, COMMUNITY_PROJECTS } from '../../src/zeffi-community-fund.js';

function fixture(options={}){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY, wallet INTEGER NOT NULL CHECK(wallet>=0),revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER,updated_by TEXT);');
 db.exec(readFileSync(new URL('../../migrations/0115_zeffi_community_fund.sql',import.meta.url),'utf8'));
 for(const [id,wallet] of [['12345678',70_000_000],['87654321',70_000_000]])db.prepare('INSERT INTO admin_profile_state(telegram_id,wallet,revision,updated_at,updated_by) VALUES (?,?,0,0,\'\')').run(id,wallet);
 let beforeBatch=()=>{},blocked=false;const paths=[];
 const adapter={
  prepare(sql){const statement=db.prepare(sql);return {
   bind(...values){return {
    async first(){return statement.get(...values)??null;},
    async all(){return {results:statement.all(...values)};},
    async run(){return statement.run(...values);}
   };},
   async all(){return {results:statement.all()};},
   async first(){return statement.get()??null;}
  };},
  async batch(stmts){beforeBatch();db.exec('BEGIN IMMEDIATE');try{for(const stmt of stmts)await stmt.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 };
 let n=0;
 async function call(projectId='festival',amount=100_000,{telegramId='12345678',id=`r-${String(++n).padStart(15,'0')}`,expectedRevision=0,expectedDebitPoints=amount,envOverrides={},pathname='/api/world/community/contribute'}={}){
  return json(await handleCommunityFund({db:adapter,env:{WORLD_COMMUNITY_FUND_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'true',WORLD_PURCHASES_ENABLED:'true',...envOverrides},telegramId,pathname,
   body:{projectId,amountPoints:amount,requestId:id,expectedRevision,expectedDebitPoints},
   profileReader:async pid=>db.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').get(pid),
   operationGate:async (_id,capabilities)=>{paths.push(capabilities.join(','));if(blocked)throw Object.assign(new Error('Blocked'),{status:403});}
  }));
 }
 function snapshot(){return {profiles:db.prepare('SELECT telegram_id,wallet,revision FROM admin_profile_state ORDER BY telegram_id').all(),projects:db.prepare('SELECT project_id,total_points,stage,revision FROM zeffi_community_projects ORDER BY project_id').all(),ledger:db.prepare('SELECT telegram_id,request_id,amount_points FROM zeffi_community_contributions ORDER BY telegram_id,request_id').all()};}
 return {db,adapter,call,snapshot,paths,block(){blocked=true;},intercept(f){beforeBatch=f;}};
}
async function json(response){return {status:response.status,body:await response.json()};}
const revision=(f,id)=>f.snapshot().projects.find(p=>p.project_id===id).revision;

test('migration 0115 creates two zero-funded shared projects with fixed goals and no wallet changes',()=>{
 const f=fixture();const s=f.snapshot();assert.equal(s.projects.length,2);assert.deepEqual(s.projects.map(p=>[p.project_id,p.total_points,p.stage]),[['festival',0,0],['garden',0,0]]);
 assert.equal(s.ledger.length,0);assert.equal(s.profiles[0].wallet,70_000_000);
 assert.deepEqual(COMMUNITY_PROJECTS.festival.milestones,[12_500_000,30_000_000,50_000_000]);
});
test('two players share one fund; each donation atomically debits only their own wallet',async()=>{
 const f=fixture();const a=await f.call('festival',1_000_000);assert.equal(a.status,200);assert.equal(a.body.receipt.debitedPoints,1_000_000);assert.equal(a.body.projects.festival.total,1_000_000);
 const b=await f.call('festival',1_000_000,{telegramId:'87654321',expectedRevision:1});assert.equal(b.status,200);assert.equal(b.body.projects.festival.total,2_000_000);
 assert.deepEqual(f.snapshot().profiles.map(x=>x.wallet),[69_000_000,69_000_000]);assert.equal(f.snapshot().ledger.length,2);
 const view=await f.call('festival',0,{telegramId:'12345678',pathname:'/api/world/community/state'});
 assert.equal(view.status,200);assert.equal(view.body.projects.festival.total,2_000_000);assert.equal(view.body.viewer.contributedPoints.festival,1_000_000);assert.equal(view.body.viewer.walletPoints,69_000_000);
});
test('retry same ID returns original receipt and never charges twice',async()=>{
 const f=fixture(),id='community-retry-001';const a=await f.call('festival',500_000,{id});assert.equal(a.status,200);
 const before=f.snapshot(),b=await f.call('festival',500_000,{id});assert.equal(b.status,200);assert.equal(b.body.repeated,true);assert.equal(b.body.receipt.debitedPoints,500_000);assert.deepEqual(f.snapshot(),before);
 const mismatch=await f.call('garden',500_000,{id});assert.equal(mismatch.status,409);assert.equal(mismatch.body.code,'COMMUNITY_REQUEST_REUSED');
});
test('small 1,000-point real donation works for a player with a modest wallet',async()=>{
 const f=fixture();f.db.prepare("UPDATE admin_profile_state SET wallet=56557 WHERE telegram_id='12345678'").run();
 const result=await f.call('garden',1000);
 assert.equal(result.status,200);
 assert.equal(result.body.projects.garden.total,1000);
 assert.equal(result.body.viewer.walletPoints,55557);
 assert.equal(result.body.receipt.debitedPoints,1000);
 assert.equal(f.snapshot().ledger[0].amount_points,1000);
});
test('concurrent/stale revision is rejected before any debit or ledger write',async()=>{
 const f=fixture();await f.call('garden',100_000);const before=f.snapshot();const conflict=await f.call('garden',100_000,{telegramId:'87654321',expectedRevision:0});assert.equal(conflict.status,409);assert.equal(conflict.body.code,'COMMUNITY_REVISION_CONFLICT');assert.deepEqual(f.snapshot(),before);
});
test('festival milestone accepts only the quoted remaining sum and stores stage in D1',async()=>{
 const f=fixture();f.db.prepare('UPDATE zeffi_community_projects SET total_points=12400000,revision=7 WHERE project_id=\'festival\'').run();
 const bad=await f.call('festival',2_000_000,{expectedRevision:7,expectedDebitPoints:2_000_000});assert.equal(bad.status,409);assert.equal(bad.body.code,'COMMUNITY_QUOTE_CHANGED');
 const a=await f.call('festival',2_000_000,{expectedRevision:7,expectedDebitPoints:100_000});assert.equal(a.status,200);assert.equal(a.body.projects.festival.stage,1);assert.equal(a.body.projects.festival.total,12_500_000);
 assert.equal(f.snapshot().profiles[0].wallet,69_900_000);assert.equal(f.snapshot().ledger[0].amount_points,100_000);
 const x=await f.call('festival',1_000_000,{expectedRevision:8});assert.equal(x.status,200);assert.equal(x.body.projects.festival.stage,1);
});
test('stage 2/3 persist; complete garden appears in all players read state',async()=>{
 const f=fixture();f.db.prepare("UPDATE zeffi_community_projects SET total_points=29900000,stage=1,revision=6 WHERE project_id='festival'").run();
 const a=await f.call('festival',250_000,{expectedRevision:6,expectedDebitPoints:100_000});assert.equal(a.status,200);assert.equal(a.body.projects.festival.stage,2);
 f.db.prepare("UPDATE zeffi_community_projects SET total_points=49900000,stage=2,revision=11 WHERE project_id='festival'").run();
 const b=await f.call('festival',1_000_000,{expectedRevision:11,expectedDebitPoints:100_000});assert.equal(b.body.projects.festival.stage,3);assert.equal(b.body.projects.festival.finished,true);
 const c=await f.call('garden',1_000_000);assert.equal(c.body.projects.garden.stage,1);
 const p=await f.call('garden',0,{telegramId:'87654321',pathname:'/api/world/community/state'});assert.equal(p.body.projects.garden.finished,true);assert.equal(p.body.projects.festival.stage,3);
});
test('wallet deficit, disabled flags and blocked operations cannot write anything',async()=>{
 const f=fixture();f.db.prepare("UPDATE admin_profile_state SET wallet=1 WHERE telegram_id='12345678'").run();const before=f.snapshot();
 const insufficient=await f.call('festival',100_000);assert.equal(insufficient.status,409);assert.equal(insufficient.body.code,'COMMUNITY_INSUFFICIENT_POINTS');assert.deepEqual(f.snapshot(),before);
 const disabled=await f.call('festival',100_000,{envOverrides:{WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'false'}});assert.equal(disabled.status,403);assert.deepEqual(f.snapshot(),before);
 const noRead=await f.call('festival',100_000,{pathname:'/api/world/community/state',envOverrides:{WORLD_COMMUNITY_FUND_ENABLED:'false'}});assert.equal(noRead.status,403);
 f.block();const blocked=await f.call('festival',100_000);assert.equal(blocked.status,403);assert.deepEqual(f.snapshot(),before);
});
test('invalid payloads never mutate wallets or projects',async()=>{
 const f=fixture();const s=f.snapshot();for(const [id,amount] of [['gArden',100],['festival',-1],['festival','1000'],['festival',2_000_001],['festival',0]]){
  const r=await f.call(id,amount);assert.equal(r.status,400);assert.deepEqual(f.snapshot(),s);
 }
});
test('wallet CAS conflict in a D1 batch rolls back the project UPDATE and receipt',async()=>{
 const f=fixture();f.intercept(()=>f.db.prepare("UPDATE admin_profile_state SET revision=revision+1 WHERE telegram_id='12345678'").run());
 const r=await f.call('festival',100_000);assert.equal(r.status,409);const s=f.snapshot();assert.equal(s.projects[0].total_points,0);assert.equal(s.ledger.length,0);assert.equal(s.profiles[0].wallet,70_000_000);
});
test('project CAS conflict inside a batch rolls back wallet debits and receipt',async()=>{
 const f=fixture();f.intercept(()=>f.db.prepare("UPDATE zeffi_community_projects SET total_points=100000,revision=revision+1 WHERE project_id='festival'").run());
 const r=await f.call('festival',100_000);assert.equal(r.status,409);const s=f.snapshot();assert.equal(s.projects[0].total_points,100_000);assert.equal(s.ledger.length,0);assert.equal(s.profiles[0].wallet,70_000_000);
});
test('D1 CHECK constraints reject manufactured stage and invalid receipt guard',()=>{
 const f=fixture();assert.throws(()=>f.db.prepare("UPDATE zeffi_community_projects SET stage=3 WHERE project_id='festival'").run());
 assert.throws(()=>f.db.prepare("INSERT INTO zeffi_community_contributions(telegram_id,request_id,project_id,requested_points,amount_points,project_revision,created_at,project_guard,wallet_guard) VALUES ('12345678','malicious-001','garden',100,100,1,1,0,1)").run());
});
