#!/usr/bin/env node
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const worker=await readFile(resolve(root,'src/worker.js'),'utf8');
const begin=worker.indexOf('async function ownerPanelSetSeasonPassReward(env, ctx) {');
const end=worker.indexOf('\nasync function ownerPanelSeasonPassStoryRewardConfig',begin);
assert.ok(begin>0&&end>begin);
const source=worker.slice(begin,end);

function harness({newItem='season_cosmetic:frame:season3_frame_standard_new_2',beforeItem='points',claim=false,duplicate=false,caseAssigned=true}={}){
 const recorded=[],calls=[],S='season-s3',C='case-s3';
 const cosmetic=(v)=>{const raw=String(v?.item_id??v?.itemId??'');const m=raw.match(/^season_cosmetic:(\w+):(.+)$/);return m?{kind:m[1],itemId:m[2],future:true}:null;};
 const newReward={rewardType:newItem.startsWith('season_cosmetic:')?'points':'case',itemId:newItem,title:'Садовый бант',amount:1};
 const ctx={body:{},user:{id:123},access:{}};
 const previous={kind:'frame',itemId:'season3_frame_standard_new_2',seasonId:S,status:'open',released:true,everReleased:true,routes:{seasonal_case:{enabled:true,destinationId:C,weight:2}},destinationType:'seasonal_case'};
 const rules=new Map([['frame:season3_frame_standard_new_2',previous]]);
 const env={DB:{prepare(sql){return {bind(...params){return {async first(){
  calls.push({sql,params});
  if(sql.includes('SELECT * FROM season_pass_rewards WHERE season_id=? AND level=?'))return {item_id:beforeItem};
  if(sql.includes('SELECT season_id FROM season_pass_case_presets'))return {season_id:S};
  if(sql.includes('FROM season_pass_claims'))return claim?{used:1}:null;
  if(sql.includes('SELECT level,lane FROM season_pass_rewards'))return duplicate?{level:1,lane:'free'}:null;
  if(sql.includes('FROM season_pass_case_definitions c JOIN season_pass_rewards'))return caseAssigned?{assigned:1}:null;
  throw Error('Unexpected SQL: '+sql);
 },run(){throw Error('Writes outside batch are forbidden')}}},async first(){return this.bind().first();},run(){throw Error('Unbound D1 call')}}},async batch(statements){recorded.push([...statements]);return [];}}};
 const stubs={
  normalizeValidateSeasonPassRewardPayload:async()=>({seasonId:S,level:3,lane:'premium',reward:newReward}),
  seasonPassCosmeticRewardDefinition:cosmetic,
  futureSeasonContentSeasonKey:()=>'season3',
  ensureLiveContentReleaseSchema:async()=>{},
  readLiveContentReleaseRules:async()=>rules,
  liveContentReleaseKey:(kind,id)=>`${kind}:${id}`,
  liveContentRoute:(rule,route,destinationId='')=>{const r=rule?.routes?.[route];return r?.enabled&&(!destinationId||r.destinationId===destinationId)?r:null;},
  liveContentRouteCount:r=>Object.values(r).filter(x=>x?.enabled).length,
  prepareLiveContentMutation:async (_env,norm,_actor)=>({statements:[{type:'live-content-and-pass-upsert',data:norm}]}),
  invalidateLiveContentReleaseCache:()=>calls.push({invalidate:true}),
  logStaffAction:async()=>{},
  ApiError:class ApiError extends Error{constructor(status,message){super(message);this.status=status;}},
  SEASON_PASS_SEASONAL_CASE_PREFIX:'seasonal_case:'
 };
 const fn=vm.runInNewContext(`(${source})`,stubs);
 return {run:()=>fn(env,ctx),recorded,calls};
}
let h=harness();let result=await h.run();
assert.equal(result.ok,true);
assert.equal(h.recorded.length,1,'Live route and pass reward must be committed in a single D1 batch');
assert.equal(h.recorded[0].length,1);
let update=h.recorded[0][0].data;
assert.equal(update.status,'open');
assert.equal(update.routes.season_pass.level,3);
assert.equal(update.routes.season_pass.lane,'premium');
assert.equal(update.routes.seasonal_case.destinationId,'case-s3');
assert.ok(!update.routes.shop);
h=harness({caseAssigned:false});await h.run();
assert.equal(Object.keys(h.recorded[0][0].data.routes).join(','),'season_pass','Unassigned seasonal case must not remain an alternate source');
h=harness({claim:true});await assert.rejects(h.run(),/уже получали игроки/);assert.equal(h.recorded.length,0);
h=harness({duplicate:true});await assert.rejects(h.run(),/другом уровне/);assert.equal(h.recorded.length,0);
h=harness({newItem:'points',beforeItem:'season_cosmetic:frame:season3_frame_standard_new_2'});
// With no existing direct route, the old cosmetic cannot be affected; the new row still saves atomically.
await h.run();assert.equal(h.recorded.length,1);
console.log('PASS S3 owner: atomic Live Content/Pass sync, seasonal-case association, no claimed-slot overwrite, no duplicate Pass slot, regular reward fallback.');
