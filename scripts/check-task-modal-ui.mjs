#!/usr/bin/env node
// Regression guards for Task Hub v30: production srcdoc parity and receipt lifecycle.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; }
const source = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/game-tasks.css', 'utf8');
const js = fs.readFileSync('assets/game-tasks.js', 'utf8');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const encoded = source.match(/data-srcdoc="([\s\S]*?)" title=/);
check(encoded, 'Embedded runner is present');
const runner = decode(encoded[1]);
for (const [tag, id, asset] of [
  ['style', 'zefirok-game-tasks-inline-style-v16', css],
  ['script', 'zefirok-game-tasks-inline-runtime-v18', js]
]) {
  const re = new RegExp('<' + tag + ' id="' + id + '">([\\s\\S]*?)</' + tag + '>', 'g');
  const matches = [...runner.matchAll(re)];
  check(matches.length === 1, id + ' occurs once');
  check(matches[0][1].trim() === asset.trim(), id + ' matches external asset exactly');
}
let parsed = 0;
for (const text of [source, runner]) for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(m[1]) || /type=["']application\/(?:json|ld\+json)["']/.test(m[1])) continue;
  new vm.Script(m[2], {filename: 'task-modal-inline-' + (++parsed)});
}
new vm.Script(js, {filename:'assets/game-tasks.js'});
check(js.includes("const FILTERS=new Set(['all','daily','weekly','permanent','event','series','ready']);"), 'Permanent task filter is registered');
check(js.includes("function isPermanent(task){return !isSeries(task)&&String(task?.mode||'')==='one_time';}"), 'one_time tasks map to the permanent section');
check(js.includes("if(filter==='permanent')return isPermanent(task);"), 'Permanent filter routes one-time tasks');
check(js.includes("chip('permanent','Постоянные',counts.permanent)"), 'Permanent filter chip is rendered');
check(js.includes("if(isPermanent(task))return 'Постоянное';"), 'Permanent tasks use the permanent label');
const permanentRewardMigration=fs.readFileSync('migrations/0112_game_task_permanent_rewards.sql','utf8');
check(permanentRewardMigration.includes('"id":"legendary","amount":1,"profileXp":0,"reason":"Ветеран сезона"'), 'Level 50 reward is Legendary with no profile XP');
check(permanentRewardMigration.includes('"id":"mythic","amount":1,"profileXp":0,"reason":"Путь игрока"'), 'Player Path final reward is Mythic with no profile XP');
check(permanentRewardMigration.includes("task_key='task_once_level_50'") && permanentRewardMigration.includes("task_key='series_player_path'"), 'Unclaimed completion snapshots are rebalanced too');
check(parsed > 10, 'Real host and embedded scripts parse');
const nav = css.match(/\.gt-topbar \.gt-icon-button\{([^}]+)\}/)?.[1] || '';
for (const rule of ['width:34px', 'min-width:34px', 'max-width:34px', 'height:34px', 'min-height:34px', 'max-height:34px', 'padding:0', 'box-sizing:border-box']) check(nav.includes(rule), 'Navigation overrides generic buttons: ' + rule);
const grip = css.match(/\.gt-receipt-grabber\{([^}]+)\}/)?.[1] || '';
for (const rule of ['background:transparent', 'box-shadow:none', 'min-height:28px', 'height:28px', 'max-height:28px', 'border:0', 'padding:0']) check(grip.includes(rule), 'Grip overrides generic buttons: ' + rule);
check(css.includes('.gt-receipt-layer.is-closing{opacity:0;pointer-events:auto}'), 'Closing backdrop must not allow click-through');
check(js.includes('lockBulkReceiptViewport(layer);'), 'Displayed receipt locks the document');
check(js.includes('bindBulkReceiptGestures(layer);'), 'Receipt binds whole-sheet gestures');
check(js.includes("e.pointerType==='touch'"), 'Touch and pointer paths cannot double-handle a gesture');
check(js.includes("captureNode=e.target.closest('[data-gt-receipt-drag]')||sheet"), 'Grip clicks retain their own pointer capture target');
check(js.includes('!cancelled&&'), 'Cancelled gesture cannot dismiss');
check(js.includes("e.key==='Escape'") && js.includes("e.key!=='Tab'"), 'Keyboard dismissal and focus trap exist');
check(!runner.includes('width: min(42%, 148px)') && !runner.includes('width: min(31%, 112px)'), 'Obsolete release thumbnail sizing removed');
check(runner.includes('.release-dialog .release-image-wrap{box-sizing:border-box;width:100%;height:auto;max-height:none;aspect-ratio:auto;'), 'News uses full available width and natural aspect');
check(runner.includes('.release-dialog .release-image{display:block;width:100%;height:auto;max-height:none;object-fit:contain;'), 'News image is never cropped');

// Execute the actual production lock/close functions, not a reimplementation.
const runtime = js.slice(js.indexOf('  function lockBulkReceiptViewport('), js.indexOf('  function bindBulkReceiptGestures('));
check(runtime.includes('function closeBulkReceipt'), 'Production lifecycle extraction is complete');
class Style {
  constructor() { this.values = new Map(); }
  getPropertyValue(k) { return this.values.get(k)?.[0] || ''; }
  getPropertyPriority(k) { return this.values.get(k)?.[1] || ''; }
  setProperty(k,v,p='') { this.values.set(k,[v,p]); }
  removeProperty(k) { this.values.delete(k); }
}
class Node {
  constructor(tag='DIV') { this.tagName=tag; this.style=new Style(); this.inert=false; this.children=[]; this.events=new Map(); this.isConnected=true; this.classes=new Set(); this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x)}; }
  contains(node) { return node===this || this.children.some(c=>c.contains(node)); }
  addEventListener(type,fn) { this.events.set(type,fn); }
  removeEventListener(type,fn) { if (this.events.get(type)===fn) this.events.delete(type); }
  closest() { return null; }
  focus() { this.focused=true; }
}
const html=new Node('HTML'), body=new Node('BODY'), root=new Node(), bg=new Node(), priorInert=new Node(), styleNode=new Node('STYLE'), focus=new Node('BUTTON');
priorInert.inert=true;
body.style.setProperty('position','relative'); body.style.setProperty('top','7px');
body.style.setProperty('overflow','auto','important'); root.style.setProperty('overflow','auto');
html.style.setProperty('scroll-behavior','smooth','important');
let current=null, seq=0, reduced=false;
const timers=new Map(), scrolls=[];
const snapshot=() => JSON.stringify([html,body,root].map(n=>[...n.style.values].sort((a,b)=>a[0].localeCompare(b[0]))));
const baseline=snapshot();
root.querySelector=()=>current;
const box={console, root, screen:{querySelector:()=>focus}, document:{documentElement:html,body,activeElement:focus}, window:{scrollX:3,scrollY:284,scrollTo:(x,y)=>scrolls.push([x,y]),matchMedia:()=>({matches:reduced}),setTimeout:fn=>{timers.set(++seq,fn);return seq;},clearTimeout:id=>timers.delete(id)}};
vm.createContext(box);
vm.runInContext('let bulkReceiptViewportLock=null,bulkReceiptCloseTimer=0;\n'+runtime+'\nthis.api={lock:lockBulkReceiptViewport,unlock:unlockBulkReceiptViewport,close:closeBulkReceipt};',box);
function layer() {
  const n=new Node(), sheet=new Node(); sheet.clientHeight=200;sheet.scrollHeight=500;sheet.scrollTop=0;
  n.children=[sheet]; n.querySelector=()=>sheet;
  n.remove=()=>{n.isConnected=false;if(current===n)current=null;};
  current=n;root.children=[bg,priorInert,styleNode,n];
  return {n,sheet};
}
const {n,sheet}=layer();box.api.lock(n);
check(body.style.getPropertyValue('position')==='fixed' && body.style.getPropertyValue('top')==='-284px', 'Lock fixes the body at the saved anchor');
check(bg.inert && priorInert.inert && !n.inert && !styleNode.inert, 'Only background elements are inert');
check(n.events.size===3, 'Touch and wheel guards bound exactly once');
box.api.lock(n);check(n.events.size===3, 'Lock is idempotent');
function wheel(target,dy) { let blocked=false;n.events.get('wheel')({target,deltaY:dy,cancelable:true,preventDefault(){blocked=true;}});return blocked; }
check(wheel(n,30),'Backdrop wheel blocked');
check(!wheel(sheet,30),'Inner downward scroll allowed');
check(wheel(sheet,-30),'Top boundary does not chain to the page');
sheet.scrollTop=300;check(wheel(sheet,30),'Bottom boundary does not chain');
check(!wheel(sheet,-30),'Inner upward scroll allowed');
let disposed=0;n._gtReceiptDispose=()=>disposed++;
box.api.close();check(n.classes.has('is-closing') && timers.size===1 && bg.inert,'Animation keeps background locked');
box.api.close();check(timers.size===1 && disposed===1,'Repeated close does not reset timer or duplicate cleanup');
for (const [id,fn] of [...timers]) { timers.delete(id);fn(); }
check(current===null && !bg.inert && priorInert.inert,'Close restores previous inert states');
check(snapshot()===baseline,'Close restores inline values and !important priorities');
check(JSON.stringify(scrolls.at(-1))==='[3,284]' && focus.focused,'Close restores exact scroll and focus');
check(n.events.size===0,'Document guards removed');
box.api.unlock();check(snapshot()===baseline,'Repeated unlock is harmless');
const second=layer();box.api.lock(second.n);box.api.close();box.api.close(true);
const third=layer();box.api.lock(third.n);
check(timers.size===0 && current===third.n && bg.inert,'Rapid reopening cannot be affected by the old close timer');
box.api.close(true);check(snapshot()===baseline,'Immediate close restores all styles');
reduced=true;const fourth=layer();box.api.lock(fourth.n);box.api.close();
check(current===null && timers.size===0 && snapshot()===baseline,'Reduced motion closes synchronously');
const gate=fs.readFileSync('scripts/check-production-gate.mjs','utf8');
check(gate.includes("['task modal UI', 'node', ['scripts/check-task-modal-ui.mjs']]"),'Production gate enforces embedded/external parity');
console.log(`Task modal UI v30 PASS: ${checks} guards, ${parsed} inline scripts; srcdoc parity, lock/restore, gestures and full-width news.`);
