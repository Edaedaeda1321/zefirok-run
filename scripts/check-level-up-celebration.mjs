#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(new URL('../',import.meta.url).pathname);
const text=path=>readFileSync(resolve(root,path),'utf8');
const index=text('index.html');
const tasks=text('assets/game-tasks.js');
const js=text('assets/level-up-celebration.js');
const css=text('assets/level-up-celebration.css');
const gate=text('scripts/check-production-gate.mjs');
const checks=[];
function check(title,rule){checks.push(title);assert.ok(rule,title);}
check('player level schedule stays authoritative in existing game',index.includes('const LEVEL_CASE_SCHEDULE = Object.freeze('));
check('level reveal loads only when a new level is confirmed',index.includes('async function revealProfileLevelUp(beforeXp, afterXp, eventKey, accountId = profileLevelUpAccountId())')&&index.includes('if (to.level &lt;= from.level || to.totalXp &lt;= from.totalXp) return false;'));
check('reveal uses existing schedule, never invents awards',index.includes('LEVEL_CASE_SCHEDULE.filter(entry =&gt; entry.level &gt; from.level &amp;&amp; entry.level &lt;= to.level)'));
check('run trigger follows server settlement and results render',index.includes('renderRunResultsSettled(payload, resultContext);')&&index.includes('queueProfileLevelUp(confirmedLevelUp.beforeXp, confirmedLevelUp.afterXp, eventKey)'));
check('run callback guards stale run and ongoing gameplay',index.includes('String(resultContext.runId || &quot;&quot;) !== String(state.caseRunId || &quot;&quot;)')&&index.includes('state.running || document.visibilityState === &#x27;hidden&#x27;'));
check('purchase reveals only after the 24h code dialog closes',index.includes('pendingPurchaseLevelReveal = {beforeXp: previousProfileXp')&&index.includes('if (pendingLevelReveal &amp;&amp; !force)')&&index.includes('suppressLevelCelebration: true'));
check('task animation uses confirmed server data',tasks.includes('if(nextProfile.level>queuedXp.from.level)')&&tasks.includes('window.zefirokLevelUpHost?.fromTask?.(oldXp,newXp)'));
check('reward button reuses existing inventory and case loading',index.includes('switchScreen(&#x27;warehouse&#x27;)')&&index.includes('switchStockHubView(&#x27;cases&#x27;)'));
check('UI stylesheet and JS are lazy on celebration only',index.includes('let levelUpPresentationPromise = null;')&&index.includes('/assets/level-up-celebration.css?v=lu2')&&index.includes('/assets/level-up-celebration.js?v=lu2'));
check('no eager level-up asset tags',!index.includes('&lt;script src=&quot;/assets/level-up-celebration.js'));
check('all rarity images are existing project files', ['standart_closed.webp','Bronze_close.webp','gold_closed.webp','Mifik_case_closed.webp','legendary_closed.webp'].every(name=>existsSync(resolve(root,'assets/cases',name))));
check('Zeffi original dog sprite is used',existsSync(resolve(root,'assets/skins/gameplay/default/stand.webp'))&&js.includes('/assets/skins/gameplay/default/stand.webp'));
check('visual layer never sends API or modifies rewards',!/fetch\(|XMLHttpRequest|\/api\/|\.wallet\s*=|\.profileXp\s*=|openLevelCaseClient/.test(js));
check('visual tier styles exist', ['small','sweet','gold','mythic','legendary'].every(name=>js.includes(`${name}: {`) )&&['.zlu-gold','.zlu-mythic','.zlu-legendary'].every(name=>css.includes(name)));
check('milestone list includes level 50',js.includes('[10,20,30,40,45,50]'));
check('multiple level rewards shown together',js.includes('const plural = rewards.length > 1;')&&js.includes('class="zlu-items"'));
check('reduced motion, keyboard and focus safeguards',js.includes('prefers-reduced-motion: reduce')&&js.includes("event.key === 'Escape'")&&js.includes("event.key !== 'Tab'")&&css.includes('prefers-reduced-motion:reduce'));
check('safe area and bounded mobile dimensions',css.includes('env(safe-area-inset-top)')&&css.includes('max-height:min(92dvh,790px)'));
check('modal text never claims an automatic case grant',js.includes('Кейс доступен к открытию')&&!js.includes('Вам начислено'));
check('gate runs celebration regression check',gate.includes("['player level-up celebration', 'node', ['scripts/check-level-up-celebration.mjs']]"));

check('server receipt confirms level instead of mutable local XP',index.includes('function confirmedRunProfileLevelUp(previousXp, payload, currentXp)')&&index.includes('const awarded = Number(receipt.profileXpAwarded);')&&index.includes('if (awardedKnown &amp;&amp; awarded &lt;= 0) return null;')&&index.includes('const serverXp = Number(payload?.profile?.profileXp);'));
check('missing CSS event cannot deadlock JS loader',index.includes('script.onload = () =&gt; finish(window.ZeffiLevelUp || null)')&&index.includes('const deadline = window.setTimeout')&&!index.includes('Promise.all([styleReady, scriptReady])'));
check('failed script can retry and visible toast explains missing visual',index.includes('levelUpPresentationPromise = null;')&&index.includes('Level-up celebration assets unavailable after retry')&&index.includes('Кейс ждёт тебя'));
check('late settlement queued instead of blocking the next run',index.includes('queueProfileLevelUp(confirmedLevelUp.beforeXp, confirmedLevelUp.afterXp, eventKey)')&&index.includes('async function flushPendingRunLevelUp()'));

// Behavioral regression: a fresh second account reaches level 2 after a signed run.
// Evaluate exactly the helper embedded in the active srcdoc; no duplicate test implementation.
const {runInNewContext} = await import('node:vm');
const decode = raw => raw.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&gt;', '>').replaceAll('&lt;', '<');
const receiptStart = index.indexOf('function confirmedRunProfileLevelUp(previousXp, payload, currentXp)');
const receiptEnd = index.indexOf('\n      // Load once at idle', receiptStart);
check('receipt helper can be extracted from real runner',receiptStart>0&&receiptEnd>receiptStart);
const receiptCode = decode(index.slice(receiptStart,receiptEnd));
const profileLevelState = xp => {
  let level=1,left=Math.max(0,Math.floor(Number(xp)||0));
  while(level<50){const needed=20+(level-1)*10;if(left<needed)break;left-=needed;level++;}
  return {level};
};
const receipt = runInNewContext(receiptCode+'\nconfirmedRunProfileLevelUp;',{
  Number,Math,profileLevelState,sanitizeGameNumber:xp=>Math.max(0,Math.floor(Number(xp)||0))
});
const plain = v => v==null?v:JSON.parse(JSON.stringify(v));
const confirmed=(before,after,awarded,repeated=false,current=after)=>plain(receipt(before,
  {runSettlement:{accepted:true,repeated,profileXpAwarded:awarded},profile:{profileXp:after}},current));
check('fresh player level 1->2 displays exact server XP',JSON.stringify(confirmed(0,20,20))==='{"beforeXp":0,"afterXp":20}');
check('second account stale local XP cannot suppress 1->2',JSON.stringify(confirmed(300,20,20))==='{"beforeXp":0,"afterXp":20}');
check('repeated successful current-run receipt can recover missed celebration',JSON.stringify(confirmed(0,20,20,true))==='{"beforeXp":0,"afterXp":20}');
check('ordinary XP gain not crossing a level does not popup',confirmed(0,19,19)===null);
check('run without awarded XP cannot create a level-up',confirmed(0,40,0)===null);
check('rejected server receipt does not popup',receipt(0,{runSettlement:{accepted:false,profileXpAwarded:30},profile:{profileXp:30}},30)===null);
check('multi-level receipt uses only reached server XP',JSON.stringify(confirmed(0,65,65))==='{"beforeXp":0,"afterXp":65}');
// Missing stylesheet.onload must not deadlock an otherwise loaded dialog script.
const loaderStart = index.indexOf('function loadLevelUpPresentation()');
const loaderEnd = index.indexOf('\n      async function revealProfileLevelUp',loaderStart);
check('real async loader can be extracted',loaderStart>0&&loaderEnd>loaderStart);
const loaderCode = decode(index.slice(loaderStart,loaderEnd));
let appendCount=0;
const mockWindow={ZeffiLevelUp:null,setTimeout:fn=>1,clearTimeout:()=>{}};
const mockDocument={createElement:tag=>({tag}),head:{append:(style,script)=>{
  appendCount++;
  Promise.resolve().then(()=>{mockWindow.ZeffiLevelUp={show:()=>true};script.onload();});
}}};
const asyncLoader=runInNewContext('let levelUpPresentationPromise=null;'+loaderCode+'\nloadLevelUpPresentation;',{
  window:mockWindow,document:mockDocument,Promise,console
});
const loaded=await asyncLoader();
check('first-run JS resolves without any stylesheet load callback',loaded?.show&&appendCount===1);


// Regression: direct CC grants, compensation mail and server read use the same
// server-only baseline, unlike a signed run/Tasks/purchase with its own receipt.
check('server profile sync observes the authoritative XP result',index.includes('rememberConfirmedProfileXp(profile.profileXp, {')&&index.includes('announce: options.suppressLevelCelebration !== true'));
check('signed run updates server baseline without an early duplicate',index.includes('rememberConfirmedProfileXp(data.profile.profileXp, { announce: false })'));
check('account switch cancels the old popup',index.includes('caseFullStateLastSyncAt=0;pendingRunLevelUp=null;'));
check('no additional network requests for CC compensation',!index.slice(index.indexOf('const LEVEL_UP_OBSERVED_XP_PREFIX'),index.indexOf('function profileTitleForLevel(levelValue)')).includes('fetch('));
check('mail and purchase modal deferral is wired',index.includes('window.setTimeout(() => void flushPendingRunLevelUp(), 60)')&&index.includes('window.setTimeout(() => void flushPendingRunLevelUp(), 280)'));
check('welcome startup gate defers pending offline XP popup',index.includes('|| !runnerStartupGateReleased')&&index.includes('window.setTimeout(() => void flushPendingRunLevelUp(), 180)'));
const observerStart=index.indexOf('const LEVEL_UP_OBSERVED_XP_PREFIX');
const observerEnd=index.indexOf('      async function revealProfileLevelUp(',observerStart);
check('new observer functions extracted from the active game runtime',observerStart>0&&observerEnd>observerStart);
const memories=new Map();
const fakeLocalStorage={
  getItem:key=>memories.has(key)?memories.get(key):null,
  setItem:(key,value)=>memories.set(key,String(value))
};
const liveTelegram={id:'1001'};
const fakeProfileLevel=xp=>{
  let level=1,left=Math.max(0,Math.floor(Number(xp)||0));
  while(level<50){const needed=20+(level-1)*10;if(left<needed)break;left-=needed;level++;}
  return {level,totalXp:Math.max(0,Math.floor(Number(xp)||0))};
};
let timerCount=0;
function observerFixture(){
  const runtime=runInNewContext(decode(index.slice(observerStart,observerEnd))+`
({rememberConfirmedProfileXp,queueProfileLevelUp,profileLevelUpAccountId,pending:()=>pendingRunLevelUp});`,{
    Map,Number,Math,String,JSON,Object,
    telegramProfile:liveTelegram,
    localStorage:fakeLocalStorage,
    window:{setTimeout:()=>{timerCount++;return 1;}},
    profileLevelState:fakeProfileLevel,
    sanitizeProgressNumber:xp=>Math.max(0,Math.floor(Number(xp)||0))
  });
  return runtime;
}
const fixture=observerFixture();
const observe=(xp,options)=>fixture.rememberConfirmedProfileXp(xp,options);
check('initial confirmed account XP only creates a baseline',observe(0)===true&&fixture.pending()===null);
check('ordinary XP increases do not open level-up',observe(19)===true&&fixture.pending()===null);
check('server-backed 1 to 2 queues a new level modal',observe(20)===true&&JSON.stringify(fixture.pending()).includes('"afterXp":20'));
check('replayed profile response does not queue another modal',observe(20)===false);
const pendingBefore=JSON.stringify(fixture.pending());
check('older network snapshot cannot reset level-up baseline',observe(1)===false&&JSON.stringify(fixture.pending())===pendingBefore);
liveTelegram.id='2002';
check('second account starts with a distinct XP baseline',observe(300)===true&&fixture.pending()?.accountId==='1001');
check('second account does not emit an inherited popup',observe(300)===false);
liveTelegram.id='1001';
check('nonlevel XP increment does not change pending modal',observe(21)===true&&fixture.pending()?.afterXp===20);
check('new server confirmation merges multiple levels, without replay',observe(80)===true&&fixture.pending()?.beforeXp===19&&fixture.pending()?.afterXp===80);
check('silent signed-run update does not emit a popup itself',fixture.rememberConfirmedProfileXp(90,{announce:false})===true&&fixture.pending()?.afterXp===80);
check('invalid XP never affects the presentation baseline',observe(-5)===false&&observe('Infinity')===false);
check('confirmed reset does not display a popup',observe(2,{authoritative:true})===true&&fixture.pending()===null);
check('next valid level up can be detected after a reset',observe(20)===true&&fixture.pending()?.beforeXp===2&&fixture.pending()?.afterXp===20);
check('a repeated 1 to 2 event joins the existing pending queue',fixture.queueProfileLevelUp(0,20,'repeat:0:20','1001')===true&&fixture.pending()?.afterXp===20);
check('observer persists only confirmed XP scoped to user ID',JSON.parse(memories.get('zefirok-level-up-confirmed-xp-v1:1001')).xp===20&&JSON.parse(memories.get('zefirok-level-up-confirmed-xp-v1:2002')).xp===300);

// Execute the actual modal queue with an in-memory presentation API; no rewards
// or HTTP are involved. This covers the previously missing CC -> profile sync path.
const managerEnd=index.indexOf('      function profileTitleForLevel(levelValue)',observerStart);
check('actual full presenter is extractable',managerEnd>observerEnd);
const previewAccount={id:'7777'};
const previewState={running:false,profileXp:0};
const previewMail={hidden:true}, previewPurchase={hidden:true};
const modalCalls=[];
const modalApi={show:payload=>{modalCalls.push(payload);return true;}};
const previewStore=new Map();
const present=runInNewContext(decode(index.slice(observerStart,managerEnd))+`
({rememberConfirmedProfileXp,queueProfileLevelUp,flushPendingRunLevelUp,pending:()=>pendingRunLevelUp});`,{
  Map,Number,Math,String,JSON,Object,Promise,console,
  telegramProfile:previewAccount,
  localStorage:{getItem:key=>previewStore.get(key)||null,setItem:(key,value)=>previewStore.set(key,String(value))},
  window:{setTimeout:()=>1,addEventListener:()=>{}},
  state:previewState,
  document:{visibilityState:'visible'},
  runnerStartupGateReleased:true,
  playerMailLayerEl:previewMail,
  purchaseLayer:previewPurchase,
  profileLevelState:xp=>{
    let level=1,left=Math.max(0,Math.floor(Number(xp)||0));
    while(level<50){const needed=20+(level-1)*10;if(left<needed)break;left-=needed;level++;}
    const needed=20+(level-1)*10;
    return {level,totalXp:Math.max(0,Math.floor(Number(xp)||0)),currentXp:left,needed,percent:100*left/needed,isMax:level===50};
  },
  sanitizeProgressNumber:xp=>Math.max(0,Math.floor(Number(xp)||0)),
  LEVEL_CASE_SCHEDULE:[{level:2,caseType:'small',count:1},{level:3,caseType:'small',count:1},{level:4,caseType:'sweet',count:1}],
  loadLevelUpPresentation:async()=>modalApi,
  showProfileToast:()=>{throw Error('Unexpected popup fallback')},
});
present.rememberConfirmedProfileXp(0);
present.rememberConfirmedProfileXp(20);
await present.flushPendingRunLevelUp();
check('a real 1->2 CC server update shows the existing case popup',modalCalls.length===1&&modalCalls[0].fromLevel===1&&modalCalls[0].toLevel===2&&modalCalls[0].rewards?.[0]?.caseType==='small');
check('replayed server receipt does not open two popups',present.rememberConfirmedProfileXp(20)===false&&present.queueProfileLevelUp(0,20,'duplicate')===false&&modalCalls.length===1);
previewState.running=true;
present.rememberConfirmedProfileXp(50);
await present.flushPendingRunLevelUp();
check('pop-up is not opened in the middle of gameplay',modalCalls.length===1&&present.pending()?.afterXp===50);
previewState.running=false;
await present.flushPendingRunLevelUp();
check('deferred popup appears after gameplay ends',modalCalls.length===2&&modalCalls[1].toLevel===3);
previewMail.hidden=false;
present.rememberConfirmedProfileXp(90);
await present.flushPendingRunLevelUp();
check('compensation popup does not hide an open letter',modalCalls.length===2&&present.pending()?.afterXp===90);
previewMail.hidden=true;
await present.flushPendingRunLevelUp();
check('compensation popup shows when mail closes',modalCalls.length===3&&modalCalls[2].toLevel>=4);
previewAccount.id='8888';
present.rememberConfirmedProfileXp(0);
present.rememberConfirmedProfileXp(20);
previewAccount.id='9999';
await present.flushPendingRunLevelUp();
check('stale popup is suppressed on active account switch',modalCalls.length===3);
previewAccount.id='7777';
check('server-declared reset permits another 1->2 event',present.rememberConfirmedProfileXp(0,{authoritative:true})===true&&present.rememberConfirmedProfileXp(20)===true);
await present.flushPendingRunLevelUp();
check('player can celebrate level 2 again after an actual XP reset',modalCalls.length===4&&modalCalls[3].toLevel===2);

const parse=spawnSync(process.execPath,['--check',resolve(root,'assets/level-up-celebration.js')],{encoding:'utf8'});
check('level-up JS parses on Node',parse.status===0);
console.log(`Level-up celebration checks PASSED: ${checks.length} invariants; no economy, D1, or worker changes.`);
