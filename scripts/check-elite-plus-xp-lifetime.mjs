#!/usr/bin/env node
import fs from 'node:fs';

const worker = fs.readFileSync('src/worker.js','utf8');
const index = fs.readFileSync('index.html','utf8');
let checks = 0;
function assert(condition, message){
  checks += 1;
  if(!condition) throw new Error(`Elite+ XP lifetime check failed: ${message}`);
  console.log(`PASS  ${message}`);
}
function between(source,start,end){
  const a=source.indexOf(start);
  if(a<0)return '';
  const b=source.indexOf(end,a+start.length);
  return source.slice(a,b<0?source.length:b);
}

const resolver=between(worker,'async function seasonPassHasXpX2','function configuredSeasonPassState');
assert(Boolean(resolver),'Elite+ XP resolver exists');
assert(resolver.includes('seasonRef && typeof seasonRef === "object"'),'resolver accepts loaded season snapshot');
assert(resolver.includes('season?.tierSettings?.elitePlus'),'resolver reads Elite+ config from loaded season');
assert(resolver.includes('return config?.xpBoost !== false;'),'loaded season keeps configured paid XP boost authoritative');

const calls=[...worker.matchAll(/seasonPassHasXpX2\(env,([^,]+),/g)].map(match=>String(match[1]).trim());
assert(calls.length>=6,'all server XP award paths still consult Elite+ entitlement');
assert(calls.slice(1).every(arg=>arg==='season'||arg==='ctx.season'),'runtime XP paths reuse loaded season instead of an extra D1 read');
assert(!worker.includes('seasonPassHasXpX2(env, season.id'),'run path no longer re-reads season config by id');
assert(!worker.includes('seasonPassHasXpX2(env,ctx.season.id'),'task path no longer re-reads season config by id');

const profileBonus=between(worker,'async function getSeasonPassProfileBonusForUser','async function getSeasonPassProfileBonus(request');
assert(profileBonus.includes("season.status==='active'?seasonPassHasXpX2(env,season"),'profile bonus remains active for Elite+ throughout active season');
assert(!profileBonus.includes('seasonPassLevelFromXp') && !profileBonus.includes('SEASON_PASS_MAX_LEVEL') && !/player\?\.xp\s*[>=]/.test(profileBonus),'profile bonus is not disabled by reaching level 50 or overflow');

const startup=between(worker,'async function getGameStartupPackage','const GAME_NEWS_TYPES');
assert(startup.includes('const seasonPassBonus = seasonPassBonusResult.status === "fulfilled"'),'startup includes bounded bonus section');
assert(startup.includes('? seasonPassBonusResult.value\n      : null;'),'temporary startup bonus failure does not revoke paid benefit');
assert(!startup.includes(': { active:false, multiplier:1, claimableCount:0 };'),'old false-revocation startup fallback removed');

const overflow=between(worker,'async function claimSeasonPassOverflow','function seasonPassInteger');
assert(Boolean(overflow),'50+ claim handler exists');
assert(!/UPDATE season_pass_players SET[^;\n]*premium_tier/i.test(overflow),'50+ reward claim never changes Elite+ tier');

assert(index.includes('if (data.seasonPassBonus) applySeasonPassProfileBonus(data.seasonPassBonus);\n          else void loadSeasonPassProfileBonus();'),'client retries dedicated bonus endpoint when startup bonus section is unavailable');
assert(index.includes('state.seasonProfileXpBonusActive&amp;&amp;Number(state.seasonProfileXpMultiplier||1)&gt;=2'),'client bonus display is driven by authoritative bonus state');
assert(index.includes('включая уровни 50+'),'bonus rules explicitly promise coverage through 50+');
assert(index.includes('Элитный+ · до конца сезона'),'inventory tag communicates season-long lifetime');

console.log(`Elite+ XP lifetime check PASS: ${checks} invariants.`);
