import { CATALOG, CATALOG_ITEMS, CATEGORIES } from './catalog.js';
import { RU, tr } from './ru.js';
import { ROAD_TILE_PRICE } from './economy.js';
import {
 makeInitialCity, sanitizeCity, cloneCity, addObject, moveObject, storeObject,
 restoreObject, checkPlacement, checkRoadStroke, applyRoadStroke, cityStats,
 findOccupant, nextRotation, orthogonalPath, keyOf, dims, BuildError, inBounds,
 isObjectConnected, connectedRoads, isConstructing, constructionRemaining,
 constructionSkipPrice, skipConstruction, topUpTestWallet, buyParcel,
  expansionCandidates, expansionPrice, PARCEL_SIZE, canAfford, objectPrice, roadStrokePrice
} from './engine.js';
import { drawWorld, drawCatalogThumbnail, screenToTile, isoToScreen, PROJECT_FOCUS } from './renderer.js';
import { onSpriteUpdate, setSpriteMode, spriteStatus, preloadBuildFrames, preloadSpriteSet, spriteManifest, catalogSpriteId, parkConstructionAssetId, buildingAssetId } from './sprite-assets.js';
import { buildCitizenScene, sampleCitizenScene } from './citizens.js';

const STORAGE_KEY = 'zefirok-world-v01-sandbox-local';
const SERVER_MODE = window.ZeffiWorldServerRequired === true;
const WELCOME_KEY = 'zefirok-world-v01-welcome-read';
const $ = id => document.getElementById(id);
const canvas = $('worldCanvas');
const state = {
 city: makeInitialCity(), mode: 'select', category: 'all', warehouse: false,
 selectedUid: null, draft: null, roadDraft: [], roadValid: true, expansionDraft: null, paidSkipUid: null,
 camera: { x: 0, y: 0, zoom: 1 },
 undo: [], redo: [], pointers: new Map(), pointerStart: null,
 gesture: null, toastTimer: null, drawScheduled: false, pointerDrag: false,
 loadingFailed: false, visualsReady: false, preparingPlacementArt: false, citizenScene: null, citizenSnapshot: null, citizenPopulation: -1, serverRevision: null, serverReady: false, serverBusy: false, serverPurchasesEnabled: false, serverInitData: '', skipAnimation: null, skipAnimationTimer: null, skipAnimationRaf: null,
 skipPreparingUid: null, skipToken: 0
};
const iconCodes = { house: 0x1F3E1, coffee: 0x2615, cake: 0x1F370, flower: 0x1F338,
 sun: 0x2600, tree: 0x1F333, lamp: 0x1F4A1, bench: 0x1FA91, fountain: 0x26F2,
 star: 0x2728 };
const icon = kind => String.fromCodePoint(iconCodes[kind] || 0x2726);
const SIZE = () => ({ width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height });
const nameOf = kind => tr(CATALOG[kind]?.titleKey || kind);
function priceLabel(cost){
 const parts=[];
 if(cost.points) parts.push(`${cost.points.toLocaleString('ru-RU')} ★`);
 if(cost.coffee) parts.push(`${cost.coffee.toLocaleString('ru-RU')} ☕`);
 if(cost.treats) parts.push(`${cost.treats.toLocaleString('ru-RU')} ✨`);
 return parts.join(' + ') || tr('free');
}
const errorLabels = {
 OUTSIDE_CITY: 'outside', BUILDING_COLLISION: 'collisionBuilding', ROAD_COLLISION: 'collisionRoad',
 LOCKED_ROAD: 'locked', ROAD_STROKE_LIMIT: 'invalidPlace', ROAD_DISCONNECTED: 'invalidPlace',
 INVALID_PARCEL: 'invalidParcel', INSUFFICIENT_BALANCE: 'notEnoughCurrency', NOT_CONSTRUCTING: 'alreadyBuilt',
 NOT_AVAILABLE: 'retiredPathUnavailable', INVALID_PRICE: 'unknownError'
};
function showToast(message, isError = false) {
 const el = $('toast');
 el.textContent = message || tr('unknownError');
 el.classList.toggle('error', isError);
 el.classList.add('visible');
 clearTimeout(state.toastTimer);
 state.toastTimer = setTimeout(() => el.classList.remove('visible'), 2650);
}
function translateStatic() {
 document.querySelectorAll('[data-t]').forEach(el=>{ el.textContent = tr(el.dataset.t); });
 document.querySelectorAll('[data-title]').forEach(el=>{ el.title=tr(el.dataset.title);el.setAttribute('aria-label',tr(el.dataset.title)); });
 document.title = `${tr('app')} | Sandbox 0.1.13`; 
}
function readSavedCity() {
 if(SERVER_MODE)return;
 try {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) state.city = sanitizeCity(JSON.parse(raw), CATALOG);
 } catch(error) { state.city = makeInitialCity(); state.loadingFailed=(error?.name==='SyntaxError'||error?.name==='BuildError'); }
}
function saveCity() {
 if(SERVER_MODE)return;
 try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state.city)); }
 catch { showToast(tr('storageDisabled'),true); }
}
function applyChange(nextCity) {
 if(SERVER_MODE)throw new Error('Server mode does not accept local state writes.');
 if(state.skipAnimation)clearSkipAnimation();
 if (JSON.stringify(nextCity) === JSON.stringify(state.city)) { showToast(tr('roadNoChanges')); return false; }
 state.undo.push(cloneCity(state.city));
 if(state.undo.length>50)state.undo.shift();
 state.redo = [];
 state.city = nextCity;
 saveCity(); updateUI(); scheduleDraw(); return true;
}
function serverLock(message='Подключаем личный город к серверу…', isError=false){
 let layer=$('worldServerLock');
 if(!layer){
  layer=document.createElement('div');layer.id='worldServerLock';
  layer.style.cssText='position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:22px;background:rgba(255,249,251,.98);font:700 15px system-ui;color:#8d4b64;text-align:center';
  document.body.append(layer);
 }
 const notice=document.createElement('div');notice.style.cssText='max-width:380px;background:#fff;border:1px solid #f1cbdb;border-radius:20px;padding:28px;box-shadow:0 12px 38px #ad75942b';
 const header=document.createElement('strong');header.style.cssText='display:block;font-size:21px;margin-bottom:12px';header.textContent='Мир Зеффи';
 const text=document.createElement('div');text.textContent=message;
 notice.append(header,text);
 if(isError){const btn=document.createElement('button');btn.textContent='Повторить';btn.style.cssText='margin-top:16px;padding:9px 18px;border:0;border-radius:12px;background:#c36b91;color:#fff;font-weight:800';btn.addEventListener('click',()=>SERVER_MODE?void bootWorldServer():void bootLocalArt());notice.append(btn);}
 layer.replaceChildren(notice);
}
function unlockServer(){const el=$('worldServerLock');if(el)el.remove();}
async function acquireTelegramInitData(){
 const direct=String(window.Telegram?.WebApp?.initData||'');
 if(direct)return direct;
 if(window.parent===window)return '';
 return new Promise(resolve=>{
  const requestId=`world-auth-${crypto.randomUUID()}`;
  let finished=false;
  const done=value=>{if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener('message',receive);resolve(value);};
  const receive=event=>{
   if(event.source!==window.parent||event.origin!==location.origin)return;
   if(event.data?.type!=='zeffi-world-init-data'||event.data?.requestId!==requestId)return;
   done(String(event.data.initData||''));
  };
  const timer=setTimeout(()=>done(''),3000);
  window.addEventListener('message',receive);
  window.parent.postMessage({type:'zeffi-world-request-init-data',requestId},location.origin);
 });
}
async function serverRequest(path,payload={}){
 const result=await fetch(`/api/world/${path}`,{
  method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',
  body:JSON.stringify({...payload,initData:state.serverInitData})
 });
 const data=await result.json().catch(()=>null);
 if(!result.ok||!data?.ok){
  const error=new Error(data?.error||`Ошибка сервера ${result.status}`);
  error.code=String(data?.code||'WORLD_API_ERROR');error.status=result.status;
  throw error;
 }
 return data;
}
function acceptServerCity(payload){
 state.city=sanitizeCity(payload.city,CATALOG);
 state.serverRevision=payload.revision;
 state.serverPurchasesEnabled=Boolean(payload.purchasesEnabled);
 state.serverReady=true;
 state.undo=[];state.redo=[];
 updateUI();scheduleDraw();
}
// All 4 angles of every available catalogue object, plus terrain, roads,
// selection art, and stages of any building still under construction. About
// 107 normal images (not all 249 construction frames at once): iOS-friendly.
function initialArtIds(city){
 const ids=new Set();
 for(const meta of spriteManifest.assets){
  if(['ground','roads'].includes(meta.category)||meta.id.includes('overlay_'))ids.add(meta.id);
 }
 for(const item of CATALOG_ITEMS){
  for(let rotation=0;rotation<4;rotation++){
   const id=catalogSpriteId(item.id,rotation);
   if(id)ids.add(id);
  }
 }
 for(const item of city.objects||[]){
  if(item.stored||!isConstructing(item))continue;
  for(const stage of ['build_01','build_02','build_03']){
   const id=parkConstructionAssetId(item.kind,item.rotation,stage)||buildingAssetId(item.kind,item.rotation,stage);
   if(id)ids.add(id);
  }
 }
 return [...ids];
}
async function prepareInitialArt(city){
 let lastTens=-1;
 const art=await preloadSpriteSet(initialArtIds(city),{pin:true,onProgress:(progress)=>{
  const tens=Math.floor(progress.done/10);
  if(tens!==lastTens||progress.done===progress.total){
   lastTens=tens;
   serverLock(`\u041f\u043e\u0434\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0433\u0440\u0430\u0444\u0438\u043a\u0443 \u0433\u043e\u0440\u043e\u0434\u0430: ${progress.done}/${progress.total}`);
  }
 }});
 if(art.failed)throw new Error(`\u041d\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043b\u0438\u0441\u044c ${art.failed} \u0438\u0437 ${art.total} \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0439. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u0441\u0435\u0442\u044c \u0438 \u043d\u0430\u0436\u043c\u0438 \"\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c\".`);
 state.visualsReady=true;
}
async function bootLocalArt(){
 state.visualsReady=false;
 serverLock('\u041f\u043e\u0434\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0433\u0440\u0430\u0444\u0438\u043a\u0443 \u0433\u043e\u0440\u043e\u0434\u0430...');
 try{await prepareInitialArt(state.city);unlockServer();refreshArt();}
 catch(error){serverLock(error.message||'\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0433\u0440\u0430\u0444\u0438\u043a\u0438.',true);}
}
async function bootWorldServer(){
 if(!SERVER_MODE)return;
 serverLock();
 state.serverReady=false;
 try{
  state.serverInitData=await acquireTelegramInitData();
  if(!state.serverInitData)throw new Error('Откройте игру через Telegram. Подтверждённая Telegram-сессия обязательна для серверного города.');
  const result=await serverRequest('state');
  await prepareInitialArt(result.city);
  acceptServerCity(result);unlockServer();refreshArt();
 }catch(error){serverLock(error.message||'Ошибка загрузки города.',true);}
}
function quoteForAction(kind,args){
 // Same pure engine for display only. Worker recomputes and verifies price.
 let next;
 if(kind==='place')next=addObject(state.city,CATALOG,args.objectKind,args.x,args.y,args.rotation);
 else if(kind==='move')next=moveObject(state.city,CATALOG,args.uid,args.x,args.y,args.rotation);
 else if(kind==='store')next=storeObject(state.city,args.uid);
 else if(kind==='restore')next=restoreObject(state.city,CATALOG,args.uid,args.x,args.y,args.rotation);
 else if(kind==='parcel')next=buyParcel(state.city,args.cx,args.cy);
 else if(kind==='road'||kind==='erase-road')next=applyRoadStroke(state.city,CATALOG,args.positions,{erasing:kind==='erase-road'});
 else if(kind==='skip')next=skipConstruction(state.city,args.uid).city;
 else throw new Error('Unsupported world action');
 return {points:state.city.wallet.points-next.wallet.points,treats:state.city.wallet.treats-next.wallet.treats,coffee:state.city.wallet.coffee-next.wallet.coffee};
}
async function performServerAction(kind,args){
 if(!state.serverReady||state.serverBusy)throw new Error('Серверное сохранение пока выполняется.');
 state.serverBusy=true;updateUI();
 try{
  const expectedPrice=quoteForAction(kind,args);
  const result=await serverRequest('mutate',{
   action:{kind,args},expectedRevision:state.serverRevision,expectedPrice,
   requestId:`world-${crypto.randomUUID()}`
  });
  acceptServerCity(result);
  return result;
 }catch(error){
  if(error.status===409){
   try{acceptServerCity(await serverRequest('state'));}catch{}
  }
  throw error;
 }finally{state.serverBusy=false;updateUI();scheduleDraw();}
}
async function confirmServerEdit(){
 if(state.serverBusy)return;
 try{
  if(state.mode==='expand'&&state.expansionDraft){
   const p=state.expansionDraft;
   await performServerAction('parcel',{cx:p.cx,cy:p.cy});
   const options=expansionCandidates(state.city);state.expansionDraft=options[0]||null;
   showToast(tr('landBought'));updateUI();scheduleDraw();return;
  }
  if(state.draft){
   const d=state.draft;
   const kind=d.type==='place'?'place':d.type==='restore'?'restore':'move';
   const args=kind==='place'?{objectKind:d.kind,x:d.x,y:d.y,rotation:d.rotation}:{uid:d.uid,x:d.x,y:d.y,rotation:d.rotation};
   await performServerAction(kind,args);
   stopDraft();state.mode='select';
   if(kind==='place')state.selectedUid=state.city.objects[state.city.objects.length-1]?.uid||null;
   else state.selectedUid=d.uid;
   showToast(kind==='place'?tr('placed'):tr('moved'));updateUI();scheduleDraw();return;
  }
  if(state.roadDraft.length){
   await performServerAction(state.mode==='erase'?'erase-road':'road',{positions:state.roadDraft});
   state.roadDraft=[];state.roadValid=true;showToast(tr('roadsBuilt'));updateUI();scheduleDraw();
  }
 }catch(error){showToast(error.message||tr('unknownError'),true);updateUI();scheduleDraw();}
}
function resetView(){state.camera={x:0,y:0,zoom:Math.min(1.12,Math.max(.73,SIZE().width/740))};scheduleDraw();}
function scheduleDraw(){
 if(state.drawScheduled)return;
 state.drawScheduled=true;
 requestAnimationFrame(()=>{
  state.drawScheduled=false;
  const now=Date.now();
  drawWorld(canvas,state.city,CATALOG,state.camera,{
    selectedUid:state.selectedUid,draft:state.draft,mode:state.mode,
    roadDraft:state.roadDraft,roadValid:state.roadValid, expansionDraft:state.expansionDraft,
    now, citizens:sampleCitizenScene(state.citizenScene,now),
    skipAnimation: state.skipAnimation ? {...state.skipAnimation} : null
  });
 });
}
function refreshArt() {
 scheduleDraw();
 document.querySelectorAll('.catalog-card').forEach(card=>{
  const definition=CATALOG[card.dataset.kind];
  const thumb=card.querySelector('canvas.building-thumbnail');
  if(definition&&thumb)drawCatalogThumbnail(thumb,definition);
 });
}
function formatRemaining(ms) {
 const seconds=Math.max(0,Math.ceil(ms/1000));
 return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function statusError(error) {
 if(error instanceof BuildError) return tr(errorLabels[error.code]||'unknownError');
 return tr('unknownError');
}
function selectedItem(){return state.city.objects.find(x=>x.uid===state.selectedUid && !x.stored)||null;}
function stopDraft(){state.draft=null;state.roadDraft=[];state.roadValid=true;state.expansionDraft=null;}
function switchMode(mode){
 stopDraft();state.mode=mode;state.selectedUid=null;
 if(mode!=='select')state.warehouse=false;
 if(mode==='expand'){
  const candidates=expansionCandidates(state.city);
  state.expansionDraft=candidates.find(p=>p.cx===6&&p.cy===2)||candidates[0]||null;
  if(state.expansionDraft)focusOnTile(state.expansionDraft.cx*PARCEL_SIZE+2,state.expansionDraft.cy*PARCEL_SIZE+2);
 }
 updateUI();scheduleDraw();
}
function focusOnTile(x,y){
 const sz=SIZE(),p=isoToScreen(x,y,sz,{x:0,y:0,zoom:state.camera.zoom});
 state.camera.x=sz.width/2-p.x;
 state.camera.y=sz.height/2-p.y;
 scheduleDraw();
}
function findFreeSpot(kind,rotation=0,excludeUid=''){
 const initialX=12,initialY=14;
 for(let d=0;d<=30;d++)for(let dx=-d;dx<=d;dx++){
  const dy=d-Math.abs(dx);
  for(const sy of dy===0?[0]:[-dy,dy]){
    const x=initialX+dx,y=initialY+sy;
    if(checkPlacement(state.city,CATALOG,kind,x,y,rotation,excludeUid).ok)return {x,y};
  }
 }
 return {x:9,y:15};
}
function startPlacement(kind){
 if(!CATALOG[kind])return;
 state.mode='place';state.selectedUid=null;state.warehouse=false;
 state.roadDraft=[];
 const pos=findFreeSpot(kind);
 state.draft={type:'place',kind,rotation:0,...pos};
 if(Number(CATALOG[kind]?.buildMs)>0)void preloadBuildFrames(kind,0);
 updateUI();scheduleDraw();
}
function startRestore(uid){
 const item=state.city.objects.find(x=>x.uid===uid && x.stored);
 if(!item)return;
 const pos=findFreeSpot(item.kind,item.rotation);
 state.mode='restore';state.selectedUid=null;state.warehouse=false;state.roadDraft=[];
 state.draft={type:'restore',uid,kind:item.kind,rotation:item.rotation,...pos};
 updateUI();scheduleDraw();
}
function startMove(){
 const item=selectedItem();if(!item)return;
 state.draft={type:'move',uid:item.uid,kind:item.kind,rotation:item.rotation,x:item.x,y:item.y};
 state.mode='move';state.selectedUid=null;state.roadDraft=[];state.warehouse=false;
 updateUI();scheduleDraw();
}
function updateRoadValidity(){
 state.roadValid = state.roadDraft.length===0 || checkRoadStroke(state.city,CATALOG,state.roadDraft,{erasing:state.mode==='erase'}).ok;
}
function activeEdit(){return Boolean(state.draft)||state.roadDraft.length>0||Boolean(state.mode==='expand'&&state.expansionDraft);}
function updateActions(){
 const visible=activeEdit(); $('editActions').hidden=!visible;
 if(!visible)return;
 const isRoad=state.mode==='road'||state.mode==='erase';
 const isExpand=state.mode==='expand';
 $('rotateButton').hidden=isRoad||isExpand||Boolean(state.draft && CATALOG[state.draft.kind]?.rotatable===false);
 let canCommit=true;
 let summary='',kind='preview',feedback='';
 if(isExpand){
  const p=state.expansionDraft,price=expansionPrice(state.city);
  summary=`+${PARCEL_SIZE} x ${PARCEL_SIZE} | ${tr('parcelPrice')}: ${price.points.toLocaleString('ru-RU')} ${tr('pointsShort')} + ${price.treats} ${tr('treatsShort')}`;
  const enough=canAfford(state.city.wallet,price);
  canCommit=!price.unavailable&&enough&&Boolean(p)&&expansionCandidates(state.city).some(row=>row.key===p.key);
  if(SERVER_MODE&&!state.serverPurchasesEnabled)canCommit=false;
  feedback=enough?`${tr('parcelCoordinates')} ${p?.cx??'?'}, ${p?.cy??'?'}`:tr('notEnoughCurrency');
  kind='previewExpand';$('confirmEdit').textContent=tr('buyLand');
 }else if(!isRoad&&state.draft){
  const d=state.draft,def=CATALOG[d.kind];
  const check=checkPlacement(state.city,CATALOG,d.kind,d.x,d.y,d.rotation,d.type==='move'?d.uid:'');
  const {w,h}=dims(def,d.rotation);
  const isPurchase=d.type==='place';
  const price=isPurchase?objectPrice(CATALOG,d.kind):null;
  const enough=!isPurchase||canAfford(state.city.wallet,price);
  summary=`${nameOf(d.kind)} ${w}x${h} | ${d.rotation*90}°${isPurchase?' | '+tr('price')+': '+priceLabel(price):''}`;
  feedback=!check.ok?tr(errorLabels[check.code]||'unknownError'):!enough?tr('notEnoughCurrency'):`${d.x+1}:${d.y+1}`;
  kind=d.type==='move'?'previewMove':'preview';
  canCommit=check.ok && enough;
  if(SERVER_MODE&&isPurchase&&!state.serverPurchasesEnabled)canCommit=false;
  $('confirmEdit').textContent=d.type==='move'?tr('moveItem'):d.type==='restore'?tr('placeFromStock'):tr('buyAndBuild');
 } else if(isRoad){
  kind=state.mode==='erase'?'previewErase':'previewRoad';
  const count=state.roadDraft.filter(p=>state.mode==='erase'?state.city.roads.includes(keyOf(p.x,p.y)):!state.city.roads.includes(keyOf(p.x,p.y))).length;
  const cost=roadStrokePrice(state.city,state.roadDraft,{erasing:state.mode==='erase'});
  const enough=canAfford(state.city.wallet,cost);
  summary=`Road: ${count} ${tr('size').toLowerCase()}${state.mode==='road'?' | '+tr('price')+': '+priceLabel(cost):''}`;
  canCommit=state.roadValid && count>0 && enough;
  if(SERVER_MODE&&state.mode==='road'&&!state.serverPurchasesEnabled)canCommit=false;
  feedback=!state.roadValid?tr('invalidPlace'):!enough?tr('notEnoughCurrency'):`${tr('roadSelected')} ${count}`;
  $('confirmEdit').textContent=state.mode==='erase'?tr('eraseRoad'):tr('buyRoad');
 }
 $('previewKind').textContent=tr(kind);
 $('editSummary').textContent=summary;
 $('editFeedback').textContent=feedback;
 $('confirmEdit').disabled=!canCommit||state.preparingPlacementArt||(SERVER_MODE&&(!state.serverReady||state.serverBusy));
 $('editActions').classList.toggle('is-invalid',!canCommit);
}
function updateSelection(){
 const item=selectedItem();$('selectionPanel').hidden=(!item || activeEdit());
 if(!item)return;
 $('selectionName').textContent=nameOf(item.kind);
 $('selectionEmblem').textContent=icon(CATALOG[item.kind]?.icon);
 const connected=isObjectConnected(item,state.city,CATALOG,connectedRoads(state.city));
 const constructing=isConstructing(item);
 const skipInProgress=state.skipAnimation?.uid===item.uid;
 const skipPreparing=state.skipPreparingUid===item.uid;
 $('selectionStatus').textContent=skipInProgress?'✨ Магическое завершение…':skipPreparing?'Подготавливаем анимацию…':constructing?`${tr('buildReadyIn')} ${formatRemaining(constructionRemaining(item))}`:(CATALOG[item.kind].needsRoad?(connected?tr('roadOk'):tr('roadMissing')):`${dims(CATALOG[item.kind],item.rotation).w}x${dims(CATALOG[item.kind],item.rotation).h}`);
 $('finishBuildTest').hidden=!constructing || skipInProgress;
 $('finishBuildTest').disabled=skipInProgress||skipPreparing;
 if(constructing){
   const cost=constructionSkipPrice(item);
   $('finishBuildTest').textContent=skipPreparing?'Подготовка…':`${tr('skipPaid')} ${cost.coffee} ☕`;
 }
}
function syncCitizens(stats){
 // Rebuild routes only after saved city changes or construction finishes.
 if(state.citizenSnapshot===state.city && state.citizenPopulation===stats.population)return;
 state.citizenSnapshot=state.city;
 state.citizenPopulation=stats.population;
 state.citizenScene=buildCitizenScene(state.city,CATALOG,stats.population);
}
function updateUI(){
 const stats=cityStats(state.city,CATALOG);
 syncCitizens(stats);
 $('populationCount').textContent=stats.population.toLocaleString('ru-RU');
 $('comfortCount').textContent=stats.comfort.toLocaleString('ru-RU');
 $('comfortTier').textContent=tr(`comfort_${stats.comfortTier}`);
 $('comfortCard').title=`${tr('comfort')}: ${stats.comfort}. ${tr(`comfort_${stats.comfortTier}`)}`;
 $('buildingsCount').textContent=stats.completedStructures;
 $('constructingCount').textContent=stats.constructing;
 $('warehouseBadge').textContent=stats.stored;
 for(const [currency,id] of [['points','walletPoints'],['coffee','walletCoffee'],['treats','walletTreats']])$(id).textContent=state.city.wallet[currency].toLocaleString('ru-RU');
 $('coordLabel').textContent=state.mode==='expand'?`${tr('landPlots')}: ${36+state.city.parcels.length}`:`${576+state.city.parcels.length*16} ${tr('cellsShort')}`;
 $('undoButton').disabled=SERVER_MODE||state.undo.length===0;
 $('redoButton').disabled=SERVER_MODE||state.redo.length===0;
 document.querySelectorAll('[data-tool]').forEach(button=>{
  const isActive=(state.mode==='place'||state.mode==='move'||state.mode==='restore')?false:button.dataset.tool===state.mode;
  button.classList.toggle('is-active',isActive);
  button.setAttribute('aria-pressed',String(isActive));
 });
 let hint='hintSelect';
 if(state.mode==='road')hint='hintRoad';
 if(state.mode==='erase')hint='hintErase';
 if(state.mode==='place'||state.mode==='restore')hint='hintPlace';
 if(state.mode==='move')hint='hintMove';
 if(state.mode==='expand')hint='hintExpand';
 $('mapHint').textContent=tr(hint);
 $('mapNotice').hidden=activeEdit()||Boolean(selectedItem());
 $('warehouseList').hidden=!state.warehouse;
 $('catalogList').hidden=state.warehouse;
 $('categoryTabs').hidden=state.warehouse;
 $('panelTitle').textContent=state.warehouse?tr('warehouseTitle'):tr('chooseCategory');
 $('warehouseButton').classList.toggle('is-active',state.warehouse);
 updateActions();updateSelection();renderWarehouse();renderCatalogSelection();
}
function renderCategories(){
 const el=$('categoryTabs');el.replaceChildren();
 for(const category of CATEGORIES){
  const button=document.createElement('button');button.type='button';button.textContent=tr(category);button.classList.toggle('is-active',state.category===category);
  button.addEventListener('click',()=>{state.category=category;state.warehouse=false;renderCategories();renderCatalog();updateUI();});
  el.append(button);
 }
}
function renderCatalog(){
 const el=$('catalogList');el.replaceChildren();
 for(const def of CATALOG_ITEMS){
  if(state.category!=='all'&&def.category!==state.category)continue;
  const button=document.createElement('button');button.type='button';button.className='catalog-card';button.dataset.kind=def.id;
  const fig=document.createElement('div');fig.className='catalog-figure';const thumb=document.createElement('canvas');thumb.className='building-thumbnail';thumb.setAttribute('aria-hidden','true');fig.append(thumb);drawCatalogThumbnail(thumb,def);
  const copy=document.createElement('div');copy.className='catalog-copy';const title=document.createElement('strong');title.textContent=nameOf(def.id);
  const size=document.createElement('small');size.textContent=`${def.w} x ${def.h}  |  ${Number(def.buildMs||0)>0?formatRemaining(def.buildMs):tr('instant')}`;
  const cost=document.createElement('em');cost.className='catalog-price';cost.textContent=priceLabel(objectPrice(CATALOG,def.id));
  copy.append(title,size,cost);button.append(fig,copy);
  button.addEventListener('click',()=>startPlacement(def.id));el.append(button);
 }
 renderCatalogSelection();
}
function renderCatalogSelection(){
 const selected=state.draft?.kind;
 $('catalogList').querySelectorAll('.catalog-card').forEach(btn=>{
  btn.classList.toggle('is-active',Boolean(selected)&&selected===btn.dataset.kind);
  btn.classList.toggle('cannot-afford',!canAfford(state.city.wallet,objectPrice(CATALOG,btn.dataset.kind)));
 });
}
function renderWarehouse(){
 const el=$('warehouseList');if(el.hidden)return;
 const stored=state.city.objects.filter(item=>item.stored);
 el.replaceChildren();
 if(!stored.length){const empty=document.createElement('div');empty.className='warehouse-empty';empty.textContent=tr('warehouseEmpty');el.append(empty);return;}
 for(const item of stored){
  const def=CATALOG[item.kind];const button=document.createElement('button');button.className='catalog-card';button.type='button';button.dataset.kind=item.kind;
  const fig=document.createElement('div');fig.className='catalog-figure';const thumb=document.createElement('canvas');thumb.className='building-thumbnail';thumb.setAttribute('aria-hidden','true');fig.append(thumb);drawCatalogThumbnail(thumb,def);
  const copy=document.createElement('div');copy.className='catalog-copy';const title=document.createElement('strong');title.textContent=nameOf(item.kind);const size=document.createElement('small');size.textContent=`${def.w} x ${def.h}`;const badge=document.createElement('em');badge.textContent=tr('placeFromStock');copy.append(title,size,badge);
  button.append(fig,copy);button.addEventListener('click',()=>startRestore(item.uid));el.append(button);
 }
}
function openWarehouse(){
 if(activeEdit())stopDraft();
 state.selectedUid=null;state.mode='select';state.warehouse=!state.warehouse;
 updateUI();scheduleDraw();
}
function confirmLocalEdit(){
 try {
  if(state.mode==='expand'&&state.expansionDraft){
   const p=state.expansionDraft;
   const next=buyParcel(state.city,p.cx,p.cy);
   const changed=applyChange(next);
   if(changed){
    // Keep the expansion tool active and offer the next adjacent plot.
    const available=expansionCandidates(next);
    state.expansionDraft=available.find(row=>row.cx===p.cx+1&&row.cy===p.cy)||available.find(row=>row.cx===p.cx&&row.cy===p.cy+1)||available[0]||null;
    if(state.expansionDraft)focusOnTile(state.expansionDraft.cx*PARCEL_SIZE+2,state.expansionDraft.cy*PARCEL_SIZE+2);
    showToast(tr('landBought'));
   }
   updateUI();scheduleDraw();return;
  }
  if(state.draft){
   const d=state.draft;let next;
   if(d.type==='place')next=addObject(state.city,CATALOG,d.kind,d.x,d.y,d.rotation);
   else if(d.type==='move')next=moveObject(state.city,CATALOG,d.uid,d.x,d.y,d.rotation);
   else if(d.type==='restore')next=restoreObject(state.city,CATALOG,d.uid,d.x,d.y,d.rotation);
   else return;
   const msg=d.type==='place' && Number(CATALOG[d.kind]?.buildMs)>0?'startConstruction':d.type==='place'?'placed':d.type==='move'?'moved':'restored';
   const paid=d.type==='place'?objectPrice(CATALOG,d.kind):null;
   const changed=applyChange(next);stopDraft();state.mode='select';
   state.selectedUid=changed?(d.type==='place'?next.objects[next.objects.length-1]?.uid:d.uid):null;
   updateUI();scheduleDraw();if(changed)showToast(tr(msg)+(paid?' '+tr('charged')+': '+priceLabel(paid):''));return;
  }
  if(state.roadDraft.length){
   const erasing=state.mode==='erase';
   const paid=roadStrokePrice(state.city,state.roadDraft,{erasing});
   const next=applyRoadStroke(state.city,CATALOG,state.roadDraft,{erasing});
   const changed=applyChange(next);state.roadDraft=[];state.roadValid=true;
   updateUI();scheduleDraw();if(changed)showToast(tr(erasing?'roadsErased':'roadsBuilt')+(erasing?'':` ${tr('charged')}: ${priceLabel(paid)}`));
  }
 }catch(error){showToast(statusError(error),true);updateUI();scheduleDraw();}
}
// A paid building must not start its construction animation while its stage
// art is still downloading. Only execute the authoritative action afterward.
async function confirmEdit(){
 if(state.preparingPlacementArt)return;
 const d=state.draft;
 const existing=d?.uid?state.city.objects.find(item=>item.uid===d.uid):null;
 const stageRequired=d && ((d.type==='place'&&Number(CATALOG[d.kind]?.buildMs)>0)||isConstructing(existing));
 if(stageRequired){
  state.preparingPlacementArt=true;updateActions();
  try{
   const stage=await preloadBuildFrames(d.kind,d.rotation);
   if(stage.failed){showToast('\u041d\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043b\u0430\u0441\u044c \u0433\u0440\u0430\u0444\u0438\u043a\u0430 \u0441\u0442\u0440\u043e\u0439\u043a\u0438. \u041f\u043e\u0432\u0442\u043e\u0440\u0438 \u043f\u043e\u043f\u044b\u0442\u043a\u0443.',true);return;}
   if(state.draft!==d)return; // User may have cancelled the edit while loading.
  }finally{state.preparingPlacementArt=false;updateActions();}
 }
 if(SERVER_MODE)await confirmServerEdit();
 else confirmLocalEdit();
}
function cancelEdit(){stopDraft();if(['move','place','restore','expand'].includes(state.mode))state.mode='select';updateUI();scheduleDraw();}
function zoomTo(nextZoom){state.camera.zoom=Math.max(.42,Math.min(2.0,nextZoom));scheduleDraw();}
function undo(){
 if(SERVER_MODE)return;
 if(!state.undo.length)return;
 if(state.skipAnimation)clearSkipAnimation();
 state.redo.push(cloneCity(state.city));state.city=state.undo.pop();
 stopDraft();state.selectedUid=null;state.mode='select';saveCity();updateUI();scheduleDraw();showToast(tr('undoDone'));
}
function redo(){
 if(SERVER_MODE)return;
 if(!state.redo.length)return;
 if(state.skipAnimation)clearSkipAnimation();
 state.undo.push(cloneCity(state.city));state.city=state.redo.pop();
 stopDraft();state.selectedUid=null;state.mode='select';saveCity();updateUI();scheduleDraw();showToast(tr('redoDone'));
}
function tileFromEvent(event){
 const r=canvas.getBoundingClientRect();
 return screenToTile(event.clientX-r.left,event.clientY-r.top,SIZE(),state.camera);
}
function pointerPosition(event){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
function validTile(tile){return inBounds(state.city,tile.x,tile.y);}
function selectTile(tile,point){
 const direct=findOccupant(state.city,CATALOG,tile.x,tile.y);
 if(direct)return direct.uid;
 // Tall roofs extend above their logical tile; allow selecting the visible building silhouette.
 const rendered=state.city.objects.filter(o=>!o.stored).slice().reverse();
 for(const row of rendered){
  const def=CATALOG[row.kind];if(!def||!def.height)continue;
  const {w,h}=dims(def,row.rotation);
  const a=isoToScreen(row.x,row.y,SIZE(),state.camera),b=isoToScreen(row.x+w,row.y,SIZE(),state.camera),c=isoToScreen(row.x+w,row.y+h,SIZE(),state.camera),d=isoToScreen(row.x,row.y+h,SIZE(),state.camera);
  const xMin=Math.min(a.x,b.x,c.x,d.x)-2,xMax=Math.max(a.x,b.x,c.x,d.x)+2;
  const yMin=Math.min(a.y,b.y,c.y,d.y)-def.height*state.camera.zoom-18*state.camera.zoom;
  const yMax=Math.max(a.y,b.y,c.y,d.y);
  if(point.x>=xMin&&point.x<=xMax&&point.y>=yMin&&point.y<=yMax)return row.uid;
 }
 return null;
}
function extendRoad(to){
 if(!validTile(to))return;
 if(state.roadDraft.length===0){state.roadDraft=[to];}
 else {
  const last=state.roadDraft[state.roadDraft.length-1];
  if(last.x!==to.x||last.y!==to.y){
   const path=orthogonalPath(last,to,Math.abs(last.x-to.x)>=Math.abs(last.y-to.y)?'x':'y');
   const present=new Set(state.roadDraft.map(p=>keyOf(p.x,p.y)));
   for(const point of path.slice(1))if(!present.has(keyOf(point.x,point.y))&&state.roadDraft.length<240){state.roadDraft.push(point);present.add(keyOf(point.x,point.y));}
  }
 }
 updateRoadValidity();updateActions();$('mapNotice').hidden=true;scheduleDraw();
}
function onPointerDown(event){
 if(event.button!=null&&event.button!==0)return;
 if(['welcomeModal','confirmModal','helpModal','skipModal'].some(id=>!$(id).hidden))return;
 canvas.setPointerCapture(event.pointerId);
 const pos=pointerPosition(event),tile=tileFromEvent(event);
 state.pointers.set(event.pointerId,{...pos});
 if(state.pointers.size===2){
  const list=[...state.pointers.values()];
  state.gesture={initialDist:Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y),zoom:state.camera.zoom,x:state.camera.x,y:state.camera.y,center:{x:(list[0].x+list[1].x)/2,y:(list[0].y+list[1].y)/2}};
  state.pointerStart=null;return;
 }
 state.pointerStart={id:event.pointerId,pos,original:{...pos},tile,last:tile,moved:false};
 if(state.mode==='place'||state.mode==='move'||state.mode==='restore'){
  if(validTile(tile)){state.draft.x=tile.x;state.draft.y=tile.y;updateActions();scheduleDraw();}
 } else if(state.mode==='road'||state.mode==='erase') {
  state.roadDraft=[];extendRoad(tile);
 }
}
function onPointerMove(event){
 if(!state.pointers.has(event.pointerId)){
  const tile=tileFromEvent(event);if(validTile(tile))$('coordLabel').textContent=`${tile.x+1}:${tile.y+1}`;return;
 }
 const pos=pointerPosition(event);
 state.pointers.set(event.pointerId,{...pos});
 if(state.pointers.size>=2&&state.gesture){
  const list=[...state.pointers.values()];const g=state.gesture;
  const dist=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);
  const mid={x:(list[0].x+list[1].x)/2,y:(list[0].y+list[1].y)/2};
  state.camera.zoom=Math.max(.42,Math.min(2.0,g.zoom*dist/Math.max(10,g.initialDist)));
  state.camera.x=g.x+(mid.x-g.center.x);state.camera.y=g.y+(mid.y-g.center.y);
  scheduleDraw();return;
 }
 const start=state.pointerStart;
 if(!start||start.id!==event.pointerId)return;
 const dX=pos.x-start.original.x,dY=pos.y-start.original.y;
 if(Math.hypot(dX,dY)>6)start.moved=true;
 if(state.mode==='select'||state.mode==='expand'){
  if(start.moved){state.camera.x+=pos.x-start.pos.x;state.camera.y+=pos.y-start.pos.y;scheduleDraw();}
 } else if(state.mode==='place'||state.mode==='move'||state.mode==='restore'){
  const tile=tileFromEvent(event);
  if(validTile(tile)){state.draft.x=tile.x;state.draft.y=tile.y;updateActions();scheduleDraw();}
 } else if(state.mode==='road'||state.mode==='erase')extendRoad(tileFromEvent(event));
 start.pos=pos;
}
function onPointerUp(event){
 if(!state.pointers.has(event.pointerId))return;
 const wasMultiple=state.pointers.size>=2||Boolean(state.gesture);
 state.pointers.delete(event.pointerId);
 if(wasMultiple){
  if(state.pointers.size<2)state.gesture=null;
  state.pointerStart=null;
  return;
 }
 const start=state.pointerStart;
 if(start&&start.id===event.pointerId&&!start.moved){
  const tile=tileFromEvent(event),point=pointerPosition(event);
  if(state.mode==='select'){
   state.selectedUid=selectTile(tile,point);state.warehouse=false;updateUI();scheduleDraw();
  }else if(state.mode==='expand'){
   const cx=Math.floor(tile.x/PARCEL_SIZE),cy=Math.floor(tile.y/PARCEL_SIZE);
   const candidate=expansionCandidates(state.city).find(p=>p.cx===cx&&p.cy===cy);
   if(candidate){state.expansionDraft=candidate;updateUI();scheduleDraw();}
  }
 }
 state.pointerStart=null;
 if(state.mode==='road'||state.mode==='erase'){updateActions();scheduleDraw();}
}
function onPointerCancel(event){state.pointers.delete(event.pointerId);state.pointerStart=null;state.gesture=null;}
function closeSkipModal(){state.paidSkipUid=null;$('skipModal').hidden=true;}
function updateSkipQuote(){
 if($('skipModal').hidden || !state.paidSkipUid)return;
 const item=state.city.objects.find(row=>row.uid===state.paidSkipUid&&!row.stored);
 if(!item || !isConstructing(item)){closeSkipModal();return;}
 const cost=constructionSkipPrice(item);
 const msToNextReduction=60000-(Math.max(0,Date.now()-Number(item.buildStartedAt||0))%60000);
 const nextPrice=Math.max(5,cost.coffee-25);
 const moreDiscount=cost.coffee>5 && cost.remaining>msToNextReduction;
 $('skipConfirmText').textContent=`Осталось ${formatRemaining(cost.remaining)}. Ускорить за ${cost.coffee} ☕.${moreDiscount?` Через ${formatRemaining(msToNextReduction)} цена снизится до ${nextPrice} ☕.`:''}`;
 $('skipWalletHint').textContent=`Баланс: ${state.city.wallet.coffee.toLocaleString('ru-RU')} ☕ · списывается только кофе`;
 $('skipAccept').disabled=state.skipPreparingUid!==null || !canAfford(state.city.wallet,cost) || (SERVER_MODE&&!state.serverPurchasesEnabled);
 $('skipAccept').textContent=`Ускорить · ${cost.coffee} ☕`;
}
function clearSkipAnimation(){
 if(state.skipAnimationTimer!==null){clearTimeout(state.skipAnimationTimer);state.skipAnimationTimer=null;}
 if(state.skipAnimationRaf!==null){cancelAnimationFrame(state.skipAnimationRaf);state.skipAnimationRaf=null;}
 state.skipAnimation=null;
}
function finishFx(token){
 if(!state.skipAnimation||state.skipAnimation.token!==token)return;
 clearSkipAnimation();
 updateUI();scheduleDraw();
 showToast('✨ Готово! Постройка завершена.');
}
function paintSkipAnimation(token){
 const fx=state.skipAnimation;
 if(!fx||fx.token!==token)return;
 const now=Date.now();
 if(now>=fx.startAt+fx.duration){finishFx(token);return;}
 // Continuous repaint is essential; the old 1Hz countdown skipped 3D stages.
 if(now-fx.lastPaint>=34){fx.lastPaint=now;scheduleDraw();}
 state.skipAnimationRaf=requestAnimationFrame(()=>paintSkipAnimation(token));
}
async function finishSelectedConstruction(uid){
 if(state.skipPreparingUid || state.skipAnimation)return;
 const item=state.city.objects.find(row=>row.uid===uid&&!row.stored);
 if(!item||!isConstructing(item))return;
 state.skipPreparingUid=uid;
 updateUI();
 try{
  // Hold the animation and payment until every directional stage is decoded.
  // A short timer used to show procedural geometry during slow downloads.
  const art=await preloadBuildFrames(item.kind,item.rotation);
  if(art.failed)throw new Error('\u0410\u0440\u0442\u044b \u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043b\u0438\u0441\u044c. \u041f\u043e\u0432\u0442\u043e\u0440\u0438 \u043f\u043e\u043f\u044b\u0442\u043a\u0443.');
  const current=state.city.objects.find(row=>row.uid===uid&&!row.stored);
  if(!current||!isConstructing(current))return;
  const now=Date.now();
  const result=SERVER_MODE?{city:null}:skipConstruction(state.city,uid,now);
  if(SERVER_MODE){await performServerAction('skip',{uid});}
  // Persist the coffee charge/completion BEFORE visual FX; closing the tab
  // cannot consume currency without completing the underlying building.
  state.skipPreparingUid=null;
  if(!SERVER_MODE&&!applyChange(result.city))return;
  const token=++state.skipToken;
  const fx={token,uid,item:{...current},type:'skip',startAt:Date.now(),duration:2550,lastPaint:0};
  state.skipAnimation=fx;
  state.skipAnimationTimer=setTimeout(()=>finishFx(token),fx.duration+120);
  state.skipAnimationRaf=requestAnimationFrame(()=>paintSkipAnimation(token));
  updateUI();scheduleDraw();
 }catch(error){showToast(error?.message||statusError(error),true);}
 finally{state.skipPreparingUid=null;updateUI();scheduleDraw();}
}
function bindEvents(){
 for(const type of ['contextmenu','selectstart','dragstart','copy','cut']){
  document.addEventListener(type,event=>event.preventDefault());
 }
 document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>switchMode(btn.dataset.tool)));
 $('warehouseButton').addEventListener('click',openWarehouse);
 $('rotateButton').addEventListener('click',()=>{if(!state.draft||CATALOG[state.draft.kind]?.rotatable===false||state.preparingPlacementArt)return;state.draft.rotation=nextRotation(state.draft.rotation);if(Number(CATALOG[state.draft.kind]?.buildMs)>0)void preloadBuildFrames(state.draft.kind,state.draft.rotation);updateActions();scheduleDraw();});
 $('confirmEdit').addEventListener('click',confirmEdit);
 $('cancelEdit').addEventListener('click',cancelEdit);
 $('moveSelected').addEventListener('click',startMove);
 $('storeSelected').addEventListener('click',()=>{
  const item=selectedItem();if(!item)return;
  if(SERVER_MODE){void performServerAction('store',{uid:item.uid}).then(()=>{state.selectedUid=null;showToast(tr('storedDone'));}).catch(error=>showToast(error.message,true));return;}
  try{const next=storeObject(state.city,item.uid);if(applyChange(next)){state.selectedUid=null;showToast(tr('storedDone'));}updateUI();scheduleDraw();}
  catch(error){showToast(statusError(error),true);}
 });
 $('closeSelected').addEventListener('click',()=>{state.selectedUid=null;updateUI();scheduleDraw();});
 $('finishBuildTest').addEventListener('click',()=>{
  const item=selectedItem();if(!item||!isConstructing(item)||state.skipPreparingUid||state.skipAnimation)return;
  state.paidSkipUid=item.uid;
  preloadBuildFrames(item.kind,item.rotation); // begin preloading before confirmation
  $('skipModal').hidden=false;
  updateSkipQuote();
  $('skipCancel').focus();
 });
 $('skipCancel').addEventListener('click',closeSkipModal);
 $('skipAccept').addEventListener('click',()=>{
  const uid=state.paidSkipUid;
  if(!uid)return;
  closeSkipModal();
  finishSelectedConstruction(uid);
 });
 $('topupWallet').addEventListener('click',()=>{
  if(SERVER_MODE)return;
  try{if(applyChange(topUpTestWallet(state.city)))showToast(tr('testTopupDone'));}
  catch(error){showToast(statusError(error),true);}
 });
 $('undoButton').addEventListener('click',undo);$('redoButton').addEventListener('click',redo);
 $('centerCamera').addEventListener('click',resetView);
 $('zoomIn').addEventListener('click',()=>zoomTo(state.camera.zoom*1.17));
 $('zoomOut').addEventListener('click',()=>zoomTo(state.camera.zoom/1.17));
 $('resetButton').addEventListener('click',()=>{$('confirmModal').hidden=false;$('resetCancel').focus();});
 $('resetCancel').addEventListener('click',()=>{$('confirmModal').hidden=true;});
 $('resetAccept').addEventListener('click',()=>{
  if(SERVER_MODE)return;
  $('confirmModal').hidden=true;stopDraft();state.mode='select';state.selectedUid=null;state.warehouse=false;
  applyChange(makeInitialCity());resetView();showToast(tr('resetDone'));
 });
 $('helpButton').addEventListener('click',()=>{$('helpModal').hidden=false;$('helpClose').focus();});
 $('helpClose').addEventListener('click',()=>{$('helpModal').hidden=true;});
 $('commonButton').addEventListener('click',()=>showToast(tr('worldUnavailable')));
 $('toolRoad').title=`Road: ${priceLabel(ROAD_TILE_PRICE)} / ${tr('cellsShort')}`;
 $('welcomeStart').addEventListener('click',()=>{
  $('welcomeModal').hidden=true;
  try{localStorage.setItem(WELCOME_KEY,'1');}catch{}
  canvas.focus({preventScroll:true});
 });
 canvas.addEventListener('pointerdown',onPointerDown);
 canvas.addEventListener('pointermove',onPointerMove);
 canvas.addEventListener('pointerup',onPointerUp);
 canvas.addEventListener('pointercancel',onPointerCancel);
 canvas.addEventListener('lostpointercapture',onPointerCancel);
 canvas.addEventListener('wheel',event=>{event.preventDefault();zoomTo(state.camera.zoom*(event.deltaY<0?1.12:.89));},{passive:false});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   if(!$('skipModal').hidden){closeSkipModal();return;}
   if(!$('confirmModal').hidden){$('confirmModal').hidden=true;return;}
   if(!$('helpModal').hidden){$('helpModal').hidden=true;return;}
   if(activeEdit()){cancelEdit();return;}
   if(state.selectedUid){state.selectedUid=null;updateUI();scheduleDraw();return;}
  }
  if(!SERVER_MODE&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
   event.preventDefault();if(event.shiftKey)redo();else undo();return;
  }
  if(!SERVER_MODE&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();return;}
  if(event.target===canvas){
   const steps={ArrowUp:[0,24],ArrowDown:[0,-24],ArrowLeft:[24,0],ArrowRight:[-24,0]};
   if(steps[event.key]){event.preventDefault();state.camera.x+=steps[event.key][0];state.camera.y+=steps[event.key][1];scheduleDraw();}
  }
 });
 new ResizeObserver(scheduleDraw).observe($('mapZone'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateUI();scheduleDraw();}});
 // Draw citizens at a capped 8 fps; gesture handling still gets immediate
 // animation frames. No loops are scheduled for hidden pages or when system
 // reduced-motion is enabled. The 12-citizen cap keeps full-map repaints cheap.
 const motionReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 setInterval(()=>{
  if(document.hidden||motionReduced?.matches||!state.visualsReady)return;
  if(!state.citizenScene?.routes?.length)return;
  scheduleDraw();
 },125);
 // Wall-clock countdown: construction continues while the page is closed.
 let previousConstructionCount=cityStats(state.city,CATALOG).constructing;
 setInterval(()=>{
  if(document.hidden)return;
  const active=cityStats(state.city,CATALOG).constructing;
  if(active||active!==previousConstructionCount||state.selectedUid||state.skipAnimation){
   updateUI();scheduleDraw();
  }
  updateSkipQuote();
  previousConstructionCount=active;
 },1000);
}
function initialize(){
 onSpriteUpdate(()=>{if(state.visualsReady)refreshArt();});
 // A retired 2D/3D preference must never switch the released city to wireframes.
 setSpriteMode(true);
 translateStatic();readSavedCity();bindEvents();renderCategories();renderCatalog();updateUI();resetView();
 if(SERVER_MODE){
  for(const id of ['topupWallet','undoButton','redoButton','resetButton']){$(id).hidden=true;}
  document.querySelector('.test-wallet__badge').textContent='СЕРВЕР · D1';
  document.querySelector('.panel-eyebrow').textContent='ПОКУПКИ И СОХРАНЕНИЯ ЧЕРЕЗ WORKER';
  document.querySelector('.nav-notice [data-t="local"]').textContent='Серверное сохранение';
  void bootWorldServer();
 }else void bootLocalArt();
 if(state.loadingFailed)showToast(tr('invalidSave'),true);
 let seen=false;try{seen=localStorage.getItem(WELCOME_KEY)==='1';}catch{}
 if(!seen){$('welcomeModal').hidden=false;$('welcomeStart').focus();}
}
window.WorldZeffiSandbox=Object.freeze({ getCity:()=>cloneCity(state.city),getStats:()=>cityStats(state.city,CATALOG),getMode:()=>state.mode, getArtStatus:()=>spriteStatus(), setArtMode:(value)=>setSpriteMode(value) });
initialize();
