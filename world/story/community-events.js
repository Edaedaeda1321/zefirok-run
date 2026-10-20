// RC-5: read-only civic milestones. The signed community fund remains the
// authority for balances, totals, stages and contributions. These are VISUAL
// events, never claimable rewards or additional financial milestones.
const DEFINITIONS=Object.freeze({
 garden:Object.freeze({
  id:'garden',title:'Сад встреч',goal:60_000,stages:[60_000],
  events:Object.freeze([
   ['garden-seeds',15_000,'Первые ростки','В саду появились первые ростки. Жители начали готовить клумбы.','Садовники принесли семена'],
   ['garden-flowers',30_000,'Расцветают клумбы','Новые цветы украшают дорожки, а жители заботятся о посадках.','На площадке стало больше цветов'],
   ['garden-ribbons',45_000,'Украшаем дорожки','Город готовит ленты и цветочные гирлянды к открытию сада.','Появились гирлянды и украшения'],
   ['garden-opening',60_000,'Открытие Сада встреч','Общий сбор завершён! Жители могут праздновать открытие нового сада.','Сад открыт для прогулок']
  ])
 }),
 festival:Object.freeze({
  id:'festival',title:'Дом фестивалей Зеффи',goal:50_000_000,stages:[12_500_000,30_000_000,50_000_000],
  events:Object.freeze([
   ['festival-supplies',5_000_000,'Привезли материалы','Рабочие собрали материалы, площадка постепенно преображается.','У площадки появились материалы и рабочие'],
   ['festival-foundation',12_500_000,'Заложен фундамент','Первый большой строительный этап завершён — готов фундамент.','Здание перешло на следующую стадию'],
   ['festival-walls',20_000_000,'Строим стены','Рабочие возводят стены, а жители наблюдают за переменами.','На стройке кипит работа'],
   ['festival-dome',30_000_000,'Стены и купол','Здание выросло: готова новая большая строительная стадия.','Появились стены и купол'],
   ['festival-decor',40_000_000,'Город украшает зал','Жители развесили гирлянды и готовят праздничный вход.','Вокруг здания появляются украшения'],
   ['festival-opening',50_000_000,'Большое открытие','Дом фестивалей Зеффи готов! Город встречает новый праздник.','Дом фестивалей открыт']
  ])
 })
});
export const COMMUNITY_EVENT_DEFINITIONS=DEFINITIONS;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
function validProject(raw,def){
 return raw?.id===def.id&&integer(raw.total)&&integer(raw.goal)&&raw.goal===def.goal&&
  raw.total<=raw.goal&&integer(raw.revision)&&integer(raw.stage)&&
  Array.isArray(raw.milestones)&&raw.milestones.length===def.stages.length&&
  raw.milestones.every((x,i)=>x===def.stages[i])&&
  raw.stage===def.stages.filter(x=>raw.total>=x).length;
}
export function communityChronicle(snapshot,id){
 const def=DEFINITIONS[id],raw=snapshot?.projects?.[id];
 if(!def||!validProject(raw,def))return null;
 const events=def.events.map(([eventId,threshold,title,description,change],index)=>Object.freeze({
  id:eventId,projectId:id,threshold,title,description,change,index,
  complete:raw.total>=threshold,percent:Math.round(100*threshold/def.goal)
 }));
 const achieved=events.filter(event=>event.complete);
 const next=events.find(event=>!event.complete)||null;
 return Object.freeze({id,title:def.title,total:raw.total,goal:def.goal,stage:raw.stage,
  finished:raw.total===def.goal,events,achieved:achieved.length,latest:achieved.at(-1)||null,
  next,percent:Math.min(100,Math.floor(100*raw.total/def.goal))});
}
export function communityEvent(snapshot,eventId){
 if(typeof eventId!=='string')return null;
 const id=eventId.startsWith('garden-')?'garden':eventId.startsWith('festival-')?'festival':null;
 return communityChronicle(snapshot,id)?.events.find(event=>event.id===eventId&&event.complete)||null;
}
export function newlyReachedCommunityEvents(previous,next){
 if(!previous||!next)return [];
 const reached=[];
 for(const id of ['garden','festival']){
  const before=communityChronicle(previous,id),after=communityChronicle(next,id);
  if(!before||!after||after.total<before.total)continue;
  reached.push(...after.events.filter(event=>event.complete&&before.total<event.threshold));
 }
 return reached;
}
export function communityVisualPlan(snapshot,chapter=0){
 const plans=[];
 for(const id of ['garden','festival']){
  if(id==='festival'&&chapter<1)continue;
  const chronicle=communityChronicle(snapshot,id);
  if(!chronicle)continue;
  plans.push({id,total:chronicle.total,stage:chronicle.stage,finished:chronicle.finished,
   progress:chronicle.percent,reached:chronicle.achieved});
 }
 return plans;
}
const frac=v=>v-Math.floor(v);
const noise=(a,b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
function ellipse(ctx,x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function stroke(ctx,a,b,color,width){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function round(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function flower(ctx,x,y,r,index){
 const petals=['#ffc4d9','#f7c685','#e5c6f5','#fff2c3'];
 for(let j=0;j<5;j++){
  const theta=j*Math.PI*2/5;
  ellipse(ctx,x+Math.cos(theta)*r*.73,y+Math.sin(theta)*r*.73,r*.52,r*.52,petals[index%petals.length]);
 }
 ellipse(ctx,x,y,r*.36,r*.36,'#f7d989');
}
function worker(ctx,x,y,time,index=0,moving=true){
 const phase=moving?Math.sin(time/310+index*1.5):0;
 ctx.save();ctx.translate(x,y);
 ellipse(ctx,0,1,8,2.9,'rgba(74,88,71,.23)');
 const boots='#8a676e';
 round(ctx,-5.4,-7+phase*1.6,4.4,8,1.3,boots);round(ctx,1,-7-phase*1.6,4.4,8,1.3,boots);
 round(ctx,-6.2,-20,12.4,15,3,index%2?'#caa9c9':'#e9a8b0');
 round(ctx,-7.5,-15,3.2,9,1.6,'#eec7b2');round(ctx,4.3,-15,3.2,9,1.6,'#eec7b2');
 ellipse(ctx,0,-25,6.7,7.4,'#f4d4b8');
 ellipse(ctx,0,-30,8.3,3.5,index%2?'#d6a8bf':'#e9b27f');
 round(ctx,-8,-31,16,2.8,1.4,index%2?'#c58aa6':'#d49965');
 if(index%3===1){round(ctx,7,-14,7,8,2,'#e6b77d');round(ctx,6.4,-16,8.1,2,1,'#fff0d9');}
 if(index%3===2){round(ctx,-11,-16,7,7,1,'#a3c2a7');}
 ctx.restore();
}
function garland(ctx,ax,ay,bx,by,time,animate){
 ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo((ax+bx)/2,(ay+by)/2+9,bx,by);
 ctx.strokeStyle='#eab1c3';ctx.lineWidth=1.6;ctx.stroke();
 for(let i=0;i<6;i++){
  const t=(i+.5)/6, x=ax+(bx-ax)*t,y=ay+(by-ay)*t+9*4*t*(1-t);
  const sway=animate?Math.sin(time/720+i*.9)*1.1:0;
  const colors=['#f6acc3','#f0d69b','#d9b7e9','#fbe3c4'];
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3+sway,y+6);ctx.lineTo(x+3+sway,y+6);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();
 }
}
function drawGarden(ctx,cx,cy,plan,time,animate){
 const phase=animate?Math.sin(time/720):0;
 const frontX=cx,frontY=cy+13;
 worker(ctx,cx-27,cy-2,time,0,animate);
 if(plan.reached>=1){for(let i=0;i<5;i++){
  const x=frontX-23+i*12,y=frontY+2+(i%2)*5;
  stroke(ctx,{x,y},{x:x+phase*1.4,y:y-10},'#80b68a',1.5);
  flower(ctx,x+phase*1.4,y-11,2.9,i);
 }}
 if(plan.reached>=2){for(let i=0;i<4;i++){
  const x=cx-17+i*11,y=cy-17+Math.sin(i)*3;
  flower(ctx,x+phase*1.3,y,2.3,i+1);
 }}
 if(plan.reached>=3)garland(ctx,cx-35,cy-26,cx+28,cy-21,time,animate);
 if(plan.finished){
  worker(ctx,cx+29,cy+14,time,1,animate);
  for(let i=0;i<3;i++){
   const x=cx-8+i*8+phase*1.5,y=cy-40-Math.abs(phase)*2;
   ellipse(ctx,x-2,y,2.5,1.4,'#f8d891');ellipse(ctx,x+2,y,2.5,1.4,'#e8b2d8');
  }
 }
}
function drawFestival(ctx,cx,cy,plan,time,animate){
 const phase=animate?Math.sin(time/440):0;
 if(!plan.finished)worker(ctx,cx-38,cy+8,time,1,animate);
 if(plan.reached>=1){
  // These are decorative supplies OUTSIDE the actual 6x6 building footprint.
  round(ctx,cx+26,cy+26,15,9,2,'#d6a778');round(ctx,cx+29,cy+22,13,5,1,'#efcf9d');
  round(ctx,cx-26,cy+25,11,6,1,'#cba0bb');
 }
 if(plan.reached>=2){
  worker(ctx,cx+40,cy+22,time,2,animate);
  ellipse(ctx,cx+23,cy-22,4,3,'rgba(248,216,145,.55)');
 }
 if(plan.reached>=3){
  round(ctx,cx-27,cy+22,14,7,2,'#efcc9a');
  stroke(ctx,{x:cx-23,y:cy+21},{x:cx-23,y:cy+9},'#d8ac82',2);
 }
 if(plan.reached>=4){
  garland(ctx,cx-40,cy-36,cx+44,cy-38,time,animate);
 }
 if(plan.reached>=5){
  garland(ctx,cx-24,cy-21,cx+28,cy-20,time,animate);
  for(let i=0;i<4;i++)flower(ctx,cx-25+i*16,cy+27+(i%2)*2,3.8,i);
 }
 if(plan.finished){
  worker(ctx,cx+36,cy+22,time,0,animate);
  for(let i=0;i<4;i++){
   const x=cx-35+i*22,y=cy-43+phase*1.5;
   ellipse(ctx,x,y,2.3,2.3,i%2?'#e9a5c8':'#f8d486');
  }
 }
}
function drawCelebration(ctx,cx,cy,time,animate){
 for(let i=0;i<20;i++){
  const seed=noise(i,42),angle=i*Math.PI*2/20;
  const travel=animate?(time/1000)%1:0;
  const radius=15+seed*43+travel*12;
  const x=cx+Math.cos(angle)*radius,y=cy-27+Math.sin(angle)*radius*.46-travel*15;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle+travel*3);
  round(ctx,-2,-2,4,5,1,['#f5adcb','#f3df9f','#c8b2ea','#a2cfb2'][i%4]);ctx.restore();
 }
}
export function paintCommunityScene(canvas,cam,size,snapshot,time=Date.now(),options={}){
 if(!canvas||!cam||!size||!snapshot)return 0;
 const plan=communityVisualPlan(snapshot,options.chapter||0);
 if(!plan.length)return 0;
 const ctx=canvas.getContext('2d');if(!ctx)return 0;
 const dpr=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,2),animate=options.animate!==false;
 ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
 let visible=0;
 for(const site of plan){
  const x=site.id==='garden'?15.5:25,y=site.id==='garden'?35.5:36;
  // Iso projection copied directly from the existing city camera convention.
  const focusX=(11.5-12)*36,focusY=(11.5+12)*18;
  const px=((x-y)*36-focusX)*cam.zoom+size.width/2+cam.x;
  const py=((x+y)*18-focusY)*cam.zoom+size.height/2+cam.y;
  if(px<-120||px>size.width+120||py<-140||py>size.height+140||cam.zoom<.36)continue;
  visible++;
  ctx.save();ctx.translate(px,py);ctx.scale(cam.zoom,cam.zoom);
  if(site.id==='garden')drawGarden(ctx,0,0,site,time,animate);
  else drawFestival(ctx,0,0,site,time,animate);
  if(options.celebrate?.projectId===site.id&&time<=options.celebrate.until){
   drawCelebration(ctx,0,0,time,animate);
  }
  ctx.restore();
 }
 ctx.restore();return visible;
}
