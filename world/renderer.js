import { dims, keyOf, connectedRoads, isObjectConnected, checkPlacement, isConstructing, rotateLocalPoint, expansionCandidates, PARCEL_SIZE } from './engine.js';
import { drawSprite, drawCatalogSprite, catalogSpriteId, fallbackSpriteId, buildingAssetId, parkConstructionAssetId, roadMaskId } from './sprite-assets.js';
import { drawCitizen } from './citizens.js';

export const TILE_W = 72;
export const TILE_H = 36;
export const PROJECT_FOCUS = Object.freeze({ x: 11.5, y: 12 });
let objectRotation = null;
const P = (x, y) => {
  if(objectRotation){
    const r=objectRotation;
    const pos=rotateLocalPoint(x-r.x,y-r.y,r.w,r.h,r.rotation);
    x=r.x+pos.x;y=r.y+pos.y;
  }
  return {x:(x-y)*TILE_W/2,y:(x+y)*TILE_H/2};
};
const midpoint = (a, b, ratio = .5) => ({ x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio });
const offset = (point, dy) => ({ x: point.x, y: point.y + dy });
const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
const palettes = {
  rose: { roof: '#e08daa', roofShade: '#bb628a', left: '#fff0ee', right: '#f3cbd4', trim: '#eed5a5' },
  butter: { roof: '#e6ae73', roofShade: '#c48b62', left: '#ffefd2', right: '#f7d6ae', trim: '#fff9df' },
  lilac: { roof: '#bd9ccc', roofShade: '#987bb4', left: '#fff0fc', right: '#e8d9f1', trim: '#f0cf90' },
  coffee: { roof: '#c38780', roofShade: '#986b74', left: '#fceee2', right: '#eed1be', trim: '#ffdfa4' },
  mint: { roof: '#8ebbaa', roofShade: '#62a298', left: '#f4fff1', right: '#d7f0df', trim: '#ffead2' }
};
function hash(x, y, z=0) { const v = Math.sin(x * 127.1 + y * 311.7 + z * 43.37) * 43758.5453; return v - Math.floor(v); }
function polygon(ctx, points, fill, stroke='', line=1) {
  if (!points.length) return;
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke='', width=1) {
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function diamond(ctx,x,y,w=1,h=1,fill='',stroke='',width=1){polygon(ctx,[P(x,y),P(x+w,y),P(x+w,y+h),P(x,y+h)],fill,stroke,width);}
function branch(ctx,a,b,stroke,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
function roundRect(ctx,x,y,w,h,r,fill,stroke=''){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}

export function isoToScreen(x, y, canvasSize, camera) {
  const focus = P(PROJECT_FOCUS.x, PROJECT_FOCUS.y);
  const pt = P(x,y);
  return { x:(pt.x-focus.x)*camera.zoom+canvasSize.width/2+camera.x, y:(pt.y-focus.y)*camera.zoom+canvasSize.height/2+camera.y };
}
export function screenToTile(sx, sy, canvasSize, camera) {
  const focus=P(PROJECT_FOCUS.x,PROJECT_FOCUS.y);
  const dx=(sx - canvasSize.width/2 - camera.x)/camera.zoom + focus.x;
  const dy=(sy - canvasSize.height/2 - camera.y)/camera.zoom + focus.y;
  return { x:Math.floor(((dx/(TILE_W/2))+(dy/(TILE_H/2)))/2), y:Math.floor(((dy/(TILE_H/2))-(dx/(TILE_W/2)))/2) };
}

// This is a single continuous 2:1 isometric terrain, NOT 576 independent
// rounded soil cubes. The new pack is resampled into top-only WebP diamonds
// (all with the same 72x36 footprint and feathered matching grass edges).
// Only exposed outer boundaries receive the earth-wall extrusion below.
const NO_ROUND_GRASS = 'terrain_grass_clean_premium';
const TERRAIN_AMBIENT = Object.freeze([
 [0.795,NO_ROUND_GRASS],
 [0.875,'terrain_grass_floral_sparse_premium'],
 [0.917,'terrain_grass_stone_accent_premium'],
 [0.960,'terrain_grass_meadow_premium'],
 [0.975,'terrain_shrub_edge_premium'],
 [0.987,'terrain_flower_edge_premium'],
 [0.993,'terrain_path_sand_premium'],
 [0.997,'terrain_garden_soil_premium'],
 [1.000,'terrain_plaza_round_inlay_premium']
]);
export function groundTileSpriteId(x,y,owned,occupied=false){
 if(occupied)return NO_ROUND_GRASS;
 const chance=hash(x,y,71);
 for(const [threshold,id] of TERRAIN_AMBIENT)if(chance<threshold)return id;
 return NO_ROUND_GRASS;
}
// Procedural wall colors are sampled/selected to match the new pack's soil
// and mint-gold turf. Walls are only painted where the city has NO adjacent
// owned cell, so there are no raised 'cube' borders between neighbouring tiles.
function drawGroundEdge(ctx,a,b,color){
 const depth=12;
 polygon(ctx,[a,b,offset(b,depth),offset(a,depth)],color,'rgba(105,71,43,.32)',.45);
 branch(ctx,a,b,'#a1cb71',1.15);
 const a2=offset(a,depth-2),b2=offset(b,depth-2);
 branch(ctx,a2,b2,'rgba(234,184,116,.48)',.7);
}
function drawLandscape(ctx,city,catalog,viewport){
 const parcels=new Set(city.parcels||[]);
 const owned=(x,y)=>(x>=0&&y>=0&&x<city.size&&y<city.size)||parcels.has(keyOf(Math.floor(x/PARCEL_SIZE),Math.floor(y/PARCEL_SIZE)));
 // This is derived on demand, not a stored terrain replacement: moving a
 // house away restores the same natural deterministic decorative ground.
 const occupied=new Set(city.roads||[]);
 for(const item of city.objects){
  if(item.stored)continue;
  const def=catalog[item.kind];if(!def)continue;
  const size=dims(def,item.rotation||0);
  for(let dx=0;dx<size.w;dx++)for(let dy=0;dy<size.h;dy++)occupied.add(keyOf(item.x+dx,item.y+dy));
 }
 const tiles=[];
 for(let y=viewport.minY;y<=viewport.maxY;y++)for(let x=viewport.minX;x<=viewport.maxX;x++)if(owned(x,y))tiles.push({x,y});
 tiles.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
 // The common matte seals subpixel AA pinholes and guarantees identical
 // green at shared edges. All visible flora/textures are from the new pack.
 for(const {x,y} of tiles){
  diamond(ctx,x,y,1,1,'#a2cd69');
  const id=groundTileSpriteId(x,y,owned,occupied.has(keyOf(x,y)));
  drawSprite(ctx,id,P(x,y));
 }
 // Draw earth below only the city perimeter, including every acquired 4x4
 // parcel and inward notches. Back-facing slopes are naturally occluded.
 for(const {x,y} of tiles){
  const B=P(x+1,y),C=P(x+1,y+1),D=P(x,y+1);
  if(!owned(x+1,y))drawGroundEdge(ctx,B,C,'#ac7c4f');
  if(!owned(x,y+1))drawGroundEdge(ctx,D,C,'#946b43');
 }
}
function drawRoads(ctx, city, viewport){
 const roadSet=new Set(city.roads);
 for(const id of city.roads){
  const [x,y]=id.split(',').map(Number);
  if(x<viewport.minX-1||y<viewport.minY-1||x>viewport.maxX+1||y>viewport.maxY+1)continue;
  const maskId=roadMaskId(roadSet,x,y);
  // The provided special entrance was authored for NS (mask 05). Only choose
  // it if the starter road actually has that connectivity; no broken seams.
  const asset=city.lockedRoads.includes(id)&&maskId==='world_road_mask_05'?'world_road_entry_special':maskId;
  if(drawSprite(ctx,asset,P(x,y)))continue;
  const q=[P(x,y),P(x+1,y),P(x+1,y+1),P(x,y+1)];
  polygon(ctx,q,'#b9a996','#d6bfab',1.2);
  polygon(ctx,q.map(p=>({x:p.x,y:p.y-3})),'#ead8c9','#fff2dd',.9);
  const center=P(x+.5,y+.5);
  const adj=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of adj){
   if(!roadSet.has(keyOf(x+dx,y+dy)))continue;
   const toward=P(x+.5+dx*.5,y+.5+dy*.5);
   branch(ctx,{x:center.x,y:center.y-3},{x:toward.x,y:toward.y-3},'#faf3dd',1.7);
  }
  if(city.lockedRoads.includes(id))ellipse(ctx,center.x,center.y-3,2.3,2.3,'#d5ae65','#fff4d2',.5);
 }
}
function shadow(ctx,pts){const center=pts.reduce((p,q)=>({x:p.x+q.x/pts.length,y:p.y+q.y/pts.length}),{x:0,y:0});ellipse(ctx,center.x,center.y+8,Math.max(17,Math.abs(pts[1].x-pts[3].x)*.49),11,'rgba(75,112,79,.21)');}
function drawTree(ctx,x,y,size=1,variant=0){
  const p=P(x,y);
  ellipse(ctx,p.x+3,p.y+3,14*size,5*size,'rgba(80,120,74,.17)');
  branch(ctx,{x:p.x,y:p.y},{x:p.x,y:p.y-29*size},'#986d60',5*size);
  const colors=variant===1?['#f2beca','#e9a6ba','#f8d8df']:['#a8d5a0','#83c3a0','#c3df9f'];
  ellipse(ctx,p.x,p.y-39*size,17*size,17*size,colors[0]);
  ellipse(ctx,p.x-11*size,p.y-31*size,12*size,12*size,colors[1]);
  ellipse(ctx,p.x+10*size,p.y-32*size,12*size,13*size,colors[2]);
  ellipse(ctx,p.x-4*size,p.y-45*size,10*size,7*size,'rgba(255,255,255,.18)');
}
function drawFlowerbed(ctx,x,y,scale=1){
 const p=P(x,y);ellipse(ctx,p.x,p.y+1,17*scale,6*scale,'#6fa97d','#b9e3a7',1.2);
 const flowerColors=['#f5a9bd','#fbe7a5','#fff6fc','#db9cc4'];
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  const px=p.x+11*Math.cos(a)*scale,py=p.y+3.5*Math.sin(a)*scale-4*scale;
  ellipse(ctx,px,py,3.2*scale,3.2*scale,flowerColors[i%4]);
  ellipse(ctx,px+.3*scale,py,1*scale,1*scale,'#f6c25e');
 }
}
function drawLamp(ctx,x,y){const p=P(x,y);ellipse(ctx,p.x,p.y+2,6,3,'rgba(82,107,91,.18)');branch(ctx,{x:p.x,y:p.y},{x:p.x,y:p.y-41},'#b98a65',3);ellipse(ctx,p.x,p.y-43,6,6,'#fff6cf','#c39b60',1.5);ellipse(ctx,p.x,p.y-43,3,3,'#ffe7a1');branch(ctx,{x:p.x-5,y:p.y-38},{x:p.x+5,y:p.y-38},'#ba8b67',1.5)}
function drawBench(ctx,x,y,w,h){const c=P(x+w*.5,y+h*.5);ellipse(ctx,c.x,c.y+3,14,4,'rgba(84,116,92,.18)');branch(ctx,{x:c.x-11,y:c.y-1},{x:c.x+9,y:c.y-1},'#99696a',5);branch(ctx,{x:c.x-10,y:c.y-8},{x:c.x+10,y:c.y-8},'#bf7b73',5);branch(ctx,{x:c.x-8,y:c.y+1},{x:c.x-8,y:c.y+8},'#85686a',1.7);branch(ctx,{x:c.x+7,y:c.y+1},{x:c.x+7,y:c.y+8},'#85686a',1.7)}
function drawFountain(ctx,x,y,w,h){const c=P(x+w*.5,y+h*.5);ellipse(ctx,c.x,c.y+2,39,15,'#d8aeae','#fff4e7',2);ellipse(ctx,c.x,c.y-2,30,11,'#8ccecb','#f9f5e4',2);ellipse(ctx,c.x,c.y-12,13,7,'#effbfb','#93c6c4',2);branch(ctx,{x:c.x,y:c.y-12},{x:c.x,y:c.y-39},'#b5b8a2',5);ellipse(ctx,c.x,c.y-40,9,5,'#ecfbff','#b9c6c4',1);for(const a of [-1,1]){ctx.beginPath();ctx.moveTo(c.x,c.y-36);ctx.quadraticCurveTo(c.x+21*a,c.y-47,c.x+27*a,c.y-6);ctx.strokeStyle='rgba(184,244,255,.9)';ctx.lineWidth=2;ctx.stroke();}}
function drawPlayground(ctx,x,y,w,h){const c=P(x+w*.5,y+h*.5);ellipse(ctx,c.x,c.y,43,14,'#efd3bd','#fef2ce',2);branch(ctx,{x:c.x-22,y:c.y-17},{x:c.x-12,y:c.y-42},'#d69c77',4);branch(ctx,{x:c.x-12,y:c.y-42},{x:c.x-1,y:c.y-17},'#d69c77',4);branch(ctx,{x:c.x-22,y:c.y-37},{x:c.x-1,y:c.y-37},'#d69c77',2);branch(ctx,{x:c.x-17,y:c.y-35},{x:c.x-17,y:c.y-12},'#fff9dc',1.2);branch(ctx,{x:c.x-5,y:c.y-35},{x:c.x-5,y:c.y-12},'#fff9dc',1.2);roundRect(ctx,c.x-21,c.y-10,19,4,2,'#e591b7');branch(ctx,{x:c.x+8,y:c.y-8},{x:c.x+32,y:c.y-8},'#cb9b7a',5);branch(ctx,{x:c.x+19,y:c.y-8},{x:c.x+19,y:c.y+8},'#a88272',2);}
function drawGarden(ctx,x,y,w,h){diamond(ctx,x,y,w,h,'rgba(167,208,152,.45)','#b7dba2',1.4);const c=P(x+w*.5,y+h*.5);drawTree(ctx,c.x===0?x+1.4:x+.9,y+.9,.64,1);drawTree(ctx,x+2,y+1.7,.6,0);drawFlowerbed(ctx,x+1.3,y+2,.75);drawFlowerbed(ctx,x+2.2,y+.6,.63)}
function drawMonument(ctx,x,y,w,h){const c=P(x+w*.5,y+h*.5);ellipse(ctx,c.x,c.y+5,37,15,'#f4ddae','#d2ad84',1.5);polygon(ctx,[{x:c.x-16,y:c.y-2},{x:c.x+4,y:c.y-12},{x:c.x+22,y:c.y-2},{x:c.x+2,y:c.y+8}],'#fff4d6','#d7bc81',1);roundRect(ctx,c.x-11,c.y-43,23,36,3,'#f4cc88','#e9b06e');ellipse(ctx,c.x,c.y-47,13,13,'#fff3d2','#c99b58',2);ctx.fillStyle='#bd8c4c';ctx.font='19px sans-serif';ctx.textAlign='center';ctx.fillText('*',c.x,c.y-40)}
// Individually authored isometric silhouettes; deliberately not palette swaps.
function architectureBase(ctx,item,def,height,colors){
 const {w,h}=dims(def,item.rotation);
 const A=P(item.x,item.y),B=P(item.x+w,item.y),C=P(item.x+w,item.y+h),D=P(item.x,item.y+h);
 shadow(ctx,[A,B,C,D]);
 polygon(ctx,[offset(A,-5),offset(B,-5),offset(C,-5),offset(D,-5)],'#fffae8','#dbc6b4',1.2);
 polygon(ctx,[offset(B,-5),offset(C,-5),C,B],'#c7bca5');
 polygon(ctx,[offset(D,-5),offset(C,-5),C,D],'#eee0c6');
 const At=offset(A,-height),Bt=offset(B,-height),Ct=offset(C,-height),Dt=offset(D,-height);
 polygon(ctx,[Dt,Ct,C,D],colors.left,'#c6aeb0',1.1);
 polygon(ctx,[Bt,Ct,C,B],colors.right,'#c6aeb0',1.1);
 return {w,h,A,B,C,D,At,Bt,Ct,Dt,H:height,c:P(item.x+w*.5,item.y+h*.5)};
}
function roofRidge(ctx,g,col,col2,lift=18){
 const ridgeA=offset(midpoint(g.At,g.Bt),-lift),ridgeB=offset(midpoint(g.Dt,g.Ct),-lift);
 polygon(ctx,[g.At,ridgeA,ridgeB,g.Dt],col,'#ffead5',1.8);
 polygon(ctx,[ridgeA,g.Bt,g.Ct,ridgeB],col2,'#e1b9ba',1.4);
 branch(ctx,ridgeA,ridgeB,'#fff6ea',2.2);
 for(let i=1;i<=3;i++)branch(ctx,midpoint(g.At,ridgeA,i/4),midpoint(g.Dt,ridgeB,i/4),'rgba(255,255,255,.18)',.9);
 return {ridgeA,ridgeB};
}
function roofFlat(ctx,g,col,lip='#fbe9d5'){
 polygon(ctx,[offset(g.At,-7),offset(g.Bt,-7),offset(g.Ct,-7),offset(g.Dt,-7)],col,lip,1.7);
 branch(ctx,offset(g.Dt,-7),offset(g.Ct,-7),'#fff4e3',3.4);
 branch(ctx,offset(g.Bt,-7),offset(g.Ct,-7),'#fff4e3',3.4);
}
function door(ctx,p,h=22,color='#a66e7e',w=15){roundRect(ctx,p.x-w/2,p.y-h,w,h,4,color,'#f7ddc3');ellipse(ctx,p.x+w*.25,p.y-h*.5,1.7,1.7,'#fae1a3');}
function frontWindow(ctx,p,scale=1,tint='#a9dadd'){
 const w=13*scale,h=19*scale;
 polygon(ctx,[{x:p.x-w/2,y:p.y-h},{x:p.x+w/2,y:p.y-h-3*scale},{x:p.x+w/2,y:p.y-3*scale},{x:p.x-w/2,y:p.y}],tint,'#fff9ea',2*scale);
 branch(ctx,{x:p.x,y:p.y-h-1.5*scale},{x:p.x,y:p.y-1.5*scale},'rgba(255,255,255,.83)',1.2*scale);
 branch(ctx,{x:p.x-w/2,y:p.y-h*.45},{x:p.x+w/2,y:p.y-h*.55},'rgba(255,255,255,.77)',1*scale);
}
function wallWindow(ctx,g,face,t,ratio=.63,scale=1,color){
 const p=face==='left'?midpoint(g.Dt,g.Ct,t):midpoint(g.Bt,g.Ct,t);
 frontWindow(ctx,offset(p,g.H*ratio),scale,color);
 return p;
}
function banner(ctx,p,text,width=43,fill='#fff2de',stroke='#deb892',ink='#a45b72'){
 roundRect(ctx,p.x-width/2,p.y-11,width,19,6,fill,stroke);
 ctx.fillStyle=ink;ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(text,p.x,p.y+2);
}
function awning(ctx,p,w=49,flap=14){
 const top={x:p.x,y:p.y-6};
 polygon(ctx,[{x:top.x-w/2,y:top.y},{x:top.x+w/2,y:top.y-6},{x:top.x+w/2+5,y:top.y+flap},{x:top.x-w/2+5,y:top.y+flap+6}],'#fff5ed','#fff9e4',1.8);
 for(let i=0;i<5;i++){
  const x=top.x-w/2+i*w/5;
  polygon(ctx,[{x,y:top.y+i*-6/5},{x:x+w/10,y:top.y-3+(i*-6/5)},{x:x+w/10+5,y:top.y+flap+3},{x:x+5,y:top.y+flap+6}],'rgba(232,128,167,.84)');
 }
}
function drawCottage(ctx,item,def){
 const g=architectureBase(ctx,item,def,48,palettes.rose);
 roofRidge(ctx,g,'#e893ae','#b9698b',21);
 const chimney=midpoint(g.At,g.Bt,.33);roundRect(ctx,chimney.x-5,chimney.y-30,11,22,2,'#bd6c7f','#ffdfd9');
 const entrance=midpoint(g.Dt,g.Ct,.63);door(ctx,offset(entrance,45),20,'#ac6e81',14);
 wallWindow(ctx,g,'left',.20,.70,.86);
 wallWindow(ctx,g,'right',.62,.65,.92);
 const roofc=midpoint(g.At,g.Dt,.46);ellipse(ctx,roofc.x,roofc.y-12,6,7,'#fce1ec','#fff9ee',2);
 drawFlowerbed(ctx,item.x-.10,item.y+1.75,.5);drawFlowerbed(ctx,item.x+1.9,item.y+1.84,.4);
 const p=P(item.x+.1,item.y+2.02);
 for(let i=0;i<4;i++)branch(ctx,{x:p.x+i*7,y:p.y-1},{x:p.x+i*7,y:p.y-15},'#fff5eb',2.8);
 branch(ctx,{x:p.x,y:p.y-10},{x:p.x+21,y:p.y-10},'#d2a6a1',1.6);
}
function drawFamilyHome(ctx,item,def){
 const g=architectureBase(ctx,item,def,72,palettes.butter);
 roofFlat(ctx,g,'#ddaa8d');
 branch(ctx,offset(midpoint(g.Dt,g.Ct,.0),34),offset(midpoint(g.Dt,g.Ct,1),34),'#f5d0ae',3.5);
 branch(ctx,offset(midpoint(g.Bt,g.Ct,.0),34),offset(midpoint(g.Bt,g.Ct,1),34),'#f5d0ae',3.5);
 for(const t of [.22,.5,.79])wallWindow(ctx,g,'left',t,.39,.78,'#a2c8d6');
 for(const t of [.25,.7])wallWindow(ctx,g,'right',t,.36,.85);
 for(const t of [.26,.72])wallWindow(ctx,g,'left',t,.80,.78,'#a2c8d6');
 const balcony=offset(midpoint(g.Dt,g.Ct,.49),38);
 polygon(ctx,[{x:balcony.x-23,y:balcony.y},{x:balcony.x+28,y:balcony.y-3},{x:balcony.x+28,y:balcony.y+6},{x:balcony.x-23,y:balcony.y+9}],'#fdf1d0','#e4bd99',1.2);
 for(let i=0;i<5;i++)branch(ctx,{x:balcony.x-20+i*12,y:balcony.y+7},{x:balcony.x-20+i*12,y:balcony.y-3},'#a77778',1.9);
 const ent=midpoint(g.Dt,g.Ct,.54);door(ctx,offset(ent,69),23,'#9d7e72');
 branch(ctx,{x:ent.x-12,y:ent.y+56},{x:ent.x+13,y:ent.y+55},'#bb8e71',3);
 drawFlowerbed(ctx,item.x+1.8,item.y+2.12,.48);
}
function drawVilla(ctx,item,def){
 const g=architectureBase(ctx,item,def,68,palettes.lilac);
 roofRidge(ctx,g,'#bc99d3','#9575b5',17);
 for(const t of [.16,.5,.84])wallWindow(ctx,g,'left',t,.64,.82);
 for(const t of [.20,.57])wallWindow(ctx,g,'right',t,.60,.9);
 const center=midpoint(g.Dt,g.Ct,.53);
 door(ctx,offset(center,65),27,'#886e99',19);
 const tw=P(item.x+.58,item.y+.56), r=15, baseY=tw.y-66;
 ellipse(ctx,tw.x,baseY+12,r,7,'#e2cce8','#c4a9cb',1.3);
 polygon(ctx,[{x:tw.x-r,y:baseY+12},{x:tw.x+r,y:baseY+12},{x:tw.x+r,y:baseY-35},{x:tw.x-r,y:baseY-35}],'#f4dcf2','#c3a6c3',1.5);
 polygon(ctx,[{x:tw.x-r-5,y:baseY-35},{x:tw.x+r+5,y:baseY-35},{x:tw.x,y:baseY-71}],'#a47cbf','#edcfea',1.9);
 frontWindow(ctx,{x:tw.x,y:baseY+4},.72,'#d4eef2');
 ellipse(ctx,tw.x,baseY-71,3.5,3.5,'#f9d5a4');
 const bannerAt=offset(midpoint(g.Bt,g.Ct,.54),52);
 banner(ctx,bannerAt,'VILLA',35,'#fff8f1','#e8c29e','#9878a4');
 drawTree(ctx,item.x+2.6,item.y+2.6,.54,1);
}
function drawCoffeeKiosk(ctx,item,def){
 const g=architectureBase(ctx,item,def,24,palettes.coffee);
 roofFlat(ctx,g,'#e8aab4');
 const c=P(item.x+1,item.y+1);
 const canopyTop=c.y-49;
 ellipse(ctx,c.x,c.y-23,47,15,'#eacabd','#fff4df',2);
 polygon(ctx,[{x:c.x-42,y:canopyTop+5},{x:c.x+42,y:canopyTop+5},{x:c.x+49,y:canopyTop+24},{x:c.x-49,y:canopyTop+24}],'#e897b6','#fff6e9',1.7);
 for(const shift of [-33,-9,17,38])polygon(ctx,[{x:c.x+shift,y:canopyTop+6},{x:c.x+shift+13,y:canopyTop+6},{x:c.x+shift+18,y:canopyTop+24},{x:c.x+shift+4,y:canopyTop+24}],'#fff2e6');
 for(const dx of [-33,33])branch(ctx,{x:c.x+dx,y:canopyTop+23},{x:c.x+dx,y:c.y+4},'#ae787e',3);
 ellipse(ctx,c.x,c.y-22,18,11,'#fff9e7','#a77f6d',2);
 roundRect(ctx,c.x-19,c.y-24,38,25,7,'#e5cbb0','#fff1dc');
 ctx.fillStyle='#9c6373';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('COFFEE',c.x,c.y-8);
 // A large unmistakable steaming takeaway cup on top of the kiosk.
 roundRect(ctx,c.x-10,canopyTop-25,19,19,3,'#fff8e9','#cf8a9e');
 ellipse(ctx,c.x,canopyTop-25,10,4,'#f6cc95','#fff5da',1.5);
 branch(ctx,{x:c.x-5,y:canopyTop-29},{x:c.x-3,y:canopyTop-38},'#fdf6e3',1.6);
 ellipse(ctx,c.x+14,canopyTop-17,5,6,'','#f7ebd5',2.5);
 drawFlowerbed(ctx,item.x+1.7,item.y+1.8,.48);
}
function drawCoffeeHouse(ctx,item,def){
 const g=architectureBase(ctx,item,def,83,palettes.rose);
 roofFlat(ctx,g,'#c98996');
 // A full glass upstairs and ground-floor cafe under striped awnings.
 for(const t of [.16,.42,.69,.91])wallWindow(ctx,g,'left',t,.35,.9,'#b4e3e2');
 for(const t of [.27,.70])wallWindow(ctx,g,'right',t,.37,1.02,'#b4e3e2');
 const sign=midpoint(g.Dt,g.Ct,.52);banner(ctx,offset(sign,54),'CAFE',57,'#fff7ef','#ca9e7d','#a75271');
 awning(ctx,offset(sign,74),59,13);
 const groundDoor=offset(sign,80);door(ctx,groundDoor,26,'#c17c8b',19);
 const roofPlant=P(item.x+1.05,item.y+.84);drawFlowerbed(ctx,item.x+1.05,item.y+.84,.56);
 const rootTop=P(item.x+2.25,item.y+.8);ellipse(ctx,rootTop.x,rootTop.y-89,16,10,'#c9e0bc','#fff6e7',1.4);
 const terrace=P(item.x+2.4,item.y+2.8);branch(ctx,{x:terrace.x,y:terrace.y-3},{x:terrace.x,y:terrace.y-31},'#c5997d',2.2);ellipse(ctx,terrace.x,terrace.y-32,20,7,'#ffdfb7','#fff5e6',2);
 drawFlowerbed(ctx,item.x+2.8,item.y+2.45,.55);
}
function drawBakery(ctx,item,def){
 const g=architectureBase(ctx,item,def,45,palettes.butter);
 // Bakery has a half-barrel roof (not a pitched residential roof).
 const a=offset(g.At,-4),b=offset(g.Bt,-4),c=offset(g.Ct,-4),d=offset(g.Dt,-4);
 const segments=7;
 for(let i=0;i<segments;i++){
  const f=i/segments,t=(i+1)/segments;
  const lift=v=>-23*Math.sin(v*Math.PI);
  const al=offset(midpoint(a,b,f),lift(f)),ar=offset(midpoint(d,c,f),lift(f));
  const bl=offset(midpoint(a,b,t),lift(t)),br=offset(midpoint(d,c,t),lift(t));
  polygon(ctx,[al,bl,br,ar],i%2?'#e4a676':'#f0c48a','#fff1d1',.65);
 }
 const s=midpoint(g.Dt,g.Ct,.52);
 banner(ctx,offset(s,29),'BAKERY',55,'#fff8e9','#e1b178','#bb7f51');
 awning(ctx,offset(s,47),48,8);
 for(const t of [.22,.80])wallWindow(ctx,g,'left',t,.76,.75,'#c5e1e2');
 door(ctx,offset(s,44),22,'#ab826a',17);
 // Oversized bread-shaped golden sign.
 const signP=P(item.x+1.6,item.y+.55);
 ellipse(ctx,signP.x,signP.y-86,20,9,'#edb263','#fff2d1',1.7);
 for(const dx of [-7,0,7])branch(ctx,{x:signP.x+dx-2,y:signP.y-85},{x:signP.x+dx,y:signP.y-90},'#fff3d9',2.1);
 drawFlowerbed(ctx,item.x+2.65,item.y+1.95,.46);
}
function drawFlowerShop(ctx,item,def){
 const g=architectureBase(ctx,item,def,39,palettes.mint);
 // Greenhouse roof made of transparent mint glass panels and framing ribs.
 const apex=offset(midpoint(g.At,g.Bt),-32),apexBack=offset(midpoint(g.Dt,g.Ct),-32);
 polygon(ctx,[g.At,apex,apexBack,g.Dt],'rgba(194,239,224,.77)','#a2c6b8',2);
 polygon(ctx,[apex,g.Bt,g.Ct,apexBack],'rgba(149,211,202,.73)','#c2e6d8',2);
 for(const f of [.22,.48,.75])branch(ctx,midpoint(g.At,g.Dt,f),midpoint(apex,apexBack,f),'#fff9ee',1.5);
 for(const f of [.24,.5,.75])branch(ctx,midpoint(apex,apexBack,f),midpoint(g.Bt,g.Ct,f),'#d8fbef',1.3);
 for(const t of [.17,.49,.79])wallWindow(ctx,g,'left',t,.70,.75,'#a9e3d8');
 const sign=midpoint(g.Dt,g.Ct,.55);banner(ctx,offset(sign,29),'FLOWERS',56,'#fff5f2','#d4a8a5','#6e9d7e');
 door(ctx,offset(sign,38),19,'#87aaa0',13);
 for(const [xx,yy] of [[.18,1.76],[1.65,1.67],[2.15,.4]])drawFlowerbed(ctx,item.x+xx,item.y+yy,.49);
 ellipse(ctx,apexBack.x,apexBack.y-1,6,6,'#f2a8c3');
}
function drawStructure(ctx,item,def){
 switch(def.id){
  case 'cottage':return drawCottage(ctx,item,def);
  case 'family-home':return drawFamilyHome(ctx,item,def);
  case 'villa':return drawVilla(ctx,item,def);
  case 'coffee-kiosk':return drawCoffeeKiosk(ctx,item,def);
  case 'coffee-house':return drawCoffeeHouse(ctx,item,def);
  case 'bakery':return drawBakery(ctx,item,def);
  case 'flower-shop':return drawFlowerShop(ctx,item,def);
  default:return drawCottage(ctx,item,def);
 }
}
function drawSparkle(ctx,x,y,size=8,color='#fff7de',accent='#f0c495'){
 ctx.save();
 ctx.lineCap='round';
 ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.2,size*.18);
 ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x,y+size);ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);ctx.stroke();
 ctx.strokeStyle=accent;ctx.lineWidth=Math.max(.8,size*.1);
 ctx.beginPath();ctx.moveTo(x-size*.62,y-size*.62);ctx.lineTo(x+size*.62,y+size*.62);ctx.moveTo(x-size*.62,y+size*.62);ctx.lineTo(x+size*.62,y-size*.62);ctx.stroke();
 ctx.restore();
}
function drawBuildReveal(ctx,item,def,now,fx){
 // Last 24% of the 2.55s acceleration: magical golden finish, soft bounce,
 // expanding double ring, upward glitter, and a gentle sparkle shower.
 const {w,h}=dims(def,item.rotation);
 const center=P(item.x+w*.5,item.y+h*.5);
 const elapsed=Math.max(0,Math.min(1,(now-Number(fx?.startAt||now))/Math.max(1,Number(fx?.duration||1))));
 const phase=Math.max(0,Math.min(1,(elapsed-.76)/.24));
 const impact=Math.sin(Math.PI*phase);
 const haloY=center.y-Math.max(74,Math.min(132,Number(def.height||58)*1.65));
 const hop=-13*Math.sin(Math.PI*phase);
 const scale=0.89+.11*(1-Math.pow(1-phase,3))+.085*Math.sin(Math.PI*phase*1.35);
 const ring=10+phase*62;
 ctx.save();
 ctx.globalAlpha=.55*(1-phase);
 ellipse(ctx,center.x,center.y-6,14+phase*44,7+phase*23,'rgba(255,245,206,.22)','#ffda97',2.3);
 ellipse(ctx,center.x,center.y-6,7+phase*60,3+phase*30,'rgba(255,250,231,.08)','#fff0c4',1.6);
 ctx.restore();
 // Light only the building itself; the shadow stays anchored to the land.
 ctx.save();
 ctx.translate(center.x,center.y+hop);
 ctx.scale(scale,scale);
 ctx.translate(-center.x,-center.y);
 ctx.shadowBlur=impact*24;
 ctx.shadowColor='rgba(255,219,129,.85)';
 drawObject(ctx,item,def);
 ctx.restore();
 // A subtle warm flash frames the house, never an opaque white rectangle.
 ctx.save();
 ctx.globalAlpha=Math.max(0,.3-.3*phase);
 const flash=ctx.createRadialGradient(center.x,haloY,5,center.x,haloY,115);
 flash.addColorStop(0,'rgba(255,251,220,.68)');
 flash.addColorStop(1,'rgba(255,251,220,0)');
 ctx.fillStyle=flash;ctx.fillRect(center.x-130,haloY-120,260,240);
 ctx.restore();
 // Sixteen individually animated gold / rose sparkles fly out on diagonals.
 for(let i=0;i<16;i++){
   const angle=(Math.PI*2*i/16)+.12;
   const radius=10+phase*(48+(i%4)*7);
   const px=center.x+Math.cos(angle)*radius;
   const py=haloY+28+Math.sin(angle)*radius*.77-16*phase;
   const twinkle=(.5+.5*Math.sin(phase*12+i*2.4));
   const alpha=Math.max(0,Math.min(1,phase*7))*(1-phase*.77)*(.45+.55*twinkle);
   ctx.save();ctx.globalAlpha=alpha;
   ctx.shadowBlur=12;ctx.shadowColor=i%2?'rgba(255,207,137,.85)':'rgba(245,164,192,.8)';
   if(i%3===0)drawSparkle(ctx,px,py,(6+i%4)*(.85+.35*twinkle),'#fff9dd','#edb16f');
   else ellipse(ctx,px,py,3.4+(i%3)*.8,3.4+(i%3)*.8,i%2?'#ffd68b':'#f6b1cb','#fff6db',1.3);
   ctx.restore();
 }
 // Ending glint echoes a premium city-builder reward reveal.
 if(phase>.38){
  ctx.save();ctx.globalAlpha=Math.min(1,(phase-.38)*2.5)*(1-phase*.3);
  ctx.shadowBlur=17;ctx.shadowColor='#ffdba9';
  drawSparkle(ctx,center.x+49,haloY+5-phase*10,12,'#fff9e5','#f2b6c4');
  drawSparkle(ctx,center.x-46,haloY-15-phase*9,13,'#fffdf4','#f2ce98');
  drawSparkle(ctx,center.x+4,haloY-34-phase*8,8.5,'#fffaf3','#f1bf80');
  ctx.restore();
 }
}
function drawConstructionSite(ctx,item,def,now,fx=null){
 const {w,h}=dims(def,item.rotation),A=P(item.x,item.y),B=P(item.x+w,item.y),C=P(item.x+w,item.y+h),D=P(item.x,item.y+h);
 const total=Math.max(1,Number(item.buildReadyAt||now)-Number(item.buildStartedAt||now));
 const rawProgress=Math.max(0,Math.min(1,(now-Number(item.buildStartedAt||now))/total));
 let progress=rawProgress;
 let stage=rawProgress<1/3?'build_01':rawProgress<2/3?'build_02':'build_03';
 let remainingMs=Math.max(0,Number(item.buildReadyAt||now)-now);
 let accelerated=false;
 if(fx&&fx.type==='skip'){
  accelerated=true;
  const fxProgress=Math.max(0,Math.min(1,(now-Number(fx.startAt||now))/Math.max(1,Number(fx.duration||1))));
  progress=Math.min(.98,.1+fxProgress*.92);
  stage=fxProgress<.28?'build_01':fxProgress<.55?'build_02':'build_03';
  remainingMs=Math.max(0,(1-fxProgress)*Math.max(900,Number(fx.duration||1000)));
 }
 const spriteId=parkConstructionAssetId(item.kind,item.rotation,stage)||buildingAssetId(item.kind,item.rotation,stage);
 const artReady=spriteId&&drawSprite(ctx,spriteId,P(item.x,item.y));
 const center=P(item.x+w*.5,item.y+h*.5);
 if(!artReady){
  shadow(ctx,[A,B,C,D]);
  polygon(ctx,[offset(A,-3),offset(B,-3),offset(C,-3),offset(D,-3)],'#fbe3bd','#d8b18c',2);
  polygon(ctx,[offset(D,-3),offset(C,-3),C,D],'#e9cfaa','#d7b88e',1);
  polygon(ctx,[offset(B,-3),offset(C,-3),C,B],'#cebda4','#d7b88e',1);
  const rise=8+progress*35;
  if(progress>.14){
   polygon(ctx,[offset(D,-rise),offset(C,-rise),C,D],'rgba(255,247,220,.83)','#dac6ad',1);
   polygon(ctx,[offset(B,-rise),offset(C,-rise),C,B],'rgba(246,217,198,.87)','#dac6ad',1);
  }
  const poles=[A,B,C,D];
  for(const q of poles){branch(ctx,offset(q,-2),offset(q,-Math.max(34,rise+14)),'#b78762',3.3);ellipse(ctx,q.x,q.y-Math.max(34,rise+14),2.9,2.6,'#ffeed1');}
  branch(ctx,offset(D,-33),offset(C,-33),'#e8ae7b',3.1);branch(ctx,offset(B,-33),offset(C,-33),'#e8ae7b',3.1);
  branch(ctx,offset(D,-19),offset(C,-19),'#a5775f',2.4);branch(ctx,offset(B,-19),offset(C,-19),'#a5775f',2.4);
  polygon(ctx,[{x:center.x-22,y:center.y-15},{x:center.x+21,y:center.y-15},{x:center.x+22,y:center.y-30},{x:center.x-21,y:center.y-30}],'#efba86','#f9e6bc',1.5);
  for(let i=0;i<3;i++)roundRect(ctx,center.x-20+i*13,center.y-14,10,5,1,'#e29f78','#fff0d6');
 }
 const badgeY=Math.min(A.y,B.y,C.y,D.y)-Math.max(54,def.height*.88)-40;
 const pillW=102,pillH=34;
 ctx.save();
 ctx.shadowColor='rgba(143,96,104,.24)';ctx.shadowBlur=18;ctx.shadowOffsetY=6;
 roundRect(ctx,center.x-pillW/2,badgeY-pillH/2,pillW,pillH,17,'rgba(255,251,244,.985)','#e0b38c',1.6);
 ctx.restore();
 const gloss=ctx.createLinearGradient(center.x, badgeY-pillH/2, center.x, badgeY+pillH/2);
 gloss.addColorStop(0,'rgba(255,255,255,.65)');gloss.addColorStop(.42,'rgba(255,255,255,.05)');gloss.addColorStop(1,'rgba(255,245,235,.2)');
 roundRect(ctx,center.x-pillW/2+2,badgeY-pillH/2+2,pillW-4,pillH-4,15,gloss,'rgba(255,255,255,.18)',.6);
 const remain=Math.max(0,Math.ceil(remainingMs/1000));
 const clock=`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`;
 ctx.textAlign='center';ctx.fillStyle=accelerated?'#b36d7d':'#a56863';
 ctx.font='700 15px system-ui, -apple-system, sans-serif';ctx.fillText(clock,center.x,badgeY+2);
 if(accelerated)drawSparkle(ctx,center.x-pillW/2+14,badgeY,4.8,'#fff4ea','#efb2c0');
 const barW=84,barH=8,barX=center.x-barW/2,barY=badgeY+22;
 ctx.save();
 ctx.shadowColor='rgba(247,186,203,.25)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
 roundRect(ctx,barX,barY,barW,barH,4,'rgba(242,217,206,.92)','rgba(220,188,175,.95)',1);
 ctx.restore();
 const fillW=Math.max(6,barW*Math.max(0,Math.min(1,progress)));
 const fill=ctx.createLinearGradient(barX,barY,barX+barW,barY);
 fill.addColorStop(0,accelerated?'#d7839e':'#e49caa');
 fill.addColorStop(.55,accelerated?'#f0b0bf':'#efb5c1');
 fill.addColorStop(1,accelerated?'#f5d6a2':'#f3cf9e');
 roundRect(ctx,barX,barY,fillW,barH,4,fill,'rgba(255,247,239,.7)',.8);
 const gleamX=barX+Math.min(barW-5,Math.max(5,fillW-4));
 ellipse(ctx,gleamX,barY+barH/2,5,2.8,'rgba(255,252,245,.95)');
}

function drawExtraFallback(ctx,item,def){
 const x=item.x,y=item.y;
 if(def.layer==='surface'){
  const base=def.category==='paths'?'#f3dfd0':'#f9e5ed';
  diamond(ctx,x,y,def.w,def.h,base,'#c6aa9f',1.7);
  const p=P(x+def.w*.5,y+def.h*.5);
  if(def.category==='paths')branch(ctx,{x:p.x-12,y:p.y},{x:p.x+12,y:p.y},'#fff8e9',2.6);
  else ellipse(ctx,p.x,p.y,14,5,'#f2bfce','#fff3eb',1);
  return true;
 }
 if(!def.id.startsWith('extra-'))return false;
 const p=P(x+def.w*.5,y+def.h*.5);
 if(def.id==='extra-tree'){drawTree(ctx,x+.5,y+.5,.72,1);return true;}
 if(def.id==='extra-flowerbed'||def.id==='extra-planter'){drawFlowerbed(ctx,x+.5,y+.5,.85);return true;}
 if(def.id==='extra-bench'){drawBench(ctx,x,y,def.w,def.h);return true;}
 if(def.id==='extra-fountain'){drawFountain(ctx,x,y,def.w,def.h);return true;}
 if(def.id==='extra-lamp'||def.id==='extra-sign'){drawLamp(ctx,x+.5,y+.5);return true;}
 if(def.id==='extra-bush'){ellipse(ctx,p.x,p.y-7,14,13,'#96c49c','#f2d6dc',1.5);return true;}
 if(def.id==='extra-arch'){
  branch(ctx,{x:p.x-18,y:p.y+2},{x:p.x-18,y:p.y-33},'#e0bb8f',4);
  branch(ctx,{x:p.x+18,y:p.y+2},{x:p.x+18,y:p.y-33},'#e0bb8f',4);
  ellipse(ctx,p.x,p.y-36,26,8,'#ecb2c7');return true;
 }
 ellipse(ctx,p.x,p.y-14,14,20,'#f3b1cf','#e4a9b0',1.6);return true;
}
function drawObject(ctx,item,def){
 // A soft, precise ground-contact shadow under the two 1x1 bench aliases.
 // Their WebP feet are anchored below at P(x+.5,y+.5)+8px; this shadow
 // follows the tile even when bench rotation or a saved placement changes.
 if(def.id==='bench'||def.id==='extra-bench'){
  const contact=P(item.x+.5,item.y+.5);
  ellipse(ctx,contact.x,contact.y+5,17,4.5,'rgba(73,99,67,.17)');
 }
 // Sprite paths do not use a Canvas rotation: directional renders are genuine
 // distinct 3D states, with the original occupancy and saved rotation intact.
 const variation=(hash(item.x||0,item.y||0)>.5)?1:0;
 const id=catalogSpriteId(def.id,item.rotation||0,'complete',variation);
 if(id && drawSprite(ctx,id,P(item.x,item.y)))return;
 // Try another still-active sprite, if available; otherwise use procedural
 // Canvas drawing while a WebP loads or when it cannot be decoded.
 const fallbackId=fallbackSpriteId(def.id,item.rotation||0,'complete',variation);
 if(fallbackId && fallbackId!==id && drawSprite(ctx,fallbackId,P(item.x,item.y)))return;
 // Rotate the actual footprint geometry and facade, not only the occupied cells.
 // P(...) rotates the projected ground points while keeping building walls vertical.
 const previousRotation=objectRotation;
 objectRotation = item.rotation ? {x:item.x,y:item.y,w:def.w,h:def.h,rotation:item.rotation} : null;
 const visual=item.rotation?{...item,rotation:0}:item;
 const {w,h}=dims(def,0),x=item.x,y=item.y;
 try {
  if(def.id==='tree')return drawTree(ctx,x+.5,y+.5,.78,hash(x,y)>.5?1:0);
  if(def.id==='flowerbed')return drawFlowerbed(ctx,x+.5,y+.5,.9);
  if(def.id==='lamp')return drawLamp(ctx,x+.5,y+.5);
  if(def.id==='bench')return drawBench(ctx,x,y,w,h);
  if(def.id==='fountain')return drawFountain(ctx,x,y,w,h);
  if(def.id==='monument')return drawMonument(ctx,x,y,w,h);
  if(def.id==='garden')return drawGarden(ctx,x,y,w,h);
  if(def.id==='playground')return drawPlayground(ctx,x,y,w,h);
  if(drawExtraFallback(ctx,item,def))return;
  drawStructure(ctx,visual,def);
 } finally {objectRotation=previousRotation;}
}
function drawOutline(ctx,item,catalog,color='#fff1a4',width=3){const {w,h}=dims(catalog[item.kind],item.rotation);diamond(ctx,item.x,item.y,w,h,'',color,width);}
function drawOverlayCell(ctx,x,y,color,id=''){
 if(id && drawSprite(ctx,id,P(x,y)))return;
 diamond(ctx,x,y,1,1,color,'rgba(255,255,255,.7)',1.5);
}

export function drawCatalogThumbnail(canvas,def){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 canvas.width=150;canvas.height=142;
 const id=catalogSpriteId(def.id,0,'complete',0);
 if(id&&drawCatalogSprite(ctx,id,canvas.width,canvas.height))return;
 const fallbackId=fallbackSpriteId(def.id,0,'complete',0);
 if(fallbackId && fallbackId!==id && drawCatalogSprite(ctx,fallbackId,canvas.width,canvas.height))return;
 const shape={x:0,y:0,rotation:0,kind:def.id,level:1,stored:false};
 const center=P(def.w*.5,def.h*.5),s=Math.min(1.25,135/(36*(def.w+def.h)));
 ctx.setTransform(s,0,0,s,75-center.x*s,126-center.y*s);
 drawObject(ctx,shape,def);
}

export function drawWorld(canvas,city,catalog,cam,overlay={}) {
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
 const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const pxW=Math.round(width*dpr),pxH=Math.round(height*dpr);
 if(canvas.width!==pxW||canvas.height!==pxH){canvas.width=pxW;canvas.height=pxH;}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,width,height);
 const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#d9efe1');gradient.addColorStop(.55,'#e4f0da');gradient.addColorStop(1,'#f5efdc');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 for(let i=0;i<25;i++){const x=hash(i,3)*width,y=hash(7,i)*height;ellipse(ctx,x,y,3+hash(i,14)*8,2.5,'rgba(255,255,255,.15)');}
 const focus=P(PROJECT_FOCUS.x,PROJECT_FOCUS.y);
 ctx.setTransform(dpr*cam.zoom,0,0,dpr*cam.zoom,dpr*(width/2+cam.x-focus.x*cam.zoom),dpr*(height/2+cam.y-focus.y*cam.zoom));
 const coords=[screenToTile(0,0,{width,height},cam),screenToTile(width,0,{width,height},cam),screenToTile(width,height,{width,height},cam),screenToTile(0,height,{width,height},cam)];
 const viewport={minX:Math.min(...coords.map(p=>p.x))-8,maxX:Math.max(...coords.map(p=>p.x))+8,minY:Math.min(...coords.map(p=>p.y))-8,maxY:Math.max(...coords.map(p=>p.y))+8};
 drawLandscape(ctx,city,catalog,viewport);
 // Pavement and plazas sit UNDER structures. Rendering a surface never
 // changes original occupancy of buildings or the live road graph.
 for(const item of city.objects.filter(o=>!o.stored && catalog[o.kind]?.layer==='surface')){
  if(item.x>viewport.maxX+3||item.y>viewport.maxY+3)continue;
  if(overlay.draft?.uid===item.uid && overlay.draft.type==='move')ctx.globalAlpha=.22;
  drawObject(ctx,item,catalog[item.kind]);
  ctx.globalAlpha=1;
  if(overlay.selectedUid===item.uid)drawOutline(ctx,item,catalog,'#fffad7',3.5);
 }
 drawRoads(ctx,city,viewport);
 const connected=connectedRoads(city);
 // Buildings and citizens share one depth-sorted painter. Residents walking
 // behind a house should disappear behind it, not float over its roof.
 const layers=city.objects.filter(o=>!o.stored && catalog[o.kind]?.layer!=='surface').map(item=>{
  const size=dims(catalog[item.kind],item.rotation);
  return {type:'object',item,depth:item.x+item.y+size.w+size.h};
 });
 for(const person of overlay.citizens||[]){
  if(person.x<viewport.minX-2||person.y<viewport.minY-2||person.x>viewport.maxX+2||person.y>viewport.maxY+2)continue;
  layers.push({type:'citizen',person,depth:person.x+person.y});
 }
 layers.sort((a,b)=>a.depth-b.depth||(a.type==='citizen'?-1:1));
 for(const layer of layers){
  if(layer.type==='citizen'){
   const pos=P(layer.person.x,layer.person.y);
   drawCitizen(ctx,layer.person,pos.x,pos.y,overlay.now);
   continue;
  }
  const item=layer.item;
  const def=catalog[item.kind];
  if(!def)continue;
  if(item.x>viewport.maxX+3||item.y>viewport.maxY+3||item.x+def.w<viewport.minX-3||item.y+def.h<viewport.minY-3)continue;
  if(overlay.draft?.uid===item.uid && overlay.draft.type==='move')ctx.globalAlpha=.22;
  if(overlay.selectedUid===item.uid){
   const size=dims(def,item.rotation);
   for(let i=0;i<size.w;i++)for(let j=0;j<size.h;j++)drawSprite(ctx,'terrain_overlay_selected_blue_premium',P(item.x+i,item.y+j));
  }
  const now=Number.isFinite(overlay.now)?overlay.now:Date.now();
  const skipFx=overlay.skipAnimation?.uid===item.uid?overlay.skipAnimation:null;
  const skipElapsed=skipFx?Math.max(0,Math.min(1,(now-Number(skipFx.startAt||now))/Math.max(1,Number(skipFx.duration||1)))):0;
  const revealComplete=Boolean(skipFx&&skipElapsed>=.76);
  const building=isConstructing(item,now);
  if(skipFx && !revealComplete)drawConstructionSite(ctx,skipFx.item,def,now,skipFx);
  else if(revealComplete)drawBuildReveal(ctx,item,def,now,skipFx);
  else if(building)drawConstructionSite(ctx,item,def,now);
  else drawObject(ctx,item,def);
  ctx.globalAlpha=1;
  if(overlay.selectedUid===item.uid)drawOutline(ctx,item,catalog,'#fffad7',3.5);
  if(!building&&def.needsRoad&&!isObjectConnected(item,city,catalog,connected)){
   const p=P(item.x+.5,item.y+.5);ellipse(ctx,p.x,p.y-64,12,12,'#fff1e7','#e8aa92',2);
   ctx.fillStyle='#b97769';ctx.textAlign='center';ctx.font='bold 17px sans-serif';ctx.fillText('!',p.x,p.y-58);
  }
 }
 if(overlay.mode==='expand'){
  for(const parcel of expansionCandidates(city)){
   const x=parcel.cx*PARCEL_SIZE,y=parcel.cy*PARCEL_SIZE;
   if(x>viewport.maxX||y>viewport.maxY||x+PARCEL_SIZE<viewport.minX||y+PARCEL_SIZE<viewport.minY)continue;
   const selected=overlay.expansionDraft?.cx===parcel.cx&&overlay.expansionDraft?.cy===parcel.cy;
   diamond(ctx,x,y,PARCEL_SIZE,PARCEL_SIZE,selected?'rgba(240,188,105,.62)':'rgba(147,217,176,.28)',selected?'#fff4bc':'rgba(119,171,130,.75)',selected?4:2);
   if(selected)for(let i=0;i<PARCEL_SIZE;i++)for(let j=0;j<PARCEL_SIZE;j++)drawSprite(ctx,'terrain_overlay_expansion_gold_premium',P(x+i,y+j));
   const c=P(x+PARCEL_SIZE/2,y+PARCEL_SIZE/2);
   ellipse(ctx,c.x,c.y-3,selected?23:16,selected?18:13,selected?'#fff5da':'#f2fff0',selected?'#c89d64':'#7db491',1.5);
   ctx.font=selected?'bold 22px sans-serif':'bold 18px sans-serif';ctx.fillStyle=selected?'#b77e4b':'#71a789';ctx.textAlign='center';ctx.fillText('+',c.x,c.y+3);
  }
 }
 if(overlay.roadDraft?.length){
  const bad=!overlay.roadValid;
  for(const point of overlay.roadDraft)drawOverlayCell(ctx,point.x,point.y,bad?'rgba(225,92,107,.56)':overlay.mode==='erase'?'rgba(239,97,108,.56)':'rgba(109,207,156,.66)',bad?'world_ground_overlay_blocked':overlay.mode==='erase'?'world_road_preview_remove':'world_road_preview_build');
 }
 if(overlay.draft){
  const draft=overlay.draft,def=catalog[draft.kind];
  if(def){
   const checked=checkPlacement(city,catalog,draft.kind,draft.x,draft.y,draft.rotation,draft.type==='move'?draft.uid:'');
   const {w,h}=dims(def,draft.rotation),tint=checked.ok?'rgba(102,205,157,.44)':'rgba(232,92,121,.49)';
   for(let i=0;i<w;i++)for(let j=0;j<h;j++)drawOverlayCell(ctx,draft.x+i,draft.y+j,tint,checked.ok?'world_ground_overlay_allowed':'world_ground_overlay_blocked');
   ctx.globalAlpha=checked.ok?.76:.42;
   drawObject(ctx,draft,def);ctx.globalAlpha=1;
   drawOutline(ctx,draft,catalog,checked.ok?'#fffce4':'#b52852',2.8);
  }
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
