#!/usr/bin/env node
/* Season Premiere V1.3: read-only validation, no D1/Cloudflare API calls. */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root=process.cwd();
const load=path=>readFile(resolve(root,path),'utf8');
const [ui,css,cc,worker,index,pass,rating,owner]=await Promise.all([
 'scripts/season-premiere/ui.js','scripts/season-premiere/ui.css','scripts/season-premiere/cc-editor.js',
 'src/worker.js','index.html','battle-pass.html','rating.html','owner.html'].map(load));
const pages={index,battlePass:pass,rating,owner};
let checks=0;function ok(value,desc){assert(value,desc);checks++}
for(const [name,page] of Object.entries(pages)){
 const open='<script id="zsp-season-premiere-runtime-v1">',cssOpen='<style id="zsp-season-premiere-style-v1">';
 ok(page.split(open).length===2,`${name}: exactly one runtime`);
 ok(page.split(cssOpen).length===2,`${name}: exactly one style`);
 const body=page.split(open)[1].split('</script>')[0].trim();
 ok(body===ui.trim(),`${name}: runtime consistent with canonical source`);
 const style=page.split(cssOpen)[1].split('</style>')[0];
 ok(style.includes('.zsp-manual')&&style.includes('.rating-v6-season-line'),`${name}: compact season button styles loaded`);
 ok((style.match(/\/\* Season Premiere V1\.2: fast entry without motion overload\. \*\//g)||[]).length===1,
  `${name}: animation style applied once`);
}
for(const p of [ui,cc])ok(!/[\u{1F300}-\u{1FAFF}]/u.test(p),'new season UI contains no emoji');
ok(!/\bfetch\s*\(/.test(ui),'Season manual UI makes no D1/API fetch');
ok(/document\.addEventListener\('click',event=>/.test(ui),'manual click listener delegated at capture');
ok(/manualModels\.set\(button,data\|\|next\)/.test(ui),'manual button gets current server model');
ok(/if\(!next\|\|next\.status!=='active'\)return false;/.test(ui),'manual button independent of the auto-enabled flag');
ok(/next\.surface==='rating'/.test(ui)&&/rating-v6-season-pill/.test(ui),'rating button aligned beside season badge');
ok(!css.includes('.rating-v6-hero .zsp-manual{position:absolute'), 'rating button no longer floats over hero reward');
ok(css.includes('font:900 12px/1.1 "Sofia Sans"'),'pass manual typography matches project');
ok(pass.includes('// SEASON_PREMIERE_V1_3_PASS_MANUAL'),'pass button not gated on tier notice');
ok(pass.includes('    seasonPremierePassManual();'),'manual pass button refreshed independently');
ok(rating.includes('if(mode==="season")setTimeout(()=>maybeAutoShowRatingFinale(),150);'),'after finale close new season may appear');
ok(rating.includes('Boolean(ratingFinaleLayer&&!ratingFinaleLayer.hidden)'), 'rating final blocker handles absent element');
for(const page of ['Main','Pass','Rating']){
 const id=`zspCc${page}IconUrl`;
 ok(owner.includes(`id="${id}"`),`${page} CC icon selector`);
 ok(owner.includes(`data-project-image-picker-target="${id}"`),`${page} uses existing project asset picker`);
 ok(owner.includes(`id="zspCc${page}IconPreview"`),`${page} icon image preview`);
}
ok(cc.includes("['IconUrl',data.iconUrl]"),'CC reload keeps selected icon');
ok(cc.includes("iconUrl:String(val('IconUrl')?.value||'').trim()"),'CC save includes selected icon');
ok(worker.includes('iconUrl:seasonPassReadinessAssetPath(v.iconUrl)'),'Worker returns configured icon in existing visuals');
ok(worker.includes('validateSeasonVisualHeroImage(env,raw.iconUrl'),'Worker checks selected icon against manifest');
// Check real manual open using a small browser-like DOM shim (no extra libraries).
class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.style={};this.hidden=false;this.parentNode=null;this.className='';this.src='';this.textContent='';}
 setAttribute(name,value){this.attributes[name]=value}
 addEventListener(type,cb){(this.listeners??={})[type]??=[];this.listeners[type].push(cb)}
 append(...nodes){for(const node of nodes){if(!node)continue;if(node.parentNode){node.parentNode.children=node.parentNode.children.filter(x=>x!==node)}this.children.push(node);node.parentNode=this}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 replaceWith(node){assert(this.parentNode,'replaceWith needs parent');const p=this.parentNode;const i=p.children.indexOf(this);p.children.splice(i,1,node);node.parentNode=p;this.parentNode=null}
 insertAdjacentElement(position,node){assert.equal(position,'afterend');const p=this.parentNode;const i=p.children.indexOf(this);if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);p.children.splice(i+1,0,node);node.parentNode=p}
 focus(){}
 getClientRects(){return [{}]}
 matches(selector){if(selector.startsWith('[')){const match=selector.match(/\[data-([\w-]+)\]/);if(match){const key=match[1].replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return Object.prototype.hasOwnProperty.call(this.dataset,key)}return false}
 if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));return selector===this.tag}
 closest(selector){let node=this;while(node){if(node.matches(selector))return node;node=node.parentNode}return null}
 querySelector(selector){if(selector===':scope > p')return this.children.find(n=>n.tag==='p')||null;
 for(const node of this.children){if(node.matches(selector))return node;const match=node.querySelector(selector);if(match)return match}return null}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)])}
}
function fakeBrowser(){
 const events={};const body=new Element('body');body.style.overflow='';
 const doc={body,activeElement:new Element('button'),visibilityState:'visible',createElement:type=>new Element(type),
  addEventListener(type,cb){(events[type]??=[]).push(cb)},querySelectorAll(){return []},querySelector(){return null}};
 const ctx={window:{},document:doc,console:{error:e=>{throw e}},localStorage:{getItem:()=>null,setItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>1,clearTimeout(){},getComputedStyle:()=>({display:'block'})};
 vm.runInNewContext(ui,ctx,{timeout:1200});
 const click=button=>{const evt={target:button.querySelector('img')||button,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};
  for(const cb of events.click||[])cb(evt);ok(evt.prevented&&evt.stopped,'Manual click is handled before navigation bubbles')};
 return {api:ctx.window.ZeffiSeasonPremiere,doc,body,click};
}
for(const surface of ['pass','rating']){
 const b=fakeBrowser();const hero=new Element('section');hero.className=surface==='pass'?'hero':'rating-v6-hero';
 let badge,copy;
 if(surface==='pass'){hero.append(new Element('h1'),new Element('p'))}
 else {copy=new Element('div');copy.className='rating-v6-hero-copy';badge=new Element('span');badge.className='rating-v6-season-pill';copy.append(badge);hero.append(copy)}
 const sample={surface,id:'season-3',userId:'100',status:'active',premiere:{enabled:false,iconUrl:'/assets/ui/icon_reiting.webp',title:'Новый сезон'}};
 ok(b.api.ensureManual(hero,sample),`${surface}: manual button exists even when auto is OFF`);
 const button=hero.querySelector('[data-zsp-manual]');ok(Boolean(button),`${surface}: clickable button rendered`);
 ok(button.querySelector('img').src==='/assets/ui/icon_reiting.webp',`${surface}: customized icon rendered`);
 if(surface==='rating'){
  const row=hero.querySelector('.rating-v6-season-line');ok(!!row,'rating season badge has compact row');
  ok(row.children.includes(badge)&&row.children.includes(button),'rating badge and manual button share a row');
 }else ok(hero.children.indexOf(button)===2,'pass button appears directly below the description');
 b.click(button);
 const layer=b.body.querySelector('.zsp-overlay');ok(Boolean(layer&&!layer.hidden),`${surface}: tapping button opens modal`);
 ok(Boolean(layer.querySelector('.zsp-card')),`${surface}: dialog is built`);
 ok(b.api.ensureManual(hero,sample),`${surface}: repeat binding is safe`);
 ok(hero.querySelectorAll('[data-zsp-manual]').length===1,`${surface}: no duplicate button`);
}
// Server projection test: respects published /assets paths, strips other domains.
const src=worker.slice(worker.indexOf('function seasonPremierePageView(raw){'),worker.indexOf('function seasonVisualsView(raw){'));
const context=vm.createContext({seasonPassReadinessAssetPath:value=>String(value||'').startsWith('/assets/')?value:'',
 validateSeasonVisualHeroImage:async(_env,value)=>value,seasonPassReadinessImageManifest:async()=>({})});
vm.runInContext(src+'\nthis.view=seasonPremierePageView;this.patch=seasonPremierePatchView;',context);
ok(context.view({iconUrl:'/assets/ui/icon_battlepass.webp'}).iconUrl==='/assets/ui/icon_battlepass.webp','Worker projects approved icon');
ok(context.view({iconUrl:'https://external.example/a.webp'}).iconUrl==='','Worker drops external URLs');
const saved=await context.patch({}, {iconUrl:'/assets/ui/icon_battlepass.webp',enabled:true});
ok(saved.iconUrl==='/assets/ui/icon_battlepass.webp','Worker validates icon at CC save');
console.log(`Season Premiere V1.3 PASS: ${checks} checks; Pass + Rating manual dialogs, buttons, CC icons, existing visuals and safe routes.`);
