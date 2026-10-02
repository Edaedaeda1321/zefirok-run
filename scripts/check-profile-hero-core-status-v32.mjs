#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html','utf8');
const worker = fs.readFileSync('src/worker.js','utf8');
let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks += 1; };

const heroStart = index.indexOf('&lt;div class=&quot;profile-hero&quot;&gt;');
const quickbarStart = index.indexOf('&lt;div class=&quot;profile-v2-quickbar&quot;', heroStart);
ok(heroStart >= 0 && quickbarStart > heroStart, 'profile hero markup exists');
const hero = index.slice(heroStart, quickbarStart);

ok(hero.includes('class=&quot;profile-mail-shortcut&quot;'), 'mail envelope shortcut stays in hero');
ok(hero.includes('class=&quot;profile-avatar-wrap&quot;'), 'avatar stays in hero');
ok(hero.includes('class=&quot;profile-core-stats&quot;'), 'compact game status row exists');
ok(hero.includes('data-profile-core-level-value'), 'profile level segment exists');
ok(hero.includes('data-profile-streak-open'), 'daily streak segment exists');
ok(hero.includes('data-profile-core-pass-value'), 'season pass level segment exists');
ok(hero.includes('class=&quot;profile-core-flame&quot;'), 'streak uses internal flame artwork instead of emoji');
ok(!hero.includes('data-profile-source-badge'), 'Telegram profile pill removed from identity hero');
ok(!hero.includes('data-profile-premium-badge'), 'Telegram Premium pill removed from identity hero');
ok(hero.includes('&gt;Новичок&lt;/button&gt;'), 'title row no longer duplicates profile level');
ok(!hero.includes('Новичок · уровень 1'), 'legacy combined title and level copy removed');

ok(index.includes('.profile-core-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));height:50px;min-height:50px'), 'desktop compact row has bounded 50px height');
ok(index.includes('@media(max-width:390px){\n  #zefirok-maltipoo-runner .profile-hero{padding:12px}\n  #zefirok-maltipoo-runner .profile-core-stats{height:48px;min-height:48px'), 'mobile compact row stays bounded at 48px');
ok(index.includes('.profile-rank--button{min-height:31px!important'), 'title row remains compact');
ok(index.includes('data-streak-tier=&quot;10&quot;'), 'platinum streak tier has compact profile treatment');
ok(index.includes('data-tier=&quot;elite_plus&quot;'), 'Elite+ pass segment has compact profile treatment');

ok(index.includes('let seasonPassProfileLevel = 0;'), 'client keeps pass level separately from tier');
ok(index.includes('let profileDailyStreakState = null;'), 'client keeps read-only daily streak summary');
ok(index.includes('renderProfileCoreStats(levelState);'), 'profile render updates compact status row');
ok(index.includes('if (profileRankEl) profileRankEl.textContent = rank;'), 'rank render does not append level');
ok(index.includes('message.type === &quot;zefirok-daily-streak-summary&quot;'), 'game receives streak summary from host');
ok(index.includes("target.postMessage({type:'zefirok-daily-streak-summary'"), 'daily loyalty publishes streak summary to game frame');
ok(index.includes("model=data;lastSuccessAt=Date.now();lastError='';publishProfileStreakSummary();"), 'repeated daily reads also refresh streak summary');
ok(index.includes("frame.addEventListener('load',()=>{publishProfileStreakSummary();updateEntry();syncVisibility();}"), 'cached streak republishes after game frame reload');
ok(index.includes('window.parent.postMessage({ type: &quot;zefirok-open-daily-loyalty&quot; }'), 'compact streak segment opens existing daily activity');
ok(index.includes('data-profile-core-pass data-battle-pass-open'), 'compact pass segment reuses existing battle pass navigation');
ok(index.includes('zefirok-profile-hero-first-paint-v36'), 'profile hero parser-time hydrator exists');
ok(index.includes("localStorage.getItem(&#x27;zefirok-profile-core-state-v1&#x27;)"), 'first paint reads cached profile core state synchronously');
ok(index.includes('profile-mail-shortcut{position:absolute;right:12px;top:12px;z-index:6;display:grid;place-items:center;width:36px;height:36px'), 'critical mail shortcut size is available before profile markup');
ok(index.includes("if (!initData) {\n          // Telegram initData can appear a moment after the srcdoc starts parsing."), 'missing initData does not clear cached pass tier during boot');

const bonusSection = worker.slice(worker.indexOf('async function getSeasonPassProfileBonusForUser'), worker.indexOf('async function getSeasonPassProfileBonus(request,env)'));
ok((bonusSection.match(/passLevel:/g) || []).length === 3, 'all profile-bonus season branches expose passLevel');
ok(worker.includes('function seasonPassProfileDisplayLevel(player){') && worker.includes('seasonPassLevelFromXp(Math.max(0,Number(player?.xp)||0))'), 'profile-bonus pass level helper stays server-derived from pass XP');
ok((bonusSection.match(/passLevel:seasonPassProfileDisplayLevel\(player\)/g) || []).length === 2, 'active and ended season branches use the fail-soft pass-level helper');
ok(worker.includes('passLevel:testProjectSeasonPassLevelFromXp(state.passXp),status:"active"'), 'Test Project profile bonus mirrors pass level contract');
ok(index.includes('if (Object.prototype.hasOwnProperty.call(data, &quot;passLevel&quot;)) seasonPassProfileLevel'), 'client consumes server pass level without extra state request');
ok(index.includes("const API='/api/daily-loyalty/claim'"), 'daily streak continues using existing daily loyalty flow');

console.log(`Profile hero core status V32 PASS: ${checks} invariants; same hero keeps mail/avatar/title while Telegram pills become level/streak/pass progress.`);
