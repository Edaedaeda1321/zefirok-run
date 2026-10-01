#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('index.html','utf8');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const match=source.match(/data-srcdoc="([\s\S]*?)" title=/);
assert.ok(match,'Embedded runner is present');
const runner=decode(match[1]);
let parsed=0;
for(const text of [source,runner])for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/\bsrc\s*=/.test(m[1])||/type=["'](?:application\/json|application\/ld\+json)["']/.test(m[1]))continue;
 new vm.Script(m[2],{filename:'inline-'+(++parsed)});
}
const prefs=source.match(/<script id="zefirok-media-preferences-v28">([\s\S]*?)<\/script>/)?.[1];
assert.ok(prefs,'Media preference store exists');
function environment({cloudValue=null,deferRead=false,existingLocal=null}={}){
 const store=new Map(),timers=new Map(),writes=[],hooks=new Map();let seq=0,readCallback;
 if(existingLocal)store.set('zefirok-media-v1:7',existingLocal);
 const box={URLSearchParams,console,location:{search:''},document:{hidden:false,addEventListener(){}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
  addEventListener:(k,fn)=>hooks.set(k,fn),setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),
  Telegram:{WebApp:{initDataUnsafe:{user:{id:7}},CloudStorage:{getItem(k,cb){readCallback=cb;if(!deferRead)cb(null,cloudValue)},setItem(k,v,cb){writes.push({k,v});cb(null,true)}}}}};
 box.window=box;
 vm.runInNewContext(prefs,box);
 function tick(delay){for(const [id,t] of [...timers])if(t.delay===delay&&timers.has(id)){timers.delete(id);t.fn()}}
 return {api:box.ZefirokMediaPrefs,store,writes,tick,finishRead:value=>readCallback(null,value),hooks};
}
const test=environment();test.tick(0);
assert.equal(test.api.get().musicVolume,22);
test.api.setVolume('music','1');assert.equal(test.api.get().musicVolume,1,'1% cannot become 100%');
test.api.setVolume('music',35);test.api.toggle('music');assert.equal(test.api.get().musicEnabled,false);
test.api.toggle('music');assert.equal(test.api.get().musicVolume,35,'Quick mute restores previous volume');
test.api.setVolume('music',0);assert.equal(test.api.get().musicEnabled,false,'Zero is mute');
test.api.setVolume('sound',17);assert.equal(test.api.get().soundVolume,17);
assert.equal(test.api.get().musicEnabled,false,'Channels are independent');
test.api.update({vibrationEnabled:false});assert.equal(test.api.get().vibrationEnabled,false);
for(let n=1;n<=100;n++)test.api.setVolume('music',n);
assert.equal(test.writes.length,0,'No cloud write for every slider input');
test.tick(550);assert.equal(test.writes.length,1,'One trailing cloud write');
test.api.setVolume('music',-3);assert.equal(test.api.get().musicEnabled,false);
test.api.setVolume('music',500);assert.equal(test.api.get().musicVolume,100);
test.api.setVolume('music',Number.NaN);assert.equal(test.api.get().musicVolume,100);
const saved=test.store.get('zefirok-media-v1:7');
const restored=environment({existingLocal:saved});
assert.equal(restored.api.get().soundVolume,17,'Local preference survives reopening');
assert.equal(restored.api.get().vibrationEnabled,false,'Haptic mute survives reopening');
const late=environment({deferRead:true});late.tick(0);late.api.setVolume('music',13);
late.finishRead(JSON.stringify({version:1,updatedAt:Date.now()+999999,values:{musicVolume:99}}));
assert.equal(late.api.get().musicVolume,13,'Late cloud read cannot overwrite current gesture');
const remote=environment({cloudValue:JSON.stringify({version:1,updatedAt:100,values:{musicVolume:7,soundVolume:8,vibrationEnabled:false}})});remote.tick(0);
assert.equal(remote.api.get().musicVolume,7,'New device can restore cloud preferences');
assert.equal(remote.api.get().vibrationEnabled,false);
const legacy=environment();legacy.api.migrateLegacy({soundEnabled:false,musicEnabled:false});assert.equal(legacy.api.get().musicEnabled,false);
legacy.api.setVolume('music',9);legacy.api.migrateLegacy({soundEnabled:true,musicEnabled:false});assert.equal(legacy.api.get().musicEnabled,true,'Old progress cannot revert edited media settings');

const toneCode=source.match(/function streakTone\(streak\)\{([\s\S]*?)\n\}/)?.[0];
assert.ok(toneCode,'Streak title calculator is present');
const toneBox={whole:v=>Math.max(0,Math.floor(Number(v)||0))};
vm.runInNewContext(toneCode+'; result=streakTone;',toneBox);
for(const day of [10,20,30,40,50,60,70,80,90,100,110,200]){
 const t=toneBox.result(day);assert.equal(t.milestone,true,'Each tenth day is a milestone');assert.equal(t.next,day+10);
}
assert.equal(toneBox.result(0).milestone,false);
assert.notEqual(toneBox.result(2).rank,toneBox.result(40).rank);
assert.notEqual(toneBox.result(10).title,toneBox.result(20).title);
assert.equal(toneBox.result(41).next,50);
assert.equal(toneBox.result(41).milestone,false);
for(const token of ['data-profile-music-volume','data-profile-sound-volume','data-profile-vibration-toggle','data-media-reset','data-media-test-sound','createMediaElementSource','activeSfxGains','bindMediaSettings();'])assert.ok(runner.includes(token),token);
assert.ok(!runner.includes('numeric > 1 ? numeric / 100 : numeric'),'No ambiguous 0..1 versus percent conversion');
assert.ok(source.includes('window.ZefirokMediaPrefs?.get().vibrationEnabled === false'),'Host suppresses haptics');
assert.ok(source.includes('is-celebrating')&&source.includes('streakCelebrationSeen'),'One-time milestone effect');
assert.ok(source.includes('nextStreakMilestone'),'Reward goals still use server data');
assert.ok(source.includes('.zdl-layer *::before,.zdl-layer *::after'),'Reduced motion also covers pseudo-elements');
assert.ok(source.includes('stopStreakEffects();'),'Effects stop on close/background');
const refs=fs.readFileSync('referrals.html','utf8');
assert.ok(refs.includes("type:'zefirok-haptic',kind:'impact',value"),'Friends routes haptics through guarded host');
console.log(`Media + streak UI v28 PASS: ${parsed} inline scripts parsed; volume/mute, persistence, cloud race, haptics, titles and every-10-day boundaries.`);
