(()=>{
  'use strict';
  if(window.__ZEFIROK_GAME_TASKS_UI_V18__)return;
  window.__ZEFIROK_GAME_TASKS_UI_V18__=true;

  const root=document.querySelector('#zefirok-maltipoo-runner');
  const screen=root?.querySelector('[data-screen="tasks"]');
  const entry=root?.querySelector('[data-tasks-open]');
  if(!root||!screen||!entry)return;

  const API_STATE='/api/tasks/state';
  const API_CLAIM='/api/tasks/claim';
  const API_READ='/api/tasks/read';
  const CACHE_MS=15000;
  const REQUEST_TIMEOUT_MS=12000;
  const FILTERS=new Set(['all','daily','weekly','event','series','ready']);
  let payload=null,filter='all',loading=false,inflight=null,readInflight=null,readQueued=false,lastFreshAt=0,serverOffsetMs=0,claimingKey='',claimSuccessKey='',claimingAll=false,claimedOpen=false,toastTimer=0,timerTick=0,completionNoticeTimer=0,completionNoticePoll=0;
  const committedClaims=new Set();
  const completionNoticeSeen=new Set();
  const completionNoticeQueue=[];
  let entryNotice={readyCount:0,unreadCount:0,activeCount:0};

  const host=()=>window.zefirokTaskHost||{};
  const auth=()=>String(host().auth?.()||window.Telegram?.WebApp?.initData||'');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const whole=value=>Math.max(0,Math.floor(num(value)));
  const list=value=>Array.isArray(value)?value:[];
  const nowServerMs=()=>Date.now()+serverOffsetMs;
  const requestId=()=>`tasks-ui:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,9)}`;

  const TASK_ICONS=Object.freeze({
    task:'/assets/ui/icon_quest_game.webp',
    series:'/assets/ui/icon_series_protection.webp',
    event:'/assets/ui/icon_goal.webp',
    weekly:'/assets/ui/icon_timer.webp',
    daily:'/assets/ui/icon_quest_game.webp',
    runs:'/assets/cases/avatars/achievements/achievement_runs.webp',
    zefir:'/assets/season-pass/zefir_currency.webp',
    coffee:'/assets/optimized/v0.79.5/iconCoffee.webp',
    cases:'/assets/ui/icone_cases.webp',
    score:'/assets/optimized/v0.79.5/iconScore.webp',
    record:'/assets/optimized/v0.79.5/iconRecord.webp',
    time:'/assets/ui/icon_timer.webp',
    boosters:'/assets/ui/icon_busters.webp',
    skins:'/assets/ui/icon_skins_buttom.webp',
    level:'/assets/ui/icon_profile_button.webp',
    reward:'/assets/ui/icon_prize.webp',
    done:'/assets/ui/icon_done_buy.webp',
    xp:'/assets/season-pass/xp.webp',
    season:'/assets/ui/icon_battlepass.webp',
    points:'/assets/shop/currency_star_256x256.webp'
  });
  const BOOSTER_ICONS=Object.freeze({
    points:'/assets/cases/boosters/1F00010C-F984-4A41-B8B6-8E5CD7DF637A.webp',
    coffee:'/assets/cases/boosters/11FDBEBF-D838-4DA5-AA57-9DE0E4BA26AE.webp',
    treats:'/assets/cases/boosters/80C21DC3-04A8-46F7-B8E4-9AC8FE13CCEB.webp',
    shield:'/assets/cases/boosters/icon_buster_shit_zeffi.webp',
    second_chance:'/assets/cases/boosters/icon_2shans.webp',
    pause:'/assets/cases/boosters/icon_pause_zeffi.webp'
  });
  const CASE_ICONS=Object.freeze({
    small:'/assets/cases/standart_closed.webp',
    sweet:'/assets/ui/icone_cases.webp',
    gold:'/assets/cases/gold_closed.webp',
    mythic:'/assets/cases/Mifik_case_closed.webp',
    legendary:'/assets/cases/legendary_closed.webp',
    alex:'/assets/cases/alex/alex_case_close.webp'
  });
  function iconMarkup(src,className='gt-inline-icon'){return `<img class="${esc(className)}" src="${esc(src||TASK_ICONS.task)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;}
  function isRunning(){try{return Boolean(host().running?.());}catch{return false;}}
  function taskId(task){return `${String(task?.kind||'task')}:${String(task?.key||'')}:${String(task?.cycleKey||'')}`;}
  function taskRatio(task){const target=Math.max(1,whole(task?.target));return Math.max(0,Math.min(1,whole(task?.progress)/target));}
  function isReady(task){return Boolean(task?.complete&&!task?.claimed);}
  function isSeries(task){return String(task?.kind||'')==='series'||String(task?.mode||'')==='series';}
  function isDaily(task){return !isSeries(task)&&String(task?.mode||'')==='daily';}
  function isWeekly(task){return !isSeries(task)&&String(task?.mode||'')==='weekly';}
  function isEvent(task){return !isSeries(task)&&String(task?.mode||'')==='event';}
  function taskKindLabel(task){if(isSeries(task))return 'Цепочка';if(isDaily(task))return 'Ежедневное';if(isWeekly(task))return 'Еженедельное';if(isEvent(task))return 'Событие';return 'Одноразовое';}
  function taskIconSrc(task){
    if(isSeries(task))return TASK_ICONS.series;
    if(isEvent(task))return TASK_ICONS.event;
    if(isWeekly(task))return TASK_ICONS.weekly;
    const type=String(task?.triggerType||'');
    if(type==='collect_zefir')return TASK_ICONS.zefir;
    if(type==='collect_coffee')return TASK_ICONS.coffee;
    if(['opened_cases','case_purchases','open_specific_case'].includes(type))return TASK_ICONS.cases;
    if(['single_run_score','total_score','total_run_score','best_score'].includes(type))return TASK_ICONS.score;
    if(type==='new_records')return TASK_ICONS.record;
    if(['single_run_duration','play_time','new_player_delay'].includes(type))return TASK_ICONS.time;
    if(['runs_with_booster','runs_without_boosters'].includes(type))return TASK_ICONS.boosters;
    if(type==='runs_with_skin')return TASK_ICONS.skins;
    if(type==='level_reached')return TASK_ICONS.level;
    if(['accepted_runs','completed_runs'].includes(type))return TASK_ICONS.runs;
    return isDaily(task)?TASK_ICONS.daily:TASK_ICONS.task;
  }
  function taskIcon(task){return iconMarkup(taskIconSrc(task),'gt-task-type-icon');}
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
  function clockValue(value){
    const total=whole(value),hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;
    return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;
  }
  function plural(n,one,two,five){const value=Math.abs(whole(n))%100;const tail=value%10;if(value>10&&value<20)return five;if(tail===1)return one;if(tail>=2&&tail<=4)return two;return five;}
  function isUrgent(task){const left=num(task?.endsAt)-nowServerMs()/1000;return !task?.claimed&&!task?.complete&&left>0&&left<=10800;}
  function taskBadge(task){
    const claimed=Boolean(task?.claimed);
    if(isReady(task))return {label:task?.unread?'ГОТОВО · НОВОЕ':'ГОТОВО',className:'is-ready',state:'ready'};
    if(claimed)return {label:'ПОЛУЧЕНО',className:'is-claimed',state:'claimed'};
    if(isUrgent(task))return {label:'СКОРО ЗАКОНЧИТСЯ',className:'is-urgent',state:'urgent'};
    if(isSeries(task)){const done=Math.min(whole(task?.progress),Math.max(1,whole(task?.target))),goal=Math.max(1,whole(task?.target));return {label:String(task?.seriesMode||'ordered')==='any'?`${done} / ${goal}`:`ЭТАП ${Math.min(done+1,goal)} / ${goal}`,className:'is-kind',state:'kind'};}
    if(isEvent(task))return {label:'АКТИВНО',className:'is-kind',state:'kind'};
    return {label:taskKindLabel(task).toUpperCase(),className:'is-kind',state:'kind'};
  }
  function taskProgressText(task,progress,target){
    const current=Math.min(whole(progress),Math.max(1,whole(target))),goal=Math.max(1,whole(target));
    if(isSeries(task))return `Выполнено этапов: ${current} / ${goal}`;
    const type=String(task?.triggerType||'');
    if(String(task?.progressFormat||'')==='duration'){
      const value=goal>=60?`${clockValue(current)} / ${clockValue(goal)}`:`${current} / ${goal} сек`;
      if(type==='single_run_duration')return `Лучший забег: ${value}`;
      if(type==='new_player_delay')return `Прошло: ${value}`;
      return value;
    }
    if(type==='single_run_score')return `Лучший забег: ${fmt(current)} / ${fmt(goal)} очков`;
    if(type==='best_score')return `Личный рекорд: ${fmt(current)} / ${fmt(goal)} очков`;
    if(['total_score','total_run_score'].includes(type))return `${fmt(current)} / ${fmt(goal)} очков`;
    if(type==='level_reached')return `Уровень ${fmt(current)} / ${fmt(goal)}`;
    if(['accepted_runs','completed_runs','runs_with_skin','runs_with_booster','runs_without_boosters'].includes(type))return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'забег','забега','забегов')}`;
    if(['opened_cases','case_purchases','open_specific_case'].includes(type))return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'кейс','кейса','кейсов')}`;
    if(type==='collect_zefir')return `${fmt(current)} / ${fmt(goal)} зефирок`;
    if(type==='collect_coffee')return `${fmt(current)} / ${fmt(goal)} кофе`;
    if(type==='new_records')return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'рекорд','рекорда','рекордов')}`;
    if(type==='promo_activations')return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'промокод','промокода','промокодов')}`;
    if(type==='skin_purchases')return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'образ','образа','образов')}`;
    if(type==='shop_purchases')return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'покупка','покупки','покупок')}`;
    if(type==='physical_purchases')return `${fmt(current)} / ${fmt(goal)} ${plural(goal,'награда','награды','наград')}`;
    return `${taskProgressValue(task,current)} / ${taskProgressValue(task,goal)}`;
  }
  function sortTasks(tasks){
    const source=list(payload?.tasks),positions=new Map(source.map((task,index)=>[taskId(task),index]));
    const bucket=task=>{
      if(isReady(task)&&task?.unread)return 1;
      if(isReady(task))return 2;
      if(isUrgent(task))return 3;
      if(task?.claimed)return 9;
      return 4;
    };
    return [...tasks].sort((a,b)=>{
      const pa=bucket(a),pb=bucket(b);if(pa!==pb)return pa-pb;
      if(pa===3){const ea=num(a?.endsAt)||Number.MAX_SAFE_INTEGER,eb=num(b?.endsAt)||Number.MAX_SAFE_INTEGER;if(ea!==eb)return ea-eb;}
      if(pa===4){const ratio=taskRatio(b)-taskRatio(a);if(Math.abs(ratio)>.0001)return ratio;}
      if((pa===1||pa===2)&&Boolean(a?.unread)!==Boolean(b?.unread))return a?.unread?-1:1;
      return (positions.get(taskId(a))??9999)-(positions.get(taskId(b))??9999);
    });
  }

  function applyEntryNotice(next){
    if(!next||typeof next!=='object')return;
    const absolute=['readyCount','unreadCount','activeCount'].some(key=>Object.prototype.hasOwnProperty.call(next,key));
    if(absolute){
      entryNotice={readyCount:whole(next.readyCount),unreadCount:whole(next.unreadCount),activeCount:whole(next.activeCount)};
      if(payload){payload.readyCount=entryNotice.readyCount;payload.unreadCount=entryNotice.unreadCount;payload.activeCount=entryNotice.activeCount;}
    }else{
      const readyDelta=Math.floor(num(next.readyCountDelta)),unreadDelta=Math.floor(num(next.unreadCountDelta)),activeDelta=Math.floor(num(next.activeCountDelta));
      entryNotice={
        readyCount:Math.max(0,entryNotice.readyCount+readyDelta),
        unreadCount:Math.max(0,entryNotice.unreadCount+unreadDelta),
        activeCount:Math.max(0,entryNotice.activeCount+activeDelta)
      };
      if(payload){
        payload.readyCount=Math.max(0,whole(payload.readyCount)+readyDelta);
        payload.unreadCount=Math.max(0,whole(payload.unreadCount)+unreadDelta);
        payload.activeCount=Math.max(0,whole(payload.activeCount)+activeDelta);
      }
    }
    queueCompletionNotices(next);
    updateEntry();
  }

  function timeLeft(endsAt){
    const seconds=Math.floor(num(endsAt)-nowServerMs()/1000);
    if(!endsAt||seconds<=0)return '';
    if(seconds<3600)return `${Math.max(1,Math.ceil(seconds/60))} мин`;
    if(seconds<86400){const hours=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60);return mins?`${hours} ч ${mins} мин`:`${hours} ч`;}
    const days=Math.floor(seconds/86400),hours=Math.floor((seconds%86400)/3600);return hours?`${days} д ${hours} ч`:`${days} д`;
  }

  function matchesFilter(task){
    if(filter==='daily')return isDaily(task);
    if(filter==='weekly')return isWeekly(task);
    if(filter==='event')return isEvent(task);
    if(filter==='series')return isSeries(task);
    if(filter==='ready')return isReady(task);
    return true;
  }

  function filteredTasks(){
    return sortTasks(list(payload?.tasks).filter(task=>!task?.claimed&&!committedClaims.has(taskId(task))&&matchesFilter(task)));
  }

  function claimedTasks(){
    return sortTasks(list(payload?.tasks).filter(task=>Boolean(task?.claimed)||committedClaims.has(taskId(task))));
  }

  function nearestTask(){
    return sortTasks(list(payload?.tasks).filter(task=>!task?.claimed&&!committedClaims.has(taskId(task))))[0]||null;
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
        if(payload)payload.unreadCount=Math.max(0,whole(payload.unreadCount)-ids.size);
        entryNotice.unreadCount=Math.max(0,entryNotice.unreadCount-ids.size);
        updateEntry();
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
    const fresh=entry.querySelector('[data-tasks-new]');
    const ready=payload?whole(payload.readyCount):whole(entryNotice.readyCount);
    const unread=payload?whole(payload.unreadCount):whole(entryNotice.unreadCount);
    const active=payload?whole(payload.activeCount):whole(entryNotice.activeCount);
    entry.classList.toggle('has-ready',ready>0);
    entry.classList.toggle('has-unread',unread>0);
    if(summary){
      if(unread===1)summary.textContent=ready>1?`Новое выполнение · ${ready} ${plural(ready,'награда ждёт','награды ждут','наград ждут')}`:'Новое выполнение · награда ждёт тебя';
      else if(unread>1)summary.textContent=`${unread} ${plural(unread,'новое выполнение','новых выполнения','новых выполнений')} · ${ready} ${plural(ready,'награда ждёт','награды ждут','наград ждут')}`;
      else if(ready>0)summary.textContent=`${ready} ${plural(ready,'награда ждёт тебя','награды ждут тебя','наград ждут тебя')}`;
      else if(active>0)summary.textContent=`${active} ${plural(active,'активное задание','активных задания','активных заданий')} · продолжай играть`;
      else summary.textContent='Цели, награды и XP профиля';
    }
    if(fresh){fresh.hidden=unread<=0;fresh.textContent=unread>1?`НОВОЕ ${Math.min(9,unread)} `:'НОВОЕ ';}
    if(badge){badge.hidden=ready<=0;badge.textContent=String(Math.min(99,ready));}
    entry.setAttribute('aria-label',unread>0?`Задания: ${unread} новых выполнений, ${ready} наград готово`:ready>0?`Задания: ${ready} наград готово`:active>0?`Задания: ${active} активных`:'Открыть задания');
  }

  function skeleton(){
    return `<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Цели и прогресс профиля</span></div><button class="gt-icon-button gt-refresh is-busy" type="button" aria-label="Обновляем задания" disabled><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg></button></div><div class="gt-skeleton" aria-label="Загружаем задания"><i></i><i></i><i></i></div></div>`;
  }

  function rewardItemLabel(item){
    const kind=String(item?.kind||'').toLowerCase(),id=String(item?.id||'').toLowerCase(),amount=Math.max(1,whole(item?.amount||1));
    if(kind==='profile_xp')return `+${fmt(amount)} XP`;
    if(kind==='points')return `${fmt(amount)} очков`;
    if(kind==='zefir'||kind==='treats')return `${fmt(amount)} зефира`;
    if(kind==='coffee')return `${fmt(amount)} кофе`;
    if(kind==='case')return amount>1?`${fmt(amount)} кейса`:'Кейс';
    if(kind==='booster')return amount>1?`${fmt(amount)} усилителя`:'Усилитель';
    return String(item?.label||item?.title||`${fmt(amount)} награда`);
  }
  function rewardItemIcon(item){
    const kind=String(item?.kind||'').toLowerCase(),id=String(item?.id||'').toLowerCase();
    if(kind==='profile_xp')return TASK_ICONS.xp;
    if(kind==='points')return TASK_ICONS.points;
    if(kind==='zefir'||kind==='treats')return TASK_ICONS.zefir;
    if(kind==='coffee')return TASK_ICONS.coffee;
    if(kind==='case')return CASE_ICONS[id]||TASK_ICONS.cases;
    if(kind==='booster')return BOOSTER_ICONS[id]||TASK_ICONS.boosters;
    return TASK_ICONS.reward;
  }
  function rewardItems(task){
    const explicit=list(task?.rewardItems).filter(Boolean);
    if(explicit.length)return explicit;
    const reward=task?.reward&&typeof task.reward==='object'?task.reward:null;
    if(!reward)return [];
    const items=[];
    if(reward.kind&&String(reward.kind)!=='none')items.push({kind:String(reward.kind),id:String(reward.id||''),amount:Math.max(1,whole(reward.amount||1))});
    if(whole(reward.profileXp)>0)items.push({kind:'profile_xp',id:'',amount:whole(reward.profileXp)});
    return items;
  }
  function readyTasks(){
    return sortTasks(list(payload?.tasks).filter(task=>isReady(task)&&!committedClaims.has(taskId(task))));
  }
  function mergedRewardItems(tasks){
    const merged=new Map();
    for(const task of list(tasks)){
      for(const item of rewardItems(task)){
        const kind=String(item?.kind||'').toLowerCase(),id=String(item?.id||'').toLowerCase(),key=`${kind}:${id}`;
        const current=merged.get(key);
        if(current)current.amount=Math.max(1,whole(current.amount))+Math.max(1,whole(item?.amount||1));
        else merged.set(key,{...item,kind,id,amount:Math.max(1,whole(item?.amount||1))});
      }
    }
    return [...merged.values()];
  }

  function rewardItemsMarkup(task,compact=false){
    const items=rewardItems(task);
    if(!items.length)return `<span class="gt-reward-fallback">${iconMarkup(TASK_ICONS.reward,'gt-reward-icon')}<b>${esc(task?.rewardLabel||'Награда задания')}</b></span>`;
    return `<span class="gt-reward-items${compact?' is-compact':''}">${items.slice(0,4).map(item=>`<span class="gt-reward-item">${iconMarkup(rewardItemIcon(item),'gt-reward-icon')}<b>${esc(rewardItemLabel(item))}</b></span>`).join('')}</span>`;
  }
  function cycleProgress(mode){
    const tasks=list(payload?.tasks).filter(task=>!isSeries(task)&&String(task?.mode||'')===mode);
    return {done:tasks.filter(task=>Boolean(task?.complete||task?.claimed)).length,total:tasks.length};
  }
  function completionNoticeKey(task){return `${String(task?.kind||'task')}:${String(task?.key||'')}:${String(task?.cycleKey||'')}`;}
  function completionNoticeRewards(tasks){
    const merged=[];
    for(const task of list(tasks))for(const item of rewardItems(task))merged.push(item);
    return merged.slice(0,4);
  }
  function completionNoticeMarkup(tasks){
    const items=list(tasks),seriesCount=items.filter(isSeries).length,rewards=completionNoticeRewards(items);
    const title=items.length===1?(seriesCount?'Цепочка завершена':'Задание выполнено'):`Выполнено заданий: ${items.length}`;
    const copy=items.length===1?String(items[0]?.title||'Награда готова'):'Награды готовы в разделе «Задания»';
    const rewardMarkup=rewards.length?`<span class="gt-completion-rewards">${rewards.map(item=>`<span>${iconMarkup(rewardItemIcon(item),'gt-completion-reward-icon')}<b>${esc(rewardItemLabel(item))}</b></span>`).join('')}</span>`:'';
    return `<button class="gt-completion-notice" data-gt-completion-open type="button"><span class="gt-completion-main-icon">${iconMarkup(seriesCount===items.length?TASK_ICONS.series:TASK_ICONS.done,'gt-completion-main-img')}</span><span class="gt-completion-copy"><small>${esc(title)}</small><strong>${esc(copy)}</strong>${rewardMarkup}</span><span class="gt-completion-open-copy">Открыть</span></button>`;
  }
  function hideCompletionNotice(){const node=root.querySelector('.gt-completion-notice');if(!node)return;node.classList.add('is-leaving');window.setTimeout(()=>node.remove(),220);}
  function flushCompletionNotices(){
    if(!completionNoticeQueue.length)return;
    if(isRunning()||root.querySelector('.run-results-card')){window.clearTimeout(completionNoticePoll);completionNoticePoll=window.setTimeout(flushCompletionNotices,500);return;}
    root.querySelector('.gt-completion-notice')?.remove();
    const tasks=completionNoticeQueue.splice(0,Math.min(4,completionNoticeQueue.length));
    root.insertAdjacentHTML('beforeend',completionNoticeMarkup(tasks));
    window.clearTimeout(completionNoticeTimer);completionNoticeTimer=window.setTimeout(()=>{hideCompletionNotice();if(completionNoticeQueue.length)window.setTimeout(flushCompletionNotices,260);},5200);
  }
  function queueCompletionNotices(next){
    const source=list(next?.tasks).length?list(next.tasks):list(next?.notices);
    const tasks=source.filter(task=>task&&task.key&&task.cycleKey);
    let added=0;
    for(const task of tasks){const key=completionNoticeKey(task);if(completionNoticeSeen.has(key))continue;completionNoticeSeen.add(key);completionNoticeQueue.push(task);added++;}
    if(added)flushCompletionNotices();
  }

  function profileMarkup(){
    const p=payload?.profile||{};
    const level=Math.max(1,whole(p.level)||1),xp=whole(p.xp),needed=whole(p.needed),progress=whole(p.progress);
    const pct=needed?Math.max(0,Math.min(100,(progress/needed)*100)):100;
    const ready=whole(payload?.readyCount),active=whole(payload?.activeCount),claimed=claimedTasks().length;
    const daily=cycleProgress('daily'),weekly=cycleProgress('weekly');
    return `<section class="gt-profile-card" aria-label="Прогресс профиля"><div class="gt-profile-top"><div><span class="gt-level-label">Уровень профиля</span><div class="gt-level"><strong>${level}</strong><span>${needed?'уровень':'максимум'}</span></div></div><span class="gt-profile-xp-total">${iconMarkup(TASK_ICONS.xp,'gt-profile-xp-icon')}<b>${fmt(xp)} XP</b></span></div><div class="gt-xp-track" role="progressbar" aria-valuemin="0" aria-valuemax="${needed||1}" aria-valuenow="${needed?Math.min(progress,needed):1}"><span class="gt-xp-fill" style="width:${pct.toFixed(1)}%"></span></div><div class="gt-xp-caption"><span>${needed?`${fmt(progress)} / ${fmt(needed)} XP`:'Максимальный уровень'}</span><span>${needed?`До следующего: ${fmt(Math.max(0,needed-progress))} XP`:'Прогресс продолжается'}</span></div><div class="gt-cycle-summary"><span>${iconMarkup(TASK_ICONS.daily,'gt-cycle-icon')}<i><small>Ежедневные</small><b>${daily.done} / ${daily.total}</b></i></span><span>${iconMarkup(TASK_ICONS.weekly,'gt-cycle-icon')}<i><small>Еженедельные</small><b>${weekly.done} / ${weekly.total}</b></i></span></div><div class="gt-overview"><div class="gt-overview-item${ready?' is-ready':''}"><b>${ready}</b><span>готово</span></div><div class="gt-overview-item"><b>${active}</b><span>активно</span></div><div class="gt-overview-item is-claimed"><b>${claimed}</b><span>получено</span></div></div></section>`;
  }

  function readySummaryMarkup(){
    const tasks=readyTasks();
    if(!tasks.length)return '';
    const count=tasks.length,items=mergedRewardItems(tasks),shown=items.slice(0,4),extra=Math.max(0,items.length-shown.length);
    const rewardMarkup=shown.length
      ? shown.map(item=>`<span class="gt-ready-reward">${iconMarkup(rewardItemIcon(item),'gt-ready-reward-icon')}<b>${esc(rewardItemLabel(item))}</b></span>`).join('')
      : `<span class="gt-ready-reward">${iconMarkup(TASK_ICONS.reward,'gt-ready-reward-icon')}<b>Награды заданий</b></span>`;
    const buttonLabel=claimingAll?'Получаем…':count>1?`Получить всё · ${count}`:'Получить';
    return `<section class="gt-ready-summary" aria-label="Готовые награды"><span class="gt-ready-summary-icon">${iconMarkup(TASK_ICONS.reward,'gt-ready-summary-icon-img')}</span><span class="gt-ready-summary-copy"><small>Награды готовы</small><strong>Выполнено ${count} ${plural(count,'задание','задания','заданий')}</strong><span>Забери награды за выполненные цели</span></span><span class="gt-ready-summary-rewards">${rewardMarkup}${extra?`<span class="gt-ready-more">+${extra}</span>`:''}</span><button class="gt-claim-all" data-gt-claim-all type="button"${claimingAll||claimingKey?' disabled':''}>${iconMarkup(TASK_ICONS.reward,'gt-button-icon')}<span>${esc(buttonLabel)}</span></button></section>`;
  }

  function nextMarkup(){
    const readySummary=readySummaryMarkup();
    if(readySummary)return readySummary;
    const task=nearestTask();
    if(!task)return '';
    const left=Math.max(0,whole(task.target)-whole(task.progress));
    const status=left?`Осталось ${taskProgressValue(task,left)}`:'Проверить';
    const extra=timeLeft(task.endsAt);
    return `<section class="gt-next" aria-label="Ближайшая цель"><span class="gt-next-icon">${iconMarkup(taskIconSrc(task),'gt-next-icon-img')}</span><span class="gt-next-copy"><small>Ближайшая цель</small><strong>${esc(task.title||'Задание')}</strong><span>${esc(extra?`До конца: ${extra}`:(task.description||'Продолжай играть'))}</span></span><span class="gt-next-status">${esc(status)}</span></section>`;
  }

  function taskArtMarkup(task){
    const src=String(task?.artUrl||'/assets/ui/icon_quest_game.webp');
    const categoryArt=src.startsWith('/assets/tasks/');
    return `<div class="gt-task-art${categoryArt?' is-category-art':''}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/ui/icon_quest_game.webp'"></div>`;
  }

  function taskActionMarkup(task,index){
    const ready=isReady(task),claimed=Boolean(task?.claimed),currentClaim=claimingKey===taskId(task),claimSuccess=claimSuccessKey===taskId(task),busy=currentClaim||claimingAll;
    if(claimSuccess)return `<span class="gt-state gt-state-success">${iconMarkup(TASK_ICONS.done,'gt-state-icon')}Получено</span>`;
    if(ready&&!claimed)return `<button class="gt-claim" data-gt-claim="${index}" type="button"${busy?' disabled':''}>${busy?'Получаем…':`${iconMarkup(TASK_ICONS.reward,'gt-button-icon')}Получить`}</button>`;
    if(claimed)return `<span class="gt-state">${iconMarkup(TASK_ICONS.done,'gt-state-icon')}Получено</span>`;
    return '<span class="gt-state">В процессе</span>';
  }

  function taskClasses(task,extra=''){
    const ready=isReady(task),claimed=Boolean(task?.claimed),urgent=isUrgent(task),claimSuccess=claimSuccessKey===taskId(task);
    return ['gt-task',ready?'is-ready':'',urgent?'is-urgent':'',claimed?'is-claimed':'',claimSuccess?'is-claim-success':'',extra].filter(Boolean).join(' ');
  }

  function standardTaskMarkup(task,index){
    const progress=whole(task.progress),target=Math.max(1,whole(task.target)),pct=Math.max(0,Math.min(100,(progress/target)*100));
    const ready=isReady(task),claimed=Boolean(task.claimed),badge=taskBadge(task),end=timeLeft(task.endsAt),action=taskActionMarkup(task,index);
    const context=`<span>${esc(taskKindLabel(task))}</span>${end?`<i>·</i><span>${iconMarkup(TASK_ICONS.time,'gt-context-icon')}${esc(end)}</span>`:''}`;
    const progressText=taskProgressText(task,progress,target);
    return `<article class="${taskClasses(task)}">${taskArtMarkup(task)}<div class="gt-task-head"><span class="gt-task-icon" aria-hidden="true">${taskIcon(task)}</span><span class="gt-task-title"><strong>${esc(task.title||'Задание')}</strong><span class="gt-task-description">${esc(task.description||'Выполни условие и забери награду.')}</span><span class="gt-task-context">${context}</span></span><span class="gt-task-badge ${badge.className}">${esc(badge.label)}</span></div><div class="gt-progress-meta"><span>${esc(progressText)}</span><b>${ready||claimed?'100%':`${Math.round(pct)}%`}</b></div><div class="gt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(progress,target)}"><span class="gt-progress-fill" style="width:${ready||claimed?100:pct.toFixed(1)}%"></span></div><div class="gt-task-foot"><span class="gt-reward"><span>Награда</span>${rewardItemsMarkup(task)}</span>${action}</div></article>`;
  }

  function eventTaskMarkup(task,index){
    const progress=whole(task.progress),target=Math.max(1,whole(task.target)),pct=Math.max(0,Math.min(100,(progress/target)*100));
    const ready=isReady(task),claimed=Boolean(task.claimed),urgent=isUrgent(task),badge=taskBadge(task),end=timeLeft(task.endsAt),action=taskActionMarkup(task,index);
    const timer=end?`<span class="gt-event-time${urgent?' is-urgent':''}">${iconMarkup(TASK_ICONS.time,'gt-event-time-icon')}${esc(end)}</span>`:'<span class="gt-event-time">Активно</span>';
    return `<article class="${taskClasses(task,'is-event-card')}">${taskArtMarkup(task)}<div class="gt-event-strip"><span class="gt-event-label">Событийное задание</span>${timer}</div><div class="gt-task-head"><span class="gt-task-icon" aria-hidden="true">${taskIcon(task)}</span><span class="gt-task-title"><strong>${esc(task.title||'Событийное задание')}</strong><span class="gt-task-description">${esc(task.description||'Выполни цель до окончания события.')}</span></span><span class="gt-task-badge ${badge.className}">${esc(badge.label)}</span></div><div class="gt-progress-meta"><span>${esc(taskProgressText(task,progress,target))}</span><b>${ready||claimed?'100%':`${Math.round(pct)}%`}</b></div><div class="gt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(progress,target)}"><span class="gt-progress-fill" style="width:${ready||claimed?100:pct.toFixed(1)}%"></span></div><div class="gt-task-foot"><span class="gt-reward"><span>Награда события</span>${rewardItemsMarkup(task)}</span>${action}</div></article>`;
  }

  function seriesStepText(step){
    if(!step)return '';
    if(step.done)return 'Выполнено';
    if(step.locked)return 'Откроется после предыдущего этапа';
    return taskProgressText({...step,kind:'task',mode:'one_time'},whole(step.progress),Math.max(1,whole(step.target)));
  }

  function seriesTaskMarkup(task,index){
    const progress=whole(task.progress),target=Math.max(1,whole(task.target)),pct=Math.max(0,Math.min(100,(progress/target)*100));
    const ready=isReady(task),claimed=Boolean(task.claimed),badge=taskBadge(task),action=taskActionMarkup(task,index),steps=list(task.steps);
    const mode=String(task?.seriesMode||'ordered')==='any'?'В любом порядке':'По порядку',end=timeLeft(task.endsAt);
    const modeLabel=end?`${mode} ·  ${end}`:mode;
    const current=steps.find(step=>step?.current)||steps.find(step=>!step?.done&&!step?.locked)||steps.find(step=>!step?.done)||null;
    const nodes=steps.length?`<div class="gt-series-road" aria-label="Этапы цепочки">${steps.map((step,stepIndex)=>{const cls=['gt-series-node',step?.done?'is-done':'',step?.current?'is-current':'',step?.locked?'is-locked':''].filter(Boolean).join(' ');const mark=step?.done?iconMarkup(TASK_ICONS.done,'gt-series-node-done'):esc(String(stepIndex+1));return `<span class="${cls}" title="${esc(step?.title||`Этап ${stepIndex+1}`)}"><i>${mark}</i><span>${esc(step?.title||`Этап ${stepIndex+1}`)}</span></span>`;}).join('')}</div>`:'';
    let currentBlock='';
    if(ready)currentBlock='<div class="gt-series-current"><small>Все этапы выполнены</small><strong>Финальная награда готова</strong><span>Забери её, чтобы завершить цепочку.</span></div>';
    else if(claimed)currentBlock='<div class="gt-series-current"><small>Цепочка завершена</small><strong>Все этапы пройдены</strong><span>Финальная награда уже получена.</span></div>';
    else if(current)currentBlock=`<div class="gt-series-current"><small>${String(task?.seriesMode||'ordered')==='any'?'Доступный этап':'Текущий этап'}</small><strong>${esc(current.title||'Следующий этап')}</strong><span>${esc(seriesStepText(current))}</span></div>`;
    else currentBlock='<div class="gt-series-current"><small>Прогресс цепочки</small><strong>Продолжай выполнять этапы</strong><span>Следующий этап появится после обновления прогресса.</span></div>';
    return `<article class="${taskClasses(task,'is-series-card')}">${taskArtMarkup(task)}<div class="gt-series-strip"><span class="gt-series-kicker">Цепочка · ${Math.min(progress,target)} / ${target}</span><span class="gt-series-mode">${esc(modeLabel)}</span></div><div class="gt-task-head"><span class="gt-task-icon" aria-hidden="true">${taskIcon(task)}</span><span class="gt-task-title"><strong>${esc(task.title||'Цепочка заданий')}</strong><span class="gt-task-description">${esc(task.description||'Пройди все этапы и получи финальную награду.')}</span></span><span class="gt-task-badge ${badge.className}">${esc(badge.label)}</span></div><div class="gt-progress-meta"><span>${esc(taskProgressText(task,progress,target))}</span><b>${ready||claimed?'100%':`${Math.round(pct)}%`}</b></div><div class="gt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.min(progress,target)}"><span class="gt-progress-fill" style="width:${ready||claimed?100:pct.toFixed(1)}%"></span></div>${nodes}${currentBlock}<div class="gt-series-final"><span>Финальная награда</span>${rewardItemsMarkup(task,true)}</div><div class="gt-series-footer">${action}</div></article>`;
  }

  function taskMarkup(task,index){
    if(isSeries(task))return seriesTaskMarkup(task,index);
    if(isEvent(task))return eventTaskMarkup(task,index);
    return standardTaskMarkup(task,index);
  }

  function claimedTaskMarkup(task){
    const src=String(task?.artUrl||'/assets/ui/icon_quest_game.webp');
    const categoryArt=src.startsWith('/assets/tasks/');
    const context=[taskKindLabel(task),task?.rewardLabel?` ${task.rewardLabel}`:''].filter(Boolean).join(' · ');
    return `<article class="gt-history-task"><span class="gt-history-art${categoryArt?' is-category-art':''}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/ui/icon_quest_game.webp'"></span><span class="gt-history-copy"><strong>${esc(task.title||'Задание')}</strong><span>${esc(context||'Награда получена')}</span></span><span class="gt-history-done">${iconMarkup(TASK_ICONS.done,'gt-history-done-icon')}Получено</span></article>`;
  }

  function claimedHistoryMarkup(){
    if(filter!=='all')return '';
    const tasks=claimedTasks();
    if(!tasks.length)return '';
    const open=claimedOpen;
    return `<section class="gt-history${open?' is-open':''}" aria-label="Полученные задания"><button class="gt-history-toggle" data-gt-history-toggle type="button" aria-expanded="${open?'true':'false'}"><span class="gt-history-check">${iconMarkup(TASK_ICONS.done,'gt-history-check-icon')}</span><span class="gt-history-heading"><strong>Полученные задания</strong><small>Скрыты, чтобы не мешать активным целям</small></span><span class="gt-history-count">${tasks.length}</span><span class="gt-history-chevron" aria-hidden="true">⌄</span></button><div class="gt-history-panel"><div class="gt-history-panel-inner">${tasks.map(claimedTaskMarkup).join('')}</div></div></section>`;
  }

  function filtersMarkup(){
    const tasks=list(payload?.tasks).filter(task=>!task?.claimed);
    const counts={all:tasks.length,daily:tasks.filter(isDaily).length,weekly:tasks.filter(isWeekly).length,event:tasks.filter(isEvent).length,series:tasks.filter(isSeries).length,ready:tasks.filter(isReady).length};
    const chip=(key,label,count,extra='')=>`<button class="gt-filter${extra}" data-gt-filter="${key}" role="tab" aria-selected="${filter===key}" type="button">${label}<span class="gt-filter-count">${count}</span></button>`;
    return `<div class="gt-filter-row" role="tablist" aria-label="Фильтры заданий">${chip('all','Все',counts.all)}${chip('daily','Ежедневные',counts.daily)}${chip('weekly','Еженедельные',counts.weekly)}${chip('event','События',counts.event)}${chip('series','Цепочки',counts.series)}${counts.ready?chip('ready','Готово',counts.ready,' is-ready-filter'):''}</div>`;
  }

  function seasonMarkup(){
    let ready=0;try{ready=whole(host().seasonReady?.());}catch{}
    return `<button class="gt-season" data-gt-season type="button"><span class="gt-season-icon">${iconMarkup(TASK_ICONS.season,'gt-season-icon-img')}</span><span class="gt-season-copy"><strong>Сезонные задания</strong><span>XP сезона и прогресс текущего пропуска</span></span><span class="gt-season-badge">${ready>0?Math.min(99,ready):'›'}</span></button>`;
  }

  function render(){
    if(!payload){screen.innerHTML=skeleton();return;}
    if(filter==='ready'&&!list(payload?.tasks).some(isReady))filter='all';
    const tasks=filteredTasks();
    const emptyTitle=filter==='ready'?'Готовых наград пока нет':filter==='all'?'Сейчас активных заданий нет':'В этом разделе пока пусто';
    const emptyCopy=filter==='ready'?'Продолжай выполнять задания — готовые награды появятся здесь автоматически.':filter==='all'?'Загляни позже — новые цели появятся здесь автоматически.':'Переключись на другой тип заданий.';
    const listMarkup=tasks.length?tasks.map(task=>taskMarkup(task,list(payload.tasks).indexOf(task))).join(''):`<div class="gt-empty"><span class="gt-empty-icon">${iconMarkup(filter==='ready'?TASK_ICONS.reward:TASK_ICONS.task,'gt-empty-icon-img')}</span><strong>${emptyTitle}</strong><span>${emptyCopy}</span></div>`;
    screen.innerHTML=`<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Играй, выполняй цели и развивай профиль</span></div><button class="gt-icon-button gt-refresh${loading?' is-busy':''}" data-gt-refresh type="button" aria-label="Обновить задания"${loading?' disabled':''}><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg></button></div>${profileMarkup()}${nextMarkup()}${filtersMarkup()}<div class="gt-list" aria-live="polite">${listMarkup}</div>${claimedHistoryMarkup()}${seasonMarkup()}</div><div class="gt-toast" role="status"></div>`;
  }

  function renderError(message){
    screen.innerHTML=`<div class="gt-shell"><div class="gt-topbar"><button class="gt-icon-button" data-gt-back type="button" aria-label="Назад">‹</button><div class="gt-heading"><strong>Задания</strong><span>Цели и прогресс профиля</span></div><span></span></div><div class="gt-error" role="alert"><span class="gt-empty-icon">${iconMarkup(TASK_ICONS.zefir,'gt-empty-icon-img')}</span><strong>Не удалось загрузить задания</strong><span>${esc(message||'Проверь соединение и попробуй ещё раз.')}</span><button class="gt-retry" data-gt-retry type="button">Повторить</button></div>${seasonMarkup()}</div>`;
  }

  async function load(force=false){
    if(inflight)return inflight;
    if(!force&&payload&&Date.now()-lastFreshAt<CACHE_MS){render();void markVisibleCompletedRead();return payload;}
    loading=true;if(!payload)screen.innerHTML=skeleton();else render();
    inflight=(async()=>{
      try{
        const data=await post(API_STATE);
        if(!Array.isArray(data.tasks))throw new Error('Сервер вернул неполное состояние заданий.');
        let tombstonedReady=0,tombstonedUnread=0;
        for(const task of list(data.tasks)){
          const id=taskId(task);
          if(!committedClaims.has(id))continue;
          if(task?.claimed){committedClaims.delete(id);continue;}
          if(task?.complete)tombstonedReady+=1;
          if(task?.unread)tombstonedUnread+=1;
          task.claimed=true;task.unread=false;
        }
        if(tombstonedReady)data.readyCount=Math.max(0,whole(data.readyCount)-tombstonedReady);
        if(tombstonedUnread)data.unreadCount=Math.max(0,whole(data.unreadCount)-tombstonedUnread);
        payload=data;lastFreshAt=Date.now();serverOffsetMs=num(data.serverTime)?num(data.serverTime)*1000-Date.now():0;
        entryNotice={readyCount:whole(data.readyCount),unreadCount:whole(data.unreadCount??list(data.tasks).filter(task=>task?.unread&&task?.complete&&!task?.claimed).length),activeCount:whole(data.activeCount)};
        updateEntry();render();void markVisibleCompletedRead();return data;
      }catch(error){
        if(payload){render();toast(String(error?.message||'Не удалось обновить задания.'));return payload;}
        renderError(String(error?.message||'Не удалось загрузить задания.'));return null;
      }finally{loading=false;inflight=null;screen.querySelector('.gt-refresh')?.classList.remove('is-busy');}
    })();
    return inflight;
  }

  async function claim(task){
    if(!task||claimingKey||claimingAll||task.claimed||committedClaims.has(taskId(task))||!task.complete)return;
    const id=taskId(task),wasUnread=Boolean(task.unread);claimingKey=id;render();
    let notice='';
    try{
      const result=await post(API_CLAIM,{kind:String(task.kind||'task'),key:String(task.key||''),cycleKey:String(task.cycleKey||'')});
      if(result?.claimed){
        claimSuccessKey=id;claimingKey='';render();
        await new Promise(resolve=>window.setTimeout(resolve,120));
        committedClaims.add(id);
        task.claimed=true;task.unread=false;
        if(payload){payload.readyCount=Math.max(0,whole(payload.readyCount)-1);if(wasUnread)payload.unreadCount=Math.max(0,whole(payload.unreadCount)-1);}
        entryNotice.readyCount=Math.max(0,entryNotice.readyCount-1);if(wasUnread)entryNotice.unreadCount=Math.max(0,entryNotice.unreadCount-1);
        claimSuccessKey='';render();updateEntry();
        try{void host().sync?.();}catch{}
        window.setTimeout(()=>void load(true),250);
        notice='Награда получена';
      }else{
        throw new Error(String(result?.error||'Сервер не подтвердил получение награды.'));
      }
    }catch(error){
      claimingKey='';render();window.setTimeout(()=>void load(true),250);
      notice=String(error?.message||'Не удалось получить награду.');
    }finally{
      claimingKey='';if(notice)toast(notice);
    }
  }

  async function claimAll(){
    if(claimingAll||claimingKey)return;
    const tasks=readyTasks();
    if(!tasks.length)return;
    claimingAll=true;render();
    try{
      const result=await post(API_CLAIM,{claims:tasks.map(task=>({kind:String(task.kind||'task'),key:String(task.key||''),cycleKey:String(task.cycleKey||'')}))});
      const returned=new Map(list(result?.claims).map(item=>[`${String(item?.kind||'task')}:${String(item?.key||'')}:${String(item?.cycleKey||'')}`,item]));
      await new Promise(resolve=>window.setTimeout(resolve,120));
      let claimedCount=0,failedCount=0,unreadClaimed=0;
      for(const task of tasks){
        const item=returned.get(taskId(task));
        if(item?.claimed){
          if(task.unread)unreadClaimed+=1;
          committedClaims.add(taskId(task));task.claimed=true;task.unread=false;claimedCount+=1;
        }else failedCount+=1;
      }
      if(payload){payload.readyCount=Math.max(0,whole(payload.readyCount)-claimedCount);payload.unreadCount=Math.max(0,whole(payload.unreadCount)-unreadClaimed);}
      entryNotice.readyCount=Math.max(0,entryNotice.readyCount-claimedCount);entryNotice.unreadCount=Math.max(0,entryNotice.unreadCount-unreadClaimed);
      claimingAll=false;render();updateEntry();
      if(claimedCount){try{void host().sync?.();}catch{}}
      window.setTimeout(()=>void load(true),250);
      if(failedCount)toast(claimedCount?`Получено ${claimedCount} из ${tasks.length}. Остальные можно повторить.`:'Не удалось получить готовые награды. Попробуй ещё раз.');
      else toast(claimedCount===1?'Награда получена':`Получено наград: ${claimedCount}`);
    }catch(error){
      claimingAll=false;render();window.setTimeout(()=>void load(true),250);toast(String(error?.message||'Не удалось получить готовые награды.'));
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
  root.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;if(!target)return;if(target.closest('[data-gt-completion-open]')){event.preventDefault();hideCompletionNotice();open();}});
  screen.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    if(target.closest('[data-gt-back]')){back();return;}
    if(target.closest('[data-gt-refresh],[data-gt-retry]')){void load(true);return;}
    const filterButton=target.closest('[data-gt-filter]');if(filterButton){const next=String(filterButton.dataset.gtFilter||'all');if(FILTERS.has(next)){filter=next;if(filter!=='all')claimedOpen=false;render();void markVisibleCompletedRead();}return;}
    const historyButton=target.closest('[data-gt-history-toggle]');if(historyButton){claimedOpen=!claimedOpen;const section=historyButton.closest('.gt-history');section?.classList.toggle('is-open',claimedOpen);historyButton.setAttribute('aria-expanded',claimedOpen?'true':'false');return;}
    if(target.closest('[data-gt-season]')){try{host().season?.();}catch{}return;}
    if(target.closest('[data-gt-claim-all]')){void claimAll();return;}
    const claimButton=target.closest('[data-gt-claim]');if(claimButton){const index=Number(claimButton.dataset.gtClaim);void claim(list(payload?.tasks)[index]);}
  });

  window.addEventListener('zefirok-tasks-ui',updateEntry);
  window.addEventListener('zefirok-tasks-refresh',()=>{if(payload)void load(true);});
  window.addEventListener('focus',()=>{if(!screen.hidden&&payload&&Date.now()-lastFreshAt>CACHE_MS)void load(true);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!screen.hidden&&payload&&Date.now()-lastFreshAt>CACHE_MS)void load(true);});

  timerTick=window.setInterval(()=>{if(!screen.hidden&&payload)render();},60000);
  window.addEventListener('pagehide',()=>{if(timerTick)clearInterval(timerTick);window.clearTimeout(completionNoticeTimer);window.clearTimeout(completionNoticePoll);},{once:true});

  updateEntry();

  // Expose an imperative opener plus a compact notification bridge used by startup/run settlement.
  window.zefirokOpenGameTasks=open;
  window.zefirokTasksUiOpen=open;
  window.zefirokGameTasksApplyNotice=applyEntryNotice;
  window.addEventListener('zefirok-game-task-notice',event=>applyEntryNotice(event?.detail));
  if(window.__ZEFIROK_GAME_TASK_NOTICE__)applyEntryNotice(window.__ZEFIROK_GAME_TASK_NOTICE__);

  // Deep links created by the Telegram bot should land directly in the task hub.
  try{
    const params=new URLSearchParams(location.search),start=String(window.Telegram?.WebApp?.initDataUnsafe?.start_param||params.get('startapp')||params.get('screen')||'').toLowerCase();
    if(start==='tasks'||start==='task')window.setTimeout(open,0);
  }catch{}
})();
