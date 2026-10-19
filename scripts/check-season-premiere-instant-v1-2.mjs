#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=process.cwd();
const read=path=>readFile(resolve(root,path),'utf8');
const ui=await read('scripts/season-premiere/ui.js');
const css=await read('scripts/season-premiere/ui.css');
assert.match(ui,/if\(Number\(delay\)<=0\)attempt\(\);else timer=setTimeout/,'Main premiere opens synchronously on server confirmation');
assert.match(ui,/retries<20\?120:650/,'Early blocked retry is short');
assert.match(ui,/if\(!layer\|\|layer.hidden\)return;/,'Seen stored only after actual display');
assert.doesNotMatch(ui,/\bfetch\s*\(/,'Runtime must not add a new API/D1 query');
assert.doesNotMatch(ui,/[\u{1F300}-\u{1FAFF}]/u,'No emoji in UI');
assert.match(css,/\.zsp-card\[data-surface="main"\]\{animation-duration:\.16s\}/);
for(const path of ['index.html','battle-pass.html','rating.html','owner.html']){
 const text=await read(path);
 const scriptTag='<script id="zsp-season-premiere-runtime-v1">';
 assert.equal(text.split(scriptTag).length-1,1,`${path}: only one premiere runtime`);
 const start=text.indexOf(scriptTag)+scriptTag.length,end=text.indexOf('</script>',start);
 assert.equal(text.slice(start,end).trim(),ui.trim(),`${path}: inline runtime matches source`);
 const styleTag='<style id="zsp-season-premiere-style-v1">';
 assert.equal(text.split(styleTag).length-1,1,`${path}: only one premiere stylesheet`);
 assert.equal(text.split('/* Season Premiere V1.2: fast entry without motion overload. */').length-1,1,`${path}: fast card animation applied only once`);
}
const index=await read('index.html');
const bridge=index.slice(index.indexOf('  // Season Premiere V1: accept only the current game iframe'),index.indexOf('  let seasonPassLayer = null;'));
assert.match(bridge,/event\.origin!==window\.location\.origin/,'Reject foreign message origin');
assert.match(bridge,/event\.source!==frame\(\)\?\.contentWindow/,'Reject forged child frame');
assert.match(bridge,/!initData\|\|!season\.id\|\|season\.status!=='active'/,'Require signed entry and active season');
assert.match(bridge,/telegramInitData\?\.\(\)\|\|window\.SweetRunPlatform\?\.auth\?\.legacyInitData/,'Trusted fallback initData');
assert.match(bridge,/consider\(model,\{delay:0,blocked:/,'Main page has no artificial 1150ms wait');
const early='// Season Premiere V1.2: send validated season metadata before optional startup UI updates.';
assert.equal(index.split(early).length-1,1,'One early startup relay');
assert(index.indexOf(early)>index.indexOf('if (staleAccountSnapshot) {'),'Early relay follows stale snapshot guard');
assert(index.indexOf(early)<index.indexOf('if (data.achievementShowcase &amp;&amp;'),'Early relay precedes optional profile and achievements UI');
assert.match(index,/if \(data\.seasonPassBonus\?\.premiere\?\.status === &quot;active&quot;\)/);
assert.match(index,/if \(data\.premiere &amp;&amp; data\.premiere\.status === &quot;active&quot;\)/,'Keep original bonus response relay as fallback');

function env({blocked=false,hidden=false,failRender=false}={}){
 const pending=new Map(),local=new Map(),session=new Map();let id=0;
 const element=(name)=>({name,hidden:false,dataset:{},style:{},children:[],setAttribute(){},addEventListener(){},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},focus(){},querySelectorAll(){return []},getClientRects(){return [{}]}});
 const body=element('body');body.style={overflow:''};
 const document={body,activeElement:element('focus'),visibilityState:hidden?'hidden':'visible',createElement(name){if(failRender)throw Error('DOM failure');return element(name)},querySelectorAll(){return []},querySelector(){return null}};
 const context={window:{},document,console:{error(){}},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},setTimeout(fn,ms){const key=++id;pending.set(key,{fn,ms});return key},clearTimeout(k){pending.delete(k)},getComputedStyle(){return {display:'block'}}};
 vm.runInNewContext(ui,context,{timeout:500});
 return {api:context.window.ZeffiSeasonPremiere,pending,local,session,document,block:()=>blocked,setBlock:x=>blocked=x,next(){const item=pending.entries().next().value;if(!item)return null;pending.delete(item[0]);item[1].fn();return item[1].ms}};
}
const data={surface:'main',id:'s27',userId:'100',status:'active',premiere:{enabled:true}};
{
 const e=env();
 assert.equal(e.api.consider({...data,premiere:{enabled:false}},{delay:0}),false);
 assert.equal(e.api.consider({...data,status:'scheduled'},{delay:0}),false);
 assert.equal(e.api.consider(data,{delay:0,blocked:e.block}),true);
 assert.equal(e.api.active,true,'On authorized state the popup is visible immediately, without a timer');
 assert.equal(e.pending.size,0,'No unnecessary scheduling of first appearance');
 assert.equal(e.local.size,1,'Mark current season seen only once');
 assert.equal(e.session.size,1,'One automatic popup per session');
 assert.equal(e.api.consider(data,{delay:0}),false,'No repeat auto-popup');
}
{
 const e=env({blocked:true});
 e.api.consider(data,{delay:0,blocked:e.block});
 assert.equal(e.api.active,false,'Never cover a high-priority modal');
 assert.equal(e.pending.size,1,'Fast retry is scheduled if blocked');
 assert.equal(e.local.size,0,'Do not mark as seen while blocked');
 assert.equal(e.next(),120,'Initial blocked retry uses 120 ms');
 e.setBlock(false);e.next();
 assert.equal(e.api.active,true,'Show at first unblocked opportunity');
 assert.equal(e.local.size,1);
}
{
 const e=env({hidden:true});e.api.consider(data,{delay:0});
 assert.equal(e.api.active,false,'Do not pop up in a hidden/background tab');
 e.document.visibilityState='visible';e.next();assert.equal(e.api.active,true);
}
{
 const e=env({failRender:true});e.api.consider(data,{delay:0});
 assert.equal(e.local.size,0,'Do not record seen if rendering fails');
 assert.equal(e.session.size,0);
}
{
 const e=env();e.api.consider(data);
 assert.equal(e.api.active,false,'Pass and rating can still use their default delay');
 assert.equal(e.pending.size,1);
 assert.equal(e.next(),850);assert.equal(e.api.active,true);
}
console.log('Season Premiere instant V1.2: immediate host display, low-latency retry, verified season, session-once, UI-only + iframe security PASS');
