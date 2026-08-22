const CANDIDATE_PREFIX = "/api/candidate/v4";
const DEFAULT_TTL_MS = 15000;
const MAX_PLAYER_KEY = 96;
const MAX_MILESTONES = 96;
const REWARD_TYPES = new Set(["zefir", "season_xp", "case", "coffee", "points", "cosmetic", "custom"]);

let configCache = { expiresAt: 0, value: null, promise: null };

export default {
  async fetch(request, env, ctx) {
    const started = performance.now();
    const url = new URL(request.url);
    let response;
    try {
      if (request.method === "OPTIONS") response = corsResponse();
      else if (url.pathname === "/" || url.pathname === "/status") response = htmlResponse(statusPage(env));
      else if (url.pathname === "/admin") response = htmlResponse(adminPage(env));
      else if (url.pathname.startsWith(CANDIDATE_PREFIX + "/")) response = await routeCandidate(request, env, ctx, url);
      else response = json({ ok: false, error: "Candidate V4.2 route not found." }, 404);
    } catch (error) {
      console.error("candidate-v4.2", error);
      const status = Number(error?.status || 500);
      response = json({ ok: false, code: status === 403 ? "CANDIDATE_FORBIDDEN" : "CANDIDATE_INTERNAL", error: String(error?.message || error || "Internal error") }, status);
    }
    const total = Math.max(0, performance.now() - started);
    const headers = new Headers(response.headers);
    headers.set("Server-Timing", `candidate;dur=${total.toFixed(1)}`);
    headers.set("X-Zefirok-Server-Ms", total.toFixed(1));
    headers.set("X-Zefirok-Candidate", "V4.2");
    addCors(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};

async function routeCandidate(request, env, ctx, url) {
  const path = url.pathname.slice(CANDIDATE_PREFIX.length);
  const body = request.method === "GET" ? {} : await readJson(request);
  if (path === "/daily/bootstrap") return json(await dailyBootstrap(env, body));
  if (path === "/daily/activity") return json(await dailyActivity(env, body, ctx));
  if (path === "/test/advance") return json(await testAdvance(env, body));
  if (path === "/test/reset") return json(await testReset(env, body));
  if (path === "/test/preset") return json(await testPreset(env, body));
  if (path === "/admin/seasons") {
    requireAdmin(request, env);
    return json(await adminSeasons(env));
  }
  if (path === "/admin/season/save") {
    requireAdmin(request, env);
    return json(await adminSaveSeason(env, body));
  }
  if (path === "/admin/season/activate") {
    requireAdmin(request, env);
    return json(await adminActivateSeason(env, body));
  }
  return json({ ok: false, error: "Unknown Candidate V4.2 API route." }, 404);
}

function addCors(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Candidate-Admin-Key");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Cache-Control", "no-store");
}
function corsResponse() {
  const headers = new Headers();
  addCors(headers);
  return new Response(null, { status: 204, headers });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function htmlResponse(markup, status = 200) {
  return new Response(markup, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new Error("Некорректный JSON."); }
}

function normalizePlayerKey(input) {
  const key = String(input || "").trim();
  if (!key || key.length > MAX_PLAYER_KEY || !/^[A-Za-z0-9_.:@-]+$/.test(key)) throw new Error("Некорректный playerKey Candidate.");
  return key;
}
function normalizeRequestId(input) {
  const id = String(input || "").trim();
  if (!id || id.length > 120 || !/^[A-Za-z0-9_.:@-]+$/.test(id)) throw new Error("Некорректный requestId.");
  return id;
}
function clampInt(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
function safeJsonParse(value, fallback = null) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}
function configTtl(env) {
  return clampInt(env.CONFIG_CACHE_TTL_MS, 1000, 60000, DEFAULT_TTL_MS);
}
function clearConfigCache() {
  configCache = { expiresAt: 0, value: null, promise: null };
}

async function loadActiveConfig(env) {
  const now = Date.now();
  if (configCache.value && configCache.expiresAt > now) return configCache.value;
  if (configCache.promise) return configCache.promise;
  configCache.promise = (async () => {
    let season = await env.DB.prepare(`
      SELECT id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,updated_at
      FROM candidate_daily_seasons
      WHERE enabled=1
      ORDER BY updated_at DESC
      LIMIT 1
    `).first();
    if (!season) {
      season = await env.DB.prepare(`
        SELECT id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,updated_at
        FROM candidate_daily_seasons
        ORDER BY updated_at DESC
        LIMIT 1
      `).first();
    }
    if (!season) throw new Error("Candidate daily season is not configured. Apply migrations first.");
    const milestoneRows = await env.DB.prepare(`
      SELECT day_index,icon,label,reward_type,amount,item_id,sort_order
      FROM candidate_daily_milestones
      WHERE season_id=?
      ORDER BY day_index ASC
    `).bind(season.id).all();
    const milestones = (milestoneRows.results || []).map(row => ({
      dayIndex: Number(row.day_index || 0),
      icon: String(row.icon || "🎁"),
      label: String(row.label || "Награда"),
      reward: {
        type: String(row.reward_type || "custom"),
        amount: Number(row.amount || 0),
        itemId: String(row.item_id || "")
      }
    }));
    const value = {
      season: {
        id: String(season.id),
        title: String(season.title),
        enabled: Boolean(season.enabled),
        timezoneOffsetMinutes: Number(season.timezone_offset_minutes || 0),
        startsAt: String(season.starts_at || ""),
        endsAt: String(season.ends_at || ""),
        revision: Number(season.revision || 1)
      },
      milestones
    };
    configCache.value = value;
    configCache.expiresAt = Date.now() + configTtl(env);
    return value;
  })().finally(() => { configCache.promise = null; });
  return configCache.promise;
}

function dayKeyAt(nowMs, timezoneOffsetMinutes, virtualOffsetDays = 0) {
  const shifted = Number(nowMs) + Number(timezoneOffsetMinutes || 0) * 60000 + Number(virtualOffsetDays || 0) * 86400000;
  return new Date(shifted).toISOString().slice(0, 10);
}
function dayOrdinal(dayKey) {
  const ms = Date.parse(`${dayKey}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0;
}
function previousDayKey(dayKey) {
  const ordinal = dayOrdinal(dayKey) - 1;
  return new Date(ordinal * 86400000).toISOString().slice(0, 10);
}
function effectiveStreak(row, currentDayKey) {
  const stored = Math.max(0, Number(row?.streak || 0));
  const last = String(row?.last_active_day_key || "");
  if (!last || !stored) return 0;
  const diff = dayOrdinal(currentDayKey) - dayOrdinal(last);
  return diff <= 1 ? stored : 0;
}
function currentBlock(progressDays) {
  const progress = Math.max(0, Number(progressDays || 0));
  const blockIndex = progress > 0 ? Math.floor((progress - 1) / 7) : 0;
  const startDay = blockIndex * 7 + 1;
  const endDay = startDay + 6;
  const filled = progress > 0 ? Math.min(7, progress - startDay + 1) : 0;
  return { index: blockIndex + 1, startDay, endDay, filled };
}

async function readPlayerBundle(env, playerKey, seasonId, sourceRequestId = "bootstrap-reconcile") {
  const now = Math.floor(Date.now() / 1000);
  // Reconciliation + all reads share one D1 batch. If config adds a milestone
  // behind an existing player's progress, the Candidate ledger repairs itself
  // without another foreground database round-trip.
  const statements = [
    env.DB.prepare(`
      INSERT OR IGNORE INTO candidate_daily_claims
        (player_key,season_id,day_index,reward_json,status,source_request_id,created_at,updated_at)
      SELECT p.player_key,p.season_id,m.day_index,
        json_object('type',m.reward_type,'amount',m.amount,'itemId',m.item_id,'label',m.label,'icon',m.icon),
        'preview_granted',?,?,?
      FROM candidate_daily_players p
      JOIN candidate_daily_milestones m ON m.season_id=p.season_id AND m.day_index<=p.progress_days
      WHERE p.player_key=? AND p.season_id=?
    `).bind(sourceRequestId, now, now, playerKey, seasonId),
    env.DB.prepare(`SELECT offset_days FROM candidate_daily_test_clock WHERE player_key=?`).bind(playerKey),
    env.DB.prepare(`SELECT progress_days,streak,best_streak,last_active_day_key,updated_at FROM candidate_daily_players WHERE player_key=? AND season_id=?`).bind(playerKey, seasonId),
    env.DB.prepare(`SELECT day_index,reward_json,status,source_request_id,created_at FROM candidate_daily_claims WHERE player_key=? AND season_id=? ORDER BY day_index ASC`).bind(playerKey, seasonId)
  ];
  const [, clock, player, claims] = await env.DB.batch(statements);
  return {
    offsetDays: Number(clock.results?.[0]?.offset_days || 0),
    player: player.results?.[0] || null,
    claims: claims.results || []
  };
}

function buildModel(config, bundle, currentDayKey, claimRows) {
  const row = bundle.player || {};
  const progressDays = Math.max(0, Number(row.progress_days || 0));
  const streak = effectiveStreak(row, currentDayKey);
  const claimedDays = (claimRows || []).map(item => Number(item.day_index || 0)).filter(Boolean);
  const nextMilestone = config.milestones.find(item => item.dayIndex > progressDays) || null;
  return {
    ok: true,
    serverAuthoritative: true,
    candidate: "V4.2",
    configRevision: config.season.revision,
    serverDayKey: currentDayKey,
    season: config.season,
    milestones: config.milestones,
    state: {
      progressDays,
      streak,
      bestStreak: Math.max(Number(row.best_streak || 0), streak),
      lastActiveDayKey: String(row.last_active_day_key || ""),
      todayCompleted: String(row.last_active_day_key || "") === currentDayKey,
      currentBlock: currentBlock(progressDays),
      claimedDays,
      nextMilestone
    },
    test: { offsetDays: bundle.offsetDays }
  };
}

async function dailyBootstrap(env, body) {
  const playerKey = normalizePlayerKey(body.playerKey);
  const config = await loadActiveConfig(env);
  const bundle = await readPlayerBundle(env, playerKey, config.season.id, "bootstrap-reconcile");
  const currentDayKey = dayKeyAt(Date.now(), config.season.timezoneOffsetMinutes, bundle.offsetDays);
  return buildModel(config, bundle, currentDayKey, bundle.claims);
}

async function dailyActivity(env, body, ctx) {
  const playerKey = normalizePlayerKey(body.playerKey);
  const requestId = normalizeRequestId(body.requestId);
  const config = await loadActiveConfig(env);
  // Candidate-only virtual clock is one small read. The eventual Production
  // version does not need this query, so the real hot path becomes two D1 batches.
  const clock = await env.DB.prepare(`SELECT offset_days FROM candidate_daily_test_clock WHERE player_key=?`).bind(playerKey).first();
  const offsetDays = Number(clock?.offset_days || 0);
  const currentDayKey = dayKeyAt(Date.now(), config.season.timezoneOffsetMinutes, offsetDays);
  const yesterday = previousDayKey(currentDayKey);
  const now = Math.floor(Date.now() / 1000);

  // This batch is transactional and idempotent. The activity row can exist only
  // once per player/season/day and request_id is globally unique. The player is
  // advanced only while that exact activity row is still unapplied.
  const statements = [
    env.DB.prepare(`
      INSERT OR IGNORE INTO candidate_daily_activity
        (player_key,season_id,day_key,request_id,applied,progress_day,streak,created_at,updated_at)
      VALUES (?,?,?,?,0,0,0,?,?)
    `).bind(playerKey, config.season.id, currentDayKey, requestId, now, now),
    env.DB.prepare(`
      INSERT INTO candidate_daily_players
        (player_key,season_id,progress_days,streak,best_streak,last_active_day_key,updated_at)
      SELECT ?,?,1,1,1,?,?
      FROM candidate_daily_activity a
      WHERE a.player_key=? AND a.season_id=? AND a.day_key=? AND a.request_id=? AND a.applied=0
      ON CONFLICT(player_key,season_id) DO UPDATE SET
        progress_days=candidate_daily_players.progress_days+1,
        streak=CASE WHEN candidate_daily_players.last_active_day_key=? THEN candidate_daily_players.streak+1 ELSE 1 END,
        best_streak=MAX(candidate_daily_players.best_streak, CASE WHEN candidate_daily_players.last_active_day_key=? THEN candidate_daily_players.streak+1 ELSE 1 END),
        last_active_day_key=excluded.last_active_day_key,
        updated_at=excluded.updated_at
    `).bind(playerKey, config.season.id, currentDayKey, now, playerKey, config.season.id, currentDayKey, requestId, yesterday, yesterday),
    env.DB.prepare(`
      UPDATE candidate_daily_activity
      SET applied=1,updated_at=?
      WHERE player_key=? AND season_id=? AND day_key=? AND request_id=? AND applied=0
    `).bind(now, playerKey, config.season.id, currentDayKey, requestId)
  ];
  const results = await env.DB.batch(statements);
  const inserted = Number(results[0]?.meta?.changes || 0) > 0;

  // Claim reconciliation and all state reads happen in one second batch.
  const fresh = await readPlayerBundle(env, playerKey, config.season.id, requestId);
  const progressDays = Math.max(0, Number(fresh.player?.progress_days || 0));
  const model = buildModel(config, fresh, currentDayKey, fresh.claims);
  model.repeated = !inserted;
  model.grantedRewards = inserted
    ? fresh.claims.filter(row => String(row.source_request_id || "") === requestId).map(row => {
        const reward = safeJsonParse(row.reward_json, {}) || {};
        return { dayIndex:Number(row.day_index || 0), icon:String(reward.icon || "🎁"), label:String(reward.label || "Награда"), reward:{ type:String(reward.type || "custom"), amount:Number(reward.amount || 0), itemId:String(reward.itemId || "") } };
      })
    : [];

  // These two audit fields are not authoritative; don't keep the player waiting.
  if (inserted && ctx?.waitUntil) {
    ctx.waitUntil(env.DB.prepare(`
      UPDATE candidate_daily_activity SET progress_day=?,streak=?,updated_at=? WHERE request_id=?
    `).bind(progressDays, Number(fresh.player?.streak || 0), now, requestId).run().catch(() => {}));
  }
  return model;
}

async function testAdvance(env, body) {
  const playerKey = normalizePlayerKey(body.playerKey);
  const days = clampInt(body.days, 1, 60, 1);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`
    INSERT INTO candidate_daily_test_clock(player_key,offset_days,updated_at)
    VALUES (?,?,?)
    ON CONFLICT(player_key) DO UPDATE SET offset_days=candidate_daily_test_clock.offset_days+excluded.offset_days,updated_at=excluded.updated_at
  `).bind(playerKey, days, now).run();
  return dailyBootstrap(env, { playerKey });
}

async function testReset(env, body) {
  const playerKey = normalizePlayerKey(body.playerKey);
  const config = await loadActiveConfig(env);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM candidate_daily_claims WHERE player_key=?`).bind(playerKey),
    env.DB.prepare(`DELETE FROM candidate_daily_activity WHERE player_key=?`).bind(playerKey),
    env.DB.prepare(`DELETE FROM candidate_daily_players WHERE player_key=?`).bind(playerKey),
    env.DB.prepare(`DELETE FROM candidate_daily_test_clock WHERE player_key=?`).bind(playerKey)
  ]);
  return dailyBootstrap(env, { playerKey });
}

async function testPreset(env, body) {
  const playerKey = normalizePlayerKey(body.playerKey);
  const days = clampInt(body.days, 0, 3650, 0);
  const config = await loadActiveConfig(env);
  const clock = await env.DB.prepare(`SELECT offset_days FROM candidate_daily_test_clock WHERE player_key=?`).bind(playerKey).first();
  const offsetDays = Number(clock?.offset_days || 0);
  const currentDayKey = dayKeyAt(Date.now(), config.season.timezoneOffsetMinutes, offsetDays);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM candidate_daily_claims WHERE player_key=? AND season_id=?`).bind(playerKey, config.season.id),
    env.DB.prepare(`DELETE FROM candidate_daily_activity WHERE player_key=? AND season_id=?`).bind(playerKey, config.season.id),
    env.DB.prepare(`
      INSERT INTO candidate_daily_players(player_key,season_id,progress_days,streak,best_streak,last_active_day_key,updated_at)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(player_key,season_id) DO UPDATE SET progress_days=excluded.progress_days,streak=excluded.streak,best_streak=MAX(candidate_daily_players.best_streak,excluded.best_streak),last_active_day_key=excluded.last_active_day_key,updated_at=excluded.updated_at
    `).bind(playerKey, config.season.id, days, days, days, days > 0 ? currentDayKey : "", now)
  ]);
  const bundle = await readPlayerBundle(env, playerKey, config.season.id, `preset-${days}`);
  return buildModel(config, bundle, currentDayKey, bundle.claims);
}

function requireAdmin(request, env) {
  const expected = String(env.CANDIDATE_ADMIN_KEY || "").trim();
  const host = new URL(request.url).hostname;
  const localHost = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!expected && localHost) return;
  if (!expected) {
    const error = new Error("CANDIDATE_ADMIN_KEY is not configured. Set it as a secret before remote Candidate use.");
    error.status = 503;
    throw error;
  }
  const received = String(request.headers.get("X-Candidate-Admin-Key") || "");
  if (received !== expected) {
    const error = new Error("Неверный Candidate admin key.");
    error.status = 403;
    throw error;
  }
}

async function adminSeasons(env) {
  const seasons = await env.DB.prepare(`
    SELECT id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,created_at,updated_at
    FROM candidate_daily_seasons
    ORDER BY enabled DESC,updated_at DESC
  `).all();
  const rows = [];
  for (const season of seasons.results || []) {
    const rewards = await env.DB.prepare(`
      SELECT day_index,icon,label,reward_type,amount,item_id
      FROM candidate_daily_milestones WHERE season_id=? ORDER BY day_index
    `).bind(season.id).all();
    rows.push({
      id: String(season.id), title: String(season.title), enabled: Boolean(season.enabled),
      timezoneOffsetMinutes: Number(season.timezone_offset_minutes || 0), startsAt: String(season.starts_at || ""), endsAt: String(season.ends_at || ""), revision: Number(season.revision || 1),
      milestones: (rewards.results || []).map(row => ({ dayIndex:Number(row.day_index), icon:String(row.icon||"🎁"), label:String(row.label||""), reward:{type:String(row.reward_type||"custom"),amount:Number(row.amount||0),itemId:String(row.item_id||"")} }))
    });
  }
  return { ok: true, candidate: "V4.2", seasons: rows };
}

function normalizeMilestones(input) {
  if (!Array.isArray(input)) throw new Error("milestones must be an array.");
  if (input.length > MAX_MILESTONES) throw new Error("Слишком много milestone-наград.");
  const seen = new Set();
  const rows = input.map((item, index) => {
    const dayIndex = clampInt(item.dayIndex, 1, 3650, 0);
    if (!dayIndex || seen.has(dayIndex)) throw new Error(`Некорректный или повторяющийся день: ${item.dayIndex}`);
    seen.add(dayIndex);
    const type = String(item.reward?.type || item.rewardType || "custom").trim();
    if (!REWARD_TYPES.has(type)) throw new Error(`Неизвестный reward type: ${type}`);
    const label = String(item.label || "").trim().slice(0, 120);
    if (!label) throw new Error(`У дня ${dayIndex} нет названия награды.`);
    return {
      dayIndex,
      icon: String(item.icon || "🎁").slice(0, 12),
      label,
      rewardType: type,
      amount: clampInt(item.reward?.amount ?? item.amount, 0, 1000000000, 0),
      itemId: String(item.reward?.itemId ?? item.itemId ?? "").trim().slice(0, 120),
      sortOrder: index
    };
  });
  rows.sort((a, b) => a.dayIndex - b.dayIndex);
  return rows;
}

async function adminSaveSeason(env, body) {
  const season = body.season || {};
  const id = String(season.id || "").trim().toLowerCase();
  if (!id || id.length > 80 || !/^[a-z0-9_-]+$/.test(id)) throw new Error("Некорректный season id.");
  const title = String(season.title || "").trim().slice(0, 120);
  if (!title) throw new Error("Укажите название сезона.");
  const enabled = season.enabled ? 1 : 0;
  const timezone = clampInt(season.timezoneOffsetMinutes, -720, 840, 180);
  const startsAt = String(season.startsAt || "").trim().slice(0, 40);
  const endsAt = String(season.endsAt || "").trim().slice(0, 40);
  const milestones = normalizeMilestones(body.milestones || []);
  const now = Math.floor(Date.now() / 1000);
  const statements = [];
  if (enabled) statements.push(env.DB.prepare(`UPDATE candidate_daily_seasons SET enabled=0,updated_at=? WHERE enabled=1 AND id<>?`).bind(now, id));
  statements.push(env.DB.prepare(`
    INSERT INTO candidate_daily_seasons(id,title,enabled,timezone_offset_minutes,starts_at,ends_at,revision,created_at,updated_at)
    VALUES (?,?,?,?,?,?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,enabled=excluded.enabled,timezone_offset_minutes=excluded.timezone_offset_minutes,starts_at=excluded.starts_at,ends_at=excluded.ends_at,revision=candidate_daily_seasons.revision+1,updated_at=excluded.updated_at
  `).bind(id, title, enabled, timezone, startsAt, endsAt, now, now));
  statements.push(env.DB.prepare(`DELETE FROM candidate_daily_milestones WHERE season_id=?`).bind(id));
  for (const row of milestones) {
    statements.push(env.DB.prepare(`
      INSERT INTO candidate_daily_milestones(season_id,day_index,icon,label,reward_type,amount,item_id,sort_order,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(id, row.dayIndex, row.icon, row.label, row.rewardType, row.amount, row.itemId, row.sortOrder, now, now));
  }
  await env.DB.batch(statements);
  clearConfigCache();
  return adminSeasons(env);
}

async function adminActivateSeason(env, body) {
  const id = String(body.seasonId || "").trim().toLowerCase();
  if (!id) throw new Error("seasonId required.");
  const now = Math.floor(Date.now() / 1000);
  const found = await env.DB.prepare(`SELECT id FROM candidate_daily_seasons WHERE id=?`).bind(id).first();
  if (!found) throw new Error("Сезон Candidate не найден.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE candidate_daily_seasons SET enabled=0,updated_at=? WHERE enabled=1`).bind(now),
    env.DB.prepare(`UPDATE candidate_daily_seasons SET enabled=1,revision=revision+1,updated_at=? WHERE id=?`).bind(now, id)
  ]);
  clearConfigCache();
  return adminSeasons(env);
}

function statusPage(env) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Candidate V4.2 Daily Server</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#17121f;color:#fff;padding:28px}.c{max-width:680px;margin:auto;background:#241b2e;border:1px solid #4b3b5c;border-radius:24px;padding:22px}a{color:#ffb5d2}code{background:#100c16;padding:3px 6px;border-radius:7px}</style></head><body><div class="c"><h1>☕ Candidate V4.2</h1><p>Отдельный server-authoritative backend для Кофейной карточки Зеффи.</p><p>Production-экономика не используется. Награды записываются только в Candidate ledger.</p><p><a href="/admin">Открыть Candidate-конфиг наград</a></p><p>API: <code>${CANDIDATE_PREFIX}</code></p></div></body></html>`;
}

function adminPage(env) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V4.2 · Награды карточки</title><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#4f3040;background:#fff6f8}*{box-sizing:border-box}body{margin:0;padding:14px}.wrap{max-width:940px;margin:auto;display:grid;gap:12px}.card{background:#fff;border:1px solid #efd2dc;border-radius:22px;padding:16px;box-shadow:0 12px 34px rgba(100,47,70,.08)}h1,h2,p{margin:0}.muted{color:#92727f;font-size:12px;line-height:1.45;margin-top:5px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.field label{display:block;font-size:10px;font-weight:900;margin-bottom:5px;color:#7c5866}.field input,.field select{width:100%;border:1px solid #e8c8d4;border-radius:12px;padding:10px;background:#fff}.row{display:grid;grid-template-columns:70px 58px minmax(160px,1fr) 120px 100px minmax(110px,1fr) 34px;gap:6px;align-items:end;margin-top:7px}.btn{border:0;border-radius:12px;padding:9px 12px;background:#cf4f82;color:#fff;font-weight:900}.btn.secondary{background:#fff;color:#653b4d;border:1px solid #e7cbd5}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.status{margin-top:10px;padding:10px;border-radius:12px;background:#fff4d9;font-size:11px;white-space:pre-wrap}.season{padding:9px;border:1px solid #efd7df;border-radius:13px;background:#fff9fb;margin-top:6px;cursor:pointer}.season.active{border-color:#d99a45;background:#fff7df}@media(max-width:760px){.grid{grid-template-columns:1fr}.row{grid-template-columns:62px 50px 1fr 1fr}.row .wide{grid-column:1/-1}}
</style></head><body><main class="wrap"><section class="card"><h1>☕ Candidate V4.2 · награды</h1><p class="muted">Здесь настраивается только отдельный Candidate backend. Production не затрагивается.</p><div class="field" style="margin-top:12px"><label>Candidate admin key</label><input id="key" type="password" autocomplete="off" placeholder="CANDIDATE_ADMIN_KEY"></div><div class="actions"><button class="btn" id="load">Загрузить сезоны</button><button class="btn secondary" id="template">Шаблон 42 дня</button></div><div id="status" class="status">Введите ключ и загрузите конфиг.</div></section><section class="card"><h2>Сезоны</h2><div id="seasons"></div><div class="actions"><button class="btn secondary" id="newSeason">+ Новый сезон</button></div></section><section class="card"><h2>Редактор</h2><div class="grid" style="margin-top:10px"><div class="field"><label>ID сезона</label><input id="sid" value="season-3-test"></div><div class="field"><label>Название</label><input id="title" value="Тайны Белкино · TEST"></div><div class="field"><label>UTC offset, минуты</label><input id="tz" type="number" value="180"></div><div class="field"><label><input id="enabled" type="checkbox" checked> Активный сезон</label></div></div><h2 style="margin-top:16px">Milestone-награды</h2><p class="muted">Можно добавить любой день: 3, 5, 7, 14, 21, 28, 35, 42, 56… Чем дальше день, тем ценнее награду можно поставить.</p><div id="rows"></div><div class="actions"><button class="btn secondary" id="add">+ День</button><button class="btn" id="save">Сохранить сезон</button></div></section></main><script>
const $=id=>document.getElementById(id);let seasons=[];let rows=[];const types=['zefir','season_xp','case','coffee','points','cosmetic','custom'];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(path,body={}){const r=await fetch('/api/candidate/v4'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Candidate-Admin-Key':$('key').value},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||'Ошибка '+r.status);return d}
function rewardRows(){if(!rows.length)rows=[{dayIndex:7,icon:'🎁',label:'Серебряный кейс',reward:{type:'case',amount:1,itemId:'sweet'}}];$('rows').innerHTML=rows.map((r,i)=>\`<div class="row" data-i="\${i}"><div class="field"><label>День</label><input data-f="dayIndex" type="number" value="\${r.dayIndex}"></div><div class="field"><label>Иконка</label><input data-f="icon" value="\${esc(r.icon)}"></div><div class="field wide"><label>Название</label><input data-f="label" value="\${esc(r.label)}"></div><div class="field"><label>Тип</label><select data-f="type">\${types.map(t=>\`<option \${t===r.reward.type?'selected':''}>\${t}</option>\`).join('')}</select></div><div class="field"><label>Кол-во</label><input data-f="amount" type="number" value="\${r.reward.amount||0}"></div><div class="field wide"><label>item id</label><input data-f="itemId" value="\${esc(r.reward.itemId||'')}"></div><button class="btn secondary" data-del="\${i}">×</button></div>\`).join('')}
function collect(){return [...$('rows').querySelectorAll('[data-i]')].map(row=>({dayIndex:Number(row.querySelector('[data-f=dayIndex]').value),icon:row.querySelector('[data-f=icon]').value,label:row.querySelector('[data-f=label]').value,reward:{type:row.querySelector('[data-f=type]').value,amount:Number(row.querySelector('[data-f=amount]').value||0),itemId:row.querySelector('[data-f=itemId]').value}}))}
function renderSeasons(){ $('seasons').innerHTML=seasons.map((s,i)=>\`<div class="season \${s.enabled?'active':''}" data-season="\${i}"><b>\${esc(s.title)}</b><div class="muted">\${esc(s.id)} · rev \${s.revision} · \${s.milestones.length} наград</div></div>\`).join('')||'<div class="muted">Сезонов нет.</div>' }
function edit(s){$('sid').value=s.id;$('title').value=s.title;$('tz').value=s.timezoneOffsetMinutes;$('enabled').checked=!!s.enabled;rows=JSON.parse(JSON.stringify(s.milestones||[]));rewardRows()}
$('load').onclick=async()=>{try{const d=await api('/admin/seasons');seasons=d.seasons||[];renderSeasons();if(seasons[0])edit(seasons[0]);$('status').textContent='Загружено.'}catch(e){$('status').textContent=e.message}};
$('seasons').onclick=e=>{const el=e.target.closest('[data-season]');if(el)edit(seasons[Number(el.dataset.season)])};
$('rows').onclick=e=>{const b=e.target.closest('[data-del]');if(!b)return;rows=collect();rows.splice(Number(b.dataset.del),1);rewardRows()};
$('add').onclick=()=>{rows=collect();const last=rows.at(-1)?.dayIndex||0;rows.push({dayIndex:last?last+7:7,icon:'🎁',label:'Новая награда',reward:{type:'custom',amount:0,itemId:''}});rewardRows()};
$('template').onclick=()=>{rows=[{dayIndex:3,icon:'🍥',label:'250 зефира',reward:{type:'zefir',amount:250,itemId:''}},{dayIndex:5,icon:'⭐',label:'+500 XP сезона',reward:{type:'season_xp',amount:500,itemId:''}},{dayIndex:7,icon:'🎁',label:'Серебряный кейс',reward:{type:'case',amount:1,itemId:'sweet'}},{dayIndex:14,icon:'🏆',label:'Золотой кейс',reward:{type:'case',amount:1,itemId:'gold'}},{dayIndex:21,icon:'✨',label:'+1 500 XP сезона',reward:{type:'season_xp',amount:1500,itemId:''}},{dayIndex:28,icon:'🌟',label:'Сезонный кейс',reward:{type:'case',amount:1,itemId:'seasonal'}},{dayIndex:35,icon:'💜',label:'Мифический кейс',reward:{type:'case',amount:1,itemId:'mythic'}},{dayIndex:42,icon:'👑',label:'Легендарный кейс',reward:{type:'case',amount:1,itemId:'legendary'}}];rewardRows()};
$('newSeason').onclick=()=>{edit({id:'new-season',title:'Новый сезон · TEST',timezoneOffsetMinutes:180,enabled:false,milestones:[]})};
$('save').onclick=async()=>{try{const milestones=collect();const d=await api('/admin/season/save',{season:{id:$('sid').value,title:$('title').value,timezoneOffsetMinutes:Number($('tz').value),enabled:$('enabled').checked},milestones});seasons=d.seasons||[];renderSeasons();const current=seasons.find(s=>s.id===$('sid').value);if(current)edit(current);$('status').textContent='Сохранено. Revision обновлён; игровые Worker-isolate увидят конфиг максимум через ~15 секунд.'}catch(e){$('status').textContent=e.message}};
rewardRows();
</script></body></html>`;
}
