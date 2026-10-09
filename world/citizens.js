// Tiny premium 2.5D citizens for Мир Зеффи. Purely visual, no persistence,
// Telegram identity, Worker requests, or wallet operations happen here.
import { connectedRoads, isConstructing, isObjectConnected, dims, keyOf, visibleCitizenCount } from './engine.js';

const STEP_MS = 1470;
const MAX_ROUTE_STEPS = 32;
const DIRECTIONS = [[1,0],[0,1],[-1,0],[0,-1]];
const OUTFITS = Object.freeze([
  {dress:'#e99cbb',shade:'#bd648a',accent:'#fff0d4',hair:'#895666',shoes:'#9c6d73',skin:'#f9dbc8'},
  {dress:'#9fc8b5',shade:'#6b9d8e',accent:'#fff0ca',hair:'#6b574c',shoes:'#785d68',skin:'#f6d6bb'},
  {dress:'#c1addc',shade:'#9078b2',accent:'#ffe7b7',hair:'#ae775a',shoes:'#7b667e',skin:'#ffe4cd'},
  {dress:'#f0c18d',shade:'#c78e65',accent:'#fff8e7',hair:'#635162',shoes:'#a06c67',skin:'#f5cbaa'},
  {dress:'#e6abb1',shade:'#b87990',accent:'#e2f2de',hair:'#b07a4b',shoes:'#83616b',skin:'#fbe3ca'},
  {dress:'#9cb9d7',shade:'#6f91b6',accent:'#fff3d0',hair:'#745b57',shoes:'#656d87',skin:'#f3cfb7'}
]);
function hash(input){let seed=2166136261;for(const c of String(input))seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;return seed>>>0;}
function tileIdToPoint(id){const [x,y]=id.split(',').map(Number);return {id,x,y};}
function entryRoads(city,catalog,roadSet,now){
 const entries=[];
 for(const item of city.objects){
  const def=catalog[item.kind];
  if(item.stored||!def||!['homes','shops'].includes(def.category)||isConstructing(item,now))continue;
  if(!isObjectConnected(item,city,catalog,roadSet,now))continue;
  const {w,h}=dims(def,item.rotation||0),adjacent=[];
  for(let x=item.x;x<item.x+w;x++)adjacent.push(keyOf(x,item.y-1),keyOf(x,item.y+h));
  for(let y=item.y;y<item.y+h;y++)adjacent.push(keyOf(item.x-1,y),keyOf(item.x+w,y));
  const access=[...new Set(adjacent)].filter(id=>roadSet.has(id)).sort();
  if(access.length)entries.push({uid:item.uid,access});
 }
 return entries.sort((a,b)=>String(a.uid).localeCompare(String(b.uid)));
}
// Routes change only when the authoritative city snapshot changes. Every
// segment stays on a connected road. Mirroring makes loops seamless.
export function buildCitizenScene(city,catalog,population,now=Date.now()){
 const count=visibleCitizenCount(population);
 if(!count)return {routes:[],population};
 const roads=connectedRoads(city);
 if(!roads.size)return {routes:[],population};
 const roadIds=[...roads].sort();
 const neighbors=new Map(roadIds.map(id=>{const {x,y}=tileIdToPoint(id);return [id,DIRECTIONS.map(([dx,dy])=>keyOf(x+dx,y+dy)).filter(other=>roads.has(other))];}));
 const homes=entryRoads(city,catalog,roads,now);
 if(!homes.length)return {routes:[],population};
 const routes=[];
 for(let i=0;i<count;i++){
  const origin=homes[i%homes.length];
  const start=origin.access[hash(`${origin.uid}:${i}`)%origin.access.length];
  const path=[start];let previous='',cursor=start;
  for(let step=0;step<MAX_ROUTE_STEPS;step++){
   if(step>0&&step%7===0){path.push(cursor);continue;}
   const adjacent=neighbors.get(cursor)||[];
   if(!adjacent.length){path.push(cursor);continue;}
   const forward=adjacent.filter(id=>id!==previous);
   const choices=forward.length?forward:adjacent;
   const next=choices[hash(`${i}:${cursor}:${step}`)%choices.length];
   path.push(next);previous=cursor;cursor=next;
  }
  const track=path.concat(path.slice(0,-1).reverse()).map(tileIdToPoint);
  routes.push({id:`citizen-${i}`,variant:i%OUTFITS.length,track,offset:hash(`${i}:${origin.uid}:phase`)%8500});
 }
 return {routes,population};
}
export function sampleCitizenScene(scene,now=Date.now()){
 if(!scene?.routes?.length)return [];
 return scene.routes.map(citizen=>{
  const track=citizen.track;if(track.length<2)return null;
  const phase=((now+citizen.offset)/STEP_MS)%(track.length-1),step=Math.floor(phase);
  const from=track[step],to=track[step+1];
  const walking=from.id!==to.id,t=walking?(phase-step):0;
  return {id:citizen.id,index:citizen.variant,x:from.x+.5+(to.x-from.x)*t,
   y:from.y+.5+(to.y-from.y)*t,dx:to.x-from.x,dy:to.y-from.y,walking,
   stepPhase:walking?Math.sin(phase*Math.PI*4):0};
 }).filter(Boolean);
}
function oval(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function gradient(ctx,x1,y1,x2,y2,stops){const g=ctx.createLinearGradient(x1,y1,x2,y2);for(const [pos,color] of stops)g.addColorStop(pos,color);return g;}

// Shaded miniature humans with outfits, hair, expressions and walk cycles.
// They sit in the same 2.5D perspective as 72x36px road tiles.
export function drawCitizen(ctx,point,x,y,now=Date.now()){
 const style=OUTFITS[point.index%OUTFITS.length],stride=point.walking?point.stepPhase:0;
 const bounce=point.walking?Math.abs(stride)*.8:Math.sin((now+point.index*120)/580)*.35;
 const turnedAway=point.dx+point.dy<0;
 ctx.save();ctx.translate(x,y);
 oval(ctx,0,1,9,3.7,'rgba(63,104,78,.22)');
 ctx.translate(0,-bounce);
 for(const sign of [-1,1]){
  const step=sign*stride*2.2;
  rounded(ctx,sign*3.15-2,-6+step,4.2,7,2,style.shade);
  oval(ctx,sign*3.4,-1.1+step,3.6,1.9,style.shoes);
  oval(ctx,sign*3.2-.6,-2+step,1.2,.55,'rgba(255,255,255,.65)');
 }
 for(const sign of [-1,1]){
  ctx.save();ctx.translate(sign*7.3,-17);ctx.rotate(sign*.11+stride*sign*.17);
  rounded(ctx,sign===-1?-3:0,-2,3.2,10,2,style.dress);
  oval(ctx,sign===-1?-1.6:1.7,8.5,2.05,2.25,style.skin);
  ctx.restore();
 }
 const cloth=gradient(ctx,-6,-23,7,-8,[[0,style.accent],[.2,style.dress],[1,style.shade]]);
 ctx.beginPath();ctx.moveTo(-5.5,-23);ctx.quadraticCurveTo(0,-25,5.5,-23);
 ctx.lineTo(7,-10);ctx.quadraticCurveTo(0,-7,-7,-10);ctx.closePath();
 ctx.fillStyle=cloth;ctx.fill();
 oval(ctx,0,-16,2.2,2.4,'rgba(255,247,223,.9)');
 oval(ctx,0,-9,4.6,1.4,'rgba(255,233,220,.46)');
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
 }
 if(point.index%OUTFITS.length===0||point.index%OUTFITS.length===4){
  oval(ctx,5,-39.6,2.8,1.8,'#e98cae');oval(ctx,8.6,-40,2.8,1.8,'#e98cae');
  oval(ctx,6.8,-39.7,1.1,1.2,'#fff7d8');
 }else if(point.index%OUTFITS.length===3){
  rounded(ctx,-8,-40,16,3,1.5,'#fff4dd');
  oval(ctx,0,-43.4,6.4,2.7,'#fff4dd');
 }
 ctx.restore();
}
