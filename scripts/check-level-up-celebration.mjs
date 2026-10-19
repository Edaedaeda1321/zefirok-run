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
check('level reveal loads only when a new level is confirmed',index.includes('async function revealProfileLevelUp(beforeXp, afterXp, eventKey)')&&index.includes('if (to.level &lt;= from.level || to.totalXp &lt;= from.totalXp) return false;'));
check('reveal uses existing schedule, never invents awards',index.includes('LEVEL_CASE_SCHEDULE.filter(entry =&gt; entry.level &gt; from.level &amp;&amp; entry.level &lt;= to.level)'));
check('run trigger follows server settlement and results render',index.includes('renderRunResultsSettled(payload, resultContext);')&&index.includes('pendingRunLevelUp = { ...confirmedLevelUp, eventKey }'));
check('run callback guards stale run and ongoing gameplay',index.includes('pendingRunLevelUp = { ...confirmedLevelUp, eventKey }')&&index.includes('state.running || document.visibilityState === &#x27;hidden&#x27;'));
check('purchase reveals only after the 24h code dialog closes',index.includes('pendingPurchaseLevelReveal = {beforeXp: previousProfileXp')&&index.includes('if (pendingLevelReveal &amp;&amp; !force)'));
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
check('late settlement queued instead of blocking the next run',index.includes('pendingRunLevelUp = { ...confirmedLevelUp, eventKey }')&&index.includes('async function flushPendingRunLevelUp()'));

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

const parse=spawnSync(process.execPath,['--check',resolve(root,'assets/level-up-celebration.js')],{encoding:'utf8'});
check('level-up JS parses on Node',parse.status===0);
console.log(`Level-up celebration checks PASSED: ${checks.length} invariants; no economy, D1, or worker changes.`);
