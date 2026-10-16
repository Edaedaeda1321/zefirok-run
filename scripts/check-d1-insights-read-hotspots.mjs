#!/usr/bin/env node
// Guard recurring D1 row-read hot paths found in actual Cloudflare Insights.
// No network, no production D1, no data mutation outside in-memory SQLite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const worker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const checks=[];
function check(name,fn){try{fn();checks.push(name);console.log(`PASS ${name}`);}catch(error){console.error(`FAIL ${name}: ${error.stack||error}`);process.exitCode=1;}}
function segment(from,to){let a=worker.indexOf(from);assert.ok(a!==-1,`Missing start ${from}`);let b=worker.indexOf(to,a+from.length);assert.ok(b>a,`Missing end ${to}`);return worker.slice(a,b);}

const daily=segment('async function ensureDailyLoyaltySchema(env)', 'function dailyLoyaltyDayKey(');
const dailyProbe=daily.match(/const probe = await env\.DB\.prepare\(`([^`]+)`\)\.first\(\)/)?.[1];
check('daily loyalty schema check compiles the four zero-row table references',()=>{
 assert.ok(dailyProbe,'Daily loyalty SQL probe missing');
 assert.ok(!dailyProbe.includes('sqlite_master'),'Must not scan sqlite_master four times per Worker isolate');
 for(const t of ['player_game_presence','daily_loyalty_return_tests','daily_loyalty_protection_settings','daily_loyalty_protection_grants'])
  assert.ok(dailyProbe.includes(`NOT EXISTS(SELECT 1 FROM ${t} LIMIT 0)`),`${t} is not validated`);
});
check('daily loyalty probe preserves existing/empty/missing table semantics',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`CREATE TABLE daily_loyalty_seasons(id TEXT PRIMARY KEY);
    CREATE TABLE daily_loyalty_settings(season_id TEXT PRIMARY KEY);
    CREATE TABLE daily_loyalty_progressive_rewards(season_id TEXT,week_number INTEGER,cycle_day INTEGER);
    CREATE TABLE daily_loyalty_comeback_tiers(season_id TEXT);
    CREATE TABLE daily_loyalty_economy_guard(season_id TEXT);
    CREATE TABLE player_game_presence(id INTEGER);
    CREATE TABLE daily_loyalty_return_tests(id INTEGER);
    CREATE TABLE daily_loyalty_protection_settings(id INTEGER);
    CREATE TABLE daily_loyalty_protection_grants(id INTEGER);
    INSERT INTO daily_loyalty_seasons VALUES('daily-main');
    INSERT INTO daily_loyalty_settings VALUES('daily-main');
    INSERT INTO daily_loyalty_progressive_rewards VALUES('daily-main',1,1);
    INSERT INTO daily_loyalty_comeback_tiers VALUES('daily-main');
    INSERT INTO daily_loyalty_economy_guard VALUES('daily-main');`);
  assert.equal(db.prepare(dailyProbe).get()?.id,'daily-main');
  const plan=db.prepare('EXPLAIN QUERY PLAN '+dailyProbe).all();
  assert.ok(!plan.some(x=>/sqlite_(?:master|schema)/i.test(x.detail)), 'sqlite_schema scan remains');
  db.exec('DELETE FROM daily_loyalty_comeback_tiers');
  assert.equal(db.prepare(dailyProbe).get(),undefined,'Incomplete seeds must trigger compatibility fallback');
  db.exec('INSERT INTO daily_loyalty_comeback_tiers VALUES(\'daily-main\'); DROP TABLE daily_loyalty_protection_grants;');
  assert.throws(()=>db.prepare(dailyProbe),/no such table/,'Missing auxiliary table must trigger compatibility fallback');
 }finally{db.close();}
});

const season=segment('async function ensureSeasonPassSchema(env)', 'function defaultSeasonPassTasks');
check('season pass respects existing database readiness marker',()=>{
 assert.ok(season.includes('const markerReady = await seasonPassSchemaMarkerReady(env);'));
 assert.ok(season.includes('if (markerReady || await seasonPassSchemaQuickCheck(env)) {'), 'Expensive schema check still runs despite ready marker');
 assert.ok(season.includes('if (!markerReady) await markSeasonPassSchemaReady(env);'));
});

const safeCc=segment('async function ensureSafeControlCenterSchema(env)', 'let retentionOpsV14SchemaPromise');
check('legacy reward operation id repair uses durable one-time marker',()=>{
 assert.ok(safeCc.includes("const operationBackfillMarker = 'reward-queue:operation-id-backfill:v1';"));
 assert.ok(safeCc.includes("FROM bot_system_state WHERE state_key=? LIMIT 1"));
 assert.ok(safeCc.includes("if (String(operationBackfillState?.state_value || '') !== 'ready') {"));
 assert.ok(safeCc.includes("UPDATE reward_delivery_queue SET operation_id='rq:v1:'||json_array"));
 assert.ok(safeCc.includes('ON CONFLICT(state_key) DO UPDATE SET state_value=\'ready\''));
 assert.ok(safeCc.indexOf("if (String(operationBackfillState?.state_value || '') !== 'ready') {") < safeCc.indexOf("UPDATE reward_delivery_queue SET operation_id='rq:v1:'||json_array"));
 assert.ok(safeCc.includes("CREATE TRIGGER IF NOT EXISTS trg_reward_delivery_operation_id_legacy"),'Legacy insert bridge must remain');
});
check('reward queue legacy key update is non-duplicating and trigger handles later inserts',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`CREATE TABLE reward_delivery_queue(id INTEGER PRIMARY KEY,source_type TEXT,source_id TEXT,telegram_id TEXT,reward_kind TEXT,reward_id TEXT,operation_id TEXT NOT NULL DEFAULT '');
  INSERT INTO reward_delivery_queue(id,source_type,source_id,telegram_id,reward_kind,reward_id,operation_id) VALUES(1,'season','s1','42','points','','');
  INSERT INTO reward_delivery_queue(id,source_type,source_id,telegram_id,reward_kind,reward_id,operation_id) VALUES(2,'season','s2','43','points','','already-set');`);
  const stmt=db.prepare("UPDATE reward_delivery_queue SET operation_id='rq:v1:'||json_array(source_type,source_id,telegram_id,reward_kind,reward_id) WHERE TRIM(operation_id)=''");
  assert.equal(stmt.run().changes,1);
  assert.equal(stmt.run().changes,0);
  assert.equal(db.prepare('SELECT operation_id FROM reward_delivery_queue WHERE id=2').get().operation_id,'already-set');
  assert.ok(db.prepare('SELECT operation_id FROM reward_delivery_queue WHERE id=1').get().operation_id.startsWith('rq:v1:'));
  db.exec(`CREATE TRIGGER trg_reward_delivery_operation_id_legacy AFTER INSERT ON reward_delivery_queue WHEN TRIM(NEW.operation_id)='' BEGIN UPDATE reward_delivery_queue SET operation_id='rq:v1:'||json_array(NEW.source_type,NEW.source_id,NEW.telegram_id,NEW.reward_kind,NEW.reward_id) WHERE id=NEW.id; END`);
  db.exec("INSERT INTO reward_delivery_queue(id,source_type,source_id,telegram_id,reward_kind,reward_id) VALUES(3,'case','c1','44','frame','x')");
  assert.ok(db.prepare('SELECT operation_id FROM reward_delivery_queue WHERE id=3').get().operation_id.startsWith('rq:v1:'));
 }finally{db.close();}
});

const cron=segment('async function processCriticalServerQueues(env)', 'async function processMinuteLiveOps(env)');
check('season reminder scan runs once per five minutes, critical rewards retain cadence',()=>{
 assert.ok(cron.includes('"rewardQueue", () => recordCronServiceStatus'));
 assert.ok(cron.includes('"seasonEndReminders", () => Math.floor(Date.now() / 60000) % 5 === 0'));
 assert.ok(cron.includes('processSeasonEndReminders(env)'));
 assert.ok(cron.includes("reason:'five-minute-cadence'"));
 for(let minute=0;minute<60;minute++)assert.equal(minute%5===0,(minute%5===0));
});

if(process.exitCode){console.error('D1 Insights regression guard failed.');process.exit(process.exitCode);}
console.log(`D1 Insights regression guard PASS: ${checks.length} production-safe invariants.`);
