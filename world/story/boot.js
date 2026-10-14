// Hosted entry never trusts URL flags, localStorage or initDataUnsafe.
// Only a signed, allowlisted Telegram session may launch the closed Release Candidate.
const $=id=>document.getElementById(id);
let pending=false;
function acquireInitData(){
 const direct=String(window.Telegram?.WebApp?.initData||'');
 if(direct)return Promise.resolve(direct);
 if(window.parent===window)return Promise.resolve('');
 return new Promise(resolve=>{
  const requestId=`world-auth-${crypto.randomUUID()}`;
  let finished=false;
  function done(value){if(finished)return;finished=true;clearTimeout(timer);window.removeEventListener('message',receive);resolve(value);}
  function receive(event){
   if(event.source!==window.parent||event.origin!==location.origin)return;
   if(event.data?.type!=='zeffi-world-init-data'||event.data?.requestId!==requestId)return;
   done(typeof event.data.initData==='string'?event.data.initData:'');
  }
  const timer=setTimeout(()=>done(''),4000);
  window.addEventListener('message',receive);
  window.parent.postMessage({type:'zeffi-world-request-init-data',requestId},location.origin);
 });
}
async function launch(){
 if(pending)return;pending=true;$('accessRetry').hidden=true;
 $('accessTitle').textContent='Проверяем доступ…';
 try{
  const initData=await acquireInitData();
  if(!initData)throw new Error('Откройте «Мир Зеффи» из «Сладкого Забега» в Telegram. Нужен вход в Telegram и доступ к Миру Зеффи.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  let payload;
  try{
   const response=await fetch('/api/world/story-access',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',signal:controller.signal,body:JSON.stringify({initData})});
   payload=await response.json().catch(()=>null);
   if(!response.ok||payload?.ok!==true||payload?.access!=='tester'||payload?.mode!=='server-story'||payload?.version!=='story-rc2'||payload?.globalSync!==true)throw new Error(payload?.error||'Общий город пока недоступен для вашего аккаунта.');
  }finally{clearTimeout(timer);}
  const {startStoryWorld}=await import('./app.js?v=rc-community5');
  await startStoryWorld({mode:'tester',initData});
  if(window.parent!==window)window.parent.postMessage({type:'zefirok-world-ui-ready'},location.origin);
 }catch(error){
  $('accessTitle').textContent='Город пока недоступен';
  $('accessMessage').textContent=error.name==='AbortError'?'Сервер не ответил вовремя. Проверьте соединение и повторите.':error.message||'Не удалось открыть карту.';
  $('accessRetry').hidden=false;
 }finally{pending=false;}
}
$('accessRetry').addEventListener('click',launch);
void launch();
