// City-life visuals: routes and animations are derived from the authoritative
// city snapshot. They are never persisted and never affect economy or D1.
import { connectedRoads, isConstructing, isObjectConnected, dims, keyOf, visibleCitizenCount } from './engine.js';

const STEP_MS = 1470;
const MAX_ROUTE_STEPS = 32;
const DIRECTIONS = [[1,0],[0,1],[-1,0],[0,-1]];
const MAX_VISITS = 3;
const APPROACH_MS = 850;
const RETURN_MS = 750;
const VISIT_DURATION = Object.freeze({cafe:5700,bench:4100,fountain:3400,play:4200,park:2900});
const OUTFITS = Object.freeze([
  {dress:'#e99cbb',shade:'#bd648a',accent:'#fff0d4',hair:'#895666',shoes:'#9c6d73',skin:'#f9dbc8'},
  {dress:'#9fc8b5',shade:'#6b9d8e',accent:'#fff0ca',hair:'#6b574c',shoes:'#785d68',skin:'#b77658'},
  {dress:'#c1addc',shade:'#9078b2',accent:'#ffe7b7',hair:'#ae775a',shoes:'#7b667e',skin:'#ffe4cd'},
  {dress:'#f0c18d',shade:'#c78e65',accent:'#fff8e7',hair:'#635162',shoes:'#a06c67',skin:'#b98061'},
  {dress:'#e6abb1',shade:'#b87990',accent:'#e2f2de',hair:'#b07a4b',shoes:'#83616b',skin:'#fbe3ca'},
  {dress:'#9cb9d7',shade:'#6f91b6',accent:'#fff3d0',hair:'#745b57',shoes:'#656d87',skin:'#f3cfb7'},
  {dress:'#f6d6a1',shade:'#ba9a66',accent:'#fff7e3',hair:'#45404b',shoes:'#72656b',skin:'#8c5d4a'},
  {dress:'#c1dcd9',shade:'#76aca8',accent:'#ffdbed',hair:'#b09b80',shoes:'#8c7277',skin:'#e4ab85'}
]);
const ROLES = Object.freeze(['resident','child','senior','student','worker','child','visitor','senior']);
function hash(input){let seed=2166136261;for(const c of String(input))seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;return seed>>>0;}
function tileIdToPoint(id){const [x,y]=id.split(',').map(Number);return {id,x,y};}
export function adjacentRoadAccess(item,def,roadSet){
 const {w,h}=dims(def,item.rotation||0),adjacent=[];
 for(let x=item.x;x<item.x+w;x++)adjacent.push(keyOf(x,item.y-1),keyOf(x,item.y+h));
 for(let y=item.y;y<item.y+h;y++)adjacent.push(keyOf(item.x-1,y),keyOf(item.x+w,y));
 return [...new Set(adjacent)].filter(id=>roadSet.has(id)).sort();
}
function entryRoads(city,catalog,roadSet,now){
 const entries=[],asphalt=new Set(city.busRoads||[]);
 for(const item of city.objects){
  const def=catalog[item.kind];
  if(item.stored||!def||!['homes','shops'].includes(def.category)||isConstructing(item,now))continue;
  if(!isObjectConnected(item,city,catalog,roadSet,now))continue;
  const access=adjacentRoadAccess(item,def,roadSet).filter(id=>!asphalt.has(id));
  if(access.length)entries.push({uid:item.uid,access});
 }
 return entries.sort((a,b)=>String(a.uid).localeCompare(String(b.uid)));
}
// Mask roads hidden beneath legacy raised foundations. It is visual only:
// actual road ownership/connectivity remains untouched.
export function walkableCitizenRoads(city,catalog,roads=connectedRoads(city)){
 const walkable=new Set(roads);
 for(const item of city.objects){
  if(item.stored)continue;
  const def=catalog[item.kind];
  if(!def || (def.layer==='surface'&&!def.blockingSurface))continue;
  const {w,h}=dims(def,item.rotation||0);
  for(let x=item.x;x<item.x+w;x++)for(let y=item.y;y<item.y+h;y++)walkable.delete(keyOf(x,y));
 }
 if(Array.isArray(city.busRoads)){
  const gates=new Set((city.crosswalks||[]).filter(c=>c&&['x','y'].includes(c.axis)).map(c=>c.id));
  for(const id of city.busRoads)if(!gates.has(id))walkable.delete(id);
 }
 return walkable;
}
export function roadNeighborMap(roads,crosswalks=[]){
 const gates=new Map(crosswalks.map(c=>[c.id,c.axis]));
 return new Map([...roads].map(id=>{
  const {x,y}=tileIdToPoint(id);
  return [id,DIRECTIONS.filter(([dx,dy])=>{
   const next=keyOf(x+dx,y+dy);if(!roads.has(next))return false;
   for(const at of [id,next]){const axis=gates.get(at);if(axis==='x'&&dy!==0||axis==='y'&&dx!==0)return false;}
   return true;
  }).map(([dx,dy])=>keyOf(x+dx,y+dy))];
 }));
}
// Bounded breadth-first search prevents cutting across unrelated road islands
// or walking through a new building over old purchased road cells.
export function shortestRoadPath(neighbors,start,goal){
 if(!neighbors.has(start)||!neighbors.has(goal))return null;
 if(start===goal)return [start];
 const queue=[start],prev=new Map([[start,null]]);
 for(let k=0;k<queue.length;k++){
  const at=queue[k];
  for(const next of neighbors.get(at)||[]){
   if(prev.has(next))continue;
   prev.set(next,at);
   if(next===goal){
    const path=[];let node=goal;
    while(node!==null){path.push(node);node=prev.get(node);}
    return path.reverse();
   }
   queue.push(next);
  }
 }
 return null;
}
function activityFor(kind){
 if(['coffee-kiosk','coffee-house','bakery'].includes(kind))return 'cafe';
 if(['bench','extra-bench'].includes(kind))return 'bench';
 if(['fountain','extra-fountain','terrain_platform_topiary_fountain'].includes(kind))return 'fountain';
 if(['playground','sports-playground','plaza-playground-base'].includes(kind))return 'play';
 if(['garden','pond-park','rose-garden','botanical-garden','city-square','plaza-rest-zone'].includes(kind))return 'park';
 return null;
}
function activityVenues(city,catalog,roads,now){
 const venues=[],asphalt=new Set(city.busRoads||[]);
 for(const item of city.objects){
  if(item.stored||isConstructing(item,now))continue;
  const def=catalog[item.kind],activity=activityFor(item.kind);
  if(!def||!activity)continue;
  if(def.needsRoad&&!isObjectConnected(item,city,catalog,roads,now))continue;
  const access=adjacentRoadAccess(item,def,roads).filter(id=>!asphalt.has(id));
  if(access.length)venues.push({uid:item.uid,activity,item,def,access});
 }
 return venues.sort((a,b)=>a.uid.localeCompare(b.uid));
}
function activityAnchor(venue,roadId){
 const {x,y}=tileIdToPoint(roadId),item=venue.item;
 const {w,h}=dims(venue.def,item.rotation||0);
 const inset=venue.activity==='bench'?.98:venue.activity==='play'?.87:venue.activity==='cafe'?.73:.76;
 const point={x:x+.5,y:y+.5};
 if(x<item.x)point.x+=inset;
 else if(x>=item.x+w)point.x-=inset;
 else if(y<item.y)point.y+=inset;
 else if(y>=item.y+h)point.y-=inset;
 return point;
}
function nearestAccess(neighbors,at,access){
 let selected=null;
 for(const id of access){
  const path=shortestRoadPath(neighbors,at,id);
  if(path&&(!selected||path.length<selected.path.length))selected={id,path};
 }
 return selected;
}
function visitingRoute(start,venues,neighbors,i,role){
 const track=[tileIdToPoint(start)],stops=[];
 let cursor=start,visits=0;
 for(const venue of venues){
  if(visits>=MAX_VISITS)break;
  const choice=nearestAccess(neighbors,cursor,venue.access);
  if(!choice)continue;
  for(const id of choice.path.slice(1))track.push(tileIdToPoint(id));
  stops.push({at:track.length-1,uid:venue.uid,activity:venue.activity,
   role,anchor:activityAnchor(venue,choice.id)});
  cursor=choice.id;visits++;
 }
 if(!visits)return null;
 const home=shortestRoadPath(neighbors,cursor,start);
 if(!home)return null;
 for(const id of home.slice(1))track.push(tileIdToPoint(id));
 const timed=[],stopMap=new Map(stops.map(stop=>[stop.at,stop]));
 const roadPosition=point=>({x:point.x+.5,y:point.y+.5});
 const addStop=index=>{
  const stop=stopMap.get(index);if(!stop)return;
  const from=roadPosition(track[index]),to=stop.anchor;
  timed.push({from,to,duration:APPROACH_MS,activity:stop.activity,stage:'approach',uid:stop.uid});
  timed.push({from:to,to,duration:VISIT_DURATION[stop.activity],activity:stop.activity,stage:'dwell',uid:stop.uid});
  timed.push({from:to,to:from,duration:RETURN_MS,activity:stop.activity,stage:'return',uid:stop.uid});
 };
 addStop(0);
 for(let j=1;j<track.length;j++){
  timed.push({from:roadPosition(track[j-1]),to:roadPosition(track[j]),duration:STEP_MS,stage:'road'});
  addStop(j);
 }
 return {track,stops,timed,duration:timed.reduce((sum,segment)=>sum+segment.duration,0)};
}
function roamingTrack(start,neighbors,i,crossings=new Set()){
 const path=[start];let previous='',cursor=start;
 for(let step=0;step<MAX_ROUTE_STEPS;step++){
  if(step>0&&step%7===0&&!crossings.has(cursor)){path.push(cursor);continue;}
  const adjacent=neighbors.get(cursor)||[];
  if(!adjacent.length){path.push(cursor);continue;}
  const forward=adjacent.filter(id=>id!==previous);
  const choices=forward.length?forward:adjacent;
  const next=choices[hash(`${i}:${cursor}:${step}`)%choices.length];
  path.push(next);previous=cursor;cursor=next;
 }
 // A roaming route must not turn around or wait on a crossing.
 if(crossings.has(cursor)){
  const exit=(neighbors.get(cursor)||[]).find(id=>id!==previous&&!crossings.has(id));
  if(exit)path.push(exit);
 }
 return path.concat(path.slice(0,-1).reverse()).map(tileIdToPoint);
}
// Citizen count stays bound to the authoritative population/comfort budget.
// Different age groups and destinations share the same protected road graph.
export function buildCitizenScene(city,catalog,population,now=Date.now(),comfort=0){
 const count=visibleCitizenCount(population,comfort);
 if(!count)return {routes:[],population};
 const roads=walkableCitizenRoads(city,catalog);
 if(!roads.size)return {routes:[],population};
 const neighbors=roadNeighborMap(roads,city.crosswalks||[]);
 const homes=entryRoads(city,catalog,roads,now);
 if(!homes.length)return {routes:[],population};
 const venues=activityVenues(city,catalog,roads,now),reservations=new Map(),routes=[];
 for(let i=0;i<count;i++){
  const origin=homes[i%homes.length],role=ROLES[i%ROLES.length];
  const start=origin.access[hash(`${origin.uid}:${i}`)%origin.access.length];
  // Limit simultaneous attraction demand; one bench is not a seat for 12 NPCs.
  const ranked=venues.filter(venue=>(reservations.get(venue.uid)||0)<(venue.activity==='bench'?1:venue.activity==='cafe'?3:2))
   .sort((a,b)=>{
    const preference=venue=>(venue.activity==='play'&&role==='child')||(venue.activity==='bench'&&role==='senior')||(venue.activity==='cafe'&&role==='worker')?0:1;
    return preference(a)-preference(b)||hash(`${a.uid}:${i}:venue`)-hash(`${b.uid}:${i}:venue`)||a.uid.localeCompare(b.uid);
   });
  const activityRoute=visitingRoute(start,ranked,neighbors,i,role);
  if(activityRoute){
   for(const stop of activityRoute.stops)reservations.set(stop.uid,(reservations.get(stop.uid)||0)+1);
  }
  const track=activityRoute?.track||roamingTrack(start,neighbors,i,new Set((city.crosswalks||[]).map(c=>c.id)));
  routes.push({id:`citizen-${i}`,variant:i%OUTFITS.length,role,track,
   offset:hash(`${i}:${origin.uid}:phase`)%(activityRoute?.duration||8500),
   ...(activityRoute?{stops:activityRoute.stops,timed:activityRoute.timed,duration:activityRoute.duration}:{})});
 }
 return {routes,population};
}
export function sampleCitizenScene(scene,now=Date.now()){
 if(!scene?.routes?.length)return [];
 return scene.routes.map(citizen=>{
  if(citizen.timed){
   let elapsed=(((now+citizen.offset)%citizen.duration)+citizen.duration)%citizen.duration;
   let segment=citizen.timed[citizen.timed.length-1];
   for(const entry of citizen.timed){if(elapsed<entry.duration){segment=entry;break;}elapsed-=entry.duration;}
   // Keep cafe visitors visible at their existing route anchor, not hidden.
   const t=Math.min(1,elapsed/segment.duration),a=segment.from,b=segment.to;
   const walking=segment.stage!=='dwell'&&(a.x!==b.x||a.y!==b.y);
   const action=segment.stage==='dwell'?(segment.activity==='cafe'?'coffee':segment.activity):
    (segment.stage==='return'&&segment.activity==='cafe'?'coffee':null);
   return {id:citizen.id,index:citizen.variant,role:citizen.role,action,
    x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
    dx:b.x-a.x,dy:b.y-a.y,walking,venueUid:segment.uid||null,
    stepPhase:walking?Math.sin(elapsed/STEP_MS*Math.PI*4):0};
  }
  const track=citizen.track;if(track.length<2)return null;
  const phase=((now+citizen.offset)/STEP_MS)%(track.length-1),step=Math.floor(phase);
  const from=track[step],to=track[step+1],walking=from.id!==to.id,t=walking?(phase-step):0;
  return {id:citizen.id,index:citizen.variant,role:citizen.role,
   x:from.x+.5+(to.x-from.x)*t,y:from.y+.5+(to.y-from.y)*t,
   dx:to.x-from.x,dy:to.y-from.y,walking,
   stepPhase:walking?Math.sin(phase*Math.PI*4):0};
 }).filter(Boolean);
}
function oval(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function gradient(ctx,x1,y1,x2,y2,stops){const g=ctx.createLinearGradient(x1,y1,x2,y2);for(const [pos,color] of stops)g.addColorStop(pos,color);return g;}

// Shaded miniature humans with outfits, hair, expressions and walk cycles.
// They sit in the same 2.5D perspective as 72x36px road tiles.
// Adults, children and elders share one compact renderer but have genuinely
// different silhouettes and gestures. Everything is vector Canvas; no downloads.
export function drawCitizen(ctx,point,x,y,now=Date.now()){
 const style=OUTFITS[point.index%OUTFITS.length],role=point.role||'resident';
 const seated=point.action==='bench',playing=point.action==='play'&&role==='child';
 const cup=point.action==='coffee',admiring=point.action==='fountain'||point.action==='park';
 const stride=point.walking?point.stepPhase:0;
 const pulse=Math.sin((now+point.index*113)/340);
 const bounce=playing?Math.max(0,pulse)*3:point.walking?Math.abs(stride)*.8:Math.sin((now+point.index*120)/580)*.35;
 const turnedAway=point.dx+point.dy<0;
 ctx.save();ctx.translate(x,y);
 const size=role==='child'?.75:role==='senior'?.91:role==='student'?.94:1;
 ctx.scale(size,size);
 oval(ctx,0,1,9,3.7,'rgba(63,104,78,.22)');
 // Sit on the real bench footprint; shorten body and extend legs at the front.
 ctx.translate(0,(seated?6:0)-bounce);
 for(const sign of [-1,1]){
  const step=sign*stride*2.2;
  if(seated){
   rounded(ctx,sign*3.2-2,-7,4.3,6,2,style.shade);
   oval(ctx,sign*6.2,-1,3.5,1.85,style.shoes);
  }else{
   rounded(ctx,sign*3.15-2,-6+step,4.2,7,2,style.shade);
   oval(ctx,sign*3.4,-1.1+step,3.6,1.9,style.shoes);
   oval(ctx,sign*3.2-.6,-2+step,1.2,.55,'rgba(255,255,255,.65)');
  }
 }
 if(role==='student'||role==='visitor'){
  rounded(ctx,-8.9,-24,5.6,12,2.5,role==='student'?'#ecb776':'#c7b1d4');
  oval(ctx,-7,-21,2,1.7,'#fff2d6');
 }
 for(const sign of [-1,1]){
  ctx.save();ctx.translate(sign*7.3,-17);
  ctx.rotate(sign*.11+stride*sign*.17+(playing?sign*.85:0));
  rounded(ctx,sign===-1?-3:0,-2,3.2,10,2,style.dress);
  oval(ctx,sign===-1?-1.6:1.7,8.5,2.05,2.25,style.skin);
  ctx.restore();
 }
 const cloth=gradient(ctx,-6,-23,7,-8,[[0,style.accent],[.2,style.dress],[1,style.shade]]);
 ctx.beginPath();ctx.moveTo(-5.5,-23);ctx.quadraticCurveTo(0,-25,5.5,-23);
 ctx.lineTo(7,-10);ctx.quadraticCurveTo(0,-7,-7,-10);ctx.closePath();
 ctx.fillStyle=cloth;ctx.fill();
 if(role==='worker'){
  rounded(ctx,-4.1,-20,8.2,10,2,'#fff1df');
  oval(ctx,0,-15,2,1.5,'#e79bb4');
 }
 if(role==='child'){
  rounded(ctx,-5.4,-22,10.8,3,1.5,style.accent);
  rounded(ctx,-4,-15,8,4.2,1.5,style.shade);
 }
 if(seated)oval(ctx,0,-9,5.3,2.3,'rgba(247,202,194,.5)');
 else oval(ctx,0,-9,4.6,1.4,'rgba(255,233,220,.46)');
 rounded(ctx,-2.4,-27,4.8,5,2,style.skin);
 oval(ctx,0,-31.7,9.9,10.1,'rgba(105,70,67,.14)');
 const face=gradient(ctx,-6,-40,7,-22,[[0,'#fff9e6'],[.31,style.skin],[1,'#efbcaa']]);
 oval(ctx,0,-31.7,8.2,9.4,face);
 oval(ctx,-6.7,-31,2,3.3,style.skin);oval(ctx,6.7,-31,2,3.3,style.skin);
 oval(ctx,0,-39,8.7,4.4,style.hair);oval(ctx,-6,-35.9,3.2,5,style.hair);
 if(turnedAway){
  oval(ctx,3,-34,4.7,6.1,style.hair);
  oval(ctx,-2,-40,3.6,2,'rgba(255,255,255,.1)');
 }else{
  oval(ctx,-3.5,-39,4.9,2.5,style.hair);
  oval(ctx,-3.15,-32,.98,1.33,'#553e42');oval(ctx,3.15,-32,.98,1.33,'#553e42');
  oval(ctx,-3.4,-32.6,.32,.45,'#fff');oval(ctx,2.9,-32.6,.32,.45,'#fff');
  oval(ctx,-4.4,-28.8,1.65,.8,'rgba(232,140,151,.52)');
  oval(ctx,4.4,-28.8,1.65,.8,'rgba(232,140,151,.52)');
  ctx.beginPath();ctx.arc(0,-29.2,2.2,0,Math.PI);
  ctx.strokeStyle='#b77478';ctx.lineWidth=.75;ctx.stroke();
  if(role==='senior'){
   ctx.beginPath();ctx.arc(-3.2,-32,2.9,0,Math.PI*2);
   ctx.arc(3.2,-32,2.9,0,Math.PI*2);
   ctx.strokeStyle='#ae8f6b';ctx.lineWidth=.7;ctx.stroke();
   rounded(ctx,-.9,-32.3,1.8,.65,.3,'#ae8f6b');
  }
 }
 if(role==='senior'){
  oval(ctx,5.4,-40.5,4.4,4.5,'#d1bbb1');
  oval(ctx,6.4,-42,2.4,2,'#f2ded2');
  rounded(ctx,10,-17,1.4,20,.7,'#bc9469');
  oval(ctx,10.7,2,3,1.7,'#bc9469');
 }else if(role==='child'){
  oval(ctx,-4.2,-39.6,3,2.2,style.hair);oval(ctx,5.9,-39.7,3.2,2.1,style.hair);
  oval(ctx,7,-40,2.5,1.7,'#f6b4bf');
 }else if(point.index%OUTFITS.length===0||point.index%OUTFITS.length===4){
  oval(ctx,5,-39.6,2.8,1.8,'#e98cae');oval(ctx,8.6,-40,2.8,1.8,'#e98cae');
  oval(ctx,6.8,-39.7,1.1,1.2,'#fff7d8');
 }else if(point.index%OUTFITS.length===3){
  rounded(ctx,-8,-40,16,3,1.5,'#fff4dd');
  oval(ctx,0,-43.4,6.4,2.7,'#fff4dd');
 }else if(role==='student'){
  rounded(ctx,-8.3,-41.5,16.6,2.7,1.2,'#fff4d3');
  oval(ctx,0,-42.5,5.5,2,'#eab6a5');
 }
 if(cup){
  rounded(ctx,8.2,-14,6.2,6.8,1.2,'#fff6e3');
  rounded(ctx,9.5,-16,3.8,2,1,'#b9826b');
  ctx.beginPath();ctx.arc(14,-10.5,2.1,-Math.PI/2,Math.PI/2);
  ctx.strokeStyle='#fff6e3';ctx.lineWidth=1.5;ctx.stroke();
 }
 if(playing){
  oval(ctx,13+Math.sin(now/430)*3,3-Math.abs(Math.sin(now/270))*11,4.4,4.4,'#f9d78c');
  oval(ctx,14+Math.sin(now/430)*3,2-Math.abs(Math.sin(now/270))*11,1.2,1.7,'#fff8df');
 }
 if(admiring&&pulse>.65){
  oval(ctx,10,-43,1.5,2.6,'#fff3ce');
  oval(ctx,13,-47,1,1.5,'#f0c29c');
 }
 ctx.restore();
}
