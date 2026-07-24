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

const SKINS = Object.freeze({
  default: Object.freeze({ id: "default", title: "Стандартный" }),
  barista: Object.freeze({ id: "barista", title: "Бариста" }),
  strawberry: Object.freeze({ id: "strawberry", title: "Клубничка" }),
  bee: Object.freeze({ id: "bee", title: "Пчёлка" }),
  sailor: Object.freeze({ id: "sailor", title: "Морячок" }),
  princess: Object.freeze({ id: "princess", title: "Принцесса" }),
  angel: Object.freeze({ id: "angel", title: "Ангелок" })
});

const DEFAULT_SKIN_PRICES = Object.freeze({
  default: Object.freeze({ points: 0, treats: 0, coffee: 0 }),
  barista: Object.freeze({ points: 150000, treats: 0, coffee: 700 }),
  strawberry: Object.freeze({ points: 300000, treats: 700, coffee: 0 }),
  bee: Object.freeze({ points: 600000, treats: 900, coffee: 0 }),
  sailor: Object.freeze({ points: 1200000, treats: 0, coffee: 900 }),
  princess: Object.freeze({ points: 2400000, treats: 1100, coffee: 1100 }),
  angel: Object.freeze({ points: 4800000, treats: 1250, coffee: 1250 })
});

// Уровневые кейсы. Шансы указаны на один слот награды.
const LEVEL_CASE_SCHEDULE = Object.freeze(Object.fromEntries(
  Array.from({ length: 49 }, (_, index) => {
    const level = index + 2;
    const caseType = level % 10 === 0 ? "gold" : level % 5 === 0 ? "sweet" : "small";
    return [level, caseType];
  })
));

const LEVEL_CASE_CONFIG = Object.freeze({
  small: Object.freeze({ id: "small", title: "Маленький кейс", slots: 1 }),
  sweet: Object.freeze({ id: "sweet", title: "Сладкий кейс", slots: 1 }),
  gold: Object.freeze({ id: "gold", title: "Золотой кейс", slots: 1 })
});

const CASE_AVATARS = Object.freeze({
  fox: Object.freeze({ id: "fox", title: "Лисёнок" }),
  corgi: Object.freeze({ id: "corgi", title: "Корги" }),
  bunny: Object.freeze({ id: "bunny", title: "Зайка" }),
  hedgehog: Object.freeze({ id: "hedgehog", title: "Ёжик" }),
  koala: Object.freeze({ id: "koala", title: "Коала" }),
  penguin: Object.freeze({ id: "penguin", title: "Пингвин" }),
  cat: Object.freeze({ id: "cat", title: "Котёнок" }),
  bear: Object.freeze({ id: "bear", title: "Мишка" })
});

const CASE_FRAMES = Object.freeze({
  strawberry: Object.freeze({ id: "strawberry", title: "Клубничная рамка" }),
  coffee: Object.freeze({ id: "coffee", title: "Кофейная рамка" }),
  mint: Object.freeze({ id: "mint", title: "Мятная рамка" }),
  gold: Object.freeze({ id: "gold", title: "Золотая рамка" })
});

const CASE_TRAILS = Object.freeze({
  marshmallow: Object.freeze({ id: "marshmallow", title: "Зефирный след" }),
  coffee: Object.freeze({ id: "coffee", title: "Кофейный след" }),
  strawberry: Object.freeze({ id: "strawberry", title: "Клубничный след" }),
  gold: Object.freeze({ id: "gold", title: "Золотой след" })
});

const CASE_BOOSTER_TYPES = Object.freeze(["points", "treats", "coffee"]);
const CASE_DUPLICATE_COMPENSATION = Object.freeze({ avatar: 500, frame: 1500, trail: 5000 });

const SHOP_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_prices (
  product_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const SKIN_PRICE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS skin_prices (
  skin_id TEXT PRIMARY KEY,
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
const GAME_VERSION = "4.0.13 OPEN BETA";
const GAME_UPDATE_DATE = "24 июля 2026";
const GAME_UPDATE_TITLE = "Премиальные кейсы и одна награда";

// Что произошло с прогрессом в этом релизе:
// "reset" — крупное обновление с обнулением прогресса;
// "keep" — обычное обновление с сохранением прогресса.
const GAME_UPDATE_PROGRESS_MODE = "keep";
const GAME_UPDATE_RESET_REASON = "Прогресс в этом обновлении сохраняется.";

const GAME_UPDATE_NOTES = Object.freeze([
  "Все кейсы получили новые премиальные изображения в закрытом и открытом состоянии.",
  "Маленький, Сладкий и Золотой кейсы теперь дают ровно одну награду.",
  "При открытии запускается одна рулетка с изображениями настоящих игровых наград вместо эмоджи.",
  "Шансы и состав наград каждого типа кейса сохранены.",
  "Сезон завершится 7 августа 2026 года в 12:00 МСК."
]);


// =============================================================
// НАСТРОЙКИ СЕЗОННОГО РЕЙТИНГА.
// Даты можно менять вручную. Они не обязаны совпадать с первым числом месяца.
// Значения Cloudflare env с такими же именами имеют приоритет над константами.
const DEFAULT_SEASON_ID = "sweet-season-1";
const DEFAULT_SEASON_TITLE = "Первый сладкий сезон";
const DEFAULT_SEASON_START_AT = "2026-07-23T15:40:00+03:00";
const DEFAULT_SEASON_END_AT = "2026-08-07T12:00:00+03:00";
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
const DEFAULT_BOT_NEWS_IMAGE_URL = `${DEFAULT_GAME_URL}assets/rating/season-news.png?v=4.0-open-beta`;
const BOT_NEWS_TITLE = "Тестовый сезон завершится 7 августа";
const BOT_NEWS_TEXT = "Первый тестовый сезон Сладкого Забега продлён до 7 августа 2026 года, 12:00 МСК. Успейте проверить рейтинг, итоговые места и выдачу награды за первое место.";
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
  { command: "help_staff", description: "Команды сотрудника" },
  { command: "staff_me", description: "Моя роль и статистика" },
  { command: "member_staff", description: "Все сотрудники и роли" },
  { command: "members", description: "Все игроки и Telegram ID" },
  { command: "add_keys", description: "Выдать кейс игроку" },
  { command: "add_frame", description: "Выдать рамку игроку" },
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
            "/api/admin/shop/prices",
            "/api/admin/skins/prices",
            "/api/admin/cases/grant",
            "/api/cases/state",
            "/api/cases/open",
            "/api/cases/open-granted"
          ]
        });
      }

      if (url.pathname === "/api/shop/config" && request.method === "GET") {
        return await getShopConfig(env);
      }

      if (url.pathname === "/api/skins/config" && request.method === "GET") {
        return await getSkinConfig(env);
      }

      if (url.pathname === "/api/cases/state" && request.method === "POST") {
        return await getLevelCaseState(request, env);
      }

      if (url.pathname === "/api/cases/open" && request.method === "POST") {
        return await openLevelCase(request, env);
      }

      if (url.pathname === "/api/cases/open-granted" && request.method === "POST") {
        return await openGrantedCase(request, env);
      }

      if (url.pathname === "/api/cases/activate" && request.method === "POST") {
        return await activateCaseBooster(request, env);
      }

      if (url.pathname === "/api/cases/equip" && request.method === "POST") {
        return await equipCaseCosmetic(request, env);
      }

      if (url.pathname === "/api/cases/consume-run" && request.method === "POST") {
        return await consumeCaseBoosterRun(request, env);
      }

      if (url.pathname === "/api/admin/shop/prices" && request.method === "POST") {
        return await updateShopPrices(request, env);
      }

      if (url.pathname === "/api/admin/skins/prices" && request.method === "POST") {
        return await updateSkinPrices(request, env);
      }

      if (url.pathname === "/api/admin/cases/grant" && request.method === "POST") {
        return await grantAdminCaseOrFrame(request, env);
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

async function getSkinConfig(env) {
  try {
    requireDatabase(env);
    await ensureSkinPriceSchema(env);
    return jsonResponse({
      ok: true,
      skins: await readSkinPrices(env),
      defaults: DEFAULT_SKIN_PRICES,
      source: "d1"
    });
  } catch (error) {
    console.error("getSkinConfig failed", error);
    return jsonResponse({
      ok: true,
      skins: cloneDefaultSkinPrices(),
      defaults: DEFAULT_SKIN_PRICES,
      source: "fallback"
    });
  }
}

async function updateSkinPrices(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    requireAdminUser(auth.user, env);
    const skins = normalizeSkinPrices(body.skins);
    await ensureSkinPriceSchema(env);
    const now = Math.floor(Date.now() / 1000);
    const updatedBy = String(auth.user.id);
    await env.DB.batch(Object.entries(skins).map(([skinId, price]) => env.DB.prepare(
      `INSERT INTO skin_prices (
        skin_id, points, treats, coffee, version, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(skin_id) DO UPDATE SET
        points = excluded.points,
        treats = excluded.treats,
        coffee = excluded.coffee,
        version = skin_prices.version + 1,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by`
    ).bind(skinId, price.points, price.treats, price.coffee, now, updatedBy)));
    return jsonResponse({ ok: true, skins: await readSkinPrices(env), updatedAt: now * 1000 });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("updateSkinPrices failed", error);
    return jsonResponse({ ok: false, error: "Не удалось сохранить глобальные цены скинов." }, 500);
  }
}

async function ensureSkinPriceSchema(env) {
  await env.DB.prepare(SKIN_PRICE_SCHEMA_SQL).run();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch(Object.entries(DEFAULT_SKIN_PRICES).map(([skinId, price]) => env.DB.prepare(
    `INSERT OR IGNORE INTO skin_prices (
      skin_id, points, treats, coffee, version, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, 1, ?, 'system')`
  ).bind(skinId, price.points, price.treats, price.coffee, now)));
}

async function readSkinPrices(env) {
  const result = await env.DB.prepare(
    `SELECT skin_id, points, treats, coffee FROM skin_prices ORDER BY skin_id ASC`
  ).all();
  const skins = cloneDefaultSkinPrices();
  for (const row of result.results || []) {
    if (!skins[row.skin_id]) continue;
    skins[row.skin_id] = {
      points: safeAdminNumber(row.points),
      treats: safeAdminNumber(row.treats),
      coffee: safeAdminNumber(row.coffee)
    };
  }
  return skins;
}

function cloneDefaultSkinPrices() {
  return Object.fromEntries(Object.entries(DEFAULT_SKIN_PRICES).map(([id, price]) => [id, { ...price }]));
}

function normalizeSkinPrices(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Некорректный список цен скинов.");
  }
  const skins = {};
  for (const skinId of Object.keys(DEFAULT_SKIN_PRICES)) {
    const price = input[skinId];
    if (!price || typeof price !== "object" || Array.isArray(price)) {
      throw new ApiError(400, `Не указаны цены скина ${SKINS[skinId]?.title || skinId}.`);
    }
    skins[skinId] = {
      points: validateAdminNumber(price.points),
      treats: validateAdminNumber(price.treats),
      coffee: validateAdminNumber(price.coffee)
    };
  }
  return skins;
}

async function syncAdminProfile(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const mode = String(body.mode || "read");
    if (mode === "write" || mode === "set") requireAdminUser(auth.user, env);
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
    } else if (mode === "set") {
      const next = normalizeAdminProfile(body.next || current);
      await env.DB.prepare(
        `UPDATE admin_profile_state SET
          wallet = ?,
          best_score = ?,
          treats = ?,
          coffee = ?,
          profile_xp = ?,
          wallet_override = NULL,
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

    let row = await env.DB.prepare(
      `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at,
              wallet_override, pending_wallet, pending_treats, pending_coffee
       FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
    ).bind(telegramId).first();

    const pendingWallet = safeAdminNumber(row?.pending_wallet);
    const pendingTreats = safeAdminNumber(row?.pending_treats);
    const pendingCoffee = safeAdminNumber(row?.pending_coffee);
    const hasWalletOverride = row?.wallet_override != null;
    const authoritativeWallet = hasWalletOverride || pendingWallet > 0;
    const authoritativeTreats = pendingTreats > 0;
    const authoritativeCoffee = pendingCoffee > 0;

    const walletBase = hasWalletOverride
      ? safeAdminNumber(row.wallet_override)
      : Math.max(current.wallet, safeAdminNumber(row?.wallet));
    const walletValue = safeAdminNumber(walletBase + pendingWallet);
    const treatsValue = safeAdminNumber(Math.max(current.treats, safeAdminNumber(row?.treats)) + pendingTreats);
    const coffeeValue = safeAdminNumber(Math.max(current.coffee, safeAdminNumber(row?.coffee)) + pendingCoffee);

    if (hasWalletOverride || pendingWallet > 0 || pendingTreats > 0 || pendingCoffee > 0) {
      await env.DB.prepare(
        `UPDATE admin_profile_state SET
          wallet = ?, treats = ?, coffee = ?,
          wallet_override = NULL,
          pending_wallet = 0, pending_treats = 0, pending_coffee = 0,
          revision = revision + 1,
          updated_at = ?, updated_by = ?
         WHERE telegram_id = ?`
      ).bind(walletValue, treatsValue, coffeeValue, now, telegramId, telegramId).run();
      row = await env.DB.prepare(
        `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at
         FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
      ).bind(telegramId).first();
    }

    return jsonResponse({
      ok: true,
      profile: {
        wallet: hasWalletOverride || pendingWallet > 0 ? walletValue : safeAdminNumber(row?.wallet),
        best: safeAdminNumber(row?.best_score),
        treats: authoritativeTreats ? treatsValue : safeAdminNumber(row?.treats),
        coffee: authoritativeCoffee ? coffeeValue : safeAdminNumber(row?.coffee),
        profileXp: safeAdminNumber(row?.profile_xp),
        authoritativeWallet,
        authoritativeFields: {
          wallet: authoritativeWallet,
          treats: authoritativeTreats,
          coffee: authoritativeCoffee
        },
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
    const caseAvatarId = normalizeCaseCosmeticId("avatar", body.caseAvatarId);
    const caseFrameId = normalizeCaseCosmeticId("frame", body.caseFrameId);
    const season = await ensureSeason(env, now);

    await env.DB.prepare(
      `INSERT INTO leaderboard_entries (
        season_id, telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden, case_avatar_id, case_frame_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(season_id, telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        case_avatar_id = excluded.case_avatar_id,
        case_frame_id = excluded.case_frame_id,
        best_score = excluded.best_score,
        level = excluded.level,
        achieved_at = excluded.achieved_at,
        updated_at = excluded.updated_at,
        hidden = 0`
    ).bind(season.id, telegramId, displayName, username, photoUrl, score, level, now, now, caseAvatarId, caseFrameId).run();

    await env.DB.prepare(
      `INSERT INTO leaderboard_all_time (
        telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden, case_avatar_id, case_frame_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        case_avatar_id = excluded.case_avatar_id,
        case_frame_id = excluded.case_frame_id,
        best_score = excluded.best_score,
        level = excluded.level,
        achieved_at = excluded.achieved_at,
        updated_at = excluded.updated_at,
        hidden = 0`
    ).bind(telegramId, displayName, username, photoUrl, score, level, now, now, caseAvatarId, caseFrameId).run();

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


function normalizeCaseType(value) {
  const raw = String(value || "").trim().toLowerCase();
  const aliases = {
    small: "small", mini: "small", little: "small", "маленький": "small", "малый": "small",
    sweet: "sweet", "сладкий": "sweet", "средний": "sweet",
    gold: "gold", golden: "gold", "золотой": "gold"
  };
  return aliases[raw] || "";
}

function caseGrantId(prefix = "grant") {
  try { return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`; }
  catch { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 16)}`; }
}

async function createGrantedCases(env, telegramId, caseTypeValue, quantityValue, grantedBy, reasonValue) {
  const caseType = normalizeCaseType(caseTypeValue);
  if (!caseType) throw new ApiError(400, "Неизвестный тип кейса.");
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(quantityValue) || 1)));
  const now = Math.floor(Date.now() / 1000);
  const reason = String(reasonValue || "Компенсация").trim().slice(0, 300);
  const statements = Array.from({ length: quantity }, () => env.DB.prepare(
    `INSERT INTO granted_cases (
       id, telegram_id, case_type, status, granted_by, reason, created_at
     ) VALUES (?, ?, ?, 'pending', ?, ?, ?)`
  ).bind(caseGrantId("case"), String(telegramId), caseType, String(grantedBy || "system"), reason, now));
  await env.DB.batch(statements);
  return { caseType, quantity, reason };
}

async function grantFrameToPlayer(env, telegramId, frameIdValue, grantedBy) {
  const frameId = normalizeCaseCosmeticId("frame", frameIdValue);
  if (!frameId) throw new ApiError(400, "Неизвестная рамка.");
  const ensured = await ensureCasePlayerState(env, String(telegramId), {});
  const state = ensured.state;
  const alreadyOwned = state.ownedFrames.includes(frameId);
  if (!alreadyOwned) state.ownedFrames.push(frameId);
  const now = Math.floor(Date.now() / 1000);
  await caseStateUpdateStatement(env, String(telegramId), state, now).run();
  return { frameId, alreadyOwned, title: CASE_FRAMES[frameId]?.title || frameId, grantedBy: String(grantedBy || "system") };
}

function normalizeCaseCosmeticId(kind, value) {
  const id = String(value || "").trim();
  if (!id) return "";
  if (kind === "avatar") return CASE_AVATARS[id] ? id : "";
  if (kind === "frame") return CASE_FRAMES[id] ? id : "";
  if (kind === "trail") return CASE_TRAILS[id] ? id : "";
  return "";
}

function caseParseOwned(raw, catalog) {
  let values = [];
  try { values = JSON.parse(String(raw || "[]")); } catch {}
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || ""))
    .filter((value) => Boolean(catalog[value]))));
}

function caseProfileLevel(totalXpValue) {
  let xp = safeAdminNumber(totalXpValue);
  let level = 1;
  while (level < 50) {
    const needed = 20 + (level - 1) * 10;
    if (xp < needed) break;
    xp -= needed;
    level += 1;
  }
  return level;
}

function caseSecureFloat() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 4294967296;
}

function caseRandomInt(minValue, maxValue) {
  const min = Math.ceil(Number(minValue) || 0);
  const max = Math.floor(Number(maxValue) || min);
  return min + Math.floor(caseSecureFloat() * Math.max(1, max - min + 1));
}

function caseRandomChoice(values) {
  const list = Array.isArray(values) ? values : [];
  return list.length ? list[Math.floor(caseSecureFloat() * list.length)] : null;
}

function caseWeightedKind(caseType) {
  const tables = {
    small: [
      ["treats", 40], ["coffee", 40], ["points", 16], ["booster", 4]
    ],
    sweet: [
      ["treats", 30], ["coffee", 30], ["points", 20], ["booster", 12],
      ["avatar", 5], ["frame", 2], ["trail", 1]
    ],
    gold: [
      ["treats", 25], ["coffee", 25], ["points", 22], ["booster", 15],
      ["avatar", 7], ["frame", 4], ["trail", 2]
    ]
  };
  const table = tables[caseType] || tables.small;
  let roll = caseSecureFloat() * 100;
  for (const [kind, weight] of table) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return table[table.length - 1][0];
}

function caseCurrencyRange(caseType, kind) {
  if (caseType === "gold") {
    if (kind === "points") return [2500, 5000];
    return [40, 70];
  }
  if (caseType === "sweet") {
    if (kind === "points") return [1000, 2500];
    return [20, 40];
  }
  if (kind === "points") return [500, 1000];
  return [10, 20];
}

function caseStateFromRow(row) {
  const activeType = CASE_BOOSTER_TYPES.includes(String(row?.active_booster_type || ""))
    ? String(row.active_booster_type)
    : "";
  const activeRuns = activeType ? Math.max(0, Math.min(2, safeAdminNumber(row?.active_booster_runs))) : 0;
  const ownedAvatars = caseParseOwned(row?.owned_avatars_json, CASE_AVATARS);
  const ownedFrames = caseParseOwned(row?.owned_frames_json, CASE_FRAMES);
  const ownedTrails = caseParseOwned(row?.owned_trails_json, CASE_TRAILS);
  const activeAvatarId = ownedAvatars.includes(String(row?.active_avatar_id || "")) ? String(row.active_avatar_id) : "";
  const activeFrameId = ownedFrames.includes(String(row?.active_frame_id || "")) ? String(row.active_frame_id) : "";
  const activeTrailId = ownedTrails.includes(String(row?.active_trail_id || "")) ? String(row.active_trail_id) : "";
  return {
    boosters: {
      points: safeAdminNumber(row?.boosters_points),
      treats: safeAdminNumber(row?.boosters_treats),
      coffee: safeAdminNumber(row?.boosters_coffee)
    },
    activeBooster: { type: activeType, runsLeft: activeRuns },
    ownedAvatars,
    activeAvatarId,
    ownedFrames,
    activeFrameId,
    ownedTrails,
    activeTrailId,
    revision: safeAdminNumber(row?.revision),
    updatedAt: safeAdminNumber(row?.updated_at) * 1000
  };
}

function caseStateUpdateStatement(env, telegramId, caseState, now) {
  return env.DB.prepare(
    `UPDATE case_player_state SET
      boosters_points = ?, boosters_treats = ?, boosters_coffee = ?,
      active_booster_type = ?, active_booster_runs = ?,
      owned_avatars_json = ?, active_avatar_id = ?,
      owned_frames_json = ?, active_frame_id = ?,
      owned_trails_json = ?, active_trail_id = ?,
      revision = revision + 1, updated_at = ?
     WHERE telegram_id = ?`
  ).bind(
    safeAdminNumber(caseState.boosters.points),
    safeAdminNumber(caseState.boosters.treats),
    safeAdminNumber(caseState.boosters.coffee),
    String(caseState.activeBooster.type || ""),
    safeAdminNumber(caseState.activeBooster.runsLeft),
    JSON.stringify(caseState.ownedAvatars),
    String(caseState.activeAvatarId || ""),
    JSON.stringify(caseState.ownedFrames),
    String(caseState.activeFrameId || ""),
    JSON.stringify(caseState.ownedTrails),
    String(caseState.activeTrailId || ""),
    now,
    telegramId
  );
}

async function ensureCasePlayerState(env, telegramId, currentProfile) {
  const now = Math.floor(Date.now() / 1000);
  const current = normalizeAdminProfile(currentProfile || {});
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO admin_profile_state (
        telegram_id, wallet, best_score, treats, coffee, profile_xp,
        revision, created_at, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).bind(telegramId, current.wallet, current.best, current.treats, current.coffee, current.profileXp, now, now, telegramId),
    env.DB.prepare(
      `INSERT OR IGNORE INTO case_player_state (
        telegram_id, created_at, updated_at
      ) VALUES (?, ?, ?)`
    ).bind(telegramId, now, now)
  ]);
  const profile = await env.DB.prepare(
    `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at
     FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(telegramId).first();
  const row = await env.DB.prepare(
    `SELECT * FROM case_player_state WHERE telegram_id = ? LIMIT 1`
  ).bind(telegramId).first();
  return { now, profile, row, state: caseStateFromRow(row) };
}

async function buildCasePayload(env, telegramId, currentProfile, extra = {}) {
  const ensured = await ensureCasePlayerState(env, telegramId, currentProfile);
  const [openingsResult, giftedResult] = await Promise.all([
    env.DB.prepare(
      `SELECT level, case_type, rewards_json, opened_at
       FROM level_case_openings WHERE telegram_id = ? ORDER BY level ASC`
    ).bind(telegramId).all(),
    env.DB.prepare(
      `SELECT case_type, COUNT(*) AS count FROM granted_cases
       WHERE telegram_id = ? AND status = 'pending' GROUP BY case_type`
    ).bind(telegramId).all()
  ]);
  const openedCases = (openingsResult.results || []).map((row) => {
    let rewards = [];
    try { rewards = JSON.parse(String(row.rewards_json || "[]")); } catch {}
    return {
      level: Number(row.level || 0),
      caseType: String(row.case_type || "small"),
      rewards: Array.isArray(rewards) ? rewards : [],
      openedAt: Number(row.opened_at || 0) * 1000
    };
  });
  const openedLevels = openedCases.map((entry) => entry.level);
  const giftedCases = { small: 0, sweet: 0, gold: 0 };
  for (const row of giftedResult.results || []) {
    const type = normalizeCaseType(row.case_type);
    if (type) giftedCases[type] = safeAdminNumber(row.count);
  }
  const current = normalizeAdminProfile(currentProfile || {});
  const playerLevel = caseProfileLevel(Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp)));
  const eligibleCases = Object.entries(LEVEL_CASE_SCHEDULE)
    .map(([level, caseType]) => ({
      level: Number(level),
      caseType,
      title: LEVEL_CASE_CONFIG[caseType]?.title || "Кейс"
    }))
    .filter((entry) => entry.level <= playerLevel && !openedLevels.includes(entry.level));
  return {
    ok: true,
    profileLevel: playerLevel,
    schedule: Object.entries(LEVEL_CASE_SCHEDULE).map(([level, caseType]) => ({
      level: Number(level),
      caseType,
      title: LEVEL_CASE_CONFIG[caseType]?.title || "Кейс"
    })),
    eligibleCases,
    openedLevels,
    openedCases,
    giftedCases,
    caseState: ensured.state,
    profile: {
      wallet: safeAdminNumber(ensured.profile?.wallet),
      best: safeAdminNumber(ensured.profile?.best_score),
      treats: safeAdminNumber(ensured.profile?.treats),
      coffee: safeAdminNumber(ensured.profile?.coffee),
      profileXp: safeAdminNumber(ensured.profile?.profile_xp)
    },
    ...extra
  };
}

function rollLevelCase(caseType, sourceState) {
  const config = LEVEL_CASE_CONFIG[caseType] || LEVEL_CASE_CONFIG.small;
  const state = JSON.parse(JSON.stringify(sourceState));
  const rewards = [];
  const selectedCosmetics = new Set();
  let points = 0;
  let treats = 0;
  let coffee = 0;

  const addCosmetic = (kind, catalog, ownedKey, compensation) => {
    const available = Object.keys(catalog).filter((id) => !selectedCosmetics.has(`${kind}:${id}`));
    const id = caseRandomChoice(available.length ? available : Object.keys(catalog));
    if (!id) return;
    selectedCosmetics.add(`${kind}:${id}`);
    const item = catalog[id];
    const owned = state[ownedKey].includes(id);
    if (owned) {
      points += compensation;
      rewards.push({
        kind,
        id,
        title: item.title,
        duplicate: true,
        compensationPoints: compensation
      });
    } else {
      state[ownedKey].push(id);
      rewards.push({ kind, id, title: item.title, duplicate: false });
    }
  };

  for (let slot = 0; slot < config.slots; slot += 1) {
    const kind = caseWeightedKind(caseType);
    if (kind === "points" || kind === "treats" || kind === "coffee") {
      const [min, max] = caseCurrencyRange(caseType, kind);
      const amount = caseRandomInt(min, max);
      if (kind === "points") points += amount;
      if (kind === "treats") treats += amount;
      if (kind === "coffee") coffee += amount;
      rewards.push({ kind, amount });
      continue;
    }
    if (kind === "booster") {
      const boosterType = caseRandomChoice(CASE_BOOSTER_TYPES) || "points";
      state.boosters[boosterType] = safeAdminNumber(state.boosters[boosterType] + 1);
      rewards.push({ kind: "booster", boosterType, amount: 1, runs: 2 });
      continue;
    }
    if (kind === "avatar") {
      addCosmetic("avatar", CASE_AVATARS, "ownedAvatars", CASE_DUPLICATE_COMPENSATION.avatar);
      continue;
    }
    if (kind === "frame") {
      addCosmetic("frame", CASE_FRAMES, "ownedFrames", CASE_DUPLICATE_COMPENSATION.frame);
      continue;
    }
    if (kind === "trail") {
      addCosmetic("trail", CASE_TRAILS, "ownedTrails", CASE_DUPLICATE_COMPENSATION.trail);
    }
  }

  return { rewards, state, points, treats, coffee };
}

async function getLevelCaseState(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    return jsonResponse(await buildCasePayload(env, String(auth.user.id), body.current || {}));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("getLevelCaseState failed", error);
    return jsonResponse({ ok: false, error: "Не удалось загрузить кейсы. Проверьте миграцию 0010." }, 500);
  }
}

async function openLevelCase(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const requestedLevel = Math.floor(Number(body.level || 0));
    const caseType = LEVEL_CASE_SCHEDULE[requestedLevel];
    if (!caseType) throw new ApiError(400, "На этом уровне кейс не выдаётся.");
    const current = normalizeAdminProfile(body.current || {});
    const ensured = await ensureCasePlayerState(env, telegramId, current);
    const playerLevel = caseProfileLevel(Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp)));
    if (playerLevel < requestedLevel) throw new ApiError(403, `Кейс откроется на ${requestedLevel} уровне.`);
    const existing = await env.DB.prepare(
      `SELECT level FROM level_case_openings WHERE telegram_id = ? AND level = ? LIMIT 1`
    ).bind(telegramId, requestedLevel).first();
    if (existing) throw new ApiError(409, "Этот кейс уже открыт.");

    const rolled = rollLevelCase(caseType, ensured.state);
    const baseProfile = {
      wallet: Math.max(current.wallet, safeAdminNumber(ensured.profile?.wallet)),
      best: Math.max(current.best, safeAdminNumber(ensured.profile?.best_score)),
      treats: Math.max(current.treats, safeAdminNumber(ensured.profile?.treats)),
      coffee: Math.max(current.coffee, safeAdminNumber(ensured.profile?.coffee)),
      profileXp: Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp))
    };
    const now = Math.floor(Date.now() / 1000);
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO level_case_openings (telegram_id, level, case_type, rewards_json, opened_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(telegramId, requestedLevel, caseType, JSON.stringify(rolled.rewards), now),
        env.DB.prepare(
          `UPDATE admin_profile_state SET
            wallet = ?, best_score = ?, treats = ?, coffee = ?, profile_xp = ?,
            revision = revision + 1, updated_at = ?, updated_by = ?
           WHERE telegram_id = ?`
        ).bind(
          safeAdminNumber(baseProfile.wallet + rolled.points),
          baseProfile.best,
          safeAdminNumber(baseProfile.treats + rolled.treats),
          safeAdminNumber(baseProfile.coffee + rolled.coffee),
          baseProfile.profileXp,
          now,
          `case:${requestedLevel}`,
          telegramId
        ),
        caseStateUpdateStatement(env, telegramId, rolled.state, now)
      ]);
    } catch (error) {
      if (String(error?.message || error).toLowerCase().includes("unique")) {
        throw new ApiError(409, "Этот кейс уже открыт.");
      }
      throw error;
    }
    return jsonResponse(await buildCasePayload(env, telegramId, body.current || {}, {
      opened: {
        level: requestedLevel,
        caseType,
        title: LEVEL_CASE_CONFIG[caseType]?.title || "Кейс",
        rewards: rolled.rewards
      }
    }));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("openLevelCase failed", error);
    return jsonResponse({ ok: false, error: "Не удалось открыть кейс. Проверьте миграцию 0010." }, 500);
  }
}

async function openGrantedCase(request, env) {
  let claimedId = "";
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const caseType = normalizeCaseType(body.caseType);
    if (!caseType) throw new ApiError(400, "Неизвестный тип кейса.");
    const current = normalizeAdminProfile(body.current || {});
    const ensured = await ensureCasePlayerState(env, telegramId, current);
    const gift = await env.DB.prepare(
      `SELECT id FROM granted_cases WHERE telegram_id = ? AND case_type = ? AND status = 'pending'
       ORDER BY created_at ASC, id ASC LIMIT 1`
    ).bind(telegramId, caseType).first();
    if (!gift?.id) throw new ApiError(409, "Подарочных кейсов этого типа нет.");
    claimedId = String(gift.id);
    const claim = await env.DB.prepare(
      `UPDATE granted_cases SET status = 'opening' WHERE id = ? AND telegram_id = ? AND status = 'pending'`
    ).bind(claimedId, telegramId).run();
    if (Number(claim?.meta?.changes || 0) < 1) throw new ApiError(409, "Этот кейс уже открывается.");

    const rolled = rollLevelCase(caseType, ensured.state);
    const baseProfile = {
      wallet: Math.max(current.wallet, safeAdminNumber(ensured.profile?.wallet)),
      best: Math.max(current.best, safeAdminNumber(ensured.profile?.best_score)),
      treats: Math.max(current.treats, safeAdminNumber(ensured.profile?.treats)),
      coffee: Math.max(current.coffee, safeAdminNumber(ensured.profile?.coffee)),
      profileXp: Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp))
    };
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE admin_profile_state SET
          wallet = ?, best_score = ?, treats = ?, coffee = ?, profile_xp = ?,
          revision = revision + 1, updated_at = ?, updated_by = ?
         WHERE telegram_id = ?`
      ).bind(
        safeAdminNumber(baseProfile.wallet + rolled.points), baseProfile.best,
        safeAdminNumber(baseProfile.treats + rolled.treats), safeAdminNumber(baseProfile.coffee + rolled.coffee),
        baseProfile.profileXp, now, `gift-case:${caseType}`, telegramId
      ),
      caseStateUpdateStatement(env, telegramId, rolled.state, now),
      env.DB.prepare(
        `UPDATE granted_cases SET status = 'opened', rewards_json = ?, opened_at = ?
         WHERE id = ? AND telegram_id = ? AND status = 'opening'`
      ).bind(JSON.stringify(rolled.rewards), now, claimedId, telegramId)
    ]);
    return jsonResponse(await buildCasePayload(env, telegramId, body.current || {}, {
      opened: {
        grantId: claimedId,
        source: "gift",
        caseType,
        title: LEVEL_CASE_CONFIG[caseType]?.title || "Кейс",
        rewards: rolled.rewards
      }
    }));
  } catch (error) {
    if (claimedId) {
      try { await env.DB.prepare(`UPDATE granted_cases SET status = 'pending' WHERE id = ? AND status = 'opening'`).bind(claimedId).run(); } catch {}
    }
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("openGrantedCase failed", error);
    return jsonResponse({ ok: false, error: "Не удалось открыть подарочный кейс. Проверьте миграцию 0011." }, 500);
  }
}

async function grantAdminCaseOrFrame(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    requireAdminUser(auth.user, env);
    const targetTelegramId = String(body.targetTelegramId || auth.user.id || "").trim();
    if (!/^\d{4,20}$/.test(targetTelegramId)) throw new ApiError(400, "Некорректный Telegram ID игрока.");
    const grantKind = String(body.grantKind || "case").trim().toLowerCase();
    const reason = String(body.reason || "Компенсация из админ-панели").trim().slice(0, 300);
    if (grantKind === "case") {
      const result = await createGrantedCases(env, targetTelegramId, body.caseType, body.quantity, String(auth.user.id), reason);
      return jsonResponse({ ok: true, grantKind, targetTelegramId, ...result });
    }
    if (grantKind === "frame") {
      const result = await grantFrameToPlayer(env, targetTelegramId, body.frameId, String(auth.user.id));
      return jsonResponse({ ok: true, grantKind, targetTelegramId, reason, ...result });
    }
    throw new ApiError(400, "Неизвестный вид компенсации.");
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("grantAdminCaseOrFrame failed", error);
    return jsonResponse({ ok: false, error: "Не удалось выдать компенсацию. Проверьте миграцию 0011." }, 500);
  }
}

async function activateCaseBooster(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const boosterType = String(body.boosterType || "");
    if (!CASE_BOOSTER_TYPES.includes(boosterType)) throw new ApiError(400, "Неизвестный усилитель.");
    const ensured = await ensureCasePlayerState(env, telegramId, body.current || {});
    const state = ensured.state;
    if (state.activeBooster.type && state.activeBooster.runsLeft > 0) {
      throw new ApiError(409, "Сначала завершите забеги с уже активным усилителем.");
    }
    if (safeAdminNumber(state.boosters[boosterType]) <= 0) throw new ApiError(409, "Такого усилителя нет в коллекции.");
    state.boosters[boosterType] = safeAdminNumber(state.boosters[boosterType] - 1);
    state.activeBooster = { type: boosterType, runsLeft: 2 };
    await caseStateUpdateStatement(env, telegramId, state, Math.floor(Date.now() / 1000)).run();
    return jsonResponse(await buildCasePayload(env, telegramId, body.current || {}));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("activateCaseBooster failed", error);
    return jsonResponse({ ok: false, error: "Не удалось активировать усилитель." }, 500);
  }
}

async function equipCaseCosmetic(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const kind = String(body.kind || "");
    const requestedId = String(body.id || "").trim();
    if (!["avatar", "frame", "trail"].includes(kind)) throw new ApiError(400, "Неизвестный вид косметики.");
    const id = requestedId ? normalizeCaseCosmeticId(kind, requestedId) : "";
    if (requestedId && !id) throw new ApiError(400, "Неизвестный косметический предмет.");
    const ensured = await ensureCasePlayerState(env, telegramId, body.current || {});
    const state = ensured.state;
    if (kind === "avatar") {
      if (id && !state.ownedAvatars.includes(id)) throw new ApiError(403, "Эта аватарка ещё не получена.");
      state.activeAvatarId = id;
    } else if (kind === "frame") {
      if (id && !state.ownedFrames.includes(id)) throw new ApiError(403, "Эта рамка ещё не получена.");
      state.activeFrameId = id;
    } else {
      if (id && !state.ownedTrails.includes(id)) throw new ApiError(403, "Этот след ещё не получен.");
      state.activeTrailId = id;
    }
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch([
      caseStateUpdateStatement(env, telegramId, state, now),
      env.DB.prepare(
        `UPDATE leaderboard_entries SET case_avatar_id = ?, case_frame_id = ?, updated_at = ?
         WHERE telegram_id = ?`
      ).bind(state.activeAvatarId, state.activeFrameId, now, telegramId),
      env.DB.prepare(
        `UPDATE leaderboard_all_time SET case_avatar_id = ?, case_frame_id = ?, updated_at = ?
         WHERE telegram_id = ?`
      ).bind(state.activeAvatarId, state.activeFrameId, now, telegramId)
    ]);
    return jsonResponse(await buildCasePayload(env, telegramId, body.current || {}));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("equipCaseCosmetic failed", error);
    return jsonResponse({ ok: false, error: "Не удалось выбрать косметический предмет." }, 500);
  }
}

async function consumeCaseBoosterRun(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const runId = String(body.runId || "").trim();
    if (!/^[A-Za-z0-9_-]{12,96}$/.test(runId)) throw new ApiError(400, "Некорректный идентификатор забега.");
    const ensured = await ensureCasePlayerState(env, telegramId, body.current || {});
    const existing = await env.DB.prepare(
      `SELECT run_id FROM case_booster_run_consumptions WHERE run_id = ? LIMIT 1`
    ).bind(runId).first();
    if (!existing) {
      const state = ensured.state;
      const consumedType = state.activeBooster.type && state.activeBooster.runsLeft > 0
        ? state.activeBooster.type
        : "";
      if (consumedType) {
        state.activeBooster.runsLeft = Math.max(0, state.activeBooster.runsLeft - 1);
        if (state.activeBooster.runsLeft <= 0) state.activeBooster = { type: "", runsLeft: 0 };
      }
      const now = Math.floor(Date.now() / 1000);
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO case_booster_run_consumptions (run_id, telegram_id, booster_type, consumed_at)
           VALUES (?, ?, ?, ?)`
        ).bind(runId, telegramId, consumedType, now),
        caseStateUpdateStatement(env, telegramId, state, now)
      ]);
    }
    return jsonResponse(await buildCasePayload(env, telegramId, body.current || {}));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("consumeCaseBoosterRun failed", error);
    return jsonResponse({ ok: false, error: "Не удалось сохранить использование усилителя." }, 500);
  }
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
    const caseAvatarId = normalizeCaseCosmeticId("avatar", body.caseAvatarId);
    const caseFrameId = normalizeCaseCosmeticId("frame", body.caseFrameId);

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
        best_score, level, achieved_at, updated_at, hidden, case_avatar_id, case_frame_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(season_id, telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        case_avatar_id = excluded.case_avatar_id,
        case_frame_id = excluded.case_frame_id,
        level = excluded.level,
        best_score = CASE WHEN excluded.best_score > leaderboard_entries.best_score THEN excluded.best_score ELSE leaderboard_entries.best_score END,
        achieved_at = CASE WHEN excluded.best_score > leaderboard_entries.best_score THEN excluded.achieved_at ELSE leaderboard_entries.achieved_at END,
        updated_at = excluded.updated_at`
    ).bind(season.id, telegramId, displayName, username, photoUrl, score, level, now, now, caseAvatarId, caseFrameId).run();

    await env.DB.prepare(
      `INSERT INTO leaderboard_all_time (
        telegram_id, display_name, username, photo_url,
        best_score, level, achieved_at, updated_at, hidden, case_avatar_id, case_frame_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(telegram_id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        photo_url = excluded.photo_url,
        case_avatar_id = excluded.case_avatar_id,
        case_frame_id = excluded.case_frame_id,
        level = excluded.level,
        best_score = CASE WHEN excluded.best_score > leaderboard_all_time.best_score THEN excluded.best_score ELSE leaderboard_all_time.best_score END,
        achieved_at = CASE WHEN excluded.best_score > leaderboard_all_time.best_score THEN excluded.achieved_at ELSE leaderboard_all_time.achieved_at END,
        updated_at = excluded.updated_at`
    ).bind(telegramId, displayName, username, photoUrl, score, level, now, now, caseAvatarId, caseFrameId).run();

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
  const query = `SELECT telegram_id, display_name, username, photo_url, best_score, level, achieved_at,
                        case_avatar_id, case_frame_id
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
    caseAvatarId: normalizeCaseCosmeticId("avatar", row.case_avatar_id),
    caseFrameId: normalizeCaseCosmeticId("frame", row.case_frame_id),
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

  if (/^\/help_staff(?:@\w+)?$/i.test(text)) {
    await showStaffHelp(chatId, user, env);
    return;
  }

  if (/^\/staff_me(?:@\w+)?$/i.test(text)) {
    await showStaffProfile(chatId, user, env);
    return;
  }

  if (/^\/staff_list(?:@\w+)?$/i.test(text)) {
    await showTeamManagement(chatId, user, env);
    return;
  }

  if (/^\/member_staff(?:@\w+)?$/i.test(text)) {
    await showStaffMembers(chatId, user, env);
    return;
  }

  if (/^\/members(?:@\w+)?$/i.test(text)) {
    await showPlayerMembers(chatId, user, env);
    return;
  }

  const rankMatch = text.match(/^\/rang_staff_(kassir|povar|administrator)(?:@\w+)?\s+(\d{4,20})$/i);
  if (rankMatch) {
    const role = rankMatch[1].toLowerCase() === "kassir"
      ? "cashier"
      : rankMatch[1].toLowerCase() === "povar"
        ? "cook"
        : "administrator";
    await setTeamRole(chatId, user, rankMatch[2], role, env);
    return;
  }

  const checkCodeMatch = text.match(/^\/check_code(?:@\w+)?\s+(.+)$/i);
  if (checkCodeMatch) {
    await showRewardInBot(chatId, user, checkCodeMatch[1], env, { viewOnly: true });
    return;
  }

  const redeemCodeMatch = text.match(/^\/redeem(?:@\w+)?\s+(.+)$/i);
  if (redeemCodeMatch) {
    await showRewardInBot(chatId, user, redeemCodeMatch[1], env, { forceRedeem: true });
    return;
  }

  if (/^\/pending_orders(?:@\w+)?$/i.test(text)) {
    await showPendingOrders(chatId, user, env);
    return;
  }

  if (/^\/my_redemptions(?:@\w+)?$/i.test(text)) {
    await showMyRedemptions(chatId, user, env);
    return;
  }

  if (/^\/redemptions_today(?:@\w+)?$/i.test(text)) {
    await showRedemptionsToday(chatId, user, env);
    return;
  }

  const playerMatch = text.match(/^\/player(?:@\w+)?\s+(\d{4,20})$/i);
  if (playerMatch) {
    await showPlayerProfile(chatId, user, playerMatch[1], env);
    return;
  }

  const currencyAddMatch = text.match(/^\/add_(zefir|coffee|points)(?:@\w+)?\s+(\d{1,9})\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  if (currencyAddMatch) {
    await addPlayerCurrency(chatId, user, currencyAddMatch[1].toLowerCase(), Number(currencyAddMatch[2]), currencyAddMatch[3], String(currencyAddMatch[4] || "Компенсация").trim(), env);
    return;
  }

  const addKeysWithCountMatch = text.match(/^\/add_keys(?:@\w+)?\s+(small|sweet|gold|маленький|малый|сладкий|золотой)\s+(\d{1,2})\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  const addKeysSingleMatch = text.match(/^\/add_keys(?:@\w+)?\s+(small|sweet|gold|маленький|малый|сладкий|золотой)\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  if (addKeysWithCountMatch || addKeysSingleMatch) {
    const match = addKeysWithCountMatch || addKeysSingleMatch;
    const hasCount = Boolean(addKeysWithCountMatch);
    await addPlayerCases(
      chatId, user, match[1], hasCount ? Number(match[2]) : 1,
      hasCount ? match[3] : match[2],
      String(hasCount ? match[4] || "Компенсация" : match[3] || "Компенсация").trim(), env
    );
    return;
  }

  const addFrameMatch = text.match(/^\/add_frame(?:@\w+)?\s+(strawberry|coffee|mint|gold|клубничная|кофейная|мятная|золотая)\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  if (addFrameMatch) {
    await addPlayerFrame(chatId, user, addFrameMatch[1], addFrameMatch[2], String(addFrameMatch[3] || "Компенсация").trim(), env);
    return;
  }

  const staffLogMatch = text.match(/^\/staff_log(?:@\w+)?(?:\s+(\d{1,2}))?$/i);
  if (staffLogMatch) {
    await showStaffAuditLog(chatId, user, Number(staffLogMatch[1] || 10), env);
    return;
  }

  const staffEnableMatch = text.match(/^\/staff_(enable|disable|remove)(?:@\w+)?\s+(\d{4,20})$/i);
  if (staffEnableMatch) {
    const action = staffEnableMatch[1].toLowerCase();
    if (action === "enable") await setStaffEnabled(chatId, user, staffEnableMatch[2], true, env);
    else await removeTeamMember(chatId, user, staffEnableMatch[2], env);
    return;
  }

  if (/^\/team(?:@\w+)?$/i.test(text)) {
    await showTeamManagement(chatId, user, env);
    return;
  }

  const teamAddMatch = text.match(/^\/team_add(?:@\w+)?\s+(\d{4,20})(?:\s+(employee|manager|admin|cashier|cook|administrator|kassir|povar))?$/i);
  if (teamAddMatch) {
    await addTeamMember(chatId, user, teamAddMatch[1], teamAddMatch[2] || "employee", env);
    return;
  }

  const teamRemoveMatch = text.match(/^\/team_remove(?:@\w+)?\s+(\d{4,20})$/i);
  if (teamRemoveMatch) {
    await removeTeamMember(chatId, user, teamRemoveMatch[1], env);
    return;
  }

  const teamRoleMatch = text.match(/^\/team_role(?:@\w+)?\s+(\d{4,20})\s+(employee|manager|admin|cashier|cook|administrator|kassir|povar)$/i);
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
  cashier: Object.freeze({ redeem: 1, points: 0, products: 0, news: 0, staff: 0 }),
  cook: Object.freeze({ redeem: 0, points: 0, products: 0, news: 0, staff: 0 }),
  administrator: Object.freeze({ redeem: 1, points: 1, products: 1, news: 1, staff: 1 })
});

const TEAM_ROLE_ALIASES = Object.freeze({
  cashier: "cashier",
  kassir: "cashier",
  employee: "cashier",
  cook: "cook",
  povar: "cook",
  manager: "administrator",
  admin: "administrator",
  administrator: "administrator"
});

const TEAM_PERMISSION_COLUMNS = Object.freeze({
  redeem: "can_redeem_rewards",
  points: "can_adjust_points",
  products: "can_manage_products",
  news: "can_publish_news",
  staff: "can_manage_staff"
});

function normalizeTeamRole(value) {
  const role = String(value || "cashier").toLowerCase();
  return TEAM_ROLE_ALIASES[role] || "cashier";
}

function teamRoleLabel(role) {
  const normalized = normalizeTeamRole(role);
  if (normalized === "administrator") return "Администратор";
  if (normalized === "cook") return "Повар";
  return "Кассир";
}

function permissionLabel(permission) {
  return ({
    view: "просмотр заказов",
    redeem: "выдача товаров",
    points: "изменение баланса игроков",
    products: "управление товарами",
    news: "публикация новостей",
    staff: "управление командой",
    log: "просмотр журнала"
  })[permission] || permission;
}

async function getTeamAccess(user, env) {
  if (isBotAdminUser(user, env)) {
    return { authorized: true, owner: true, role: "owner", permissions: { view: true, redeem: true, points: true, products: true, news: true, staff: true, log: true } };
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
      view: true,
      redeem: Number(row.can_redeem_rewards || 0) === 1,
      points: Number(row.can_adjust_points || 0) === 1,
      products: Number(row.can_manage_products || 0) === 1,
      news: Number(row.can_publish_news || 0) === 1,
      staff: Number(row.can_manage_staff || 0) === 1,
      log: Number(row.can_manage_staff || 0) === 1
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

async function sendTelegramListChunks(env, chatId, title, entries, emptyText = "Список пуст.") {
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!safeEntries.length) {
    await sendTelegramMessage(env, chatId, `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(emptyText)}`);
    return;
  }

  const maxBodyLength = 3300;
  const chunks = [];
  let current = "";
  for (const entry of safeEntries) {
    const next = current ? `${current}\n\n${entry}` : entry;
    if (next.length > maxBodyLength && current) {
      chunks.push(current);
      current = entry;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);

  for (let index = 0; index < chunks.length; index += 1) {
    const page = chunks.length > 1 ? ` · ${index + 1}/${chunks.length}` : "";
    await sendTelegramMessage(env, chatId, `<b>${escapeHtml(title)}${page}</b>\n\n${chunks[index]}`);
  }
}

async function showStaffMembers(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "staff", env);
  if (!access) return;

  const result = await env.DB.prepare(
    `SELECT telegram_id, display_name, role, active, session_expires_at
     FROM staff_users
     ORDER BY active DESC,
              CASE role WHEN 'administrator' THEN 1 WHEN 'cashier' THEN 2 WHEN 'cook' THEN 3 ELSE 4 END,
              display_name ASC,
              telegram_id ASC`
  ).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  const now = Math.floor(Date.now() / 1000);
  const entries = rows.map((row, index) => {
    const active = Number(row.active || 0) === 1;
    const sessionActive = Number(row.session_expires_at || 0) > now;
    const status = active ? (sessionActive ? "активен · сессия открыта" : "активен · требуется /staff") : "отключён";
    return `${index + 1}. <b>${escapeHtml(row.display_name || "Без имени")}</b>\nРоль: ${escapeHtml(teamRoleLabel(row.role))}\nTelegram ID: <code>${escapeHtml(String(row.telegram_id || ""))}</code>\nСтатус: ${escapeHtml(status)}`;
  });

  await logStaffAction(env, user, access, "view_staff_members", null, "staff", null, null, { count: rows.length });
  await sendTelegramListChunks(env, chatId, `Сотрудники: ${rows.length}`, entries, "Сотрудники пока не добавлены.");
}

async function showPlayerMembers(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;

  const [profilesResult, ratingResult] = await Promise.all([
    env.DB.prepare(
      `SELECT telegram_id, wallet, best_score, treats, coffee, profile_xp, updated_at
       FROM admin_profile_state
       ORDER BY updated_at DESC`
    ).all(),
    env.DB.prepare(
      `SELECT telegram_id, display_name, username, best_score, level, updated_at
       FROM leaderboard_all_time
       ORDER BY updated_at DESC`
    ).all()
  ]);

  const players = new Map();
  for (const row of Array.isArray(profilesResult.results) ? profilesResult.results : []) {
    const telegramId = String(row.telegram_id || "").trim();
    if (!telegramId) continue;
    players.set(telegramId, {
      telegramId,
      displayName: "",
      username: "",
      bestScore: Number(row.best_score || 0),
      level: profileLevelFromXp(Number(row.profile_xp || 0)),
      updatedAt: Number(row.updated_at || 0)
    });
  }

  for (const row of Array.isArray(ratingResult.results) ? ratingResult.results : []) {
    const telegramId = String(row.telegram_id || "").trim();
    if (!telegramId) continue;
    const current = players.get(telegramId) || {
      telegramId,
      displayName: "",
      username: "",
      bestScore: 0,
      level: 1,
      updatedAt: 0
    };
    current.displayName = String(row.display_name || current.displayName || "").trim();
    current.username = String(row.username || current.username || "").trim().replace(/^@/, "");
    current.bestScore = Math.max(Number(current.bestScore || 0), Number(row.best_score || 0));
    current.level = Math.max(Number(current.level || 1), Number(row.level || 1));
    current.updatedAt = Math.max(Number(current.updatedAt || 0), Number(row.updated_at || 0));
    players.set(telegramId, current);
  }

  const rows = [...players.values()].sort((left, right) => {
    const recent = Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
    if (recent) return recent;
    return String(left.displayName || left.telegramId).localeCompare(String(right.displayName || right.telegramId), "ru");
  });

  const entries = rows.map((row, index) => {
    const name = row.displayName || "Игрок без имени";
    const username = row.username ? ` · @${escapeHtml(row.username)}` : "";
    const activity = row.updatedAt ? formatUtcDate(row.updatedAt) : "нет данных";
    return `${index + 1}. <b>${escapeHtml(name)}</b>${username}\nTelegram ID: <code>${escapeHtml(row.telegramId)}</code>\nРекорд: ${Math.max(0, Math.floor(Number(row.bestScore || 0)))} · Уровень: ${Math.max(1, Math.floor(Number(row.level || 1)))}\nПоследняя активность: ${escapeHtml(activity)}`;
  });

  await logStaffAction(env, user, access, "view_player_members", null, "player", null, null, { count: rows.length });
  await sendTelegramListChunks(env, chatId, `Игроки: ${rows.length}`, entries, "Игроки ещё не синхронизировали профили.");
}

function profileLevelFromXp(profileXp) {
  const xp = Math.max(0, Math.floor(Number(profileXp || 0)));
  let level = 1;
  let remaining = xp;
  while (level < 50) {
    const needed = 20 + (level - 1) * 10;
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }
  return level;
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
      "просмотр",
      Number(row.can_redeem_rewards) ? "выдача" : null,
      Number(row.can_adjust_points) ? "баланс" : null,
      Number(row.can_manage_products) ? "каталог" : null,
      Number(row.can_publish_news) ? "новости" : null,
      Number(row.can_manage_staff) ? "команда" : null
    ].filter(Boolean).join(", ");
    const session = Number(row.session_expires_at || 0) > now ? "сессия активна" : "нужен вход";
    return `• <code>${escapeHtml(String(row.telegram_id))}</code> — ${escapeHtml(row.display_name || "Без имени")}\n  ${escapeHtml(teamRoleLabel(row.role))} · ${Number(row.active) ? session : "отключён"}\n  Права: ${escapeHtml(permissions)}`;
  }).join("\n\n") : "Сотрудники пока не добавлены.";
  const adminHint = access.owner
    ? `<b>Назначение ролей</b>\n<code>/rang_staff_kassir ID</code>\n<code>/rang_staff_povar ID</code>\n<code>/rang_staff_administrator ID</code>`
    : `<b>Назначение ролей</b>\n<code>/rang_staff_kassir ID</code>\n<code>/rang_staff_povar ID</code>`;
  await sendTelegramMessage(env, chatId, `<b>Команда и разрешения</b>\n\n${list}\n\n${adminHint}\n\n<code>/staff_disable ID</code> — отключить сотрудника\n<code>/staff_enable ID</code> — включить сотрудника\n<code>/help_staff</code> — все доступные команды.`);
}

function canAssignTeamRole(access, role) {
  if (access?.owner) return true;
  return normalizeTeamRole(role) !== "administrator";
}

async function targetTeamMember(env, telegramId) {
  return env.DB.prepare(`SELECT telegram_id, role, active FROM staff_users WHERE telegram_id = ? LIMIT 1`)
    .bind(String(telegramId)).first();
}

async function addTeamMember(chatId, requester, telegramId, roleValue, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const role = normalizeTeamRole(roleValue);
  if (!canAssignTeamRole(access, role)) {
    await sendTelegramMessage(env, chatId, "Назначить роль администратора может только владелец.");
    return;
  }
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
  await logStaffAction(env, requester, access, "staff_add", String(telegramId), "staff", null, null, { role });
  await sendTelegramMessage(env, chatId, `Пользователь <code>${escapeHtml(String(telegramId))}</code> добавлен как <b>${escapeHtml(teamRoleLabel(role))}</b>.\n\nОн должен открыть бота и выполнить <code>/staff</code>.`);
}

async function removeTeamMember(chatId, requester, telegramId, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const target = await targetTeamMember(env, telegramId);
  if (!target) {
    await sendTelegramMessage(env, chatId, "Сотрудник не найден.");
    return;
  }
  if (!access.owner && normalizeTeamRole(target.role) === "administrator") {
    await sendTelegramMessage(env, chatId, "Отключить администратора может только владелец.");
    return;
  }
  await env.DB.prepare(`UPDATE staff_users SET active = 0, session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`)
    .bind(Math.floor(Date.now() / 1000), String(telegramId)).run();
  await logStaffAction(env, requester, access, "staff_disable", String(telegramId), "staff", Number(target.active || 0), 0, null);
  await sendTelegramMessage(env, chatId, `Доступ пользователя <code>${escapeHtml(String(telegramId))}</code> отключён. Текущая сессия завершена.`);
}

async function setTeamRole(chatId, requester, telegramId, roleValue, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const role = normalizeTeamRole(roleValue);
  if (!canAssignTeamRole(access, role)) {
    await sendTelegramMessage(env, chatId, "Назначить роль администратора может только владелец.");
    return;
  }
  const target = await targetTeamMember(env, telegramId);
  if (target && !access.owner && normalizeTeamRole(target.role) === "administrator") {
    await sendTelegramMessage(env, chatId, "Изменить роль администратора может только владелец.");
    return;
  }
  const preset = TEAM_ROLE_PRESETS[role];
  const result = await env.DB.prepare(
    `UPDATE staff_users SET role = ?, can_redeem_rewards = ?, can_adjust_points = ?,
       can_manage_products = ?, can_publish_news = ?, can_manage_staff = ?,
       session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`
  ).bind(role, preset.redeem, preset.points, preset.products, preset.news, preset.staff,
    Math.floor(Date.now() / 1000), String(telegramId)).run();
  if (Number(result.meta?.changes || 0) < 1) {
    await addTeamMember(chatId, requester, telegramId, role, env);
    return;
  }
  await logStaffAction(env, requester, access, "staff_role", String(telegramId), "staff", null, null, { role });
  await sendTelegramMessage(env, chatId, `Роль пользователя <code>${escapeHtml(String(telegramId))}</code> изменена на <b>${escapeHtml(teamRoleLabel(role))}</b>. Для продолжения ему нужно снова выполнить <code>/staff</code>.`);
}

async function setTeamPermission(chatId, requester, telegramId, permission, enabled, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  if (!access.owner) {
    await sendTelegramMessage(env, chatId, "Точечно менять разрешения может только владелец. Администратор назначает роли Кассир или Повар.");
    return;
  }
  const column = TEAM_PERMISSION_COLUMNS[permission];
  if (!column) return;
  const result = await env.DB.prepare(
    `UPDATE staff_users SET ${column} = ?, session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`
  ).bind(enabled ? 1 : 0, Math.floor(Date.now() / 1000), String(telegramId)).run();
  if (Number(result.meta?.changes || 0) < 1) {
    await sendTelegramMessage(env, chatId, "Сотрудник не найден.");
    return;
  }
  await logStaffAction(env, requester, access, "staff_permission", String(telegramId), "staff", null, enabled ? 1 : 0, { permission });
  await sendTelegramMessage(env, chatId, `Разрешение «${escapeHtml(permissionLabel(permission))}» для <code>${escapeHtml(String(telegramId))}</code> ${enabled ? "включено" : "отключено"}. Сотруднику нужно снова выполнить /staff.`);
}

async function logStaffAction(env, requester, access, action, targetTelegramId = null, targetType = null, oldValue = null, newValue = null, details = null) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const role = access?.owner ? "owner" : normalizeTeamRole(access?.role);
    await env.DB.prepare(
      `INSERT INTO staff_action_log (
         actor_telegram_id, actor_name, actor_role, action,
         target_telegram_id, target_type, old_value, new_value,
         details_json, created_at, success
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      String(requester?.id || ""),
      telegramDisplayName(requester),
      role,
      String(action || "unknown"),
      targetTelegramId == null ? null : String(targetTelegramId),
      targetType == null ? null : String(targetType),
      oldValue == null ? null : Math.floor(Number(oldValue) || 0),
      newValue == null ? null : Math.floor(Number(newValue) || 0),
      details == null ? null : JSON.stringify(details).slice(0, 2000),
      now
    ).run();
  } catch (error) {
    console.error("staff audit log failed", error);
  }
}

function staffRoleTitle(access) {
  return access?.owner ? "Владелец" : teamRoleLabel(access?.role);
}

async function showStaffHelp(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? `Рабочая сессия истекла. Снова выполните <code>/staff</code>.\n\nВаш Telegram ID: <code>${escapeHtml(String(user.id))}</code>`
      : `У вас нет доступа сотрудника. Передайте владельцу ваш Telegram ID: <code>${escapeHtml(String(user.id))}</code>`);
    return;
  }

  const lines = [
    `<b>Команды: ${escapeHtml(staffRoleTitle(access))}</b>`,
    "",
    `<code>/staff_me</code> — моя роль, сессия и статистика`,
    `<code>/check_code КОД</code> — проверить заказ без списания`,
    `<code>/pending_orders</code> — активные заказы`
  ];

  if (access.permissions?.redeem) {
    lines.push(
      `<code>/redeem КОД</code> — открыть подтверждение выдачи`,
      `<code>/my_redemptions</code> — мои последние выдачи`,
      `<code>/redemptions_today</code> — сколько выдано сегодня`
    );
  }

  if (access.permissions?.points) {
    lines.push(
      "",
      "<b>Игроки и компенсации</b>",
      `<code>/player TELEGRAM_ID</code> — баланс игрока`,
      `<code>/add_zefir СУММА TELEGRAM_ID ПРИЧИНА</code>`,
      `<code>/add_coffee СУММА TELEGRAM_ID ПРИЧИНА</code>`,
      `<code>/add_points СУММА TELEGRAM_ID ПРИЧИНА</code>`,
      `<code>/add_keys ТИП КОЛИЧЕСТВО TELEGRAM_ID ПРИЧИНА</code>`,
      `<code>/add_frame РАМКА TELEGRAM_ID ПРИЧИНА</code>`
    );
  }

  if (access.permissions?.staff) {
    lines.push(
      "",
      "<b>Команда</b>",
      `<code>/staff_list</code> — управление сотрудниками`,
      `<code>/member_staff</code> — все сотрудники и роли`,
      `<code>/members</code> — все игроки и Telegram ID`,
      `<code>/rang_staff_kassir TELEGRAM_ID</code>`,
      `<code>/rang_staff_povar TELEGRAM_ID</code>`,
      `<code>/staff_disable TELEGRAM_ID</code>`,
      `<code>/staff_enable TELEGRAM_ID</code>`,
      `<code>/staff_log 10</code> — последние действия`
    );
    if (access.owner) lines.push(`<code>/rang_staff_administrator TELEGRAM_ID</code>`);
  }

  lines.push("", "Команды показываются только в соответствии с вашей ролью.");
  await sendTelegramMessage(env, chatId, lines.join("\n"));
}

async function showStaffProfile(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? "Рабочая сессия истекла. Выполните <code>/staff</code>."
      : "У вас нет активной роли сотрудника.");
    return;
  }
  const todayStart = moscowDayStartUnix();
  const stats = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM reward_codes
     WHERE redeemed_by = ? AND status = 'used' AND redeemed_at >= ?`
  ).bind(String(user.id), todayStart).first();
  const expires = access.owner ? "не ограничена" : formatUtcDate(access.expiresAt);
  const permissions = Object.entries(access.permissions || {})
    .filter(([key, enabled]) => enabled && !["view", "log"].includes(key))
    .map(([key]) => permissionLabel(key))
    .join(", ") || "только просмотр";
  await sendTelegramMessage(env, chatId,
    `<b>Профиль сотрудника</b>\n\nИмя: <b>${escapeHtml(telegramDisplayName(user))}</b>\nTelegram ID: <code>${escapeHtml(String(user.id))}</code>\nРоль: <b>${escapeHtml(staffRoleTitle(access))}</b>\nСессия до: <b>${escapeHtml(expires)}</b>\nВыдано сегодня: <b>${Number(stats?.count || 0)}</b>\nПрава: ${escapeHtml(permissions)}\n\n<code>/help_staff</code> — доступные команды.`
  );
}

async function showPendingOrders(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "view", env);
  if (!access) return;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE reward_codes SET status = 'expired'
     WHERE status = 'active' AND expires_at <= ?`
  ).bind(now).run();
  const result = await env.DB.prepare(
    `SELECT code, product_name, owner_name, created_at, expires_at
     FROM reward_codes
     WHERE status = 'active' AND expires_at > ?
     ORDER BY created_at ASC LIMIT 10`
  ).bind(now).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  if (!rows.length) {
    await sendTelegramMessage(env, chatId, "Сейчас нет активных заказов, ожидающих выдачи.");
    return;
  }
  const list = rows.map((row, index) =>
    `${index + 1}. <b>${escapeHtml(row.product_name)}</b>\nКод: <code>${escapeHtml(row.code)}</code>\nГость: ${escapeHtml(row.owner_name || "Гость")}\nДо: ${escapeHtml(formatUtcDate(row.expires_at))}`
  ).join("\n\n");
  await sendTelegramMessage(env, chatId, `<b>Заказы, ожидающие выдачи</b>\n\n${list}`);
}

async function showMyRedemptions(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "redeem", env);
  if (!access) return;
  const result = await env.DB.prepare(
    `SELECT code, product_name, owner_name, redeemed_at
     FROM reward_codes
     WHERE status = 'used' AND redeemed_by = ?
     ORDER BY redeemed_at DESC LIMIT 10`
  ).bind(String(user.id)).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  if (!rows.length) {
    await sendTelegramMessage(env, chatId, "У вас пока нет списанных заказов.");
    return;
  }
  const list = rows.map((row, index) =>
    `${index + 1}. <b>${escapeHtml(row.product_name)}</b> · <code>${escapeHtml(row.code)}</code>\n${escapeHtml(row.owner_name || "Гость")} · ${escapeHtml(formatUtcDate(row.redeemed_at))}`
  ).join("\n\n");
  await sendTelegramMessage(env, chatId, `<b>Мои последние выдачи</b>\n\n${list}`);
}

function moscowDayStartUnix(nowMs = Date.now()) {
  const shifted = new Date(nowMs + 3 * 60 * 60 * 1000);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return Math.floor((utcMidnight - 3 * 60 * 60 * 1000) / 1000);
}

async function showRedemptionsToday(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "redeem", env);
  if (!access) return;
  const start = moscowDayStartUnix();
  const result = await env.DB.prepare(
    `SELECT product_name, COUNT(*) AS count
     FROM reward_codes
     WHERE status = 'used' AND redeemed_by = ? AND redeemed_at >= ?
     GROUP BY product_name ORDER BY count DESC, product_name ASC`
  ).bind(String(user.id), start).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const details = rows.length
    ? rows.map((row) => `• ${escapeHtml(row.product_name)}: <b>${Number(row.count || 0)}</b>`).join("\n")
    : "Сегодня выдач ещё не было.";
  await sendTelegramMessage(env, chatId, `<b>Выдачи за сегодня</b>\n\nВсего: <b>${total}</b>\n\n${details}`);
}

async function showPlayerProfile(chatId, user, telegramId, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const row = await env.DB.prepare(
    `SELECT telegram_id, wallet, best_score, treats, coffee, profile_xp,
            pending_wallet, pending_treats, pending_coffee,
            revision, updated_at
     FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(String(telegramId)).first();
  if (!row) {
    await sendTelegramMessage(env, chatId, `Игрок <code>${escapeHtml(String(telegramId))}</code> ещё не синхронизировал профиль. Попросите его один раз открыть игру.`);
    return;
  }
  const pendingLines = [
    Number(row.pending_wallet || 0) > 0 ? `+${Number(row.pending_wallet).toLocaleString("ru-RU")} очков` : null,
    Number(row.pending_treats || 0) > 0 ? `+${Number(row.pending_treats).toLocaleString("ru-RU")} зефира` : null,
    Number(row.pending_coffee || 0) > 0 ? `+${Number(row.pending_coffee).toLocaleString("ru-RU")} кофе` : null
  ].filter(Boolean);
  const pendingText = pendingLines.length ? pendingLines.join(", ") : "нет";
  await sendTelegramMessage(env, chatId,
    `<b>Профиль игрока</b>

Telegram ID: <code>${escapeHtml(String(telegramId))}</code>
Последний серверный баланс:
Очки в кошельке: <b>${Number(row.wallet || 0).toLocaleString("ru-RU")}</b>
Зефир: <b>${Number(row.treats || 0).toLocaleString("ru-RU")}</b>
Кофе: <b>${Number(row.coffee || 0).toLocaleString("ru-RU")}</b>
Ожидает начисления: <b>${escapeHtml(pendingText)}</b>
Личный рекорд: <b>${Number(row.best_score || 0).toLocaleString("ru-RU")}</b>
XP: <b>${Number(row.profile_xp || 0).toLocaleString("ru-RU")}</b>
Обновлено: ${escapeHtml(formatUtcDate(row.updated_at))}`
  );
}

function compensationLimit(access, currency) {
  if (access?.owner) return 999999999;
  return currency === "points" ? 10000 : 100;
}

async function addPlayerCurrency(chatId, user, currency, amountValue, telegramId, reasonValue, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const amount = Math.floor(Number(amountValue) || 0);
  const limit = compensationLimit(access, currency);
  if (amount < 1 || amount > limit) {
    await sendTelegramMessage(env, chatId, `Недопустимая сумма. Для вашей роли максимум за одну операцию: <b>${limit.toLocaleString("ru-RU")}</b>.`);
    return;
  }
  const pendingFieldMap = { zefir: "pending_treats", coffee: "pending_coffee", points: "pending_wallet" };
  const labelMap = { zefir: "зефира", coffee: "кофе", points: "очков" };
  const pendingField = pendingFieldMap[currency];
  if (!pendingField) return;
  const row = await env.DB.prepare(
    `SELECT pending_wallet, pending_treats, pending_coffee
     FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(String(telegramId)).first();
  if (!row) {
    await sendTelegramMessage(env, chatId, `Игрок <code>${escapeHtml(String(telegramId))}</code> ещё не синхронизировал профиль. Попросите его открыть игру, затем повторите начисление.`);
    return;
  }
  const queuedBefore = safeAdminNumber(row[pendingField]);
  const queuedAfter = safeAdminNumber(queuedBefore + amount);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE admin_profile_state SET ${pendingField} = ?, revision = revision + 1,
     updated_at = ?, updated_by = ? WHERE telegram_id = ?`
  ).bind(queuedAfter, now, String(user.id), String(telegramId)).run();
  const reason = String(reasonValue || "Компенсация").slice(0, 300);
  await logStaffAction(env, user, access, `add_${currency}`, String(telegramId), currency, queuedBefore, queuedAfter, {
    amount,
    reason,
    status: "queued"
  });
  await sendTelegramMessage(env, chatId,
    `<b>Компенсация поставлена в очередь</b>

Игрок: <code>${escapeHtml(String(telegramId))}</code>
Будет добавлено: <b>+${amount.toLocaleString("ru-RU")} ${escapeHtml(labelMap[currency])}</b>
Всего ожидает начисления: <b>${queuedAfter.toLocaleString("ru-RU")}</b>
Причина: ${escapeHtml(reason)}

Сумма добавится к актуальному балансу игрока при следующем открытии или синхронизации игры.`
  );
}

function normalizeFrameAlias(value) {
  const raw = String(value || "").trim().toLowerCase();
  return ({ strawberry: "strawberry", "клубничная": "strawberry", coffee: "coffee", "кофейная": "coffee", mint: "mint", "мятная": "mint", gold: "gold", "золотая": "gold" })[raw] || "";
}

async function addPlayerCases(chatId, user, caseTypeValue, quantityValue, telegramId, reasonValue, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const quantity = Math.max(1, Math.floor(Number(quantityValue) || 1));
  const max = access.owner ? 20 : 5;
  if (quantity > max) {
    await sendTelegramMessage(env, chatId, `Для вашей роли максимум за одну операцию: <b>${max}</b> кейсов.`);
    return;
  }
  const caseType = normalizeCaseType(caseTypeValue);
  if (!caseType) {
    await sendTelegramMessage(env, chatId, "Неизвестный тип кейса. Доступно: <code>small</code>, <code>sweet</code>, <code>gold</code>.");
    return;
  }
  const result = await createGrantedCases(env, String(telegramId), caseType, quantity, String(user.id), reasonValue);
  await logStaffAction(env, user, access, "add_keys", String(telegramId), "case", 0, result.quantity, { caseType, quantity: result.quantity, reason: result.reason });
  await sendTelegramMessage(env, chatId,
    `<b>Кейсы выданы</b>

Игрок: <code>${escapeHtml(String(telegramId))}</code>
Тип: <b>${escapeHtml(LEVEL_CASE_CONFIG[caseType]?.title || caseType)}</b>
Количество: <b>${result.quantity}</b>
Причина: ${escapeHtml(result.reason)}

Они появятся в разделе кейсов после следующей синхронизации игры.`
  );
}

async function addPlayerFrame(chatId, user, frameValue, telegramId, reasonValue, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const frameId = normalizeFrameAlias(frameValue);
  if (!frameId) {
    await sendTelegramMessage(env, chatId, "Неизвестная рамка. Доступно: <code>strawberry</code>, <code>coffee</code>, <code>mint</code>, <code>gold</code>.");
    return;
  }
  const result = await grantFrameToPlayer(env, String(telegramId), frameId, String(user.id));
  const reason = String(reasonValue || "Компенсация").slice(0, 300);
  await logStaffAction(env, user, access, "add_frame", String(telegramId), "frame", result.alreadyOwned ? 1 : 0, 1, { frameId, reason, alreadyOwned: result.alreadyOwned });
  await sendTelegramMessage(env, chatId,
    `<b>${result.alreadyOwned ? "Рамка уже была у игрока" : "Рамка выдана"}</b>

Игрок: <code>${escapeHtml(String(telegramId))}</code>
Рамка: <b>${escapeHtml(result.title)}</b>
Причина: ${escapeHtml(reason)}

Рамка появится в коллекции после следующей синхронизации игры.`
  );
}

function staffActionLabel(action) {
  return ({
    redeem_reward: "выдача товара",
    add_zefir: "начисление зефира",
    add_coffee: "начисление кофе",
    add_points: "начисление очков",
    add_keys: "выдача кейсов",
    add_frame: "выдача рамки",
    staff_add: "добавление сотрудника",
    staff_role: "изменение роли",
    staff_disable: "отключение сотрудника",
    staff_enable: "включение сотрудника",
    staff_permission: "изменение разрешения",
    view_staff_members: "просмотр списка сотрудников",
    view_player_members: "просмотр списка игроков",
    points_legacy: "изменение очков",
    publish_news: "публикация новости"
  })[action] || action;
}

async function showStaffAuditLog(chatId, user, limitValue, env) {
  const access = await requireTeamPermission(chatId, user, "log", env);
  if (!access) return;
  const limit = Math.max(1, Math.min(20, Math.floor(Number(limitValue) || 10)));
  const result = await env.DB.prepare(
    `SELECT actor_name, actor_telegram_id, actor_role, action,
            target_telegram_id, target_type, old_value, new_value,
            details_json, created_at
     FROM staff_action_log ORDER BY id DESC LIMIT ?`
  ).bind(limit).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  if (!rows.length) {
    await sendTelegramMessage(env, chatId, "Журнал действий пока пуст.");
    return;
  }
  const list = rows.map((row, index) => {
    let details = null;
    try { details = row.details_json ? JSON.parse(row.details_json) : null; } catch {}
    const valueLine = row.old_value == null && row.new_value == null
      ? ""
      : `\nЗначение: ${Number(row.old_value || 0).toLocaleString("ru-RU")} → ${Number(row.new_value || 0).toLocaleString("ru-RU")}`;
    const reasonLine = details?.reason ? `\nПричина: ${escapeHtml(details.reason)}` : "";
    const targetLine = row.target_telegram_id ? `\nЦель: <code>${escapeHtml(String(row.target_telegram_id))}</code>` : "";
    return `${index + 1}. <b>${escapeHtml(staffActionLabel(row.action))}</b>\n${escapeHtml(row.actor_name || row.actor_telegram_id)} · ${escapeHtml(row.actor_role)}${targetLine}${valueLine}${reasonLine}\n${escapeHtml(formatUtcDate(row.created_at))}`;
  }).join("\n\n");
  await sendTelegramMessage(env, chatId, `<b>Журнал действий сотрудников</b>\n\n${list}`);
}

async function setStaffEnabled(chatId, requester, telegramId, enabled, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  const target = await targetTeamMember(env, telegramId);
  if (!target) {
    await sendTelegramMessage(env, chatId, "Сотрудник не найден.");
    return;
  }
  if (!access.owner && normalizeTeamRole(target.role) === "administrator") {
    await sendTelegramMessage(env, chatId, "Изменить состояние администратора может только владелец.");
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE staff_users SET active = ?, session_expires_at = 0, updated_at = ? WHERE telegram_id = ?`
  ).bind(enabled ? 1 : 0, now, String(telegramId)).run();
  await logStaffAction(env, requester, access, enabled ? "staff_enable" : "staff_disable", String(telegramId), "staff", Number(target.active || 0), enabled ? 1 : 0, null);
  await sendTelegramMessage(env, chatId, enabled
    ? `Сотрудник <code>${escapeHtml(String(telegramId))}</code> включён. Ему нужно снова выполнить <code>/staff</code>.`
    : `Сотрудник <code>${escapeHtml(String(telegramId))}</code> отключён.`);
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
  await logStaffAction(env, requester, access, "points_legacy", String(telegramId), "points", current, next, { mode, amount });
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
  await logStaffAction(env, requester, access, "publish_news", null, "news", null, null, { title });
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
<code>/rang_staff_kassir ${escapeHtml(String(user.id))}</code>

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
    const preset = TEAM_ROLE_PRESETS.administrator;
    await env.DB.prepare(
      `INSERT INTO staff_users (
        telegram_id, display_name, added_at, active, session_expires_at, role,
        can_redeem_rewards, can_adjust_points, can_manage_products,
        can_publish_news, can_manage_staff, invited_by, updated_at
      ) VALUES (?, ?, ?, 1, ?, 'administrator', ?, ?, ?, ?, ?, ?, ?)`
    ).bind(String(user.id), telegramDisplayName(user), now, sessionExpiresAt,
      preset.redeem, preset.points, preset.products, preset.news, preset.staff,
      String(user.id), now).run();
  } else if (!existingStaff && legacyCodeAccepted) {
    const preset = TEAM_ROLE_PRESETS.cashier;
    await env.DB.prepare(
      `INSERT INTO staff_users (
        telegram_id, display_name, added_at, active, session_expires_at, role,
        can_redeem_rewards, can_adjust_points, can_manage_products,
        can_publish_news, can_manage_staff, invited_by, updated_at
      ) VALUES (?, ?, ?, 1, ?, 'cashier', ?, ?, ?, ?, ?, '', ?)`
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

async function showRewardInBot(chatId, viewer, rawCode, env, options = {}) {
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
  const staffCommand = Boolean(options.viewOnly || options.forceRedeem);
  if (staffCommand && !staffSession.authorized) {
    await sendTelegramMessage(env, chatId, staffSession.reason === "expired"
      ? "Сессия сотрудника истекла. Выполните <code>/staff</code>, затем повторите команду."
      : "Эта команда доступна только сотрудникам.");
    return;
  }
  if (options.forceRedeem && !staffSession.permissions?.redeem) {
    await sendTelegramMessage(env, chatId, "Ваша роль позволяет только просматривать заказ, но не списывать его.");
    return;
  }
  if (!staffCommand && !staffSession.authorized && staffSession.reason === "expired") {
    await sendTelegramMessage(env, chatId,
      "Сессия сотрудника истекла. Войдите снова командой <code>/staff</code>, затем повторно отправьте код гостя."
    );
    return;
  }
  const staffView = Boolean(staffSession.authorized);
  const canRedeem = staffView && Boolean(staffSession.permissions?.redeem) && !options.viewOnly;
  const view = rewardBotView(reward, staffView, canRedeem);
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
      const access = await getTeamAccess(user, env);
      await logStaffAction(env, user, access, "redeem_reward", String(reward.owner_telegram_id || ""), "reward", null, null, {
        code: reward.code,
        product: reward.product_name
      });
      await answerCallback(env, query.id, "Подарок списан.");
      await editRewardMessage(env, message, reward, true, false);
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

async function editRewardMessage(env, message, reward, staff, canRedeem = staff) {
  const view = rewardBotView(reward, staff, canRedeem);
  await telegramApi(env, "editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    parse_mode: "HTML",
    text: view.text,
    reply_markup: view.replyMarkup || { inline_keyboard: [] }
  });
}

function rewardBotView(reward, staff, canRedeem = staff) {
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
    replyMarkup: canRedeem ? {
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
    role: access.role || "cashier",
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
