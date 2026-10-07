#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const worker=read('src/worker.js');
const index=read('index.html');
const platform=read('assets/sweet-run-platform.js');
const gate=read('scripts/check-production-gate.mjs');
const checks=[];
const assert=(label,ok)=>{if(!ok)throw new Error('FAIL  '+label);console.log('PASS  '+label);checks.push(label);};
function countOf(source,needle){let count=0,index=0;while(true){index=source.indexOf(needle,index);if(index<0)return count;count+=1;index+=Math.max(1,needle.length);}}
function extractAccessHostScript(source){const expression=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;for(const match of source.matchAll(expression)){const attrs=String(match[1]||'');const body=String(match[2]||'');if(/\bsrc\s*=/.test(attrs))continue;if(body.includes('function resolveMaintenanceAccess()'))return body;}return '';}

assert('startup exposes playerAccess',worker.includes('// PLAYER BAN ACCESS GATE V1')&&worker.includes('getPlayerAdminControl(telegramId, env)')&&worker.includes('maintenance, legal, playerAccess'));
assert('blocked auth has structured code',worker.includes("code: 'PLAYER_BLOCKED'")&&worker.includes("operationCode: 'PLAYER_BLOCKED'"));
assert('startup gate precedes maintenance handling',index.indexOf('const playerAccess = data?.playerAccess')>=0&&index.indexOf('const playerAccess = data?.playerAccess')<index.indexOf('const maintenance = data?.maintenance'));
assert('large player block gate exists',index.includes('id="zefirok-player-ban-gate-v2"')&&index.includes('function showPlayerBlockGate(access = {})')&&index.includes('Аккаунт заблокирован'));
assert('ban styles live in host document',countOf(index,'<style id="zefirok-player-ban-gate-v2">')===1&&!index.includes('preparedSource.includes("<style id="zefirok-player-ban-gate-v2">'));
assert('srcdoc platform injection stays intact',index.includes('preparedSource = preparedSource.includes("</head>") ? preparedSource.replace("</head>", platformTag + "</head>") : platformTag + preparedSource;'));
const accessHostScript=extractAccessHostScript(index);
assert('host access gate script exists',Boolean(accessHostScript));
let accessHostScriptParses=true;
try{new vm.Script(accessHostScript,{filename:'index-player-access-host.js'});}catch(error){accessHostScriptParses=false;console.error(error?.message||error);}
assert('host access gate script parses',accessHostScriptParses);
assert('temporary and permanent terms are shown',index.includes("return 'Бессрочно'")&&index.includes("timeZone: 'Europe/Moscow'"));
assert('game frame is disabled while blocked',index.includes("gameFrame.inert = true")&&index.includes("gameFrame.classList.remove('is-ready')"));
assert('block gate exposes rules and support actions',index.includes('Правила блокировки')&&index.includes('Апелляции, статусы и ответы')&&index.includes('openPlayerBlockDocs')&&index.includes('openPlayerBlockSupport'));
assert('blocked support auth bypass is support-only',worker.includes('async function validatePlayerSupportInitData')&&worker.includes('validateTelegramInitDataSignature(String(initData || ""), env)')&&worker.includes('do not run applyPlayerAdminControl()'));
assert('moderation appeals have dedicated support category',worker.includes('moderation: "Блокировка и апелляция"')&&worker.includes('category === "moderation"')&&index.includes("body.append('category', 'moderation')"));
assert('appeal context is server authoritative',worker.includes('context.moderationBlocked = Boolean(moderation.blocked)')&&worker.includes('context.moderationReason = String(moderation.reason || "")'));
assert('duplicate open appeals are reused',worker.includes("t.category='moderation' AND t.status IN ('new','working')")&&worker.includes('existingAppeal'));
assert('support state is loaded lazily from blocked support layer',index.includes('async function openPlayerBlockSupport')&&index.includes('await fetchPlayerBlockSupportState(true)')&&index.includes("support.addEventListener('click', () => void openPlayerBlockSupport"));
assert('resume recheck is event driven',index.includes('visibilitychange')&&index.includes('recheckPlayerAccess(false)')&&!index.includes('setInterval(recheckPlayerAccess'));
assert('blocked response reaches host gate',platform.includes('__SWEET_RUN_PLAYER_BLOCK_FETCH_V1__')&&platform.includes("postMessage({type:'sweet-run-player-blocked',detail}"));
assert('platform asset cache key bumped',index.includes('/assets/sweet-run-platform.js?v=1.2.0')&&platform.includes("const VERSION='1.2.0'"));
assert('production gate includes player ban regression',gate.includes("['player ban access gate', 'node', ['scripts/check-player-ban-gate.mjs']]"));
console.log('Player ban access gate check PASS: '+checks.length+' invariants.');
