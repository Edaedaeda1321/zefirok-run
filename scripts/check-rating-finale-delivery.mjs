#!/usr/bin/env node
// Rating season close regression: authoritative finale, winner push and dedupe.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';

const worker=fs.readFileSync('src/worker.js','utf8');
const rating=fs.readFileSync('rating.html','utf8');
const migration=fs.readFileSync('migrations/0116_rating_winner_notification_dedupe.sql','utf8');
function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`missing runtime markers: ${start} / ${end}`);
  return source.slice(a,b);
}

assert(worker.includes('const finalePromise = mode === "season"'), 'finale must be in existing rating read and never in all-time');
assert(worker.includes('const [topResult, me, reward, nextSeasonRow, finale]'), 'finale must use same auth/response');
assert(worker.includes('    finale,\n    reward:'), 'finale not serialized to client');
assert(worker.includes('try { await queueLeaderboardWinnerNotification(env, String(season.id), now); }'), 'winner enqueue missing after close');
assert(worker.includes('await recoverLeaderboardWinnerNotifications(env);'), 'crash recovery not scheduled');
assert(rating.includes('const result = data?.finale;'), 'UI must consume authoritative finale');
assert(rating.includes('data-rating-finale-claim-area'), 'winner claim missing from finale');
assert(rating.includes('data-rating-finale-outcome'), 'nonwinner result missing');
assert(rating.includes('if (cache.season?._uiStale || !cache.season?._loadedAt) return;'), 'stale finale may be marked seen');
assert(rating.includes('new Date(nextStartsAt)'), 'next season date must stay in milliseconds');
assert(!rating.includes('new Date(nextStartsAt * 1000)'), 'incorrect timestamp scaling reintroduced');

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`
CREATE TABLE leaderboard_seasons (
  id TEXT PRIMARY KEY,title TEXT,starts_at INTEGER,ends_at INTEGER,status TEXT,finalized_at INTEGER,
  reward_type TEXT,reward_amount INTEGER,reward_item_id TEXT,reward_title TEXT,reward_image_url TEXT);
CREATE TABLE leaderboard_entries (
  season_id TEXT,telegram_id TEXT,display_name TEXT,best_score INTEGER,achieved_at INTEGER,hidden INTEGER);
CREATE INDEX idx_test_entry ON leaderboard_entries(season_id,hidden,best_score DESC,achieved_at,telegram_id);
CREATE TABLE leaderboard_runs(season_id TEXT,telegram_id TEXT,accepted INTEGER);
CREATE TABLE leaderboard_rewards (
  id TEXT,season_id TEXT,telegram_id TEXT,place INTEGER,reward_type TEXT,reward_amount INTEGER,
  reward_item_id TEXT,status TEXT,created_at INTEGER,claimed_at INTEGER,expires_at INTEGER);
CREATE TABLE bot_subscribers(telegram_id TEXT PRIMARY KEY,chat_id TEXT,active INTEGER);
CREATE TABLE player_notification_queue(
  id INTEGER PRIMARY KEY,telegram_id TEXT,chat_id TEXT,category TEXT,message_html TEXT,reply_markup_json TEXT,
  status TEXT,attempts INTEGER,last_error TEXT,available_at INTEGER,created_at INTEGER,updated_at INTEGER,
  lease_token TEXT,lease_until INTEGER);
`);
sqlite.exec(migration);

const now=1800000000;
const insSeason=sqlite.prepare('INSERT INTO leaderboard_seasons VALUES(?,?,?,?,?,?,?,?,?,?,?)');
insSeason.run('older','Сезон 9',now-800000,now-400000,'ended',now-399980,'coffee',50,'','50 кофе','');
insSeason.run('closed','Сезон 10 · Зефирный кубок',now-100000,now-1000,'ended',now-970,'case',2,'gold','2 золотых кейса','');
insSeason.run('unfinalized','Сезон черновик',now-500,now-200,'ended',null,'coffee',1,'','','');
insSeason.run('current','Сезон 11',now-100,now+10000,'active',null,'coffee',30,'','','');
const insEntry=sqlite.prepare('INSERT INTO leaderboard_entries VALUES(?,?,?,?,?,?)');
insEntry.run('closed','100','Лидер',1000,now-6000,0);
insEntry.run('closed','200','Второй',850,now-5000,0);
insEntry.run('closed','300','Третий',850,now-4900,0);
const insReward=sqlite.prepare('INSERT INTO leaderboard_rewards VALUES(?,?,?,?,?,?,?,?,?,?,?)');
insReward.run('closed:100:1:case','closed','100',1,'case',2,'gold','pending',now-970,null,now+86400);
sqlite.prepare('INSERT INTO bot_subscribers VALUES(?,?,?)').run('100','100',1);
const insRun=sqlite.prepare('INSERT INTO leaderboard_runs VALUES(?,?,?)');
insRun.run('closed','200',1);insRun.run('closed','200',1);insRun.run('closed','200',0);

const DB={prepare(sql){let vals=[];return {
  bind(...args){vals=args;return this;},
  first(){return sqlite.prepare(sql).get(...vals)||null;},
  all(){return {results:sqlite.prepare(sql).all(...vals)};},
  run(){const result=sqlite.prepare(sql).run(...vals);return {meta:{changes:result.changes,last_row_id:result.lastInsertRowid}};}
};}};
const env={DB};
const rewardToClient=(row,config)=>({
  id:String(row.id),seasonId:String(row.season_id),place:row.place,
  type:String(row.reward_type),amount:Number(row.reward_amount),itemId:String(row.reward_item_id),
  title:String(config.rewardTitle),status:String(row.status)
});

const finaleFns=between(worker,'async function leaderboardLatestFinaleForPlayer','async function buildLeaderboardPayload');
const finaleCtx={env,console,rewardToClient};
vm.createContext(finaleCtx);
vm.runInContext(`${finaleFns}\nthis.readFinale=leaderboardLatestFinaleForPlayer;`,finaleCtx);
const first=await finaleCtx.readFinale(env,'100',now);
assert.equal(first.seasonId,'closed','must read the last finalized season despite next active season');
assert.equal(first.place,1);
assert.equal(first.score,1000);
assert.equal(first.participantCount,3);
assert.equal(first.winnerName,'Лидер');
assert.equal(first.reward.amount,2);
assert.equal(first.reward.itemId,'gold');
assert.equal(first.reward.status,'pending');
const second=await finaleCtx.readFinale(env,'200',now);
assert.equal(second.place,2);
assert.equal(second.score,850);
assert.equal(second.completedRuns,2);
assert.equal(second.reward,null,'second place must not receive a fabricated reward');
const third=await finaleCtx.readFinale(env,'300',now);
assert.equal(third.place,3,'equal scores must use achieved_at as server tie breaker');
const spectator=await finaleCtx.readFinale(env,'999',now);
assert.equal(spectator.place,0);
assert.equal(spectator.reward,null);
assert.equal(await finaleCtx.readFinale(env,'100',now+31*86400),null,'old seasons should not pop up for new players');

const notices=between(worker,'const LEADERBOARD_WINNER_NOTICE_PREFIX','async function expireLeaderboardRewardsAndNotify');
const noticeCtx={
  console,
  leaderboardRewardNotificationTitle:(reward,season)=>season.reward_title || `${reward.reward_amount} ${reward.reward_type}`,
  escapeHtml:text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;'),
  configuredGameOpenUrl:()=> 'https://example.test/?screen=rating'
};
vm.createContext(noticeCtx);
vm.runInContext(`${notices}\nthis.enqueue=queueLeaderboardWinnerNotification;this.recover=recoverLeaderboardWinnerNotifications;`,noticeCtx);
let recovered=await noticeCtx.recover(env,now);
assert.equal(recovered.queued,1,'recently finalized winners must be recovered');
recovered=await noticeCtx.recover(env,now);
assert.equal(recovered.queued,0,'recovery cannot enqueue the winner twice');
const encore=await noticeCtx.enqueue(env,'closed',now);
assert.equal(encore.queued,0,'unique migration must dedupe manual/cron close race');
let delivered=sqlite.prepare('SELECT * FROM player_notification_queue').all();
assert.equal(delivered.length,1);
assert.equal(delivered[0].telegram_id,'100');
assert.match(delivered[0].message_html,/Первое место/);
assert.match(delivered[0].message_html,/2 золотых кейса/);
assert.match(delivered[0].category,/^player_mail:rating_winner:closed$/);
assert.equal(JSON.parse(delivered[0].reply_markup_json).inline_keyboard[0][0].web_app.url,'https://example.test/?screen=rating');
assert.equal(delivered[0].status,'pending');
assert.throws(()=>sqlite.prepare(`INSERT INTO player_notification_queue(category) VALUES('player_mail:rating_winner:closed')`).run(),/UNIQUE/i);

const uiCode=between(rating,'  function ratingFinaleData(data) {','  function ratingFinaleInline(data) {');
const uiCtx={
  mode:'season',
  seasonLabel:(value)=>value.title,
  seasonDisplayName:(value)=>value.title
};
vm.createContext(uiCtx);
vm.runInContext(`${uiCode}\nthis.finaleData=ratingFinaleData`,uiCtx);
const uiResult=uiCtx.finaleData({season:{id:'current',title:'Сезон 11',status:'active',startsAt:1000},finale:first,history:[]});
assert.equal(uiResult.season.id,'closed');
assert.equal(uiResult.place,1);
assert.equal(uiResult.reward.amount,2);
assert.equal(uiResult.nextSeason.id,'current');
assert.equal(uiCtx.finaleData({season:{id:'current',status:'active'},finale:null}),null);
uiCtx.mode='all_time';
assert.equal(uiCtx.finaleData({season:{id:'current',status:'active'},finale:first}),null,'all-time mode does not open seasonal finale');

console.log('Rating finale and winner delivery: PASS (finalized/current split, rank/ties, winner prize, no fake rewards, 30-day UX, Telegram dedupe/recovery, UI binding).');
