// Authored 48x48 map. Existing art IDs only; no edits to the 24x24 personal city.
import { CATALOG } from '../catalog.js';
import { dims, keyOf, connectedRoads, isObjectConnected } from '../engine.js';
import { projectStatus, festivalStage } from './model.js';
export const STORY_MAP_SIZE=48;
// Static 9x9 story landmark: never registered in the live shop or server catalog.
export const STORY_PARK_BELKINO_KIND='story-park-belkino';
export const STORY_FESTIVAL_KINDS=Object.freeze({stage_a:'story-festival-stage-a',stage_b:'story-festival-stage-b',stage_c:'story-festival-stage-c',complete:'story-festival-complete'});
export const STORY_CATALOG=Object.freeze({
 ...CATALOG,
 [STORY_PARK_BELKINO_KIND]:Object.freeze({id:STORY_PARK_BELKINO_KIND,category:'parks',titleKey:'pondPark',descriptionKey:'pondParkDescription',icon:'leaf',w:9,h:9,needsRoad:false,style:'park',height:0,buildMs:0}),
 ...Object.fromEntries(Object.values(STORY_FESTIVAL_KINDS).map(id=>[id,Object.freeze({id,category:'plazas',titleKey:'citySquare',descriptionKey:'citySquareDescription',icon:'flag',w:6,h:6,needsRoad:false,style:'rose',height:116,buildMs:0})])),
 ...Object.fromEntries(Array.from({length:6},(_,i)=>{const id=`story-wr-stage-${i+1}`;return [id,Object.freeze({id,category:'shops',titleKey:'whiteRabbitZephirok',descriptionKey:'whiteRabbitZephirokDescription',icon:'coffee',w:4,h:4,needsRoad:true,style:'rose',height:115,buildMs:0})];}))
});
export const MAP_VERSION='zeffi-story-map-v1';
export const DISTRICTS=Object.freeze([
 {id:'square',title:'Центральная площадь',short:'Площадь',icon:'spark',focus:[23.5,23.5],bounds:[19,19,13,13],chapter:0,kind:'zeffi-central-square',description:'Сердце общего города: встречи, прогулки и будущие сюжетные сцены.'},
 {id:'cafe',title:'Кафе «Зефирок»',short:'Зефирок',icon:'coffee',focus:[10.1,11.4],bounds:[7,7,11,12],chapter:0,kind:'white-rabbit-zephirok',description:'Кафе-кондитерская «Зефирок» находится в одном здании с «Белым Кроликом».'},
 {id:'belkino',title:'Парк Белкино',short:'Белкино',icon:'leaf',focus:[12.5,26.5],bounds:[7,21,11,18],chapter:0,kind:STORY_PARK_BELKINO_KIND,description:'Большой парк с ротондой у пруда, зелёными фигурами, историческими руинами и прогулочными дорожками. Здесь запланирована история «Тайны Белкино».'},
 {id:'friends',title:'Квартал друзей',short:'Друзья',icon:'home',focus:[33,11],bounds:[27,6,15,12],chapter:0,kind:'cottage',description:'Уютный жилой квартал. Будущие участки персонажей пока не закреплены за героями: их откроем вместе с сюжетом.'},
 {id:'station',title:'Городская станция',short:'Станция',icon:'bus',focus:[36,37],bounds:[33,33,11,10],chapter:0,kind:'bus-terminal',description:'Автобусы связывают кафе, центральную часть города и парк. Это декоративный транспорт: без билетов и списаний.'},
 {id:'festival',title:'Дом фестивалей Зеффи',short:'Фестивали',icon:'flag',focus:[25,35.5],bounds:[21,32,9,7],chapter:1,kind:STORY_FESTIVAL_KINDS.complete,description:'Большая общегородская стройка с четырьмя стадиями. Прогресс строительства и взносы участников хранятся на сервере.'},
 {id:'rabbit',title:'«Белый Кролик»',short:'Кролик',icon:'star',focus:[11.3,9.8],bounds:[9,9,4,4],chapter:2,kind:'white-rabbit-zephirok',description:'«Белый Кролик» и кафе «Зефирок» делят одно здание. Сюжетные подробности «Белого Кролика» откроются позже.'},
 {id:'mystery',title:'Неизвестный район',short:'Тайна',icon:'lock',focus:[24,8],bounds:[21,4,6,8],chapter:99,kind:'botanical-garden',description:'Здесь появится новая часть города. Название, герой и условия открытия пока не объявлены.'}
]);
export const PLACES=Object.freeze([
 ...DISTRICTS.map(d=>({...d,uid:({square:'story-central-square',cafe:'story-cafe',belkino:'story-pond',friends:'story-home',station:'story-terminal',festival:'story-festival',rabbit:'story-cafe'})[d.id]||null})),
 {id:'community-garden',title:'Сад встреч',short:'Строим вместе',icon:'heart',focus:[15.5,35.5],bounds:[14,34,3,3],chapter:0,kind:'garden',uid:'story-community-garden',description:'Уютный сад рядом с парком Белкино. Жители вместе собирают средства на строительство через общий городской фонд.'}
]);
export const placeById=id=>PLACES.find(p=>p.id===id)||null;
export const isPlaceOpen=(place,state)=>state.chapter>=place.chapter;
// The Rabbit storyline is locked until chapter 2, but the shared physical cafe
// is already open. Never grey-out the same occupied building plot.
export const lockedDistricts=state=>DISTRICTS.filter(d=>d.id!=='rabbit'&&!isPlaceOpen(d,state));
const contains=(b,x,y)=>x>=b[0]&&y>=b[1]&&x<b[0]+b[2]&&y<b[1]+b[3];
export function buildStoryMap(state, now=Date.now()) {
 const city={version:2,size:STORY_MAP_SIZE,parcels:[],wallet:{points:0,coffee:0,treats:0},progress:{bestLevel:1,claimedLevels:[]},nextId:1,roads:[],busRoads:[],lockedRoads:['7,13'],objects:[]};
 const roads=new Set(),busRoads=new Set();
 function line(target,x1,y1,x2,y2) {
  if(x1!==x2&&y1!==y2)throw new Error('Story road must be orthogonal');
  const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);let x=x1,y=y1;
  for(;;){target.add(keyOf(x,y));if(x===x2&&y===y2)break;x+=dx;y+=dy;}
 }
 for(const y of [13,19,31,39])line(roads,7,y,41,y);
 line(roads,7,13,7,39);line(roads,19,7,19,41);line(roads,31,8,31,39);
 line(roads,13,25,13,39);line(roads,19,23,31,23);line(roads,19,26,31,26);line(roads,23,23,23,29);
  // Central 7x7 landmark occupies x20..26,y20..26. Bypass, not pave THROUGH it.
  for(let x=20;x<=26;x++){roads.delete(keyOf(x,23));roads.delete(keyOf(x,26));}
  for(let y=23;y<=26;y++)roads.delete(keyOf(23,y));
  line(roads,23,27,23,31); // Reconnect southern walking spur to the y31 arterial.

 // The 9x9 park fills x=8..16,y=22..30. Remove only the interior
 // dead-end spur; the southern pedestrian corridor at y=31 is retained.
 for(let y=25;y<=30;y++)roads.delete(keyOf(13,y));
 // The eastern edge has a walkable sidewalk. Buses remain on x=18 asphalt.
 line(roads,17,22,17,31);
 if(state.chapter>=2)line(roads,31,28,40,28);
 // Dedicated asphalt lane for public transport in the shared story city.
 // It is visual + routing-only and stays separate from the pedestrian paths.
 // The line deliberately avoids decorative objects so routing stays connected.
 line(busRoads,15,14,15,17);
 line(busRoads,15,17,32,17);
 line(busRoads,18,17,18,33);
 line(busRoads,12,33,18,33);
 line(busRoads,32,17,32,35);
 line(busRoads,32,35,38,35);
 city.roads=[...roads];
 city.busRoads=[...busRoads];
 city.crosswalks=[];
 for(const id of city.busRoads){
  if(!roads.has(id))continue;
  const [x,y]=id.split(',').map(Number);
  const horizontal=busRoads.has(keyOf(x-1,y))&&busRoads.has(keyOf(x+1,y))&&!busRoads.has(keyOf(x,y-1))&&!busRoads.has(keyOf(x,y+1));
  const vertical=busRoads.has(keyOf(x,y-1))&&busRoads.has(keyOf(x,y+1))&&!busRoads.has(keyOf(x-1,y))&&!busRoads.has(keyOf(x+1,y));
  if(!horizontal&&!vertical)throw new Error('Crosswalk must be on a straight asphalt segment: '+id);
  city.crosswalks.push({id,x,y,axis:vertical?'x':'y'});
 }
 const occupied=new Set([...roads,...busRoads]);let sequence=0;
 function place(kind,x,y,rotation=0,uid='',extra={},optional=false) {
  const def=STORY_CATALOG[kind];if(!def)throw new Error('Missing catalog item '+kind);
  const {w,h}=dims(def,rotation),cells=[];
  for(let xx=x;xx<x+w;xx++)for(let yy=y;yy<y+h;yy++){
   if(xx<0||yy<0||xx>=STORY_MAP_SIZE||yy>=STORY_MAP_SIZE||occupied.has(keyOf(xx,yy))){if(optional)return false;throw new Error(`Story overlap: ${kind} at ${xx},${yy}`);}
   cells.push(keyOf(xx,yy));
  }
  for(const cell of cells)occupied.add(cell);
  city.objects.push({uid:uid||`story-decor-${++sequence}`,kind,x,y,rotation,level:1,stored:false,buildStartedAt:0,buildReadyAt:0,...extra});return true;
 }
 place(state.whiteRabbitPreview>0?`story-wr-stage-${state.whiteRabbitPreview}`:'white-rabbit-zephirok',9,9,0,'story-cafe');place('bakery',14,11);place('flower-shop',8,14);
 place('cottage',11,14);place('coffee-kiosk',8,17);place('bus-stop',16,14,0,'story-stop-cafe');
 place('family-home',28,9);place('cottage',32,10,0,'story-home');place('bakery',35,11);
 place('villa',34,14);place('flower-shop',38,14);place('bus-stop',29,16,0,'story-stop-square');
 // Shared network city always displays the finished plaza; no D1 construction or payments.
 place('zeffi-central-square',20,20,0,'story-central-square');place('coffee-kiosk',27,21);place('fountain',28,24,0,'story-fountain');
 place('monument',27,28);place('flower-shop',20,27);
 // One large authored park replaces the old tiny pond and the internal
 // playground; keep a public playground south of the walking path instead.
 place(STORY_PARK_BELKINO_KIND,8,22,0,'story-pond');place('playground',10,37);place('garden',8,34);
 place('coffee-kiosk',8,20);place('bus-stop',11,32,0,'story-stop-park');
 place('bus-terminal',34,36,0,'story-terminal');place('family-home',38,32);place('cottage',38,40);
 if(state.chapter>=1){place(STORY_FESTIVAL_KINDS[festivalStage(state)],22,33,0,'story-festival');place('flowerbed',28,38);}
 // No second White Rabbit villa: both places point to story-cafe.
 if(state.chapter>=2){place('bench',39,27);place('flowerbed',38,25);}
 const status=projectStatus(state,now);
 if(status!=='funding')place('garden',14,34,0,'story-community-garden',status==='building'?{buildStartedAt:state.project.startedAt,buildReadyAt:state.project.readyAt}:{});
 // Keep the future project's footprint reserved even during funding.
 if(status==='funding')for(let x=14;x<17;x++)for(let y=34;y<37;y++)occupied.add(keyOf(x,y));
 const furnishings=[['bench',25,27],['flowerbed',24,27],['bench',12,35],['bench',17,32],['lamp',17,12],['lamp',10,14],['bench',14,14],['flowerbed',17,15],['lamp',30,18],['bench',33,38],['lamp',40,38],['flowerbed',32,18]];
 for(const [kind,x,y]of furnishings)place(kind,x,y,0,'',{},true);
 const closed=lockedDistricts(state);
 for(let x=4;x<44;x+=2)for(let y=4;y<44;y+=2){
  if(closed.some(d=>contains(d.bounds,x,y)))continue;
  const hash=(Math.imul(x+17,73856093)^Math.imul(y+41,19349663))>>>0;
  if(hash%100>28)continue;
  const kind=['tree','tree','flowerbed','extra-bush'][hash%4];
  place(kind,x,y,(hash>>>8)%4,'',{},true);
 }
 return city;
}
export function validateStoryMap(city) {
 const occupied=new Set(),roads=new Set(city.roads),connected=connectedRoads(city),busRoads=new Set(city.busRoads||[]),errors=[];
 if(city.size!==STORY_MAP_SIZE)errors.push('wrong map size');
 if(connected.size!==roads.size)errors.push('disconnected roads');
 if(busRoads.size){
  const queue=[...busRoads].slice(0,1),seen=new Set(queue);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<queue.length;i++)for(const [dx,dy] of dirs){
   const [x,y]=queue[i].split(',').map(Number),next=keyOf(x+dx,y+dy);
   if(busRoads.has(next)&&!seen.has(next)){seen.add(next);queue.push(next);}
  }
  if(seen.size!==busRoads.size)errors.push('disconnected bus roads');
 }
 const uids=new Set();
 for(const item of city.objects){
  if(uids.has(item.uid))errors.push('duplicate uid '+item.uid);uids.add(item.uid);
  const def=STORY_CATALOG[item.kind];if(!def){errors.push('missing kind '+item.kind);continue;}
  const {w,h}=dims(def,item.rotation);
  for(let x=item.x;x<item.x+w;x++)for(let y=item.y;y<item.y+h;y++){
   const key=keyOf(x,y);
   if(x<0||y<0||x>=city.size||y>=city.size)errors.push('out of bounds '+key);
   if(roads.has(key)||busRoads.has(key)||occupied.has(key))errors.push('overlap '+key);
   occupied.add(key);
  }
  if(def.needsRoad && !isObjectConnected(item,city,STORY_CATALOG,connected,0))errors.push('no road '+item.uid);
 }
 const crossings=new Map((city.crosswalks||[]).map(c=>[c.id,c]));
 for(const id of busRoads){
  const [x,y]=id.split(',').map(Number);
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<0||y<0||x>=city.size||y>=city.size)errors.push('invalid asphalt cell '+id);
  if(roads.has(id)&&!crossings.has(id))errors.push('shared road outside crosswalk '+id);
 }
 for(const c of crossings.values()){
  if(!busRoads.has(c.id)||!roads.has(c.id)||!['x','y'].includes(c.axis)){errors.push('invalid crosswalk '+c.id);continue;}
  for(const sign of [-1,1]){
   const id=keyOf(c.x+(c.axis==='x'?sign:0),c.y+(c.axis==='y'?sign:0));
   if(!roads.has(id)||busRoads.has(id))errors.push('crosswalk lacks pedestrian exit '+c.id);
  }
 }
 return errors;
}
