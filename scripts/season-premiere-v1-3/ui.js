/* Season Premiere V1.3: working manual season information on Pass + Rating. UI-only. */
(()=>{
 'use strict';
 if(window.ZeffiSeasonPremiere)return;
 const ROOT='zefirok-season-premiere-v1', SESSION_KEY=ROOT+':session';
 const ICONS=Object.freeze({
  main:'/assets/ui/icon_o_sezone.webp',pass:'/assets/ui/icon_o_sezone.webp',rating:'/assets/ui/icon_o_sezone.webp'
 });
 const PREVIOUS_BUTTON_ICONS=new Set(["/assets/ui/icon_battlepass.webp","/assets/season-pass/season.webp","/assets/ui/icon_itog_reiting_season.webp"]);
 const FEATURE_ICONS=Object.freeze({
  main:['/assets/season-pass/season.webp','/assets/season-pass/quest.webp','/assets/ui/icon_reiting.webp'],
  pass:['/assets/season-pass/season.webp','/assets/season-pass/elite.webp','/assets/season-pass/xp.webp'],
  rating:['/assets/ui/icon_reiting.webp','/assets/ui/icon_itog_reiting_season.webp','/assets/season-pass/season.webp']
 });
 const DEFAULTS=Object.freeze({
  main:['Новый сезон начался','Сладкий Забег приглашает в новое приключение.','Открой историю сезона','Получай награды за задания','Соревнуйся в рейтинге','Открыть сезон'],
  pass:['Сокровища нового сезона','Пройди дорожку наград и собери коллекцию сезона.','50 уровней и бесплатные награды','Эксклюзивная линия Элитного пропуска','Сезонные задания и бонусы XP','Посмотреть награды'],
  rating:['Борьба за первое место','Новый сезон рейтинга открыт. Твой лучший результат имеет значение.','Выполняй зачтённые забеги','Поднимайся к вершине таблицы','Соревнуйся за награду лидера','К соревнованию']
 });
 const FALLBACK=Object.freeze({
  main:'/assets/season-pass/season_pass1.webp',pass:'/assets/season-pass/season_pass1.webp',rating:'/assets/rating/v8/season-1-cafe-opening.webp'
 });
 const imgSafe=(value,fallback)=>{const v=String(value||'').trim();return /^\/(?:assets)\/[A-Za-z0-9_./%+?=&-]+$/.test(v)&&!v.includes('..')?v:fallback};
 const string=(x,max=180)=>String(x||'').trim().slice(0,max);
 const key=(c)=>`${ROOT}:${c.userId||'anonymous'}:${c.surface}:${c.id}`;
 const sessionOwner=surface=>{try{const seen=sessionStorage.getItem(SESSION_KEY)||'';return seen.includes(':'+surface+':')?seen:''}catch{return ''}};
 let current=null,layer=null,previousFocus=null,previousBodyOverflow='',timer=0,lastAutokey='';
 const manualModels=new WeakMap();
 function normalize(data){
  if(!data||typeof data!=='object')return null;
  const surface=String(data.surface||'');if(!DEFAULTS[surface])return null;
  const raw=data.premiere||{},defaults=DEFAULTS[surface];
  const id=string(data.id,150),userId=string(data.userId,40);if(!id)return null;
  const features=Array.isArray(raw.features)?raw.features:[];
  return {id,userId,surface,enabled:raw.enabled===true,status:String(data.status||''),
   title:string(raw.title||defaults[0],90),subtitle:string(raw.subtitle||data.seasonTitle||defaults[1],140),
   description:string(raw.description||defaults[1],360),
   art:imgSafe(raw.imageUrl||data.heroImage,FALLBACK[surface]),manualIcon:imgSafe(PREVIOUS_BUTTON_ICONS.has(String(raw.iconUrl||'').trim())?'':raw.iconUrl,ICONS[surface]),
   features:[0,1,2].map(i=>string(features[i]||defaults[i+2],115)),
   reward:data.reward&&typeof data.reward==='object'?{
    title:string(data.reward.title,110),imageUrl:imgSafe(data.reward.imageUrl,'')}:null,
   actionLabel:defaults[5],action:typeof data.action==='function'?data.action:null};
 }
 const anyModal=()=>[...document.querySelectorAll('[aria-modal="true"]')].some(el=>
  el!==layer&&el.isConnected&&!el.hidden&&el.getClientRects().length>0&&getComputedStyle(el).display!=='none') ||
  Boolean(document.querySelector('.zgt-layer:not([hidden]),.zcc-season-layer:not([hidden]),.zcc-rating-layer:not([hidden])')) ||
  Boolean(window.ZefirokPageGuide?.isOpen?.());
 function make(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el}
 function close(){if(!layer||layer.hidden)return;layer.hidden=true;document.body.style.overflow=previousBodyOverflow;try{previousFocus?.focus?.({preventScroll:true})}catch{}previousFocus=null}
 function render(config){
  if(!layer){layer=make('section','zsp-overlay');layer.hidden=true;layer.setAttribute('role','presentation');document.body.append(layer);
   layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest?.('[data-zsp-close]'))close()});
   layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){
    const controls=[...layer.querySelectorAll('button:not([disabled])')];if(!controls.length)return;
    if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus()}
    else if(!e.shiftKey&&document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus()}
   }});
  }
  layer.replaceChildren();const card=make('article','zsp-card');card.dataset.surface=config.surface;card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',config.title);
  const closeButton=make('button','zsp-close','×');closeButton.type='button';closeButton.dataset.zspClose='';closeButton.setAttribute('aria-label','Закрыть приветствие');card.append(closeButton);
  const visual=make('div','zsp-visual');const art=make('img','zsp-cover');art.src=config.art;art.alt='';art.decoding='async';art.loading='eager';art.addEventListener('error',()=>{if(!art.src.endsWith(FALLBACK[config.surface]))art.src=FALLBACK[config.surface]},{once:true});visual.append(art);
  const brand=make('div','zsp-brand');const brandArt=make('img');brandArt.src=config.manualIcon;brandArt.alt='';brandArt.setAttribute('aria-hidden','true');brand.append(brandArt,make('span','',config.surface==='main'?'Сладкий Забег':config.surface==='pass'?'Сезонный пропуск':'Рейтинг сезона'));visual.append(brand);card.append(visual);
  const info=make('div','zsp-info');info.append(make('span','zsp-eyebrow','ПРЕМЬЕРА СЕЗОНА'),make('h2','',config.title),make('span','zsp-subtitle',config.subtitle),make('p','zsp-description',config.description));
  const list=make('div','zsp-list');const labels=config.features;
  labels.forEach((label,i)=>{if(!label)return;const row=make('div','zsp-feature');const image=make('img');image.src=FEATURE_ICONS[config.surface][i];image.alt='';image.loading='lazy';row.append(image,make('span','',label));list.append(row)});
  if(config.surface==='rating'&&config.reward?.title){const row=make('div','zsp-feature is-reward');const image=make('img');image.src=config.reward.imageUrl||'/assets/ui/icon_itog_reiting_season.webp';image.alt='';row.append(image,make('span','','Награда лидеру: '+config.reward.title));list.append(row)}
  info.append(list);const actions=make('div','zsp-actions'),main=make('button','zsp-action',config.actionLabel),later=make('button','zsp-later','Продолжить без просмотра');main.type='button';later.type='button';later.dataset.zspClose='';main.addEventListener('click',()=>{close();try{config.action?.()}catch(e){console.error('Season premiere navigation failed',e)}});actions.append(main,later);info.append(actions);card.append(info);layer.append(card);
  previousFocus=document.activeElement;previousBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';layer.hidden=false;closeButton.focus({preventScroll:true});
 }
 function openManual(data){
  // Manual information is available for every authenticated active season.
  // The CC enabled switch controls ONLY automatic display, never this button.
  const next=data?normalize(data):current;
  if(!next||next.status!=='active')return false;
  render(next);return true;
 }
 function consider(data,{delay=850,blocked=null}={}){
  const next=normalize(data);
  if(!next||!next.enabled||next.status!=='active')return false;
  current=next;
  const k=key(next);
  if(sessionOwner(next.surface))return false;
  try{if(localStorage.getItem(k)==='1')return false}catch{}
  if(timer&&k===lastAutokey)return true;
  lastAutokey=k;if(timer)clearTimeout(timer);
  // The main screen uses delay:0. Open synchronously on receipt of the
  // authenticated season snapshot, not 1150ms after the game finishes loading.
  // If a high-priority dialog is open, retry in the UI only; no API or D1 calls.
  const attempt=(retries=0)=>{
   timer=0;
   if(!current||key(current)!==k||sessionOwner(next.surface))return;
   try{if(localStorage.getItem(k)==='1')return}catch{}
   let busy=document.visibilityState==='hidden';
   try{if(!busy)busy=anyModal()||(typeof blocked==='function'&&blocked())}catch{busy=true}
   if(busy){
    if(retries<240)timer=setTimeout(()=>attempt(retries+1),retries<20?120:650);
    return;
   }
   try{render(next)}catch(error){console.error('Season premiere display failed',error);return}
   if(!layer||layer.hidden)return;
   try{sessionStorage.setItem(SESSION_KEY,k)}catch{}
   try{localStorage.setItem(k,'1')}catch{}
  };
  if(Number(delay)<=0)attempt();else timer=setTimeout(()=>attempt(),delay);
  return true;
 }
 function setCurrent(data){const next=normalize(data);if(!next)return false;current=next;return true}
 function ensureManual(target,data){
  const next=data?normalize(data):current;
  if(!next||next.status!=='active'||!target)return false;
  let host=target;
  // Place rating info BESIDE the season badge, not above the prize card.
  if(next.surface==='rating'){
   const title=target.querySelector('.rating-v6-hero-copy');
   const badge=title?.querySelector('.rating-v6-season-pill');
   if(!title||!badge)return false;
   let row=title.querySelector('.rating-v6-season-line');
   if(!row){row=make('div','rating-v6-season-line');badge.replaceWith(row);row.append(badge)}
   host=row;
  }
  let button=target.querySelector('[data-zsp-manual]');
  if(!button){
   button=make('button','zsp-manual');button.type='button';button.dataset.zspManual='';
   const image=make('img');image.alt='';image.setAttribute('aria-hidden','true');
   button.append(image,make('span','','О сезоне'));
  }
  const image=button.querySelector('img');if(image)image.src=next.manualIcon;
  button.setAttribute('aria-label','О сезоне: '+next.title);
  manualModels.set(button,data||next);
  if(button.parentNode!==host){
   if(next.surface==='pass'){
    const info=target.querySelector(':scope > p');
    if(info&&info.parentNode===host)info.insertAdjacentElement('afterend',button);
    else host.append(button);
   }else host.append(button);
  }
  return true;
 }
 // Capture the actual button click before the surrounding Pass/Rating views can
 // treat it as a navigation or card click; keyboard activation still emits click.
 if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-zsp-manual]');
  if(!button||!manualModels.has(button))return;
  event.preventDefault();event.stopPropagation();
  try{openManual(manualModels.get(button))}catch(error){console.error('Season premiere manual opening failed',error)}
 },true);
 window.ZeffiSeasonPremiere={consider,openManual,setCurrent,ensureManual,close,get active(){return Boolean(layer&&!layer.hidden)}};
})();
