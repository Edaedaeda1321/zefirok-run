const PRODUCTS = Object.freeze({
  zefir: { id: "zefir", title: "Фирменный зефир", prefix: "ZF" },
  americano: { id: "americano", title: "Американо", prefix: "AM" },
  cappuccino: { id: "cappuccino", title: "Капучино", prefix: "CP" }
});

const encoder = new TextEncoder();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_REWARD_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT_WINDOW_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT_MAX = 2;
const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const DEFAULT_GAME_URL = "https://zefirok-run.patokad6.workers.dev/";

// Покупки, созданные раньше этой точки, сохраняют свои коды и статусы,
// но больше не занимают лимитные слоты после глобального сброса 0.1.1 Beta.
const REWARD_LIMIT_RESET_AT_SECONDS = 1784805300; // 23.07.2026 11:15 UTC

// НАСТРОЙКИ ВЕРСИИ И РАЗДЕЛА «ОБНОВЛЕНИЕ» В БОТЕ.
// Меняйте эти значения при каждом новом релизе игры.
const GAME_VERSION = "0.2 Beta";
const GAME_UPDATE_DATE = "23 июля 2026";
const GAME_UPDATE_TITLE = "Сезонный рейтинг";

// Что произошло с прогрессом в этом релизе:
// "reset" — крупное обновление с обнулением прогресса;
// "keep" — обычное обновление с сохранением прогресса.
const GAME_UPDATE_PROGRESS_MODE = "keep";
const GAME_UPDATE_RESET_REASON = "Прогресс в этом обновлении сохраняется.";

const GAME_UPDATE_NOTES = Object.freeze([
  "Добавлен серверный рейтинг по лучшему результату забега.",
  "Первый сладкий сезон можно выпустить заранее: до старта отображаются Зефи, дата и надпись «Уже скоро».",
  "Дата начала и завершения сезона задаётся вручную и считается по серверному времени.",
  "После завершения сезона первое место получает 50 кофе.",
  "Добавлены сезонный рейтинг, рейтинг за всё время и личное место игрока.",
  "Система выборочного сброса позволяет отдельно сохранять валюты, уровни, скины, покупки и настройки.",
  "В Telegram-боте появились разделы «Рейтинг» и «Новости»; картинка новости необязательна."
]);


// =============================================================
// НАСТРОЙКИ СЕЗОННОГО РЕЙТИНГА.
// Даты можно менять вручную. Они не обязаны совпадать с первым числом месяца.
// Значения Cloudflare env с такими же именами имеют приоритет над константами.
const DEFAULT_SEASON_ID = "sweet-season-1";
const DEFAULT_SEASON_TITLE = "Первый сладкий сезон";
const DEFAULT_SEASON_START_AT = "2026-07-23T15:40:00+03:00";
const DEFAULT_SEASON_END_AT = "2026-08-10T15:40:00+03:00";
const DEFAULT_SEASON_REWARD_COFFEE = 50;
const DEFAULT_SEASON_REWARD_CLAIM_DAYS = 30;
const DEFAULT_LEADERBOARD_TOP_LIMIT = 50;
const DEFAULT_LEADERBOARD_MIN_RUN_SECONDS = 12;
const DEFAULT_LEADERBOARD_MIN_SCORE = 150;

// Что сбрасывать ПОСЛЕ завершения текущего сезона.
// Для первого сезона сбрасывается только сам сезонный рейтинг: новый season_id
// автоматически создаёт чистую таблицу, а игровой прогресс остаётся нетронутым.
// В будущих сезонах меняйте true/false и обязательно задавайте новый id.
const DEFAULT_SEASON_RESET_PLAN = Object.freeze({
  id: "sweet-season-1-end-reset",
  reset: {
    seasonalRating: true,
    currencies: false,
    xp: false,
    personalRecord: false,
    statistics: false,
    ownedSkins: false,
    equippedSkin: false,
    purchases: false,
    settings: false
  }
});

// Новость может быть с картинкой или без неё. Для картинки задайте
// BOT_NEWS_IMAGE_URL в Cloudflare либо замените пустую строку ниже на HTTPS URL.
const DEFAULT_BOT_NEWS_IMAGE_URL = "";
const BOT_NEWS_TITLE = "Первый сладкий сезон уже близко";
const BOT_NEWS_TEXT = "Мы готовим серверный рейтинг, награду за первое место и честный сезон по лучшему результату забега. До старта в игре будет отображаться точная дата и обратный отсчёт.";
// =============================================================

const BOT_COMMANDS = Object.freeze([
  { command: "start", description: "Открыть главное меню" },
  { command: "game", description: "Открыть игру" },
  { command: "story", description: "Сюжет игры" },
  { command: "faq", description: "Частые вопросы" },
  { command: "rewards", description: "Как получить награду" },
  { command: "rating", description: "Рейтинг сезона" },
  { command: "news", description: "Новости игры" },
  { command: "update", description: "Обновление и версия игры" },
  { command: "help", description: "Как проверить код" },
  { command: "whoami", description: "Показать мой Telegram ID" },
  { command: "staff", description: "Подключить сотрудника по коду" }
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: apiHeaders() });
    }

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return jsonResponse({ ok: true, service: "zefirok-rewards" });
      }

      if (url.pathname === "/api/rewards/create" && request.method === "POST") {
        return await createReward(request, env);
      }

      if (url.pathname === "/api/rewards/mine" && request.method === "POST") {
        return await listMyRewards(request, env);
      }

      if (url.pathname === "/api/leaderboard/state" && request.method === "POST") {
        return await leaderboardState(request, env);
      }

      if (url.pathname === "/api/leaderboard/submit" && request.method === "POST") {
        return await submitLeaderboardRun(request, env);
      }

      if (url.pathname === "/api/leaderboard/claim" && request.method === "POST") {
        return await claimLeaderboardReward(request, env);
      }

      if (url.pathname === "/api/bot/setup-webhook" && request.method === "POST") {
        return await setupWebhook(request, env);
      }

      if (url.pathname === "/telegram/webhook" && request.method === "POST") {
        return await receiveTelegramWebhook(request, env, ctx);
      }
    } catch (error) {
      console.error("Unhandled Worker error", error);
      return jsonResponse({ ok: false, error: "Временная ошибка сервиса. Попробуйте ещё раз." }, 500);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  }
};

function apiHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: apiHeaders() });
}

async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) throw new ApiError(415, "Ожидался JSON-запрос.");
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Некорректный JSON-запрос.");
  }
}

class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function createReward(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const product = PRODUCTS[String(body.productId || "")];
    if (!product) throw new ApiError(400, "Неизвестная награда.");

    const requestId = String(body.requestId || "").trim();
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) {
      throw new ApiError(400, "Некорректный идентификатор покупки.");
    }

    const ownerId = String(auth.user.id);
    const existing = await env.DB.prepare(
      `SELECT code, product_id, product_name, created_at, expires_at, status
       FROM reward_codes WHERE request_id = ? AND owner_telegram_id = ? LIMIT 1`
    ).bind(requestId, ownerId).first();

    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      const limitStatus = await getRewardLimitStatus(env, ownerId, now);
      return jsonResponse({ ok: true, reward: rewardRowToClient(existing), limitStatus, repeated: true });
    }

    const limitStatus = await getRewardLimitStatus(env, ownerId, now);
    if (limitStatus.used >= limitStatus.limit) {
      throw new ApiError(429, `Лимит наград: не больше ${limitStatus.limit} за 24 часа.`, limitStatus);
    }

    const ttl = positiveInt(env.REWARD_TTL_SECONDS, DEFAULT_REWARD_TTL_SECONDS);
    const expiresAt = now + ttl;
    const ownerName = telegramDisplayName(auth.user);

    let insertedCode = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = generateRewardCode(product.prefix);
      const compact = compactCode(code);
      try {
        await env.DB.prepare(
          `INSERT INTO reward_codes (
            code, code_compact, request_id, product_id, product_name,
            owner_telegram_id, owner_name, created_at, expires_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
        ).bind(
          code,
          compact,
          requestId,
          product.id,
          product.title,
          ownerId,
          ownerName,
          now,
          expiresAt
        ).run();
        insertedCode = code;
        break;
      } catch (error) {
        if (String(error?.message || error).toLowerCase().includes("unique")) continue;
        throw error;
      }
    }

    if (!insertedCode) throw new ApiError(503, "Не удалось создать уникальный код. Повторите покупку.");

    const updatedLimitStatus = await getRewardLimitStatus(env, ownerId, now);
    return jsonResponse({
      ok: true,
      reward: {
        code: insertedCode,
        productId: product.id,
        productName: product.title,
        issuedAt: now * 1000,
        expiresAt: expiresAt * 1000,
        status: "active"
      },
      limitStatus: updatedLimitStatus
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse({ ok: false, error: error.message, details: error.details }, error.status);
    }
    console.error("createReward failed", error);
    return jsonResponse({ ok: false, error: "Не удалось создать код награды." }, 500);
  }
}

async function listMyRewards(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const ownerId = String(auth.user.id);
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(
      `UPDATE reward_codes SET status = 'expired'
       WHERE owner_telegram_id = ? AND status = 'active' AND expires_at <= ?`
    ).bind(ownerId, now).run();

    const result = await env.DB.prepare(
      `SELECT code, product_id, product_name, created_at, expires_at, status, redeemed_at
       FROM reward_codes WHERE owner_telegram_id = ?
       ORDER BY created_at DESC LIMIT 20`
    ).bind(ownerId).all();

    const limitStatus = await getRewardLimitStatus(env, ownerId, now);
    return jsonResponse({
      ok: true,
      rewards: (result.results || []).map(rewardRowToClient),
      limitStatus
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("listMyRewards failed", error);
    return jsonResponse({ ok: false, error: "Не удалось обновить покупки." }, 500);
  }
}

async function getRewardLimitStatus(env, ownerId, now = Math.floor(Date.now() / 1000)) {
  const limitWindow = positiveInt(env.REWARD_LIMIT_WINDOW_SECONDS, DEFAULT_LIMIT_WINDOW_SECONDS);
  const limit = positiveInt(env.REWARD_LIMIT_MAX, DEFAULT_LIMIT_MAX);
  const configuredResetAt = positiveInt(env.REWARD_LIMIT_RESET_AT_SECONDS, REWARD_LIMIT_RESET_AT_SECONDS);
  const threshold = Math.max(now - limitWindow, configuredResetAt);

  const result = await env.DB.prepare(
    `SELECT created_at
     FROM reward_codes
     WHERE owner_telegram_id = ? AND created_at > ? AND status <> 'cancelled'
     ORDER BY created_at ASC`
  ).bind(ownerId, threshold).all();

  const purchaseSeconds = (result.results || [])
    .map((row) => Number(row?.created_at || 0))
    .filter((value) => Number.isFinite(value) && value > threshold && value <= now + 300)
    .sort((left, right) => left - right);

  const used = purchaseSeconds.length;
  const reached = used >= limit;
  const nextAvailableAtSeconds = reached ? purchaseSeconds[0] + limitWindow : 0;

  return {
    used,
    limit,
    reached,
    nextAvailableAt: nextAvailableAtSeconds * 1000,
    remainingMs: reached ? Math.max(0, nextAvailableAtSeconds - now) * 1000 : 0,
    purchaseTimestamps: purchaseSeconds.map((value) => value * 1000),
    windowSeconds: limitWindow,
    resetAt: configuredResetAt * 1000
  };
}


function configuredSeason(env) {
  const id = String(env.LEADERBOARD_SEASON_ID || DEFAULT_SEASON_ID).trim() || DEFAULT_SEASON_ID;
  const title = String(env.LEADERBOARD_SEASON_TITLE || DEFAULT_SEASON_TITLE).trim() || DEFAULT_SEASON_TITLE;
  const startsAt = parseConfiguredDate(env.LEADERBOARD_SEASON_START_AT || DEFAULT_SEASON_START_AT, "дата старта сезона");
  const endsAt = parseConfiguredDate(env.LEADERBOARD_SEASON_END_AT || DEFAULT_SEASON_END_AT, "дата завершения сезона");
  if (endsAt <= startsAt) throw new ApiError(500, "Дата завершения сезона должна быть позже даты старта.");
  return {
    id,
    title,
    startsAt,
    endsAt,
    rewardCoffee: positiveInt(env.LEADERBOARD_REWARD_COFFEE, DEFAULT_SEASON_REWARD_COFFEE),
    rewardClaimDays: positiveInt(env.LEADERBOARD_REWARD_CLAIM_DAYS, DEFAULT_SEASON_REWARD_CLAIM_DAYS),
    resetPlan: DEFAULT_SEASON_RESET_PLAN
  };
}

function parseConfiguredDate(value, label) {
  const timestamp = Date.parse(String(value || ""));
  if (!Number.isFinite(timestamp)) throw new ApiError(500, `Некорректная ${label}.`);
  return Math.floor(timestamp / 1000);
}

async function ensureSeason(env, now = Math.floor(Date.now() / 1000)) {
  requireDatabase(env);
  const config = configuredSeason(env);
  await env.DB.prepare(
    `INSERT INTO leaderboard_seasons (
      id, title, starts_at, ends_at, status, reward_type, reward_amount,
      reward_claim_days, reset_plan_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'scheduled', 'coffee', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      reward_type = excluded.reward_type,
      reward_amount = excluded.reward_amount,
      reward_claim_days = excluded.reward_claim_days,
      reset_plan_json = excluded.reset_plan_json,
      updated_at = excluded.updated_at`
  ).bind(
    config.id,
    config.title,
    config.startsAt,
    config.endsAt,
    config.rewardCoffee,
    config.rewardClaimDays,
    JSON.stringify(config.resetPlan),
    now,
    now
  ).run();

  let row = await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(config.id).first();
  if (!row) throw new ApiError(500, "Не удалось подготовить сезон рейтинга.");

  const storedStatus = String(row.status || "scheduled");
  if (storedStatus !== "cancelled" && storedStatus !== "ended") {
    const nextStatus = now < Number(row.starts_at) ? "scheduled" : now < Number(row.ends_at) ? "active" : "ended";
    if (nextStatus === "ended") {
      await finalizeSeason(env, row, now);
    } else if (nextStatus !== storedStatus) {
      await env.DB.prepare(`UPDATE leaderboard_seasons SET status = ?, updated_at = ? WHERE id = ?`)
        .bind(nextStatus, now, config.id).run();
    }
    row = await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(config.id).first();
  } else if (storedStatus === "ended" && !row.finalized_at) {
    await finalizeSeason(env, row, now);
    row = await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(config.id).first();
  }
  return row;
}

async function finalizeSeason(env, season, now = Math.floor(Date.now() / 1000)) {
  if (!season || season.finalized_at) return;
  const winner = await env.DB.prepare(
    `SELECT telegram_id, display_name, best_score
     FROM leaderboard_entries
     WHERE season_id = ? AND hidden = 0
     ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC
     LIMIT 1`
  ).bind(season.id).first();

  if (winner) {
    const rewardId = `${season.id}:${winner.telegram_id}:1:coffee`;
    const claimDays = positiveInt(season.reward_claim_days, DEFAULT_SEASON_REWARD_CLAIM_DAYS);
    const expiresAt = Math.max(now, Number(season.ends_at || now)) + claimDays * 24 * 60 * 60;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO leaderboard_rewards (
        id, season_id, telegram_id, place, reward_type, reward_amount,
        status, created_at, expires_at
      ) VALUES (?, ?, ?, 1, 'coffee', ?, 'pending', ?, ?)`
    ).bind(rewardId, season.id, String(winner.telegram_id), Number(season.reward_amount || 0), now, expiresAt).run();
  }

  await env.DB.prepare(
    `UPDATE leaderboard_seasons
     SET status = 'ended', finalized_at = COALESCE(finalized_at, ?), updated_at = ?
     WHERE id = ?`
  ).bind(now, now, season.id).run();
}

async function leaderboardState(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const mode = String(body.mode || "season") === "all_time" ? "all_time" : "season";
    const season = await ensureSeason(env);
    return jsonResponse(await buildLeaderboardPayload(env, season, String(auth.user.id), mode));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("leaderboardState failed", error);
    return jsonResponse({ ok: false, error: "Не удалось загрузить рейтинг." }, 500);
  }
}

async function submitLeaderboardRun(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const season = await ensureSeason(env);
    if (String(season.status) !== "active") {
      throw new ApiError(409, String(season.status) === "scheduled" ? "Сезон ещё не начался." : "Сезон уже завершён.");
    }

    const runId = String(body.runId || "").trim();
    if (!/^[A-Za-z0-9_-]{12,96}$/.test(runId)) throw new ApiError(400, "Некорректный идентификатор забега.");
    const score = Math.floor(Number(body.score || 0));
    const durationMs = Math.floor(Number(body.durationMs || 0));
    const level = Math.max(1, Math.floor(Number(body.level || 1)));
    const minSeconds = positiveInt(env.LEADERBOARD_MIN_RUN_SECONDS, DEFAULT_LEADERBOARD_MIN_RUN_SECONDS);
    const minScore = positiveInt(env.LEADERBOARD_MIN_SCORE, DEFAULT_LEADERBOARD_MIN_SCORE);
    const durationSeconds = durationMs / 1000;
    if (!Number.isFinite(score) || score < minScore || !Number.isFinite(durationSeconds) || durationSeconds < minSeconds) {
      throw new ApiError(400, `В рейтинг попадают забеги от ${minSeconds} секунд и ${minScore} очков.`);
    }
    const generousMaxScore = Math.floor(durationSeconds * 90 + 6000);
    if (score > generousMaxScore) throw new ApiError(400, "Результат не прошёл серверную проверку.");

    const now = Math.floor(Date.now() / 1000);
    const telegramId = String(auth.user.id);
    const displayName = telegramDisplayName(auth.user).slice(0, 120);
    const username = String(auth.user.username || "").slice(0, 64);
    const photoUrl = String(auth.user.photo_url || "").slice(0, 500);

    try {
      await env.DB.prepare(
        `INSERT INTO leaderboard_runs (
          run_id, season_id, telegram_id, score, duration_ms, accepted, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).bind(runId, season.id, telegramId, score, durationMs, now).run();
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("unique")) throw error;
      return jsonResponse(await buildLeaderboardPayload(env, season, telegramId, "season"));
    }

    await env.DB.prepare(
      `INSERT INTO leaderboard_entries (
        season_id, telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(season_id, telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        level = excluded.level,
        best_score = CASE WHEN excluded.best_score > leaderboard_entries.best_score THEN excluded.best_score ELSE leaderboard_entries.best_score END,
        achieved_at = CASE WHEN excluded.best_score > leaderboard_entries.best_score THEN excluded.achieved_at ELSE leaderboard_entries.achieved_at END,
        updated_at = excluded.updated_at`
    ).bind(season.id, telegramId, displayName, username, photoUrl, score, level, now, now).run();

    await env.DB.prepare(
      `INSERT INTO leaderboard_all_time (
        telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        level = excluded.level,
        best_score = CASE WHEN excluded.best_score > leaderboard_all_time.best_score THEN excluded.best_score ELSE leaderboard_all_time.best_score END,
        achieved_at = CASE WHEN excluded.best_score > leaderboard_all_time.best_score THEN excluded.achieved_at ELSE leaderboard_all_time.achieved_at END,
        updated_at = excluded.updated_at`
    ).bind(telegramId, displayName, username, photoUrl, score, level, now, now).run();

    return jsonResponse(await buildLeaderboardPayload(env, season, telegramId, "season"));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("submitLeaderboardRun failed", error);
    return jsonResponse({ ok: false, error: "Не удалось отправить результат в рейтинг." }, 500);
  }
}

async function claimLeaderboardReward(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    await ensureSeason(env);
    const telegramId = String(auth.user.id);
    const requestedRewardId = String(body.rewardId || "").trim();
    const reward = requestedRewardId
      ? await env.DB.prepare(
          `SELECT * FROM leaderboard_rewards WHERE id = ? AND telegram_id = ? LIMIT 1`
        ).bind(requestedRewardId, telegramId).first()
      : await env.DB.prepare(
          `SELECT * FROM leaderboard_rewards
           WHERE telegram_id = ? AND status IN ('pending', 'claimed')
           ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 1`
        ).bind(telegramId).first();
    if (!reward) throw new ApiError(404, "Для этого аккаунта нет сезонной награды.");
    const now = Math.floor(Date.now() / 1000);
    if (String(reward.status) === "cancelled") throw new ApiError(409, "Награда отменена.");
    if (Number(reward.expires_at || 0) <= now && String(reward.status) !== "claimed") {
      await env.DB.prepare(`UPDATE leaderboard_rewards SET status = 'expired' WHERE id = ?`).bind(reward.id).run();
      throw new ApiError(410, "Срок получения награды истёк.");
    }
    if (String(reward.status) === "claimed") {
      return jsonResponse({ ok: true, claimed: false, alreadyClaimed: true, reward: rewardToClient(reward) });
    }
    const result = await env.DB.prepare(
      `UPDATE leaderboard_rewards SET status = 'claimed', claimed_at = ? WHERE id = ? AND status = 'pending'`
    ).bind(now, reward.id).run();
    if (Number(result.meta?.changes || 0) !== 1) throw new ApiError(409, "Награда уже была обработана.");
    const updated = await env.DB.prepare(`SELECT * FROM leaderboard_rewards WHERE id = ?`).bind(reward.id).first();
    return jsonResponse({ ok: true, claimed: true, reward: rewardToClient(updated) });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("claimLeaderboardReward failed", error);
    return jsonResponse({ ok: false, error: "Не удалось получить сезонную награду." }, 500);
  }
}

async function buildLeaderboardPayload(env, season, telegramId, mode = "season") {
  const topLimit = Math.min(100, positiveInt(env.LEADERBOARD_TOP_LIMIT, DEFAULT_LEADERBOARD_TOP_LIMIT));
  const table = mode === "all_time" ? "leaderboard_all_time" : "leaderboard_entries";
  const where = mode === "all_time" ? "hidden = 0" : "season_id = ? AND hidden = 0";
  const query = `SELECT telegram_id, display_name, username, photo_url, best_score, level, achieved_at
                 FROM ${table} WHERE ${where}
                 ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC LIMIT ?`;
  const topResult = mode === "all_time"
    ? await env.DB.prepare(query).bind(topLimit).all()
    : await env.DB.prepare(query).bind(season.id, topLimit).all();
  const top = (topResult.results || []).map((row, index) => leaderboardRowToClient(row, index + 1));

  const me = mode === "all_time"
    ? await env.DB.prepare(`SELECT * FROM leaderboard_all_time WHERE telegram_id = ? LIMIT 1`).bind(telegramId).first()
    : await env.DB.prepare(`SELECT * FROM leaderboard_entries WHERE season_id = ? AND telegram_id = ? LIMIT 1`).bind(season.id, telegramId).first();
  let myEntry = null;
  if (me && !Number(me.hidden || 0)) {
    const rankQuery = mode === "all_time"
      ? `SELECT COUNT(*) + 1 AS place FROM leaderboard_all_time
         WHERE hidden = 0 AND (best_score > ? OR (best_score = ? AND achieved_at < ?))`
      : `SELECT COUNT(*) + 1 AS place FROM leaderboard_entries
         WHERE season_id = ? AND hidden = 0 AND (best_score > ? OR (best_score = ? AND achieved_at < ?))`;
    const rank = mode === "all_time"
      ? await env.DB.prepare(rankQuery).bind(me.best_score, me.best_score, me.achieved_at).first()
      : await env.DB.prepare(rankQuery).bind(season.id, me.best_score, me.best_score, me.achieved_at).first();
    myEntry = leaderboardRowToClient(me, Number(rank?.place || 0));
  }

  const reward = await env.DB.prepare(
    `SELECT * FROM leaderboard_rewards
     WHERE telegram_id = ? AND status IN ('pending', 'claimed')
     ORDER BY CASE WHEN season_id = ? THEN 0 ELSE 1 END,
              CASE status WHEN 'pending' THEN 0 ELSE 1 END,
              created_at DESC
     LIMIT 1`
  ).bind(telegramId, season.id).first();
  const firstScore = top.length ? top[0].score : 0;
  const serverTime = Date.now();
  let resetPlan = null;
  try { resetPlan = JSON.parse(String(season.reset_plan_json || "null")); } catch {}
  return {
    ok: true,
    mode,
    serverTime,
    season: {
      id: String(season.id),
      title: String(season.title),
      status: String(season.status),
      startsAt: Number(season.starts_at || 0) * 1000,
      endsAt: Number(season.ends_at || 0) * 1000,
      reward: { type: String(season.reward_type || "coffee"), amount: Number(season.reward_amount || 0), title: `${Number(season.reward_amount || 0)} кофе` },
      resetPlan: resetPlan ? { ...resetPlan, applyAt: Number(season.ends_at || 0) * 1000 } : null
    },
    top,
    me: myEntry,
    firstScore,
    gapToFirst: myEntry ? Math.max(0, firstScore - myEntry.score) : firstScore,
    reward: reward ? rewardToClient(reward) : null
  };
}

function leaderboardRowToClient(row, place) {
  return {
    place: Number(place || 0),
    telegramId: String(row.telegram_id || ""),
    name: String(row.display_name || "Гость кафе"),
    username: String(row.username || ""),
    photoUrl: String(row.photo_url || ""),
    score: Number(row.best_score || 0),
    level: Number(row.level || 1),
    achievedAt: Number(row.achieved_at || 0) * 1000
  };
}

function rewardToClient(row) {
  return {
    id: String(row.id || ""),
    seasonId: String(row.season_id || ""),
    place: Number(row.place || 0),
    type: String(row.reward_type || "coffee"),
    amount: Number(row.reward_amount || 0),
    itemId: String(row.reward_item_id || ""),
    status: String(row.status || "pending"),
    createdAt: Number(row.created_at || 0) * 1000,
    claimedAt: Number(row.claimed_at || 0) * 1000,
    expiresAt: Number(row.expires_at || 0) * 1000
  };
}

async function setupWebhook(request, env) {
  try {
    requireBotToken(env);
    const expected = String(env.BOT_SETUP_KEY || "");
    const supplied = bearerToken(request.headers.get("authorization"));
    if (!expected || !timingSafeEqualString(expected, supplied)) {
      throw new ApiError(401, "Неверный ключ настройки.");
    }
    const webhookSecret = String(env.TELEGRAM_WEBHOOK_SECRET || "");
    if (!/^[A-Za-z0-9_-]{16,256}$/.test(webhookSecret)) {
      throw new ApiError(500, "TELEGRAM_WEBHOOK_SECRET не настроен или содержит недопустимые символы.");
    }

    const origin = new URL(request.url).origin;
    const webhook = await telegramApi(env, "setWebhook", {
      url: `${origin}/telegram/webhook`,
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false
    });
    const commands = await syncBotCommands(env);

    return jsonResponse({ ok: true, webhook, commands, webhookUrl: `${origin}/telegram/webhook` });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("setupWebhook failed", error);
    return jsonResponse({ ok: false, error: "Не удалось подключить webhook." }, 500);
  }
}

async function receiveTelegramWebhook(request, env, ctx) {
  const expected = String(env.TELEGRAM_WEBHOOK_SECRET || "");
  const supplied = String(request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "");
  if (!expected || !timingSafeEqualString(expected, supplied)) return new Response("Forbidden", { status: 403 });

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const task = handleTelegramUpdate(update, env).catch((error) => console.error("Telegram update failed", error));
  if (ctx?.waitUntil) ctx.waitUntil(task);
  else await task;
  return new Response("OK", { status: 200 });
}

async function handleTelegramUpdate(update, env) {
  requireDatabase(env);
  requireBotToken(env);

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
    return;
  }

  const message = update.message;
  if (!message?.chat?.id || !message?.from?.id) return;
  const text = String(message.text || "").trim();
  const chatId = message.chat.id;
  const user = message.from;

  if (/^\/whoami(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, `<b>Ваш Telegram ID:</b> <code>${escapeHtml(String(user.id))}</code>`);
    return;
  }

  const staffMatch = text.match(/^\/staff(?:@\w+)?(?:\s+(.+))?$/i);
  if (staffMatch) {
    await registerStaff(chatId, user, String(staffMatch[1] || "").trim(), env);
    return;
  }

  if (/^\/game(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botGameText(), gameButtonMarkup(env));
    return;
  }

  if (/^\/story(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botStoryText(), sectionMenuMarkup(env));
    return;
  }

  if (/^\/faq(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botFaqText(), sectionMenuMarkup(env));
    return;
  }

  if (/^\/rewards(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botRewardsText(), sectionMenuMarkup(env));
    return;
  }

  if (/^\/(?:rating|top)(?:@\w+)?$/i.test(text)) {
    await sendBotRating(env, chatId, user);
    return;
  }

  if (/^\/news(?:@\w+)?$/i.test(text)) {
    await sendBotNews(env, chatId);
    return;
  }

  if (/^\/(?:update|version)(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botUpdateText(), sectionMenuMarkup(env));
    return;
  }

  if (/^\/help(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botHelpText(), sectionMenuMarkup(env));
    return;
  }

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  if (startMatch) {
    const payload = String(startMatch[1] || "").trim();
    const rewardPayload = payload.match(/^reward_([A-Za-z0-9_-]+)$/i);
    if (rewardPayload) {
      await showRewardInBot(chatId, user, rewardPayload[1], env);
      return;
    }
    try { await syncBotCommands(env); } catch (error) { console.error("Bot command sync failed", error); }
    await sendTelegramMessage(env, chatId, botMainMenuText(), mainMenuMarkup(env));
    return;
  }

  const compact = compactCode(text);
  if (compact.length >= 8 && compact.length <= 20) {
    await showRewardInBot(chatId, user, compact, env);
    return;
  }

  await sendTelegramMessage(env, chatId, "Пришлите код награды из игры или выберите раздел в меню.", mainMenuMarkup(env));
}

function configuredGameUrl(env) {
  const candidate = String(env.GAME_URL || DEFAULT_GAME_URL).trim();
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") return url.toString();
  } catch {}
  return DEFAULT_GAME_URL;
}

function botMainMenuText() {
  return `<b>Зефирок — помощник кафе</b>\n\nТекущая версия игры: <b>${escapeHtml(GAME_VERSION)}</b>\n\nЗдесь можно открыть игру, посмотреть сезонный рейтинг и новости, узнать историю Зефи, прочитать ответы на частые вопросы и проверить код награды.\n\nЧтобы проверить подарок, просто отправьте код из раздела «Мои покупки» одним сообщением.`;
}

function botGameText() {
  return `<b>Сладкий забег</b>\n\nНажмите кнопку ниже, чтобы открыть игру и продолжить приключение Зефи.`;
}

function botStoryText() {
  return `<b>Сюжет «Сладкого забега»</b>\n\nЗефи — маленький мальтипу и главный помощник уютного кафе. Перед открытием он отправляется в сладкий забег: собирает зефир и кофе, перепрыгивает пуфики и помогает наполнить витрину любимыми угощениями гостей.\n\nЧем дальше пробежит Зефи, тем больше наград, опыта и новых возможностей откроется в его профиле.`;
}

function botFaqText() {
  return `<b>FAQ — частые вопросы</b>

<b>Как начать играть?</b>
Откройте игру через кнопку в боте, перейдите во вкладку «Играть» и нажмите «Старт».

<b>Как управлять Зефи?</b>
Нажимайте на экран, чтобы перепрыгивать пуфики и другие препятствия.

<b>Почему за забег не начислили XP?</b>
Слишком короткие попытки не дают опыт. Нужно пройти минимальный порог по времени и счёту.

<b>Где посмотреть уровень и прогресс?</b>
Во вкладке «Профиль». Нажмите на плашку уровня, чтобы увидеть требования ко всем уровням.

<b>Можно отключить звуки и музыку?</b>
Да. Во вкладке «Профиль» есть отдельные переключатели звуковых эффектов и фоновой музыки.

<b>Где посмотреть покупки?</b>
Во вкладке «Мои покупки». Нажмите на сам код, чтобы скопировать его.

<b>Сколько действует код?</b>
24 часа с момента покупки. После окончания срока подарок получить нельзя.

<b>Сколько наград можно получить?</b>
Не больше двух наград за каждые 24 часа.

<b>Как получить подарок?</b>
Покажите действующий код сотруднику кафе. Сотрудник проверит его в этом боте и спишет только после выдачи.

<b>Почему бот пишет «Код не найден»?</b>
Проверьте символы и убедитесь, что код создан в актуальной версии игры.

<b>Можно использовать код повторно?</b>
Нет. После выдачи подарок отмечается как использованный.

<b>Почему разработчики иногда могут обнулить аккаунты?</b>
Обнуление применяется только при крупных изменениях, когда старая экономика, цены, уровни, XP или награды становятся несовместимы с новой системой. Это помогает начать обновлённую версию в равных условиях и не переносить ошибки старого баланса.

<b>Что сбрасывается при полном обнулении?</b>
Могут быть сброшены валюты, рекорд, покупки, коды, уровень, XP, статистика и выбранные предметы. Перед таким обновлением игрок получает отдельное уведомление с точным списком.

<b>Чем крупное обновление отличается от обычного?</b>
Крупное обновление экономики может сопровождаться обнулением прогресса. Обычное обновление игры — исправление ошибок, новый интерфейс, музыка, звуки или технические улучшения — обычно сохраняет прогресс.

<b>Сбросится ли прогресс при обновлении ассортимента?</b>
Нет. Добавление новых напитков, подарков, скинов или изменение витрины само по себе не требует сброса. Прогресс и уже полученные данные сохраняются, если в объявлении обновления прямо не указано обратное.

<b>Как заранее понять, будет ли обнуление?</b>
Откройте раздел «Обновление» в этом боте. Там указаны версия, тип обновления и статус прогресса. При сбросе игра также покажет обязательное информационное окно.

<b>Как работает рейтинг?</b>
В таблицу попадает лучший результат одного зачтённого забега за текущий сезон. Дата старта и сброса задаётся разработчиками и отображается в игре.

<b>Что сбрасывается после сезона?</b>
Обычный сезон сбрасывает только сезонное место. Валюты, уровень, скины, покупки и настройки меняются только тогда, когда это отдельно указано в плане обновления.

<b>Какая награда за первое место?</b>
В первом сезоне победитель сможет забрать 50 кофе. В будущих сезонах наградой может стать уникальный скин.

<b>Где посмотреть версию и изменения?</b>
Нажмите «Обновление» в главном меню бота или отправьте команду /update.`;
}

function botRewardsText() {
  return `<b>Как получить награду</b>\n\n1. Соберите валюту в игре.\n2. Купите подарок во вкладке «Магазин».\n3. Откройте «Мои покупки» и нажмите на код, чтобы скопировать его.\n4. Покажите код сотруднику кафе или отправьте его в этот бот.\n5. После выдачи сотрудник спишет код, и повторно использовать его будет нельзя.\n\nКод действует 24 часа. Лимит — не больше двух наград за 24 часа.`;
}


async function sendBotRating(env, chatId, user) {
  try {
    const season = await ensureSeason(env);
    const payload = await buildLeaderboardPayload(env, season, String(user.id), "season");
    const status = payload.season.status;
    const start = formatUtcDate(Math.floor(payload.season.startsAt / 1000));
    const end = formatUtcDate(Math.floor(payload.season.endsAt / 1000));
    if (status === "scheduled") {
      await sendTelegramMessage(env, chatId,
        `<b>🏆 ${escapeHtml(payload.season.title)}</b>\n\n<b>Уже скоро!</b>\nСтарт: <b>${escapeHtml(start)}</b>\n\nГлавная награда: <b>${payload.season.reward.amount} кофе</b>\n\nВ рейтинг попадёт лучший результат одного забега.`,
        sectionMenuMarkup(env)
      );
      return;
    }
    const lines = payload.top.slice(0, 10).map((entry) => `${entry.place}. ${escapeHtml(entry.name)} — <b>${entry.score.toLocaleString("ru-RU")}</b>`);
    const me = payload.me
      ? `\n\nВаше место: <b>${payload.me.place}</b>\nВаш результат: <b>${payload.me.score.toLocaleString("ru-RU")}</b>`
      : "\n\nЗавершите подходящий забег в игре, чтобы попасть в таблицу.";
    const statusLine = status === "active" ? `Сброс рейтинга: <b>${escapeHtml(end)}</b>` : `<b>Сезон завершён</b>`;
    await sendTelegramMessage(env, chatId,
      `<b>🏆 ${escapeHtml(payload.season.title)}</b>\n\n${statusLine}\nНаграда за 1 место: <b>${payload.season.reward.amount} кофе</b>\n\n${lines.length ? lines.join("\n") : "Пока нет результатов."}${me}`,
      sectionMenuMarkup(env)
    );
  } catch (error) {
    console.error("sendBotRating failed", error);
    await sendTelegramMessage(env, chatId, "Рейтинг временно недоступен. Попробуйте позже.", sectionMenuMarkup(env));
  }
}

async function sendBotNews(env, chatId) {
  const text = `<b>📰 ${escapeHtml(BOT_NEWS_TITLE)}</b>\n\n${escapeHtml(BOT_NEWS_TEXT)}\n\nВерсия: <b>${escapeHtml(GAME_VERSION)}</b>`;
  const imageUrl = String(env.BOT_NEWS_IMAGE_URL || DEFAULT_BOT_NEWS_IMAGE_URL).trim();
  if (imageUrl) {
    try {
      await telegramApi(env, "sendPhoto", {
        chat_id: chatId,
        photo: imageUrl,
        caption: text,
        parse_mode: "HTML",
        reply_markup: sectionMenuMarkup(env)
      });
      return;
    } catch (error) {
      console.error("News image failed; falling back to text", error);
    }
  }
  await sendTelegramMessage(env, chatId, text, sectionMenuMarkup(env));
}

function botUpdateText() {
  const notes = GAME_UPDATE_NOTES.map((item) => `• ${escapeHtml(item)}`).join("\n");
  const isReset = GAME_UPDATE_PROGRESS_MODE === "reset";
  const updateType = isReset ? "Крупное обновление экономики" : "Обычное обновление";
  const progressStatus = isReset
    ? `⚠️ <b>Прогресс:</b> аккаунты обнулены.\n<b>Почему:</b> ${escapeHtml(GAME_UPDATE_RESET_REASON)}`
    : "✅ <b>Прогресс:</b> сохранён. Валюты, рекорд, покупки, уровень и XP остаются на аккаунте.";

  return `<b>${escapeHtml(GAME_UPDATE_TITLE)}</b>\n\nВерсия: <b>${escapeHtml(GAME_VERSION)}</b>\nДата обновления: <b>${escapeHtml(GAME_UPDATE_DATE)}</b>\nТип: <b>${escapeHtml(updateType)}</b>\n\n${progressStatus}\n\n<b>Что нового:</b>\n${notes}\n\nСледующее обычное обновление или обновление ассортимента не сбрасывает прогресс, если об этом отдельно не сообщено.\n\nСпасибо, что играете вместе с нами!`;
}

function botHelpText() {
  return `<b>Проверка кода</b>\n\nОтправьте код из игры одним сообщением, например:\n<code>CP-ABCD-EFGH</code>\n\nБот покажет, действителен ли код, истёк ли его срок или подарок уже был выдан.`;
}

function mainMenuMarkup(env) {
  return {
    inline_keyboard: [
      [{ text: "🎮 Открыть игру", url: configuredGameUrl(env) }],
      [
        { text: "📖 Сюжет", callback_data: "menu:story" },
        { text: "❓ FAQ", callback_data: "menu:faq" }
      ],
      [{ text: "🏆 Рейтинг", callback_data: "menu:rating" }, { text: "📰 Новости", callback_data: "menu:news" }],
      [{ text: `🆕 Обновление · ${GAME_VERSION}`, callback_data: "menu:update" }],
      [{ text: "🎁 Как получить награду", callback_data: "menu:rewards" }]
    ]
  };
}

function gameButtonMarkup(env) {
  return {
    inline_keyboard: [
      [{ text: "🎮 Открыть игру", url: configuredGameUrl(env) }],
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
}

function sectionMenuMarkup(env) {
  return {
    inline_keyboard: [
      [{ text: "🎮 Открыть игру", url: configuredGameUrl(env) }],
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
}

async function handleMenuCallback(query, env) {
  const match = String(query.data || "").match(/^menu:(home|story|faq|rewards|rating|news|update)$/);
  if (!match) return false;
  const message = query.message;
  if (!message?.chat?.id) {
    await answerCallback(env, query.id, "Откройте меню командой /start.");
    return true;
  }

  const section = match[1];
  if (section === "rating") {
    await answerCallback(env, query.id, "Рейтинг открыт");
    await sendBotRating(env, message.chat.id, query.from);
    return true;
  }
  if (section === "news") {
    await answerCallback(env, query.id, "Новости открыты");
    await sendBotNews(env, message.chat.id);
    return true;
  }
  const text = section === "story"
    ? botStoryText()
    : section === "faq"
      ? botFaqText()
      : section === "rewards"
        ? botRewardsText()
        : section === "update"
          ? botUpdateText()
          : botMainMenuText();
  const replyMarkup = section === "home" ? mainMenuMarkup(env) : sectionMenuMarkup(env);

  await answerCallback(env, query.id, section === "home" ? "Главное меню" : "Раздел открыт");
  await telegramApi(env, "editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    text,
    reply_markup: replyMarkup
  });
  return true;
}

async function registerStaff(chatId, user, suppliedCode, env) {
  const expected = String(env.STAFF_SETUP_CODE || "").trim();
  if (!expected) {
    await sendTelegramMessage(env, chatId, "Подключение сотрудников ещё не настроено.");
    return;
  }
  if (!timingSafeEqualString(expected, suppliedCode)) {
    await sendTelegramMessage(env, chatId, "Неверный код сотрудника.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO staff_users (telegram_id, display_name, added_at, active)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(telegram_id) DO UPDATE SET display_name = excluded.display_name, active = 1`
  ).bind(String(user.id), telegramDisplayName(user), now).run();

  await sendTelegramMessage(env, chatId,
    `<b>Доступ сотрудника подключён</b>\n\nТеперь отправьте код гостя. После проверки появится кнопка «Выдать подарок и списать».`
  );
}

async function showRewardInBot(chatId, viewer, rawCode, env) {
  const compact = compactCode(rawCode);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE reward_codes SET status = 'expired'
     WHERE code_compact = ? AND status = 'active' AND expires_at <= ?`
  ).bind(compact, now).run();

  const reward = await getRewardByCompact(compact, env);
  if (!reward) {
    await sendTelegramMessage(env, chatId, "❌ <b>Код не найден</b>\n\nПроверьте символы и отправьте код ещё раз.");
    return;
  }

  const staff = await isStaff(viewer.id, env);
  const view = rewardBotView(reward, staff);
  await sendTelegramMessage(env, chatId, view.text, view.replyMarkup);
}

async function handleCallbackQuery(query, env) {
  const data = String(query.data || "");
  const user = query.from;
  const message = query.message;
  const chatId = message?.chat?.id;
  if (!chatId || !user?.id) return;

  if (await handleMenuCallback(query, env)) return;

  if (!(await isStaff(user.id, env))) {
    await answerCallback(env, query.id, "Доступно только сотрудникам кафе.", true);
    return;
  }

  const preview = data.match(/^redeem:([A-Z0-9]+)$/);
  if (preview) {
    const reward = await getRewardByCompact(preview[1], env);
    if (!reward) {
      await answerCallback(env, query.id, "Код не найден.", true);
      return;
    }
    if (effectiveRewardStatus(reward) !== "active") {
      await answerCallback(env, query.id, "Этот код уже нельзя списать.", true);
      await editRewardMessage(env, message, reward, true);
      return;
    }

    await answerCallback(env, query.id, "Проверьте подарок перед подтверждением.");
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: message.message_id,
      parse_mode: "HTML",
      text: `⚠️ <b>Подтвердите выдачу</b>\n\nНаграда: <b>${escapeHtml(reward.product_name)}</b>\nКод: <code>${escapeHtml(reward.code)}</code>\n\nНажимайте «Да, списать» только после того, как подарок передан гостю.`,
      reply_markup: {
        inline_keyboard: [[
          { text: "Да, подарок выдан", callback_data: `confirm:${reward.code_compact}` },
          { text: "Отмена", callback_data: `cancel:${reward.code_compact}` }
        ]]
      }
    });
    return;
  }

  const confirm = data.match(/^confirm:([A-Z0-9]+)$/);
  if (confirm) {
    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      `UPDATE reward_codes
       SET status = 'used', redeemed_at = ?, redeemed_by = ?, redeemed_by_name = ?
       WHERE code_compact = ? AND status = 'active' AND expires_at > ?`
    ).bind(now, String(user.id), telegramDisplayName(user), confirm[1], now).run();

    const reward = await getRewardByCompact(confirm[1], env);
    if (Number(result.meta?.changes || 0) === 1 && reward) {
      await answerCallback(env, query.id, "Подарок списан.");
      await editRewardMessage(env, message, reward, true);
      return;
    }

    await answerCallback(env, query.id, "Код уже использован или истёк.", true);
    if (reward) await editRewardMessage(env, message, reward, true);
    return;
  }

  const cancel = data.match(/^cancel:([A-Z0-9]+)$/);
  if (cancel) {
    const reward = await getRewardByCompact(cancel[1], env);
    await answerCallback(env, query.id, "Списание отменено.");
    if (reward) await editRewardMessage(env, message, reward, true);
    return;
  }

  await answerCallback(env, query.id, "Неизвестное действие.");
}

async function editRewardMessage(env, message, reward, staff) {
  const view = rewardBotView(reward, staff);
  await telegramApi(env, "editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    parse_mode: "HTML",
    text: view.text,
    reply_markup: view.replyMarkup || { inline_keyboard: [] }
  });
}

function rewardBotView(reward, staff) {
  const status = effectiveRewardStatus(reward);
  const code = escapeHtml(reward.code);
  const product = escapeHtml(reward.product_name);
  const owner = escapeHtml(reward.owner_name || "Гость");

  if (status === "used") {
    const usedAt = reward.redeemed_at ? formatUtcDate(reward.redeemed_at) : "время не указано";
    const by = reward.redeemed_by_name ? `\nСотрудник: ${escapeHtml(reward.redeemed_by_name)}` : "";
    return {
      text: `✅ <b>Подарок уже выдан</b>\n\nНаграда: <b>${product}</b>\nКод: <code>${code}</code>\nСписан: ${usedAt}${by}`,
      replyMarkup: null
    };
  }

  if (status === "expired") {
    return {
      text: `⌛ <b>Срок действия истёк</b>\n\nНаграда: <b>${product}</b>\nКод: <code>${code}</code>\nДействовал до: ${formatUtcDate(reward.expires_at)}`,
      replyMarkup: null
    };
  }

  const ownerLine = staff ? `\nВладелец: ${owner}` : "";
  const text = `✅ <b>Код действителен</b>\n\nНаграда: <b>${product}</b>\nКод: <code>${code}</code>${ownerLine}\nДействует до: ${formatUtcDate(reward.expires_at)}${staff ? "" : "\n\nПокажите это сообщение сотруднику кафе."}`;
  return {
    text,
    replyMarkup: staff ? {
      inline_keyboard: [[{ text: "Выдать подарок и списать", callback_data: `redeem:${reward.code_compact}` }]]
    } : null
  };
}

async function getRewardByCompact(compact, env) {
  return env.DB.prepare(
    `SELECT code, code_compact, product_id, product_name, owner_telegram_id, owner_name,
            created_at, expires_at, status, redeemed_at, redeemed_by, redeemed_by_name
     FROM reward_codes WHERE code_compact = ? LIMIT 1`
  ).bind(compactCode(compact)).first();
}

async function isStaff(telegramId, env) {
  const row = await env.DB.prepare(
    `SELECT telegram_id FROM staff_users WHERE telegram_id = ? AND active = 1 LIMIT 1`
  ).bind(String(telegramId)).first();
  return Boolean(row);
}

async function syncBotCommands(env) {
  return telegramApi(env, "setMyCommands", { commands: BOT_COMMANDS });
}

async function sendTelegramMessage(env, chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return telegramApi(env, "sendMessage", payload);
}

async function answerCallback(env, callbackQueryId, text, showAlert = false) {
  return telegramApi(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert
  });
}

async function telegramApi(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(`Telegram ${method} failed: ${data?.description || response.status}`);
  }
  return data.result;
}

async function validateTelegramInitData(initData, env) {
  if (!initData) throw new ApiError(401, "Откройте игру внутри Telegram, чтобы получить настоящий код.");
  const params = new URLSearchParams(initData);
  const receivedHash = String(params.get("hash") || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(receivedHash)) throw new ApiError(401, "Данные Telegram не прошли проверку.");

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), String(env.TELEGRAM_BOT_TOKEN));
  const calculated = bytesToHex(await hmacSha256(secretKey, dataCheckString));
  if (!timingSafeEqualString(receivedHash, calculated)) throw new ApiError(401, "Данные Telegram не прошли проверку.");

  const authDate = Number(params.get("auth_date") || 0);
  const now = Math.floor(Date.now() / 1000);
  const maxAge = positiveInt(env.INIT_DATA_MAX_AGE_SECONDS, DEFAULT_INIT_DATA_MAX_AGE_SECONDS);
  if (!authDate || authDate > now + 60 || now - authDate > maxAge) {
    throw new ApiError(401, "Сессия Telegram устарела. Перезапустите игру из бота.");
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }
  if (!user?.id) throw new ApiError(401, "Telegram не передал профиль игрока.");
  return { user, authDate };
}

async function hmacSha256(rawKey, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function generateRewardCode(prefix) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let random = "";
  for (const byte of bytes) random += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

function compactCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function rewardRowToClient(row) {
  return {
    code: row.code,
    productId: row.product_id,
    productName: row.product_name,
    issuedAt: Number(row.created_at || 0) * 1000,
    expiresAt: Number(row.expires_at || 0) * 1000,
    status: effectiveRewardStatus(row),
    redeemedAt: row.redeemed_at ? Number(row.redeemed_at) * 1000 : 0
  };
}

function effectiveRewardStatus(row) {
  if (row.status === "used" || row.status === "cancelled" || row.status === "expired") return row.status;
  return Number(row.expires_at || 0) <= Math.floor(Date.now() / 1000) ? "expired" : "active";
}

function telegramDisplayName(user) {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return full || (user?.username ? `@${user.username}` : `Telegram ${user?.id || ""}`.trim());
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatUtcDate(seconds) {
  const date = new Date(Number(seconds || 0) * 1000);
  if (!Number.isFinite(date.getTime())) return "неизвестно";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date) + " МСК";
}

function positiveInt(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualString(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

function bearerToken(header) {
  const match = String(header || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireDatabase(env) {
  if (!env.DB) throw new ApiError(500, "База кодов не подключена.");
}

function requireBotToken(env) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new ApiError(500, "Токен Telegram-бота не настроен.");
}
