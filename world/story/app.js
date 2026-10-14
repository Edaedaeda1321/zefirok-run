// The story-only 9x9 landmark is not part of the live shop/server catalog.
import { STORY_CATALOG as CATALOG } from './map.js';
import { drawWorld, isoToScreen } from '../renderer.js';
import { preloadSpriteSet, onSpriteUpdate, spriteStatus } from '../sprite-assets.js';
import { buildCitizenScene, sampleCitizenScene } from '../citizens.js';
import { buildBusScene, sampleBusScene, preloadBusArt, busArtStatus } from '../traffic.js';
import { createDemoState, loadDemo, saveDemo, resetDemo, contribute, simulateCommunityHelp, addDemoMaterials, openProject, setDemoChapter, visitPlace, projectStatus, projectTotal, PROJECT_GOAL, FESTIVAL_GOAL, FESTIVAL_MILESTONES, FESTIVAL_AMOUNTS, festivalStage, festivalTotal, festivalNextGoal, contributeFestival, simulateFestivalHelp, addFestivalDemoPoints, setWhiteRabbitPreview } from './model.js';
import { DISTRICTS, PLACES, placeById, isPlaceOpen, lockedDistricts, STORY_FESTIVAL_KINDS, buildStoryMap, validateStoryMap } from './map.js';
import { icon, escapeText as esc, artUrl, requiredStorySpriteIds, centerCamera, worldAt, zoomCamera, clampCamera } from './view.js';
import {createSharedFundClient, sharedFundQuote, mapStateWithFund} from './shared-fund.js';
import {communityChronicle,communityEvent,newlyReachedCommunityEvents,paintCommunityScene} from './community-events.js';
import {createStoryProgressClient} from './progress-client.js?v=rc-story1';
import {createWorldTutorial} from '../tutorial.js?v=rc-guide2';

const $=id=>document.getElementById(id);
const STATUS={funding:'Сбор материалов',building:'Строительство',opening:'Готов к открытию',active:'Сад открыт'};
const money=n=>Number(n).toLocaleString('ru-RU');
const clock=ms=>{const seconds=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
let booted=false;
export async function startStoryWorld({mode='standalone',initData=''}={}) {
 if(booted)return;
 const gate=$('accessGate');
 $('accessTitle').textContent='Собираем общий город…';
 $('accessMessage').textContent='Загружаем существующие игровые постройки и парки.';
 let loadTimer;
 const timeout=new Promise((_,reject)=>{loadTimer=setTimeout(()=>reject(new Error('Загрузка заняла слишком много времени. Повторите попытку.')),20000);});
 // Story read and sprite warmup share the loading screen; no local fallback.
 const signedStoryClient=mode==='tester'?createStoryProgressClient(initData):null;
 const [warm,signedStoryProgress]=await Promise.all([
  Promise.race([preloadSpriteSet(requiredStorySpriteIds(),{pin:true,onProgress:p=>{$('loadProgress').value=Math.round(p.done/p.total*100);}}),timeout]),
  signedStoryClient?signedStoryClient.read():Promise.resolve(null)
 ]).finally(()=>clearTimeout(loadTimer));
 if(warm.failed)throw new Error(`Не удалось загрузить ${warm.failed} игровых изображений. Проверьте, что сборка распакована полностью.`);
 await preloadBusArt();
 booted=true;
 const canvas=$('storyCanvas'),overlay=$('storyOverlay'),zone=$('mapZone'),panel=$('storyPanel');
 let storage=null;try{storage=window.localStorage;}catch{}
 // Hosted story uses D1 chapters and a real shared fund, not demo chapters.
 // Never import historical local saves or simulated contributions.
 const loaded=mode==='standalone'?loadDemo(storage):{state:createDemoState(),persistent:false};
 let state=loaded.state,persistent=loaded.persistent;
 if(signedStoryProgress)state={...state,chapter:signedStoryProgress.chapter,visited:[...signedStoryProgress.visited]};
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduce.matches,pauseAt=Date.now(),pauseOffset=0;
 let city,citizens,buses,observedStatus,selectedPanel='',selectedAmount=50,selectedFestivalAmount=1_000_000;
 let cam=centerCamera(25,25,innerWidth<600?.86:.87),size={width:1,height:1};
 const liveMode=mode==='tester',sharedClient=liveMode?createSharedFundClient(initData):null;
 const storyClient=signedStoryClient;
 let storySnapshot=signedStoryProgress,storyBusy=false,storyVisits=Promise.resolve();
 let worldTutorial=null;
 let sharedSnapshot=null,sharedError='',sharedRefreshing=false,fundBusy=false,pendingDonation=null,selectedLiveGardenAmount=5_000,selectedLiveFestivalAmount=5_000,liveTimer=0;
 let selectedCommunityEvent='',communityCelebration=null;
 let raf=0,ticker=0,dirty=true,layoutDirty=true,lastFrame=0,toastTimer=0,disposed=false,focusId='square',tween=null;
 const drawTimes=[];const disposers=[];const markerElements=new Map();
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);disposers.push(()=>target.removeEventListener(type,fn,options));};
 function toast(text){$('storyToast').textContent=text;$('storyToast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('storyToast').classList.remove('visible'),3200);}
 function store(next){if(liveMode)return;state=next;persistent=saveDemo(storage,state);if(!persistent)toast('Сохранение в локальном предпросмотре недоступно.');}
 function haptic(){try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');}catch{}}
 const worldState=()=>liveMode?mapStateWithFund(state,sharedSnapshot):state;
 const festivalKind=()=>STORY_FESTIVAL_KINDS[festivalStage(worldState())];
 function stageKind(place){if(place.id==='festival')return festivalKind();if((place.id==='cafe'||place.id==='rabbit')&&state.whiteRabbitPreview>0)return `story-wr-stage-${state.whiteRabbitPreview}`;return place.kind;}
 function schedule(){dirty=true;if(!raf&&!document.hidden&&!disposed)raf=requestAnimationFrame(frame);}
 function rebuild(){
  const next=buildStoryMap(worldState());const errors=validateStoryMap(next);
  if(errors.length)throw new Error('Карта не прошла проверку: '+errors.join('; '));
  city=next;citizens=buildCitizenScene(city,CATALOG,100,Date.now(),400);buses=buildBusScene(city,CATALOG);
  observedStatus=projectStatus(state);layoutDirty=true;
  $('sceneFacts').textContent=`48 × 48 · ${citizens.routes.length} жителей · ${buses.routes.length} автобуса`;
  refreshMarkers();refreshHUD();schedule();
 }
 function refreshHUD(){
  if(liveMode){
   const festivalSelected=focusId==='festival';const p=sharedSnapshot?.projects?.[festivalSelected?'festival':'garden'];
   const percent=p?Math.round(p.total/p.goal*100):0;
   $('modeBadge').title='Инструменты разработки';
   $('bannerTitle').textContent=festivalSelected?'Дом фестивалей Зеффи':'Сад встреч';
   $('bannerPercent').textContent=p?(p.finished?'Готов':`${percent}%`):'—';
   $('bannerBar').style.width=`${percent}%`;
   $('bannerStatus').textContent=p?`${money(p.total)} / ${money(p.goal)} очков · общий фонд`:'Не удалось загрузить серверный фонд';
   $('fundModeEyebrow').textContent='СТРОИМ ВМЕСТЕ';
   $('projectBanner').setAttribute('aria-label',`Общий фонд. ${festivalSelected?'Дом фестивалей':'Сад встреч'}: ${percent}%`);
   $('pauseLife').innerHTML=icon(paused?'play':'pause');$('pauseLife').setAttribute('aria-pressed',String(paused));
   $('pauseLife').setAttribute('aria-label',paused?'Продолжить анимацию':'Приостановить анимацию');
   return;
  }
  const festivalSelected=focusId==='festival'&&state.chapter>=1;
  $('fundModeEyebrow').textContent='СТРОИМ ВМЕСТЕ · ДЕМО';
  const status=projectStatus(state),fStatus=festivalStage(state);
  const percent=Math.round((festivalSelected?festivalTotal(state)/FESTIVAL_GOAL:projectTotal(state)/PROJECT_GOAL)*100);
  $('modeBadge').title=mode==='standalone'?'Меню автономной проверки':'Меню тестера';
  $('bannerPercent').textContent=festivalSelected?(fStatus==='complete'?'Готов':`${percent}%`):(status==='active'?'Открыт':status==='building'?clock(state.project.readyAt-Date.now()):`${percent}%`);
  $('bannerBar').style.width=`${percent}%`;
  $('bannerStatus').textContent=festivalSelected?`${money(festivalTotal(state))} / ${money(FESTIVAL_GOAL)} · ${fStatus==='complete'?'здание открыто':`порог ${money(festivalNextGoal(state))}`} · локальный тест`:(status==='funding'?`${money(projectTotal(state))} / ${money(PROJECT_GOAL)} · только на этом устройстве`:status==='building'?'Достраиваем сад. Можно продолжать прогулку.':status==='opening'?'Сад готов! Нажмите, чтобы открыть.':'Совместный проект завершён в локальном тесте');
  $('bannerTitle').textContent=festivalSelected?'Дом фестивалей Зеффи':'Сад встреч';
  $('pauseLife').innerHTML=icon(paused?'play':'pause');$('pauseLife').setAttribute('aria-pressed',String(paused));
  $('pauseLife').setAttribute('aria-label',paused?'Продолжить анимацию':'Приостановить анимацию');
  $('projectBanner').setAttribute('aria-label',`Городские стройки. ${festivalSelected?'Дом фестивалей':'Сад встреч'}: ${percent}%`);
 }
 function refreshMarkers(){
  for(const place of PLACES){
   let button=markerElements.get(place.id);
   if(!button){button=document.createElement('button');button.type='button';button.className='map-marker';button.dataset.place=place.id;$('mapMarkers').append(button);markerElements.set(place.id,button);}
   const locked=!isPlaceOpen(place,worldState());
   // White Rabbit shares a single physical building with Zephirok. One marker,
   // with both destinations in its bottom sheet, prevents stacked buttons.
   button.innerHTML=icon(locked?'lock':place.icon)+`<span>${esc(place.id==='cafe'?'Зефирок · Кролик':place.short)}</span>`;
   button.dataset.locked=String(locked);button.dataset.project=String(place.id==='community-garden');
   button.setAttribute('aria-label',`${place.title}${locked?' — пока закрыто':''}`);
  }
 }
 function refreshFocus(id){
  if(!placeById(id))id='square';focusId=id;$('focusTitle').textContent=placeById(id).title;refreshHUD();
 }
 function focusPlace(id,overview=false){
  const place=placeById(id)||placeById('square');refreshFocus(place.id);
  const target=centerCamera(...place.focus,overview?(size.width<650?.29:.48):place.id==='belkino'?(size.width<650?.60:.76):place.id==='festival'?(size.width<650?.55:.78):(size.width<650?.95:1.02));
  tween=paused||reduce.matches?null:{from:{...cam},to:target,start:performance.now()};
  if(!tween)cam=target;
  layoutDirty=true;schedule();
 }
 function poly(ctx,points,fill,stroke='',width=1){ctx.beginPath();points.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 function projectedBounds(bounds){const[x,y,w,h]=bounds;return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b])=>isoToScreen(a,b,size,cam));}
 function paintOverlay(){
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(size.width*dpr),h=Math.round(size.height*dpr);
  if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h;}
  const ctx=overlay.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size.width,size.height);
  for(const place of PLACES){
   const button=markerElements.get(place.id),pt=isoToScreen(...place.focus,size,cam);
   const rise=isPlaceOpen(place,worldState())?(place.id==='belkino'?195:place.id==='community-garden'?52:75)*cam.zoom:46*cam.zoom;
   const y=pt.y-rise;
   const compact=size.width<650;
   const isSharedRabbit=place.id==='rabbit';
   const onlyAtCloseZoom=compact&&cam.zoom<.67&&!['cafe','square','belkino','festival','community-garden'].includes(place.id);
   button.hidden=isSharedRabbit||onlyAtCloseZoom||pt.x<34||pt.x>size.width-34||y<20||y>size.height-105;
   button.style.left=`${pt.x}px`;button.style.top=`${y}px`;
  }
 }
 function frame(t){
  raf=0;if(disposed||document.hidden)return;
  if(tween){const f=Math.min(1,(t-tween.start)/380),e=f*f*(3-2*f);cam={x:tween.from.x+(tween.to.x-tween.from.x)*e,y:tween.from.y+(tween.to.y-tween.from.y)*e,zoom:tween.from.zoom+(tween.to.zoom-tween.from.zoom)*e};layoutDirty=true;dirty=true;if(f>=1)tween=null;}
  const live=!paused&&!reduce.matches;
  if(dirty||t-lastFrame>=1000/30){
   const start=performance.now(),now=Date.now(),ambient=(paused?pauseAt:now)-pauseOffset;
   drawWorld(canvas,city,CATALOG,cam,{now,groundZones:[...lockedDistricts(worldState()).map(d=>({bounds:d.bounds,future:d.chapter===99})),...(projectStatus(worldState())==='funding'?[{bounds:[14,34,3,3],project:true}]:[])],citizens:sampleCitizenScene(citizens,ambient),buses:sampleBusScene(buses,ambient)});
   // RC-5: visual-only, screen-culled events from signed D1 fund snapshots.
   if(liveMode&&sharedSnapshot)paintCommunityScene(canvas,cam,size,sharedSnapshot,ambient,{chapter:state.chapter,animate:live,celebrate:communityCelebration&&now<=communityCelebration.until?communityCelebration:null});
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
 function statusLabel(place){return isPlaceOpen(place,worldState())?'Доступно для прогулки':place.chapter===99?'Будущий район':`Откроется в главе ${place.chapter+1}`;}
 function applyStory(next){
  // Visits are monotonic; merge concurrent read responses without rolling back
  // a newly unlocked chapter from a second Telegram window.
  if(!next||!storySnapshot||next.chapter<storySnapshot.chapter||
    (next.chapter===storySnapshot.chapter&&next.revision<storySnapshot.revision))return;
  const visited=[...new Set([...storySnapshot.visited,...next.visited])];
  storySnapshot={...next,visited};state={...state,chapter:next.chapter,visited};
  if(!disposed){rebuild();if(selectedPanel)renderPanel();}
 }
 async function syncStoryProgress({quiet=false}={}){
  if(!liveMode||storyBusy||disposed)return;
  storyBusy=true;
  try{applyStory(await storyClient.read());}
  catch(error){if(!quiet)toast('Не удалось обновить историю. Попробуйте снова.');console.warn('Story sync failed',error?.code||error?.message);}
  finally{storyBusy=false;}
 }
 function markStoryVisit(id){
  if(!liveMode||!storySnapshot||storySnapshot.visited.includes(id)||!isPlaceOpen(placeById(id),worldState()))return;
  // Serialize visited markers; older responses cannot erase other visits.
  storyVisits=storyVisits.catch(()=>{}).then(async()=>{
   if(storySnapshot.visited.includes(id))return;
   try{applyStory(await storyClient.visit(id));}
   catch(error){console.warn('Story visit not saved',error?.code||error?.message);toast('Не удалось сохранить посещение. Повторите попытку.');}
  });
 }
 async function completeStoryChapter(){
  if(!liveMode||storyBusy||!storySnapshot)return;
  const expectedChapter=storySnapshot.chapter,expectedRevision=storySnapshot.revision;
  if(!storySnapshot.canAdvance)return toast('Сначала заверши цели главы.');
  storyBusy=true;
  try{
   const next=await storyClient.advance(expectedChapter,expectedRevision);
   applyStory(next);haptic();toast(next.completed?'История завершена! Продолжение появится позже.':'Новая глава и район открыты!');
  }catch(error){toast(error?.message||'Не удалось открыть следующую главу.');}
  finally{storyBusy=false;}
 }
 function cardArt(place,locked=false){return `<div class="panel-art${locked?' locked':''}"><img src="${artUrl(stageKind(place))}" alt="${esc(place.title)}" />${locked?'<span class="art-question">?</span>':''}</div>`;}
 function selectTab(tab){document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>{
  if(b.dataset.nav===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });}
 function openPanel(kind){if(liveMode&&['test','reset-confirm'].includes(kind))return;
  if(liveMode&&kind==='festival-project'&&storySnapshot?.chapter<1)kind='place:festival';
  if(liveMode&&kind==='project')markStoryVisit('community-garden');
  if(liveMode&&kind==='festival-project')markStoryVisit('festival');
  selectedPanel=kind;renderPanel();if(kind==='community-event')panel.scrollTop=0;selectTab(kind==='buildings'||kind==='project'||kind==='festival-project'?'buildings':kind==='history'||kind.startsWith('place:')?'history':'map');if(!panel.open){if(worldTutorial?.active())panel.show();else panel.showModal();}haptic();worldTutorial?.refresh();}
 function closePanel(){if(panel.open)panel.close();selectedPanel='';selectTab('map');}
 function openPlace(id){
  const place=placeById(id);if(!place)return;
  if(id==='community-garden'){openPanel('project');return;}
  if(id==='festival'&&isPlaceOpen(place,worldState())){openPanel('festival-project');return;}
  if(liveMode&&isPlaceOpen(place,worldState()))markStoryVisit(id);
  else if(!liveMode&&isPlaceOpen(place,worldState())&&!state.visited.includes(id))store(visitPlace(state,id));
  openPanel(`place:${id}`);
 }
 // Never allow an older read response to hide a milestone already confirmed
 // by a newer fund revision. There is no extra API or D1 write in RC-5.
 function acceptSharedSnapshot(next){
  if(!communityChronicle(next,'garden')||!communityChronicle(next,'festival'))throw new Error('Состояние городских событий не прошло проверку.');
  if(sharedSnapshot&&['garden','festival'].some(id=>next.projects[id].revision<sharedSnapshot.projects[id].revision))return [];
  const events=newlyReachedCommunityEvents(sharedSnapshot,next);
  sharedSnapshot=next;sharedError='';
  if(events.length){communityCelebration={projectId:events.at(-1).projectId,until:Date.now()+4500};schedule();}
  return events;
 }
 async function syncSharedFund({quiet=false}={}){
  if(!liveMode||sharedRefreshing||disposed)return;
  sharedRefreshing=true;
  try{
   const arrived=await sharedClient.load();
   const events=acceptSharedSnapshot(arrived);
   rebuild();if(selectedPanel)renderPanel();
   if(events.length&&!fundBusy){
    toast(`Город изменился: ${events.at(-1).title}. Посмотри в хронике строительства!`);
   }
  }catch(error){
   sharedError=String(error?.message||'Общий фонд временно недоступен.');
   if(!quiet)toast('Серверный фонд недоступен. Вклады заблокированы.');
   refreshHUD();if(selectedPanel)renderPanel();
  }finally{sharedRefreshing=false;}
 }
 function chronicleMarkup(projectId){
  const timeline=communityChronicle(sharedSnapshot,projectId);
  if(!timeline)return '<p class="community-chronicle__unavailable">Хроника появится после подтверждения состояния общего фонда.</p>';
  const upcoming=timeline.next;
  const progress=timeline.achieved+'/'+timeline.events.length;
  const rows=timeline.events.map(event=>{
   const info=`<span class="community-chronicle__number">${event.complete?'✓':event.index+1}</span><span class="community-chronicle__details"><strong>${esc(event.title)}</strong><small>${esc(event.complete?event.change:`Откроется на ${money(event.threshold)} очков`)}</small></span><span class="community-chronicle__state">${event.complete?'Смотреть':'Ожидается'}</span>`;
   return event.complete?`<button type="button" class="community-chronicle__item is-done" data-community-event="${event.id}" aria-label="Посмотреть событие: ${esc(event.title)}">${info}</button>`:`<div class="community-chronicle__item is-upcoming" aria-label="Ожидается: ${esc(event.title)}">${info}</div>`;
  }).join('');
  return `<section class="community-chronicle" aria-label="Хроника ${esc(timeline.title)}"><div class="community-chronicle__heading"><span>Хроника строительства</span><b>${progress}</b></div><p class="community-chronicle__subtitle">${upcoming?`Следующее событие через ${money(Math.max(0,upcoming.threshold-timeline.total))} очков`:'Все события пройдены! Можно пересмотреть любое.'}</p><div class="community-chronicle__list">${rows}</div></section>`;
 }
 function sharedPanel(kind){
  const selection=kind==='festival-project'?'festival':kind==='project'?'garden':null;
  const notice=sharedError?`<div class="demo-box">${esc(sharedError)}<br/>Настоящие вклады недоступны до успешной синхронизации.</div>`:'';
  if(!sharedSnapshot)return `<span class="eyebrow">СТРОИМ ВМЕСТЕ</span><h2 id="panelTitle">Городские стройки</h2>${notice||'<div class="demo-box">Загружаем общий прогресс с сервера…</div>'}<button class="secondary" data-action="fund-refresh">Обновить фонд</button>`;
  if(kind==='community-event'){
   const event=communityEvent(sharedSnapshot,selectedCommunityEvent);
   if(!event)return '<h2 id="panelTitle">Событие ещё не открылось</h2><button class="secondary" data-action="buildings">К стройкам</button>';
   const timeline=communityChronicle(sharedSnapshot,event.projectId);
   return `<span class="eyebrow">ХРОНИКА ОБЩЕГО ГОРОДА · ${event.percent}%</span><h2 id="panelTitle">${esc(event.title)}</h2><div class="community-event-hero" aria-hidden="true"><div class="community-event-hero__scene">${event.projectId==='garden'?'✿':'✦'}</div><span>${esc(timeline?.title||'Общий проект')}</span></div><p class="community-event-story">${esc(event.description)}</p><div class="community-event-change"><b>Что изменилось</b><span>${esc(event.change)}</span></div><p class="panel-footnote">Событие открыто по подтверждённому прогрессу общего фонда. Награды за просмотр не выдаются.</p><button class="primary" data-action="community-event-view" ${event.projectId==='festival'&&state.chapter<1?'disabled title="Район фестивалей пока закрыт по сюжету"':''}>${icon('target')}Посмотреть событие на карте</button><button class="secondary" data-action="community-event-back">Вернуться к проекту</button>`;
  }
  const row=(id)=>{
   const p=sharedSnapshot.projects[id],percent=Math.round(p.total/p.goal*100);
   const stage=id==='festival'?`Этап ${p.stage+1} из 4`:p.finished?'Готов':'Сбор очков';
   return `<button type="button" class="buildings-row" data-action="${id==='festival'?'festival-project':'project'}"><img src="${artUrl(id==='festival'?STORY_FESTIVAL_KINDS[festivalStage(worldState())]:'garden')}" alt=""/><span class="buildings-details"><strong>${esc(p.title)}</strong><small>${stage} · ${money(p.total)} / ${money(p.goal)} очков</small><span class="mini-track"><span style="width:${percent}%"></span></span></span><span class="buildings-percent">${percent}% ›</span></button>`;
  };
  if(kind==='buildings')return `<span class="eyebrow">СТРОИМ ВМЕСТЕ</span><h2 id="panelTitle">Городские стройки</h2><p>Участники видят общий прогресс. Очки списываются только после подтверждения.</p>${row('garden')}${row('festival')}${chronicleMarkup('garden')}${chronicleMarkup('festival')}${notice}<button class="secondary" data-action="fund-refresh">Обновить прогресс</button>`;
  if(kind==='fund-confirm'){
   const p=pendingDonation,project=p&&sharedSnapshot.projects[p.projectId];
   if(!p||!project)return `<h2 id="panelTitle">Вклад не выбран</h2><button data-action="buildings">К стройкам</button>`;
   return `<span class="eyebrow">ПОДТВЕРЖДЕНИЕ ВКЛАДА</span><h2 id="panelTitle">Подтвердите реальный вклад</h2><div class="demo-box"><strong>${esc(project.title)}</strong><br/>Будет списано <strong>${money(p.expectedDebitPoints)} настоящих очков</strong> с вашего игрового кошелька. Действие не возвращает очки автоматически.</div><div class="project-stats"><div class="stat-box"><small>Запрошено</small><strong>${money(p.amountPoints)}</strong></div><div class="stat-box"><small>Списание до порога</small><strong>${money(p.expectedDebitPoints)}</strong></div></div>${fundBusy?'<p>Сервер проверяет вклад…</p>':''}<button class="primary" data-action="fund-pay" ${fundBusy?'disabled':''}>${fundBusy?'Подождите…':'Подтвердить списание'}</button><button class="secondary" data-action="fund-cancel" ${fundBusy?'disabled':''}>Отмена</button>`;
  }
  if(!selection)return '';
  const p=sharedSnapshot.projects[selection],percent=Math.round(p.total/p.goal*100),own=sharedSnapshot.contributedPoints[selection],amount=selection==='garden'?selectedLiveGardenAmount:selectedLiveFestivalAmount;
  const quote=sharedFundQuote(p,amount),choices=selection==='garden'?[1_000,5_000,10_000,25_000,50_000,100_000]:[5_000,25_000,50_000,100_000,500_000,2_000_000];
  let html=`<span class="eyebrow">ГОРОДСКОЙ ПРОЕКТ</span><h2 id="panelTitle">${esc(p.title)}</h2>${cardArt(placeById(selection==='garden'?'community-garden':'festival'))}<p>Вклады игроков суммируются на сервере. Стадия здания одинакова на всех устройствах.</p>`+
    `<div class="panel-progress"><div><span>${money(p.total)} / ${money(p.goal)} очков</span><strong>${percent}%</strong></div><span class="mini-track"><span style="width:${percent}%"></span></span></div>`+
    `<div class="project-stats"><div class="stat-box"><small>Ваш вклад</small><strong>${money(own)} очков</strong></div><div class="stat-box"><small>Ваш баланс</small><strong>${money(sharedSnapshot.walletPoints)} очков</strong></div></div>`;
  if(selection==='festival')html+=`<div class="festival-stages">${['Разметка площадки','Фундамент','Стены и купол','Дом фестивалей открыт'].map((title,n)=>`<div class="festival-stage${n===p.stage?' current':''}${n<p.stage?' done':''}"><b>${n+1}</b><span>${title}<small>${n===0?'Старт':money(p.milestones[n-1])+' очков'}</small></span></div>`).join('')}</div>`;
  if(p.finished)html+='<div class="celebration">✦</div><p><strong>Совместное строительство завершено!</strong> Здание теперь видно у всех игроков в готовом состоянии.</p>';
  else{
   html+=`<p class="panel-footnote">До следующей строительной стадии: <strong>${money(p.next-p.total)} очков</strong>. Вклад ограничивается ближайшим порогом.</p>`;
   html+=`<div class="amounts" aria-label="Выберите количество очков">${choices.map(n=>`<button data-live-amount="${n}" aria-pressed="${n===amount}">${money(n)}</button>`).join('')}</div>`;
   if(!sharedSnapshot.writesEnabled)html+='<div class="demo-box">Просмотр общего прогресса включён. Реальные пожертвования пока закрыты сервером.</div>';
   else html+=`<button class="primary" data-action="fund-confirm" ${(fundBusy||!!sharedError||!quote||sharedSnapshot.walletPoints<quote.expectedDebitPoints)?'disabled':''}>${icon('heart')}Перейти к подтверждению вклада ${money(quote?.expectedDebitPoints||0)} очков</button>`;
  }
  html+=chronicleMarkup(selection);
  html+=notice+`<div class="demo-box">Вклады списываются из игрового баланса только после подтверждения.</div><button class="secondary" data-action="fund-refresh">Обновить прогресс</button><button class="secondary" data-go="${selection==='garden'?'community-garden':'festival'}">${icon('target')}Показать на карте</button>`;
  return html;
 }
 function beginDonation(){
  if(!liveMode||!sharedSnapshot||sharedError||fundBusy||!sharedSnapshot.writesEnabled)return toast('Настоящие вклады сейчас недоступны.');
  if(pendingDonation){openPanel('fund-confirm');return;}
  const id=selectedPanel==='project'?'garden':'festival',p=sharedSnapshot.projects[id];
  const amount=id==='garden'?selectedLiveGardenAmount:selectedLiveFestivalAmount,quote=sharedFundQuote(p,amount);
  if(!quote||sharedSnapshot.walletPoints<quote.expectedDebitPoints)return toast('Не хватает очков или стройка уже завершена.');
  // WebCrypto getRandomValues also works in older Telegram/iOS WebViews.
  // Never use Math.random for financial idempotency keys.
  if(typeof crypto==='undefined'||typeof crypto.getRandomValues!=='function')return toast('Безопасный идентификатор взноса недоступен.');
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const requestId=`zeffi-fund-${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`;
  pendingDonation={...quote,requestId};openPanel('fund-confirm');
 }
 async function payDonation(){
  if(!pendingDonation||fundBusy)return;
  fundBusy=true;renderPanel();
  try{
   const result=await sharedClient.contribute(pendingDonation);
   const events=acceptSharedSnapshot(result);
   const amount=result.receipt?.debitedPoints??pendingDonation.expectedDebitPoints;
   pendingDonation=null;haptic();
   toast(events.length&&!result.repeated?`Общий город отмечает событие: ${events.at(-1).title}!`:(result.repeated?`Вклад ${money(amount)} очков уже учтён. Повторного списания не было.`:`Общий фонд получил ${money(amount)} очков.`));
   rebuild();void syncStoryProgress({quiet:true});openPanel(result.receipt?.projectId==='garden'?'project':'festival-project');
  }catch(error){
   const code=error?.code||'';
   if(code==='COMMUNITY_REVISION_CONFLICT'||code==='COMMUNITY_QUOTE_CHANGED'||code==='COMMUNITY_CONFLICT'||code==='COMMUNITY_INSUFFICIENT_POINTS'||code==='COMMUNITY_PROJECT_COMPLETE'||code==='COMMUNITY_REQUEST_REUSED'){
    pendingDonation=null;await syncSharedFund({quiet:true});
    toast('Фонд или баланс изменился. Проверьте новую сумму перед повтором.');openPanel('buildings');
   }else{
    // Network timeout is ambiguous: keep requestId and expected debit for safe retry.
    toast('Не удалось подтвердить ответ. Нажмите ещё раз: повтор использует тот же ID и не спишет очки дважды.');
   }
  }finally{fundBusy=false;if(selectedPanel==='fund-confirm')renderPanel();}
 }
 function fundAction(action){
  if(action==='fund-confirm')beginDonation();
  else if(action==='fund-pay')void payDonation();
  else if(action==='fund-refresh')void syncSharedFund();
  else if(action==='fund-cancel'){if(!fundBusy){pendingDonation=null;openPanel('buildings');}}
  else if(action==='buildings')openPanel('buildings');
  else if(action==='community-event-back'){const event=communityEvent(sharedSnapshot,selectedCommunityEvent);openPanel(event?.projectId==='festival'&&state.chapter>=1?'festival-project':event?.projectId==='garden'?'project':'buildings');}
  else if(action==='community-event-view'){const event=communityEvent(sharedSnapshot,selectedCommunityEvent);if(!event)return;if(event.projectId==='festival'&&state.chapter<1)return toast('Район фестивалей откроется по сюжету. Событие сохранено в хронике.');closePanel();communityCelebration={projectId:event.projectId,until:Date.now()+4500};focusPlace(event.projectId==='garden'?'community-garden':'festival');}
 }
 function renderPanel(){
  const focused=document.activeElement?.getAttribute?.('data-action');let html='';
  if(liveMode&&['buildings','project','festival-project','fund-confirm','community-event'].includes(selectedPanel)){
   $('panelContent').innerHTML=sharedPanel(selectedPanel);return;
  }
  if(selectedPanel==='history'||selectedPanel==='districts'){
   html=`<span class="eyebrow">ИСТОРИЯ ГОРОДА</span><h2 id="panelTitle">История Мира Зеффи</h2>`;
   if(liveMode&&storySnapshot){
    const story=storySnapshot,chapter=story.currentChapter;
    html+=`<div class="story-chapter-card"><span class="eyebrow">${story.completed?'ИСТОРИЯ ПРОЙДЕНА':`ГЛАВА ${story.chapter+1} ИЗ 3`}</span><h3>${esc(chapter?.title||'До новых встреч!')}</h3><p>${esc(chapter?.description||'Спасибо, что помогал общему городу. Следующие приключения появятся позже.')}</p>`;
    if(chapter)html+=`<div class="story-goals">${chapter.goals.map(goal=>`<div class="story-goal${goal.done?' done':''}"><span>${goal.done?'✓':'○'}</span><span>${esc(goal.title)}</span></div>`).join('')}</div>`;
    if(chapter?.eventId){const ev=story.events[chapter.eventId];html+=`<p class="story-event-condition">${ev?.finished?'✓':'◌'} ${esc(ev?.title||'Общий проект')}: ${ev?.status==='paused'?'событие приостановлено':ev?.finished?'общая стройка завершена':`${money(ev?.total||0)} / ${money(ev?.goal||0)} очков`}</p>`;}
    if(chapter)html+=`<button class="primary story-advance" data-action="story-advance" ${(!story.canAdvance||storyBusy)?'disabled':''}>${story.canAdvance?'Завершить главу и открыть район':'Заверши цели главы'}</button>`;
    html+='</div><h3 class="story-section-title">Главы</h3>';
    html+=`<div class="story-chapter-list">${story.chapters.map((c,i)=>`<div class="story-chapter-row"><span>${c.done?'✓':c.active?'✦':'🔒'}</span><span>${i+1}. ${esc(c.title)}</span></div>`).join('')}</div><h3 class="story-section-title">События города</h3>`;
    html+=Object.values(story.events).map(e=>`<div class="story-event-row"><strong>${esc(e.title)}</strong><span>${e.status==='paused'?'Приостановлено':e.finished?'Завершено':'Собираем вместе'}</span><div class="mini-track"><span style="width:${Math.min(100,Math.round(100*e.total/e.goal))}%"></span></div><small>${money(e.total)} / ${money(e.goal)} очков · общий сервер</small></div>`).join('');
    if(sharedSnapshot){html+=chronicleMarkup('garden')+chronicleMarkup('festival');}
    html+='<button class="secondary" data-action="story-refresh">Обновить историю и события</button>';
   }else if(liveMode){html+='<div class="demo-box">Сюжет временно недоступен. Новые районы останутся закрыты до ответа сервера.</div>';}
   else html+='<p>Автономный предпросмотр: открытие районов управляется локальными сценариями.</p>';
   html+='<h3 class="story-section-title">Районы города</h3>';
   html+=DISTRICTS.map(d=>`<button class="district-row" data-go="${d.id}"><span class="row-icon">${icon(isPlaceOpen(d,worldState())?d.icon:'lock')}</span><span class="row-copy"><strong>${esc(d.title)}</strong><small>${statusLabel(d)}</small></span><span class="row-arrow">›</span></button>`).join('');
  }else if(selectedPanel==='buildings'){
   const gardenTotal=projectTotal(state),gardenPercent=Math.round(100*gardenTotal/PROJECT_GOAL);
   html=`<span class="eyebrow">СТРОИМ ВМЕСТЕ · ДЕМО</span><h2 id="panelTitle">Городские стройки</h2><p>Помогайте городу расти. Постройки постепенно меняются прямо на карте.</p>`;
   html+=`<button type="button" class="buildings-row" data-action="project"><img src="${artUrl('garden')}" alt="" /><span class="buildings-details"><strong>Сад встреч</strong><small>${STATUS[projectStatus(state)]} · ${money(gardenTotal)} / ${money(PROJECT_GOAL)} материалов</small><span class="mini-track"><span style="width:${gardenPercent}%"></span></span></span><span class="buildings-percent">${gardenPercent}% ›</span></button>`;
   const fStage=festivalStage(state),fTotal=festivalTotal(state),fPct=Math.round(fTotal/FESTIVAL_GOAL*100);
   html+=`<button type="button" class="buildings-row" data-action="festival-project"><img src="${artUrl(festivalKind())}" alt="" /><span class="buildings-details"><strong>Дом фестивалей Зеффи</strong><small>${state.chapter<1?'Откройте район событий в тестере':fStage==='complete'?'Здание открыто':`Этап ${['stage_a','stage_b','stage_c'].indexOf(fStage)+1} из 4`} · ${money(fTotal)} / ${money(FESTIVAL_GOAL)} тестовых очков</small><span class="mini-track"><span style="width:${fPct}%"></span></span></span><span class="buildings-percent">${fPct}% ›</span></button>`;
   html+='<div class="demo-box">Сбор тестовый и сохраняется только на этом устройстве. Реальные валюты не списываются.</div>';
  }else if(selectedPanel==='project'){
   const s=projectStatus(state),total=projectTotal(state),percent=Math.round(total/PROJECT_GOAL*100),place=placeById('community-garden');
   html=`<span class="eyebrow">ГОРОДСКОЙ ПРОЕКТ · ДЕМО</span><h2 id="panelTitle">Сад встреч</h2><span class="status-pill">${icon(s==='active'?'check':'heart')}${STATUS[s]}</span>${cardArt(place)}<p>Новый сад рядом с парком Белкино. Пройдите пробный цикл: сбор материалов, стройка и открытие.</p><div class="panel-progress"><div><span>${money(total)} / ${money(PROJECT_GOAL)} материалов</span><strong>${percent}%</strong></div><span class="mini-track"><span style="width:${percent}%"></span></span></div><div class="project-stats"><div class="stat-box"><small>Ваш тестовый вклад</small><strong>${money(state.project.personal)}</strong></div><div class="stat-box"><small>Тестовые материалы</small><strong>${money(state.materials)}</strong></div></div>`;
   if(s==='funding')html+=`<div class="amounts" aria-label="Размер тестового вклада">${[25,50,100].map(n=>`<button data-amount="${n}" aria-pressed="${selectedAmount===n}">${n}</button>`).join('')}</div><button class="primary" data-action="contribute" ${state.materials<Math.min(selectedAmount,PROJECT_GOAL-total)?'disabled':''}>${icon('heart')}Внести ${Math.min(selectedAmount,PROJECT_GOAL-total)} материалов</button>`;
   if(s==='building')html+=`<div id="buildClock" class="clock" role="timer" aria-label="До завершения стройки">${clock(state.project.readyAt-Date.now())}</div><p style="text-align:center">В тесте стройка длится 45 секунд. Таймер продолжится после закрытия карточки.</p>`;
   if(s==='opening')html+=`<button class="primary" data-action="open-project">${icon('spark')}Открыть сад</button>`;
   if(s==='active')html+=`<div class="celebration">${icon('heart')}</div><p><strong>Сад открыт в вашем тестовом городе.</strong> Теперь это готовая постройка на карте. Реальных наград эта версия не выдаёт.</p>`;
   html+=`<div class="demo-box"><strong>Это не настоящий общий сбор.</strong> Вклад, ${money(state.project.community)} материалов тестового сообщества и стройка сохраняются только на этом устройстве. Кофе, зефир и очки не используются.</div><button class="secondary" data-go="community-garden">${icon('target')}Показать на карте</button><button class="secondary" data-action="test">Управление тестом</button>`;
  }else if(selectedPanel==='festival-project'){
   const fStage=festivalStage(state),total=festivalTotal(state),percent=Math.round(total/FESTIVAL_GOAL*100);
   const nextGoal=festivalNextGoal(state),enabled=state.chapter>=1;
   const place=placeById('festival');
   const labels=['Разметка площадки','Залит фундамент','Возведены стены и купол','Дом фестивалей открыт'];
   const index=['stage_a','stage_b','stage_c','complete'].indexOf(fStage);
   html=`<span class="eyebrow">ОБЩАЯ СТРОЙКА · ЛОКАЛЬНЫЙ ТЕСТ</span><h2 id="panelTitle">Дом фестивалей Зеффи</h2>`+cardArt(place,!enabled)+
     `<p>Здание 6×6 клеток. Собирайте тестовые очки по этапам: после достижения цели открывается следующая стадия стройки.</p>`+
     `<div class="panel-progress"><div><span>${money(total)} / ${money(FESTIVAL_GOAL)} тестовых очков</span><strong>${percent}%</strong></div><span class="mini-track"><span style="width:${percent}%"></span></span></div>`+
     `<div class="festival-stages">${[0,1,2,3].map((n)=>`<div class="festival-stage${n===index?' current':''}${n<index?' done':''}"><b>${n+1}</b><span>${labels[n]}<small>${n===0?'Старт':money(FESTIVAL_MILESTONES[n-1])+' очков'}</small></span></div>`).join('')}</div>`+
     `<div class="project-stats"><div class="stat-box"><small>Ваш тестовый вклад</small><strong>${money(state.festival.personal)}</strong></div><div class="stat-box"><small>Доступно тестовых очков</small><strong>${money(state.festival.credits)}</strong></div></div>`;
   if(!enabled)html+='<div class="demo-box">Проект становится доступен после открытия района событий. Выберите 2-й тестовый сценарий карты.</div><button class="secondary" data-action="test">Открыть тестовые сценарии</button>';
   else if(fStage!=='complete'){
    const accepted=Math.min(selectedFestivalAmount,nextGoal-total);
    html+=`<p class="panel-footnote">До следующего улучшения: <strong>${money(nextGoal-total)}</strong> тестовых очков. Один вклад не перескакивает через две стадии.</p>`+
       `<div class="amounts" aria-label="Размер тестового пожертвования">${FESTIVAL_AMOUNTS.map(n=>`<button data-festival-amount="${n}" aria-pressed="${selectedFestivalAmount===n}">${money(n)}</button>`).join('')}</div>`+
       `<button class="primary" data-action="festival-contribute" ${state.festival.credits<accepted?'disabled':''}>${icon('heart')}Внести ${money(accepted)} тестовых очков</button>`;
   }else html+='<div class="celebration">✦</div><p><strong>Дом фестивалей достроен!</strong> На карте теперь отображается полностью готовое здание.</p>';
   html+='<div class="demo-box"><strong>Проверка интерфейса, не общий серверный фонд.</strong> Здесь используются исключительно локальные тестовые очки и имитация пожертвований. Реальные счета игроков и D1 не затрагиваются.</div><button class="secondary" data-go="festival">'+icon('target')+'Показать дом на карте</button><button class="secondary" data-action="test">Настройки теста</button>';
  }else if(selectedPanel==='test'&&liveMode){
   html=`<span class="eyebrow">МЕНЮ ТЕСТЕРА · ПРОДАКШЕН</span><h2 id="panelTitle">Проверка карты</h2><div class="demo-box">Настоящие пожертвования хранятся в D1 и не сбрасываются локальными тестами. ${sharedSnapshot?'Общий фонд подключён.':'Общий фонд не загружен.'}</div><button class="secondary" data-action="fund-refresh">Обновить общий фонд</button><button class="secondary" data-action="buildings">Городские стройки</button><h3>Тест сюжетных сцен</h3><div class="chapter-buttons">${['1 · Старт','2 · События','3 · Белый Кролик'].map((label,n)=>`<button data-chapter="${n}" aria-pressed="${state.chapter===n}">${label}</button>`).join('')}</div><h3>Просмотр стадий White Rabbit</h3><div class="chapter-buttons">${[0,1,2,3,4,5,6].map(n=>`<button data-wr-stage="${n}" aria-pressed="${state.whiteRabbitPreview===n}">${n===0?'Готовое':`Этап ${n}`}</button>`).join('')}</div><button class="secondary" data-action="pause">${paused?'Продолжить':'Приостановить'} анимацию</button><button class="danger" data-action="reset-confirm">Сбросить локальные настройки тестера</button>`;
  }else if(selectedPanel==='test'){
   html=`<span class="eyebrow">АВТОНОМНЫЙ ЭТАП V1</span><h2 id="panelTitle">Проверяем город</h2><div class="demo-box">${mode==='standalone'?'Полностью автономная сборка.':'Сервер проверил доступ тестера, но сама симуляция локальная.'} Общего прогресса игроков, реальных вкладов и наград в v1 ещё нет.</div><h3>Открытие зон по сюжету</h3><div class="chapter-buttons">${['1 · Стартовая карта','2 · Открыта площадка событий','3 · Появился «Белый Кролик»'].map((s,i)=>`<button data-chapter="${i}" aria-pressed="${state.chapter===i}">${esc(s)}</button>`).join('')}</div><p class="panel-footnote">Это переключатель сценариев для тестирования карты, а не изменение сезона или сюжетного прогресса игрока.</p><h3>Пробное коллективное строительство</h3><div class="test-actions"><button class="secondary" data-action="materials">+200 тестовых материалов себе</button><button class="secondary" data-action="community" ${projectStatus(state)!=='funding'?'disabled':''}>Сымитировать помощь сообщества +200</button><button class="secondary" data-action="project">Перейти к стройпроекту</button><button class="secondary" data-action="festival-project">Дом фестивалей · 50 млн</button><button class="secondary" data-action="festival-topup">+5 млн тестовых очков на фестиваль</button><button class="secondary" data-action="festival-help" ${state.chapter<1||festivalStage(state)==='complete'?'disabled':''}>Имитировать вклад жителей +2,5 млн</button><button class="secondary" data-action="pause">${paused?'Продолжить':'Приостановить'} анимацию города</button></div><h3>Этапы White Rabbit / Зефирок</h3><p class="panel-footnote">Шесть отдельных кадров стройки. Личный город автоматически меняет их по таймеру, существующие купленные здания не затрагиваются.</p><div class="chapter-buttons">${[0,1,2,3,4,5,6].map(n=>`<button data-wr-stage="${n}" aria-pressed="${state.whiteRabbitPreview===n}">${n===0?'Готовое':`Этап ${n}`}</button>`).join('')}</div><p class="panel-footnote">${persistent?'Тест сохраняется только в этом браузере.':'Сохранение недоступно: изменения временные.'} Личный город не читается и не меняется.</p><button class="danger" data-action="reset-confirm">Сбросить только этот тест</button>`;
  }else if(selectedPanel==='reset-confirm'){
   html=`<span class="eyebrow">ЛОКАЛЬНЫЙ ТЕСТ</span><h2 id="panelTitle">Начать сначала?</h2><p>Сбросятся тестовый вклад, открытые зоны и материалы общего мира на этом устройстве. Личный город, баланс и прогресс игры останутся без изменений.</p><button class="primary" data-action="reset">Да, сбросить тест</button><button class="secondary" data-action="test">Отмена</button>`;
  }else if(selectedPanel.startsWith('place:')){
   const place=placeById(selectedPanel.slice(6));if(!place)return;
   const locked=!isPlaceOpen(place,worldState());
   html=`<span class="eyebrow">${locked?'БУДУЩЕЕ ГОРОДА':'МЕСТО НА КАРТЕ'}</span><h2 id="panelTitle">${esc(place.title)}</h2><span class="status-pill">${icon(locked?'lock':'check')}${statusLabel(place)}</span>${cardArt(place,locked)}<p>${esc(place.description)}</p>`;
   if(place.id==='cafe')html+='<button class="secondary" data-action="open-rabbit">Белый Кролик · это же здание →</button>';
   if(place.id==='rabbit'&&liveMode)html+='<div class="demo-box">«Белый Кролик» и кафе «Зефирок» находятся в одном здании. Новые события появятся позднее.</div>';
   else if(place.id==='rabbit')html+='<div class="demo-box">«Белый Кролик» и кафе «Зефирок» — одно здание. Шесть кадров строительства доступны в меню тестера. Сюжетные сцены подключим отдельно.</div>';
   if(place.id==='friends'&&!liveMode)html+='<p class="panel-footnote">Название квартала — рабочее название прототипа. Новые биографии или дома персонажей здесь не назначаются.</p>';
   if(locked&&place.chapter<99&&!liveMode)html+='<p class="panel-footnote">Для проверки открытия района используйте меню тестера в верхнем углу.</p>';
   html+=`<button class="primary" data-go="${place.id}">${icon('target')}Показать на карте</button>`;
   if(locked&&place.chapter<99&&!liveMode)html+='<button class="secondary" data-action="test">Перейти к тестовым сценариям</button>';
   if(place.id==='belkino')html+='<button class="secondary" data-action="project">Помочь построить Сад встреч</button>';
   if(place.id==='festival')html+='<button class="secondary" data-action="festival-project">Строительство Дома фестивалей</button>';
   html+='<p class="panel-footnote">В городе появляются новые места и события. Заглядывайте позже за продолжением истории.</p>';
  }
  $('panelContent').innerHTML=html;
  if(focused)$('panelContent').querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
 }
 function execute(action){
  if(action==='story-advance')return void completeStoryChapter();
  if(action==='story-refresh')return void syncStoryProgress();
  if(['fund-confirm','fund-pay','fund-refresh','fund-cancel','buildings'].includes(action))return fundAction(action);
  if(liveMode&&['contribute','festival-contribute','materials','community','festival-topup','festival-help','open-project','reset','reset-confirm','test'].includes(action))return;
  try{
   if(action==='contribute'){
    const result=contribute(state,selectedAmount);store(result.state);haptic();toast(`Внесено ${result.accepted} тестовых материалов. Реальный баланс не изменён.`);rebuild();renderPanel();
   }else if(action==='festival-contribute'){
    const result=contributeFestival(state,selectedFestivalAmount);store(result.state);rebuild();renderPanel();haptic();toast(result.advanced?'Порог достигнут! Дом фестивалей улучшился.':`Внесено ${money(result.accepted)} тестовых очков. Реальный баланс не изменён.`);
   }else if(action==='festival-topup'){store(addFestivalDemoPoints(state));renderPanel();toast('Добавлено 5 млн локальных тестовых очков.');
   }else if(action==='festival-help'){
    const result=simulateFestivalHelp(state);store(result.state);rebuild();renderPanel();toast(result.advanced?'Тестовое сообщество завершило этап стройки.':'Сымитирован вклад жителей. Общего фонда в D1 нет.');
   }else if(action==='materials'){store(addDemoMaterials(state));renderPanel();toast('Добавлено 200 тестовых материалов.');
   }else if(action==='community'){store(simulateCommunityHelp(state));rebuild();renderPanel();toast('Сымитирована помощь сообщества. Это локальный тест.');
   }else if(action==='open-project'){store(openProject(state));rebuild();renderPanel();toast('Сад встреч открыт! Найдите его рядом с парком.');haptic();
   }else if(action==='reset'){state=resetDemo(storage);store(state);rebuild();openPanel('test');focusPlace('square');toast('Тест общего города сброшен. Личный город не затронут.');
   }else if(action==='reset-confirm')openPanel('reset-confirm');
   else if(action==='project')openPanel('project');
   else if(action==='festival-project')openPanel('festival-project');
   else if(action==='open-rabbit')openPlace('rabbit');
   else if(action==='test')openPanel('test');
   else if(action==='pause'){pause();if(selectedPanel)renderPanel();}
  }catch(error){
   const messages={INSUFFICIENT_DEMO_MATERIALS:'Недостаточно тестовых материалов. Добавьте их в меню тестера.',PROJECT_NOT_FUNDING:'Сбор уже завершён.',PROJECT_NOT_READY:'Сад ещё не готов к открытию.',FESTIVAL_CHAPTER_LOCKED:'Сначала откройте район событий через меню тестера.',FESTIVAL_INVALID_AMOUNT:'Недопустимая сумма тестового вклада.',FESTIVAL_COMPLETE:'Дом фестивалей уже построен.',INSUFFICIENT_FESTIVAL_DEMO_POINTS:'Не хватает тестовых очков. Добавьте их в меню тестера.'};
   toast(messages[error.message]||'Не удалось выполнить тестовое действие.');
  }
 }
 // Only the existing shared fund API can take real points; the guide just opens its read-only UI.
 async function tutorialRequest(op,modeName='story',step=0){
  const response=await fetch('/api/world/tutorial',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({initData,op,mode:modeName,step})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw new Error(data?.error||'Прогресс обучения недоступен.');
  return data.tutorial;
 }
 function configureStoryTutorial(initial){
  worldTutorial=createWorldTutorial({mode:'story',save:(_,step)=>tutorialRequest('progress','story',step),onFinish:()=>toast('Отлично! Добро пожаловать в общий город Зеффи ✨'),steps:[
   {title:'Добро пожаловать в Общий город!',text:'Здесь мы гуляем по одному городу и вместе помогаем ему расти. Давай покажу самое важное.',actionLabel:'Начать'},
   {title:'Изучи достопримечательность',text:'Нажми на метку Центральной площади, чтобы увидеть карточку места.',target:'[data-place="square"]',trigger:'click',enter:()=>{if(panel.open)closePanel();focusPlace('square');}},
   {title:'Вернись к карте',text:'Закрой карточку места: здесь можно свободно гулять и выбирать районы.',target:'#closePanel',trigger:'click',enter:()=>{if(!panel.open)openPanel('place:square');}},
   {title:'Открой общие стройки',text:'Нажми на «Стройки» внизу — здесь показывается общий прогресс игроков.',target:'[data-nav="buildings"]',trigger:'click',enter:()=>{if(panel.open)closePanel();}},
   {title:'Посмотри на Сад встреч',text:'Нажми на проект, чтобы посмотреть его этапы и сумму, собранную всеми игроками.',target:'[data-action="project"]',trigger:'click',enter:()=>{if(selectedPanel!=='buildings')openPanel('buildings');}},
   {title:'Помогай по желанию',text:'Здесь можно выбрать вклад и увидеть его стоимость. Очки спишутся только если ты отдельно подтвердил платёж. Это необязательно! А после обучения открой вкладку «История»: там ждут главы и новые районы.',actionLabel:'Завершить'}
  ]});
  worldTutorial.start(Number(initial)||0);
 }
 $('returnWorld').innerHTML=icon('back');$('zoomIn').innerHTML=icon('plus');$('zoomOut').innerHTML=icon('minus');$('centerMap').innerHTML=icon('target');$('closePanel').innerHTML=icon('close');
 for(const element of document.querySelectorAll('[data-icon]'))element.innerHTML=icon(element.dataset.icon);
 listen($('mapMarkers'),'click',e=>{const button=e.target.closest('[data-place]');if(button)openPlace(button.dataset.place);});
 listen($('panelContent'),'click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.action)execute(b.dataset.action);
  if(b.dataset.communityEvent&&communityEvent(sharedSnapshot,b.dataset.communityEvent)){selectedCommunityEvent=b.dataset.communityEvent;openPanel('community-event');}
  if(b.dataset.amount){selectedAmount=Number(b.dataset.amount);renderPanel();}
  if(b.dataset.festivalAmount){selectedFestivalAmount=Number(b.dataset.festivalAmount);renderPanel();}
  if(b.dataset.liveAmount){if(selectedPanel==='project')selectedLiveGardenAmount=Number(b.dataset.liveAmount);else selectedLiveFestivalAmount=Number(b.dataset.liveAmount);renderPanel();}
  if(b.dataset.wrStage&&!liveMode){store(setWhiteRabbitPreview(state,Number(b.dataset.wrStage)));rebuild();renderPanel();focusPlace('cafe');toast('Тестовый строительный кадр White Rabbit изменён.');}
  if(b.dataset.chapter&&!liveMode){store(setDemoChapter(state,Number(b.dataset.chapter)));rebuild();renderPanel();toast('Тестовый сценарий карты изменён. Сюжет игрока не затронут.');}
  if(b.dataset.go){closePanel();focusPlace(b.dataset.go);}
 });
 listen($('closePanel'),'click',closePanel);listen(panel,'close',()=>{selectedPanel='';selectTab('map');});
 listen(panel,'click',e=>{if(e.target===panel){const b=panel.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closePanel();}});
 $('modeBadge').hidden=liveMode;listen($('modeBadge'),'click',()=>{if(!liveMode)openPanel('test');});listen($('projectBanner'),'click',()=>openPanel(focusId==='festival'&&state.chapter>=1?'festival-project':'buildings'));
 listen($('returnWorld'),'click',()=>{if(mode==='standalone'){openPanel('test');toast('Это автономная сборка общего мира. Личный город здесь не загружается.');}else if(window.parent!==window)window.parent.postMessage({type:'zefirok-world-close'},location.origin);else location.assign(new URL('../',document.baseURI).href);});
 listen($('storyTutorialHelp'),'click',()=>{if(worldTutorial){if(panel.open)closePanel();worldTutorial.restart();}else toast('Обучение доступно после подключения к серверу.');});
 listen($('openPersonalCity'),'click',()=>{if(mode==='standalone'){openPanel('test');toast('Личный район доступен в Telegram после входа тестером.');return;}if(window.parent!==window)window.parent.postMessage({type:'zefirok-world-switch',view:'personal'},location.origin);else location.assign(new URL('../world.html',document.baseURI).href);});
 listen(document.querySelector('.bottom-nav'),'click',e=>{const b=e.target.closest('[data-nav]');if(!b)return;if(b.dataset.nav==='map'){closePanel();focusPlace('square');}else openPanel(b.dataset.nav==='history'?'history':'buildings');});
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
  if(moved){layoutDirty=true;schedule();}
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
 listen(document,'visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);ticker=0;}else{tick();resize();if(!ticker)ticker=setInterval(tick,1000);if(liveMode){void syncSharedFund({quiet:true});void syncStoryProgress({quiet:true});}}});
 listen(reduce,'change',()=>{if(reduce.matches&&!paused){pauseAt=Date.now();paused=true;}refreshHUD();schedule();});
 const observer=new ResizeObserver(resize);observer.observe(zone);
 onSpriteUpdate(schedule);
 gate.hidden=true;$('storyShell').hidden=false;
 if(liveMode)await syncSharedFund({quiet:true});
 rebuild();resize();ticker=setInterval(tick,1000);
 if(liveMode){
  try{const progress=await tutorialRequest('read');configureStoryTutorial(progress?.story);}
  catch(error){console.warn('Story tutorial unavailable',error?.message||error);}
 }
 if(liveMode)liveTimer=setInterval(()=>{if(!document.hidden&&!fundBusy)void syncSharedFund({quiet:true});},25000);
 if(!persistent&&!liveMode)toast('Локальное сохранение недоступно. Можно тестировать без сохранения.');
 if(!liveMode)window.ZeffiStoryDiagnostics=()=>({version:'1.4.0',storyChapter:storySnapshot?.chapter,transport:busArtStatus(),crosswalks:city.crosswalks.length,mode,mapSize:city.size,objects:city.objects.length,roads:city.roads.length,citizens:citizens.routes.length,buses:buses.routes.length,chapter:state.chapter,project:projectStatus(state),projectTotal:projectTotal(state),personalContribution:state.project.personal,materials:state.materials,festivalStage:festivalStage(state),festivalTotal:festivalTotal(state),whiteRabbitPreview:state.whiteRabbitPreview,paused,hidden:document.hidden,frameScheduled:!!raf,renderSamples:drawTimes.length,averageRenderMs:drawTimes.length?Math.round(drawTimes.reduce((a,b)=>a+b,0)/drawTimes.length*100)/100:0,assets:spriteStatus(),persistent,globalSync:liveMode&&Boolean(sharedSnapshot),walletWrites:liveMode&&Boolean(sharedSnapshot?.writesEnabled)});
 function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);clearInterval(liveTimer);clearTimeout(toastTimer);observer.disconnect();onSpriteUpdate(()=>{});for(const off of disposers)off();}
 // bfcache keeps the document alive; only final navigation tears listeners down.
 listen(window,'pagehide',e=>{if(e.persisted){if(raf)cancelAnimationFrame(raf);raf=0;clearInterval(ticker);ticker=0;}else dispose();});
 listen(window,'pageshow',e=>{if(e.persisted){tick();resize();if(!ticker)ticker=setInterval(tick,1000);}});
 return {dispose};
}
