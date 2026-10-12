import { CATALOG } from '../catalog.js';
import { drawWorld, isoToScreen } from '../renderer.js';
import { preloadSpriteSet, onSpriteUpdate, spriteStatus } from '../sprite-assets.js';
import { buildCitizenScene, sampleCitizenScene } from '../citizens.js';
import { buildBusScene, sampleBusScene, preloadBusArt, busArtStatus } from '../traffic.js';
import { createDemoState, loadDemo, saveDemo, resetDemo, contribute, simulateCommunityHelp, addDemoMaterials, openProject, setDemoChapter, visitPlace, projectStatus, projectTotal, PROJECT_GOAL } from './model.js';
import { DISTRICTS, PLACES, placeById, isPlaceOpen, lockedDistricts, buildStoryMap, validateStoryMap } from './map.js';
import { icon, escapeText as esc, artUrl, requiredStorySpriteIds, centerCamera, worldAt, zoomCamera, clampCamera } from './view.js';

const $=id=>document.getElementById(id);
const STATUS={funding:'Сбор материалов',building:'Строительство',opening:'Готов к открытию',active:'Сад открыт'};
const money=n=>Number(n).toLocaleString('ru-RU');
const clock=ms=>{const seconds=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
let booted=false;
export async function startStoryWorld({mode='standalone'}={}) {
 if(booted)return;
 const gate=$('accessGate');
 $('accessTitle').textContent='Собираем общий город…';
 $('accessMessage').textContent='Загружаем существующие игровые постройки и парки.';
 let loadTimer;
 const timeout=new Promise((_,reject)=>{loadTimer=setTimeout(()=>reject(new Error('Загрузка заняла слишком много времени. Повторите попытку.')),20000);});
 const warm=await Promise.race([preloadSpriteSet(requiredStorySpriteIds(),{pin:true,onProgress:p=>{$('loadProgress').value=Math.round(p.done/p.total*100);}}),timeout]).finally(()=>clearTimeout(loadTimer));
 if(warm.failed)throw new Error(`Не удалось загрузить ${warm.failed} игровых изображений. Проверьте, что сборка распакована полностью.`);
 await preloadBusArt();
 booted=true;
 const canvas=$('storyCanvas'),overlay=$('storyOverlay'),zone=$('mapZone'),panel=$('storyPanel');
 let storage=null;try{storage=window.localStorage;}catch{}
 const loaded=loadDemo(storage);let state=loaded.state,persistent=loaded.persistent;
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduce.matches,pauseAt=Date.now(),pauseOffset=0;
 let city,citizens,buses,observedStatus,selectedPanel='',selectedAmount=50;
 let cam=centerCamera(25,25,innerWidth<600?.86:.87),size={width:1,height:1};
 let raf=0,ticker=0,dirty=true,layoutDirty=true,lastFrame=0,toastTimer=0,disposed=false,focusId='square',tween=null;
 const drawTimes=[];const disposers=[];const markerElements=new Map();
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);disposers.push(()=>target.removeEventListener(type,fn,options));};
 function toast(text){$('storyToast').textContent=text;$('storyToast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('storyToast').classList.remove('visible'),3200);}
 function store(next){state=next;persistent=saveDemo(storage,state);if(!persistent)toast('Сохранение недоступно. Тестовые изменения останутся только до закрытия страницы.');}
 function haptic(){try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');}catch{}}
 function schedule(){dirty=true;if(!raf&&!document.hidden&&!disposed)raf=requestAnimationFrame(frame);}
 function rebuild(){
  const next=buildStoryMap(state);const errors=validateStoryMap(next);
  if(errors.length)throw new Error('Карта не прошла проверку: '+errors.join('; '));
  city=next;citizens=buildCitizenScene(city,CATALOG,100,Date.now(),400);buses=buildBusScene(city,CATALOG);
  observedStatus=projectStatus(state);layoutDirty=true;
  $('sceneFacts').textContent=`48 × 48 · ${citizens.routes.length} жителей · ${buses.routes.length} автобуса`;
  refreshMarkers();refreshHUD();schedule();
 }
 function refreshHUD(){
  const status=projectStatus(state),percent=Math.round(projectTotal(state)/PROJECT_GOAL*100);
  $('modeBadge').textContent=mode==='standalone'?'V1.3 · АВТОНОМНО':'V1.3 · ТЕСТЕР';
  $('demoNotice').textContent='Локальный тест. Реальные валюты не списываются.';
  $('bannerPercent').textContent=status==='active'?'Открыт':status==='building'?clock(state.project.readyAt-Date.now()):`${percent}%`;
  $('bannerBar').style.width=`${percent}%`;
  $('bannerStatus').textContent=status==='funding'?`${money(projectTotal(state))} / ${money(PROJECT_GOAL)} · только на этом устройстве`:status==='building'?'Достраиваем сад. Можно продолжать прогулку.':status==='opening'?'Сад готов! Нажмите, чтобы открыть.':'Совместный проект завершён в локальном тесте';
  $('bannerArt').src=artUrl('garden');
  $('pauseLife').innerHTML=icon(paused?'play':'pause');$('pauseLife').setAttribute('aria-pressed',String(paused));
  $('pauseLife').setAttribute('aria-label',paused?'Продолжить анимацию':'Приостановить анимацию');
  for(const button of $('districtStrip').querySelectorAll('button')){
   const place=placeById(button.dataset.district);button.classList.toggle('locked',!isPlaceOpen(place,state));
   button.setAttribute('aria-pressed',String(button.dataset.district===focusId));
  }
 }
 function refreshMarkers(){
  for(const place of PLACES){
   let button=markerElements.get(place.id);
   if(!button){button=document.createElement('button');button.type='button';button.className='map-marker';button.dataset.place=place.id;$('mapMarkers').append(button);markerElements.set(place.id,button);}
   const locked=!isPlaceOpen(place,state);button.innerHTML=icon(locked?'lock':place.icon)+`<span>${esc(place.short)}</span>`;
   button.dataset.locked=String(locked);button.dataset.project=String(place.id==='community-garden');
   button.setAttribute('aria-label',`${place.title}${locked?' — пока закрыто':''}`);
  }
 }
 function refreshFocus(id){
  if(!placeById(id))id='square';focusId=id;$('focusTitle').textContent=placeById(id).title;refreshHUD();
 }
 function focusPlace(id,overview=false){
  const place=placeById(id)||placeById('square');refreshFocus(place.id);
  const target=centerCamera(...place.focus,overview?(size.width<650?.29:.48):(size.width<650?.95:1.02));
  tween=paused||reduce.matches?null:{from:{...cam},to:target,start:performance.now()};
  if(!tween)cam=target;
  $('mapHint').style.opacity='0';layoutDirty=true;schedule();
 }
 function poly(ctx,points,fill,stroke='',width=1){ctx.beginPath();points.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function projectedBounds(bounds){const[x,y,w,h]=bounds;return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>isoToScreen(a,b,size,cam));}
 function paintOverlay(){
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(size.width*dpr),h=Math.round(size.height*dpr);
  if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h;}
  const ctx=overlay.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size.width,size.height);
  for(const place of PLACES){
   const button=markerElements.get(place.id),pt=isoToScreen(...place.focus,size,cam);
   const rise=isPlaceOpen(place,state)?(place.id==='community-garden'?52:75)*cam.zoom:46*cam.zoom;
   const y=pt.y-rise;
   button.hidden=pt.x<55||pt.x>size.width-52||y<100||y>size.height-125;
   button.style.left=`${pt.x}px`;button.style.top=`${y}px`;
  }
  paintMiniMap();
 }
 function paintMiniMap(){
  const mini=$('miniMap'),ctx=mini.getContext('2d'),w=264,h=212;mini.width=w;mini.height=h;
  const to=(x,y)=>({x:w/2+(x-y)*2.38,y:12+(x+y)*1.7});
  ctx.clearRect(0,0,w,h);poly(ctx,[to(0,0),to(48,0),to(48,48),to(0,48)],'#c7ddad','#9ab985',1.5);
  ctx.fillStyle='#fbf4df';for(const road of city.roads){const[x,y]=road.split(',').map(Number);const pt=to(x+.5,y+.5);ctx.fillRect(pt.x-1.4,pt.y-1,2.8,2);}
  ctx.fillStyle='#606673';for(const road of city.busRoads||[]){const[x,y]=road.split(',').map(Number);const pt=to(x+.5,y+.5);ctx.fillRect(pt.x-1.4,pt.y-1,2.8,2);}
  for(const d of lockedDistricts(state)){const[x,y,a,b]=d.bounds;poly(ctx,[to(x,y),to(x+a,y),to(x+a,y+b),to(x,y+b)],'#c7c4cf');}
  for(const d of DISTRICTS){const pt=to(...d.focus);ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fillStyle=isPlaceOpen(d,state)?'#b27096':'#918394';ctx.fill();}
  const corners=[[0,0],[size.width,0],[size.width,size.height],[0,size.height]].map(([x,y])=>{const p=worldAt(x,y,size,cam);return to(p.x,p.y);});
  poly(ctx,corners,'#ffffff20','#a56589',2);
 }
 function frame(t){
  raf=0;if(disposed||document.hidden)return;
  if(tween){const f=Math.min(1,(t-tween.start)/380),e=f*f*(3-2*f);cam={x:tween.from.x+(tween.to.x-tween.from.x)*e,y:tween.from.y+(tween.to.y-tween.from.y)*e,zoom:tween.from.zoom+(tween.to.zoom-tween.from.zoom)*e};layoutDirty=true;dirty=true;if(f>=1)tween=null;}
  const live=!paused&&!reduce.matches;
  if(dirty||t-lastFrame>=1000/30){
   const start=performance.now(),now=Date.now(),ambient=(paused?pauseAt:now)-pauseOffset;
   drawWorld(canvas,city,CATALOG,cam,{now,groundZones:[...lockedDistricts(state).map(d=>({bounds:d.bounds,future:d.chapter===99})),...(projectStatus(state)==='funding'?[{bounds:[14,34,3,3],project:true}]:[])],citizens:sampleCitizenScene(citizens,ambient),buses:sampleBusScene(buses,ambient)});
   if(layoutDirty){paintOverlay();layoutDirty=false;}
   drawTimes.push(performance.now()-start);if(drawTimes.length>120)drawTimes.shift();lastFrame=t;dirty=false;
  }
  if(live||tween)raf=requestAnimationFrame(frame);
 }
 function resize(){const r=zone.getBoundingClientRect();size={width:Math.max(1,r.width),height:Math.max(1,r.height)};cam=clampCamera(cam,size);layoutDirty=true;schedule();}
 function tick(){
  if(document.hidden||disposed)return;
  const status=projectStatus(state);
  if(status!==observedStatus){rebuild();if(selectedPanel==='project')renderPanel();if(status==='opening')toast('Сад готов к открытию! Загляните в городской проект.');}
  if(status==='building'){
   refreshHUD();const node=$('buildClock');if(node)node.textContent=clock(state.project.readyAt-Date.now());
   if(paused||reduce.matches)schedule();
  }
 }
 function pause(){if(paused){pauseOffset+=Date.now()-pauseAt;paused=false;}else{pauseAt=Date.now();paused=true;}refreshHUD();schedule();}
 function statusLabel(place){return isPlaceOpen(place,state)?'Доступно для прогулки':place.chapter===99?'Будущий район':`Тестовый сюжет · этап ${place.chapter+1}`;}
 function cardArt(place,locked=false){return `<div class="panel-art${locked?' locked':''}"><img src="${artUrl(place.kind)}" alt="${esc(place.title)}" />${locked?'<span class="art-question">?</span>':''}</div>`;}
 function openPanel(kind){selectedPanel=kind;renderPanel();if(!panel.open)panel.showModal();haptic();}
 function closePanel(){panel.close();selectedPanel='';}
 function openPlace(id){
  const place=placeById(id);if(!place)return;
  if(id==='community-garden'){openPanel('project');return;}
  if(isPlaceOpen(place,state)&&!state.visited.includes(id))store(visitPlace(state,id));
  openPanel(`place:${id}`);
 }
 function renderPanel(){
  const focused=document.activeElement?.getAttribute?.('data-action');let html='';
  if(selectedPanel==='districts'){
   html=`<span class="eyebrow">БОЛЬШОЙ СЮЖЕТНЫЙ МИР</span><h2 id="panelTitle">Районы города</h2><p>48 × 48 клеток: в четыре раза больше по площади, чем стартовый личный город. Выберите район — камера перенесёт вас туда.</p>`;
   html+=DISTRICTS.map(d=>`<button class="district-row" data-go="${d.id}"><span class="row-icon">${icon(isPlaceOpen(d,state)?d.icon:'lock')}</span><span class="row-copy"><strong>${esc(d.title)}</strong><small>${statusLabel(d)}</small></span><span class="row-arrow">›</span></button>`).join('');
  }else if(selectedPanel==='project'){
   const s=projectStatus(state),total=projectTotal(state),percent=Math.round(total/PROJECT_GOAL*100),place=placeById('community-garden');
   html=`<span class="eyebrow">ГОРОДСКОЙ ПРОЕКТ · ДЕМО</span><h2 id="panelTitle">Сад встреч</h2><span class="status-pill">${icon(s==='active'?'check':'heart')}${STATUS[s]}</span>${cardArt(place)}<p>Новый сад рядом с парком Белкино. Пройдите пробный цикл: сбор материалов, стройка и открытие.</p><div class="panel-progress"><div><span>${money(total)} / ${money(PROJECT_GOAL)} материалов</span><strong>${percent}%</strong></div><span class="mini-track"><span style="width:${percent}%"></span></span></div><div class="project-stats"><div class="stat-box"><small>Ваш тестовый вклад</small><strong>${money(state.project.personal)}</strong></div><div class="stat-box"><small>Тестовые материалы</small><strong>${money(state.materials)}</strong></div></div>`;
   if(s==='funding')html+=`<div class="amounts" aria-label="Размер тестового вклада">${[25,50,100].map(n=>`<button data-amount="${n}" aria-pressed="${selectedAmount===n}">${n}</button>`).join('')}</div><button class="primary" data-action="contribute" ${state.materials<Math.min(selectedAmount,PROJECT_GOAL-total)?'disabled':''}>${icon('heart')}Внести ${Math.min(selectedAmount,PROJECT_GOAL-total)} материалов</button>`;
   if(s==='building')html+=`<div id="buildClock" class="clock" role="timer" aria-label="До завершения стройки">${clock(state.project.readyAt-Date.now())}</div><p style="text-align:center">В тесте стройка длится 45 секунд. Таймер продолжится после закрытия карточки.</p>`;
   if(s==='opening')html+=`<button class="primary" data-action="open-project">${icon('spark')}Открыть сад</button>`;
   if(s==='active')html+=`<div class="celebration">${icon('heart')}</div><p><strong>Сад открыт в вашем тестовом городе.</strong> Теперь это готовая постройка на карте. Реальных наград эта версия не выдаёт.</p>`;
   html+=`<div class="demo-box"><strong>Это не настоящий общий сбор.</strong> Вклад, ${money(state.project.community)} материалов тестового сообщества и стройка сохраняются только на этом устройстве. Кофе, зефир и очки не используются.</div><button class="secondary" data-go="community-garden">${icon('target')}Показать на карте</button><button class="secondary" data-action="test">Управление тестом</button>`;
  }else if(selectedPanel==='test'){
   html=`<span class="eyebrow">АВТОНОМНЫЙ ЭТАП V1</span><h2 id="panelTitle">Проверяем город</h2><div class="demo-box">${mode==='standalone'?'Полностью автономная сборка.':'Сервер проверил доступ тестера, но сама симуляция локальная.'} Общего прогресса игроков, реальных вкладов и наград в v1 ещё нет.</div><h3>Открытие зон по сюжету</h3><div class="chapter-buttons">${['1 · Стартовая карта','2 · Открыта площадка событий','3 · Появился «Белый Кролик»'].map((s,i)=>`<button data-chapter="${i}" aria-pressed="${state.chapter===i}">${esc(s)}</button>`).join('')}</div><p class="panel-footnote">Это переключатель сценариев для тестирования карты, а не изменение сезона или сюжетного прогресса игрока.</p><h3>Пробное коллективное строительство</h3><div class="test-actions"><button class="secondary" data-action="materials">+200 тестовых материалов себе</button><button class="secondary" data-action="community" ${projectStatus(state)!=='funding'?'disabled':''}>Сымитировать помощь сообщества +200</button><button class="secondary" data-action="project">Перейти к стройпроекту</button><button class="secondary" data-action="pause">${paused?'Продолжить':'Приостановить'} анимацию города</button></div><p class="panel-footnote">${persistent?'Тест сохраняется только в этом браузере.':'Сохранение недоступно: изменения временные.'} Личный город не читается и не меняется.</p><button class="danger" data-action="reset-confirm">Сбросить только этот тест</button>`;
  }else if(selectedPanel==='reset-confirm'){
   html=`<span class="eyebrow">ЛОКАЛЬНЫЙ ТЕСТ</span><h2 id="panelTitle">Начать сначала?</h2><p>Сбросятся тестовый вклад, открытые зоны и материалы общего мира на этом устройстве. Личный город, баланс и прогресс игры останутся без изменений.</p><button class="primary" data-action="reset">Да, сбросить тест</button><button class="secondary" data-action="test">Отмена</button>`;
  }else if(selectedPanel.startsWith('place:')){
   const place=placeById(selectedPanel.slice(6));if(!place)return;
   const locked=!isPlaceOpen(place,state);
   html=`<span class="eyebrow">${locked?'БУДУЩЕЕ ГОРОДА':'МЕСТО НА КАРТЕ'}</span><h2 id="panelTitle">${esc(place.title)}</h2><span class="status-pill">${icon(locked?'lock':'check')}${statusLabel(place)}</span>${cardArt(place,locked)}<p>${esc(place.description)}</p>`;
   if(place.id==='cafe')html+='<div class="demo-box">Главная героиня — Зеффи, кремово-белая пушистая собачка. Кафе «Зефирок» остаётся её знакомым местом, а не новым придуманным заведением.</div>';
   if(place.id==='rabbit')html+='<div class="demo-box">Архитектура пока условная: используется существующая модель из каталога, а не утверждённый арт стоматологии. Сюжетные сцены ещё не подключены.</div>';
   if(place.id==='friends')html+='<p class="panel-footnote">Название квартала — рабочее название прототипа. Новые биографии или дома персонажей здесь не назначаются.</p>';
   if(locked&&place.chapter<99)html+='<p class="panel-footnote">Для проверки появления здания выберите следующий сценарий во вкладке «Тест v1».</p>';
   html+=`<button class="primary" data-go="${place.id}">${icon('target')}Показать на карте</button>`;
   if(locked&&place.chapter<99)html+='<button class="secondary" data-action="test">Перейти к тестовым сценариям</button>';
   if(place.id==='belkino')html+='<button class="secondary" data-action="project">Помочь построить Сад встреч</button>';
   html+='<p class="panel-footnote">V1: исследование карты. Сюжетные задания, награды и реальные события будут подключены отдельно.</p>';
  }
  $('panelContent').innerHTML=html;
  if(focused)$('panelContent').querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
 }
 function execute(action){
  try{
   if(action==='contribute'){
    const result=contribute(state,selectedAmount);store(result.state);haptic();toast(`Внесено ${result.accepted} тестовых материалов. Реальный баланс не изменён.`);rebuild();renderPanel();
   }else if(action==='materials'){store(addDemoMaterials(state));renderPanel();toast('Добавлено 200 тестовых материалов.');
   }else if(action==='community'){store(simulateCommunityHelp(state));rebuild();renderPanel();toast('Сымитирована помощь сообщества. Это локальный тест.');
   }else if(action==='open-project'){store(openProject(state));rebuild();renderPanel();toast('Сад встреч открыт! Найдите его рядом с парком.');haptic();
   }else if(action==='reset'){state=resetDemo(storage);store(state);rebuild();openPanel('test');focusPlace('square');toast('Тест общего города сброшен. Личный город не затронут.');
   }else if(action==='reset-confirm')openPanel('reset-confirm');
   else if(action==='project')openPanel('project');
   else if(action==='test')openPanel('test');
   else if(action==='pause'){pause();if(selectedPanel)renderPanel();}
  }catch(error){
   const messages={INSUFFICIENT_DEMO_MATERIALS:'Недостаточно тестовых материалов. Добавьте их во вкладке «Тест v1».',PROJECT_NOT_FUNDING:'Сбор уже завершён.',PROJECT_NOT_READY:'Сад ещё не готов к открытию.'};
   toast(messages[error.message]||'Не удалось выполнить тестовое действие.');
  }
 }
 $('returnWorld').innerHTML=icon('back');$('zoomIn').innerHTML=icon('plus');$('zoomOut').innerHTML=icon('minus');$('centerMap').innerHTML=icon('target');$('closePanel').innerHTML=icon('close');
 for(const element of document.querySelectorAll('[data-icon]'))element.innerHTML=icon(element.dataset.icon);
 $('districtStrip').innerHTML=DISTRICTS.map(d=>`<button class="district-chip" data-district="${d.id}" aria-pressed="${d.id==='square'}">${icon(d.icon)}${esc(d.short)}</button>`).join('');
 listen($('districtStrip'),'click',e=>{const button=e.target.closest('[data-district]');if(button)focusPlace(button.dataset.district);});
 listen($('mapMarkers'),'click',e=>{const button=e.target.closest('[data-place]');if(button)openPlace(button.dataset.place);});
 listen($('panelContent'),'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.action)execute(b.dataset.action);
  if(b.dataset.amount){selectedAmount=Number(b.dataset.amount);renderPanel();}
  if(b.dataset.chapter){store(setDemoChapter(state,Number(b.dataset.chapter)));rebuild();renderPanel();toast('Тестовый сценарий карты изменён. Сюжет игрока не затронут.');}
  if(b.dataset.go){closePanel();focusPlace(b.dataset.go);}
 });
 listen($('closePanel'),'click',closePanel);listen(panel,'close',()=>{selectedPanel='';});
 listen(panel,'click',e=>{if(e.target===panel){const b=panel.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closePanel();}});
 listen($('modeBadge'),'click',()=>openPanel('test'));listen($('projectBanner'),'click',()=>openPanel('project'));
 listen($('returnWorld'),'click',()=>{if(mode==='standalone'){openPanel('test');toast('Это автономная сборка общего мира. Личный город здесь не загружается.');}else location.assign(new URL('../world.html?world_tester=1',document.baseURI).href);});
 listen(document.querySelector('.bottom-nav'),'click',e=>{const b=e.target.closest('[data-nav]');if(!b)return;if(b.dataset.nav==='map')focusPlace('square');else openPanel(b.dataset.nav==='districts'?'districts':b.dataset.nav==='project'?'project':'test');});
 function changeZoom(factor,x=size.width/2,y=size.height/2){tween=null;cam=zoomCamera(cam,size,x,y,cam.zoom*factor);layoutDirty=true;schedule();}
 listen($('zoomIn'),'click',()=>changeZoom(1.2));listen($('zoomOut'),'click',()=>changeZoom(1/1.2));
 listen($('centerMap'),'click',()=>focusPlace('square'));listen($('pauseLife'),'click',pause);
 listen(canvas,'wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();changeZoom(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.002),e.clientX-r.left,e.clientY-r.top);},{passive:false});
 const pointers=new Map();let drag=null,pinch=null,moved=false;
 const eventPoint=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const pinchValue=()=>{const[a,b]=[...pointers.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};};
 listen(canvas,'pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;tween=null;canvas.setPointerCapture(e.pointerId);const p=eventPoint(e);pointers.set(e.pointerId,p);if(pointers.size===1){drag={point:p,cam:{...cam}};moved=false;}if(pointers.size===2){pinch={...pinchValue(),cam:{...cam}};moved=true;}});
 listen(canvas,'pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const p=eventPoint(e);pointers.set(e.pointerId,p);
  if(pointers.size>=2&&pinch){const now=pinchValue();cam=zoomCamera(pinch.cam,size,pinch.x,pinch.y,pinch.cam.zoom*now.d/pinch.d);cam.x+=now.x-pinch.x;cam.y+=now.y-pinch.y;cam=clampCamera(cam,size);}
  else if(drag){const dx=p.x-drag.point.x,dy=p.y-drag.point.y;if(Math.hypot(dx,dy)>6)moved=true;if(moved)cam=clampCamera({...drag.cam,x:drag.cam.x+dx,y:drag.cam.y+dy},size);}
  if(moved){$('mapHint').style.opacity='0';layoutDirty=true;schedule();}
 });
 function endPointer(e){
  if(!pointers.has(e.pointerId))return;const p=eventPoint(e),wasTap=!moved&&pointers.size===1&&e.type==='pointerup';pointers.delete(e.pointerId);pinch=null;
  if(pointers.size===1){drag={point:[...pointers.values()][0],cam:{...cam}};moved=true;}else drag=null;
  if(wasTap){const at=worldAt(p.x,p.y,size,cam);const sharedCafe=city.objects.find(o=>o.uid==='story-cafe');
   if(sharedCafe&&at.x>=sharedCafe.x&&at.x<sharedCafe.x+4&&at.y>=sharedCafe.y&&at.y<sharedCafe.y+4){openPlace('cafe');return;}
   const place=[...PLACES].reverse().find(d=>{const[x,y,w,h]=d.bounds;return at.x>=x&&at.y>=y&&at.x<x+w&&at.y<y+h;});if(place)openPlace(place.id);}
 }
 listen(canvas,'pointerup',endPointer);listen(canvas,'pointercancel',endPointer);
 listen(canvas,'keydown',e=>{if(panel.open)return;let used=true;if(e.key==='+'||e.key==='=')changeZoom(1.2);else if(e.key==='-')changeZoom(1/1.2);else if(e.key==='Home')focusPlace('square');else if(e.key===' ')pause();else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){tween=null;cam.x+=e.key==='ArrowLeft'?45:e.key==='ArrowRight'?-45:0;cam.y+=e.key==='ArrowUp'?45:e.key==='ArrowDown'?-45:0;cam=clampCamera(cam,size);layoutDirty=true;schedule();}else used=false;if(used)e.preventDefault();});
 listen($('miniMap'),'click',e=>{const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)*264/rect.width,y=(e.clientY-rect.top)*212/rect.height,dx=(x-132)/2.38,dy=(y-12)/1.7;cam=clampCamera(centerCamera((dx+dy)/2,(dy-dx)/2,cam.zoom),size);tween=null;layoutDirty=true;schedule();});
 listen($('miniMap'),'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusPlace('square',true);}});
 listen(document,'visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);ticker=0;}else{tick();resize();if(!ticker)ticker=setInterval(tick,1000);}});
 listen(reduce,'change',()=>{if(reduce.matches&&!paused){pauseAt=Date.now();paused=true;}refreshHUD();schedule();});
 const observer=new ResizeObserver(resize);observer.observe(zone);
 onSpriteUpdate(schedule);
 gate.hidden=true;$('storyShell').hidden=false;
 rebuild();resize();ticker=setInterval(tick,1000);
 if(!persistent)toast('Локальное сохранение недоступно. Можно тестировать без сохранения.');
 window.ZeffiStoryDiagnostics=()=>({version:'1.3.0',transport:busArtStatus(),crosswalks:city.crosswalks.length,mode,mapSize:city.size,objects:city.objects.length,roads:city.roads.length,citizens:citizens.routes.length,buses:buses.routes.length,chapter:state.chapter,project:projectStatus(state),projectTotal:projectTotal(state),personalContribution:state.project.personal,materials:state.materials,paused,hidden:document.hidden,frameScheduled:!!raf,renderSamples:drawTimes.length,averageRenderMs:drawTimes.length?Math.round(drawTimes.reduce((a,b)=>a+b,0)/drawTimes.length*100)/100:0,assets:spriteStatus(),persistent,globalSync:false,walletWrites:false});
 function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);clearTimeout(toastTimer);observer.disconnect();onSpriteUpdate(()=>{});for(const off of disposers)off();}
 // bfcache keeps the document alive; only final navigation tears listeners down.
 listen(window,'pagehide',e=>{if(e.persisted){if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);ticker=0;}else dispose();});
 listen(window,'pageshow',e=>{if(e.persisted){tick();resize();if(!ticker)ticker=setInterval(tick,1000);}});
 return {dispose};
}
