// Мир Зеффи — lightweight interactive guide shared by the personal and common cities.
// Only UI progression is stored. Never mutate the city, wallet, fund or rewards here.
export function createWorldTutorial({mode,steps,save,onFinish=()=>{},onStep=()=>{}}){
 if(!Array.isArray(steps)||!steps.length)throw new Error('World tutorial needs steps');
 const host=document.createElement('section');host.className='zeffi-tour';host.hidden=true;
 host.setAttribute('aria-label',mode==='story'?'Обучение общему городу':'Обучение личному городу');
 const shade=document.createElement('div');shade.className='zeffi-tour-shade';
 const panes=Array.from({length:4},()=>{const element=document.createElement('div');element.className='zeffi-tour-mask';shade.append(element);return element;});
 const halo=document.createElement('div');halo.className='zeffi-tour-focus';
 const card=document.createElement('aside');card.className='zeffi-tour-card';card.setAttribute('role','status');card.setAttribute('aria-live','polite');
 const top=document.createElement('div');top.className='zeffi-tour-top';
 const mascot=document.createElement('img');mascot.src='../assets/skins/shop/default.webp';mascot.alt='Зеффи';mascot.width=82;mascot.height=82;mascot.decoding='async';
 const content=document.createElement('div');content.className='zeffi-tour-copy';
 const kicker=document.createElement('small');const heading=document.createElement('h3');const desc=document.createElement('p');
 content.append(kicker,heading,desc);top.append(mascot,content);
 const footer=document.createElement('div');footer.className='zeffi-tour-footer';
 const skip=document.createElement('button');skip.type='button';skip.className='zeffi-tour-skip';skip.textContent='Пропустить';
 const next=document.createElement('button');next.type='button';next.className='zeffi-tour-next';
 footer.append(skip,next);card.append(top,footer);host.append(shade,halo,card);document.body.append(host);
 let stepIndex=-1,replay=false,saving=Promise.resolve(),scheduled=false,lastTarget=null,lastNext=-1;
 const active=()=>stepIndex>=0;
 function haptic(){try{window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();}catch{}}
 function current(){return steps[stepIndex];}
 function target(){const item=current();const selector=typeof item?.target==='function'?item.target():item?.target;return selector?document.querySelector(selector):null;}
 function layout(){
  scheduled=false;if(!active())return;
  const w=window.innerWidth,h=window.innerHeight,element=target();
  const b=element?.getBoundingClientRect();const visible=Boolean(b&&b.width>8&&b.height>8&&b.bottom>0&&b.top<h);
  const pad=visible?5:0;
  const left=visible?Math.max(0,b.left-pad):w/2,top=visible?Math.max(0,b.top-pad):h/2;
  const right=visible?Math.min(w,b.right+pad):w/2,bottom=visible?Math.min(h,b.bottom+pad):h/2;
  const boxes=[[0,0,w,top],[0,top,left,bottom-top],[right,top,w-right,bottom-top],[0,bottom,w,h-bottom]];
  panes.forEach((pane,i)=>{const [x,y,width,height]=boxes[i];pane.style.cssText=`left:${x}px;top:${y}px;width:${Math.max(0,width)}px;height:${Math.max(0,height)}px`;});
  halo.hidden=!visible;
  if(visible)halo.style.cssText=`left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px`;
  // Avoid overlaying the highlighted control on narrow Telegram WebViews.
  const cardH=card.offsetHeight||155,cardW=Math.min(340,w-24);
  const spaceAbove=visible?top-12:0,spaceBelow=visible?h-bottom-12:0;
  let y;
  if(visible&&spaceBelow>=cardH+9)y=bottom+11;
  else if(visible&&spaceAbove>=cardH+9)y=top-cardH-11;
  else y=Math.max(10,Math.min(h-cardH-10,visible?top-cardH/2:(h-cardH)/2));
  // Keep the card clear of the highlighted control when the viewport is crowded.
  if(visible&&y<bottom&&y+cardH>top){y=bottom<h/2?Math.min(h-cardH-9,bottom+9):Math.max(9,top-cardH-9);}
  const x=Math.max(12,Math.min(w-cardW-12,(w-cardW)/2));
  card.style.left=`${x}px`;card.style.top=`${Math.max(9,Math.min(h-cardH-9,y))}px`;
 }
 function queueLayout(){if(!scheduled&&active()){scheduled=true;requestAnimationFrame(layout);}}
 function persist(value){
  if(replay||value===lastNext)return;
  lastNext=value;
  saving=saving.catch(()=>{}).then(()=>save(mode,value)).catch(error=>{
   // Do not block game controls if the connection drops. A later step retries.
   lastNext=-1;console.warn('Zeffi tutorial progress not saved',error?.message||error);
  });
 }
 function show(){
  if(!active())return;
  const item=current();lastTarget=item.target;
  host.hidden=false;document.documentElement.classList.add('zeffi-tour-active');
  kicker.textContent=`ЗЕФФИ ПОМОГАЕТ · ${stepIndex+1} ИЗ ${steps.length}`;
  heading.textContent=item.title;desc.textContent=item.text;
  next.hidden=Boolean(item.trigger&&!item.optional);
  next.textContent=item.actionLabel||'Продолжить';
  skip.textContent=replay?'Закрыть':'Пропустить';
  item.enter?.();onStep(stepIndex);
  // Only the building list scrolls: scrolling an isometric map marker can move the scene.
  if(item.scrollCatalog){target()?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
  queueLayout();
 }
 function advance(){
  if(!active())return;
  haptic();stepIndex++;persist(Math.min(steps.length,stepIndex));
  if(stepIndex>=steps.length){stop(true);return;}
  show();
 }
 function stop(completed=false){
  if(!active())return;
  if(!completed)persist(steps.length);
  stepIndex=-1;host.hidden=true;document.documentElement.classList.remove('zeffi-tour-active');
  if(completed)onFinish();
 }
 function start(value=0,force=false){
  if(active())stop(false);
  const index=Number(value);
  if(!force&&(!Number.isInteger(index)||index>=steps.length))return false;
  replay=force;lastNext=force?steps.length:-1;
  stepIndex=force?0:Math.max(0,Math.min(steps.length-1,index));
  show();return true;
 }
 function restart(){return start(0,true);}
 function signal(name){if(active()&&current().trigger===`signal:${name}`)queueMicrotask(()=>{if(active()&&current().trigger===`signal:${name}`)advance();});}
 function click(e){
  if(!active())return;
  const item=current();if(item.trigger!=='click')return;
  // Some game handlers rebuild or remove the clicked card *before* the event bubbles
  // to document (e.g. entering placement or opening a shared-fund project).
  // Match the original event target, not the newly rendered DOM tree.
  const selector=typeof item.target==='function'?item.target():item.target;
  if(!selector||!(e.target instanceof Element)||!e.target.closest(selector))return;
  queueMicrotask(()=>{if(active()&&current()===item)advance();});
 }
 document.addEventListener('click',click);
 skip.addEventListener('click',()=>stop(false));next.addEventListener('click',()=>advance());
 window.addEventListener('resize',queueLayout,{passive:true});window.addEventListener('scroll',queueLayout,{passive:true,capture:true});
 document.addEventListener('focusin',queueLayout,{passive:true});
 return {start,restart,signal,active,currentStep:()=>stepIndex,stop,refresh:queueLayout};
}
