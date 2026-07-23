const PRODUCTS = Object.freeze({
  zefir: { id: "zefir", title: "Фирменный зефир", prefix: "ZF" },
  americano: { id: "americano", title: "Американо", prefix: "AM" },
  cappuccino: { id: "cappuccino", title: "Капучино", prefix: "CP" }
});

const DEFAULT_SHOP_PRODUCTS = Object.freeze({
  zefir: Object.freeze({ points: 40000, treats: 350, coffee: 0 }),
  americano: Object.freeze({ points: 65000, treats: 0, coffee: 350 }),
  cappuccino: Object.freeze({ points: 75000, treats: 0, coffee: 450 })
});

const SHOP_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_prices (
  product_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const encoder = new TextEncoder();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_REWARD_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT_WINDOW_SECONDS = 24 * 60 * 60;
const DEFAULT_LIMIT_MAX = 2;
const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const STAFF_SESSION_TTL_SECONDS = 30 * 60;
const SUPPORT_USERNAME = "ve4n0_em";
const SUPPORT_URL = `https://t.me/${SUPPORT_USERNAME}`;
const DEFAULT_GAME_URL = "https://zefirok-run.patokad6.workers.dev/";

// Покупки, созданные раньше этой точки, сохраняют свои коды и статусы,
// но больше не занимают лимитные слоты после глобального сброса 0.1.1 Beta.
const REWARD_LIMIT_RESET_AT_SECONDS = 1784805300; // 23.07.2026 11:15 UTC

// НАСТРОЙКИ ВЕРСИИ И РАЗДЕЛА «ОБНОВЛЕНИЕ» В БОТЕ.
// Меняйте эти значения при каждом новом релизе игры.
const GAME_VERSION = "0.3.1 Beta";
const GAME_UPDATE_DATE = "23 июля 2026";
const GAME_UPDATE_TITLE = "Команда и новости стали удобнее";

// Что произошло с прогрессом в этом релизе:
// "reset" — крупное обновление с обнулением прогресса;
// "keep" — обычное обновление с сохранением прогресса.
const GAME_UPDATE_PROGRESS_MODE = "keep";
const GAME_UPDATE_RESET_REASON = "Прогресс в этом обновлении сохраняется.";

const GAME_UPDATE_NOTES = Object.freeze([
  "В боте появилась система ролей и разрешений для команды.",
  "Сотрудников можно добавлять и отключать по Telegram ID.",
  "Новости игры теперь можно публиковать прямо из бота.",
  "Раздел поддержки и форма обращения сохранены.",
  "Прогресс игроков не изменён."
]);


// =============================================================
// НАСТРОЙКИ СЕЗОННОГО РЕЙТИНГА.
// Даты можно менять вручную. Они не обязаны совпадать с первым числом месяца.
// Значения Cloudflare env с такими же именами имеют приоритет над константами.
const DEFAULT_SEASON_ID = "sweet-season-1";
const DEFAULT_SEASON_TITLE = "Первый сладкий сезон";
const DEFAULT_SEASON_START_AT = "2026-07-23T15:40:00+03:00";
const DEFAULT_SEASON_END_AT = "2026-08-23T15:40:00+03:00";
const DEFAULT_SEASON_REWARD_COFFEE = 50;
const DEFAULT_SEASON_REWARD_TYPE = "coffee"; // coffee | skin | item | currency
const DEFAULT_SEASON_REWARD_TITLE = "50 кофе";
const DEFAULT_SEASON_REWARD_IMAGE_URL = ""; // HTTPS-картинка для скина или предмета
const DEFAULT_SEASON_REWARD_ITEM_ID = "";
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
const DEFAULT_BOT_NEWS_IMAGE_URL = `${DEFAULT_GAME_URL}assets/rating/season-news.png?v=0.3.1`;
const BOT_NEWS_TITLE = "Рейтинговый сезон уже в игре";
const BOT_NEWS_TEXT = "В Сладком Забеге открыт рейтинговый сезон. Завершайте забеги, улучшайте лучший результат и поднимайтесь в таблице лидеров. Награда за первое место в первом сезоне — 50 кофе.";
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
  { command: "support", description: "Поддержка игры" },
  { command: "help", description: "Как проверить код" },
  { command: "whoami", description: "Показать мой Telegram ID" },
  { command: "staff", description: "Войти в рабочую сессию" },
  { command: "team", description: "Команда и разрешения" },
  { command: "publish", description: "Опубликовать новость" }
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

      if (url.pathname === "/api/admin/health" && request.method === "GET") {
        return jsonResponse({
          ok: true,
          service: "zefirok-admin",
          version: GAME_VERSION,
          routes: [
            "/api/admin/profile/sync",
            "/api/admin/leaderboard/set",
            "/api/admin/shop/prices"
          ]
        });
      }

      if (url.pathname === "/api/shop/config" && request.method === "GET") {
        return await getShopConfig(env);
      }

      if (url.pathname === "/api/admin/shop/prices" && request.method === "POST") {
        return await updateShopPrices(request, env);
      }

      if (url.pathname === "/api/admin/profile/sync" && request.method === "POST") {
        return await syncAdminProfile(request, env);
      }

      if (url.pathname === "/api/admin/leaderboard/set" && request.method === "POST") {
        return await setAdminLeaderboardScore(request, env);
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

async function getShopConfig(env) {
  try {
    requireDatabase(env);
    await ensureShopSchema(env);
    return jsonResponse({
      ok: true,
      products: await readShopPrices(env),
      defaults: DEFAULT_SHOP_PRODUCTS,
      source: "d1"
    });
  } catch (error) {
    console.error("getShopConfig failed", error);
    return jsonResponse({
      ok: true,
      products: cloneDefaultShopProducts(),
      defaults: DEFAULT_SHOP_PRODUCTS,
      source: "fallback"
    });
  }
}

async function updateShopPrices(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    requireAdminUser(auth.user, env);
    const products = normalizeShopProducts(body.products);
    await ensureShopSchema(env);
    const now = Math.floor(Date.now() / 1000);
    const updatedBy = String(auth.user.id);
    await env.DB.batch(Object.entries(products).map(([productId, price]) => env.DB.prepare(
      `INSERT INTO shop_prices (
        product_id, points, treats, coffee, version, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(product_id) DO UPDATE SET
        points = excluded.points,
        treats = excluded.treats,
        coffee = excluded.coffee,
        version = shop_prices.version + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by`
    ).bind(productId, price.points, price.treats, price.coffee, now, updatedBy)));
    return jsonResponse({ ok: true, products: await readShopPrices(env), updatedAt: now * 1000 });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("updateShopPrices failed", error);
    return jsonResponse({ ok: false, error: "Не удалось сохранить глобальные цены." }, 500);
  }
}

async function ensureShopSchema(env) {
  await env.DB.prepare(SHOP_SCHEMA_SQL).run();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch(Object.entries(DEFAULT_SHOP_PRODUCTS).map(([productId, price]) => env.DB.prepare(
    `INSERT OR IGNORE INTO shop_prices (
      product_id, points, treats, coffee, version, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, 1, ?, 'system')`
  ).bind(productId, price.points, price.treats, price.coffee, now)));
}

async function readShopPrices(env) {
  const result = await env.DB.prepare(
    `SELECT product_id, points, treats, coffee FROM shop_prices ORDER BY product_id ASC`
  ).all();
  const products = cloneDefaultShopProducts();
  for (const row of result.results || []) {
    if (!products[row.product_id]) continue;
    products[row.product_id] = {
      points: safeAdminNumber(row.points),
      treats: safeAdminNumber(row.treats),
      coffee: safeAdminNumber(row.coffee)
    };
  }
  return products;
}

function cloneDefaultShopProducts() {
  return Object.fromEntries(Object.entries(DEFAULT_SHOP_PRODUCTS).map(([id, price]) => [id, { ...price }]));
}

function normalizeShopProducts(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Некорректный список цен.");
  }
  const products = {};
  for (const productId of Object.keys(DEFAULT_SHOP_PRODUCTS)) {
    const price = input[productId];
    if (!price || typeof price !== "object" || Array.isArray(price)) {
      throw new ApiError(400, `Не указаны цены товара ${productId}.`);
    }
    products[productId] = {
      points: validateAdminNumber(price.points),
      treats: validateAdminNumber(price.treats),
      coffee: validateAdminNumber(price.coffee)
    };
  }
  return products;
}

async function syncAdminProfile(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const mode = String(body.mode || "read");
    if (mode === "write") requireAdminUser(auth.user, env);
    const telegramId = String(auth.user.id);
    const current = normalizeAdminProfile(body.current || {});
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(
      `INSERT OR IGNORE INTO admin_profile_state (
        telegram_id, wallet, best_score, treats, coffee, profile_xp,
        revision, created_at, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).bind(
      telegramId,
      current.wallet,
      current.best,
      current.treats,
      current.coffee,
      current.profileXp,
      now,
      now,
      telegramId
    ).run();

    if (mode === "write") {
      const next = normalizeAdminProfile(body.next || current);
      await env.DB.prepare(
        `UPDATE admin_profile_state SET
          wallet = MAX(wallet, ?),
          best_score = MAX(best_score, ?),
          treats = MAX(treats, ?),
          coffee = MAX(coffee, ?),
          profile_xp = MAX(profile_xp, ?),
          revision = revision + 1,
          updated_at = ?,
          updated_by = ?
         WHERE telegram_id = ?`
      ).bind(
        next.wallet,
        next.best,
        next.treats,
        next.coffee,
        next.profileXp,
        now,
        telegramId,
        telegramId
      ).run();
    }

    const row = await env.DB.prepare(
      `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at, wallet_override
       FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
    ).bind(telegramId).first();

    const authoritativeWallet = row?.wallet_override != null;
    const walletValue = authoritativeWallet ? safeAdminNumber(row.wallet_override) : safeAdminNumber(row?.wallet);
    if (authoritativeWallet) {
      await env.DB.prepare(
        `UPDATE admin_profile_state SET wallet = ?, wallet_override = NULL WHERE telegram_id = ?`
      ).bind(walletValue, telegramId).run();
    }

    return jsonResponse({
      ok: true,
      profile: {
        wallet: walletValue,
        best: safeAdminNumber(row?.best_score),
        treats: safeAdminNumber(row?.treats),
        coffee: safeAdminNumber(row?.coffee),
        profileXp: safeAdminNumber(row?.profile_xp),
        authoritativeWallet,
        revision: safeAdminNumber(row?.revision),
        updatedAt: safeAdminNumber(row?.updated_at) * 1000
      }
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("syncAdminProfile failed", error);
    return jsonResponse({ ok: false, error: "Не удалось синхронизировать глобальные начисления." }, 500);
  }
}

async function setAdminLeaderboardScore(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    requireAdminUser(auth.user, env);
    const score = validateAdminNumber(body.score);
    const level = Math.max(1, Math.min(50, Math.floor(Number(body.level || 1)) || 1));
    const now = Math.floor(Date.now() / 1000);
    const telegramId = String(auth.user.id);
    const displayName = telegramDisplayName(auth.user).slice(0, 120);
    const username = String(auth.user.username || "").slice(0, 64);
    const photoUrl = String(auth.user.photo_url || "").slice(0, 500);
    const season = await ensureSeason(env, now);

    await env.DB.prepare(
      `INSERT INTO leaderboard_entries (
        season_id, telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(season_id, telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        best_score = excluded.best_score,
        level = excluded.level,
        achieved_at = excluded.achieved_at,
        updated_at = excluded.updated_at,
        hidden = 0`
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
        best_score = excluded.best_score,
        level = excluded.level,
        achieved_at = excluded.achieved_at,
        updated_at = excluded.updated_at,
        hidden = 0`
    ).bind(telegramId, displayName, username, photoUrl, score, level, now, now).run();

    return jsonResponse({
      ok: true,
      score,
      seasonId: String(season.id),
      season: await buildLeaderboardPayload(env, season, telegramId, "season"),
      allTime: await buildLeaderboardPayload(env, season, telegramId, "all_time")
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("setAdminLeaderboardScore failed", error);
    return jsonResponse({ ok: false, error: "Не удалось изменить серверный рейтинг." }, 500);
  }
}

function normalizeAdminProfile(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    wallet: validateAdminNumber(source.wallet),
    best: validateAdminNumber(source.best),
    treats: validateAdminNumber(source.treats),
    coffee: validateAdminNumber(source.coffee),
    profileXp: validateAdminNumber(source.profileXp)
  };
}

function validateAdminNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999) {
    throw new ApiError(400, "Значение должно быть целым числом от 0 до 999 999 999.");
  }
  return Math.floor(number);
}

function safeAdminNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(999999999, Math.floor(number))) : 0;
}

function requireAdminUser(user, env) {
  const allowedIds = String(env.SHOP_ADMIN_TELEGRAM_IDS || env.ADMIN_TELEGRAM_IDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowedIds.length) throw new ApiError(503, "В Cloudflare не настроен SHOP_ADMIN_TELEGRAM_IDS.");
  if (!allowedIds.includes(String(user?.id || ""))) throw new ApiError(403, "Нет доступа к административным операциям.");
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
  const rewardType = String(env.LEADERBOARD_REWARD_TYPE || DEFAULT_SEASON_REWARD_TYPE).trim() || DEFAULT_SEASON_REWARD_TYPE;
  const rewardAmount = positiveInt(env.LEADERBOARD_REWARD_AMOUNT || env.LEADERBOARD_REWARD_COFFEE, DEFAULT_SEASON_REWARD_COFFEE);
  const rewardTitle = String(env.LEADERBOARD_REWARD_TITLE || (rewardType === "coffee" ? `${rewardAmount} кофе` : DEFAULT_SEASON_REWARD_TITLE)).trim();
  const rewardImageUrl = String(env.LEADERBOARD_REWARD_IMAGE_URL || DEFAULT_SEASON_REWARD_IMAGE_URL).trim();
  const rewardItemId = String(env.LEADERBOARD_REWARD_ITEM_ID || DEFAULT_SEASON_REWARD_ITEM_ID).trim();
  return {
    id,
    title,
    startsAt,
    endsAt,
    rewardType,
    rewardAmount,
    rewardTitle,
    rewardImageUrl,
    rewardItemId,
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
    ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?)
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
    config.rewardType,
    config.rewardAmount,
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
    const config = configuredSeason(env);
    const rewardType = String(season.reward_type || config.rewardType || "coffee");
    const rewardId = `${season.id}:${winner.telegram_id}:1:${rewardType}`;
    const claimDays = positiveInt(season.reward_claim_days, DEFAULT_SEASON_REWARD_CLAIM_DAYS);
    const expiresAt = Math.max(now, Number(season.ends_at || now)) + claimDays * 24 * 60 * 60;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO leaderboard_rewards (
        id, season_id, telegram_id, place, reward_type, reward_amount,
        reward_item_id, status, created_at, expires_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?, 'pending', ?, ?)`
    ).bind(
      rewardId,
      season.id,
      String(winner.telegram_id),
      rewardType,
      Number(season.reward_amount || config.rewardAmount || 0),
      config.rewardItemId,
      now,
      expiresAt
    ).run();
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
      return jsonResponse({ ok: true, claimed: false, alreadyClaimed: true, reward: rewardToClient(reward, configuredSeason(env)) });
    }
    const result = await env.DB.prepare(
      `UPDATE leaderboard_rewards SET status = 'claimed', claimed_at = ? WHERE id = ? AND status = 'pending'`
    ).bind(now, reward.id).run();
    if (Number(result.meta?.changes || 0) !== 1) throw new ApiError(409, "Награда уже была обработана.");
    const updated = await env.DB.prepare(`SELECT * FROM leaderboard_rewards WHERE id = ?`).bind(reward.id).first();
    return jsonResponse({ ok: true, claimed: true, reward: rewardToClient(updated, configuredSeason(env)) });
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
  const rewardConfig = configuredSeason(env);
  const rewardType = String(season.reward_type || rewardConfig.rewardType || "coffee");
  const rewardAmount = Number(season.reward_amount || rewardConfig.rewardAmount || 0);
  const rewardTitle = rewardType === rewardConfig.rewardType
    ? rewardConfig.rewardTitle
    : rewardType === "coffee" ? `${rewardAmount} кофе` : "Сезонная награда";
  const rewardImageUrl = rewardType === rewardConfig.rewardType ? rewardConfig.rewardImageUrl : "";
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
      reward: {
        type: rewardType,
        amount: rewardAmount,
        title: rewardTitle,
        imageUrl: rewardImageUrl,
        itemId: rewardConfig.rewardItemId
      },
      resetPlan: resetPlan ? { ...resetPlan, applyAt: Number(season.ends_at || 0) * 1000 } : null
    },
    top,
    me: myEntry,
    firstScore,
    gapToFirst: myEntry ? Math.max(0, firstScore - myEntry.score) : firstScore,
    reward: reward ? rewardToClient(reward, rewardConfig) : null
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

function rewardToClient(row, config = null) {
  const type = String(row.reward_type || "coffee");
  const amount = Number(row.reward_amount || 0);
  const matchesConfig = config && type === String(config.rewardType || "") && String(row.season_id || "") === String(config.id || "");
  return {
    id: String(row.id || ""),
    seasonId: String(row.season_id || ""),
    place: Number(row.place || 0),
    type,
    amount,
    title: matchesConfig ? config.rewardTitle : type === "coffee" ? `${amount} кофе` : "Сезонная награда",
    imageUrl: matchesConfig ? config.rewardImageUrl : "",
    itemId: String(row.reward_item_id || config?.rewardItemId || ""),
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

  if (/^\/team(?:@\w+)?$/i.test(text)) {
    await showTeamManagement(chatId, user, env);
    return;
  }

  const teamAddMatch = text.match(/^\/team_add(?:@\w+)?\s+(\d{4,20})(?:\s+(employee|manager|admin))?$/i);
  if (teamAddMatch) {
    await addTeamMember(chatId, user, teamAddMatch[1], teamAddMatch[2] || "employee", env);
    return;
  }

  const teamRemoveMatch = text.match(/^\/team_remove(?:@\w+)?\s+(\d{4,20})$/i);
  if (teamRemoveMatch) {
    await removeTeamMember(chatId, user, teamRemoveMatch[1], env);
    return;
  }

  const teamRoleMatch = text.match(/^\/team_role(?:@\w+)?\s+(\d{4,20})\s+(employee|manager|admin)$/i);
  if (teamRoleMatch) {
    await setTeamRole(chatId, user, teamRoleMatch[1], teamRoleMatch[2], env);
    return;
  }

  const permitMatch = text.match(/^\/permit(?:@\w+)?\s+(\d{4,20})\s+(redeem|points|products|news|staff)\s+(on|off)$/i);
  if (permitMatch) {
    await setTeamPermission(chatId, user, permitMatch[1], permitMatch[2], permitMatch[3] === "on", env);
    return;
  }

  const pointsMatch = text.match(/^\/points(?:@\w+)?\s+(\d{4,20})\s+(add|remove|set)\s+(\d{1,9})$/i);
  if (pointsMatch) {
    await adjustPlayerPoints(chatId, user, pointsMatch[1], pointsMatch[2], Number(pointsMatch[3]), env);
    return;
  }

  const publishMatch = text.match(/^\/publish(?:@\w+)?\s+([\s\S]+)$/i);
  if (publishMatch) {
    await publishBotNews(chatId, user, publishMatch[1], env);
    return;
  }

  const staffControlMatch = text.match(/^\/staff(off|on)(?:@\w+)?\s+(\d{4,20})$/i);
  if (staffControlMatch) {
    await setStaffAccountState(chatId, user, staffControlMatch[2], staffControlMatch[1].toLowerCase() === "on", env);
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

  if (/^\/support(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, botSupportText(user), supportMenuMarkup(env));
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
  let news = null;
  try { news = await latestBotNews(env); } catch (error) { console.error("Latest bot news failed", error); }
  const title = String(news?.title || BOT_NEWS_TITLE);
  const body = String(news?.body || BOT_NEWS_TEXT);
  const text = `<b>📰 ${escapeHtml(title)}</b>

${escapeHtml(body)}

Версия: <b>${escapeHtml(GAME_VERSION)}</b>`;
  const imageUrl = String(news?.image_url || env.BOT_NEWS_IMAGE_URL || DEFAULT_BOT_NEWS_IMAGE_URL).trim();
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

function botSupportText(user = null) {
  const telegramId = user?.id ? String(user.id) : "укажите ваш Telegram ID";
  const username = user?.username ? `@${user.username}` : "не указан";
  const template = [
    "Тип обращения: баг / предложение",
    "Где возникло: игра / бот / магазин / профиль / рейтинг",
    `Версия игры: ${GAME_VERSION}`,
    `Ваш Telegram ID: ${telegramId}`,
    `Ваш username: ${username}`,
    "Что произошло или что предлагаете:",
    "",
    "Как повторить проблему по шагам:",
    "1. ",
    "2. ",
    "3. ",
    "",
    "Что ожидали увидеть:",
    "",
    "Устройство и версия ОС:",
    "",
    "Скриншот или видео: приложено / нет"
  ].join("\n");

  return `<b>🛟 Поддержка игры</b>\n\nПо багам и предложениям пишите разработчику: <a href="${SUPPORT_URL}">@${SUPPORT_USERNAME}</a>.\n\nСкопируйте форму ниже, заполните пустые строки и отправьте одним сообщением:\n\n<pre>${escapeHtml(template)}</pre>`;
}

function supportMenuMarkup(env) {
  return {
    inline_keyboard: [
      [{ text: "💬 Написать разработчику", url: SUPPORT_URL }],
      [{ text: "🎮 Открыть игру", url: configuredGameUrl(env) }],
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
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
      [{ text: "🎁 Как получить награду", callback_data: "menu:rewards" }],
      [{ text: "🛟 Поддержка игры", callback_data: "menu:support" }]
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
      [{ text: "🛟 Поддержка", callback_data: "menu:support" }],
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
}

async function handleMenuCallback(query, env) {
  const match = String(query.data || "").match(/^menu:(home|story|faq|rewards|rating|news|update|support)$/);
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
          : section === "support"
            ? botSupportText(query.from)
            : botMainMenuText();
  const replyMarkup = section === "home"
    ? mainMenuMarkup(env)
    : section === "support"
      ? supportMenuMarkup(env)
      : sectionMenuMarkup(env);

  if (Array.isArray(message.photo) && message.photo.length > 0) {
    await answerCallback(env, query.id, section === "home" ? "Главное меню" : "Раздел открыт");
    await sendTelegramMessage(env, message.chat.id, text, replyMarkup);
    return true;
  }

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

const TEAM_ROLE_PRESETS = Object.freeze({
  employee: Object.freeze({ redeem: 1, points: 0, products: 0, news: 0, staff: 0 }),
  manager: Object.freeze({ redeem: 1, points: 1, products: 1, news: 0, staff: 0 }),
  admin: Object.freeze({ redeem: 1, points: 1, products: 1, news: 1, staff: 1 })
});

const TEAM_PERMISSION_COLUMNS = Object.freeze({
  redeem: "can_redeem_rewards",
  points: "can_adjust_points",
  products: "can_manage_products",
  news: "can_publish_news",
  staff: "can_manage_staff"
});

function normalizeTeamRole(value) {
  const role = String(value || "employee").toLowerCase();
  return Object.prototype.hasOwnProperty.call(TEAM_ROLE_PRESETS, role) ? role : "employee";
}

function teamRoleLabel(role) {
  return normalizeTeamRole(role) === "admin" ? "Администратор" : normalizeTeamRole(role) === "manager" ? "Менеджер" : "Сотрудник";
}

function permissionLabel(permission) {
  return ({ redeem: "выдача товаров", points: "изменение очков", products: "управление товарами", news: "публикация новостей", staff: "управление командой" })[permission] || permission;
}

async function getTeamAccess(user, env) {
  if (isBotAdminUser(user, env)) {
    return { authorized: true, owner: true, role: "owner", permissions: { redeem: true, points: true, products: true, news: true, staff: true } };
  }
  const row = await env.DB.prepare(
    `SELECT telegram_id, display_name, active, role, session_expires_at,
            can_redeem_rewards, can_adjust_points, can_manage_products,
            can_publish_news, can_manage_staff
     FROM staff_users WHERE telegram_id = ? LIMIT 1`
  ).bind(String(user?.id || user || "")).first();
  if (!row || Number(row.active || 0) !== 1) return { authorized: false, owner: false, reason: "not_staff", permissions: {} };
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Number(row.session_expires_at || 0);
  const activeSession = Number.isFinite(expiresAt) && expiresAt > now;
  return {
    authorized: activeSession,
    owner: false,
    reason: activeSession ? "active" : "expired",
    role: normalizeTeamRole(row.role),
    expiresAt,
    permissions: {
      redeem: Number(row.can_redeem_rewards || 0) === 1,
      points: Number(row.can_adjust_points || 0) === 1,
      products: Number(row.can_manage_products || 0) === 1,
      news: Number(row.can_publish_news || 0) === 1,
      staff: Number(row.can_manage_staff || 0) === 1
    }
  };
}

async function requireTeamPermission(chatId, user, permission, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? "Рабочая сессия истекла. Выполните <code>/staff</code> и повторите действие."
      : "У вас нет активного доступа к команде.");
    return null;
  }
  if (!access.owner && !access.permissions?.[permission]) {
    await sendTelegramMessage(env, chatId, `Недостаточно прав: требуется разрешение «${escapeHtml(permissionLabel(permission))}».`);
    return null;
  }
  return access;
}

async function showTeamManagement(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "staff", env);
  if (!access) return;
  const result = await env.DB.prepare(
    `SELECT telegram_id, display_name, role, active, session_expires_at,
            can_redeem_rewards, can_adjust_points, can_manage_products,
            can_publish_news, can_manage_staff
     FROM staff_users ORDER BY active DESC, role DESC, display_name ASC LIMIT 50`
  ).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  const now = Math.floor(Date.now() / 1000);
  const list = rows.length ? rows.map((row) => {
    const permissions = [
      Number(row.can_redeem_rewards) ? "товары" : null,
      Number(row.can_adjust_points) ? "очки" : null,
      Number(row.can_manage_products) ? "каталог" : null,
      Number(row.can_publish_news) ? "новости" : null,
      Number(row.can_manage_staff) ? "команда" : null
    ].filter(Boolean).join(", ") || "нет разрешений";
    const session = Number(row.session_expires_at || 0) > now ? "сессия активна" : "нужен вход";
    return `• <code>${escapeHtml(String(row.telegram_id))}</code> — ${escapeHtml(row.display_name || "Без имени")}\n  ${escapeHtml(teamRoleLabel(row.role))} · ${Number(row.active) ? session : "отключён"}\n  Права: ${escapeHtml(permissions)}`;
  }).join("\n\n") : "Сотрудники пока не добавлены.";
  await sendTelegramMessage(env, chatId, `<b>Команда и разрешения</b>\n\n${list}\n\n<b>Команды владельца</b>\n<code>/team_add ID employee</code>\n<code>/team_role ID manager</code>\n<code>/permit ID news on</code>\n<code>/team_remove ID</code>\n\nРазрешения: redeem, points, products, news, staff.`);
}

async function addTeamMember(chatId, requester, telegramId, roleValue, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const role = normalizeTeamRole(roleValue);
  const preset = TEAM_ROLE_PRESETS[role];
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO staff_users (
       telegram_id, display_name, added_at, active, session_expires_at, role,
       can_redeem_rewards, can_adjust_points, can_manage_products,
       can_publish_news, can_manage_staff, invited_by, updated_at
     ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET
       active = 1, role = excluded.role,
       can_redeem_rewards = excluded.can_redeem_rewards,
       can_adjust_points = excluded.can_adjust_points,
       can_manage_products = excluded.can_manage_products,
       can_publish_news = excluded.can_publish_news,
       can_manage_staff = excluded.can_manage_staff,
       invited_by = excluded.invited_by, updated_at = excluded.updated_at,
       session_expires_at = 0`
  ).bind(String(telegramId), `Telegram ${telegramId}`, now, role,
    preset.redeem, preset.points, preset.products, preset.news, preset.staff,
    String(requester.id), now).run();
  await sendTelegramMessage(env, chatId, `Пользователь <code>${escapeHtml(String(telegramId))}</code> добавлен как <b>${escapeHtml(teamRoleLabel(role))}</b>.\n\nОн должен открыть бота и выполнить <code>/staff</code>.`);
}

async function removeTeamMember(chatId, requester, telegramId, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  await env.DB.prepare(`UPDATE staff_users SET active = 0, session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`)
    .bind(Math.floor(Date.now() / 1000), String(telegramId)).run();
  await sendTelegramMessage(env, chatId, `Доступ пользователя <code>${escapeHtml(String(telegramId))}</code> отключён. Текущая сессия завершена.`);
}

async function setTeamRole(chatId, requester, telegramId, roleValue, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const role = normalizeTeamRole(roleValue);
  const preset = TEAM_ROLE_PRESETS[role];
  const result = await env.DB.prepare(
    `UPDATE staff_users SET role = ?, can_redeem_rewards = ?, can_adjust_points = ?,
       can_manage_products = ?, can_publish_news = ?, can_manage_staff = ?,
       session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`
  ).bind(role, preset.redeem, preset.points, preset.products, preset.news, preset.staff,
    Math.floor(Date.now() / 1000), String(telegramId)).run();
  if (Number(result.meta?.changes || 0) < 1) {
    await sendTelegramMessage(env, chatId, "Сотрудник не найден. Сначала используйте /team_add.");
    return;
  }
  await sendTelegramMessage(env, chatId, `Роль пользователя <code>${escapeHtml(String(telegramId))}</code> изменена на <b>${escapeHtml(teamRoleLabel(role))}</b>. Для продолжения ему нужно снова выполнить /staff.`);
}

async function setTeamPermission(chatId, requester, telegramId, permission, enabled, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const column = TEAM_PERMISSION_COLUMNS[permission];
  if (!column) return;
  const result = await env.DB.prepare(
    `UPDATE staff_users SET ${column} = ?, session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`
  ).bind(enabled ? 1 : 0, Math.floor(Date.now() / 1000), String(telegramId)).run();
  if (Number(result.meta?.changes || 0) < 1) {
    await sendTelegramMessage(env, chatId, "Сотрудник не найден.");
    return;
  }
  await sendTelegramMessage(env, chatId, `Разрешение «${escapeHtml(permissionLabel(permission))}» для <code>${escapeHtml(String(telegramId))}</code> ${enabled ? "включено" : "отключено"}. Сотруднику нужно снова выполнить /staff.`);
}

async function adjustPlayerPoints(chatId, requester, telegramId, mode, amountValue, env) {
  const access = await requireTeamPermission(chatId, requester, "points", env);
  if (!access) return;
  const amount = Math.max(0, Math.floor(Number(amountValue) || 0));
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO admin_profile_state (
      telegram_id, wallet, best_score, treats, coffee, profile_xp,
      revision, created_at, updated_at, updated_by, wallet_override
    ) VALUES (?, 0, 0, 0, 0, 0, 1, ?, ?, ?, 0)`
  ).bind(String(telegramId), now, now, String(requester.id)).run();
  const row = await env.DB.prepare(`SELECT wallet, wallet_override FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`)
    .bind(String(telegramId)).first();
  const current = row?.wallet_override == null ? Number(row?.wallet || 0) : Number(row.wallet_override || 0);
  const next = mode === "set" ? amount : mode === "remove" ? Math.max(0, current - amount) : current + amount;
  await env.DB.prepare(
    `UPDATE admin_profile_state SET wallet = ?, wallet_override = ?, revision = revision + 1,
       updated_at = ?, updated_by = ? WHERE telegram_id = ?`
  ).bind(next, next, now, String(requester.id), String(telegramId)).run();
  await sendTelegramMessage(env, chatId, `Очки пользователя <code>${escapeHtml(String(telegramId))}</code> установлены: <b>${next}</b>. Значение применится при следующем открытии или синхронизации игры.`);
}

async function publishBotNews(chatId, requester, rawPayload, env) {
  const access = await requireTeamPermission(chatId, requester, "news", env);
  if (!access) return;
  const parts = String(rawPayload || "").split("|").map((part) => part.trim());
  const title = String(parts.shift() || "").slice(0, 120);
  const body = String(parts.shift() || "").slice(0, 3000);
  const imageUrl = String(parts.shift() || "").slice(0, 1000);
  if (!title || !body) {
    await sendTelegramMessage(env, chatId, `<b>Формат публикации</b>\n\n<code>/publish Заголовок | Текст новости | https://ссылка-на-картинку</code>\n\nСсылка на картинку необязательна.`);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`UPDATE bot_news SET status = 'archived' WHERE status = 'published'`).run();
  await env.DB.prepare(
    `INSERT INTO bot_news (title, body, image_url, status, created_at, published_at, created_by, created_by_name)
     VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`
  ).bind(title, body, imageUrl || null, now, now, String(requester.id), telegramDisplayName(requester)).run();
  await sendTelegramMessage(env, chatId, `Новость опубликована. Она уже доступна в разделе «Новости».\n\n<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`);
}

async function latestBotNews(env) {
  return env.DB.prepare(
    `SELECT title, body, image_url, published_at FROM bot_news
     WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 1`
  ).first();
}

function isBotAdminUser(user, env) {
  const allowedIds = String(env.SHOP_ADMIN_TELEGRAM_IDS || env.ADMIN_TELEGRAM_IDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return allowedIds.includes(String(user?.id || ""));
}

async function setStaffAccountState(chatId, requester, targetTelegramId, enabled, env) {
  if (!isBotAdminUser(requester, env)) {
    await sendTelegramMessage(env, chatId, "Нет доступа к управлению сотрудниками.");
    return;
  }

  const result = await env.DB.prepare(
    `UPDATE staff_users
     SET active = ?, session_expires_at = 0
     WHERE telegram_id = ?`
  ).bind(enabled ? 1 : 0, String(targetTelegramId)).run();

  if (Number(result.meta?.changes || 0) < 1) {
    await sendTelegramMessage(env, chatId,
      `Сотрудник с Telegram ID <code>${escapeHtml(String(targetTelegramId))}</code> не найден.`
    );
    return;
  }

  await sendTelegramMessage(env, chatId,
    enabled
      ? `Учётная запись <code>${escapeHtml(String(targetTelegramId))}</code> включена. Сотруднику нужно снова выполнить <code>/staff КОД</code>.`
      : `Учётная запись <code>${escapeHtml(String(targetTelegramId))}</code> отключена. Текущая сессия завершена, повторный вход запрещён.`
  );
}

async function registerStaff(chatId, user, suppliedCode, env) {
  const expected = String(env.STAFF_SETUP_CODE || "").trim();
  const existingStaff = await env.DB.prepare(
    `SELECT active, role FROM staff_users WHERE telegram_id = ? LIMIT 1`
  ).bind(String(user.id)).first();

  const invited = existingStaff && Number(existingStaff.active || 0) === 1;
  const owner = isBotAdminUser(user, env);
  const legacyCodeAccepted = Boolean(expected && suppliedCode && timingSafeEqualString(expected, suppliedCode));

  if (!invited && !owner && !legacyCodeAccepted) {
    await sendTelegramMessage(env, chatId,
      `<b>Доступ не выдан</b>

Попросите владельца добавить ваш Telegram ID командой:
<code>/team_add ${escapeHtml(String(user.id))} employee</code>

Ваш ID: <code>${escapeHtml(String(user.id))}</code>`
    );
    return;
  }

  if (existingStaff && Number(existingStaff.active || 0) !== 1) {
    await sendTelegramMessage(env, chatId, "Учётная запись сотрудника отключена. Обратитесь к владельцу проекта.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const sessionExpiresAt = now + STAFF_SESSION_TTL_SECONDS;
  if (owner && !existingStaff) {
    const preset = TEAM_ROLE_PRESETS.admin;
    await env.DB.prepare(
      `INSERT INTO staff_users (
        telegram_id, display_name, added_at, active, session_expires_at, role,
        can_redeem_rewards, can_adjust_points, can_manage_products,
        can_publish_news, can_manage_staff, invited_by, updated_at
      ) VALUES (?, ?, ?, 1, ?, 'admin', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(String(user.id), telegramDisplayName(user), now, sessionExpiresAt,
      preset.redeem, preset.points, preset.products, preset.news, preset.staff,
      String(user.id), now).run();
  } else if (!existingStaff && legacyCodeAccepted) {
    const preset = TEAM_ROLE_PRESETS.employee;
    await env.DB.prepare(
      `INSERT INTO staff_users (
        telegram_id, display_name, added_at, active, session_expires_at, role,
        can_redeem_rewards, can_adjust_points, can_manage_products,
        can_publish_news, can_manage_staff, invited_by, updated_at
      ) VALUES (?, ?, ?, 1, ?, 'employee', ?, ?, ?, ?, ?, '', ?)`
    ).bind(String(user.id), telegramDisplayName(user), now, sessionExpiresAt,
      preset.redeem, preset.points, preset.products, preset.news, preset.staff, now).run();
  } else {
    await env.DB.prepare(
      `UPDATE staff_users SET display_name = ?, session_expires_at = ?, updated_at = ? WHERE telegram_id = ?`
    ).bind(telegramDisplayName(user), sessionExpiresAt, now, String(user.id)).run();
  }

  const access = await getTeamAccess(user, env);
  const enabled = Object.entries(access.permissions || {}).filter(([, value]) => value).map(([key]) => permissionLabel(key)).join(", ");
  await sendTelegramMessage(env, chatId,
    `<b>Рабочая сессия открыта на 30 минут</b>

Роль: <b>${escapeHtml(owner ? "Владелец" : teamRoleLabel(access.role))}</b>
Разрешения: ${escapeHtml(enabled || "нет")}.

Через 30 минут снова выполните <code>/staff</code>.`
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

  const staffSession = await getStaffSession(viewer.id, env);
  if (!staffSession.authorized && staffSession.reason === "expired") {
    await sendTelegramMessage(env, chatId,
      "Сессия сотрудника истекла. Войдите снова командой <code>/staff КОД</code>, затем повторно отправьте код гостя."
    );
    return;
  }
  const view = rewardBotView(reward, staffSession.authorized && Boolean(staffSession.permissions?.redeem));
  await sendTelegramMessage(env, chatId, view.text, view.replyMarkup);
}

async function handleCallbackQuery(query, env) {
  const data = String(query.data || "");
  const user = query.from;
  const message = query.message;
  const chatId = message?.chat?.id;
  if (!chatId || !user?.id) return;

  if (await handleMenuCallback(query, env)) return;

  const staffSession = await getStaffSession(user.id, env);
  if (!staffSession.authorized) {
    const sessionMessage = staffSession.reason === "expired"
      ? "Сессия сотрудника истекла. Выполните /staff."
      : "Доступно только участникам команды. Владелец должен добавить ваш Telegram ID.";
    await answerCallback(env, query.id, sessionMessage, true);
    return;
  }
  if (!staffSession.permissions?.redeem) {
    await answerCallback(env, query.id, "У вас нет разрешения на выдачу товаров.", true);
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

async function getStaffSession(telegramId, env) {
  const access = await getTeamAccess({ id: telegramId }, env);
  return {
    authorized: Boolean(access.authorized),
    reason: access.reason || (access.authorized ? "active" : "not_staff"),
    expiresAt: Number(access.expiresAt || 0),
    role: access.role || "employee",
    permissions: access.permissions || {}
  };
}

async function isStaff(telegramId, env) {
  return (await getStaffSession(telegramId, env)).authorized;
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
