// City Life: render-only overlays for existing isometric 3D sprites.
// No D1, Worker, saved-city writes, or asset replacements.
export function createCityLifeFx({P,dims,hash,rgba,ellipse,branch,roundRect,polygon}){
const AMBIENT_FOUNTAINS = new Set(['fountain','extra-fountain','terrain_platform_topiary_fountain']);
const AMBIENT_GREENERY = new Set(['tree','extra-tree','flowerbed','extra-flowerbed','extra-planter','garden','rose-garden','botanical-garden','pond-park','playground','sports-playground','plaza-playground-base','city-square','plaza-rest-zone']);
const AMBIENT_SHOPS = new Set(['coffee-kiosk','coffee-house','bakery']);
const AMBIENT_LAMPS = new Set(['lamp','extra-lamp']);
const EVENING_WINDOW_CATEGORIES = new Set(['homes','shops']);

function localMinuteOfDay(now=Date.now()){
 const date=new Date(now);
 return date.getHours()*60+date.getMinutes()+date.getSeconds()/60;
}
function clamp01(value){return Math.max(0,Math.min(1,value));}
function smoothstep(edge0,edge1,value){
 const t=clamp01((value-edge0)/Math.max(.0001,edge1-edge0));
 return t*t*(3-2*t);
}
function eveningLevel(now=Date.now()){
 const minute=localMinuteOfDay(now);
 if(minute>=1110&&minute<1260)return smoothstep(1110,1260,minute); // 18:30 → 21:00
 if(minute>=1260||minute<315)return 1; // 21:00 → 05:15
 if(minute<420)return 1-smoothstep(315,420,minute); // 05:15 → 07:00
 return 0;
}
function ambientPhase(item,now,seed=0,divisor=780){
 return now/divisor+hash(item.x||0,item.y||0,seed)*Math.PI*2;
}
function objectCenter(item,def){const {w,h}=dims(def,item.rotation||0);return P(item.x+w*.5,item.y+h*.5);}
function drawTwilightOverlay(ctx,width,height,level,now){
 if(level<=0)return;
 const gradient=ctx.createLinearGradient(0,0,0,height);
 gradient.addColorStop(0,rgba(120,99,178,.25*level));
 gradient.addColorStop(.58,rgba(113,87,158,.15*level));
 gradient.addColorStop(1,rgba(47,55,91,.38*level));
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 const stars=Math.round(14+16*level);
 for(let i=0;i<stars;i++){
  const px=hash(i,91,7)*width,py=hash(27,i,12)*(height*.42);
  const flicker=.25+.75*Math.abs(Math.sin(now/950+i*1.73));
  ellipse(ctx,px,py,.65+hash(i,18,4)*1.9,.65+hash(i,17,9)*1.9,rgba(255,250,242,(.15+.27*flicker)*level));
 }
}
function drawFountainUnderlay(ctx,item,def,now){
 const c=objectCenter(item,def),phase=ambientPhase(item,now,4,610),pulse=.5+.5*Math.sin(phase);
 for(let ring=0;ring<2;ring++){
  const spread=10+ring*7+pulse*4;
  ellipse(ctx,c.x,c.y-11-ring*.5,spread,4.1+ring*1.2,rgba(174,228,243,.12-ring*.03));
  ellipse(ctx,c.x,c.y-11-ring*.5,spread,4.1+ring*1.2,'',rgba(230,250,255,.18-ring*.05),1);
 }
}
function drawFountainOverlay(ctx,item,def,now,evening=0){
 const c=objectCenter(item,def),phase=ambientPhase(item,now,3,380),crest=Math.sin(phase),height=18+crest*3;
 ctx.save();ctx.globalAlpha=.72+.12*Math.sin(phase*.9);
 for(const offsetX of [-8,0,8]){
  ctx.beginPath();
  ctx.moveTo(c.x+offsetX*.36,c.y-10);
  ctx.quadraticCurveTo(c.x+offsetX*.18,c.y-18-height*.45,c.x+offsetX,c.y-27-height);
  ctx.strokeStyle=rgba(212,248,255,evening>.35?.95:.88);
  ctx.lineWidth=2.1;ctx.lineCap='round';ctx.stroke();
  ellipse(ctx,c.x+offsetX,c.y-27-height,1.5,2.4,rgba(236,253,255,.85));
 }
 ellipse(ctx,c.x,c.y-12,10.5,4.8,rgba(142,211,232,.22+.08*Math.max(0,crest)));
 for(let i=0;i<4;i++){
  const angle=phase+i*Math.PI/2;
  ellipse(ctx,c.x+Math.sin(angle)*12,c.y-24-height*.48+Math.cos(angle*1.2)*2,1.2,1.9,rgba(240,253,255,.56));
 }
 ctx.restore();
}
function drawLeafSwayCluster(ctx,item,def,now,evening=0){
 const c=objectCenter(item,def),phase=ambientPhase(item,now,9,820);
 const stems=Math.max(3,Math.min(6,def.w+def.h));
 for(let i=0;i<stems;i++){
  const ratio=stems===1?.5:i/(stems-1);
  const baseX=c.x-(def.w+def.h)*10+ratio*(def.w+def.h)*20;
  const baseY=c.y+2+Math.sin(phase+i*.95)*1.1;
  const sway=Math.sin(phase*1.2+i*.7)*3.2;
  branch(ctx,{x:baseX,y:baseY},{x:baseX+sway,y:baseY-10-hash(i,def.w,def.h)*8},rgba(120,165,111,.55+.12*evening),1.4);
  ellipse(ctx,baseX+sway,baseY-11-hash(i,5,7)*7,4.4,2.2,rgba(143,202,137,.32+.05*evening));
  ellipse(ctx,baseX+sway-2.2,baseY-7-hash(i,11,3)*4,3.4,1.8,rgba(236,170,194,.26));
 }
 const butterflyCount=def.category==='parks'?2:1;
 for(let i=0;i<butterflyCount;i++){
  const flutter=phase*1.7+i*1.8;
  const px=c.x-10+i*14+Math.sin(flutter)*5;
  const py=c.y-35-Math.abs(Math.cos(flutter))*7;
  const wing=1.7+Math.abs(Math.sin(flutter*1.35))*1.5;
  ellipse(ctx,px-wing,py,wing,1.5,rgba(255,240,167,.55));
  ellipse(ctx,px+wing,py,wing,1.5,rgba(255,199,216,.55));
  branch(ctx,{x:px,y:py-1},{x:px,y:py+3},rgba(142,118,99,.45),.8);
 }
 if(evening>.14){
  for(let i=0;i<3;i++){
   const glow=phase*1.4+i*2.2;
   ellipse(ctx,c.x-14+i*12+Math.sin(glow)*3,c.y-8-Math.abs(Math.cos(glow))*10,2.1,2.1,rgba(255,239,180,(.18+.13*Math.sin(glow)*.5)*evening));
  }
 }
}
function drawCafeSteam(ctx,item,def,now){
 const c=objectCenter(item,def),phase=ambientPhase(item,now,15,1100);
 for(let plume=0;plume<3;plume++){
  const x=c.x-8+plume*9+Math.sin(phase+plume)*2;
  const y=c.y-45-def.h*4-Math.abs(Math.sin(phase*1.1+plume))*5;
  ctx.beginPath();
  ctx.moveTo(x,y+14);
  ctx.bezierCurveTo(x-3,y+10,x+3,y+7,x,y+3);
  ctx.bezierCurveTo(x-3,y-1,x+3,y-5,x,y-9);
  ctx.strokeStyle=rgba(255,255,255,.33);
  ctx.lineWidth=2.1;ctx.lineCap='round';ctx.stroke();
 }
}
function drawLampGlow(ctx,item,def,now,evening){
 if(evening<=0)return;
 const c=objectCenter(item,def),phase=ambientPhase(item,now,27,860),flicker=.92+.08*Math.sin(phase*1.8);
 ctx.save();ctx.globalCompositeOperation='screen';
 ellipse(ctx,c.x,c.y-28,26,14,rgba(255,222,160,.16*evening*flicker));
 ellipse(ctx,c.x,c.y-28,12,7,rgba(255,244,205,.35*evening*flicker));
 ctx.restore();
}
function drawWindowGlow(ctx,item,def,now,evening){
 if(evening<=.02)return;
 const c=objectCenter(item,def),phase=ambientPhase(item,now,39,940),flicker=.88+.12*Math.sin(phase*1.5);
 const columns=Math.max(1,Math.min(3,def.w));
 const rows=def.category==='homes'?1:2;
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const px=c.x-(columns-1)*9+column*18+(row%2?4:0);
  const py=c.y-26-row*13-def.h*2;
  roundRect(ctx,px-4.6,py-5.2,9.2,10.4,2.2,rgba(255,223,154,.22*evening*flicker),rgba(255,248,219,.24*evening));
  ellipse(ctx,px,py,10.5,7.5,rgba(255,204,122,.045*evening*flicker));
 }
}
function drawObjectAmbientUnderlay(ctx,item,def,now){
 if(AMBIENT_FOUNTAINS.has(def.id))drawFountainUnderlay(ctx,item,def,now);
}
function drawObjectAmbientOverlay(ctx,item,def,now,evening){
 if(AMBIENT_FOUNTAINS.has(def.id))drawFountainOverlay(ctx,item,def,now,evening);
 if(AMBIENT_GREENERY.has(def.id))drawLeafSwayCluster(ctx,item,def,now,evening);
 if(AMBIENT_SHOPS.has(def.id))drawCafeSteam(ctx,item,def,now);
 if(AMBIENT_LAMPS.has(def.id))drawLampGlow(ctx,item,def,now,evening);
 if(EVENING_WINDOW_CATEGORIES.has(def.category))drawWindowGlow(ctx,item,def,now,evening);
}
function deriveSocialMoments(citizens=[]){
 const moments=[],taken=new Set();
 for(let i=0;i<citizens.length;i++){
  const a=citizens[i];
  if(!a||a.walking||taken.has(a.id))continue;
  for(let j=i+1;j<citizens.length;j++){
   const b=citizens[j];
   if(!b||b.walking||taken.has(b.id))continue;
   const dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);
   if(dist>1.28)continue;
   const sameVenue=a.venueUid&&a.venueUid===b.venueUid;
   if(!sameVenue&&dist>.86)continue;
   const chooser=hash(i,j,97),kind=sameVenue&&a.action==='play'?'play':chooser>.78?'heart':chooser>.34?'chat':'wave';
   moments.push({kind,a,b,x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   taken.add(a.id);taken.add(b.id);
   break;
  }
 }
 return moments;
}
function drawSocialMoment(ctx,moment,now){
 const pos=P(moment.x,moment.y),bob=Math.sin(now/340+(moment.x+moment.y))*2.2;
 const bubbleY=pos.y-54-bob;
 ctx.save();
 ellipse(ctx,pos.x,bubbleY+8,18,8,rgba(89,72,90,.08));
 roundRect(ctx,pos.x-16,bubbleY-10,32,20,10,'rgba(255,251,247,.96)','rgba(238,216,223,.95)');
 polygon(ctx,[{x:pos.x-4,y:bubbleY+10},{x:pos.x+1,y:bubbleY+17},{x:pos.x+6,y:bubbleY+9}],'rgba(255,251,247,.96)','rgba(238,216,223,.95)',1);
 if(moment.kind==='heart'){
  ellipse(ctx,pos.x-3,bubbleY,4,4.8,'#f3a0bd');ellipse(ctx,pos.x+3,bubbleY,4,4.8,'#f3a0bd');
  polygon(ctx,[{x:pos.x-7,y:bubbleY+1},{x:pos.x,y:bubbleY+10},{x:pos.x+7,y:bubbleY+1}],'#f3a0bd');
 }else if(moment.kind==='play'){
  ellipse(ctx,pos.x-6,bubbleY+1,3.4,3.4,'#ffd98f');ellipse(ctx,pos.x+6,bubbleY-1,3.4,3.4,'#ffd98f');
  ellipse(ctx,pos.x,bubbleY-3,3.2,3.2,'#ffc3d3');
 }else if(moment.kind==='wave'){
  branch(ctx,{x:pos.x-7,y:bubbleY+5},{x:pos.x-1,y:bubbleY-2},'#d18a9d',2.2);
  branch(ctx,{x:pos.x+6,y:bubbleY+5},{x:pos.x+2,y:bubbleY-1},'#d18a9d',2.2);
  ellipse(ctx,pos.x+7,bubbleY-2,3.6,3.1,'#f4c9b7');
 }else{
  ellipse(ctx,pos.x-8,bubbleY,2.2,2.2,'#e6a2bb');ellipse(ctx,pos.x,bubbleY-1.5,2.5,2.5,'#efbfd0');ellipse(ctx,pos.x+8,bubbleY,2.2,2.2,'#e6a2bb');
 }
 ctx.restore();
}


return Object.freeze({ eveningLevel, drawTwilightOverlay, drawFountainUnderlay, drawObjectAmbientUnderlay,
 drawObjectAmbientOverlay, deriveSocialMoments, drawSocialMoment });
}
