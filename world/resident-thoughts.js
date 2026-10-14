// Resident thoughts are presentation only. Requests come from the existing
// server-authoritative residentRequests envelope, never from the client map.
import { isoToScreen } from './renderer.js';

const MAX_THOUGHTS = 2; // Same bound as the live RC-3 resident request slots.
const PREFERRED_CITIZENS = Object.freeze({ 'Мия':'citizen-0', 'Лея':'citizen-1', 'Тим':'citizen-2' });
const ICONS = Object.freeze({
 flowers: '<g fill="#f5abc8" stroke="#c66a94" stroke-width="1.4"><ellipse cx="24" cy="14" rx="7" ry="10"/><ellipse cx="34" cy="23" rx="10" ry="7"/><ellipse cx="24" cy="33" rx="7" ry="10"/><ellipse cx="14" cy="23" rx="10" ry="7"/><ellipse cx="16.8" cy="16.4" rx="7" ry="8" transform="rotate(-45 16.8 16.4)"/></g><circle cx="24" cy="23" r="7.2" fill="#ffe6a2" stroke="#e5b45e" stroke-width="2"/><circle cx="21.5" cy="20.5" r="1.7" fill="#fffdf5"/>',
 park: '<path d="M23 33v9" stroke="#a47b57" stroke-width="5" stroke-linecap="round"/><path d="M11 31c-7-3-7-14 2-18 3-9 18-9 23-1 9 0 12 13 5 19-6 7-24 9-30 0Z" fill="#a0d5a1" stroke="#6ea77e" stroke-width="2"/><path d="M20 18c5-5 10-3 13-1" stroke="#e4f3c3" stroke-width="3" stroke-linecap="round" fill="none"/>',
 road: '<path d="M8 39 20 8h8l12 31Z" fill="#b9a0a5" stroke="#967984" stroke-width="2" stroke-linejoin="round"/><path d="m24 12-1 6m0 6-1 5m0 5-1 3" fill="none" stroke="#fff5cc" stroke-width="2.8" stroke-dasharray="4 4" stroke-linecap="round"/><path d="M6 39h36" stroke="#f5d7af" stroke-width="3" stroke-linecap="round"/>',
 comfort: '<path d="M24 39C10 30 6 24 6 17 6 7 18 5 24 14 30 5 42 7 42 17c0 7-4 13-18 22Z" fill="#f3a2bb" stroke="#ce638f" stroke-width="2"/><path d="m36 5 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#ffdf8e"/><path d="m10 33 1.4 3 3 1.4-3 1.5L10 42l-1.5-3.1-3-1.5 3-1.4Z" fill="#f6cf78"/>',
 cafe: '<path d="M9 15h28v12a13 13 0 0 1-13 13H22A13 13 0 0 1 9 27Z" fill="#fff2df" stroke="#cf8c93" stroke-width="2"/><path d="M37 19h3c9 0 9 12 0 12h-3" fill="none" stroke="#cf8c93" stroke-width="3.5"/><path d="M16 11c-3-4 3-6 0-9m9 9c-3-4 3-6 0-9" stroke="#c39c7b" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M9 26h28" stroke="#f0c5ce" stroke-width="2"/><path d="M17 23c1-3 4-3 6-1 2-2 5-2 6 1-1 3-6 6-6 6s-5-3-6-6Z" fill="#ea8eaf"/>',
 neighbors: '<path d="M7 22 24 8 41 22v19H7Z" fill="#fff1dc" stroke="#ce9d89" stroke-width="2" stroke-linejoin="round"/><path d="M5 22 24 6l19 16" fill="none" stroke="#cc7594" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="28" width="10" height="13" rx="3" fill="#dfa2b6" stroke="#c37b95" stroke-width="1.5"/><rect x="10" y="24" width="7" height="7" rx="2" fill="#b1dfdc"/><rect x="32" y="24" width="7" height="7" rx="2" fill="#b1dfdc"/>'
});
const ICON_ROOT = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">';
export function residentRequestIcon(templateId){
 const span=document.createElement('span');span.className='resident-thought-icon';span.setAttribute('aria-hidden','true');
 // All markup comes from this closed, static icon dictionary; no server HTML.
 span.innerHTML=ICON_ROOT+(ICONS[templateId]||ICONS.comfort)+'</svg>';
 return span;
}

// The city currently has anonymous visual walkers, not persistent named NPC
// records. A stable visual mapping is used, without inventing population.
export function assignResidentThoughts(requests, routes){
 if(!Array.isArray(requests)||!Array.isArray(routes)||!routes.length)return [];
 const available=routes.map(route=>typeof route==='string'?route:route?.id).filter(id=>typeof id==='string');
 const used=new Set(),assigned=[];
 const pending=requests.filter(request=>request&&typeof request.id==='string'&&['active','ready'].includes(request.status))
  .slice(0,MAX_THOUGHTS).sort((a,b)=>(b.status==='ready')-(a.status==='ready'));
 for(const request of pending){
  const preferred=PREFERRED_CITIZENS[request.speaker];
  const id=(preferred&&available.includes(preferred)&&!used.has(preferred))?preferred:available.find(value=>!used.has(value));
  if(!id)break;
  used.add(id);assigned.push({request,citizenId:id});
 }
 return assigned;
}

const THOUGHT_W=86,THOUGHT_H=79;
const overlaps=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;

export function mountResidentThoughts(host,{onSelect}){
 if(!host||typeof onSelect!=='function')throw new Error('RESIDENT_THOUGHTS_INVALID');
 const layer=document.createElement('div');layer.className='resident-thoughts';layer.setAttribute('aria-label','Пожелания жителей на карте');
 host.append(layer);
 const blockers=['.topbar','.world-nav','.map-heading','#cityMetrics','.world-tools','.zoom-tools','#bottomPanel','#editActions','#selectionPanel']
  .map(selector=>document.querySelector(selector)).filter(Boolean);
 const nodes=new Map();let requests=[];let disabled=true;
 function update(snapshot){
  disabled=!snapshot?.enabled;
  requests=disabled?[]:(Array.isArray(snapshot.requests)?snapshot.requests:[]).slice(0,MAX_THOUGHTS);
  // There are never more than two nodes, and a request is keyed by its server id.
  const validIds=new Set(requests.map(request=>request.id));
  for(const [id,node] of nodes)if(!validIds.has(id)){node.remove();nodes.delete(id);}
 }
 function nodeFor(request){
  let button=nodes.get(request.id);
  if(!button){
   button=document.createElement('button');button.type='button';button.className='resident-thought';button.hidden=true;
   const body=document.createElement('span');body.className='resident-thought__body';
   const iconBox=document.createElement('span');iconBox.className='resident-thought__symbol';iconBox.append(residentRequestIcon(request.templateId));
   const caption=document.createElement('span');caption.className='resident-thought__caption';
   const status=document.createElement('span');status.className='resident-thought__status';status.setAttribute('aria-hidden','true');
   const tail=document.createElement('span');tail.className='resident-thought__tail';tail.setAttribute('aria-hidden','true');
   body.append(iconBox,caption,status);button.append(body,tail);
   button.addEventListener('click',()=>{
    const current=requests.find(item=>item.id===request.id);
    if(current)onSelect(current);
   });
   nodes.set(request.id,button);layer.append(button);
  }
  // Snapshot updates may change a request from active to ready.
  button.dataset.status=request.status;
  button.querySelector('.resident-thought__caption').textContent=request.speaker||'Житель';
  button.querySelector('.resident-thought__status').textContent=request.status==='ready'?'✓':'!';
  button.setAttribute('aria-label',`${request.speaker||'Житель'}: ${request.objective||request.name||'Просьба'}. Открыть просьбу`);
  button.title=request.name||'Просьба жителя';
  return button;
 }
 function hideAll(){for(const node of nodes.values())node.hidden=true;}
 function paint(citizens,routes,camera,size,{visible=true}={}){
  if(disabled||!visible||!requests.length||!Array.isArray(citizens)||!citizens.length||!routes?.length){hideAll();return;}
  const container=host.getBoundingClientRect();
  const forbidden=blockers.map(element=>element.getBoundingClientRect())
   .filter(rect=>rect.width>0&&rect.height>0)
   .map(rect=>({left:rect.left-container.left-3,top:rect.top-container.top-3,right:rect.right-container.left+3,bottom:rect.bottom-container.top+3}));
  const byId=new Map(citizens.map(citizen=>[citizen.id,citizen]));
  const occupied=[];const shown=new Set();
  for(const {request,citizenId} of assignResidentThoughts(requests,routes)){
   const button=nodeFor(request),citizen=byId.get(citizenId);
   if(!citizen){button.hidden=true;continue;}
   const projected=isoToScreen(citizen.x,citizen.y,size,camera);
   // Head at ~41 logical pixels above the ground; the tail points to it.
   const left=Math.round(projected.x-THOUGHT_W/2),top=Math.round(projected.y-41*camera.zoom-THOUGHT_H);
   const box={left,top,right:left+THOUGHT_W,bottom:top+THOUGHT_H};
   if(top<8||left<5||box.right>size.width-5||box.bottom>size.height-8||
    forbidden.some(rect=>overlaps(box,rect))||occupied.some(rect=>overlaps(box,rect,8))){button.hidden=true;continue;}
   button.style.transform=`translate3d(${left}px,${top}px,0)`;
   button.hidden=false;occupied.push(box);shown.add(request.id);
  }
  for(const [id,node] of nodes)if(!shown.has(id))node.hidden=true;
 }
 return Object.freeze({update,paint,element:layer});
}
