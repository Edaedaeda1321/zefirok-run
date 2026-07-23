import app from "./worker.js";

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/shop/")) {
      return new Response(null, { status: 204, headers: apiHeaders() });
    }

    if (url.pathname === "/api/shop/config" && request.method === "GET") {
      return getShopConfig(env);
    }

    if (url.pathname === "/api/admin/shop/prices" && request.method === "POST") {
      return updateShopPrices(request, env);
    }

    const response = await app.fetch(request, env, ctx);
    if (!shouldInjectShopClient(request, response)) return response;

    const html = await response.text();
    const withSelfScript = html.replace(
      /script-src ([^;]+)/,
      (match, value) => value.includes("'self'") ? match : `script-src 'self' ${value}`
    );
    const injected = withSelfScript.replace(
      /<\/body>\s*<\/html>\s*$/i,
      '<script src="/assets/global-shop-prices.js?v=1" defer></script></body></html>'
    );

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("Cache-Control", "no-store");
    return new Response(injected, { status: response.status, statusText: response.statusText, headers });
  }
};

function shouldInjectShopClient(request, response) {
  if (request.method !== "GET" || response.status !== 200) return false;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return false;
  const path = new URL(request.url).pathname;
  return path === "/" || path === "/index.html";
}

async function getShopConfig(env) {
  try {
    requireDatabase(env);
    await ensureShopSchema(env);
    const products = await readShopPrices(env);
    return jsonResponse({
      ok: true,
      products,
      defaults: DEFAULT_SHOP_PRODUCTS,
      source: "d1"
    });
  } catch (error) {
    console.error("getShopConfig failed", error);
    return jsonResponse({
      ok: true,
      products: DEFAULT_SHOP_PRODUCTS,
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
    requireShopAdmin(auth.user, env);
    const products = normalizeProducts(body.products);
    await ensureShopSchema(env);

    const now = Math.floor(Date.now() / 1000);
    const updatedBy = String(auth.user.id);
    const statements = Object.entries(products).map(([productId, price]) => env.DB.prepare(
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
    ).bind(productId, price.points, price.treats, price.coffee, now, updatedBy));

    await env.DB.batch(statements);
    const saved = await readShopPrices(env);
    return jsonResponse({ ok: true, products: saved, updatedAt: now * 1000 });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse({ ok: false, error: error.message }, error.status);
    }
    console.error("updateShopPrices failed", error);
    return jsonResponse({ ok: false, error: "Не удалось сохранить глобальные цены." }, 500);
  }
}

async function ensureShopSchema(env) {
  await env.DB.prepare(SHOP_SCHEMA_SQL).run();
  const now = Math.floor(Date.now() / 1000);
  const seedStatements = Object.entries(DEFAULT_SHOP_PRODUCTS).map(([productId, price]) => env.DB.prepare(
    `INSERT OR IGNORE INTO shop_prices (
      product_id, points, treats, coffee, version, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, 1, ?, 'system')`
  ).bind(productId, price.points, price.treats, price.coffee, now));
  await env.DB.batch(seedStatements);
}

async function readShopPrices(env) {
  const result = await env.DB.prepare(
    `SELECT product_id, points, treats, coffee
     FROM shop_prices
     ORDER BY product_id ASC`
  ).all();
  const products = cloneDefaultProducts();
  for (const row of result.results || []) {
    if (!products[row.product_id]) continue;
    products[row.product_id] = {
      points: sanitizePrice(row.points),
      treats: sanitizePrice(row.treats),
      coffee: sanitizePrice(row.coffee)
    };
  }
  return products;
}

function cloneDefaultProducts() {
  return Object.fromEntries(Object.entries(DEFAULT_SHOP_PRODUCTS).map(([id, price]) => [id, { ...price }]));
}

function normalizeProducts(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Некорректный список цен.");
  }
  const normalized = {};
  for (const productId of Object.keys(DEFAULT_SHOP_PRODUCTS)) {
    const price = input[productId];
    if (!price || typeof price !== "object" || Array.isArray(price)) {
      throw new ApiError(400, `Не указаны цены товара ${productId}.`);
    }
    normalized[productId] = {
      points: sanitizePrice(price.points),
      treats: sanitizePrice(price.treats),
      coffee: sanitizePrice(price.coffee)
    };
  }
  return normalized;
}

function sanitizePrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999) {
    throw new ApiError(400, "Цена должна быть целым числом от 0 до 999 999 999.");
  }
  return Math.floor(number);
}

function requireShopAdmin(user, env) {
  const allowedIds = String(env.SHOP_ADMIN_TELEGRAM_IDS || env.ADMIN_TELEGRAM_IDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowedIds.length) {
    throw new ApiError(503, "В Cloudflare не настроен SHOP_ADMIN_TELEGRAM_IDS.");
  }
  if (!allowedIds.includes(String(user?.id || ""))) {
    throw new ApiError(403, "Нет доступа к глобальным ценам.");
  }
}

function requireDatabase(env) {
  if (!env.DB) throw new ApiError(503, "База данных временно недоступна.");
}

function requireBotToken(env) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new ApiError(503, "TELEGRAM_BOT_TOKEN не настроен.");
}

async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "Ожидался JSON-запрос.");
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Некорректный JSON-запрос.");
  }
}

async function validateTelegramInitData(initData, env) {
  if (!initData) throw new ApiError(401, "Откройте админ-панель внутри Telegram.");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) throw new ApiError(401, "Некорректная Telegram-подпись.");

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), new TextEncoder().encode(env.TELEGRAM_BOT_TOKEN));
  const expectedHash = bytesToHex(await hmacSha256(secretKey, new TextEncoder().encode(dataCheckString)));
  if (!timingSafeEqual(expectedHash.toLowerCase(), receivedHash.toLowerCase())) {
    throw new ApiError(401, "Telegram-подпись не прошла проверку.");
  }

  const authDate = Number(params.get("auth_date") || 0);
  const maxAge = positiveInt(env.INIT_DATA_MAX_AGE_SECONDS, 24 * 60 * 60);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || authDate > now + 60 || now - authDate > maxAge) {
    throw new ApiError(401, "Telegram-сессия устарела. Перезапустите игру.");
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new ApiError(401, "Не удалось прочитать Telegram-профиль.");
  }
  if (!user || user.id == null) throw new ApiError(401, "Telegram-профиль не найден.");
  return { user };
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

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

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
