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
const BOT_COMMANDS = Object.freeze([
  { command: "start", description: "Открыть главное меню" },
  { command: "game", description: "Открыть игру" },
  { command: "story", description: "Сюжет игры" },
  { command: "faq", description: "Частые вопросы" },
  { command: "rewards", description: "Как получить награду" },
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

    if (existing) return jsonResponse({ ok: true, reward: rewardRowToClient(existing), repeated: true });

    const now = Math.floor(Date.now() / 1000);
    const limitWindow = positiveInt(env.REWARD_LIMIT_WINDOW_SECONDS, DEFAULT_LIMIT_WINDOW_SECONDS);
    const limitMax = positiveInt(env.REWARD_LIMIT_MAX, DEFAULT_LIMIT_MAX);
    const threshold = now - limitWindow;

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS total, MIN(created_at) AS earliest
       FROM reward_codes
       WHERE owner_telegram_id = ? AND created_at > ? AND status <> 'cancelled'`
    ).bind(ownerId, threshold).first();

    const used = Number(countRow?.total || 0);
    if (used >= limitMax) {
      const nextAt = Number(countRow?.earliest || now) + limitWindow;
      throw new ApiError(429, `Лимит наград: не больше ${limitMax} за 24 часа.`, {
        used,
        limit: limitMax,
        nextAvailableAt: nextAt * 1000
      });
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

    return jsonResponse({
      ok: true,
      reward: {
        code: insertedCode,
        productId: product.id,
        productName: product.title,
        issuedAt: now * 1000,
        expiresAt: expiresAt * 1000,
        status: "active"
      }
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

    return jsonResponse({
      ok: true,
      rewards: (result.results || []).map(rewardRowToClient)
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("listMyRewards failed", error);
    return jsonResponse({ ok: false, error: "Не удалось обновить покупки." }, 500);
  }
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
  return `<b>Зефирок — помощник кафе</b>\n\nЗдесь можно открыть игру, узнать историю Зефи, прочитать ответы на частые вопросы и проверить код награды.\n\nЧтобы проверить подарок, просто отправьте код из раздела «Мои покупки» одним сообщением.`;
}

function botGameText() {
  return `<b>Сладкий забег</b>\n\nНажмите кнопку ниже, чтобы открыть игру и продолжить приключение Зефи.`;
}

function botStoryText() {
  return `<b>Сюжет «Сладкого забега»</b>\n\nЗефи — маленький мальтипу и главный помощник уютного кафе. Перед открытием он отправляется в сладкий забег: собирает зефир и кофе, перепрыгивает пуфики и помогает наполнить витрину любимыми угощениями гостей.\n\nЧем дальше пробежит Зефи, тем больше наград, опыта и новых возможностей откроется в его профиле.`;
}

function botFaqText() {
  return `<b>FAQ — частые вопросы</b>\n\n<b>Как играть?</b>\nНажимайте на экран, чтобы Зефи перепрыгивал препятствия и собирал зефир с кофе.\n\n<b>Где посмотреть покупки?</b>\nВо вкладке «Мои покупки» внутри игры.\n\n<b>Сколько действует код?</b>\n24 часа с момента покупки.\n\n<b>Как получить подарок?</b>\nПокажите действующий код сотруднику кафе. Сотрудник проверит его в этом боте и спишет после выдачи.\n\n<b>Почему за короткий забег не дали XP?</b>\nОпыт начисляется только за забеги, прошедшие антифарм-порог по времени и счёту.`;
}

function botRewardsText() {
  return `<b>Как получить награду</b>\n\n1. Соберите валюту в игре.\n2. Купите подарок во вкладке «Магазин».\n3. Откройте «Мои покупки» и нажмите на код, чтобы скопировать его.\n4. Покажите код сотруднику кафе или отправьте его в этот бот.\n5. После выдачи сотрудник спишет код, и повторно использовать его будет нельзя.\n\nКод действует 24 часа. Лимит — не больше двух наград за 24 часа.`;
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
  const match = String(query.data || "").match(/^menu:(home|story|faq|rewards)$/);
  if (!match) return false;
  const message = query.message;
  if (!message?.chat?.id) {
    await answerCallback(env, query.id, "Откройте меню командой /start.");
    return true;
  }

  const section = match[1];
  const text = section === "story"
    ? botStoryText()
    : section === "faq"
      ? botFaqText()
      : section === "rewards"
        ? botRewardsText()
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
