(()=>{
'use strict';
const KEY='zefirok:candidate:v4:coffee-card';
const $=id=>document.getElementById(id);
const iso=n=>{const d=new Date(Date.UTC(2026,7,22+n));return d.toISOString().slice(0,10)};
const defaultState=()=>({day:0,stamps:0,streak:0,best:0,lastActiveDay:null,completedDay:null,cycle:1,rewarded:{3:false,5:false,7:false},log:[]});
let state=load();
function load(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(KEY)||'null')}}catch{return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function addLog(text){state.log.unshift({at:iso(state.day),text});state.log=state.log.slice(0,8)}
function streakVisual(n){if(n>=30)return{tier:'tier4',icon:'✨🔥✨',label:'Легендарная серия'};if(n>=14)return{tier:'tier3',icon:'🔥🔥🔥',label:'Большая серия'};if(n>=7)return{tier:'tier2',icon:'🔥🔥',label:'Горячая серия'};if(n>=3)return{tier:'tier1',icon:'🔥',label:'Серия разгорается'};return{tier:'',icon:n>0?'✦':'○',label:n>0?'Серия началась':'Начни серию'}}
function nextMilestone(){for(const n of [3,5,7])if(state.stamps<n)return n;return 7}
function rewardName(n){return n===3?'Небольшая награда':n===5?'XP сезона':n===7?'Финальный кейс':'Награда'}
function render(){
 const sv=streakVisual(state.streak),streak=$('streak');streak.className='streak '+sv.tier;$('flame').textContent=sv.icon;$('streakCount').textContent=state.streak?`${state.streak} ${plural(state.streak,'день','дня','дней')}`:'Нет серии';$('streakLabel').textContent=sv.label;$('best').textContent=state.best;$('cycle').textContent=`Карточка №${state.cycle}`;
 $('stamps').innerHTML=Array.from({length:7},(_,i)=>{const n=i+1,done=n<=state.stamps,m=[3,5,7].includes(n),rewarded=state.rewarded[n];return `<div class="stamp ${done?'done':''} ${m?'milestone':''} ${rewarded?'rewarded':''}" title="День ${n}${m?' · награда':''}">${done?'🐾':'○'}</div>`}).join('');
 $('progressText').textContent=`${state.stamps} / 7`;$('bar').style.width=`${state.stamps/7*100}%`;
 const next=nextMilestone();$('nextRewardTitle').textContent=state.stamps>=7?'Карточка заполнена':`Следующая награда · ${next}/7`;$('nextRewardText').textContent=state.stamps>=7?'Новая карточка откроется на следующем игровом дне':`${rewardName(next)} · TEST, без реального начисления`;
 const activeToday=state.lastActiveDay===state.day;$('todayText').innerHTML=activeToday?`Сегодняшняя активность уже засчитана. <strong>Повторный штамп невозможен.</strong>`:`Соверши один тестовый забег сегодня — получишь <strong>1 штамп</strong>.`;$('run').disabled=activeToday||state.stamps>=7;
 $('complete').classList.toggle('show',state.stamps>=7);$('complete').innerHTML=state.stamps>=7?'🎉 <b>7 / 7!</b> Карточка заполнена. Перейди на следующий игровой день — начнётся новая карточка 0 / 7, а серия продолжится только после новой активности.':'';
 $('date').textContent=iso(state.day);$('log').innerHTML=state.log.length?state.log.map(x=>`<div class="log-item"><b>${x.at}</b> · ${escapeHtml(x.text)}</div>`).join(''):'<div class="log-item">Пока нет событий.</div>';
 save();
}
function plural(n,a,b,c){const m=n%100;if(m>=11&&m<=19)return c;const d=n%10;return d===1?a:d>=2&&d<=4?b:c}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1800)}
function maybeStartNewCycle(){if(state.stamps>=7&&state.completedDay!==null&&state.day>state.completedDay){state.stamps=0;state.completedDay=null;state.cycle++;state.rewarded={3:false,5:false,7:false};addLog(`Началась новая карточка №${state.cycle}.`)}}
function doRun(){if(state.lastActiveDay===state.day)return toast('Сегодня штамп уже получен.');maybeStartNewCycle();if(state.stamps>=7)return toast('Перейди на следующий игровой день.');
 if(state.lastActiveDay===state.day-1)state.streak++;else if(state.lastActiveDay===null)state.streak=1;else state.streak=1;
 state.best=Math.max(state.best,state.streak);state.lastActiveDay=state.day;state.stamps=Math.min(7,state.stamps+1);addLog(`Забег засчитан: штамп ${state.stamps}/7, серия ${state.streak}.`);
 if([3,5,7].includes(state.stamps)){state.rewarded[state.stamps]=true;addLog(`TEST-награда ${state.stamps}/7 отмечена как полученная.`);toast(`🎁 Контрольная точка ${state.stamps}/7 · ${rewardName(state.stamps)}`)}else toast('🐾 Зеффи поставила штамп!');
 if(state.stamps===7)state.completedDay=state.day;render();
}
function nextDay(missed=false){state.day++;maybeStartNewCycle();if(missed){if(state.lastActiveDay!==state.day-1&&state.streak>0){state.streak=0;addLog('Серия прервана из-за пропуска дня.')}else if(state.lastActiveDay===state.day-1){state.streak=0;addLog('Игровой день пропущен: серия сброшена, штампы сохранены.')}toast('День пропущен: карточка сохранена, серия сброшена.')}else toast('Следующий игровой день.');render()}
function preset(n){state=defaultState();state.day=n-1;state.stamps=Math.min(6,Math.max(1,n%7||6));state.streak=n;state.best=n;state.lastActiveDay=state.day;state.cycle=Math.max(1,Math.ceil(n/7));state.rewarded={3:state.stamps>=3,5:state.stamps>=5,7:false};addLog(`Пресет серии: ${n} дней.`);render();toast(`Серия ${n}: визуальный уровень включён.`)}
$('run').addEventListener('click',doRun);$('next').addEventListener('click',()=>nextDay(false));$('miss').addEventListener('click',()=>nextDay(true));$('reset').addEventListener('click',()=>{state=defaultState();render();toast('Candidate сброшен.');});document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(Number(b.dataset.preset))));render();
})();
