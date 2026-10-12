// Light-weight, client-only public transit. Stations must be completed and
// reachable through the walkable road graph. Never charges money or saves routes.
import { connectedRoads, isConstructing, isObjectConnected, dims, keyOf } from './engine.js';
import { adjacentRoadAccess, walkableCitizenRoads, roadNeighborMap, shortestRoadPath } from './citizens.js';

import { drawBusModel, preloadBusArt, busArtStatus } from './bus-art.js';
export { preloadBusArt, busArtStatus };

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
 const base=Array.isArray(city.busRoads)?new Set(city.busRoads):walkableCitizenRoads(city,catalog,connectedRoads(city));
 if(!Array.isArray(city.busRoads))return base;
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
 for(const route of routes)route.laneOffset=Array.isArray(city.busRoads)?.24:0;
 return {routes};
}
// Pure sampling: one heading and one anchor per vehicle, including the loop seam.
export function sampleBusScene(scene,now=Date.now()){
 if(!scene?.routes?.length)return [];
 return scene.routes.map(bus=>{
  let elapsed=(((now+bus.offset)%bus.duration)+bus.duration)%bus.duration,index=0;
  const segments=bus.segments;
  for(;index<segments.length-1&&elapsed>=segments[index].duration;index++)elapsed-=segments[index].duration;
  const segment=segments[index];
  const drivingAt=(at,delta)=>{for(let k=0;k<segments.length;k++){at=(at+delta+segments.length)%segments.length;if(!segments[at].stopped)return segments[at];}return null;};
  const direction=s=>s?{dx:s.to.x-s.from.x,dy:s.to.y-s.from.y}:{dx:1,dy:0};
  const prev=direction(drivingAt(index,-1)),travel=segment.stopped?prev:direction(segment),next=direction(drivingAt(index,1));
  const t=segment.stopped?0:Math.min(1,elapsed/segment.duration);
  const lane=bus.laneOffset||0,norm=d=>({x:-d.dy*lane,y:d.dx*lane});
  const join=(a,b)=>({x:Math.max(-lane,Math.min(lane,(-a.dy-b.dy)*lane)),y:Math.max(-lane,Math.min(lane,(a.dx+b.dx)*lane))});
  const before=segments[(index-1+segments.length)%segments.length],after=segments[(index+1)%segments.length];
  const own=norm(travel),start=segment.stopped?own:before.stopped?norm(prev):join(prev,travel),end=after.stopped?own:join(travel,next);
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  let off={...own};
  if(t<.25){const q=smooth(t/.25);off={x:start.x+(own.x-start.x)*q,y:start.y+(own.y-start.y)*q};}
  if(t>.75){const q=smooth((t-.75)/.25);off={x:own.x+(end.x-own.x)*q,y:own.y+(end.y-own.y)*q};}
  const angle=d=>Math.atan2(d.dy,d.dx),blend=(a,b,f)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*f;
  let heading=angle(travel);
  if(!segment.stopped&&t<.22)heading=blend(angle(prev),heading,before.stopped?smooth(t/.22):.5+.5*smooth(t/.22));
  if(!segment.stopped&&!after.stopped&&t>.78)heading=blend(heading,angle(next),.5*smooth((t-.78)/.22));
  return {id:bus.id,index:bus.variant,x:segment.from.x+(segment.to.x-segment.from.x)*t+off.x,
   y:segment.from.y+(segment.to.y-segment.from.y)*t+off.y,dx:travel.dx,dy:travel.dy,heading,
   stopped:segment.stopped,stationUid:segment.stationUid||null};
 });
}
export function drawBus(ctx,bus,x,y){return drawBusModel(ctx,bus,x,y);}
