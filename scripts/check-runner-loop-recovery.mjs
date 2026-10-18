#!/usr/bin/env node
// Deterministic verification of the ACTUAL embedded production frame scheduler.
// No network, DB, or player save access. Emulates a mobile WebView losing rAF.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const index = readFileSync('index.html', 'utf8');
const gate = readFileSync('scripts/check-production-gate.mjs', 'utf8');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function section(first, next) {
 const start = index.indexOf(first), end = index.indexOf(next, start + first.length);
 assert.ok(start >= 0 && end > start, `missing runner section ${first} / ${next}`);
 return decode(index.slice(start, end));
}
assert.ok(index.includes('Runner rAF recovery v1'));
assert.match(index, /runnerLoopRecoveries: 0,/);
assert.match(index, /runnerLoopFrameErrors: 0,/);
assert.match(index, /window\.setInterval\(runnerLoopWatchdog, 1200\)/);
assert.match(gate, /\['runner loop freeze recovery', 'node', \['scripts\/check-runner-loop-recovery\.mjs'\]\]/);
const scheduler = section('      // Runner rAF recovery v1', '      function simulationRenderValue');
const loop = section('      function loop(now) {', '      function compactArrayInPlace');
assert.match(scheduler, /document\.visibilityState !== "visible"/);
assert.match(scheduler, /authoritativeRunSessionReadyId !== String\(state\.caseRunId\)/);
assert.match(scheduler, /runnerLastFrameAt = 0/);
assert.match(loop, /finally\s*\{\s*if \(state\.running && !state\.paused && !state\.over\) scheduleGameLoop\(\)/);
assert.doesNotMatch(scheduler.replace(/^\s*\/\/.*$/gm, ""), /\b(?:reset|startAuthoritativeRunSession|claim|buy|reward|wallet)\s*\(/);

let checks = 0;
function pass(name) { checks++; console.log('PASS ' + name); }

function runtime() {
 let clock = 1000, rafId = 0, throwDraw = false, throwUpdate = false, warnings = 0, pauses = 0;
 const frames = new Map();
 const state = {running: true, paused: false, over: false, rafId: 0, last: clock, caseRunId: 'signed-run-1', score: 17, speed: 1};
 const perf = {runnerLoopRecoveries:0,runnerLoopFrameErrors:0,fixedSimulationSteps:0,fixedStepCatchUpDrops:0,fixedStepDroppedMs:0};
 const context = vm.createContext({
   state, clientPerformance: perf,
   window: {
     requestAnimationFrame(fn) {const id = ++rafId; frames.set(id,fn); return id;},
     cancelAnimationFrame(id) {frames.delete(id);}
   },
   performance: {now:()=>clock},
   document: {visibilityState:'visible'},
   gameplayCoachFrozen:false,
   runnerStartupGateReleased:true,
   authoritativeRunSessionReadyId:'signed-run-1',
   fixedStepAccumulator:0,renderInterpolationAlpha:1,renderExtrapolationSeconds:0,
   CLIENT_OPT_FIXED_TIMESTEP:true, CLIENT_FIXED_STEP_SECONDS:1/60,
   CLIENT_MAX_FRAME_DELTA_SECONDS:.1, CLIENT_MAX_FIXED_STEPS_PER_FRAME:5,
   recordClientFrame:()=>{}, capturePreviousSimulationState:()=>{},
   update:(dt)=>{if(throwUpdate)throw new Error('update injected');state.score+=dt;},
   updateVisualMotionState:()=>{}, sendAuthoritativeRunCheckpoint:()=>Promise.resolve(),
   updateRunningHud:()=>{},draw:()=>{if(throwDraw)throw new Error('draw injected');},
   recordClientPhaseTimings:()=>{},syncSimulationRenderHistory:()=>{},
   togglePause:()=>{pauses++;state.running=false;state.paused=true;context.cancelGameLoop();},
   showProfileToast:()=>{warnings++;},
   console:{error() {}}
 });
 vm.runInContext(scheduler + '\n' + loop,context,{timeout:1000});
 return {
   state,perf,frames,context,
   get warnings(){return warnings;},get pauses(){return pauses;},
   setThrowDraw(v){throwDraw=v;},setThrowUpdate(v){throwUpdate=v;},
   advance(ms){clock+=ms;},now:()=>clock,
   runFrame(ms=16.667){clock+=ms;const next=frames.entries().next().value;assert.ok(next,'frame expected');frames.delete(next[0]);next[1](clock);},
   run(code){return vm.runInContext(code,context,{timeout:1000});}
 };
}

{
 const s=runtime();s.run('scheduleGameLoop()');assert.equal(s.frames.size,1);
 s.runFrame();assert.equal(s.frames.size,1);assert.ok(s.state.score>17);
 pass('normal rAF loop draws and schedules one next frame');
}
{
 const s=runtime();s.run('scheduleGameLoop()');
 s.setThrowDraw(true);s.runFrame();assert.equal(s.frames.size,1);
 assert.equal(s.perf.runnerLoopFrameErrors,1);assert.equal(s.state.paused,false);
 s.setThrowDraw(false);s.runFrame();assert.equal(s.frames.size,1);
 assert.equal(s.run('runnerFrameFailures'),0);
 pass('one Canvas exception cannot permanently freeze the game loop');
}
{
 const s=runtime();s.run('scheduleGameLoop()');
 s.setThrowUpdate(true);s.runFrame();assert.equal(s.frames.size,1);
 assert.equal(s.perf.runnerLoopFrameErrors,1);
 s.setThrowUpdate(false);s.runFrame();assert.equal(s.frames.size,1);
 pass('one simulation exception leaves the signed run alive, then recovers');
}
{
 const s=runtime();s.run('scheduleGameLoop()');const first=[...s.frames.keys()][0];
 const scoreBefore=s.state.score;s.advance(3000);s.run('runnerLoopWatchdog()');
 assert.equal(s.frames.size,1);assert.ok(!s.frames.has(first));
 assert.equal(s.perf.runnerLoopRecoveries,1);assert.equal(s.state.score,scoreBefore);
 assert.equal(s.state.last,s.now());assert.equal(s.run('fixedStepAccumulator'),0);
 s.runFrame();assert.equal(s.frames.size,1);assert.ok(s.state.score>scoreBefore);
 pass('missing rAF callback is re-armed without resetting score, runId or adding catch-up time');
}
{
 const s=runtime();s.run('scheduleGameLoop()');s.advance(4000);
 for(const [label,mutate,restore] of [
   ['hidden WebView',()=>s.context.document.visibilityState='hidden',()=>s.context.document.visibilityState='visible'],
   ['paused',()=>s.state.paused=true,()=>s.state.paused=false],
   ['finished',()=>s.state.over=true,()=>s.state.over=false],
   ['training hold',()=>s.context.gameplayCoachFrozen=true,()=>s.context.gameplayCoachFrozen=false],
   ['unsigned run',()=>s.context.authoritativeRunSessionReadyId='other',()=>s.context.authoritativeRunSessionReadyId='signed-run-1'],
   ['startup gate',()=>s.context.runnerStartupGateReleased=false,()=>s.context.runnerStartupGateReleased=true],
 ]) {
   mutate();s.run('runnerLoopWatchdog()');assert.equal(s.perf.runnerLoopRecoveries,0,label);restore();
 }
 assert.equal(s.frames.size,1);
 pass('watchdog does not restart hidden, paused, finished, tutorial-frozen or unauthorized runs');
}
{
 const s=runtime();s.run('scheduleGameLoop()');s.setThrowDraw(true);
 s.runFrame();s.runFrame();s.runFrame();
 assert.equal(s.perf.runnerLoopFrameErrors,3);
 assert.equal(s.pauses,1);assert.equal(s.warnings,1);
 assert.equal(s.frames.size,0);assert.equal(s.state.paused,true);
 assert.equal(s.state.caseRunId,'signed-run-1');
 s.advance(4000);s.run('runnerLoopWatchdog()');assert.equal(s.frames.size,0);
 pass('persistent frame failure uses existing safe pause and does not loop indefinitely');
}
{
 const s=runtime();s.run('scheduleGameLoop()');
 s.run('fixedStepAccumulator=0.22');s.advance(4000);
 s.run('runnerLoopWatchdog()');assert.equal(s.run('fixedStepAccumulator'),0);
 s.run('runnerLoopWatchdog()');assert.equal(s.perf.runnerLoopRecoveries,1);
 pass('stall recovery drops accumulated simulation lag and avoids duplicate rAF scheduling');
}
{
 const s=runtime();s.run('scheduleGameLoop()');s.run('cancelGameLoop()');
 assert.equal(s.frames.size,0);assert.equal(s.run('runnerLastFrameAt'),0);
 s.state.running=false;s.advance(4000);s.run('runnerLoopWatchdog()');
 assert.equal(s.perf.runnerLoopRecoveries,0);
 pass('legitimate cancel never triggers background auto-resume');
}
console.log(`Runner rAF freeze recovery: ${checks} real-scheduler cases passed.`);
