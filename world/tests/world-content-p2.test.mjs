import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {defaultWorldContent,validateWorldContent,WORLD_EVENT_IDS} from '../world-content.js';
import {handleOwnerWorldContent} from '../../src/zeffi-world-content-admin.js';
import {publishedWorldContent} from '../../src/zeffi-world-content.js';
import {handleCommunityFund} from '../../src/zeffi-community-fund.js';
import {handleZeffiStory} from '../../src/zeffi-story-progress.js';
import {residentRequestState,claimResidentRequest} from '../../src/zeffi-resident-requests.js';
import {makeInitialCity} from '../engine.js';
import {CATALOG} from '../catalog.js';
import {communityChronicle,newlyReachedCommunityEvents} from '../story/community-events-p2.js';
const sql=name=>readFileSync(new URL('../../migrations/'+name,import.meta.url),'utf8');
function setup({legacy=false}={}){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,treats INTEGER NOT NULL,coffee INTEGER NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT \'\');');
 sqlite.prepare('INSERT INTO admin_profile_state VALUES (?,?,?,?,0,0,\'\')').run('12345',5_000_000,500,1000);
 for(const file of ['0115_zeffi_community_fund.sql','0118_zeffi_story_progression.sql','0119_zeffi_world_resident_requests.sql'])sqlite.exec(sql(file));
 if(legacy)sqlite.prepare('INSERT INTO zeffi_world_resident_requests(telegram_id,request_id,template_id,assigned_at,status,progress) VALUES (?,?,?,?,?,?)').run('12345','resident-park','park',1,'ready',1);
 sqlite.exec(sql('0122_zeffi_world_content_p2.sql'));
 const adapter={prepare(query){const stmt=sqlite.prepare(query);return{
   bind(...args){return {first:async()=>stmt.get(...args)??null,all:async()=>({results:stmt.all(...args)}),run:async()=>{const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}};},
   first:async()=>stmt.get()??null,all:async()=>({results:stmt.all()})
  };},async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const owner={access:{owner:true},user:{id:12345},body:{}};
 const wallet=()=>sqlite.prepare('SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id=\'12345\'').get();
 let counter=0;
 async function admin(path,body={},ctx=owner){try{return {status:200,body:await handleOwnerWorldContent({env:{DB:adapter},ctx:{...ctx,body},path})};}catch(e){return {status:e.status||500,body:{error:e.message}};}}
 async function change(draft){let r=await admin('/api/owner/world/content');const revision=r.body.draftRevision;
  let saved=await admin('/api/owner/world/content/draft/save',{content:draft,expectedRevision:revision,requestId:'p2-draft-'+(++counter)+'-uuid',reason:'Testing versioned editor'});
  assert.equal(saved.status,200,JSON.stringify(saved.body));
  const pub=await admin('/api/owner/world/content/publish',{expectedRevision:saved.body.draftRevision,requestId:'p2-publish-'+(++counter)+'-uuid',reason:'Testing published rules',confirmPhrase:'ОПУБЛИКОВАТЬ СОБЫТИЯ'});
  assert.equal(pub.status,200,JSON.stringify(pub.body));return pub.body;
 }
 return {sqlite,adapter,owner,wallet,admin,change};
}
const fresh=()=>defaultWorldContent();
test('P2 default configuration has exact ten RC-5 events, three chapters, six residents and immutable IDs',()=>{
 const f=fresh();assert.equal(WORLD_EVENT_IDS.length,10);assert.equal(Object.keys(f.chapters).length,3);assert.equal(Object.keys(f.residents.templates).length,6);
 assert.deepEqual(validateWorldContent(f),f);
 assert.throws(()=>validateWorldContent({...f,projects:{...f.projects,other:{enabled:true,announcement:'bad'}}}));
 assert.throws(()=>validateWorldContent({...f,events:{...f.events,'garden-seeds':{...f.events['garden-seeds'],title:'<svg/>'}}}));
 assert.throws(()=>validateWorldContent({...f,residents:{...f.residents,dailyLimit:3}}));
});
test('0122 migration snapshots historical rewards and never touches existing wallets or funds',()=>{
 const f=setup({legacy:true});const row=f.sqlite.prepare("SELECT reward_points,reward_treats,content_revision FROM zeffi_world_resident_terms WHERE request_id='resident-park'").get();
 assert.deepEqual([row.reward_points,row.reward_treats,row.content_revision],[300,1,0]);
 assert.deepEqual([f.wallet().wallet,f.wallet().treats],[5_000_000,500]);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM zeffi_world_content_audit').get().n,0);
});
test('P2 owner-only read/draft/publish has CAS, confirmation, durable audit and idempotency',async()=>{
 const f=setup(),reader=await f.admin('/api/owner/world/content');assert.equal(reader.status,200);
 const denied=await f.admin('/api/owner/world/content',{},{access:{owner:false},user:{id:12345}});assert.equal(denied.status,403);
 const changed=fresh();changed.chapters.welcome.title='Новая история Зеффи';
 const body={content:changed,expectedRevision:0,reason:'Writing safe editable stories',requestId:'test-p2-draft-save-001'};
 const saved=await f.admin('/api/owner/world/content/draft/save',body);assert.equal(saved.status,200,saved.body.error);
 const repeated=await f.admin('/api/owner/world/content/draft/save',body);assert.equal(repeated.body.repeated,true);
 assert.equal((await f.admin('/api/owner/world/content/draft/save',{...body,requestId:'test-p2-draft-stale-1'})).status,409);
 const noPhrase=await f.admin('/api/owner/world/content/publish',{expectedRevision:1,requestId:'p2-bad-confirm-001',reason:body.reason});assert.equal(noPhrase.status,400);
 const pubBody={expectedRevision:1,requestId:'p2-safe-publication-001',reason:body.reason,confirmPhrase:'ОПУБЛИКОВАТЬ СОБЫТИЯ'};
 const published=await f.admin('/api/owner/world/content/publish',pubBody);assert.equal(published.status,200);assert.equal(published.body.publishedRevision,1);
 assert.equal((await f.admin('/api/owner/world/content/publish',pubBody)).body.repeated,true);
 assert.equal((await publishedWorldContent(f.adapter)).content.chapters.welcome.title,'Новая история Зеффи');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM zeffi_world_content_audit').get().n,2);
 assert.equal((await f.admin('/api/owner/world/content')).body.immutableProjects.length,2);
});
test('P2 published config is optional before 0122 but malformed published JSON fails closed',async()=>{
 const f=setup();const pub=await publishedWorldContent(f.adapter);assert.equal(pub.content.projects.garden.enabled,true);
 f.sqlite.prepare('UPDATE zeffi_world_content_config SET published_json=? WHERE id=1').run('{broken');
 await assert.rejects(()=>publishedWorldContent(f.adapter),/WORLD_CONTENT_INVALID_PUBLISHED/);
 f.sqlite.exec('DROP TABLE zeffi_world_content_config');
 assert.equal((await publishedWorldContent(f.adapter)).schemaReady,false);
});
test('paused project rejects NEW payments but preserves old receipts and never debits wallet',async()=>{
 const f=setup(),wallet0=f.wallet();let spec=fresh();spec.projects.garden.enabled=false;spec.projects.garden.announcement='Временно пауза в строительстве';await f.change(spec);
 const input={projectId:'garden',amountPoints:1000,requestId:'p2-fund-req-12345',expectedRevision:0,expectedDebitPoints:1000};
 const callback=async()=>f.sqlite.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get();
 const call=async(body=input)=>{const r=await handleCommunityFund({db:f.adapter,env:{WORLD_COMMUNITY_FUND_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_PURCHASES_ENABLED:'true',WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'true'},telegramId:'12345',pathname:'/api/world/community/contribute',body,profileReader:callback,operationGate:async()=>{}});return {status:r.status,body:await r.json()};};
 const denied=await call();assert.equal(denied.status,403);assert.equal(denied.body.code,'COMMUNITY_PROJECT_PAUSED');assert.deepEqual(f.wallet(),wallet0);
 assert.equal(f.sqlite.prepare('SELECT total_points FROM zeffi_community_projects WHERE project_id=\'garden\'').get().total_points,0);
 const state=await handleCommunityFund({db:f.adapter,env:{WORLD_COMMUNITY_FUND_ENABLED:'true'},telegramId:'12345',pathname:'/api/world/community/state',body:{},profileReader:callback,operationGate:async()=>{}});
 assert.equal((await state.json()).content.projects.garden.enabled,false);
 spec.projects.garden.enabled=true;await f.change(spec);
 const paid=await call();assert.equal(paid.status,200,JSON.stringify(paid.body));assert.equal(f.wallet().wallet,wallet0.wallet-1000);
 spec.projects.garden.enabled=false;await f.change(spec);
 const again=await call();assert.equal(again.status,200,JSON.stringify(again.body));assert.equal(again.body.repeated,true);assert.equal(f.wallet().wallet,wallet0.wallet-1000);
});
test('RC-5 P2 editorial text/visibility never changes real milestones or triggers retroactive popups',()=>{
 const f=fresh();f.events['garden-seeds']={...f.events['garden-seeds'],visible:false};f.events['garden-flowers'].title='Новое оформление сада';
 const snap=total=>({projects:{garden:{id:'garden',total,goal:1_000_000,revision:total,stage:total===1_000_000?1:0,milestones:[1_000_000]},festival:{id:'festival',total:0,goal:50_000_000,revision:0,stage:0,milestones:[12_500_000,30_000_000,50_000_000]}},content:{events:f.events}});
 const one=communityChronicle(snap(500_000),'garden');assert.equal(one.events.length,3);assert.equal(one.events[0].title,'Новое оформление сада');assert.equal(one.events[0].threshold,500_000);assert.equal(one.achieved,1);
 assert.deepEqual(newlyReachedCommunityEvents(null,snap(500_000)),[]);
 assert.deepEqual(newlyReachedCommunityEvents(snap(249_999),snap(500_000)).map(x=>x.id),['garden-flowers']);
});
test('published story text appears in signed story read, unchanged milestones and chapter gates',async()=>{
 const f=setup();let spec=fresh();spec.chapters.welcome.title='Новый сюжет о Зеффи';await f.change(spec);
 const resp=await handleZeffiStory({db:f.adapter,env:{WORLD_STORY_ENABLED:'true'},telegramId:'12345',body:{op:'state'}});
 const state=await resp.json();assert.equal(resp.status,200);assert.equal(state.currentChapter.title,'Новый сюжет о Зеффи');assert.equal(state.chapter,0);
 assert.equal(state.canAdvance,false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM zeffi_story_players').get().n,0);
});
test('new resident request gets assignment-time reward snapshot; re-publication never changes claim',async()=>{
 const f=setup();let spec=fresh();spec.residents.templates.flowers.reward.points=700;spec.residents.templates.flowers.reward.treats=4;await f.change(spec);
 const city=makeInitialCity(),initial=await residentRequestState(f.adapter,'12345',city);
 const first=initial.requests.find(r=>r.templateId==='flowers');assert.ok(first);assert.equal(first.reward.points,700);
 const terms=f.sqlite.prepare('SELECT reward_points,reward_treats FROM zeffi_world_resident_terms WHERE request_id=\'resident-flowers\'').get();assert.deepEqual([terms.reward_points,terms.reward_treats],[700,4]);
 spec.residents.templates.flowers.reward.points=150;spec.residents.templates.flowers.reward.treats=1;await f.change(spec);
 f.sqlite.prepare("UPDATE zeffi_world_resident_requests SET status='ready',progress=1 WHERE request_id='resident-flowers'").run();
 const before=f.wallet();
 const claim=await claimResidentRequest({db:f.adapter,telegramId:'12345',requestId:'resident-flowers',claimRequestId:'p2-claim-foo-12345',readProfile:async()=>f.sqlite.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get(),operationGate:async()=>{}});
 assert.equal(claim.status,200,JSON.stringify(claim));assert.deepEqual(claim.reward,{points:700,treats:4,coffee:0});
 assert.equal(f.wallet().wallet,before.wallet+700);assert.equal(f.wallet().treats,before.treats+4);
 const repeat=await claimResidentRequest({db:f.adapter,telegramId:'12345',requestId:'resident-flowers',claimRequestId:'p2-claim-repeat-1234',readProfile:async()=>f.sqlite.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get(),operationGate:async()=>{}});
 assert.equal(repeat.repeated,true);assert.equal(f.wallet().wallet,before.wallet+700);
});
test('daily limit publication can reduce next claims to one, never exceeds legacy D1 CHECK <=2',async()=>{
 const f=setup();let spec=fresh();spec.residents.dailyLimit=1;await f.change(spec);
 const city=makeInitialCity(),data=await residentRequestState(f.adapter,'12345',city);assert.equal(data.daily.limit,1);
 assert.throws(()=>validateWorldContent({...spec,residents:{...spec.residents,dailyLimit:3}}));
});
test('P2 race: pausing the fund during a contribution rolls back both project and wallet writes',async()=>{
 const f=setup(),before=f.wallet();
 const oldBatch=f.adapter.batch.bind(f.adapter);
 f.adapter.batch=async statements=>{
  f.sqlite.prepare('UPDATE zeffi_world_content_config SET published_revision=published_revision+1 WHERE id=1').run();
  return oldBatch(statements);
 };
 const r=await handleCommunityFund({db:f.adapter,env:{WORLD_COMMUNITY_FUND_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_PURCHASES_ENABLED:'true',WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'true'},telegramId:'12345',pathname:'/api/world/community/contribute',body:{projectId:'garden',amountPoints:1000,requestId:'p2-pause-race-0001',expectedRevision:0,expectedDebitPoints:1000},profileReader:async()=>f.sqlite.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get(),operationGate:async()=>{}});
 assert.equal(r.status,409);assert.deepEqual(f.wallet(),before);
 assert.equal(f.sqlite.prepare("SELECT total_points FROM zeffi_community_projects WHERE project_id='garden'").get().total_points,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM zeffi_community_contributions').get().n,0);
});
test('P2 race: daily-limit publish during a ready resident claim cannot award wallet or receipt',async()=>{
 const f=setup(),city=makeInitialCity();await residentRequestState(f.adapter,'12345',city);
 f.sqlite.prepare("UPDATE zeffi_world_resident_requests SET status='ready',progress=1 WHERE request_id='resident-flowers'").run();
 const before=f.wallet(),oldBatch=f.adapter.batch.bind(f.adapter);
 f.adapter.batch=async statements=>{
  f.sqlite.prepare('UPDATE zeffi_world_content_config SET published_revision=published_revision+1 WHERE id=1').run();
  return oldBatch(statements);
 };
 const result=await claimResidentRequest({db:f.adapter,telegramId:'12345',requestId:'resident-flowers',claimRequestId:'p2-claim-race-0001',readProfile:async()=>f.sqlite.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get(),operationGate:async()=>{}});
 assert.equal(result.status,409);assert.deepEqual(f.wallet(),before);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM zeffi_world_resident_claim_receipts').get().n,0);
 assert.equal(f.sqlite.prepare("SELECT status FROM zeffi_world_resident_requests WHERE request_id='resident-flowers'").get().status,'ready');
});
