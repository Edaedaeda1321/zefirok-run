#!/usr/bin/env node
// Standalone regression checks for case-level background visuals; never touches real D1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(process.argv[2]||process.cwd());
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const worker=read('src/worker.js'),owner=read('owner.html'),client=read('battle-pass.html'),gate=read('scripts/check-production-gate.mjs');
let pass=0;
function test(name,check){check();pass++;console.log('PASS '+name);}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,`function not found: ${start}`);return source.slice(a,b);}
const service=section(worker,'function seasonPassSeasonalCaseBackgroundImage(value){','function seasonPassSeasonalCaseWeightedPick(');
const cSection=section(client,'  function seasonalCaseBackgroundUrl(meta){','  function seasonalCaseOpeningEls(){');
const ctx=vm.createContext({
 safeJson:(x,d)=>{try{return JSON.parse(x)}catch{return d}},
 seasonPassReadinessAssetPath:(v)=>{const s=String(v||'').trim();return s.startsWith('/assets/')&&!s.includes('..')&&!s.includes('\\')?s.split(/[?#]/)[0]:'';}
});
vm.runInContext(`${service}\n${cSection}`,ctx);
const fun=(name)=>(...args)=>vm.runInContext(name,ctx)(...args);
const get=fun('seasonPassSeasonalCaseBackgroundImage'),pack=fun('seasonPassSeasonalCaseSettings'),odds=fun('seasonPassSeasonalCaseGroupChances'),url=fun('seasonalCaseBackgroundUrl'),style=fun('seasonalCaseBackgroundStyle');
const s3='/assets/season/s3/minigame/currency/belkina_background_season3.webp';
const s2='/assets/optimized/v0.79.5/background_season2.webp';
test('distinct cases can keep independent backgrounds',()=>{
 const a=pack({currency:25,cosmetic:70,case:5},s3);
 const b=pack({currency:100,cosmetic:0,case:0},s2);
 assert.equal(get(JSON.stringify(a)),s3);assert.equal(get(JSON.stringify(b)),s2);
 assert.deepEqual(JSON.parse(JSON.stringify(odds(a))),{cosmetic:70,currency:25,case:5});
});
test('clear reverts to automatic fallback without changing reward chances',()=>{
 const c=pack({currency:40,cosmetic:60,case:0},'');assert.equal(get(JSON.stringify(c)),'');
 assert.equal(odds(c).currency,40);
});
test('invalid background strings cannot become a CSS URL',()=>{
 for(const bad of ['https://evil.example/test.webp','javascript:alert(1)','/assets/../secret.webp',"/assets/a');color:red;/*.webp"]){
  assert.equal(get(JSON.stringify({visuals:{backgroundImageUrl:bad}})), '');
  assert.notEqual(url({title:'Тайны Белкино',backgroundImageUrl:bad}),bad);
 }
});
test('Belkino uses Season 3 immediately; Season 2 remains only its own fallback',()=>{
 assert.equal(url({title:'Сезонный кейс',seasonTitle:'Сезон 3 — Тайны Белкино'}),s3);
 assert.equal(url({title:'Ночь сладких чудес'}),s2);
 assert.notEqual(url({title:'Неизвестный кейс'}),s2);
});
test('custom art overrides Belkino and persists into all opening phases',()=>{
 const custom='/assets/optimized/v0.79.5/white_rabbit_background_season4.webp';
 const meta={title:'Тайны Белкино',backgroundImageUrl:custom};
 assert.equal(url(meta),custom);
 assert.ok(style(meta).includes(custom));assert.ok(style(meta,'--case-xp-duration:500ms').includes('duration:500ms'));
 for(const cls of ['xp-preparing','xp-status','xp-opening','xp-reveal'])assert.match(client,new RegExp(`seasonal-case-${cls}[^\\n]+seasonalCaseBackgroundStyle\\(`));
});
test('all late CSS rules use a per-case background, with no hard-coded Season 2 URL',()=>{
 const css=client; // Multiple style blocks; late !important overrides also count.
 assert.equal((css.match(/url\('\/assets\/optimized\/v0\.79\.5\/background_season2\.webp'\)/g)||[]).length,0);
 assert.ok((css.match(/var\(--seasonal-case-bg/g)||[]).length>=4);
});
test('Control Center exposes a project image picker, preview and persistent case field',()=>{
 for(const id of ['passSeasonalCaseBackgroundImage','passSeasonalCaseBackgroundImagePreview','passSeasonalCaseBackgroundImagePath'])assert.ok(owner.includes(`id="${id}"`));
 assert.ok(owner.includes('data-project-image-picker-target="passSeasonalCaseBackgroundImage"'));
 assert.ok(owner.includes("backgroundImageUrl:$('passSeasonalCaseBackgroundImage').value"));
 assert.ok(owner.includes("$('passSeasonalCaseBackgroundImage').value=c.backgroundImageUrl||''"));
});
test('published image only; Change Set, inventory, retries and receipts propagate background art',()=>{
 assert.ok(worker.includes('await validateSeasonVisualHeroImage(env,rawBackground)'));
 assert.ok(worker.includes('seasonPassSeasonalCaseSettings(groupChances,backgroundImageUrl)'));
 assert.ok(worker.includes('backgroundImageUrl:n.backgroundImageUrl'));
 assert.ok(worker.includes('backgroundImageUrl:seasonPassSeasonalCaseBackgroundImage(row.reward_groups_json)'));
 assert.ok(worker.includes('backgroundImageUrl:seasonPassSeasonalCaseBackgroundImage(definition.reward_groups_json)'));
 assert.ok(worker.includes('backgroundImageUrl:seasonPassSeasonalCaseBackgroundImage(def.reward_groups_json)'));
 assert.ok(client.includes('backgroundImageUrl:String(data?.case?.backgroundImageUrl||meta?.backgroundImageUrl||"")'));
});
test('production gate exercises case backdrop regressions',()=>{
 assert.ok(gate.includes('scripts/check-seasonal-case-background.mjs'));
});
test('the Season 3 backdrop is a real registered asset',()=>{
 // runtime assets manifest exists only in full repo, not needed by the patch installer
 if(fs.existsSync(path.join(root,'assets/images-manifest.json'))){
  const j=JSON.parse(read('assets/images-manifest.json'));
  assert.ok(j.images?.some(x=>x.path===s3), 'S3 background not registered in manifest');
  assert.ok(fs.existsSync(path.join(root,s3.slice(1))), 'S3 background missing');
 }
});
console.log(`Season-case background: ${pass}/${pass} checks passed`);
