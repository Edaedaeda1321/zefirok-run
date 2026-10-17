#!/usr/bin/env node
// Focused regression test: use actual Worker functions, not a duplicated implementation.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const worker=readFileSync(resolve(root,'src/worker.js'),'utf8');
const section=(from,to)=>{
  const start=worker.indexOf(from),end=worker.indexOf(to,start+from.length);
  assert(start>=0&&end>start,`Missing Worker section: ${from}`);
  return worker.slice(start,end);
};
const source=[
  section('function seasonPassElitePlusCosmeticAllowed(', 'function seasonPassCosmeticImage('),
  section('function seasonPassPublicTierSettings(', 'function assertSeasonPassTaskClaimsOpen('),
  section('async function elitePlusBenefitPlan(', 'async function reconcileDeliveredSeasonPassTier(')
].join('\n');
const seasonId='season-3-belkino';
const items=new Map([
  ['frame:s3frame',{title:'Садовый бант',imageUrl:'/assets/frames/s3frame.webp'}],
  ['avatar:s3avatar',{title:'Аватарка Белкино',imageUrl:'/assets/avatar/s3avatar.webp'}]
]);
let rules=new Map();
let ruleReads=0;
const future=(kind,id)=>items.get(`${kind}:${id}`)||null;
const context={
  futureSeasonContentItem:future,
  liveContentReleaseRuleCached:(kind,id)=>rules.get(`${kind}:${id}`)||null,
  liveContentReleaseKey:(kind,id)=>`${kind}:${id}`,
  liveContentRouteEnabled:(rule,type,destinationId='')=>rule?.routes?.[type]?.enabled===true&&(!destinationId||rule.routes[type].destinationId===destinationId),
  seasonPassElitePlusBenefitsConfig:(value)=>value,
  seasonPassAnyCosmeticCatalog:kind=>Object.fromEntries([...items.entries()].filter(([k])=>k.startsWith(kind+':')).map(([k,v])=>[k.split(':')[1],v])),
  defaultSeasonPassElitePlusBenefits:()=>({xpBoost:false,bonusLevels:0,caseType:'',caseCount:0,cosmetics:[]}),
  seasonPassCosmeticImage:(kind,id)=>future(kind,id)?.imageUrl||'none',
  ownerPanelCaseAsset:()=>'',
  readLiveContentReleaseRules:async(_env,force)=>{ruleReads++;assert.equal(force,true);return rules},
  ensureCasePlayerState:async()=>({state:{ownedSpecials:[],ownedFrames:[],ownedAvatars:[]}}),
  seasonPassApplyCosmeticToState:(state,item)=>{if(item.kind==='frame')state.ownedFrames.push(item.itemId);else state.ownedAvatars.push(item.itemId)},
  seasonPassLevelFromXp:()=>1,
  seasonPassXpForLevel:()=>0,
  caseStateUpdateStatement:()=>({sql:'update-case-state'}),
  SEASON_PASS_SPECIAL_XP_X2:'special-x2',
  SEASON_PASS_COSMETIC_PREFIX:'season_cosmetic:',
  SYSTEM_IMAGE_FALLBACK:'/assets/fallback.webp',
  ApiError:class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
};
vm.createContext(context);
vm.runInContext(source,context);
const published=(routeType='season_pass',publishedSeason=seasonId)=>({released:true,seasonId:publishedSeason,routes:{[routeType]:{enabled:true,destinationId:routeType==='season_pass'?seasonId:'season-3-case'}}});
const config={xpBoost:false,bonusLevels:0,caseType:'',caseCount:0,cosmetics:[{kind:'frame',itemId:'s3frame'},{kind:'avatar',itemId:'s3avatar'}]};
const checkView=()=>context.seasonPassElitePlusBenefitsView(config,{seasonId});
const plans=[];
const env={DB:{prepare:sql=>({bind:(...binds)=>({sql,binds})})}};
const tierContext=()=>({season:{id:seasonId,tierSettings:{elitePlus:checkView()}},telegramId:'test-player'});
const expectBlocked=async()=>{
  await assert.rejects(()=>context.elitePlusBenefitPlan(env,tierContext(),{xp:0},123),e=>e.status===409);
};
// Released Season 3 content is available from the Season Pass even when manual giveaway is disabled.
rules=new Map([
  ['frame:s3frame',published('season_pass')],
  ['avatar:s3avatar',published('seasonal_case')]
]);
let view=checkView();
assert.deepEqual(Array.from(view.cosmetics,x=>x.title),['Садовый бант','Аватарка Белкино']);
assert(view.cosmetics.every(x=>x.released===true&&x.kind!=='secret'));
let publicView=context.seasonPassPublicTierSettings({id:seasonId,tierSettings:{elitePlus:view}});
assert(publicView.elitePlus.cosmetics.every(x=>x.kind!=='secret'));
let plan=await context.elitePlusBenefitPlan(env,tierContext(),{xp:0},123);
assert.equal(plan.received.length,2);
assert.deepEqual(Array.from(plan.received,x=>x.title),['Садовый бант','Аватарка Белкино']);
assert(plan.statements.some(x=>x.sql.includes("premium_tier='elite_plus'")));
assert(plan.statements.filter(x=>x.sql.includes('INSERT OR IGNORE INTO season_pass_entitlements')).length===2);
assert.equal(ruleReads,1);
// Do not leak unpublished, foreign-season or shop-only cosmetics.
for(const bad of [
  {released:false,seasonId,routes:{season_pass:{enabled:true,destinationId:seasonId}}},
  published('season_pass','season-4'),
  published('shop'),
  {released:true,seasonId,routes:{season_pass:{enabled:true,destinationId:'season-4'}}},
  null
]){
  rules.set('frame:s3frame',bad);
  view=checkView();
  assert.equal(view.cosmetics[0].released,false);
  assert.equal(context.seasonPassPublicTierSettings({id:seasonId,tierSettings:{elitePlus:view}}).elitePlus.cosmetics[0].kind,'secret');
  await expectBlocked();
}
// Historical manual-only release remains supported for the matching season, but cannot expose cross-season art.
rules.set('frame:s3frame',published('manual'));
assert.equal(checkView().cosmetics[0].kind,'frame');
rules.set('frame:s3frame',published('manual','other-season'));
assert.equal(checkView().cosmetics[0].released,false);
// Acquisition guide should use this same check (no independent manual-only interpretation).
assert(worker.includes('if(seasonPassElitePlusCosmeticAllowed(item.kind,item.itemId,season.season_id,rules.get('));
// Normal (non future-season) catalog entries are not hidden by this gate.
assert.equal(context.seasonPassElitePlusCosmeticAllowed('frame','evergreen-frame',seasonId,null),true);
console.log('Elite+ cosmetic publication test PASS: published S3 frame/avatar, tier grant, season guard, hidden states, album acquisition.');
