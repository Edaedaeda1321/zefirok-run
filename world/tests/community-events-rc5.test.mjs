import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMMUNITY_PROJECTS} from '../../src/zeffi-community-fund.js';
import {COMMUNITY_EVENT_DEFINITIONS,communityChronicle,communityEvent,newlyReachedCommunityEvents,communityVisualPlan,paintCommunityScene} from '../story/community-events.js';
const snapshot=(garden=0,festival=0)=>({projects:Object.fromEntries([['garden',garden],['festival',festival]].map(([id,total])=>{
 const definition=COMMUNITY_PROJECTS[id];return [id,{id,total,goal:definition.goal,revision:total,stage:definition.milestones.filter(n=>total>=n).length,milestones:[...definition.milestones]}];}))});
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');

test('RC-5 thresholds are strictly presentation-only and match the authoritative two D1 projects',()=>{
 assert.deepEqual(Object.keys(COMMUNITY_EVENT_DEFINITIONS).sort(),Object.keys(COMMUNITY_PROJECTS).sort());
 for(const [id,definition] of Object.entries(COMMUNITY_PROJECTS)){
  const entry=COMMUNITY_EVENT_DEFINITIONS[id];
  assert.equal(entry.goal,definition.goal);
  assert.deepEqual(entry.stages,[...definition.milestones]);
  assert.equal(entry.events.at(-1)[1],definition.goal);
  assert.ok(entry.events.every((row,i)=>row[1]>0&&row[1]<=entry.goal&&(i===0||row[1]>entry.events[i-1][1])));
  assert.equal(new Set(entry.events.map(e=>e[0])).size,entry.events.length);
 }
 assert.equal(COMMUNITY_EVENT_DEFINITIONS.garden.events.length,4);
 assert.equal(COMMUNITY_EVENT_DEFINITIONS.festival.events.length,6);
});

test('garden RC-5 events unlock at exactly 25/50/75/100%, not a pixel earlier',()=>{
 const marks=[250000,500000,750000,1000000];
 for(const [i,target] of marks.entries()){
  const below=communityChronicle(snapshot(target-1),'garden');
  const reached=communityChronicle(snapshot(target),'garden');
  assert.equal(below.achieved,i);
  assert.equal(reached.achieved,i+1);
  assert.equal(reached.latest.threshold,target);
  assert.equal(reached.next?.threshold,marks[i+1]);
  assert.equal(Boolean(communityEvent(snapshot(target-1),reached.latest.id)),false);
  assert.equal(communityEvent(snapshot(target),reached.latest.id)?.complete,true);
 }
});

test('festival RC-5 tracks intermediate and actual D1 stage milestones separately',()=>{
 const markers=[5000000,12500000,20000000,30000000,40000000,50000000];
 const stages=[0,1,1,2,2,3];
 markers.forEach((mark,i)=>{
  const b=communityChronicle(snapshot(0,mark-1),'festival'),a=communityChronicle(snapshot(0,mark),'festival');
  assert.equal(a.achieved,i+1);
  assert.equal(a.stage,stages[i]);
  assert.equal(b.achieved,i);
  assert.equal(a.percent,Math.floor(mark/500000));
 });
 assert.equal(communityChronicle(snapshot(0,50000000),'festival').finished,true);
});

test('invalid or forged non-authoritative snapshots are never shown as fulfilled',()=>{
 const good=snapshot(500000,30000000);
 for(const wrong of [null,{},[],{projects:{}},{projects:{garden:{...good.projects.garden,goal:1},festival:good.projects.festival}},
 {projects:{garden:{...good.projects.garden,stage:2},festival:good.projects.festival}},
 {projects:{garden:{...good.projects.garden,total:Number.MAX_SAFE_INTEGER},festival:good.projects.festival}},
 {projects:{garden:{...good.projects.garden,milestones:[500000]},festival:good.projects.festival}}]){
  assert.equal(communityChronicle(wrong,'garden'),null);
  assert.equal(communityEvent(wrong,'garden-flowers'),null);
 }
 assert.deepEqual(communityVisualPlan(null,1),[]);
 assert.deepEqual(communityVisualPlan({},1),[]);
});

test('no retroactive popups on initial signed read, and polling does not repeat milestones',()=>{
 const a=snapshot(249999,4999999),b=snapshot(500000,12500000);
 assert.deepEqual(newlyReachedCommunityEvents(null,b),[]);
 const events=newlyReachedCommunityEvents(a,b);
 assert.deepEqual(events.map(e=>e.id),['garden-seeds','garden-flowers','festival-supplies','festival-foundation']);
 assert.deepEqual(newlyReachedCommunityEvents(b,b),[]);
 assert.deepEqual(newlyReachedCommunityEvents(b,a),[]);
 assert.deepEqual(newlyReachedCommunityEvents(snapshot(500000,12500000),snapshot(500000,12500000)),[]);
});

test('Festival civic visual effects remain hidden until the signed story chapter unlocks',()=>{
 const state=snapshot(1000000,50000000);
 assert.deepEqual(communityVisualPlan(state,0).map(p=>p.id),['garden']);
 assert.deepEqual(communityVisualPlan(state,1).map(p=>p.id),['garden','festival']);
 assert.deepEqual(communityVisualPlan(snapshot(),1).map(p=>p.reached),[0,0]);
});

test('paint layer is a bounded, screen-culled draw; it never edits canvas/save data or funds',()=>{
 const calls=[];
 const ctx={save(){calls.push('save');},restore(){calls.push('restore');},setTransform(){},translate(){},scale(){},beginPath(){},ellipse(){},fill(){},moveTo(){},lineTo(){},quadraticCurveTo(){},roundRect(){},stroke(){},closePath(){},rotate(){},
 set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){}};
 const canvas={getContext:()=>ctx},before=JSON.stringify(snapshot(750000,30000000));
 const model=snapshot(750000,30000000);
 assert.equal(paintCommunityScene(canvas,{x:0,y:0,zoom:1},{width:350,height:600},null,0),0);
 assert.equal(paintCommunityScene(canvas,{x:50000,y:50000,zoom:1},{width:350,height:600},model,0,{chapter:1}),0);
 assert.equal(paintCommunityScene(canvas,{x:0,y:0,zoom:.25},{width:350,height:600},model,0,{chapter:1}),0);
 assert.ok(paintCommunityScene(canvas,{x:0,y:0,zoom:.8},{width:390,height:700},model,0,{chapter:1,animate:false})>=0);
 assert.deepEqual(model,snapshot(750000,30000000));
 assert.equal(before,JSON.stringify(model));
 assert.equal(calls.filter(s=>s==='save').length,calls.filter(s=>s==='restore').length);
});

test('source wiring keeps authenticated requests, existing payment confirmation and story state intact',()=>{
 const app=read('../story/app.js'),boot=read('../story/boot.js'),page=read('../../story-world.html'),css=read('../story/community-events.css'),fund=read('../../src/zeffi-community-fund.js');
 assert.match(app,/paintCommunityScene\(canvas,cam,size,sharedSnapshot/);
 assert.match(app,/newlyReachedCommunityEvents\(sharedSnapshot,next\)/);
 assert.match(app,/if\(liveMode&&sharedSnapshot\)paintCommunityScene/);
 assert.match(app,/chronicleMarkup\('garden'\)/);
 assert.match(app,/chronicleMarkup\('festival'\)/);
 assert.match(app,/sharedClient\.contribute\(pendingDonation\)/);
 assert.match(app,/pendingDonation=\{\.\.\.quote,requestId\}/);
 assert.match(app,/if\(liveMode&&\['contribute','festival-contribute','materials'/);
 assert.match(boot,/payload\?\.access!=='tester'/);
 assert.match(boot,/await import\('\.\/app\.js\?v=palace1'\)/);
 assert.match(page,/\.\/story\/community-events\.css\?v=rc-community5/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(fund,/await db\.batch\(statements\)/);
 assert.doesNotMatch(read('../story/community-events.js'),/\bfetch\(|localStorage|\bUPDATE\b|\/api\/world\/|\.batch\(/);
 const gate=read('../../scripts/check-production-gate.mjs');
 assert.match(gate,/community-events-rc5\.test\.mjs/);
});
