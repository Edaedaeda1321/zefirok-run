#!/usr/bin/env node
// Regression check: only existing season-info button art/CC defaults change.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const path='/assets/ui/icon_o_sezone.webp';
const old=['/assets/ui/icon_battlepass.webp','/assets/season-pass/season.webp','/assets/ui/icon_itog_reiting_season.webp'];
const read=f=>readFile(resolve(root,f),'utf8');
const [ui,cc,ui13,cc13,index,pass,rating,owner,mstr]=await Promise.all([
 'scripts/season-premiere/ui.js','scripts/season-premiere/cc-editor.js',
 'scripts/season-premiere-v1-3/ui.js','scripts/season-premiere-v1-3/cc-editor.js',
 'index.html','battle-pass.html','rating.html','owner.html','assets/images-manifest.json'
].map(read));
let checks=0;
const ok=(yes,desc)=>{assert(yes,desc);checks++};
ok(ui.trim()===ui13.trim(),'V1.3 template and production UI are in sync');
ok(cc.trim()===cc13.trim(),'V1.3 template and CC icon helper are in sync');
for(const [name,html] of Object.entries({index,pass,rating,owner})){
 const start='<script id="zsp-season-premiere-runtime-v1">';
 ok(html.split(start).length===2,`${name}: one inline premiere runtime`);
 const embedded=html.split(start)[1].split('</script>')[0];
 ok(embedded.trim()===ui.trim(),`${name}: embedded runtime updated`);
 ok(embedded.includes("main:'"+path+"',pass:'"+path+"',rating:'"+path+"'"),`${name}: new button default on all surfaces`);
 ok(embedded.includes('PREVIOUS_BUTTON_ICONS.has('),`${name}: old stored fallback icons migrated`);
}
for(const page of ['Main','Pass','Rating']){
 const re=new RegExp(`<img\\b(?=[^>]*id="zspCc${page}IconPreview")[^>]*src="([^"]+)"`);
 const img=owner.match(re);
 ok(Boolean(img),`CC ${page} icon preview exists`);
 ok(img[1]===path,`CC ${page} icon preview uses supplied art`);
}
ok(owner.includes("const zspCcLegacyButtonIcons=new Set("),'CC ignores old default icon selections');
ok(owner.includes(" const fallback='"+path+"'"),'CC inline helper default icon updated');
ok(cc.includes(" const fallback='"+path+"'"),'CC canonical helper default icon updated');
ok(pass.includes('SEASON_PREMIERE_V1_3_PASS_MANUAL'),'pass manually opens existing season dialog');
ok(rating.includes('rating-v6-season-line'),'rating button stays next to season badge');
ok(ui.includes('manualModels.set(button,data||next)'),'manual click keeps current model');
ok(!/\bfetch\s*\(/.test(ui),'new asset introduces no network/D1 query');

const asset=await readFile(resolve(root,path.slice(1)));
ok(asset.length>1024&&asset.length<120000,'optimised WebP lightweight');
ok(asset.toString('ascii',0,4)==='RIFF'&&asset.toString('ascii',8,12)==='WEBP','asset is WebP');
const manifest=JSON.parse(mstr);
const entry=manifest.images.filter(i=>i.path===path);
ok(entry.length===1,'asset registered exactly once');
ok(entry[0].hash===createHash('sha256').update(asset).digest('hex').slice(0,12),'asset hash current');
ok(entry[0].size===asset.length,'asset size current');
ok(manifest.count===manifest.images.length,'manifest count valid');
ok(manifest.catalogHash===createHash('sha256').update(manifest.images.map(i=>`${i.path}:${i.hash}`).join('\n')).digest('hex').slice(0,16),'manifest catalog hash valid');

class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.parentNode=null;this.dataset={};this.style={};this.className='';this.hidden=false;this.src='';}
 addEventListener(){}
 setAttribute(){}
 append(...els){for(const e of els){if(!e)continue;if(e.parentNode)e.parentNode.children=e.parentNode.children.filter(x=>x!==e);this.children.push(e);e.parentNode=this}}
 replaceWith(e){assert(this.parentNode);const p=this.parentNode;const index=p.children.indexOf(this);p.children.splice(index,1,e);e.parentNode=p;this.parentNode=null}
 insertAdjacentElement(position,e){assert.equal(position,'afterend');const p=this.parentNode;const index=p.children.indexOf(this);p.children.splice(index+1,0,e);e.parentNode=p}
 matches(sel){if(sel.startsWith('.'))return this.className.split(' ').includes(sel.slice(1));if(sel===':scope > p')return this.tag==='p';if(sel==='[data-zsp-manual]')return 'zspManual'in this.dataset;if(sel==='img')return this.tag==='img';return this.tag===sel}
 querySelector(selector){if(selector===':scope > p')return this.children.find(x=>x.tag==='p')||null;for(const node of this.children){if(node.matches(selector))return node;const inner=node.querySelector(selector);if(inner)return inner}return null}
 focus(){}
}
const sandbox={window:{},document:{addEventListener(){},createElement:t=>new Element(t)},console};
vm.runInNewContext(ui,sandbox,{timeout:1500});
const runtime=sandbox.window.ZeffiSeasonPremiere;
for(const surface of ['pass','rating']){
 const host=new Element('section');
 if(surface==='pass')host.append(new Element('h1'),new Element('p'));
 else{const copy=new Element('div');copy.className='rating-v6-hero-copy';const badge=new Element('span');badge.className='rating-v6-season-pill';copy.append(badge);host.append(copy)}
 const model={surface,id:'season-3',status:'active',premiere:{enabled:true}};
 ok(runtime.ensureManual(host,model),`${surface}: season button mounted`);
 const button=host.querySelector('[data-zsp-manual]');
 ok(button.querySelector('img').src===path,`${surface}: supplied icon is used by default`);
 for(const legacy of old){
  model.premiere.iconUrl=legacy;
  ok(runtime.ensureManual(host,model),`${surface}: legacy icon model accepted`);
  ok(button.querySelector('img').src===path,`${surface}: legacy icon upgraded to new one`);
 }
 model.premiere.iconUrl='/assets/ui/icon_reiting.webp';
 runtime.ensureManual(host,model);
 ok(button.querySelector('img').src==='/assets/ui/icon_reiting.webp',`${surface}: CC custom icon still honored`);
}
console.log(`Season About Icon V1.4 PASS: ${checks} checks; new image, CC fallback, Pass, Rating, manifest and manual entry.`);
