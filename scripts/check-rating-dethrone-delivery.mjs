#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workerPath = path.join(root, 'src', 'worker.js');
const worker = fs.readFileSync(workerPath, 'utf8');

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`RATING DETHRONE CHECK FAILED: ${message}`);
    process.exitCode = 1;
  }
}

function indexOfRequired(source, needle, label) {
  const index = source.indexOf(needle);
  assert(index >= 0, label);
  return index;
}

assert(worker.includes('const LEADERBOARD_DETHRONE_NOTIFICATION_PREFIX="rating_dethroned:";'), 'dethrone category prefix is missing');
assert(worker.includes('const LEADERBOARD_DETHRONE_DELAY_SECONDS=90;'), '90 second debounce is missing');
assert(worker.includes('const LEADERBOARD_DETHRONE_COOLDOWN_SECONDS=3600;'), 'one hour dethrone cooldown is missing');
assert(worker.includes('async function queueLeaderboardDethroneNotificationIfNeeded'), 'dethrone enqueue helper is missing');
assert(worker.includes('async function materializeLeaderboardDethroneNotification'), 'send-time dethrone revalidation is missing');
assert(worker.includes('if(String(leader.telegram_id||"")===telegramId)return {action:"cancel",reason:"rating-lead-restored"};'), 'restored leader cancellation is missing');

const decisionStart = indexOfRequired(
  worker,
  'async function v77NotificationDecision(env,telegramId,now=Math.floor(Date.now()/1000),options={})',
  'notification decision does not support priority options'
);
const decisionEnd = worker.indexOf('\n}\n\nasync function v77DeliverPlayerNotification', decisionStart);
assert(decisionEnd > decisionStart, 'notification decision function boundary is missing');
const decision = decisionEnd > decisionStart ? worker.slice(decisionStart, decisionEnd + 2) : '';

const pausedIndex = indexOfRequired(decision, 'if(Number(policy?.paused))return {allowed:false', 'priority path no longer respects global pause');
const quietIndex = indexOfRequired(decision, 'if(quiet)return {allowed:false', 'priority path no longer respects quiet hours');
const priorityIndex = indexOfRequired(decision, 'const ignoreFrequencyLimits=Boolean(options?.ignoreFrequencyLimits);if(ignoreFrequencyLimits)return {allowed:true,delay:0,reason:"priority",policy};', 'priority bypass is missing');
const dailyIndex = indexOfRequired(decision, 'if(Number(count?.count||0)>=Number(policy?.max_per_day||3))', 'ordinary daily limit is missing');
const gapIndex = indexOfRequired(decision, 'const gap=Math.max(0,Number(policy?.min_gap_seconds||0));', 'ordinary notification gap is missing');
assert(pausedIndex >= 0 && quietIndex > pausedIndex && priorityIndex > quietIndex, 'priority bypass must happen only after pause and quiet-hours checks');
assert(priorityIndex >= 0 && dailyIndex > priorityIndex && gapIndex > dailyIndex, 'priority bypass must happen before daily/gap throttles');
assert(decision.includes("AND category NOT LIKE 'rating_dethroned:%'"), 'rating dethrone events still consume the ordinary daily/gap quota');

assert(worker.includes('const legacyDethroneCutoff=now-LEADERBOARD_DETHRONE_DELAY_SECONDS;'), 'legacy deferred dethrone recovery cutoff is missing');
assert(worker.includes("UPDATE player_notification_queue SET available_at=?,updated_at=? WHERE status IN ('pending','failed') AND category LIKE 'rating_dethroned:%' AND last_error='' AND created_at<=? AND available_at>?"), 'legacy frequency-deferred dethrone rows are not reactivated');
assert(worker.includes('const ratingDethrone=isLeaderboardDethroneNotificationCategory(row.category);'), 'queue does not classify dethrone notifications');
assert(worker.includes('ignoreFrequencyLimits:ratingDethrone'), 'dethrone notifications still use ordinary frequency limits');
assert(worker.includes('const deferReason=`notification-policy:${String(decision.reason||"deferred")}`;'), 'notification policy deferral reason is not persisted');
assert(worker.includes("SET available_at=?,last_error=?,updated_at=?,lease_token='',lease_until=0"), 'queue deferral does not store its policy reason');

// The rating event must still be revalidated immediately before delivery and keep
// its own anti-spam cooldown. The generic daily cap/min-gap are the only limits bypassed.
assert(worker.includes('if(lastAt&&now-lastAt<LEADERBOARD_DETHRONE_COOLDOWN_SECONDS)return {action:"defer",reason:"rating-dethrone-cooldown"'), 'dethrone-specific cooldown is missing');
assert(worker.includes('if(!subscriber||Number(subscriber.active||0)!==1||!String(subscriber.chat_id||"").trim())return {action:"cancel",reason:"rating-bot-unavailable"};'), 'bot subscription revalidation is missing');
assert(worker.includes('if(!leader||!player)return {action:"cancel",reason:"rating-entry-missing"};'), 'rating entry revalidation is missing');

// A Control Center "restore rating record" is an authoritative leaderboard mutation too.
// It must participate in the exact same leader-transition notification pipeline.
const ownerGrantStart = indexOfRequired(
  worker,
  'async function ownerPanelGrantRatingRecord(env, ctx, telegramId, score, reason)',
  'owner rating grant function is missing'
);
const ownerGrantEnd = worker.indexOf('\n}\n\nfunction ownerPanelDirectGrantUi', ownerGrantStart);
assert(ownerGrantEnd > ownerGrantStart, 'owner rating grant function boundary is missing');
const ownerGrant = ownerGrantEnd > ownerGrantStart ? worker.slice(ownerGrantStart, ownerGrantEnd + 2) : '';
const ownerOldLeaderIndex = indexOfRequired(ownerGrant, 'const previousSeasonLeader = await leaderboardCurrentVisibleLeader(env, String(season.id)).catch(() => null);', 'owner rating grant does not capture the old visible leader');
const ownerCommitIndex = indexOfRequired(ownerGrant, 'await ownerGrantCommit(env,ctx,[', 'owner rating grant commit is missing');
const ownerNotifyIndex = indexOfRequired(ownerGrant, 'dethroneNotification = await queueLeaderboardDethroneNotificationIfNeeded(env, {', 'owner rating grant does not enqueue a dethrone notification');
assert(ownerOldLeaderIndex >= 0 && ownerCommitIndex > ownerOldLeaderIndex, 'old leader must be captured before the authoritative owner rating mutation');
assert(ownerNotifyIndex > ownerCommitIndex, 'owner dethrone notification must be evaluated only after the rating mutation commits');
assert(ownerGrant.includes('previousLeaderId: String(previousSeasonLeader.telegram_id)'), 'owner rating notification does not target the displaced leader');
assert(ownerGrant.includes('expectedLeaderId: telegramId'), 'owner rating notification does not verify the new leader');
assert(ownerGrant.includes('String(previousSeasonLeader.telegram_id) !== telegramId'), 'owner rating grant can notify a player about displacing themselves');
assert(ownerGrant.includes('dethroneNotification = { queued: false, reason: "enqueue_failed" };'), 'owner rating notification enqueue failure is not observable');
assert(ownerGrant.includes('reason, dethroneNotification'), 'owner rating audit/timeline does not retain notification diagnostics');
assert(ownerGrant.includes('allTimeScore,\n    dethroneNotification,\n    message:'), 'owner rating response does not expose notification diagnostics');

// Behavior-level proof: priority bypasses only frequency limits. It must still
// honor global pause and quiet hours and must not even query the daily log.
if (decision) {
  const quietDelay = (policy, now) => {
    const start = Number(policy.quiet_start_hour);
    const end = Number(policy.quiet_end_hour);
    const hour = new Date((Number(now) + 3 * 3600) * 1000).getUTCHours();
    const quiet = start === end ? false : start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
    if (!quiet) return 0;
    let hours = (end - hour + 24) % 24;
    if (hours === 0) hours = 24;
    return hours * 3600 + 60;
  };
  const makeDecision = new Function(
    'ensureV77Schema',
    'v77QuietDelaySeconds',
    'V67_DAY',
    `${decision}\nreturn v77NotificationDecision;`
  );
  const decide = makeDecision(async () => {}, quietDelay, 86400);

  function makeEnv({ paused = 0, count = 0, lastAt = 0 } = {}) {
    let logQueries = 0;
    const policy = { paused, max_per_day: 3, min_gap_seconds: 3600, quiet_start_hour: 22, quiet_end_hour: 9 };
    const env = {
      DB: {
        prepare(sql) {
          if (String(sql).includes('player_notification_policy')) return { first: async () => policy };
          if (String(sql).includes('player_notification_log')) {
            logQueries += 1;
            return { bind: () => ({ first: async () => ({ count, last_at: lastAt }) }) };
          }
          throw new Error(`unexpected SQL in dethrone guard: ${sql}`);
        }
      }
    };
    return { env, getLogQueries: () => logQueries };
  }

  const noonMsk = Math.floor(Date.UTC(2026, 8, 15, 9, 0, 0) / 1000);
  const lateMsk = Math.floor(Date.UTC(2026, 8, 15, 20, 0, 0) / 1000);

  {
    const mock = makeEnv({ count: 3, lastAt: noonMsk - 60 });
    const result = await decide(mock.env, '42', noonMsk, { ignoreFrequencyLimits: true });
    assert(result.allowed === true && result.reason === 'priority', 'priority dethrone is still blocked by daily/gap limits');
    assert(mock.getLogQueries() === 0, 'priority dethrone still queries ordinary notification frequency log');
  }
  {
    const mock = makeEnv({ count: 3 });
    const result = await decide(mock.env, '42', noonMsk, {});
    assert(result.allowed === false && result.reason === 'daily_limit', 'ordinary notifications no longer honor daily limit');
    assert(mock.getLogQueries() === 1, 'ordinary notification frequency log was not checked');
  }
  {
    const mock = makeEnv({ paused: 1, count: 0 });
    const result = await decide(mock.env, '42', noonMsk, { ignoreFrequencyLimits: true });
    assert(result.allowed === false && result.reason === 'paused', 'priority dethrone bypasses global pause');
  }
  {
    const mock = makeEnv({ count: 0 });
    const result = await decide(mock.env, '42', lateMsk, { ignoreFrequencyLimits: true });
    assert(result.allowed === false && result.reason === 'quiet', 'priority dethrone bypasses quiet hours');
  }
}

if (!process.exitCode) {
  console.log(`Rating dethrone delivery checks passed: ${checks} invariants.`);
}
