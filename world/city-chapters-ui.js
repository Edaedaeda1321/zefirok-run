// Permanent city chapter UI. The Worker alone authorizes progress and claims.
// The module consumes the already loaded World state: no D1 requests or timers.
import {WORLD_REWARD_DECOR_BY_ID} from './decor-rewards.js';

const ART_ROOT='/assets/mir_zeffi/';
const CHAPTER_ART=Object.freeze({
 'warm-welcome':'icon_house.webp',
 'coffee-capital':'icon_zavedenia.webp',
 'legendary-city':'icon_Mir_zeffi_world_stranitca.webp',
 'flower-neighborhood':'icon_parks.webp',
 'city-of-dreams':'icon_all_stroika.webp'
});
const GOAL_ART=Object.freeze({
 residents:'icon_house.webp',
 parks:'icon_parks.webp',
 roads:'icon_all_stroika.webp',
 comfort:'icon_landshaft.webp',
 shops:'icon_zavedenia.webp',
 decorKinds:'icon_decor.webp',
 cityLevel:'icon_Mir_zeffi_world_stranitca.webp'
});
const FALLBACK_ART=`${ART_ROOT}icon_decor.webp`;

function element(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function art(src,cssClass,alt=''){
 const img=element('img',cssClass);
 img.src=src;img.alt=alt;img.loading='lazy';img.decoding='async';
 img.addEventListener('error',()=>{
  if(img.src.endsWith('/icon_decor.webp')){img.hidden=true;return;}
  img.src=FALLBACK_ART;
 },{once:true});
 return img;
}
function count(value){
 return Math.max(0,Math.floor(Number.isFinite(Number(value))?Number(value):0));
}
function goalsDone(chapter){
 return (chapter.steps||[]).filter(step=>step.complete).length;
}
function statusOf(chapter){
 if(chapter.claimed)return {key:'claimed',text:'Завершена'};
 if(chapter.canClaim)return {key:'ready',text:'Награда готова'};
 if(!chapter.unlocked)return {key:'locked',text:'Закрыта'};
 return {key:'active',text:'В развитии'};
}
function ensureStylesheet(){
 // world/index.html references this stylesheet already; production world.html
 // historically did not. Mount it once from the existing trusted module URL.
 // The version query also avoids old Telegram WebView stylesheets staying stale.
 const cssUrl=new URL('./city-chapters.css?v=world-chapters-v2',import.meta.url).href;
 const existing=[...document.querySelectorAll('link[rel="stylesheet"]')]
  .find(link=>link.href.includes('/city-chapters.css'));
 if(existing){if(existing.href!==cssUrl)existing.href=cssUrl;return;}
 const link=document.createElement('link');
 link.rel='stylesheet';link.href=cssUrl;
 link.dataset.zeffiCityChapters='v2';
 document.head.append(link);
}
function rewardArt(chapter){
 // Never render a user-controlled external image URL. The allowlist is the same
 // already used for server-authorized decor rewards in Battle Pass and CC.
 const id=String(chapter.reward?.id||'');
 return WORLD_REWARD_DECOR_BY_ID[id]?.imageUrl||FALLBACK_ART;
}

export function mountCityChapters(parent,{onClaim}={}){
 if(!parent)throw new Error('CITY_CHAPTERS_PARENT_REQUIRED');
 ensureStylesheet();
 const section=element('section','world-chapters');
 section.setAttribute('aria-label','Книга развития города');
 const head=element('div','world-chapters__heading');
 const intro=element('div','world-chapters__intro');
 const eyebrow=element('span','world-chapters__eyebrow','ТВОЙ ПУТЬ');
 const title=element('strong','world-chapters__title','Книга развития города');
 const caption=element('small','world-chapters__caption','Пять глав · постоянные награды');
 intro.append(eyebrow,title,caption);
 const score=element('div','world-chapters__score');
 head.append(intro,score);
 const progress=element('div','world-chapters__progress');
 const track=element('div','world-chapters__track');
 track.setAttribute('role','progressbar');
 track.setAttribute('aria-valuemin','0');
 const chaptersHost=element('div','world-chapters__cards');
 progress.append(track);
 section.append(head,progress,chaptersHost);
 parent.append(section);

 let lastKey='',snapshot={enabled:false,items:[]},busy=false;
 let expandedId='',primaryId='',manualSelection=false;

 function paint(){
  const chapters=snapshot.items||[];
  const claimed=chapters.filter(chapter=>chapter.claimed).length;
  score.replaceChildren(
   element('strong','world-chapters__score-number',`${claimed} / ${chapters.length}`),
   element('span','world-chapters__score-copy','глав завершено')
  );
  track.replaceChildren();
  track.setAttribute('aria-valuemax',String(chapters.length));
  track.setAttribute('aria-valuenow',String(claimed));
  track.setAttribute('aria-label',`Завершено ${claimed} из ${chapters.length} глав`);
  for(const chapter of chapters){
   const segment=element('span',`world-chapters__segment${chapter.claimed?' is-claimed':''}${chapter.id===primaryId?' is-current':''}`);
   track.append(segment);
  }
  chaptersHost.replaceChildren();
  chapters.forEach((chapter,index)=>{
   const isOpen=expandedId===chapter.id;
   const status=statusOf(chapter);
   const done=goalsDone(chapter);
   const total=(chapter.steps||[]).length;
   const completed=chapter.claimed?total:done;
   const percent=total?Math.round(100*completed/total):0;
   const card=element('article',`world-chapter world-chapter--${status.key}${isOpen?' is-open':''}`);
   card.dataset.chapterId=chapter.id;
   card.dataset.state=status.key;
   card.dataset.expanded=String(isOpen);

   const toggle=element('button','world-chapter__toggle');
   toggle.type='button';
   toggle.setAttribute('aria-expanded',String(isOpen));
   toggle.setAttribute('aria-label',`${isOpen?'Свернуть':'Открыть'} главу ${index+1}: ${chapter.title}`);
   const detailId=`world-chapter-details-${index+1}`;
   toggle.setAttribute('aria-controls',detailId);
   const chapterIcon=art(`${ART_ROOT}${CHAPTER_ART[chapter.id]||'icon_decor.webp'}`,'world-chapter__art');
   chapterIcon.width=52;chapterIcon.height=52;
   const info=element('div','world-chapter__info');
   const lead=element('span','world-chapter__label',`ГЛАВА ${String(index+1).padStart(2,'0')}`);
   const name=element('strong','world-chapter__title',chapter.title);
   const meta=element('div','world-chapter__meta');
   const statusLabel=element('span',`world-chapter__state world-chapter__state--${status.key}`,status.text);
   const completionLabel=element('span','world-chapter__completion',
    chapter.claimed?'Награда получена':`${done} из ${total} целей`);
   meta.append(statusLabel,completionLabel);
   info.append(lead,name,meta);
   const affordance=element('span','world-chapter__affordance',isOpen?'Свернуть':'Подробнее');
   toggle.append(chapterIcon,info,affordance);
   toggle.addEventListener('click',()=>{
    expandedId=isOpen?'':chapter.id;
    manualSelection=true;
    paint();
    const current=[...chaptersHost.querySelectorAll('.world-chapter')].find(card=>card.dataset.chapterId===chapter.id);
    current?.querySelector('.world-chapter__toggle')?.focus({preventScroll:true});
    if(!isOpen){
     const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
     current?.scrollIntoView?.({block:'nearest',behavior:reduced?'auto':'smooth'});
    }
   });
   card.append(toggle);

   if(isOpen){
    const detail=element('div','world-chapter__detail');
    detail.id=detailId;
    const description=element('p','world-chapter__description',chapter.description);
    detail.append(description);
    const goalHeader=element('div','world-chapter__goals-header');
    goalHeader.append(
     element('span','world-chapter__goals-name','Цели главы'),
     element('b','world-chapter__goals-count',`${completed} / ${total}`)
    );
    const overall=element('div','world-chapter__overall');
    overall.setAttribute('role','progressbar');
    overall.setAttribute('aria-label',`Прогресс главы: ${completed} из ${total}`);
    overall.setAttribute('aria-valuemin','0');
    overall.setAttribute('aria-valuemax',String(total));
    overall.setAttribute('aria-valuenow',String(completed));
    const overallFill=element('span','world-chapter__overall-fill');
    overallFill.style.width=`${percent}%`;
    overall.append(overallFill);
    detail.append(goalHeader,overall);
    if(chapter.claimed){
     detail.append(element('p','world-chapter__history','Глава завершена. Текущие показатели города могут измениться после получения награды.'));
    }
    const goalList=element('div','world-chapter__steps');
    for(const step of chapter.steps||[]){
     const fulfilled=Boolean(step.complete);
     const value=count(step.value),target=count(step.target);
     const effective=chapter.claimed?target:Math.min(value,target);
     const goal=element('div',`world-chapter__step${fulfilled?' is-done':''}`);
     const goalArt=art(`${ART_ROOT}${GOAL_ART[step.metric]||'icon_decor.webp'}`,'world-chapter__step-icon');
     goalArt.width=38;goalArt.height=38;
     const copy=element('div','world-chapter__step-content');
     const line=element('div','world-chapter__step-line');
     const stepTitle=element('span','world-chapter__step-title',step.title);
     const valueLabel=element('b','world-chapter__step-value',`${Math.min(value,target)} / ${target}`);
     line.append(stepTitle,valueLabel);
     const stepTrack=element('div','world-chapter__step-track');
     stepTrack.setAttribute('role','progressbar');
     stepTrack.setAttribute('aria-label',step.title);
     stepTrack.setAttribute('aria-valuemin','0');
     stepTrack.setAttribute('aria-valuemax',String(target));
     stepTrack.setAttribute('aria-valuenow',String(Math.min(value,target)));
     const stepFill=element('span','world-chapter__step-fill');
     stepFill.style.width=`${target?Math.min(100,Math.round(100*effective/target)):100}%`;
     stepTrack.append(stepFill);
     copy.append(line,stepTrack);
     goal.append(goalArt,copy);
     goalList.append(goal);
    }
    detail.append(goalList);
    const reward=element('div','world-chapter__reward');
    const rewardImg=art(rewardArt(chapter),'world-chapter__reward-art');
    rewardImg.width=74;rewardImg.height=74;
    const rewardText=element('div','world-chapter__reward-info');
    rewardText.append(
     element('small','world-chapter__reward-label','Награда главы'),
     element('strong','world-chapter__reward-title',chapter.reward?.title||'Украшение города'),
     element('span','world-chapter__reward-quantity',`${Math.max(1,count(chapter.reward?.amount))} предмет декора`)
    );
    const rewardAction=element('div','world-chapter__reward-action');
    if(chapter.canClaim){
     const claim=element('button','world-chapter__claim','Забрать');
     claim.type='button';claim.disabled=busy;
     claim.addEventListener('click',()=>{
      if(claim.disabled)return;
      claim.disabled=true;
      onClaim?.(chapter.id);
     });
     rewardAction.append(claim);
    }else{
     rewardAction.append(element('small','world-chapter__reward-hint',
      chapter.claimed?'Получена':!chapter.unlocked?'После предыдущей главы':'Выполни все условия'));
    }
    reward.append(rewardImg,rewardText,rewardAction);
    detail.append(reward);
    card.append(detail);
   }else{
    const narrow=element('div','world-chapter__collapsed');
    const thumb=art(rewardArt(chapter),'world-chapter__collapsed-art');
    thumb.width=38;thumb.height=38;
    narrow.append(thumb,element('span','world-chapter__collapsed-copy',
     chapter.claimed?'Этап пройден · награда получена':
      chapter.canClaim?'Все цели выполнены · забери награду':
       !chapter.unlocked?'Откроется после предыдущей главы':'Продолжай развитие города'));
    card.append(narrow);
   }
   chaptersHost.append(card);
  });
 }

 function update(value,loading=false){
  const next=value?.enabled?value:{enabled:false,items:[]};
  const key=JSON.stringify([next,Boolean(loading)]);
  if(key===lastKey)return;
  lastKey=key;snapshot=next;busy=Boolean(loading);
  if(!next.enabled){section.hidden=true;return;}
  section.hidden=false;
  const ids=new Set((next.items||[]).map(ch=>ch.id));
  const current=next.items.find(ch=>ch.unlocked&&!ch.claimed)
   ||next.items.find(ch=>ch.canClaim)
   ||next.items.find(ch=>!ch.claimed)
   ||next.items.at(-1);
  const nextPrimary=current?.id||'';
  if((expandedId&&!ids.has(expandedId)) || (!manualSelection&&!expandedId) ||
     (nextPrimary!==primaryId && (!manualSelection||!expandedId||expandedId===primaryId))){
   expandedId=nextPrimary;
   manualSelection=false;
  }
  primaryId=nextPrimary;
  paint();
 }
 return Object.freeze({update,element:section});
}
