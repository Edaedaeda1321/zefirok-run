(()=>{
  'use strict';
  if(window.__ZEFIROK_GAME_TASKS_UI_V9__)return;
  window.__ZEFIROK_GAME_TASKS_UI_V9__=true;

  const root=document.querySelector('#zefirok-maltipoo-runner');
  const screen=root?.querySelector('[data-screen="tasks"]');
  const entry=root?.querySelector('[data-tasks-open]');
  if(!root||!screen||!entry)return;

  const API_STATE='/api/tasks/state';
  const API_CLAIM='/api/tasks/claim';
  const API_READ='/api/tasks/read';
  const CACHE_MS=15000;
  const REQUEST_TIMEOUT_MS=12000;
  const FILTERS=new Set(['all','daily','event']);
  let payload=null,filter='all',loading=false,inflight=null,readInflight=null,readQueued=false,lastFreshAt=0,serverOffsetMs=0,claimingKey='',toastTimer=0,timerTick=0;

  const host=()=>window.zefirokTaskHost||{};
  const auth=()=>String(host().auth?.()||window.Telegram?.WebApp?.initData||'');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const whole=value=>Math.max(0,Math.floor(num(value)));
  const list=value=>Array.isArray(value)?value:[];
  const nowServerMs=()=>Date.now()+serverOffsetMs;
  const requestId=()=>`tasks-ui:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,9)}`;

  function isRunning(){try{return Boolean(host().running?.());}catch{return false;}}
  function taskId(task){return `${String(task?.kind||'task')}:${String(task?.key||'')}:${String(task?.cycleKey||'')}`;}
  function taskRatio(task){const target=Math.max(1,whole(task?.target));return Math.max(0,Math.min(1,whole(task?.progress)/target));}
  function isReady(task){return Boolean(task?.complete&&!task?.claimed);}
  function isDaily(task){return String(task?.mode||'')==='daily';}
  function taskGroup(task){return isDaily(task)?'daily':'event';}
  function taskIcon(task){if(task?.kind==='series')return '🎯';if(isDaily(task))return '🔥';return '✨';}
  function taskTag(task){if(task?.kind==='series')return 'Цепочка';if(isDaily(task))return 'Сегодня';return 'Событие';}
  function fmt(n){try{return whole(n).toLocaleString('ru-RU');}catch{return String(whole(n));}}
  function taskProgressValue(task,value){
    const amount=whole(value);
    if(String(task?.progressFormat||'')!=='duration')return fmt(amount);
    if(amount<60)return `${amount} сек`;
    const hours=Math.floor(amount/3600),minutes=Math.floor((amount%3600)/60),seconds=amount%60;
    if(hours)return `${hours} ч${minutes?` ${minutes} мин`:''}`;
    if(minutes)return `${minutes} мин${seconds?` ${seconds} сек`:''}`;
    return `${seconds} сек`;
  }
  function plural(n,one,two,five){const value=Math.abs(whole(n))%100;const tail=value%10;if(value>10&&value<20)return five;if(tail===1)return one;if(tail>=2&&tail<=4)return two;return five;}

  function timeLeft(endsAt){
    const seconds=Math.floor(num(endsAt)-nowServerMs()/1000);
    if(!endsAt||seconds<=0)return '';
    if(seconds<3600)return `${Math.max(1,Math.ceil(seconds/60))} мин`;
    if(seconds<86400){const hours=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60);return mins?`${hours} ч ${mins} мин`:`${hours} ч`;}
    const days=Math.floor(seconds/86400),hours=Math.floor((seconds%86400)/3600);return hours?`${days} д ${hours} ч`:`${days} д`;
  }

  function filteredTasks(){
    const tasks=list(payload?.tasks);
    if(filter==='daily')return tasks.filter(isDaily);
    if(filter==='event')return tasks.filter(task=>!isDaily(task));
    return tasks;
  }

  function nearestTask(){
    const tasks=list(payload?.tasks).filter(task=>!task?.claimed);
    const ready=tasks.find(isReady);if(ready)return ready;
    return tasks.sort((a,b)=>taskRatio(b)-taskRatio(a))[0]||null;
  }

  function toast(text){
    let node=screen.querySelector('.gt-toast');
    if(!node){node=document.createElement('div');node.className='gt-toast';node.setAttribute('role','status');screen.append(node);}
    node.textContent=String(text||'');node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2600);
  }

  async function post(path,body={}){
    const initData=auth();
    if(!initData)throw new Error('Открой «Сладкий Забег» через Telegram, чтобы загрузить задания.');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData,requestId:requestId(),...body}),cache:'no-store',credentials:'same-origin',signal:controller.signal});
      let data=null;try{data=await response.json();}catch{}
      if(!response.ok||data?.ok===false)throw new Error(String(data?.error||`Ошибка ${response.status}`));
      return data||{};
    }catch(error){
      if(error?.name==='AbortError')throw new Error('Сервер отвечает слишком долго. Повтори проверку — награда не потеряется.');
      throw error;
    }finally{clearTimeout(timer);}
  }

  async function markVisibleCompletedRead(){
    if(screen.hidden||!payload)return null;
    if(readInflight){readQueued=true;return readInflight;}
    const tasks=filteredTasks().filter(task=>Boolean(task?.unread&&task?.complete&&!task?.claimed));
    if(!tasks.length)return null;
    const notices=tasks.map(task=>({kind:String(task?.kind||'task'),key:String(task?.key||''),cycleKey:String(task?.cycleKey||'')}));
    const ids=new Set(tasks.map(taskId));
    readInflight=(async()=>{
      try{
        await post(API_READ,{notices});
        for(const task of list(payload?.tasks)){if(ids.has(taskId(task)))task.unread=false;}
        return true;
      }catch(error){
        console.warn('game tasks read-state update failed',error);
        return false;
      }finally{
        readInflight=null;
        if(readQueued){readQueued=false;void markVisibleCompletedRead();}
      }
    })();
    return readInflight;
  }

  function updateEntry(){
    entry.hidden=isRunning();
    const summary=entry.querySelector('[data-tasks-summary]');
    const badge=entry.querySelector('[data-tasks-badge]');
    const ready=whole(payload?.readyCount),active=whole(payload?.activeCount);
    entry.classList.toggle('has-ready',ready>0);
    if(summary){
      if(ready>0&&active>0)summary.textContent=`${active} ${plural(active,'активное задание','активных задания','активных заданий')} · ${ready} ${plural(ready,'награда готова','награды готовы','наград готово')}`;
      else if(ready>0)summary.textContent=`${ready} ${plural(ready,'награда готова','награды готовы','наград готово')}`;
      else if(active>0)summary.textContent=`${active} ${plural(active,'активное задание','активных задания','активных заданий')}`;
      else summary.textContent='Цели, награды и XP профиля';
    }
    if(badge){badge.hidden=ready<=0;badge.textContent=String(Math.min(99,ready));}
  }

  function skeleton(){
    return `<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Цели и прогресс профиля</span></div><button class="gt-icon-button gt-refresh is-busy" type="button" aria-label="Обновляем задания" disabled><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg></button></div><div class="gt-skeleton" aria-label="Загружаем задания"><i></i><i></i><i></i></div></div>`;
  }

  function profileMarkup(){
    const p=payload?.profile||{};
    const level=Math.max(1,whole(p.level)||1),xp=whole(p.xp),needed=whole(p.needed),progress=whole(p.progress);
    const pct=needed?Math.max(0,Math.min(100,(progress/needed)*100)):100;
    const ready=whole(payload?.readyCount),active=whole(payload?.activeCount);
    return `<section class="gt-profile-card" aria-label="Прогресс профиля"><div class="gt-profile-top"><div><span class="gt-level-label">Уровень профиля</span><div class="gt-level"><strong>${level}</strong><span>${needed?'уровень':'максимум'}</span></div></div><span class="gt-profile-xp-total">⭐ ${fmt(xp)} XP</span></div><div class="gt-xp-track" role="progressbar" aria-valuemin="0" aria-valuemax="${needed||1}" aria-valuenow="${needed?Math.min(progress,needed):1}"><span class="gt-xp-fill" style="width:${pct.toFixed(1)}%"></span></div><div class="gt-xp-caption"><span>${needed?`${fmt(progress)} / ${fmt(needed)} XP`:'Максимальный уровень'}</span><span>${needed?`До следующего: ${fmt(Math.max(0,needed-progress))} XP`:'Прогресс продолжается'}</span></div><div class="gt-overview"><div class="gt-overview-item${ready?' is-ready':''}"><b>${ready}</b><span>готово</span></div><div class="gt-overview-item"><b>${active}</b><span>активно</span></div><div class="gt-overview-item"><b>${list(payload?.tasks).length}</b><span>всего</span></div></div></section>`;
  }

  function nextMarkup(){
    const task=nearestTask();
    if(!task)return '';
    const ready=isReady(task),pending=Boolean(task?.pending)&&!task?.claimed,left=Math.max(0,whole(task.target)-whole(task.progress));
    const status=pending?'Проверить выдачу':ready?'Забрать':left?`Осталось ${taskProgressValue(task,left)}`:'Проверить';
    const extra=timeLeft(task.endsAt);
    return `<section class="gt-next${ready?' is-ready':''}" aria-label="Ближайшая цель"><span class="gt-next-icon">${ready?'🎁':'🐾'}</span><span class="gt-next-copy"><small>${ready?'Награда готова':'Ближайшая цель'}</small><strong>${esc(task.title||'Задание')}</strong><span>${esc(ready?(task.rewardLabel||'Можно получить награду'):(extra?`До конца: ${extra}`:(task.description||'Продолжай играть')))}</span></span><span class="gt-next-status">${esc(status)}</span></section>`;
  }

  function taskMarkup(task,index){
    const progress=whole(task.progress),target=Math.max(1,whole(task.target)),pct=Math.max(0,Math.min(100,(progress/target)*100));
    const ready=isReady(task),claimed=Boolean(task.claimed),pending=Boolean(task.pending)&&!claimed;
    const currentClaim=claimingKey===taskId(task);
    const end=timeLeft(task.endsAt);
    let action='';
    if(ready&&!pending&&!claimed)action=`<button class="gt-claim" data-gt-claim="${index}" type="button"${currentClaim?' disabled':''}>${currentClaim?'Получаем…':'🎁 Получить'}</button>`;
    else if(pending)action=`<button class="gt-state is-ready gt-state-action" data-gt-claim="${index}" type="button"${currentClaim?' disabled':''}>${currentClaim?'Проверяем…':'Проверить выдачу'}</button>`;
    else if(claimed)action='<span class="gt-state">✓ Получено</span>';
    else action='<span class="gt-state">В процессе</span>';
    const steps=list(task.steps).slice(0,6);
    const series=steps.length?`<div class="gt-series" aria-label="Этапы цепочки">${steps.map(step=>`<span>${esc(step.title||'Этап')}</span>`).join('')}</div>`:'';
    return `<article class="gt-task${ready?' is-ready':''}${claimed?' is-claimed':''}"><div class="gt-task-head"><span class="gt-task-icon" aria-hidden="true">${taskIcon(task)}</span><span class="gt-task-title"><strong>${esc(task.title||'Задание')}</strong><span>${esc(task.description||'Выполни условие и забери награду.')}</span></span><span class="gt-task-tag">${taskTag(task)}</span></div><div class="gt-progress-meta"><span>${claimed?'Выполнено':ready?'Цель выполнена':`Прогресс ${taskProgressValue(task,Math.min(progress,target))} / ${taskProgressValue(task,target)}`}</span><b>${ready||claimed?'100%':`${Math.round(pct)}%`}</b></div><div class="gt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(progress,target)}"><span class="gt-progress-fill" style="width:${ready||claimed?100:pct.toFixed(1)}%"></span></div>${series}<div class="gt-task-foot"><span class="gt-reward"><span>${end?`⏱ ${esc(end)} · `:''}Награда</span><b>${esc(task.rewardLabel||'Награда задания')}</b></span>${action}</div></article>`;
  }

  function filtersMarkup(){
    const counts={all:list(payload?.tasks).length,daily:list(payload?.tasks).filter(isDaily).length,event:list(payload?.tasks).filter(t=>!isDaily(t)).length};
    return `<div class="gt-filter-row" role="tablist" aria-label="Тип заданий"><button class="gt-filter" data-gt-filter="all" role="tab" aria-selected="${filter==='all'}" type="button">Все · ${counts.all}</button><button class="gt-filter" data-gt-filter="daily" role="tab" aria-selected="${filter==='daily'}" type="button">Сегодня · ${counts.daily}</button><button class="gt-filter" data-gt-filter="event" role="tab" aria-selected="${filter==='event'}" type="button">События · ${counts.event}</button></div>`;
  }

  function seasonMarkup(){
    let ready=0;try{ready=whole(host().seasonReady?.());}catch{}
    return `<button class="gt-season" data-gt-season type="button"><span class="gt-season-icon">🌙</span><span class="gt-season-copy"><strong>Сезонные задания</strong><span>XP сезона и прогресс текущего пропуска</span></span><span class="gt-season-badge">${ready>0?Math.min(99,ready):'›'}</span></button>`;
  }

  function render(){
    if(!payload){screen.innerHTML=skeleton();return;}
    const tasks=filteredTasks();
    const listMarkup=tasks.length?tasks.map((task,index)=>taskMarkup(task,list(payload.tasks).indexOf(task))).join(''):`<div class="gt-empty"><span class="gt-empty-icon">☕</span><strong>${filter==='all'?'Сейчас активных заданий нет':'В этом разделе пока пусто'}</strong><span>${filter==='all'?'Загляни позже — новые цели появятся здесь автоматически.':'Переключись на другой тип заданий.'}</span></div>`;
    screen.innerHTML=`<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Играй, выполняй цели и развивай профиль</span></div><button class="gt-icon-button gt-refresh${loading?' is-busy':''}" data-gt-refresh type="button" aria-label="Обновить задания"${loading?' disabled':''}><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg></button></div>${profileMarkup()}${nextMarkup()}${filtersMarkup()}<div class="gt-list" aria-live="polite">${listMarkup}</div>${seasonMarkup()}</div><div class="gt-toast" role="status"></div>`;
  }

  function renderError(message){
    screen.innerHTML=`<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Цели и прогресс профиля</span></div><span></span></div><div class="gt-error" role="alert"><span class="gt-empty-icon">🍥</span><strong>Не удалось загрузить задания</strong><span>${esc(message||'Проверь соединение и попробуй ещё раз.')}</span><button class="gt-retry" data-gt-retry type="button">Повторить</button></div>${seasonMarkup()}</div>`;
  }

  async function load(force=false){
    if(inflight)return inflight;
    if(!force&&payload&&Date.now()-lastFreshAt<CACHE_MS){render();void markVisibleCompletedRead();return payload;}
    loading=true;if(!payload)screen.innerHTML=skeleton();else render();
    inflight=(async()=>{
      try{
        const data=await post(API_STATE);
        if(!Array.isArray(data.tasks))throw new Error('Сервер вернул неполное состояние заданий.');
        payload=data;lastFreshAt=Date.now();serverOffsetMs=num(data.serverTime)?num(data.serverTime)*1000-Date.now():0;
        updateEntry();render();void markVisibleCompletedRead();return data;
      }catch(error){
        if(payload){render();toast(String(error?.message||'Не удалось обновить задания.'));return payload;}
        renderError(String(error?.message||'Не удалось загрузить задания.'));return null;
      }finally{loading=false;inflight=null;screen.querySelector('.gt-refresh')?.classList.remove('is-busy');}
    })();
    return inflight;
  }

  async function claim(task){
    if(!task||claimingKey||task.claimed||!task.complete)return;
    const id=taskId(task);claimingKey=id;render();
    let notice='';
    try{
      const result=await post(API_CLAIM,{kind:String(task.kind||'task'),key:String(task.key||''),cycleKey:String(task.cycleKey||'')});
      try{await host().sync?.();}catch{}
      await load(true);
      notice=result?.claimed?'Награда получена ✨':result?.pending?String(result?.message||'Выдача ещё обрабатывается. Нажми «Проверить выдачу» чуть позже.'):'Состояние награды обновлено.';
    }catch(error){
      try{await load(true);}catch{}
      notice=String(error?.message||'Не удалось получить награду.');
    }finally{
      claimingKey='';render();if(notice)toast(notice);
    }
  }

  function open(){
    if(isRunning())return;
    if(!payload)screen.innerHTML=skeleton();
    let switched=false;
    try{const fn=host().open;if(typeof fn==='function'){fn();switched=true;}}catch{}
    if(!switched||screen.hidden){
      root.querySelectorAll('.screen').forEach(node=>{node.hidden=node!==screen;});
    }
    window.requestAnimationFrame(()=>{void load(false);screen.querySelector('[data-gt-back]')?.focus({preventScroll:true});});
  }
  function back(){
    let switched=false;
    try{const fn=host().back;if(typeof fn==='function'){fn();switched=true;}}catch{}
    if(!switched){
      const game=root.querySelector('[data-screen="game"]');
      root.querySelectorAll('.screen').forEach(node=>{node.hidden=node!==game;});
    }
  }

  entry.addEventListener('click',event=>{event.preventDefault();open();});
  screen.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    if(target.closest('[data-gt-back]')){back();return;}
    if(target.closest('[data-gt-refresh],[data-gt-retry]')){void load(true);return;}
    const filterButton=target.closest('[data-gt-filter]');if(filterButton){const next=String(filterButton.dataset.gtFilter||'all');if(FILTERS.has(next)){filter=next;render();void markVisibleCompletedRead();}return;}
    if(target.closest('[data-gt-season]')){try{host().season?.();}catch{}return;}
    const claimButton=target.closest('[data-gt-claim]');if(claimButton){const index=Number(claimButton.dataset.gtClaim);void claim(list(payload?.tasks)[index]);}
  });

  window.addEventListener('zefirok-tasks-ui',updateEntry);
  window.addEventListener('zefirok-tasks-refresh',()=>{if(payload)void load(true);});
  window.addEventListener('focus',()=>{if(!screen.hidden&&payload&&Date.now()-lastFreshAt>CACHE_MS)void load(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!screen.hidden&&payload&&Date.now()-lastFreshAt>CACHE_MS)void load(true);});

  timerTick=window.setInterval(()=>{if(!screen.hidden&&payload)render();},60000);
  window.addEventListener('pagehide',()=>{if(timerTick)clearInterval(timerTick);},{once:true});

  updateEntry();

  // Expose an imperative opener for the lazy loader and deep links.
  window.zefirokOpenGameTasks=open;
  window.zefirokTasksUiOpen=open;

  // Deep links created by the Telegram bot should land directly in the task hub.
  try{
    const params=new URLSearchParams(location.search),start=String(window.Telegram?.WebApp?.initDataUnsafe?.start_param||params.get('startapp')||params.get('screen')||'').toLowerCase();
    if(start==='tasks'||start==='task')window.setTimeout(open,0);
  }catch{}
})();
