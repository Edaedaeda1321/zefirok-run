import app from "./entry-admin.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname === "/api/admin/profile/sync") {
      return new Response(null, { status: 204, headers: apiHeaders() });
    }
    if (url.pathname === "/api/admin/profile/sync" && request.method === "POST") {
      return syncAdminMinimums(request, env);
    }
    return app.fetch(request, env, ctx);
  }
};

async function syncAdminMinimums(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    requireAdmin(auth.user, env);
    const telegramId = String(auth.user.id);
    const current = normalizeProfile(body.current || {});
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

    if (String(body.mode || "read") === "write") {
      const next = normalizeProfile(body.next || current);
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
      `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at
       FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
    ).bind(telegramId).first();

    return jsonResponse({
      ok: true,
      profile: {
        wallet: safeNumber(row?.wallet),
        best: safeNumber(row?.best_score),
        treats: safeNumber(row?.treats),
        coffee: safeNumber(row?.coffee),
        profileXp: safeNumber(row?.profile_xp),
        revision: safeNumber(row?.revision),
        updatedAt: safeNumber(row?.updated_at) * 1000
      }
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("syncAdminMinimums failed", error);
    return jsonResponse({ ok: false, error: "Не удалось синхронизировать глобальные начисления." }, 500);
  }
}

function normalizeProfile(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    wallet: validateNumber(source.wallet),
    best: validateNumber(source.best),
    treats: validateNumber(source.treats),
    coffee: validateNumber(source.coffee),
    profileXp: validateNumber(source.profileXp)
  };
}

function validateNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999) {
    throw new ApiError(400, "Значение должно быть целым числом от 0 до 999 999 999.");
  }
  return Math.floor(number);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(999999999, Math.floor(number))) : 0;
}

function requireAdmin(user, env) {
  const allowedIds = String(env.SHOP_ADMIN_TELEGRAM_IDS || env.ADMIN_TELEGRAM_IDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowedIds.length) throw new ApiError(503, "Не настроен SHOP_ADMIN_TELEGRAM_IDS.");
  if (!allowedIds.includes(String(user?.id || ""))) throw new ApiError(403, "Нет доступа к глобальным начислениям.");
}

function requireDatabase(env) {
  if (!env.DB) throw new ApiError(503, "База данных временно недоступна.");
}

function requireBotToken(env) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new ApiError(503, "TELEGRAM_BOT_TOKEN не настроен.");
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

async function validateTelegramInitData(initData, env) {
  if (!initData) throw new ApiError(401, "Откройте игру внутри Telegram.");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) throw new ApiError(401, "Некорректная Telegram-подпись.");
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const encoder = new TextEncoder();
  const secretKey = await hmacSha256(encoder.encode("WebAppData"), encoder.encode(env.TELEGRAM_BOT_TOKEN));
  const expectedHash = bytesToHex(await hmacSha256(secretKey, encoder.encode(dataCheckString)));
  if (!timingSafeEqual(expectedHash.toLowerCase(), receivedHash.toLowerCase())) {
    throw new ApiError(401, "Telegram-подпись не прошла проверку.");
  }
  const authDate = Number(params.get("auth_date") || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || authDate > now + 60 || now - authDate > 24 * 60 * 60) {
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
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
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
