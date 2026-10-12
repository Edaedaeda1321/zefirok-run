#!/usr/bin/env node
// Production-only assertions for the combined Belkino + safe dual-city tester UX.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
const root=process.cwd();
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const story=read('story-world.html'), personal=read('world.html'), css=read('world/story/style.css'), app=read('world/story/app.js'), service=read('src/zeffi-world-service.js');
let checks=0;
const ck=(label,pass)=>{assert.ok(pass,label);console.log('PASS '+label);checks++;};
ck('common story header exposes switch to personal city',story.includes('id="openPersonalCity"')&&story.includes('Общий город'));
ck('auth flow still loads hosted story only after signed server access',story.includes('./story/boot.js?v=2')&&read('world/story/boot.js').includes("fetch('/api/world/story-access'"));
ck('embedded Telegram viewport excludes second top safe inset',story.includes('zeffi-story-embedded')&&css.includes('html.zeffi-story-embedded .story-header{padding-top:8px'));
ck('compact mobile controls and city switch are styled',css.includes('@media(max-width:650px)')&&css.includes('.world-mode-current,.world-mode-link'));
ck('common city switch stays behind loaded tester story app',app.includes("listen($('openPersonalCity'),'click'")&&app.includes("new URL('../world.html?world_tester=1'"));
ck('common story back returns to runner, not locked personal city',app.includes("{type:'zefirok-world-close'}"));
ck('personal world exposes both sections, not a disabled common button',personal.includes('id="commonButton"')&&read('world/story/entry.js').includes("event.stopImmediatePropagation()"));
ck('personal fallback uses read-only signed story gate, not URL-only authorization',personal.includes("request('/api/world/story-access')")&&personal.includes("request('/api/world/state')")&&personal.includes('world_tester'));
ck('personal sandbox sets existing client to local mode BEFORE load',personal.indexOf('window.ZeffiWorldServerRequired=access.server===true')<personal.indexOf("script.src='./app.js'"));
ck('personal banner makes local-only storage and no wallet writes explicit',personal.includes('worldTesterLocalNotice')&&personal.includes('реальные валюты не списываются'));
ck('existing personal D1/purchase protection is untouched',service.includes('WORLD_ENABLED')&&service.includes('WORLD_PURCHASES_ENABLED')&&service.includes('assertTester(env,telegramId);'));
ck('story park remains isolated from purchasable live catalog',read('world/story/map.js').includes('STORY_PARK_BELKINO_KIND')&&!read('world/catalog.js').includes('STORY_PARK_BELKINO_KIND'));
ck('main runner still hosts gated story navigation',read('index.html').includes('zeffi-world-tester-open')&&read('index.html').includes('story-world.html'));

const raw=personal.match(/<script id="zeffi-world-preview-access">([\s\S]*?)<\/script>/)?.[1];
assert.ok(raw,'personal bootstrap inline script missing');
async function simulate({signed=true,allowStory=true,allowPersonal=false,explicit=false,requestFlag=true}={}){
 const calls=[],scripts=[],classes=[],styleNodes=[];
 const banner={hidden:true},elements={worldTesterLocalNotice:banner};let callback;
 const head={append(el){styleNodes.push(el);},appendChild(el){scripts.push(el);}};
 const document={
   head,
   documentElement:{classList:{add(s){classes.push(s)},contains(){return false}}},
   body:{style:{cssText:''},innerHTML:''},
   getElementById(id){return elements[id]||{hidden:false}},
   querySelectorAll(){return []},
   addEventListener(name,fn){if(name==='DOMContentLoaded')callback=fn},
   createElement(tag){return{tag,style:{},addEventListener(){}}},
 };
 const window={Telegram:{WebApp:{initData:signed?'SIGNED_TELEGRAM':'',initDataUnsafe:{user:{id:12345}}}},document};window.parent=window;
 const location={protocol:'https:',hostname:'zefirok.test',origin:'https://zefirok.test',search:requestFlag?'?world_tester=1':'?world_preview=1'};
 const response=(ok,payload,status=ok?200:403)=>({ok,status,async json(){return payload}});
 const fetch=async(path,opts)=>{
   calls.push(path);
   assert.equal(opts.method,'POST');
   assert.equal(JSON.parse(opts.body).initData,'SIGNED_TELEGRAM');
   if(path==='/api/world/state')return allowPersonal?response(true,{ok:true,serverAuthoritative:true}):response(false,{ok:false,code:'WORLD_DISABLED'});
   if(path==='/api/world/story-access')return allowStory?response(true,{ok:true,access:'tester',mode:'local-demo',walletWrites:false}):response(false,{ok:false,code:'WORLD_NOT_AVAILABLE'});
   throw Error('unrecognized route '+path);
 };
 const context={window,document,location,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch,console};
 runInNewContext(raw,context,{timeout:3000});
 assert.equal(typeof callback,'function');
 await callback();
 return {window,classes,scripts,calls,banner,body:document.body.innerHTML};
}
const personalD1=await simulate({allowPersonal:true});
ck('authorized signed tester loads existing D1 personal city',personalD1.scripts.length===1&&personalD1.window.ZeffiWorldServerRequired===true&&personalD1.calls.join(',')==='/api/world/state');
const personalSandbox=await simulate({allowPersonal:false,allowStory:true});
ck('disabled personal D1 loads signed local sandbox',personalSandbox.scripts.length===1&&personalSandbox.window.ZeffiWorldServerRequired===false&&personalSandbox.window.ZeffiWorldPreviewAllowed===true&&personalSandbox.calls.join(',')==='/api/world/state,/api/world/story-access'&&personalSandbox.banner.hidden===false);
const nonTester=await simulate({allowStory:false});
ck('non-tester denied both personal modes and sees teaser',nonTester.scripts.length===0&&nonTester.body.includes('ПОКА НЕДОСТУПНО'));
const unsigned=await simulate({signed:false});
ck('unsigned player cannot open personal sandbox',unsigned.scripts.length===0&&unsigned.calls.length===0);
const flagOnly=await simulate({requestFlag:false});
ck('URL preview flag never bypasses tester authentication',flagOnly.scripts.length===0&&flagOnly.calls.length===0);
ck('personal test never adds new balance/write endpoints',!/\/api\/world\/mutate/.test(raw)&&!app.includes('/api/world/mutate'));
console.log(`World dual mode v1: ${checks} checks passed.`);
