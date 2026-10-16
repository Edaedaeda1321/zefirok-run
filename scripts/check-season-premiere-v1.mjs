#!/usr/bin/env node
/* Static + pure-function regression checks, no remote D1 and no game mutations. */
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=process.cwd();
const paths=['src/worker.js','index.html','battle-pass.html','rating.html','owner.html'];
const content=Object.fromEntries(await Promise.all(paths.map(async p=>[p,await readFile(resolve(root,p),'utf8')])));
const worker=content['src/worker.js'];
function expect(pattern,source,description){assert.match(source,pattern,description)}
function occurrences(source,needle){return source.split(needle).length-1}
expect(/SEASON_PREMIERE_V1_PRESENTATION/,worker,'server premiere normalization');
expect(/patch\.premiere=\{\}/,worker,'server owner save should persist premieres');
expect(/premiere,?multiplier:active\?2:1/,worker,'startup metadata comes from existing pass bonus');
expect(/seasonPremierePatchView\(env,ctx\.body\.premiere\)/,worker,'rating presentation validated');
expect(/sessionStorage\.setItem\(SESSION_KEY,k\)/,content['battle-pass.html'],'session limit in shared runtime');
for(const page of ['index.html','battle-pass.html','rating.html','owner.html']){
 assert.equal(occurrences(content[page],'id="zsp-season-premiere-runtime-v1"'),1,`${page}: exactly one presentation runtime`);
 assert.equal(occurrences(content[page],'id="zsp-season-premiere-style-v1"'),1,`${page}: exactly one presentation style`);
}
expect(/event\.source!==frame\(\)\?\.contentWindow/,content['index.html'],'main iframe trusted source');
expect(/event\.origin!==window\.location\.origin/,content['index.html'],'main message origin');
expect(/window\.parent\.location\.origin/,content['index.html'],'child postMessage targets only its parent origin');
expect(/spSeason\.status==='active'/,content['battle-pass.html'],'pass triggers only active season');
expect(/seasonTutorialBlocksAutoPopups\(\)/,content['battle-pass.html'],'pass tutorial is respected');
expect(/ratingFinaleData\(cache\.season\)/,content['rating.html'],'rating finale priority intact');
expect(/pendingFinale/,content['rating.html'],'rating suppresses premiere until finale seen');
for(const key of ['zspCcMainEnabled','zspCcPassEnabled','zspCcRatingEnabled'])expect(new RegExp(key),content['owner.html'],`${key} CC control`);
expect(/payload\.premiere=\{main:zspCcRead\('Main'\),pass:zspCcRead\('Pass'\)\}/,content['owner.html'],'pass and main saved together');
expect(/premiere:zspCcRead\('Rating'\)/,content['owner.html'],'rating saved separately');
const start=worker.indexOf('// SEASON_PREMIERE_V1_PRESENTATION'),end=worker.indexOf('async function requireSeasonVisualsSchema',start);
assert(start>=0&&end>start,'extract pure function source');
const ctx=vm.createContext({seasonPassReadinessAssetPath:v=>String(v||'').startsWith('/assets/')?v:'',seasonVisualsObject:s=>typeof s==='string'?JSON.parse(s):{...s},seasonStoryCollectibleView:x=>x||{},validateSeasonVisualHeroImage:async(_env,v)=>v,seasonPassReadinessImageManifest:async()=>({available:true,paths:new Set()})});
vm.runInContext(worker.slice(start,end)+'\nthis.view=seasonVisualsView;this.merge=seasonVisualsMerge;this.validate=seasonPremierePatchView;',ctx);
const current={battlePass:{heroImage:'/assets/example.webp',tasks:{sectionIcon:'/assets/ui/icon_battlepass.webp'},storyCollectible:{enabled:true,id:'original'},premiere:{main:{enabled:false,title:'Old main'},pass:{enabled:true,title:'Old pass'}}},rating:{heroImage:'/assets/rating/example.webp',premiere:{enabled:true,title:'Old rating'}}};
const updated=JSON.parse(ctx.merge(JSON.stringify(current),'battlePass',{premiere:{main:{enabled:true,title:'Fresh main'}}}));
assert.equal(updated.battlePass.tasks.sectionIcon,'/assets/ui/icon_battlepass.webp');
assert.equal(updated.battlePass.storyCollectible.id,'original');
assert.equal(updated.battlePass.premiere.main.title,'Fresh main');
assert.equal(updated.battlePass.premiere.pass.title,'Old pass');
const ratingUpdated=JSON.parse(ctx.merge(JSON.stringify(current),'rating',{heroImage:'/assets/rating/new.webp',premiere:{enabled:false,title:'Closed'}}));
assert.equal(ratingUpdated.rating.heroImage,'/assets/rating/new.webp');
assert.equal(ratingUpdated.rating.premiere.enabled,false);
const visual=ctx.view(JSON.stringify(updated));
assert.equal(visual.battlePass.premiere.main.title,'Fresh main');
assert.equal(visual.battlePass.premiere.pass.enabled,true);
assert.equal(visual.rating.premiere.enabled,true);
const clipped=await ctx.validate(null,{enabled:true,title:'T'.repeat(130),features:['A','B','C','D'],imageUrl:'/assets/myimage.webp'});
assert.equal(clipped.title.length,90);assert.equal(clipped.features.length,3);
// Test eligibility without DOM/remote calls; false or scheduled windows stay closed.
const ui=await readFile(resolve(root,'scripts/season-premiere/ui.js'),'utf8');
assert(!/\bfetch\s*\(/.test(ui),'UI must not make additional network requests');
const windowStub={};let timeoutCount=0;
const uiContext=vm.createContext({window:windowStub,setTimeout:()=>{timeoutCount+=1;return timeoutCount},clearTimeout:()=>{},console});
vm.runInContext(ui,uiContext);
const season={surface:'main',id:'s42',userId:'player',status:'active',premiere:{enabled:true}};
assert.equal(windowStub.ZeffiSeasonPremiere.consider({...season,status:'upcoming'}),false);
assert.equal(windowStub.ZeffiSeasonPremiere.consider({...season,premiere:{enabled:false}}),false);
assert.equal(windowStub.ZeffiSeasonPremiere.consider(season),true);
assert.equal(timeoutCount,1,'only eligible active premiere should schedule a display');
for(const asset of ['/assets/ui/icon_battlepass.webp','/assets/ui/icon_itog_reiting_season.webp','/assets/season-pass/season.webp','/assets/season-pass/quest.webp','/assets/season-pass/elite.webp','/assets/rating/v8/season-1-cafe-opening.webp'])await access(resolve(root,asset.slice(1)));
for(const file of ['scripts/season-premiere/ui.js','scripts/season-premiere/cc-editor.js']){const t=await readFile(resolve(root,file),'utf8');assert(!/[\u{1F300}-\u{1FAFF}]/u.test(t),file+' contains emoji');}
console.log('Season Premiere V1: 31 server, UI, client and CC invariants passed. No D1 queries.');
