import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedFundClient,sharedFundQuote,mapStateWithFund} from '../story/shared-fund.js';
import {createDemoState} from '../story/model.js';
import {buildStoryMap,validateStoryMap,STORY_FESTIVAL_KINDS} from '../story/map.js';
const payload=()=>({ok:true,mode:'shared-fund',globalSync:true,walletWrites:true,
 projects:{garden:{id:'garden',title:'Сад встреч',goal:1000000,total:0,stage:0,revision:0,next:1000000,finished:false,milestones:[1000000]},festival:{id:'festival',title:'Дом фестивалей Зеффи',goal:50000000,total:0,stage:0,revision:0,next:12500000,finished:false,milestones:[12500000,30000000,50000000]}},viewer:{walletPoints:6000000,contributedPoints:{garden:0,festival:0}}});
test('client only sends the signed Telegram string in authenticated same-origin POST',async()=>{
 let calls=0;const fetchFn=async(path,opts)=>{calls++;assert.equal(path,'/api/world/community/state');assert.equal(opts.method,'POST');assert.equal(opts.credentials,'same-origin');assert.equal(opts.cache,'no-store');const body=JSON.parse(opts.body);assert.equal(body.initData,'signed-token-example');return {ok:true,json:async()=>payload()};};
 const client=createSharedFundClient('signed-token-example',{fetchFn});const r=await client.load();assert.equal(calls,1);assert.equal(r.projects.festival.total,0);assert.equal(r.walletPoints,6000000);
});
test('client does not accept unsigned sessions, invalid server payloads or fake wallet numbers',async()=>{
 assert.throws(()=>createSharedFundClient(''),/Telegram/);
 for(const value of [{...payload(),globalSync:false},{...payload(),viewer:{walletPoints:-5,contributedPoints:{garden:0,festival:0}}},{...payload(),projects:{...payload().projects,garden:{...payload().projects.garden,total:99999999999999}}}]){
  const c=createSharedFundClient('valid',{fetchFn:async()=>({ok:true,json:async()=>value})});await assert.rejects(()=>c.load());
 }
});
test('quotes do not pass the next festival milestone, and stage progresses only with server view',()=>{
 const p={id:'festival',total:12400000,next:12500000,goal:50000000,revision:7,finished:false};
 assert.deepEqual(sharedFundQuote(p,2000000),{projectId:'festival',amountPoints:2000000,expectedDebitPoints:100000,expectedRevision:7});
 assert.equal(sharedFundQuote({...p,finished:true},2000000),null);
 assert.equal(sharedFundQuote(p,3000000),null);
 const local=createDemoState();local.chapter=1;local.festival={community:30000000,personal:5000000,credits:0};
 const remote=payload();remote.projects.festival.total=12500000;remote.projects.festival.stage=1;
 const x=mapStateWithFund(local,remote);assert.equal(x.festival.community,12500000);assert.equal(x.festival.personal,0);
 assert.equal(buildStoryMap(x).objects.find(o=>o.uid==='story-festival').kind,STORY_FESTIVAL_KINDS.stage_b);
 assert.equal(local.festival.community,30000000,'no local save mutation');
});
test('garden stays visible while stage advances with authoritative common fund; story chapter is independent',()=>{
 const s=createDemoState();s.project.personal=800;const notReady=mapStateWithFund(s,payload());assert.equal(notReady.chapter,0);assert.equal(buildStoryMap(notReady).objects.find(o=>o.uid==='story-community-garden')?.kind,'story-meeting-garden-01');
 const remote=payload();remote.projects.garden.finished=true;remote.projects.garden.total=1000000;remote.projects.garden.stage=1;
 const city=buildStoryMap(mapStateWithFund(s,remote));assert.equal(city.objects.find(o=>o.uid==='story-community-garden')?.kind,'story-meeting-garden-10');assert.ok(!city.objects.some(o=>o.uid==='story-festival'));assert.deepEqual(validateStoryMap(city),[]);
});
test('real contribution must use server quote; client does not invent or deduct local wallets',async()=>{
 const p=payload(),calls=[];const fetchFn=async(path,opts)=>{calls.push({path,opts:JSON.parse(opts.body)});return {ok:true,json:async()=>({...p,receipt:{requestId:'fund-donation-001',projectId:'garden',debitedPoints:100000},repeated:false})};};
 const client=createSharedFundClient('SIGNED',{fetchFn});await client.contribute({projectId:'garden',amountPoints:100000,expectedDebitPoints:100000,expectedRevision:0,requestId:'fund-donation-001'});
 assert.equal(calls[0].path,'/api/world/community/contribute');assert.equal(calls[0].opts.initData,'SIGNED');assert.equal(calls[0].opts.amountPoints,100000);assert.equal(p.viewer.walletPoints,6000000);
});
