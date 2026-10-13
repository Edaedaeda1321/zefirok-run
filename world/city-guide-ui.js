// UI for read-only RC-2 advice. Does not submit any game transactions.
const PRICE_ASSETS=Object.freeze({
 points:'../assets/mir_zeffi/iconScore.webp',
 coffee:'../assets/mir_zeffi/iconCoffee.webp',
 treats:'../assets/mir_zeffi/zefir_currency.webp'
});
const PRICE_LABELS=Object.freeze({points:'очков',coffee:'кофе',treats:'зефира'});

export function mountCityGuide(host,{nameOf,onAction}){
 if(!host||typeof nameOf!=='function'||typeof onAction!=='function')throw new Error('CITY_GUIDE_UI_INVALID');
 const panel=document.createElement('section');panel.className='city-next-goal';
 panel.setAttribute('aria-label','Следующий шаг развития города');
 const head=document.createElement('div');head.className='city-next-goal__head';
 const mascot=document.createElement('img');mascot.src='../assets/skins/shop/default.webp';mascot.alt='';
 mascot.width=45;mascot.height=45;mascot.decoding='async';mascot.loading='lazy';
 const headings=document.createElement('div');
 const eyebrow=document.createElement('span');eyebrow.className='city-next-goal__eyebrow';eyebrow.textContent='ЗЕФФИ СОВЕТУЕТ';
 const title=document.createElement('strong');title.className='city-next-goal__title';
 headings.append(eyebrow,title);head.append(mascot,headings);
 const detail=document.createElement('p');detail.className='city-next-goal__detail';
 const price=document.createElement('div');price.className='city-next-goal__price';
 const button=document.createElement('button');button.className='city-next-goal__button';
 button.type='button';
 let active=null;
 button.addEventListener('click',()=>{if(active)onAction(active);});
 panel.append(head,detail,price,button);
 host.insertBefore(panel,host.querySelector('.city-level-row')||host.firstChild);
 let rendered='';
 function update(advice){
  const signature=JSON.stringify({...advice,remaining:undefined});
  if(signature===rendered)return;
  rendered=signature;active=advice;
  const name=advice.itemId?nameOf(advice.itemId):'';
  title.textContent=advice.type==='build'?`Построй: ${name}`:
   advice.type==='earn'?`На пути к ${name}`:advice.title;
  detail.textContent=advice.type==='wait'&&name?`Заверши «${name}» — результат появится в статистике после строительства.`:advice.detail;
  price.replaceChildren();
  if(advice.price && advice.type!=='paused'){
   for(const key of ['points','coffee','treats']){
    const amount=Number(advice.price[key]||0);
    if(!amount)continue;
    const piece=document.createElement('span');piece.className='city-next-goal__currency';
    const img=document.createElement('img');img.src=PRICE_ASSETS[key];img.alt='';img.width=16;img.height=16;img.decoding='async';
    const label=document.createElement('b');label.textContent=amount.toLocaleString('ru-RU');
    piece.setAttribute('aria-label',`${amount} ${PRICE_LABELS[key]}`);
    piece.append(img,label);price.append(piece);
   }
   if(advice.type==='earn' && advice.missing){
    const note=document.createElement('span');note.className='city-next-goal__shortage';
    const portions=[];
    for(const key of ['points','coffee','treats'])if(advice.missing[key])portions.push(`${advice.missing[key].toLocaleString('ru-RU')} ${PRICE_LABELS[key]}`);
    note.textContent=portions.length?'Не хватает: '+portions.join(', '):'';
    price.append(note);
   }
  }
  button.textContent=advice.button||'';
  button.hidden=!advice.button;
  button.disabled=advice.type==='paused';
  panel.dataset.kind=advice.type;
 }
 return Object.freeze({update,element:panel});
}
