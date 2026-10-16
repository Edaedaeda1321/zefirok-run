#!/usr/bin/env node
/* Apply the Premiere V1 patch surgically to the CURRENT repo, not a stale HTML snapshot.
 * All transformations are validated in memory before any file is written. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=process.cwd(), HERE=dirname(fileURLToPath(import.meta.url));
const template=async name=>readFile(join(HERE,'season-premiere',name),'utf8');
const names=['src/worker.js','index.html','battle-pass.html','rating.html','owner.html'];
const original=new Map();for(const path of names)original.set(path,await readFile(resolve(ROOT,path),'utf8'));
const pending=new Map(original);const reports=[];
function get(path){return pending.get(path)}
function put(path,text){pending.set(path,text)}
function once(path,find,replacement,description){const c=get(path),matches=c.split(find).length-1;
 if(matches!==1)throw new Error(`${path}: ${description} — ожидалось одно совпадение, найдено ${matches}. Актуальный main изменился; патч не применён.`);
 put(path,c.replace(find,replacement));
}
function before(path,needle,content,description){once(path,needle,content+needle,description)}
function insertUi(path,uiCss,uiJs,ccCss=''){
 const style=`\n<style id="zsp-season-premiere-style-v1">\n${uiCss}\n${ccCss}\n</style>\n`;
 const js=`\n<script id="zsp-season-premiere-runtime-v1">\n${uiJs}\n</script>\n`;
 // Inline UI avoids widening the strict 'script-src' CSP in the public pages.
 before(path,'\n</head>\n<body',style+js+'\n', 'inline season premiere runtime');
}
function pageMarkup(page){
 const id='zspCc'+page;
 const choice=`<div class="zsp-cc-art"><img id="${id}PreviewImage" src="${page==='Rating'?'/assets/rating/v8/season-1-cafe-opening.webp':'/assets/season-pass/season_pass1.webp'}" alt="Предпросмотр обложки"><div><input type="text" id="${id}ImageUrl" maxlength="600" placeholder="/assets/..."><div class="actions"><button class="btn secondary small" type="button" data-project-image-picker-target="${id}ImageUrl">Выбрать из проекта</button><button class="btn secondary small" type="button" data-zsp-cc-clear="${page}">Сбросить</button></div></div></div>`;
 const fields=[['Title','Заголовок',90],['Subtitle','Подзаголовок',140],['Description','Описание',360],['Feature1','Особенность 1',115],['Feature2','Особенность 2',115],['Feature3','Особенность 3',115]];
 return `<div class="zsp-cc-group" data-premiere-editor="${page}">
 <h5><img src="${page==='Main'?'/assets/ui/icon_battlepass.webp':page==='Pass'?'/assets/season-pass/season.webp':'/assets/ui/icon_itog_reiting_season.webp'}" alt="">${page==='Main'?'Главный экран':page==='Pass'?'Сезонный пропуск':'Рейтинг'}</h5>
 <label class="zsp-cc-switch"><input type="checkbox" id="${id}Enabled"> Показывать приветствие после старта сезона</label>
 ${fields.map(([key,label,max])=>`<div><label for="${id}${key}">${label}</label>${key==='Description'?`<textarea id="${id}${key}" maxlength="${max}" rows="2"></textarea>`:`<input type="text" id="${id}${key}" maxlength="${max}">`}</div>`).join('\n')}
 <div><label for="${id}ImageUrl">Обложка из уже имеющихся ассетов</label>${choice}</div>
 <button class="zsp-cc-preview" type="button" data-zsp-cc-preview="${page}">Предпросмотр на телефоне</button>
 </div>`;
}
const uiCss=await template('ui.css'),uiJs=await template('ui.js'),ccCss=await template('cc-editor.css'),ccJs=await template('cc-editor.js');
const coreMarker='// SEASON_PREMIERE_V1_PRESENTATION';
const already=names.map(path=>({path,installed:get(path).includes(path==='src/worker.js'?coreMarker:'zsp-season-premiere-runtime-v1')}));
if(already.every(v=>v.installed)){console.log('Season Premiere V1 already installed. Nothing to modify.');process.exit(0)}
if(already.some(v=>v.installed))throw new Error('Найдена частичная установка V1. Проверь git diff, затем повтори установку на чистой ветке.');
// Worker: reuse visuals_json on existing pass and rating season rows. No new D1 table.
{
 const p='src/worker.js';
 const normalize=`${coreMarker}\nfunction seasonPremierePageView(raw){
 const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {enabled:v.enabled===true,title:String(v.title||'').trim().slice(0,90),subtitle:String(v.subtitle||'').trim().slice(0,140),description:String(v.description||'').trim().slice(0,360),imageUrl:seasonPassReadinessAssetPath(v.imageUrl),features:(Array.isArray(v.features)?v.features:[]).slice(0,3).map(s=>String(s||'').trim().slice(0,115))};
}
async function seasonPremierePatchView(env,raw,manifest=null){
 const v=seasonPremierePageView(raw);
 if(String(raw?.imageUrl||'').trim())v.imageUrl=await validateSeasonVisualHeroImage(env,raw.imageUrl,manifest||await seasonPassReadinessImageManifest(env));
 return v;
}
`;
 before(p,'function seasonVisualsView(raw){',normalize,'normalizer for season welcomes');
 once(p,'rating:{heroImage:seasonPassReadinessAssetPath(data?.rating?.heroImage)},',
 'rating:{heroImage:seasonPassReadinessAssetPath(data?.rating?.heroImage),premiere:seasonPremierePageView(data?.rating?.premiere)},','rating premiere in normalizer');
 once(p,'      heroImage:seasonPassReadinessAssetPath(battlePass.heroImage),\n      navigation:{',
 '      heroImage:seasonPassReadinessAssetPath(battlePass.heroImage),\n      premiere:{main:seasonPremierePageView(battlePass?.premiere?.main),pass:seasonPremierePageView(battlePass?.premiere?.pass)},\n      navigation:{','pass and main premiere in normalizer');
 const ratingMerge=`  if(surface!=='battlePass'){
    data[surface]={...current,heroImage:String(value||'')};
    return JSON.stringify(data);
  }`;
 const ratingMergeNext=`  if(surface!=='battlePass'){
    if(value&&typeof value==='object'&&!Array.isArray(value))data[surface]={...current,...value};
    else data[surface]={...current,heroImage:String(value||'')};
    return JSON.stringify(data);
  }`;
 once(p,ratingMerge,ratingMergeNext,'rating visuals preservation');
 once(p,"data.battlePass={...current,...patch,navigation:nested('navigation'),tasks:nested('tasks'),tariffs:nested('tariffs'),storyCollectible:nested('storyCollectible')};",
 "data.battlePass={...current,...patch,navigation:nested('navigation'),tasks:nested('tasks'),tariffs:nested('tariffs'),storyCollectible:nested('storyCollectible'),premiere:{...nested('premiere'),main:{...(current?.premiere?.main||{}),...(patch?.premiere?.main||{})},pass:{...(current?.premiere?.pass||{}),...(patch?.premiere?.pass||{})}}};",
 'merge premiere settings without dropping other visuals');
 once(p,"  const heroImage=await validateSeasonVisualHeroImage(env,ctx.body?.heroImage);\n  const before=seasonVisualsView(row.visuals_json),nextJson=seasonVisualsMerge(row.visuals_json,'rating',heroImage),now=Math.floor(Date.now()/1000);",
 "  const heroImage=await validateSeasonVisualHeroImage(env,ctx.body?.heroImage);\n  const premiere=Object.prototype.hasOwnProperty.call(ctx.body||{},'premiere')?await seasonPremierePatchView(env,ctx.body.premiere):null;\n  const before=seasonVisualsView(row.visuals_json),nextJson=seasonVisualsMerge(row.visuals_json,'rating',premiere?{heroImage,premiere}:{heroImage}),now=Math.floor(Date.now()/1000);",
 'validate and save rating premiere');
 const near="  const before=seasonVisualsView(row.visuals_json),nextJson=seasonVisualsMerge(row.visuals_json,'battlePass',patch),now=Math.floor(Date.now()/1000);";
 const patchContent=`  if(Object.prototype.hasOwnProperty.call(body,'premiere')){
    const input=body.premiere&&typeof body.premiere==='object'?body.premiere:{};
    patch.premiere={};
    for(const page of ['main','pass']){
      if(Object.prototype.hasOwnProperty.call(input,page))patch.premiere[page]=await seasonPremierePatchView(env,input[page]);
    }
  }
`;
 before(p,near,patchContent,'save pass and main premiere');
 const oldBonus='  const season=await loadSeasonPassSeason(env);\n  if(season.status===\'ended\'){';
 const newBonus=`  const season=await loadSeasonPassSeason(env);
  // Reuse the startup bonus response; no additional D1 read for the main premiere.
  const premiere=season.status==='active'?{id:season.id,title:season.title,status:season.status,heroImage:season.visuals?.battlePass?.heroImage||'',presentation:season.visuals?.battlePass?.premiere?.main||{enabled:false}}:null;
  if(season.status==='ended'){`;
 once(p,oldBonus,newBonus,'main startup season metadata from existing state');
 once(p,'  return {ok:true,active,multiplier:active?2:1,premiumTier:',
 '  return {ok:true,active,premiere,multiplier:active?2:1,premiumTier:',
 'main startup premiere surface');
}
// Main page: source-checked iframe message and existing authenticated Season Pass navigation.
{
 const p='index.html';
 insertUi(p,uiCss,uiJs);
 const anchor='      function applySeasonPassProfileBonus(payload) {\n        const data = payload &amp;&amp; typeof payload === &quot;object&quot; ? payload : {};';
 const replacement=`${anchor}
        if (data.premiere &amp;&amp; data.premiere.status === &quot;active&quot;) {
          try { window.parent.postMessage({type:&quot;zefirok-season-premiere-state&quot;,premiere:data.premiere,userId:String(telegramProfile?.id||&quot;&quot;)},window.parent.location.origin); } catch (error) {}
        }`;
 once(p,anchor,replacement,'authenticated main state bridge');
 const bridge=`  // Season Premiere V1: accept only the current game iframe, never arbitrary children.
  window.addEventListener('message', event=>{
    if(event.origin!==window.location.origin || event.source!==frame()?.contentWindow)return;
    if(event.data?.type!=='zefirok-season-premiere-state')return;
    const season=event.data.premiere||{};
    const initData=String(window.SweetRunPlatform?.auth?.legacyInitData?.()||window.Telegram?.WebApp?.initData||'');
    if(!initData||!season.id||season.status!=='active')return;
    const model={surface:'main',id:String(season.id),seasonTitle:String(season.title||''),userId:String(event.data.userId||''),status:season.status,heroImage:season.heroImage,premiere:season.presentation,action:()=>openSeasonPassOverlay(initData)};
    window.ZeffiSeasonPremiere?.consider(model,{delay:1150,blocked:()=>{
      if(document.querySelector('.zefirok-season-pass-layer:not([hidden]),.zefirok-rating-layer:not([hidden]),.zefirok-achievements-layer:not([hidden])'))return true;
      try{const child=frame()?.contentDocument;return Boolean(child&&[...child.querySelectorAll('.zgt-layer:not([hidden]),.zcc-main-layer:not([hidden]),[aria-modal=\"true\"]')].some(el=>el.getClientRects().length>0))}catch{return true}
    }});
  });
`;
 before(p,'  let seasonPassLayer = null;',bridge,'main secure premiere bridge');
}
// Battle Pass: keep existing story, tutorial, letter and 50-level finale priorities.
{
 const p='battle-pass.html';insertUi(p,uiCss,uiJs);
 const needle="      maybeAutoShowSeasonFinale();\n    }\n    return tierNoticeShown;";
 const replacement=`      maybeAutoShowSeasonFinale();
      // Season Premiere V1. Existing story, letter, tutorial and rewards take precedence.
      const spSeason=serverPass?.season;
      if(spSeason?.id && spSeason.status==='active'){
        const model={surface:'pass',id:String(spSeason.id),seasonTitle:spSeason.title,userId:String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id||(()=>{try{return JSON.parse(new URLSearchParams(readInitData()).get('user')||'{}').id||''}catch{return ''}})()),status:spSeason.status,heroImage:spSeason.visuals?.battlePass?.heroImage,premiere:spSeason.visuals?.battlePass?.premiere?.pass,action:()=>{document.querySelector('[data-view-tab="rewards"]')?.click?.();document.getElementById('rewardTrack')?.scrollIntoView?.({block:'start',behavior:'smooth'});}};
        window.ZeffiSeasonPremiere?.setCurrent(model);
        window.ZeffiSeasonPremiere?.ensureManual(document.querySelector('.hero'),model);
        const params=new URLSearchParams(location.search);
        if(!serverPass?.story?.pending&&!['storyTest','letter','offer'].some(key=>params.has(key))){
          window.ZeffiSeasonPremiere?.consider(model,{delay:1150,blocked:()=>seasonTutorialBlocksAutoPopups()||!document.getElementById('seasonFinaleOverlay')?.hidden||!document.getElementById('seasonStoryOverlay')?.hidden||!document.getElementById('seasonLetterOverlay')?.hidden});
        }
      }
    }
    return tierNoticeShown;`;
 once(p,needle,replacement,'pass post-open presentation ordering');
}
// Rating: never steal focus from unread prior-season results.
{
 const p='rating.html';insertUi(p,uiCss,uiJs);
 const needle='  function maybeAutoShowRatingFinale() {';
 const replacement=`  function maybeAutoShowRatingFinale() {
    // Season Premiere V1: use the authorized /api/leaderboard/state already in cache.
    const spSeason=mode==='season'&&!cache.season?._uiStale?cache.season?.season:null;
    if(spSeason?.id && spSeason.status==='active'){
      const model={surface:'rating',id:String(spSeason.id),seasonTitle:spSeason.title,userId:String(telegramProfile?.id||''),status:spSeason.status,heroImage:spSeason.visuals?.rating?.heroImage,premiere:spSeason.visuals?.rating?.premiere,reward:spSeason.reward,action:()=>{document.querySelector('.rating-v6-me-card')?.scrollIntoView?.({block:'center',behavior:'smooth'});}};
      window.ZeffiSeasonPremiere?.setCurrent(model);
      window.ZeffiSeasonPremiere?.ensureManual(document.querySelector('.rating-v6-hero'),model);
      const priorFinale=ratingFinaleData(cache.season);
      let pendingFinale=false;
      if(priorFinale){try{pendingFinale=localStorage.getItem(ratingFinaleSeenKey(priorFinale.season))!=='1'}catch{pendingFinale=true}}
      if(!pendingFinale)window.ZeffiSeasonPremiere?.consider(model,{delay:1150,blocked:()=>Boolean(window.ZefirokPageGuide?.isOpen?.())||Boolean(document.querySelector('.zcc-rating-layer:not([hidden])'))||!ratingFinaleLayer?.hidden});
    }`;
 once(p,needle,replacement,'rating premiere after server state, preserving finale');
}
// CC: add editors, original assets browser and real in-app mobile preview.
{
 const p='owner.html';insertUi(p,uiCss,uiJs,ccCss);
 const passHtml=`<section class="zsp-cc-editor" id="zspPassEditor"><h4>Премьера нового сезона</h4><span class="zsp-cc-hint">Три страницы — один сезонный стиль. Включай окна только для выбранного сезона. Визуал и тексты появятся без нового деплоя после сохранения.</span>${pageMarkup('Main')}${pageMarkup('Pass')}</section>`;
 const ratingHtml=`<section class="zsp-cc-editor" id="zspRatingEditor"><h4>Приветствие рейтингового сезона</h4><span class="zsp-cc-hint">Отдельная презентация для рейтинга. Итоги прошлого сезона имеют приоритет над приветствием нового.</span>${pageMarkup('Rating')}</section>`;
 before(p,'  <div class="actions" style="margin-top:12px"><button class="btn gold" id="passVisualSave"',passHtml+'\n','pass visual editor markup');
 before(p,'<div class="actions" style="margin-top:10px"><button class="btn gold" id="ratingVisualSave"',ratingHtml+'\n','rating visual editor markup');
 before(p,'function renderPassVisuals(){',ccJs+'\n','cc client helpers');
 once(p,'renderPassStoryCollectible(visuals);if(info)',
 "renderPassStoryCollectible(visuals);zspCcFill('Main',visuals?.premiere?.main);zspCcFill('Pass',visuals?.premiere?.pass);if(info)",
 'CC load pass premiere settings');
 once(p,"payload.storyCollectibleAchievementSteps=passStoryCollectibleStepsFromForm();setBusy(button,true,'Сохраняю…');",
 "payload.storyCollectibleAchievementSteps=passStoryCollectibleStepsFromForm();payload.premiere={main:zspCcRead('Main'),pass:zspCcRead('Pass')};setBusy(button,true,'Сохраняю…');",
 'CC save pass premiere settings');
 once(p,"syncRatingVisualHeroPreview();$('ratingVisualSave').disabled=!season;}",
 "syncRatingVisualHeroPreview();zspCcFill('Rating',season?.visuals?.rating?.premiere);$('ratingVisualSave').disabled=!season;}",
 'CC load rating premiere settings');
 once(p,"heroImage:String($('ratingVisualHeroImage').value||'').trim()});toast('Визуал рейтинга сохранён без deploy');",
 "heroImage:String($('ratingVisualHeroImage').value||'').trim(),premiere:zspCcRead('Rating')});toast('Визуал рейтинга сохранён без deploy');",
 'CC save rating premiere settings');
}
// Verify all files kept critical gameplay entry points before writing.
for(const path of names){const s=get(path);if(s.length<20_000)throw new Error(`${path}: expected production file, got ${s.length} bytes`);
 if(!s.includes(path==='src/worker.js'?coreMarker:'zsp-season-premiere-runtime-v1'))throw new Error(`${path}: marker missing`);
}
for(const path of names){if(get(path)!==original.get(path)){
 await writeFile(resolve(ROOT,path),get(path));reports.push(path);
}}
console.log('Season Premiere V1 applied successfully (existing game files patched, not replaced):\n'+reports.map(p=>'  '+p).join('\n'));
console.log('No D1 migrations. Run npm run check:fast and git diff --check before deploy.');
