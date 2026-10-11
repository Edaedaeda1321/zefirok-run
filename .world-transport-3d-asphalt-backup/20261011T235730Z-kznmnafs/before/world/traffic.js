// Light-weight, client-only public transit. Stations must be completed and
// reachable through the walkable road graph. Never charges money or saves routes.
import { connectedRoads, isConstructing, isObjectConnected } from './engine.js';
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
 const roads=walkableCitizenRoads(city,catalog,connectedRoads(city));
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
function circle(ctx,x,y,rx,ry,color){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
}
// Tiny isometric minibus, in world-space Canvas units. Direction is derived
// from the next/previous actual road cell, never a visual teleport.
export function drawBus(ctx,bus,x,y){
 const dx=bus.dx||1,dy=bus.dy||0;
 const a=(dx-dy)*36,b=(dx+dy)*18,m=Math.hypot(a,b)||1;
 const u={x:a/m,y:b/m},v={x:-u.y,y:u.x};
 const along=(t,s,h=0)=>({x:u.x*t+v.x*s,y:u.y*t+v.y*s-h});
 const body=bus.index%2===0?'#e99fbe':'#a6d2bd';
 const shade=bus.index%2===0?'#ba7096':'#6faba1';
 const roof=bus.index%2===0?'#fff3e3':'#eaffed';
 ctx.save();ctx.translate(x,y);
 // A small lateral lane offset keeps buses and pedestrians legible.
 ctx.translate(v.x*4,v.y*4);
 ctx.scale(1.10,1.10);
 circle(ctx,0,2,18,5,'rgba(51,83,67,.25)');
 const topBack=along(-17,-9,18),topFar=along(-17,9,18),topFrontFar=along(17,9,18),topFront=along(17,-9,18);
 const lowerBack=along(-18,-10,3),lowerFront=along(18,-10,3),lowerFar=along(18,10,3),lowerBackFar=along(-18,10,3);
 polygon(ctx,[lowerBack,lowerFront,topFront,topBack],shade);
 polygon(ctx,[lowerFront,lowerFar,topFrontFar,topFront],body);
 polygon(ctx,[lowerFar,lowerBackFar,topFar,topFrontFar],shade);
 polygon(ctx,[topBack,topFront,topFrontFar,topFar],roof);
 // Continuous glazed windows: soft aqua, separated with slim cream pillars.
 polygon(ctx,[along(-13,-10,16),along(12,-10,16),along(12,-10,9),along(-13,-10,9)],'#8dcbd0');
 polygon(ctx,[along(-13,10,16),along(12,10,16),along(12,10,9),along(-13,10,9)],'#c3e6e1');
 for(const t of [-3,7]){
  polygon(ctx,[along(t,-10,16),along(t+1.7,-10,16),along(t+1.7,-10,8.7),along(t,-10,8.7)],roof);
  polygon(ctx,[along(t,10,16),along(t+1.7,10,16),along(t+1.7,10,8.7),along(t,10,8.7)],roof);
 }
 // Gold trim, friendly headlamps and wheels, including the opposite side.
 polygon(ctx,[along(-18,-10,6),along(18,-10,6),along(18,-10,4),along(-18,-10,4)],'#fff0c8');
 for(const t of [-11,11]){
  let wheel=along(t,-10,1);
  circle(ctx,wheel.x,wheel.y,4.2,3.6,'#596471');circle(ctx,wheel.x,wheel.y,1.6,1.6,'#ffefce');
 }
 for(const s of [-6,6]){
  const light=along(18,s,8);circle(ctx,light.x,light.y,2.6,1.9,'#fff7c0');
 }
 const emblem=along(17,-4,13);circle(ctx,emblem.x,emblem.y,2.2,2.2,'#fff6e7');
 const sign=along(0,-10,12);ctx.font='bold 6px sans-serif';ctx.fillStyle='#fff9ed';ctx.textAlign='center';ctx.fillText('Z',sign.x,sign.y);
 ctx.restore();
}
