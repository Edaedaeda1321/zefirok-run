import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createDemoState,sanitizeDemoState,festivalTotal,festivalStage,festivalNextGoal,contributeFestival,simulateFestivalHelp,addFestivalDemoPoints,setWhiteRabbitPreview,setDemoChapter,FESTIVAL_GOAL,FESTIVAL_MILESTONES,FESTIVAL_AMOUNTS,saveDemo,loadDemo} from '../story/model.js';
import {buildStoryMap,validateStoryMap,STORY_CATALOG,STORY_FESTIVAL_KINDS,placeById} from '../story/map.js';
import {catalogSpriteId,buildingAssetId,spriteMetadata,spriteManifest,preloadBuildFrames} from '../sprite-assets.js';
import {CATALOG} from '../catalog.js';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const initial=()=>setDemoChapter(createDemoState(),1);
const funded=(a,b=0)=>{const s=initial();s.festival={personal:a,community:b,credits:60_000_000};return s;};
const snapshot=o=>JSON.stringify(o);
test('festival: four cumulative milestones and 50M goal remain stable',()=>{
 assert.deepEqual(FESTIVAL_MILESTONES,[12_500_000,30_000_000,50_000_000]);
 assert.equal(FESTIVAL_GOAL,50_000_000);
 for(const [total,stage,next] of [[0,'stage_a',12_500_000],[12_499_999,'stage_a',12_500_000],[12_500_000,'stage_b',30_000_000],[29_999_999,'stage_b',30_000_000],[30_000_000,'stage_c',50_000_000],[49_999_999,'stage_c',50_000_000],[50_000_000,'complete',50_000_000]]){
  const s=funded(total);assert.equal(festivalStage(s),stage);assert.equal(festivalNextGoal(s),next);
 }
});
test('festival: a single donation cannot skip the next construction milestone',()=>{
 const s=funded(12_000_000);const prev=snapshot(s);
 const r=contributeFestival(s,5_000_000);
 assert.equal(r.accepted,500_000);assert.equal(festivalTotal(r.state),12_500_000);assert.equal(festivalStage(r.state),'stage_b');
 assert.equal(r.state.festival.credits,59_500_000);assert.equal(snapshot(s),prev);
 const later=contributeFestival(r.state,5_000_000);assert.equal(festivalTotal(later.state),17_500_000);assert.equal(festivalStage(later.state),'stage_b');
});
test('festival: later stages advance only at their funding threshold and finish once',()=>{
 const s=funded(29_500_000);const a=contributeFestival(s,5_000_000);
 assert.equal(a.accepted,500_000);assert.equal(festivalStage(a.state),'stage_c');
 const b=contributeFestival(funded(49_700_000),1_000_000);
 assert.equal(b.accepted,300_000);assert.equal(festivalStage(b.state),'complete');
 assert.throws(()=>contributeFestival(b.state,100_000),/FESTIVAL_COMPLETE/);
 assert.throws(()=>simulateFestivalHelp(b.state),/FESTIVAL_COMPLETE/);
});
test('festival: contributions are demo-only, reject locked chapter, unknown amounts and insufficient demo points',()=>{
 const s=createDemoState(),snapshotBefore=snapshot(s);
 assert.throws(()=>contributeFestival(s,100_000),/FESTIVAL_CHAPTER_LOCKED/);
 const a=initial();const before=snapshot(a);
 for(const amount of [0,1,50_000,50_000_001,-100_000,'100000'])assert.throws(()=>contributeFestival(a,amount),/FESTIVAL_INVALID_AMOUNT/);
 assert.throws(()=>contributeFestival({...a,festival:{...a.festival,credits:1}},100_000),/INSUFFICIENT_FESTIVAL_DEMO_POINTS/);
 assert.equal(snapshot(a),before);assert.equal(snapshot(s),snapshotBefore);
 assert.deepEqual(a.project,s.project);assert.deepEqual(a.visited,s.visited);
});
test('festival: simulated donations are local and respect the NEXT milestone',()=>{
 const s=funded(11_500_000);const a=simulateFestivalHelp(s);
 assert.equal(a.accepted,1_000_000);assert.equal(festivalStage(a.state),'stage_b');
 assert.equal(a.state.festival.personal,s.festival.personal);
 assert.equal(a.state.festival.credits,s.festival.credits);
});
test('festival: bounded demo top-ups never touch live wallet and never overflow',()=>{
 const s=initial();const added=addFestivalDemoPoints(s);
 assert.equal(added.festival.credits,7_000_000);
 assert.equal(s.festival.credits,2_000_000);
 const max=addFestivalDemoPoints({...s,festival:{...s.festival,credits:60_000_000}});
 assert.equal(max.festival.credits,60_000_000);
});
test('festival: older story v1 saves gain zero contribution without losing prior garden data',()=>{
 const raw={version:1,chapter:1,project:{community:800,personal:50,startedAt:0,readyAt:0,opened:false},materials:125,visited:['cafe']};
 const s=sanitizeDemoState(raw);assert.equal(s.project.community,800);assert.equal(s.project.personal,50);assert.equal(s.chapter,1);
 assert.deepEqual(s.festival,{personal:0,community:0,credits:2_000_000});
 assert.equal(s.whiteRabbitPreview,0);
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(saveDemo(storage,s),true);
 assert.equal(loadDemo(storage).state.festival.community,0);
});
test('festival: corrupt donation/save fields are clamped; stage can never exceed 50M',()=>{
 for(const bad of [undefined,null,'text',{'festival':{personal:Infinity,community:-1,credits:-200}}, {version:1,chapter:1,festival:{personal:48_000_000,community:20_000_000,credits:Infinity}}, {version:1,chapter:1,festival:{personal:999999999999999,community:999999999999999}}]){
  const s=sanitizeDemoState(bad);assert.ok(Number.isSafeInteger(festivalTotal(s)));assert.ok(festivalTotal(s)>=0&&festivalTotal(s)<=FESTIVAL_GOAL);
  assert.ok(Number.isSafeInteger(s.festival.credits)&&s.festival.credits<=60_000_000);
  assert.deepEqual(validateStoryMap(buildStoryMap(s)),[]);
 }
});
test('festival: story map contains exactly one 6x6 hall and preserves existing pedestrian, bus and garden locations',()=>{
 for(const stage of ['stage_a','stage_b','stage_c','complete']){
  const total={stage_a:0,stage_b:12_500_000,stage_c:30_000_000,complete:50_000_000}[stage];
  const s=funded(total),city=buildStoryMap(s);
  assert.deepEqual(validateStoryMap(city),[],stage);
  const halls=city.objects.filter(o=>o.uid==='story-festival');assert.equal(halls.length,1);
  assert.equal(halls[0].kind,STORY_FESTIVAL_KINDS[stage]);assert.deepEqual([halls[0].x,halls[0].y],[22,33]);
  assert.deepEqual([STORY_CATALOG[halls[0].kind].w,STORY_CATALOG[halls[0].kind].h],[6,6]);
  assert.equal(city.objects.filter(o=>o.uid==='story-cafe').length,1);
  assert.equal(city.objects.filter(o=>o.uid==='story-pond').length,1);
  assert.ok(city.busRoads.length>60);assert.ok(city.crosswalks.length>=7);
 }
 const closed=buildStoryMap(createDemoState());assert.equal(closed.objects.filter(o=>o.uid==='story-festival').length,0);
});
test('festival: 16 independent alpha WebP frames resolve across every facing without entering the paid player shop',()=>{
 assert.equal(CATALOG['story-festival-stage-a'],undefined);
 assert.equal(CATALOG['story-festival-complete'],undefined);
 const ids=new Set();
 for(const stage of Object.values(STORY_FESTIVAL_KINDS))for(let rot=0;rot<4;rot++){
  const id=catalogSpriteId(stage,rot);assert.ok(id,`${stage}/${rot}`);ids.add(id);
  const meta=spriteMetadata(id);assert.deepEqual(meta.footprint,[6,6]);
  const filename=file(`../${meta.fileWebp}`);assert.ok(existsSync(filename));assert.ok(statSync(filename).size>10000);
  assert.equal(meta.directionVerified,false);
 }
 assert.equal(ids.size,16);
});
test('white rabbit: all six supplied frames change by build progress, not only three old placeholder stages',()=>{
 const build=(p)=>buildingAssetId('white-rabbit-zephirok',0,'build_01',p);
 const ids=new Set([0,.166667,.333334,.5,.666667,.833334].map(build));
 assert.equal(ids.size,6);
 assert.equal(build(.99999),'wrz_build_06');
 assert.equal(buildingAssetId('white-rabbit-zephirok',0,'build_02'),'wrz_build_03');
 assert.equal(buildingAssetId('white-rabbit-zephirok',0,'build_03'),'wrz_build_05');
 for(const id of ids){const m=spriteMetadata(id);assert.ok(m);assert.deepEqual(m.footprint,[4,4]);assert.ok(existsSync(file(`../${m.fileWebp}`)));}
});
test('white rabbit: completed paid landmark stays the same original four-direction asset and 15-min duration',()=>{
 const complete=new Set();for(let r=0;r<4;r++)complete.add(catalogSpriteId('white-rabbit-zephirok',r));
 assert.equal(complete.size,4);assert.ok([...complete].every(id=>id.startsWith('wrz_v1_')));
 assert.equal(CATALOG['white-rabbit-zephirok'].buildMs,900000);
 assert.deepEqual([CATALOG['white-rabbit-zephirok'].w,CATALOG['white-rabbit-zephirok'].h],[4,4]);
});
test('white rabbit: story preview can show six supplied phases without modifying actual ownership',()=>{
 const base=initial();for(let i=1;i<=6;i++){
  const s=setWhiteRabbitPreview(base,i);const c=buildStoryMap(s);
  assert.equal(c.objects.filter(o=>o.uid==='story-cafe').length,1);assert.equal(c.objects.find(o=>o.uid==='story-cafe').kind,`story-wr-stage-${i}`);
  assert.equal(catalogSpriteId(`story-wr-stage-${i}`),`wrz_build_0${i}`);
  assert.deepEqual(validateStoryMap(c),[]);
 }
 assert.throws(()=>setWhiteRabbitPreview(base,7),/INVALID_WHITE_RABBIT_STAGE/);
 assert.equal(base.whiteRabbitPreview,0);
});
test('asset manifests: WebP-only count and SHA files register 22 new images',()=>{
 const ids=spriteManifest.assets.filter(a=>['story-festival-hall-v1','white-rabbit-construction-v1'].includes(a.packId));
 assert.equal(ids.length,22);
 const paths=new Set(ids.map(a=>a.fileWebp));assert.equal(paths.size,22);
 for(const asset of ids){assert.ok(existsSync(file('../'+asset.fileWebp)));assert.ok(!asset.fileWebp.endsWith('.png'));assert.ok(Array.isArray(asset.groundAlphaBounds));}
 const app=readFileSync(file('../story/app.js'),'utf-8');
 assert.ok(app.includes("data-action=\"festival-contribute\""));
 assert.ok(app.includes('local-demo')||app.includes('локальный тест')||app.includes('локальных тестовых'));
 assert.ok(!app.includes('/api/world/mutate'));
});


test('map-first story UI exposes both construction projects without restoring obsolete UI bars',()=>{
 const html=readFileSync(file('../../story-world.html'),'utf-8');
 const app=readFileSync(file('../story/app.js'),'utf-8');
 assert.ok(html.includes('data-nav="buildings"')&&html.includes('data-nav="history"'));
 assert.ok(!html.includes('id="districtStrip"')&&!html.includes('id="miniMap"'));
 for(const token of ['data-action="festival-project"','data-action="festival-contribute"','data-action="festival-topup"','data-wr-stage=',"if(id==='festival'&&isPlaceOpen(place,worldState()))"])
  assert.ok(app.includes(token),token);
 assert.ok(app.includes("else if(action==='open-rabbit')openPlace('rabbit')"));
 assert.ok(!app.includes("$('bannerArt')")&&!app.includes("$('districtStrip')"));
});

test('construction sprites remain ground-docked across all 22 authored WebPs', async()=>{
 const {worldSpriteVisualDock}=await import('../renderer.js');
 for(const [kind,rot,id] of [
  ...Object.values(STORY_FESTIVAL_KINDS).flatMap(kind=>[0,1,2,3].map(rot=>[kind,rot,catalogSpriteId(kind,rot)])),
  ...Array.from({length:6},(_,i)=>{const kind=`story-wr-stage-${i+1}`;return [kind,0,catalogSpriteId(kind,0)];})
 ]){
  const meta=spriteMetadata(id),dock=worldSpriteVisualDock(meta,STORY_CATALOG[kind],rot);
  assert.ok(dock&&Object.values(dock).every(Number.isFinite),`${kind}/${rot}: invalid anchor`);
  assert.ok(dock.assetScale>1&&dock.assetScale<8,`${kind}/${rot}: broken scale`);
 }
});

test('signed story entry still precedes app load and home-to-personal navigation is preserved',()=>{
 const page=readFileSync(file('../../story-world.html'),'utf8');
 const boot=readFileSync(file('../story/boot.js'),'utf8');
 const app=readFileSync(file('../story/app.js'),'utf8');
 assert.ok(page.includes('./story/boot.js?v=currency-icons1'));
 assert.ok(boot.indexOf("payload?.access!=='tester'")<boot.indexOf("await import('./app.js?v=currency-icons1')"));
 assert.ok(boot.includes("fetch('/api/world/story-access'"));
 assert.ok(app.includes("window.parent.postMessage({type:'zefirok-world-switch',view:'personal'},location.origin)"));
 assert.ok(!app.includes('/api/world/mutate')); // Tutorials may persist UI-only progress; no city purchases.
});
