// Light-weight, client-only public transit. Stations must be completed and
// reachable through the walkable road graph. Never charges money or saves routes.
import { connectedRoads, isConstructing, isObjectConnected, dims, keyOf } from './engine.js';
import { adjacentRoadAccess, walkableCitizenRoads, roadNeighborMap, shortestRoadPath } from './citizens.js';

const MAX_BUSES = 2;
const DRIVE_MS = 1050;
const STATION_MS = 3000;
function hash(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n>>>0;}
function point(id){const [x,y]=id.split(',').map(Number);return {id,x,y};}
function roadCenter(id){const p=point(id);return {x:p.x+.5,y:p.y+.5};}
function stopsByRoadComponent(stops,neighbors){
 const components=[],belong=new Map();
 for(const id of neighbors.keys()){
  if(belong.has(id))continue;
  const component=components.length,queue=[id];belong.set(id,component);
  for(let i=0;i<queue.length;i++)for(const next of neighbors.get(queue[i])||[]){
   if(!belong.has(next)){belong.set(next,component);queue.push(next);}
  }
  components.push([]);
 }
 for(const stop of stops){
  const component=belong.get(stop.access[0]);
  if(component!==undefined)components[component].push({...stop,access:stop.access.filter(id=>belong.get(id)===component)});
 }
 return components.filter(group=>group.length>=2).sort((a,b)=>b.length-a.length||a[0].uid.localeCompare(b[0].uid));
}
function closestStopAccess(neighbors,cursor,stop){
 let result=null;
 for(const to of stop.access){
  const path=shortestRoadPath(neighbors,cursor,to);
  if(path&&(!result||path.length<result.path.length))result={to,path};
 }
 return result;
}

function transitRoads(city,catalog){
 const base=(Array.isArray(city.busRoads)&&city.busRoads.length)?new Set(city.busRoads):walkableCitizenRoads(city,catalog,connectedRoads(city));
 if(!(Array.isArray(city.busRoads)&&city.busRoads.length))return base;
 for(const item of city.objects){
  if(item.stored)continue;
  const def=catalog[item.kind];
  if(!def || (def.layer==='surface'&&!def.blockingSurface))continue;
  const {w,h}=dims(def,item.rotation||0);
  for(let x=item.x;x<item.x+w;x++)for(let y=item.y;y<item.y+h;y++)base.delete(keyOf(x,y));
 }
 return base;
}
function makeBusRoute(group,neighbors,index){
 const start=group[index%group.length];
 const origin=start.access[hash(start.uid)%start.access.length];
 const remaining=group.filter(stop=>stop.uid!==start.uid),visits=[];
 let cursor=origin;
 while(remaining.length){
  const options=remaining.map(stop=>({...closestStopAccess(neighbors,cursor,stop),stop}))
   .filter(option=>option.path);
  if(!options.length)break;
  options.sort((a,b)=>a.path.length-b.path.length||a.stop.uid.localeCompare(b.stop.uid));
  const next=options[0];
  visits.push(next);cursor=next.to;
  remaining.splice(remaining.findIndex(stop=>stop.uid===next.stop.uid),1);
 }
 if(!visits.length)return null;
 const closing=shortestRoadPath(neighbors,cursor,origin);
 if(!closing)return null;
 const track=[point(origin)],segments=[],stopUids=new Set([start.uid]);
 let from=origin;
 function dwell(uid){const here=roadCenter(from);segments.push({from:here,to:here,duration:STATION_MS,stationUid:uid,stopped:true});}
 function addPath(path){
  for(const to of path.slice(1)){
   track.push(point(to));
   segments.push({from:roadCenter(from),to:roadCenter(to),duration:DRIVE_MS,stopped:false});
   from=to;
  }
 }
 dwell(start.uid);
 for(const visit of visits){addPath(visit.path);stopUids.add(visit.stop.uid);dwell(visit.stop.uid);}
 addPath(closing);
 if(track.length<3||stopUids.size<2)return null;
 const duration=segments.reduce((sum,segment)=>sum+segment.duration,0);
 return {id:`bus-${index}`,variant:index%2,track,stops:[...stopUids],segments,duration,
  offset:hash(`${start.uid}:bus:${index}`)%duration};
}
export function buildBusScene(city,catalog,now=Date.now()){
 const roads=transitRoads(city,catalog);
 if(roads.size<2)return {routes:[]};
 const neighbors=roadNeighborMap(roads),stops=[];
 for(const item of city.objects){
  if(item.stored||!['bus-terminal','bus-stop'].includes(item.kind)||isConstructing(item,now))continue;
  const def=catalog[item.kind];if(!def||!isObjectConnected(item,city,catalog,roads,now))continue;
  const access=adjacentRoadAccess(item,def,roads);
  if(access.length)stops.push({uid:item.uid,access});
 }
 if(stops.length<2)return {routes:[]};
 stops.sort((a,b)=>a.uid.localeCompare(b.uid));
 const components=stopsByRoadComponent(stops,neighbors),routes=[];
 for(const group of components){
  if(routes.length>=MAX_BUSES)break;
  const first=makeBusRoute(group,neighbors,routes.length);
  if(first)routes.push(first);
  // A second vehicle is useful only on a larger shared line.
  if(routes.length===1&&group.length>=4){
   const second=makeBusRoute(group,neighbors,1);
   if(second){second.offset=(second.offset+Math.floor(second.duration/2))%second.duration;routes.push(second);}
  }
 }
 return {routes};
}
export function sampleBusScene(scene,now=Date.now()){
 if(!scene?.routes?.length)return [];
 return scene.routes.map(bus=>{
  let elapsed=(((now+bus.offset)%bus.duration)+bus.duration)%bus.duration;
  let segment=bus.segments[bus.segments.length-1],previousDirection={dx:1,dy:0};
  for(const s of bus.segments){
   if(elapsed<s.duration){segment=s;break;}
   elapsed-=s.duration;
   if(!s.stopped)previousDirection={dx:s.to.x-s.from.x,dy:s.to.y-s.from.y};
  }
  const travel=segment.stopped?previousDirection:{dx:segment.to.x-segment.from.x,dy:segment.to.y-segment.from.y};
  const t=segment.stopped?0:elapsed/segment.duration;
  return {id:bus.id,index:bus.variant,x:segment.from.x+(segment.to.x-segment.from.x)*t,
   y:segment.from.y+(segment.to.y-segment.from.y)*t,dx:travel.dx,dy:travel.dy,
   stopped:segment.stopped,stationUid:segment.stationUid||null};
 });
}
function polygon(ctx,points,color){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function polygonStroke(ctx,points,fill,stroke,width=1){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
 ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke&&width>0){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
function circle(ctx,x,y,rx,ry,color){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
}
function line(ctx,a,b,color,width=1){
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
// Premium tiny shuttle bus for Zeffi World. The render stays lightweight, but
// now reads more like a real branded vehicle instead of a flat box.
export function drawBus(ctx,bus,x,y){
 const dx=bus.dx||1,dy=bus.dy||0;
 const a=(dx-dy)*36,b=(dx+dy)*18,m=Math.hypot(a,b)||1;
 const u={x:a/m,y:b/m},v={x:-u.y,y:u.x};
 const along=(t,s,h=0)=>({x:u.x*t+v.x*s,y:u.y*t+v.y*s-h});
 const palette=bus.index%2===0?{
  side:'#d97da4',body:'#f0a4c3',nose:'#f7bfd4',roof:'#fff7ef',roofTint:'#ffdfe9',
  stripe:'#ffe5a1',windowNear:'#8fd5dd',windowFar:'#cdeff1',windowFront:'#e8fbff',
  outline:'rgba(112,74,90,.28)',wheel:'#5f6874',hub:'#fff2d7',light:'#fff8cb',tail:'#ffd6d0',
  sign:'#8f5576',signText:'#fffaf0',accent:'#ffc86f',door:'#fff7ee'
 }:{
  side:'#7eb8aa',body:'#a8d8c8',nose:'#bfe6da',roof:'#f5fff7',roofTint:'#dff4e6',
  stripe:'#ffe5a1',windowNear:'#86cfd8',windowFar:'#cbefed',windowFront:'#eefcff',
  outline:'rgba(74,109,100,.26)',wheel:'#5f6874',hub:'#fff2d7',light:'#fff8cb',tail:'#ffd6d0',
  sign:'#56806d',signText:'#fffaf0',accent:'#ffd27c',door:'#f8fff8'
 };
 ctx.save();ctx.translate(x,y);
 // Small lane offset keeps the vehicle separated from pedestrians.
 ctx.translate(v.x*4.5,v.y*4.5);
 ctx.scale(1.18,1.18);
 circle(ctx,1,3.2,21,6.4,'rgba(67,78,73,.18)');
 const topBack=along(-18,-9.5,18.5),topFar=along(-18,9.5,18.5),topFrontFar=along(18,9.5,18.5),topFront=along(18,-9.5,18.5);
 const roofBack=along(-15,-8,21),roofFar=along(-15,8,21),roofFrontFar=along(10,8,21),roofFront=along(10,-8,21);
 const lowerBack=along(-19,-10.5,3),lowerFront=along(19,-10.5,3),lowerFar=along(19,10.5,3),lowerBackFar=along(-19,10.5,3);
 // Main volume.
 polygonStroke(ctx,[lowerBack,lowerFront,topFront,topBack],palette.side,palette.outline,1.1);
 polygonStroke(ctx,[lowerFront,lowerFar,topFrontFar,topFront],palette.body,palette.outline,1.1);
 polygonStroke(ctx,[lowerFar,lowerBackFar,topFar,topFrontFar],palette.nose,palette.outline,1.1);
 polygonStroke(ctx,[topBack,topFront,topFrontFar,topFar],palette.roof,palette.outline,1.1);
 polygonStroke(ctx,[roofBack,roofFront,roofFrontFar,roofFar],palette.roofTint,'rgba(255,255,255,.5)',0.7);
 // Golden waist stripe around the body.
 polygon(ctx,[along(-18,-10.2,7.2),along(18,-10.2,7.2),along(18,-10.2,5.3),along(-18,-10.2,5.3)],palette.stripe);
 polygon(ctx,[along(18,-10.2,7.1),along(18,10.2,7.1),along(18,10.2,5.2),along(18,-10.2,5.2)],palette.stripe);
 // Window band and windshield.
 polygonStroke(ctx,[along(-13.5,-10.4,16.2),along(11,-10.4,16.2),along(11,-10.4,9.1),along(-13.5,-10.4,9.1)],palette.windowNear,'rgba(255,255,255,.45)',0.6);
 polygonStroke(ctx,[along(-13.5,10.4,16.2),along(11,10.4,16.2),along(11,10.4,9.1),along(-13.5,10.4,9.1)],palette.windowFar,'rgba(255,255,255,.42)',0.6);
 polygonStroke(ctx,[along(18,-7.5,15.4),along(18,7.5,15.4),along(18,7.5,9.3),along(18,-7.5,9.3)],palette.windowFront,'rgba(255,255,255,.55)',0.7);
 // Window separators.
 for(const t of [-6.5,-0.5,5.5]){
  line(ctx,along(t,-10.1,16),along(t,-10.1,9),palette.roof,1.2);
  line(ctx,along(t,10.1,16),along(t,10.1,9),palette.roof,1.2);
 }
 // Door and route sign.
 polygonStroke(ctx,[along(3.8,-10.45,15.6),along(9.5,-10.45,15.6),along(9.5,-10.45,5.1),along(3.8,-10.45,5.1)],palette.door,'rgba(255,255,255,.45)',0.7);
 polygonStroke(ctx,[along(-8.5,-10.5,18),along(1.5,-10.5,18),along(1.5,-10.5,13.2),along(-8.5,-10.5,13.2)],palette.sign,palette.outline,0.6);
 const sign=along(-3.5,-10.7,14.6);ctx.font='bold 5.7px sans-serif';ctx.fillStyle=palette.signText;ctx.textAlign='center';ctx.fillText('ЗЕФФИ',sign.x,sign.y);
 // Friendly front details.
 for(const s of [-4.6,4.6]){
  const light=along(18,s,8.2);circle(ctx,light.x,light.y,2.5,1.7,palette.light);
 }
 const emblem=along(17.6,-0.2,13.6);circle(ctx,emblem.x,emblem.y,2.1,2.1,palette.accent);
 const heart=along(17.7,-0.2,13.7);ctx.font='bold 5px sans-serif';ctx.fillStyle='#fffaf2';ctx.textAlign='center';ctx.fillText('❤',heart.x,heart.y+1.7);
 line(ctx,along(18,-8.2,7),along(18,8.2,7),'rgba(255,255,255,.22)',0.8);
 // Wheels and small far-side wheel hints.
 for(const t of [-11.5,11.8]){
  const near=along(t,-10.7,1.15),far=along(t,10.7,1.15);
  circle(ctx,far.x,far.y,3.5,2.8,'rgba(61,69,78,.45)');
  circle(ctx,near.x,near.y,4.4,3.7,palette.wheel);
  circle(ctx,near.x,near.y,1.55,1.55,palette.hub);
 }
 // Rear lights and roof sparkle.
 for(const s of [-5,5]){
  const tail=along(-18,s,8.2);circle(ctx,tail.x,tail.y,1.8,1.35,palette.tail);
 }
 const sparkle=along(-2,0,21.2);
 circle(ctx,sparkle.x,sparkle.y,1.8,1.2,'rgba(255,255,255,.42)');
 ctx.restore();
}
