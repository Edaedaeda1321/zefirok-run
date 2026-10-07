#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const worker=read('src/worker.js');
const index=read('index.html');
const platform=read('assets/sweet-run-platform.js');
const gate=read('scripts/check-production-gate.mjs');
const checks=[];
const assert=(label,ok)=>{if(!ok)throw new Error('FAIL  '+label);console.log('PASS  '+label);checks.push(label);};

assert('startup exposes playerAccess',worker.includes('// PLAYER BAN ACCESS GATE V1')&&worker.includes('getPlayerAdminControl(telegramId, env)')&&worker.includes('maintenance, legal, playerAccess'));
assert('blocked auth has structured code',worker.includes("code: 'PLAYER_BLOCKED'")&&worker.includes("operationCode: 'PLAYER_BLOCKED'"));
assert('startup gate precedes maintenance handling',index.indexOf('const playerAccess = data?.playerAccess')>=0&&index.indexOf('const playerAccess = data?.playerAccess')<index.indexOf('const maintenance = data?.maintenance'));
assert('large player block gate exists',index.includes('id="zefirok-player-ban-gate-v1"')&&index.includes('function showPlayerBlockGate(access = {})')&&index.includes('Аккаунт заблокирован'));
assert('temporary and permanent terms are shown',index.includes("return 'Бессрочно'")&&index.includes("timeZone: 'Europe/Moscow'"));
assert('game frame is disabled while blocked',index.includes("gameFrame.inert = true")&&index.includes("gameFrame.classList.remove('is-ready')"));
assert('resume recheck is event driven',index.includes('visibilitychange')&&index.includes('recheckPlayerAccess(false)')&&!index.includes('setInterval(recheckPlayerAccess'));
assert('blocked response reaches host gate',platform.includes('__SWEET_RUN_PLAYER_BLOCK_FETCH_V1__')&&platform.includes("postMessage({type:'sweet-run-player-blocked',detail}"));
assert('platform asset cache key bumped',index.includes('/assets/sweet-run-platform.js?v=1.2.0')&&platform.includes("const VERSION='1.2.0'"));
assert('production gate includes player ban regression',gate.includes("['player ban access gate', 'node', ['scripts/check-player-ban-gate.mjs']]"));
console.log('Player ban access gate check PASS: '+checks.length+' invariants.');
