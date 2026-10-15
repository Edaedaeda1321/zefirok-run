#!/usr/bin/env node
// D1 quota guard: old cron summaries scanned every delivered reward per invocation.
// These checks prove the new queries use the existing status/created_at indexes.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import path from 'node:path';
const root = process.cwd();
const worker = readFileSync(path.join(root, 'src/worker.js'), 'utf8');
function sqlAfter(anchor) {
  const a = worker.indexOf(anchor);
  assert.ok(a >= 0, `Missing query anchor: ${anchor}`);
  const b = worker.indexOf('`', a + anchor.length);
  const e = worker.indexOf('`', b + 1);
  assert.ok(b >= 0 && e > b, `Missing SQL template: ${anchor}`);
  return worker.slice(b + 1, e).trim();
}
// The health query isn't the first SQL in the function; locate the exact queue call.
const healthStart = worker.indexOf('const queue = await env.DB.prepare(', worker.indexOf('async function syncOperationalProblems('));
assert.ok(healthStart > 0);
const healthSql = sqlAfter('const queue = await env.DB.prepare(');
const overviewStart = worker.indexOf('phase("reward_queue_d1", () => env.DB.prepare(');
assert.ok(overviewStart > 0);
const overviewSql = sqlAfter('phase("reward_queue_d1", () => env.DB.prepare(');
assert.match(healthSql, /WHERE status='failed'/);
assert.match(healthSql, /WHERE status IN \('pending','delivering'\) AND created_at<=\?/);
assert.match(overviewSql, /WHERE status IN \('pending','delivering'\)/);
assert.ok(!/SUM\(CASE WHEN status/i.test(healthSql));
assert.ok(!/SUM\(CASE WHEN status/i.test(overviewSql));
const oldHealth = `SELECT SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed_count, SUM(CASE WHEN status IN ('pending','delivering') AND created_at<=? THEN 1 ELSE 0 END) AS overdue_count, MIN(CASE WHEN status IN ('pending','delivering') THEN created_at ELSE NULL END) AS oldest_at FROM reward_delivery_queue`;
const oldOverview = `SELECT SUM(CASE WHEN status IN ('pending','delivering') THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed FROM reward_delivery_queue`;
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE reward_delivery_queue(id INTEGER PRIMARY KEY, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX idx_reward_delivery_queue_status_created ON reward_delivery_queue(status,created_at);
CREATE INDEX idx_reward_delivery_analytics_v0793 ON reward_delivery_queue(status,updated_at);`);
const insert = db.prepare('INSERT INTO reward_delivery_queue(status,created_at,updated_at) VALUES (?,?,?)');
function normalized(q, bind = []) { return Object.fromEntries(Object.entries(db.prepare(q).get(...bind)).map(([k, v]) => [k, v == null && k !== 'oldest_at' ? 0 : v])); }
function compare(label) {
  assert.deepEqual(normalized(overviewSql), normalized(oldOverview), `${label}: overview semantics changed`);
  for (const cutoff of [1, 125, 200]) assert.deepEqual(normalized(healthSql, [cutoff]), normalized(oldHealth, [cutoff]), `${label}: health semantics changed`);
}
compare('empty');
for(let i=0;i<10000;i++)insert.run('delivered',i,i);
for (const [status,dates] of [['pending',[20,30,80,95,150]],['delivering',[40,190,230]],['failed',[12,120,250]],['cancelled',[50,60,70]]]) for(const at of dates)insert.run(status,at,at);
compare('populated');
function plan(q, bind = []) { return db.prepare('EXPLAIN QUERY PLAN ' + q).all(...bind).map(row => String(row.detail || '')); }
const oldOverviewPlan=plan(oldOverview),oldHealthPlan=plan(oldHealth,[125]);
const overviewPlan=plan(overviewSql),healthPlan=plan(healthSql,[125]);
assert.ok(oldOverviewPlan.some(x=>/SCAN reward_delivery_queue/.test(x)));
assert.ok(oldHealthPlan.some(x=>/SCAN reward_delivery_queue/.test(x)));
for (const [name, queryPlan] of [['overview', overviewPlan],['health',healthPlan]]) {
  assert.ok(queryPlan.some(x=>/SEARCH reward_delivery_queue USING/.test(x)), `${name}: indexed SEARCH absent`);
  assert.ok(!queryPlan.some(x=>/SCAN reward_delivery_queue/.test(x)), `${name}: full queue scan regressed: ${queryPlan.join(' | ')}`);
}
console.log('D1 hot-path guard PASS: identical rewards/health statistics, 2 full-table scans removed.');
console.log('Overview: ' + overviewPlan.join(' | '));
console.log('Health: ' + healthPlan.join(' | '));
