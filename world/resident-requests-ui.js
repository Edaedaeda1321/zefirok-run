// Personal city RC-3. The only source of mission progress/rewards is the Worker.
import {residentRequestIcon} from './resident-thoughts.js';
const REWARD_ICONS=Object.freeze({
 points:'../assets/mir_zeffi/iconScore.webp',
 treats:'../assets/mir_zeffi/zefir_currency.webp',
 coffee:'../assets/mir_zeffi/iconCoffee.webp'
});
const REWARD_LABELS={points:'очков',treats:'зефира',coffee:'кофе'};

export function mountResidentRequests(host,{onAction}){
 if(!host||typeof onAction!=='function')throw new Error('RESIDENT_REQUESTS_UI_INVALID');
 const section=document.createElement('section');section.className='resident-requests';
 section.setAttribute('aria-label','Просьбы жителей');section.hidden=true;
 const header=document.createElement('div');header.className='resident-requests__header';
 const heading=document.createElement('div');heading.className='resident-requests__heading';
 const title=document.createElement('strong');title.textContent='Просьбы жителей';
 const hint=document.createElement('small');hint.textContent='Маленькие добрые дела для города';
 heading.append(title,hint);
 const counter=document.createElement('span');counter.className='resident-requests__counter';
 header.append(heading,counter);
 const cards=document.createElement('div');cards.className='resident-requests__cards';
 const footer=document.createElement('div');footer.className='resident-requests__footer';
 section.append(header,cards,footer);
 host.insertBefore(section,host.querySelector('.city-level-row')||host.querySelector('.city-level-reward')||null);
 let snapshot=null;let signature='';let busy=false;
 function rewardLine(reward){
  const row=document.createElement('div');row.className='resident-requests__reward';
  for(const currency of ['points','treats','coffee']){
   const amount=Number(reward?.[currency]||0);
   if(!amount)continue;
   const piece=document.createElement('span');
   const picture=document.createElement('img');picture.src=REWARD_ICONS[currency];picture.alt='';picture.width=17;picture.height=17;
   const number=document.createElement('b');number.textContent=`+${amount.toLocaleString('ru-RU')}`;
   piece.title=`${amount} ${REWARD_LABELS[currency]}`;piece.append(picture,number);row.append(piece);
  }
  return row;
 }
 function render(){
  if(!snapshot?.enabled){section.hidden=true;return;}
  section.hidden=false;
  const {requests=[],daily={claimed:0,limit:2}}=snapshot;
  const reached=Number(daily.claimed)>=Number(daily.limit);
  counter.textContent=`${daily.claimed} / ${daily.limit} сегодня`;
  counter.classList.toggle('is-full',reached);
  cards.replaceChildren();
  if(!requests.length){
   const note=document.createElement('p');note.className='resident-requests__empty';
   note.textContent=snapshot.allCompleted?'Все просьбы исполнены! Жители благодарят тебя.':'Новых просьб пока нет. Развивай город и заглядывай позже.';
   cards.append(note);
  }
  for(const request of requests){
   const card=document.createElement('article');card.className='resident-requests__card';
   card.dataset.status=request.status;card.dataset.requestId=request.id;
   const top=document.createElement('div');top.className='resident-requests__row';
   const monogram=document.createElement('div');monogram.className='resident-requests__avatar';
   monogram.textContent=String(request.speaker||'Ж').slice(0,1);
   const wishIcon=residentRequestIcon(request.templateId);wishIcon.classList.add('resident-requests__wish-icon');monogram.append(wishIcon);
   const summary=document.createElement('div');summary.className='resident-requests__summary';
   const speaker=document.createElement('small');speaker.textContent=`${request.speaker||'Житель'} просит`;
   const headline=document.createElement('strong');headline.textContent=request.name;
   summary.append(speaker,headline);
   const pill=document.createElement('span');pill.className='resident-requests__pill';
   pill.textContent=request.status==='ready'?'Готово!':'В процессе';
   top.append(monogram,summary,pill);
   const words=document.createElement('p');words.className='resident-requests__words';words.textContent=`«${request.message}»`;
   const objective=document.createElement('p');objective.className='resident-requests__objective';objective.textContent=request.objective;
   const progress=document.createElement('div');progress.className='resident-requests__progress';progress.setAttribute('role','progressbar');
   progress.setAttribute('aria-label',request.objective);progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','1');
   const done=Number(request.progress)>=1;progress.setAttribute('aria-valuenow',done?'1':'0');
   const fill=document.createElement('span');fill.style.width=done?'100%':'0%';progress.append(fill);
   const bottom=document.createElement('div');bottom.className='resident-requests__bottom';
   const rewards=rewardLine(request.reward);
   const action=document.createElement('button');action.type='button';action.className='resident-requests__action';
   action.textContent=request.status==='ready'?(reached?'Завтра':'Забрать'):'Помочь';
   action.disabled=busy||(request.status==='ready'&&reached);
   action.addEventListener('click',()=>onAction(request));
   bottom.append(rewards,action);
   card.append(top,words,objective,progress,bottom);cards.append(card);
  }
  footer.textContent=reached?'Сегодня уже получены две награды. Остальные можно забрать завтра.':
   'Награды выдаёт сервер. Помощь жителям не требует обязательных покупок каждый день.';
 }
 function update(value){
  snapshot=value;
  const next=JSON.stringify(value);
  if(next!==signature){signature=next;render();}
 }
 function setBusy(flag){busy=Boolean(flag);render();}
 // Used by a map thought: reveal the canonical server-backed card, rather
 // than duplicate action/reward logic in a second UI component.
 function focusRequest(id){
  const card=[...cards.children].find(node=>node.dataset.requestId===id);
  if(!card)return false;
  for(const other of cards.children)other.classList.remove('is-attended');
  card.classList.add('is-attended');
  requestAnimationFrame(()=>card.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'}));
  return true;
 }
 return Object.freeze({update,setBusy,focusRequest,element:section});
}
