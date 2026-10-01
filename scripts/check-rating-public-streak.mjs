#!/usr/bin/env node
// Offline regression checks. Uses only an in-memory SQLite database, never D1 remote.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

const worker = fs.readFileSync('src/worker.js', 'utf8');
const rating = fs.readFileSync('rating.html', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
let checks = 0;
const check = (condition, message) => { checks++; assert.ok(condition, message); };
const equal = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const json = value => JSON.parse(JSON.stringify(value));
function between(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Missing source boundary: ' + start);
  return source.slice(a, b);
}
function fn(source, name) {
  const match = source.match(new RegExp('function ' + name + '\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}'));
  assert.ok(match, 'Missing canonical function: ' + name); return match[0];
}

const daysCode = between(worker, 'function dailyLoyaltyDayKey(', 'function dailyLoyaltyCurrentBlock(');
const boundedCode = between(worker, 'function startupBounded(', 'async function getGameStartupPackage(');
const publicCode = between(worker, 'const LEADERBOARD_PUBLIC_STREAK_LIMIT =', 'async function leaderboardState(');
const serverBox = { console: { warn() {} }, setTimeout, clearTimeout, ApiError: class ApiError extends Error {} };
vm.runInNewContext(daysCode + '\n' + boundedCode + '\n' + publicCode + '\nthis.api={map:leaderboardPublicStreakMap,view:leaderboardPublicStreakView,sql:LEADERBOARD_PUBLIC_STREAK_SQL,limit:LEADERBOARD_PUBLIC_STREAK_LIMIT};', serverBox);
const server = serverBox.api;
const db = new DatabaseSync(':memory:');
for (const name of ['daily_loyalty_seasons', 'daily_loyalty_players', 'daily_loyalty_insurance', 'daily_loyalty_settings', 'daily_loyalty_protection_settings']) {
  const begin = worker.indexOf('CREATE TABLE IF NOT EXISTS ' + name + ' (');
  const end = worker.indexOf('`)', begin);
  check(begin >= 0 && end > begin, 'Runtime table definition: ' + name);
  db.exec(worker.slice(begin, end));
}
const now = Date.UTC(2026, 9, 1, 20, 59, 59), day = '2026-10-01';
db.prepare(`INSERT INTO daily_loyalty_seasons(id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,created_at,updated_at) VALUES(?,?,1,180,0,0,1,1,1)`).run('daily-one', 'Daily');
db.prepare(`INSERT INTO daily_loyalty_settings(season_id,insurance_enabled,insurance_max,updated_at) VALUES('daily-one',1,3,1)`).run();
db.prepare(`INSERT INTO daily_loyalty_protection_settings(season_id,max_balance,updated_at) VALUES('daily-one',3,1)`).run();
function player(id, streak, best, last, balance = 0) {
  db.prepare(`INSERT OR REPLACE INTO daily_loyalty_players(telegram_id,season_id,progress_days,streak,best_streak,last_active_day_key,updated_at) VALUES(?,'daily-one',90,?,?,?,1)`).run(id, streak, best, last);
  db.prepare(`INSERT OR REPLACE INTO daily_loyalty_insurance(telegram_id,season_id,balance,updated_at) VALUES(?,'daily-one',?,1)`).run(id, balance);
}
player('10001', 41, 60, day);
player('10002', 2, 40, day);
player('10003', 40, 40, '2026-09-30');
player('10004', 40, 40, '2026-09-29', 1);
player('10005', 40, 40, '2026-09-28', 1);
let calls = 0, bound = [];
const env = { DB: { prepare(sql) {
  check(/^\s*WITH active_daily AS/.test(sql), 'Public read is a SELECT CTE');
  check(!/\b(UPDATE|INSERT|DELETE|ALTER|CREATE|DROP|REPLACE)\b/i.test(sql), 'No mutation SQL');
  return { bind(...values) { bound = values; return { async all() { calls++; return { success: true, results: db.prepare(sql).all(...values) }; } }; } };
} } };
const snapshot = () => JSON.stringify({ p: db.prepare('SELECT * FROM daily_loyalty_players ORDER BY telegram_id').all(), i: db.prepare('SELECT * FROM daily_loyalty_insurance ORDER BY telegram_id').all() });
const before = snapshot();
const queryPlan = db.prepare('EXPLAIN QUERY PLAN ' + server.sql).all(Math.floor(now / 1000), Math.floor(now / 1000), JSON.stringify(['10001', '10002']));
for (const alias of ['p', 'i']) check(queryPlan.some(row => new RegExp('SEARCH ' + alias + ' USING').test(row.detail)), 'Indexed per-ID lookup, no player-table scan: ' + alias);
let result = await server.map(env, ['10001', '10002', '10003', '10004', '10005', '10006'], now);
equal(calls, 1, 'All players loaded with one D1 query');
equal(bound.length, 3, 'Constant parameter count, not one parameter per player');
equal(result.get('10001').currentDays, 41, 'Current series uses daily state');
equal(result.get('10001').bestDays, 60, 'Best series stays separate');
equal(result.get('10002').currentDays, 2, 'A historical 40 is not the current series');
equal(result.get('10003').currentDays, 40, 'Yesterday remains current; view does not add a day');
equal(result.get('10004').currentDays, 40, 'Sufficient protection preserves effective series');
equal(result.get('10005').currentDays, 0, 'Insufficient protection expires current series');
equal(result.get('10005').bestDays, 40, 'Expired series keeps personal best');
equal(result.get('10006').currentDays, 0, 'Confirmed new player has zero days');
equal(result.get('10001').validUntil, Date.UTC(2026, 9, 1, 21), 'Expires at next Moscow server day');
equal(Object.keys(result.get('10004')).sort(), ['asOf', 'bestDays', 'currentDays', 'validUntil'], 'Only public fields are exposed');
equal(snapshot(), before, 'Viewing never changes activity or protection');

db.prepare("UPDATE daily_loyalty_settings SET insurance_enabled=0").run();
equal((await server.map(env, ['10004'], now)).get('10004').currentDays, 0, 'Disabled protection cannot preserve series');
db.prepare("UPDATE daily_loyalty_settings SET insurance_enabled=1").run();
db.prepare("UPDATE daily_loyalty_protection_settings SET max_balance=0").run();
equal((await server.map(env, ['10004'], now)).get('10004').currentDays, 0, 'Zero protection limit is respected');
db.prepare("UPDATE daily_loyalty_protection_settings SET max_balance=3").run();
calls = 0;
const ids = Array.from({ length: 110 }, (_, i) => String(i + 10000));
result = await server.map(env, [...ids, ...ids, "1'); DROP TABLE daily_loyalty_players;--", 'not-an-id'], now);
equal(calls, 1, '100 top players plus nearby/me is still one query');
equal(result.size, 110, 'Visible top, nearby and own row can all be enriched');
equal(JSON.parse(bound[2]).length, 110, 'IDs deduplicated and invalid IDs rejected');
result = await server.map(env, Array.from({ length: 200 }, (_, i) => String(i + 10000)), now);
equal(result.size, server.limit, 'Reader has a hard upper bound');
calls = 0;
equal((await server.map(env, [], now)).size, 0, 'No requested players, no data');
equal(calls, 0, 'Empty list makes no D1 call');

db.prepare("UPDATE daily_loyalty_seasons SET ends_at=?").run(Math.floor(now / 1000) + 1);
equal((await server.map(env, ['10001'], now)).get('10001').validUntil, now + 1000, 'Program end bounds public cache');
db.prepare("UPDATE daily_loyalty_seasons SET enabled=0").run();
equal((await server.map(env, ['10001'], now)).size, 0, 'Disabled daily program hides public series');
db.prepare("UPDATE daily_loyalty_seasons SET enabled=1,ends_at=0,starts_at=?").run(Math.floor(now / 1000) + 10);
equal((await server.map(env, ['10001'], now)).size, 0, 'Future program is not activated by a profile read');
db.prepare("UPDATE daily_loyalty_seasons SET starts_at=0,timezone_offset_minutes=-300").run();
equal((await server.map(env, ['10001'], now)).get('10001').validUntil, Date.UTC(2026, 9, 2, 5), 'Offset comes from Daily, not rating season or client clock');
db.prepare("UPDATE daily_loyalty_seasons SET timezone_offset_minutes=180").run();
const unavailable = { DB: { prepare() { throw new Error('no such table: daily_loyalty_players'); } } };
equal((await server.map(unavailable, ['10001'], now)).size, 0, 'Missing optional schema does not break leaderboard');
const never = { DB: { prepare() { return { bind() { return { all: () => new Promise(() => {}) }; } }; } } };
const started = performance.now();
equal((await server.map(never, ['10001'], now)).size, 0, 'Slow optional read returns unavailable, not fake zero');
check(performance.now() - started < 2000, 'Optional read has a bounded budget');
db.close();

for (const name of ['streakTone', 'streakFlame', 'streakLaurel']) equal(fn(rating, name), fn(index, name), 'Coffee card parity: ' + name);
const uiCode = between(rating, '  // BEGIN PUBLIC STREAK UI V29', '  // END PUBLIC STREAK UI V29');
let wall = now, monotonic = 5000;
const box = { Intl, console, Date: class extends Date { static now() { return wall; } }, performance: { now: () => monotonic },
  formatter: new Intl.NumberFormat('ru-RU'), escapeHtml: v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  document: { hidden: false, addEventListener() {} }, dynamic: null, playerProfileContent: null, playerProfileSheet: null,
  playerProfileLayer: { hidden: true }, window: { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} } };
vm.runInNewContext(uiCode + '\nthis.ui={remember:rememberPublicStreaks,get:publicStreakForPlayer,badge:publicStreakBadgeMarkup,card:playerStreakMarkup,normalize:normalizePublicStreak,tone:streakTone,word:publicStreakDayWord,tick:tickPublicStreakFreshness,signature:publicStreakEntrySignature};', box);
const ui = box.ui;
const raw = (days, best = days, at = now, until = now + 10000) => ({ currentDays: days, bestDays: best, asOf: at, validUntil: until });
function received(id, streak, at = now) { ui.remember({ ok: true, serverTime: at, top: [{ telegramId: id, dailyStreak: streak }] }); }
equal(ui.badge('10001'), '', 'No public badge inferred from a stale local rating');
received('10001', raw(2, 40));
equal(ui.badge('10001'), '', 'Below ten stays out of leaderboard');
check(ui.card('10001').includes('data-streak-tier="0"'), 'Two days with best 40 keeps the quiet style');
check(ui.card('10001').includes('40'), 'Historical best remains in mini-profile');
received('10002', raw(0, 40));
check(ui.card('10002').includes('data-streak-tier="0"'), 'Inactive streak never gets a legendary card');
for (const days of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]) {
  received('10003', raw(days));
  check(ui.badge('10003').includes(`<b>${days}</b>`), 'Actual count in badge: ' + days);
  check(ui.card('10003').includes('rating-streak-milestone'), 'Every tenth day has milestone ribbon: ' + days);
  equal(ui.tone(days).next, days + 10, 'Next title milestone: ' + days);
}
received('10004', raw(41));
check(!ui.card('10004').includes('class="rating-streak-milestone"'), 'Day 41 keeps tier but not anniversary');
equal(ui.tone(41).rank, 4, 'Prestige persists after the anniversary');
for (const [n, word] of [[1,'\u0434\u0435\u043d\u044c'],[2,'\u0434\u043d\u044f'],[11,'\u0434\u043d\u0435\u0439'],[21,'\u0434\u0435\u043d\u044c'],[22,'\u0434\u043d\u044f'],[41,'\u0434\u0435\u043d\u044c'],[111,'\u0434\u043d\u0435\u0439']]) equal(ui.word(n), word, 'Russian day inflection: ' + n);
received('10005', null);
equal(ui.card('10005'), '', 'Unavailable data hidden, never replaced with zero');
equal(ui.normalize(raw(5, 4)), null, 'Malformed public counters are rejected');
equal(ui.normalize(raw(-1, 40)), null, 'Negative current count is rejected');
equal(ui.normalize(raw(2.5, 40)), null, 'Fractional days are rejected');
equal(ui.normalize(raw(5, 5, now, now + 2 * 86400000)), null, 'Long-lived malformed snapshot is rejected');
ui.remember({ ok: true, generatedAt: now + 100, player: { dailyStreak: raw(50, 50, now + 100) } }, '10006');
equal(ui.get('10006').currentDays, 50, 'Mini-profile uses requested player ID, not viewer');
received('10006', raw(10), now);
equal(ui.get('10006').currentDays, 50, 'Late older response cannot revert another rating mode');
equal(JSON.stringify(ui.signature({ score: 77, dailyStreak: raw(41) })), JSON.stringify(ui.signature({ score: 77, dailyStreak: raw(41, 41, now + 1) })), 'Refresh timestamp alone does not invalidate list rendering');
wall += 15000; monotonic += 15000; ui.tick();
equal(ui.get('10001'), null, 'Expired snapshot stops showing current series');
equal(ui.badge('10004'), '', 'Badge hidden across next server boundary');
wall = now + 20000; monotonic = 30000;
received('10007', raw(41, 41, now + 20000, now + 21000), now + 20000);
wall = now - 30000; monotonic += 1500;
equal(ui.get('10007'), null, 'Clock rollback cannot keep stale series alive');
wall = now + 30000; monotonic = 40000;
received('10008', raw(41, 41, now + 30000, now + 31000), now + 30000);
wall += 2000;
equal(ui.get('10008'), null, 'OS sleep covered by wall-clock elapsed time');

const reader = between(worker, 'async function leaderboardPublicStreakMap(', 'async function leaderboardState(');
for (const forbidden of ['loadDailyLoyaltyConfig(', 'ensureDailyLoyaltySchema(', 'claimDailyLoyalty(', '.run()', 'appendStreakProtectionGrantStatements(']) check(!reader.includes(forbidden), 'Read-only call graph: no ' + forbidden);
const profile = between(worker, 'async function leaderboardPlayerProfile(', 'const FAST_RUN_SETTLEMENT_VERSION');
check(profile.indexOf('validateTelegramInitData(') < profile.indexOf('leaderboardPublicStreakMap('), 'Profile authentication precedes public streak read');
check(profile.includes('leaderboardPublicStreakMap(env,[targetTelegramId])'), 'Profile enriches target only');
const payload = between(worker, 'async function buildLeaderboardPayload(', 'function leaderboardRowToClient(');
equal((payload.match(/leaderboardPublicStreakMap\(/g) || []).length, 1, 'One batch enriches top/nearby/me');
check(!uiCode.includes('fetch('), 'Rendering streaks never fetches each player');
check(!uiCode.includes('localStorage'), 'Public streak is not persisted as an active badge');
check(rating.includes('tickPublicStreakFreshness();\n  }, 1000);'), 'Freshness uses existing lifecycle timer');
check(rating.includes('stopPublicStreakMotion();\n    playerProfileRequest?.abort'), 'Closing sheet stops decorative work');
check(rating.includes('IntersectionObserver') && rating.includes('animation-play-state:paused'), 'Animation limited to visible mini-profile');
check(rating.includes('.rating-streak-badge::after{animation:none!important'), 'List/podium badges stay static');
check(rating.includes('.rating-player-streak::before,.rating-player-streak::after{animation:none!important'), 'Reduced motion also covers pseudo elements');
const renderProfile = between(rating, '  function renderPlayerProfile(data,targetId)', '  function cancelPlayerProfileMotion(');
check(renderProfile.indexOf('data-rating-player-streak') > renderProfile.indexOf('rating-player-profile-head'), 'Streak follows identity');
check(renderProfile.indexOf('data-rating-player-streak') < renderProfile.indexOf('<section class="rating-player-showcase"'), 'Streak precedes showcase');
check(renderProfile.includes('player?.publicTitle||rank?.title'), 'Existing achievement title is not replaced');
let scripts = 0;
for (const m of rating.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc\s*=/.test(m[1]) || /type=["']application\/(?:json|ld\+json)["']/.test(m[1])) continue;
  new vm.Script(m[2]); scripts++;
}
console.log(`Rating public streak V29 PASS: ${checks} assertions; real SQLite batch query, protection/expiry/privacy, 10-day tiers, cross-mode cache, read-only paths; ${scripts} scripts parse.`);
