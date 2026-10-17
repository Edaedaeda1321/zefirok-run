#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalogFromWorker,planSeason3,makeSql} from '../fix-season3-pass-content.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const src=await readFile(resolve(root,'src/worker.js'),'utf8');
const catalog=catalogFromWorker(src),now=1792221000,SEASON='season-3-belkino-test',CASE='seasoncase_s3_belkino_test';
const idx=catalog.find(x=>x.id==='season3_frame_standard_new_2');
assert.equal(catalog.length,32);
assert.equal(idx.title,'Садовый бант');
assert.equal(catalog.filter(x=>x.kind==='frame').length,10);
assert.ok(!catalog.find(x=>x.id==='season3_avatar_elite'));
function fixture(){
 const s={
  seasons:[{season_id:SEASON,title:'Сезон 3 — Тайны Белкино',starts_at:now-3600,ends_at:now+86000,manual_status:'active'}],
  presets:[{preset_id:'season3_belkino_case_v1',season_id:SEASON}],
  rewards:[{season_id:SEASON,level:10,lane:'premium',enabled:1,item_id:`seasonal_case:${CASE}`,reward_type:'case'},
    {season_id:SEASON,level:3,lane:'premium',enabled:1,item_id:`season_cosmetic:frame:season3_frame_standard_new_2`,reward_type:'points'}],
  caseDefs:[{case_id:CASE,season_id:SEASON,title:'Тайны Белкино',enabled:0,release_at:now+3600,updated_by:'system-season3-draft-case-v1'}],
  caseItems:[],registry:[],shadow:[]};
 for(const [i,item] of catalog.entries()){
   const id=item.id,kind=item.kind, r={seasonal_case:{enabled:true,destinationId:CASE,weight:2},shop:{enabled:true,points:10}};
   if(i===1)r.native={enabled:true};
   s.registry.push({item_kind:kind,item_id:id,status:i<15?'hidden':'open',content_season_id:i===0?'':SEASON,release_at:0,ever_released:i<15?0:1,routes_json:JSON.stringify({version:1,routes:r}),updated_at:100,updated_by:'owner'});
   s.shadow.push({item_kind:kind,item_id:id,released:0,ever_released:0,content_season_id:SEASON,destination_type:'seasonal_case',destination_id:CASE,destination_config_json:'{"weight":2}',updated_at:100});
   if(i%3!==0)s.caseItems.push({case_id:CASE,item_key:`${kind}:${id}`,reward_kind:kind,item_id:id,weight:2,enabled:i%3===1?1:0});
 }
 return s;
}
let snap=fixture();let plan=planSeason3(snap,catalog,{now});
assert.equal(plan.problems.length,0,plan.problems.join('\n'));
assert.equal(plan.summary.registry,32);
assert.equal(plan.summary.shadow,32);
assert.equal(plan.summary.caseItems,21);
assert.ok(plan.summary.caseActivation);
const bow=plan.items.find(x=>x.id==='season3_frame_standard_new_2');
assert.equal(bow.expected.season_pass.level,3);
assert.equal(bow.expected.season_pass.lane,'premium');
assert.equal(bow.expected.seasonal_case.destinationId,CASE);
assert.deepEqual(Object.keys(bow.expected),['season_pass','seasonal_case']);
const sql=makeSql(plan,{now}).join('\n');
assert.equal((sql.match(/UPDATE live_content_registry_state/g)||[]).length,32);
assert.equal((sql.match(/UPDATE live_content_release_rules/g)||[]).length,32);
assert.ok(sql.includes('INSERT OR IGNORE INTO season_pass_case_items'));
assert.ok(sql.includes('UPDATE season_pass_case_definitions SET enabled=1'));
assert.doesNotMatch(sql,/UPDATE season_pass_rewards SET|DELETE FROM season_pass_rewards|UPDATE case_player_state|UPDATE season_pass_claims/);
assert.doesNotMatch(sql,/UPDATE live_content_registry_state SET.*WHERE item_kind='skin' AND item_id='season4/s);
if(process.argv.includes('--export')){
 const f=resolve(root,'scripts/tests/season3-synthetic.json');
 await writeFile(f,JSON.stringify(snap,null,2));
 await writeFile(resolve(root,'scripts/tests/season3-generated.sql'),sql+'\n');
 console.log('Saved test fixture + SQL for SQLite integration');
}
// Simulate the post-apply D1 state without changing player rewards.
for(const item of plan.items){
 const row=snap.registry.find(x=>x.item_kind===item.kind&&x.item_id===item.id);
 Object.assign(row,{status:'open',content_season_id:SEASON,routes_json:JSON.stringify({version:1,routes:item.expected}),ever_released:1});
 const sh=snap.shadow.find(x=>x.item_kind===item.kind&&x.item_id===item.id);
 const rt=item.expected[item.primary];Object.assign(sh,{released:1,ever_released:1,content_season_id:SEASON,destination_type:item.primary,destination_id:rt.destinationId,destination_config_json:JSON.stringify(item.cfg)});
 if(item.needsPool){if(item.caseBefore){item.caseBefore.weight=item.expected.seasonal_case.weight;item.caseBefore.enabled=1;}
 else snap.caseItems.push({case_id:CASE,item_key:`${item.kind}:${item.id}`,reward_kind:item.kind,item_id:item.id,weight:item.expected.seasonal_case.weight,enabled:1});}
}
snap.caseDefs[0].enabled=1;snap.caseDefs[0].release_at=now;
plan=planSeason3(snap,catalog,{now});
assert.equal(plan.problems.length,0);
assert.equal(plan.summary.registry,0);
assert.equal(plan.summary.shadow,0);
assert.equal(plan.summary.caseItems,0);
assert.equal(plan.summary.caseActivation,false);
assert.equal(makeSql(plan,{now}).length,0);

snap=fixture();snap.rewards=snap.rewards.filter(r=>!r.item_id.startsWith('seasonal_case:'));
plan=planSeason3(snap,catalog,{now});
assert.ok(plan.problems.length>0,'Absent pass-case must block publishing unearned content');
assert.throws(()=>makeSql(plan,{now}));
snap=fixture();snap.presets[0].season_id='season2';
plan=planSeason3(snap,catalog,{now});assert.ok(plan.problems.length>0);
snap=fixture();snap.caseItems.push({case_id:CASE,item_key:'alien',reward_kind:'avatar',item_id:'season4_avatar_epic',weight:2,enabled:1});
plan=planSeason3(snap,catalog,{now});assert.ok(plan.problems.some(p=>p.includes('другого скрытого сезона')));
snap=fixture();snap.caseItems.push({case_id:CASE,item_key:'regular-avatar',reward_kind:'avatar',item_id:'cafe_run',weight:2,enabled:1});
plan=planSeason3(snap,catalog,{now});assert.equal(plan.problems.length,0,'Regular rewards in S3 case must not block S3 publication');
snap=fixture();snap.rewards.push({...snap.rewards[1],level:4});
plan=planSeason3(snap,catalog,{now});assert.ok(plan.problems.some(p=>p.includes('разных слотов')));
snap=fixture();snap.seasons[0].manual_status='ended';
plan=planSeason3(snap,catalog,{now});assert.ok(plan.problems.some(p=>p.includes('не активен')));

// Guard that admin editing a S3 reward updates content routes atomically.
const owner=src.slice(src.indexOf('async function ownerPanelSetSeasonPassReward(env, ctx)'),src.indexOf('async function ownerPanelSeasonPassStoryRewardConfig'));
assert.ok(owner.includes('prepareLiveContentMutation(env'));
assert.ok(owner.includes('await env.DB.batch(statements)'));
assert.ok(owner.includes('invalidateLiveContentReleaseCache()'));
assert.ok(owner.includes('season_pass_claims'));
assert.ok(src.includes('Предметы Сезона 3 можно получать только через сезонный пропуск'));
assert.ok(src.includes('Сезонный кейс должен принадлежать тому же Season Pass'));
console.log('PASS S3: 32 authoritative items, route exclusivity, live owner sync, binding, pass-earned case, already-claimed guards, idempotency, misconfiguration protection.');
