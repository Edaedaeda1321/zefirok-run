#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(message)=>{throw new Error(`Game Task Reward Engine V2 check failed: ${message}`);};
const expect=(condition,message)=>{if(!condition)fail(message);};
const between=(source,start,end,label)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<0||b<=a)fail(`cannot isolate ${label}`);
  return source.slice(a,b);
};

const worker=read('src/worker.js');
const ui=read('assets/game-tasks.js');
const index=read('index.html');
const migration=read('migrations/0109_game_task_reward_engine_v2.sql');

expect(/CREATE TABLE IF NOT EXISTS game_task_reward_claims/i.test(migration),'missing game_task_reward_claims migration');
expect(/UNIQUE\s*\(telegram_id\s*,\s*kind\s*,\s*task_key\s*,\s*cycle_key\s*\)/i.test(migration),'claim idempotency tuple is not unique');
expect(/idx_game_task_reward_claims_task_analytics[\s\S]*\(kind\s*,\s*task_key\s*,\s*status\s*,\s*created_at\s*\)/i.test(migration),'Task V2 analytics index is missing');
expect(/FROM player_task_claims c[\s\S]*WHERE c\.status='claimed'/i.test(migration),'legacy task claimed backfill is missing');
expect(/FROM player_task_series_claims c[\s\S]*WHERE c\.status='claimed'/i.test(migration),'legacy series claimed backfill is missing');
expect(!/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:player_task_claims|player_task_series_claims|reward_delivery_queue)/i.test(migration),'migration must not delete legacy reward tables');

const stateBlock=between(worker,'async function buildGameTasksState','async function gameTasksState','Task Hub state block');
expect(!stateBlock.includes('await reconcilePendingGameTaskClaims('),'Task Hub state hot path still reconciles the shared reward queue');
expect(stateBlock.includes('game_task_reward_claims'),'Task Hub state does not read the V2 claim receipt');

const directBlock=between(worker,'async function applyGameTaskRewardDirect','async function claimGameTask','direct reward block');
for(const needle of [
  'game_task_reward_claims',
  "reward_delivery_queue SET status='cancelled'",
  'pending_wallet',
  'pending_treats',
  'pending_coffee',
  'profile_xp',
  'granted_cases',
  'case_player_state',
  'player_account_revision'
]) expect(directBlock.includes(needle),`direct reward block missing ${needle}`);
expect(worker.includes('function gameTaskRewardApplyGateSql()') && worker.includes('reward_delivery_archive WHERE operation_id=?'), 'legacy delivered archive gate is missing');
expect(!directBlock.includes('enqueueRewardDelivery('),'direct task reward still enqueues into reward_delivery_queue');
expect(!directBlock.includes('processPlayerRewardDeliveryQueue('),'direct task reward still processes the shared reward queue');
expect(directBlock.includes("status='claimed'"),'direct task claim is not finalized synchronously');

const claimBlock=between(worker,'async function claimGameTask','async function gameTasksApi','Task Hub claim block');
expect(claimBlock.includes('applyGameTaskRewardDirect('),'Task Hub claim does not call the direct reward engine');
expect(claimBlock.includes('async function claimGameTasksBulk'),'bulk claim backend support is missing');
expect(!claimBlock.includes('enqueueRewardDelivery('),'Task Hub claim still enqueues shared reward delivery');
expect(!claimBlock.includes('processPlayerRewardDeliveryQueue('),'Task Hub claim still waits for shared reward delivery');
expect(!claimBlock.includes('pending:true'),'Task Hub claim can still return an asynchronous pending state');
expect(worker.includes('DELETE FROM game_task_reward_claims WHERE telegram_id=?'),'player reset does not clear Task V2 receipts');
expect(worker.includes("FROM game_task_reward_claims cl WHERE cl.kind='task' AND cl.task_key=c.chain_key AND cl.status='claimed'"),'task analytics still rely on legacy player_task_claims');
expect(worker.includes("LEFT JOIN game_task_reward_claims g ON g.telegram_id=r.telegram_id AND g.kind=r.kind AND g.task_key=r.task_key AND g.cycle_key=r.cycle_key"),'important task notifications do not see V2 claim receipts');
expect(worker.includes("AND COALESCE(g.status,'')<>'claimed'"),'important task notifications can fire after a V2 claim');

expect(ui.includes('__ZEFIROK_GAME_TASKS_UI_V17__'),'Task Hub UI V17 guard is missing');
for(const forbidden of ['Проверить выдачу','ПРОВЕРКА ВЫДАЧИ','Проверяем финальную награду','result?.pending','task?.pending','task.pending']) {
  expect(!ui.includes(forbidden),`Task Hub UI still contains legacy pending UX: ${forbidden}`);
}
expect(ui.includes('Получаем…'),'Task Hub immediate claim progress label is missing');
expect(ui.includes('Награда получена'),'Task Hub success feedback is missing');

expect(index.includes('zefirok-game-tasks-inline-runtime-v17'),'index.html does not embed Task Hub runtime V17');
expect(index.includes('__ZEFIROK_GAME_TASKS_UI_V17__'),'index.html embedded runtime is not V17');
for(const forbidden of ['Проверить выдачу','ПРОВЕРКА ВЫДАЧИ','Проверяем финальную награду']) {
  expect(!index.includes(forbidden),`index.html still contains legacy Task Hub pending UX: ${forbidden}`);
}

console.log('Game Task Reward Engine V2 check PASS: synchronous idempotent claims, legacy-safe reconciliation, no Task Hub pending queue UX.');
