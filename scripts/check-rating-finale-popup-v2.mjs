#!/usr/bin/env node
// Regression guard for rating results on the main game screen, rating modal,
// and safe Telegram notifications. Requires no remote accounts or D1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const index = fs.readFileSync('index.html', 'utf8');
const rating = fs.readFileSync('rating.html', 'utf8');
const worker = fs.readFileSync('src/worker.js', 'utf8');
function between(s,a,b){
 const i=s.indexOf(a); const j=s.indexOf(b,i+a.length);
 assert(i>=0&&j>i,`Cannot locate ${a} / ${b}`);
 return s.slice(i,j);
}
const dec=s=>s.replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&#x27;',"'");

// Actual results must come from the finalized previous season and remain
// visible after a new season is already active.
const mainFn=dec(between(index,'      function leaderboardMainFinaleData(data) {','      function ensureLeaderboardMainFinaleUi() {'));
const ctx={formatter:new Intl.NumberFormat('ru-RU')};
vm.createContext(ctx);
vm.runInContext(mainFn+'\nthis.getFinale=leaderboardMainFinaleData;',ctx);
const finale={seasonId:'last',seasonTitle:'Прошлый сезон',finalizedAt:1770000000,place:2,score:1566,completedRuns:8,participantCount:144,winnerName:'Зеффи',reward:null};
const active={_loadedAt:Date.now(),_uiStale:false,season:{id:'next',title:'Новый сезон',status:'active'},finale,history:[]};
const second=ctx.getFinale(active);
assert.equal(second.season.id,'last');
assert.equal(second.place,2);
assert.equal(second.nextSeason.id,'next');
assert.equal(second.participantCount,144);
assert.equal(second.reward,null);
assert.match(second.subtitle,/#2/);
assert.equal(ctx.getFinale({...active,_uiStale:true}),null,'stale cache cannot trigger an acknowledgement');
assert.equal(ctx.getFinale({...active,_loadedAt:null}),null);
assert.equal(ctx.getFinale({...active,finale:null}),null);
const winner=ctx.getFinale({...active,finale:{...finale,place:1,reward:{type:'coffee',amount:90,status:'pending'}}});
assert.equal(winner.reward.amount,90);
const spectator=ctx.getFinale({...active,finale:{...finale,place:0,score:0}});
assert.equal(spectator.place,0);
assert.equal(spectator.reward,null);

// Modal is mounted outside #zefirok-maltipoo-runner; scope there hides the
// actual overlay. Compare the complete CSS block for all finale components.
const ratingStyle=between(rating,'.rating-season-finale-overlay{','</style>');
assert(ratingStyle.includes('.rating-season-finale-overlay[hidden]{display:none!important}'));
assert(!ratingStyle.includes('#zefirok-maltipoo-runner .rating-season-finale-'),
 'The overlay is a sibling of the runner root, so root-scoped selectors are invalid');
assert(rating.includes('<section class="rating-season-finale-overlay" data-rating-finale hidden'));
assert(rating.includes('data-rating-finale-open'));
assert(rating.includes('data-rating-finale-claim-area'));

// The main game must display a one-time popup for the same signed-in player
// even if the rating is not visited. Never acknowledge before it is visible.
const opener=dec(between(index,'      function openLeaderboardMainFinale(sourceData','      function closeLeaderboardMainFinale()'));
const scheduler=dec(between(index,'      function maybeAutoShowLeaderboardMainFinale(sourceData','      async function refreshLeaderboard('));
assert(opener.indexOf('leaderboardMainFinaleLayer.hidden = false')>=0);
assert(opener.indexOf('leaderboardMainFinaleLayer.hidden = false')<opener.indexOf('localStorage.setItem('),
 'Do not mark a popup as seen until the layer is actually shown');
assert(!scheduler.includes('localStorage.setItem('),'scheduling must not pre-acknowledge an unseen popup');
assert(scheduler.includes('leaderboardMainFinaleBlocked()'),'do not interrupt active gameplay');
assert(scheduler.includes('leaderboardSeasonSummaryData()'),'recheck latest server data before showing');
assert(index.includes('zefirok-rating-finale-seen:v2:${String(telegramProfile?.id'),
 'acknowledgement must be scoped to player and season');
assert(index.includes('else window.setTimeout(() =&gt; void refreshLeaderboard(false, &quot;season&quot;, false), 260)'),
 'reuse the startup rating read rather than another API call');

// Do not regress the restricted World Zeffi entry in the shared main file.
assert(index.includes('data?.serverAuthoritative!==true||!Number.isSafeInteger(data?.revision)'),
 'merging the rating patch must preserve World Zeffi RC gating');
assert(index.includes("'./world.html'"),'world iframe should not restore ?world_tester=1');

const eligibility=between(worker,'function leaderboardSeasonAcceptsDethroneNotice(season,now){','async function queueLeaderboardDethroneNotificationIfNeeded');
const seasonCtx={};vm.createContext(seasonCtx);
vm.runInContext(eligibility+'\nthis.ok=leaderboardSeasonAcceptsDethroneNotice;',seasonCtx);
const scheduled={status:'scheduled',starts_at:100,ends_at:200,finalized_at:null};
assert.equal(seasonCtx.ok(scheduled,150),true,'scheduled-but-started should still dispatch desthrone');
assert.equal(seasonCtx.ok({...scheduled,status:'active'},150),true);
assert.equal(seasonCtx.ok(scheduled,99),false);
assert.equal(seasonCtx.ok(scheduled,200),false);
assert.equal(seasonCtx.ok({...scheduled,finalized_at:149},150),false);
assert.equal(seasonCtx.ok({...scheduled,status:'ended'},150),false);
const queue=between(worker,'async function queueLeaderboardDethroneNotificationIfNeeded','async function recoverOwnerRatingDethroneNotifications');
const materialize=between(worker,'async function materializeLeaderboardDethroneNotification','function v77MoscowHour');
assert(queue.includes('leaderboardSeasonAcceptsDethroneNotice(season,now)'));
assert(materialize.includes('leaderboardSeasonAcceptsDethroneNotice(season,now)'));
assert(queue.includes('subscriber&&Number(subscriber.active||0)!==1'),'explicitly blocked users must remain excluded');
assert(queue.includes('subscriber?.chat_id||previousId'),'recover chats where subscriber rows were never persisted');
assert(materialize.includes('subscriber?.chat_id||telegramId'));
assert(materialize.includes('rating-lead-restored'),'do not notify players already back in first place');
assert(worker.includes('const LEADERBOARD_DETHRONE_DELAY_SECONDS=90;'));
assert(worker.includes('cleanChat:false'),'do not delete unrelated bot chat messages');

const winnerQueue=between(worker,'async function queueLeaderboardWinnerNotification','async function recoverLeaderboardWinnerNotifications');
assert(winnerQueue.includes('LEFT JOIN bot_subscribers'),'winner must work without subscriber record');
assert(winnerQueue.includes("COALESCE(NULLIF(TRIM(b.chat_id),''),r.telegram_id)"));
assert(winnerQueue.includes('(b.active IS NULL OR b.active=1)'),'explicitly disabled user is excluded');
assert(winnerQueue.includes("player_mail:rating_winner:")===false,'winner category must be generated by helper');
assert(worker.includes('await recoverLeaderboardWinnerNotifications(env);'),'winner recovery must run in cron');
assert(worker.includes('await queueLeaderboardWinnerNotification(env, String(season.id), now);'),
 'winner must be queued only after the authoritative finalize');
assert(worker.includes("await sendPlayerTransactionalNotificationNow(env,row.telegram_id,deliveryChatId"),
 'winner notification delivery must use transactional sender');
console.log('Rating finale popup v2: PASS (main authoritative popup, per-player seen, rating CSS, World RC, dethrone and winner safeguards).');
