// In-panel, read-only presentation of server-verified permanent city goals.
// No new startup request, timers or client-side reward calculations.
export function mountCityChapters(parent,{onClaim}={}){
 const section=document.createElement('section');section.className='world-chapters';
 const heading=document.createElement('div');heading.className='world-chapters__heading';
 const title=document.createElement('strong');title.textContent='📖 Книга развития города';
 const caption=document.createElement('small');caption.textContent='Большие цели · постоянные награды';
 heading.append(title,caption);section.append(heading);parent.append(section);
 let lastKey='',current={enabled:false,items:[]},busy=false;
 const update=(snapshot,loading=false)=>{
  const data=snapshot?.enabled?snapshot:{enabled:false,items:[]};
  const key=JSON.stringify([data,loading]);if(key===lastKey)return;lastKey=key;current=data;busy=loading;
  section.querySelectorAll('.world-chapter').forEach(element=>element.remove());
  if(!data.enabled){section.hidden=true;return;}section.hidden=false;
  for(const chapter of data.items||[]){
   const card=document.createElement('article');card.className='world-chapter';
   if(chapter.claimed)card.classList.add('world-chapter--claimed');
   const line=document.createElement('div');line.className='world-chapter__name';
   const name=document.createElement('b');name.textContent=chapter.title;
   const status=document.createElement('span');status.textContent=chapter.claimed?'✓ Завершено':chapter.canClaim?'🎁 Награда готова':!chapter.unlocked?'🔒 Следующая глава':'В развитии';
   line.append(name,status);card.append(line);
   const description=document.createElement('p');description.textContent=chapter.description;card.append(description);
   const list=document.createElement('div');list.className='world-chapter__steps';
   for(const step of chapter.steps||[]){
    const row=document.createElement('div');row.className='world-chapter__step';
    const name=document.createElement('span');name.textContent=`${step.complete?'✓':'○'} ${step.title}`;
    const value=document.createElement('b');value.textContent=`${Math.min(step.target,step.value)} / ${step.target}`;
    row.append(name,value);list.append(row);
   }
   card.append(list);
   const reward=document.createElement('div');reward.className='world-chapter__reward';
   const copy=document.createElement('span');copy.textContent=`🎁 ${chapter.reward?.title||'Украшение'} · 1 шт.`;reward.append(copy);
   if(chapter.canClaim){const button=document.createElement('button');button.type='button';button.textContent='Забрать';button.disabled=busy;button.addEventListener('click',()=>onClaim?.(chapter.id));reward.append(button);}
   card.append(reward);section.append(card);
  }
 };
 return {update};
}
