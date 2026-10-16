#!/usr/bin/env node
/**
 * Season Premiere V1.3 — transactional surgical installer.
 * Works after V1 or V1.2. Does not overwrite big production HTML/Worker
 * snapshots; only the exact verified runtime snippets and existing visuals schema.
 * Run from repo root. Re-running the installer must be idempotent.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=process.cwd();
const here=dirname(fileURLToPath(import.meta.url));
const templates=join(here,'season-premiere-v1-3');
const files=['scripts/season-premiere/ui.js','scripts/season-premiere/ui.css',
  'scripts/season-premiere/cc-editor.js','index.html','battle-pass.html','rating.html','owner.html','src/worker.js'];
const original=new Map(await Promise.all(files.map(async name=>[name,await readFile(resolve(root,name),'utf8')])));
const updates=new Map(original);
const fresh={ui:(await readFile(join(templates,'ui.js'),'utf8')).trim(),
 css:(await readFile(join(templates,'ui.css'),'utf8')).trim(),
 cc:(await readFile(join(templates,'cc-editor.js'),'utf8')).trim()};
const touched=[];
function get(p){return updates.get(p)}
function put(p,v){updates.set(p,v)}
function assert(ok,why){if(!ok)throw new Error('Season Premiere V1.3: '+why+'; files not modified.')}
function once(p,old,next,desc){const s=get(p),hits=s.split(old).length-1;assert(hits===1,`${p}: ${desc}; found ${hits} occurrences`);put(p,s.replace(old,next))}
function transform(p,transformFn){const before=get(p);const after=transformFn(before);assert(typeof after==='string'&&after.length>100,`${p}: invalid transform`);put(p,after)}
function rangeReplace(p,startTag,endTag,newBody,desc,preCheck){
 transform(p,html=>{
  const start=html.indexOf(startTag);assert(start!==-1&&html.indexOf(startTag,start+1)===-1,`${p}: missing or duplicated ${desc} start`);
  const bodyStart=start+startTag.length,bodyEnd=html.indexOf(endTag,bodyStart);
  assert(bodyEnd>bodyStart,`${p}: missing ${desc} end`);
  const oldBody=html.slice(bodyStart,bodyEnd);
  if(preCheck)assert(preCheck(oldBody),`${p}: unexpected ${desc}, main changed`);
  return html.slice(0,bodyStart)+'\n'+newBody+'\n'+html.slice(bodyEnd);
 });
}
// All V1 production pages embed the CSP-safe component before </head>.
for(const p of ['index.html','battle-pass.html','rating.html','owner.html']){
 rangeReplace(p,'<script id="zsp-season-premiere-runtime-v1">','</script>',fresh.ui,'manual button UI runtime',
  body=>body.includes('ZeffiSeasonPremiere')&&body.includes('function ensureManual'));
 transform(p,html=>{
  const open='<style id="zsp-season-premiere-style-v1">',close='</style>';
  const at=html.indexOf(open);assert(at>=0&&html.indexOf(open,at+1)===-1,`${p}: missing or duplicated premiere CSS`);
  const bodyStart=at+open.length,bodyEnd=html.indexOf(close,bodyStart);assert(bodyEnd>bodyStart,`${p}: malformed premiere CSS`);
  const was=html.slice(bodyStart,bodyEnd);assert(was.includes('.zsp-overlay')&&was.includes('.zsp-manual'),`${p}: unexpected CSS`);
  let cc=p==='owner.html'?was.slice(was.indexOf('.zsp-cc-editor{')):'';
  if(p==='owner.html'){
   assert(cc.length>200,`${p}: CC CSS not found; refusing to drop it`);
   const oldFast='/* Season Premiere V1.2: fast entry without motion overload. */';
   if(cc.includes(oldFast))cc=cc.slice(0,cc.indexOf(oldFast));
  }
  return html.slice(0,bodyStart)+'\n'+fresh.css+'\n'+(cc?cc.trim()+'\n':'')+html.slice(bodyEnd);
 });
}
// CC edits use precisely the existing published asset picker — no new picker or D1 reads.
{
 const p='owner.html';
 rangeReplace(p,'function zspCcFields(page){','function renderPassVisuals(){',
  fresh.cc.slice(fresh.cc.indexOf('function zspCcFields(page){')+'function zspCcFields(page){'.length).replace(/\s*$/,'')+'\n','CC helpers',
  old=>old.includes('zspCcRenderImage(')&&old.includes('zspCcRead('));
 // rangeReplace above keeps the original function name prefix; ensure new code
 // begins with its body rather than another copy of function declaration.
 for(const [page,fallback] of [['Main','/assets/ui/icon_battlepass.webp'],['Pass','/assets/season-pass/season.webp'],['Rating','/assets/ui/icon_itog_reiting_season.webp']]){
  const id='zspCc'+page;
  transform(p,html=>{
   const group=`<div class="zsp-cc-group" data-premiere-editor="${page}">`;
   const start=html.indexOf(group);assert(start>=0&&html.indexOf(group,start+1)<0,`${p}: ${page} editor missing or duplicate`);
   const nextButton=`<button class="zsp-cc-preview" type="button" data-zsp-cc-preview="${page}">`;
   const at=html.indexOf(nextButton,start);assert(at>start&&at<start+3200,`${p}: ${page} editor preview missing`);
   if(html.slice(start,at).includes(`id="${id}IconUrl"`))return html;
   const part=`<div class="zsp-cc-icon-picker"><label for="${id}IconUrl">Иконка кнопки «О сезоне»</label><div class="zsp-cc-art"><img id="${id}IconPreview" src="${fallback}" alt="Иконка кнопки «О сезоне»"><div><input type="text" id="${id}IconUrl" maxlength="600" placeholder="/assets/..."><div class="actions"><button class="btn secondary small" type="button" data-project-image-picker-target="${id}IconUrl">Выбрать нашу иконку</button><button class="btn secondary small" type="button" data-zsp-cc-icon-clear="${page}">По умолчанию</button></div></div></div></div>\n `;
   return html.slice(0,at)+part+html.slice(at);
  });
 }
}
// Existing season_pass_seasons / leaderboard_seasons visuals_json fields — no schema changes.
{
 const p='src/worker.js';let s=get(p);
 const at=s.indexOf('function seasonPremierePageView(raw){');
 assert(at>=0&&s.indexOf('function seasonPremierePageView(raw){',at+1)<0,'Worker presentation normalizer not found once');
 const end=s.indexOf('function seasonVisualsView(raw){',at);
 assert(end>at,'Worker visual view boundary not found');
 let body=s.slice(at,end);
 if(!body.includes('iconUrl:seasonPassReadinessAssetPath(v.iconUrl)')){
  const orig='imageUrl:seasonPassReadinessAssetPath(v.imageUrl),features:';
  assert(body.includes(orig),'Worker normalizer changed');
  body=body.replace(orig,'imageUrl:seasonPassReadinessAssetPath(v.imageUrl),iconUrl:seasonPassReadinessAssetPath(v.iconUrl),features:');
 }
 if(!body.includes('validateSeasonVisualHeroImage(env,raw.iconUrl')){
  const prev=" if(String(raw?.imageUrl||'').trim())v.imageUrl=await validateSeasonVisualHeroImage(env,raw.imageUrl,manifest||await seasonPassReadinessImageManifest(env));";
  assert(body.includes(prev),'Worker premiere validator changed');
  body=body.replace(prev,prev+"\n if(String(raw?.iconUrl||'').trim())v.iconUrl=await validateSeasonVisualHeroImage(env,raw.iconUrl,manifest||await seasonPassReadinessImageManifest(env));");
 }
 put(p,s.slice(0,at)+body+s.slice(end));
}
// Pass: mount the manual button on every authenticated render, even if an
// activation notice or story currently blocks the optional AUTO presentation.
{
 const p='battle-pass.html',marker='  // SEASON_PREMIERE_V1_3_PASS_MANUAL';
 if(!get(p).includes(marker)){
  const helper=`${marker}\n  function seasonPremierePassManual(){\n    const sp=serverPass?.season;if(!sp?.id||sp.status!=='active')return;\n    const model={surface:'pass',id:String(sp.id),seasonTitle:sp.title,userId:String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id||(()=>{try{return JSON.parse(new URLSearchParams(readInitData()).get('user')||'{}').id||''}catch{return ''}})()),status:sp.status,heroImage:sp.visuals?.battlePass?.heroImage,premiere:sp.visuals?.battlePass?.premiere?.pass,action:()=>{document.querySelector('[data-view-tab="rewards"]')?.click?.();document.getElementById('rewardTrack')?.scrollIntoView?.({block:'start',behavior:'smooth'});}};\n    window.ZeffiSeasonPremiere?.setCurrent(model);\n    window.ZeffiSeasonPremiere?.ensureManual(document.querySelector('#seasonPassPage .hero'),model);\n  }\n`;
  once(p,'  function render() {\n    applySeasonIdentity();',helper+'  function render() {\n    applySeasonIdentity();\n    seasonPremierePassManual();','pass manual independent of post-open notice flow');
 }
}
// Rating: once the past-season finale is explicitly closed, allow the new
// season premiere to enter its own UI schedule; do not interrupt finale.
{
 const p='rating.html';
 const existing='  function closeRatingFinale() {\n    if (!ratingFinaleLayer) return;\n    ratingFinaleLayer.hidden = true;\n    ratingFinaleLayer.setAttribute("aria-hidden", "true");\n    document.body.style.overflow = "";\n  }';
 const changed='  function closeRatingFinale() {\n    if (!ratingFinaleLayer) return;\n    ratingFinaleLayer.hidden = true;\n    ratingFinaleLayer.setAttribute("aria-hidden", "true");\n    document.body.style.overflow = "";\n    // Check for the active-season premiere only after previous results close.\n    if(mode==="season")setTimeout(()=>maybeAutoShowRatingFinale(),150);\n  }';
 if(get(p).includes(existing))once(p,existing,changed,'rating finale / premiere succession');
 else assert(get(p).includes('if(mode==="season")setTimeout(()=>maybeAutoShowRatingFinale(),150);'),`${p}: rating finale closer changed`);
 if(get(p).includes('||!ratingFinaleLayer?.hidden});'))once(p,'||!ratingFinaleLayer?.hidden});','||Boolean(ratingFinaleLayer&&!ratingFinaleLayer.hidden)});','rating finale blocker null-safe');
 else assert(get(p).includes('||Boolean(ratingFinaleLayer&&!ratingFinaleLayer.hidden)});'),`${p}: rating blocker changed`);
}
// Asset integrity & syntax validation happens before writing any file.
for(const name of files){const s=get(name);assert(s.length>100,`${name}: unexpectedly short content`)}
for(const p of ['index.html','battle-pass.html','rating.html','owner.html']){
 const s=get(p);
 assert(s.split('<script id="zsp-season-premiere-runtime-v1">').length===2,`${p}: duplicate Premiere runtime`);
 assert(s.split('<style id="zsp-season-premiere-style-v1">').length===2,`${p}: duplicate Premiere CSS`);
 assert(s.includes('const manualModels=new WeakMap()'),`${p}: manual event bridge missing`);
}
assert(get('owner.html').includes('zspCcPassIconUrl')&&get('owner.html').includes('zspCcRatingIconUrl'),'CC icon fields missing');
assert(get('src/worker.js').includes('iconUrl:seasonPassReadinessAssetPath(v.iconUrl)'),'D1 view projection missing icon');
put('scripts/season-premiere/ui.js',fresh.ui+'\n');
put('scripts/season-premiere/ui.css',fresh.css+'\n');
put('scripts/season-premiere/cc-editor.js',fresh.cc+'\n');
// Every transformation validated. Commit locally in the working tree.
for(const name of files){if(get(name)!==original.get(name)){await writeFile(resolve(root,name),get(name));touched.push(name)}}
console.log(touched.length?'Season Premiere V1.3 patched:\n'+touched.map(s=>'  '+s).join('\n'):'Season Premiere V1.3 already installed; no changes.');
console.log('No D1 migrations. Run node scripts/check-season-premiere-v1-3.mjs and npm run check:fast before deploying.');
