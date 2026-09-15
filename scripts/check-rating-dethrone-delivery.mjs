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
assert(worker.includes('async function recoverOwnerRatingDethroneNotifications'), 'durable owner-rating dethrone recovery is missing');
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
assert(worker.includes("ORDER BY CASE WHEN category LIKE 'rating_dethroned:%' THEN 0 ELSE 1 END,available_at ASC,id ASC LIMIT ?"), 'dethrone notifications are not prioritized ahead of generic queue backlog');
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
assert(ownerGrant.includes('const previousLeaderId = String(previousSeasonLeader?.telegram_id || "");'), 'owner rating grant does not persist a stable previous leader id');
assert(ownerGrant.includes('previousScore,score,previousLeaderId,targetHidden:Boolean(hidden)'), 'atomic owner grant receipt does not retain dethrone recovery context');
assert(ownerGrant.includes('previousLeaderId,\n          expectedLeaderId: telegramId'), 'owner rating notification does not target the displaced leader and verify the new leader');
assert(ownerGrant.includes('previousLeaderId !== telegramId'), 'owner rating grant can notify a player about displacing themselves');
assert(ownerGrant.includes('dethroneNotification = { queued: false, reason: "target_hidden" };'), 'hidden tester targets are not diagnosed explicitly');
assert(ownerGrant.includes('dethroneNotification = { queued: false, reason: "enqueue_failed" };'), 'owner rating notification enqueue failure is not observable');
assert(ownerGrant.includes('previousLeaderId, targetHidden: Boolean(hidden), reason, dethroneNotification'), 'owner rating audit/timeline does not retain notification diagnostics');
assert(ownerGrant.includes('previousLeaderId,\n    targetHidden: Boolean(hidden),\n    dethroneNotification,'), 'owner rating response does not expose notification diagnostics');
assert(ownerGrant.includes('Уведомление прежнему лидеру поставлено в очередь примерно на 90 секунд.'), 'Control Center response does not explain successful dethrone scheduling');
assert(ownerGrant.includes('этот аккаунт скрыт из рейтинга настройкой тестера'), 'Control Center response does not explain hidden-target suppression');

// A successful rating write must remain recoverable if the request dies between
// the atomic grant receipt and the post-commit enqueue call.
const recoveryStart = indexOfRequired(
  worker,
  'async function recoverOwnerRatingDethroneNotifications(env,limit=12)',
  'owner rating recovery function is missing'
);
const recoveryEnd = worker.indexOf('\n}\n\nasync function materializeLeaderboardDethroneNotification', recoveryStart);
assert(recoveryEnd > recoveryStart, 'owner rating recovery function boundary is missing');
const recovery = recoveryEnd > recoveryStart ? worker.slice(recoveryStart, recoveryEnd + 2) : '';
assert(recovery.includes('FROM owner_grant_operations'), 'owner rating recovery does not scan durable grant receipts');
assert(recovery.includes('ORDER BY rowid DESC LIMIT 80'), 'owner rating recovery does not bound its receipt scan to recent rows');
assert(recovery.includes('String(receipt?.grantType||"")==="rating_record"&&String(receipt?.previousLeaderId||"").trim()'), 'owner rating recovery does not require previous leader context');
assert(recovery.includes('player_notification_queue WHERE telegram_id=? AND category=? AND created_at>=?'), 'owner rating recovery does not detect an existing queue record');
assert(recovery.includes('player_notification_log WHERE telegram_id=? AND category=? AND sent_at>=?'), 'owner rating recovery does not detect an already sent notification');
assert(recovery.includes('queueLeaderboardDethroneNotificationIfNeeded(env,{seasonId,previousLeaderId,expectedLeaderId})'), 'owner rating recovery does not reuse the canonical dethrone enqueue helper');
assert(recovery.includes('UPDATE owner_grant_operations SET result_json=? WHERE operation_id=?'), 'owner rating recovery does not persist its outcome');

const criticalStart = indexOfRequired(worker, 'async function processCriticalServerQueues(env)', 'critical queue dispatcher is missing');
const criticalEnd = worker.indexOf('\n}\n\nasync function processMinuteLiveOps', criticalStart);
assert(criticalEnd > criticalStart, 'critical queue dispatcher boundary is missing');
const critical = criticalEnd > criticalStart ? worker.slice(criticalStart, criticalEnd + 2) : '';
const recoveryStepIndex = indexOfRequired(critical, '["ratingDethroneRecovery", () => recoverOwnerRatingDethroneNotifications(env, 12)]', 'critical cron does not run dethrone recovery');
const deliveryStepIndex = indexOfRequired(critical, '["playerNotifications", () => processV77NotificationQueue(env, 40)]', 'critical cron no longer processes player notifications');
assert(recoveryStepIndex >= 0 && deliveryStepIndex > recoveryStepIndex, 'dethrone recovery must run before player notification delivery');

// Behavior-level proof: a committed rating receipt with no notification result is
// recovered on the next critical cron pass and its recovered outcome is persisted.
if (recovery) {
  const makeRecovery = new Function(
    'ensureV77Schema',
    'safeJson',
    'leaderboardDethroneCategory',
    'queueLeaderboardDethroneNotificationIfNeeded',
    `${recovery}\nreturn recoverOwnerRatingDethroneNotifications;`
  );
  let enqueueCalls = 0;
  const receiptUpdates = [];
  const recover = makeRecovery(
    async () => {},
    (value, fallback = {}) => { try { return JSON.parse(String(value || '')); } catch { return fallback; } },
    (seasonId) => `rating_dethroned:${seasonId}`,
    async (_env, payload) => {
      enqueueCalls += 1;
      assert(payload.seasonId === 'season-1', 'recovery passes the wrong season to the canonical enqueue helper');
      assert(payload.previousLeaderId === '1001', 'recovery passes the wrong displaced leader');
      assert(payload.expectedLeaderId === '2002', 'recovery passes the wrong expected new leader');
      return { queued: true, queueId: 77, updated: false };
    }
  );
  const now = Math.floor(Date.now() / 1000);
  const env = {
    DB: {
      prepare(sql) {
        const text = String(sql);
        if (text.includes('FROM owner_grant_operations WHERE created_at>=?')) {
          return { bind: () => ({ all: async () => ({ results: [{ operation_id: 'op-1', telegram_id: '2002', created_at: now, result_json: JSON.stringify({ grantType: 'rating_record', seasonId: 'season-1', previousLeaderId: '1001', targetHidden: false }) }] }) }) };
        }
        if (text.includes('FROM player_notification_queue WHERE telegram_id=?')) return { bind: () => ({ first: async () => null }) };
        if (text.includes('FROM player_notification_log WHERE telegram_id=?')) return { bind: () => ({ first: async () => null }) };
        if (text.startsWith('UPDATE owner_grant_operations SET result_json=')) {
          return { bind: (json) => ({ run: async () => { receiptUpdates.push(JSON.parse(json)); return { meta: { changes: 1 } }; } }) };
        }
        throw new Error(`unexpected SQL in recovery mock: ${text}`);
      }
    }
  };
  const result = await recover(env, 12);
  assert(result.checked === 1 && result.recovered === 1 && result.failed === 0, 'durable recovery did not report a recovered owner rating event');
  assert(enqueueCalls === 1, 'durable recovery did not enqueue exactly once');
  assert(receiptUpdates.length === 1 && receiptUpdates[0]?.dethroneNotification?.recovered === true && receiptUpdates[0]?.dethroneNotification?.queueId === 77, 'durable recovery outcome was not persisted into the grant receipt');
}

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
