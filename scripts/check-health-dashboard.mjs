#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const owner=fs.readFileSync('owner.html','utf8');
const worker=fs.readFileSync('src/worker.js','utf8');
const gate=fs.readFileSync('scripts/check-production-gate.mjs','utf8');
const caseGuard=fs.readFileSync('scripts/check-case-stability.mjs','utf8');
let checks=0;
function assert(condition,message){checks+=1;if(!condition){console.error(`HEALTH DASHBOARD CHECK FAILED: ${message}`);process.exitCode=1;}}
function between(source,start,end){const a=source.indexOf(start);const b=a>=0?source.indexOf(end,a+start.length):-1;return a>=0&&b>a?source.slice(a,b):'';}

const caseGateStep="['case opening stability', 'node', ['scripts/check-case-stability.mjs']]";
const healthGateStep="['health dashboard', 'node', ['scripts/check-health-dashboard.mjs']]";
assert(gate.includes(caseGateStep),'Case Stability guard disappeared from Production Release Gate');
assert(gate.includes(healthGateStep),'Health Dashboard guard is not wired into Production Release Gate');
assert(gate.indexOf(caseGateStep)>=0&&gate.indexOf(healthGateStep)>gate.indexOf(caseGateStep),'Health Dashboard guard must run after Case Stability guard');
assert(caseGuard.includes('CASE_API_OPEN_GRANTED_STATUS_PATH'),'current Case Stability guard is missing read-only case status protection');

assert(owner.includes('id="cc34HealthDashboard"'),'Health Dashboard mount is missing from monitoring view');
assert(owner.includes('/* CC 3.4 · Production Health Dashboard */'),'Health Dashboard CSS/JS marker is missing');
assert(owner.includes('function cc34RenderHealthDashboard'),'Health Dashboard renderer is missing');
assert(owner.includes('function cc34ScheduleHealthRefresh'),'Health Dashboard auto-refresh scheduler is missing');
assert(owner.includes('const CC34_HEALTH_REFRESH_MS=60000;'),'Health Dashboard refresh interval must stay at 60 seconds');
assert(owner.includes("today:[['dashboard','Сегодня'],['analytics','Аналитика'],['monitoring','Здоровье']]"),'Control Center Today navigation does not expose Health Dashboard');
assert(owner.includes("ccOpsNavButton('monitoring','⌁','Health Dashboard','Queues + Cron + API')"),'System room does not link to Health Dashboard');
assert(owner.includes("const d=await api('/api/owner/v85/monitoring');state.monitoring=d;cc34RenderHealthDashboard(d);"),'monitoring response is not rendered into Health Dashboard');
assert(owner.includes("if((name==='monitoring'||state.view==='monitoring')&&state.monitoring)cc34RenderHealthDashboard(state.monitoring);"),'Health Dashboard does not resume when returning to monitoring');
assert(owner.includes('data-cc34-view="releases"'),'Health Dashboard has no safe route to Release Gate');
assert(owner.includes('data-cc34-view="system"'),'Health Dashboard has no safe route to System');
assert(owner.includes('data-cc34-view="safety"'),'Health Dashboard has no safe route to Safety');
assert(owner.includes('data.hourly'),'Health Dashboard does not use hourly telemetry');
assert(owner.includes('data.healthReasons'),'Health Dashboard does not surface authoritative health reasons');
assert(owner.includes('data.maintenancePreflight'),'Health Dashboard does not surface maintenance preflight');
assert(owner.includes("cc34HealthService(data,'reward-delivery')"),'reward-delivery service health is missing');
assert(owner.includes("cc34HealthService(data,'season-processing')"),'season-processing service health is missing');
assert(owner.includes('state.releaseGate'),'Health Dashboard does not show already-known Release Gate state');
assert(!owner.includes('cc34HealthRepair')&&!owner.includes('cc34HealthFix'),'Health Dashboard must remain observation-only');

const healthClient=between(owner,'const CC34_HEALTH_REFRESH_MS=60000;','async function loadMonitoring(){');
assert(Boolean(healthClient),'cannot isolate Health Dashboard client helper block');
assert(!healthClient.includes('/api/cases/')&&!healthClient.includes('open-granted'),'Health Dashboard client must not call or reference case endpoints');
assert(!/\b(?:POST|PUT|PATCH|DELETE)\b/.test(healthClient),'Health Dashboard client must not introduce mutation methods');

assert(worker.includes('"/api/owner/v85/monitoring": "read"'),'monitoring endpoint must remain a read-only owner route');
assert(worker.includes('healthReasons:reasons'),'monitoring endpoint no longer returns server-authoritative health reasons');
assert(worker.includes("status:critical?'critical':warning?'warning':'healthy'"),'monitoring endpoint no longer computes authoritative overall health status');
assert(worker.includes('maintenancePreflight'),'monitoring endpoint no longer returns maintenance preflight state');
assert(worker.includes('playerApiFailureCount'),'monitoring endpoint no longer returns Player API failure signals');
assert(worker.includes('hourly:'),'monitoring endpoint no longer returns hourly telemetry');
const monitoringHandler=between(worker,'async function ownerPanelV85Monitoring(env,ctx){','async function ownerPanelV85MonitoringConfig');
assert(Boolean(monitoringHandler),'cannot isolate ownerPanelV85Monitoring handler');
assert(!/env\.DB\.prepare\(\s*`(?:INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/.test(monitoringHandler),'monitoring handler must stay D1 read-only');
assert(!monitoringHandler.includes('/api/cases/')&&!monitoringHandler.includes('openGrantedCase'),'monitoring handler must stay isolated from case opening');

let parsedScripts=0;
const scriptRe=/<script([^>]*)>([\s\S]*?)<\/script>/gi;
for(const match of owner.matchAll(scriptRe)){
  const attrs=String(match[1]||'');
  const body=String(match[2]||'');
  if(/\bsrc\s*=/.test(attrs)||/type\s*=\s*["']application\/(?:json|ld\+json)["']/i.test(attrs)||!body.trim())continue;
  try{new vm.Script(body,{filename:`owner-inline-${parsedScripts+1}.js`});parsedScripts+=1;}catch(error){console.error(`HEALTH DASHBOARD CHECK FAILED: owner inline script does not parse: ${error.message}`);process.exitCode=1;break;}
}
assert(parsedScripts>0,'no executable owner inline scripts were parsed');

if(!process.exitCode)console.log(`Health Dashboard checks passed: ${checks} guards + ${parsedScripts} owner inline scripts parse. Case Stability remains ahead of Health Dashboard in the release gate.`);
