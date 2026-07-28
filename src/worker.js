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

const CASE_SHOP_PRODUCTS = Object.freeze({
  small: Object.freeze({ id: "case-small", title: "Обычный кейс", points: 10000, treats: 100, coffee: 100 }),
  sweet: Object.freeze({ id: "case-sweet", title: "Серебряный кейс", points: 10000, treats: 100, coffee: 100 }),
  gold: Object.freeze({ id: "case-gold", title: "Золотой кейс", points: 10000, treats: 100, coffee: 100 }),
  legendary: Object.freeze({ id: "case-legendary", title: "Легендарный кейс", points: 600000, treats: 600, coffee: 600 })
});

const SHOP_ASSORTMENT_PRODUCTS = Object.freeze({
  zefir: Object.freeze({ id: "zefir", title: PRODUCTS.zefir.title, points: DEFAULT_SHOP_PRODUCTS.zefir.points, treats: DEFAULT_SHOP_PRODUCTS.zefir.treats, coffee: DEFAULT_SHOP_PRODUCTS.zefir.coffee }),
  americano: Object.freeze({ id: "americano", title: PRODUCTS.americano.title, points: DEFAULT_SHOP_PRODUCTS.americano.points, treats: DEFAULT_SHOP_PRODUCTS.americano.treats, coffee: DEFAULT_SHOP_PRODUCTS.americano.coffee }),
  cappuccino: Object.freeze({ id: "cappuccino", title: PRODUCTS.cappuccino.title, points: DEFAULT_SHOP_PRODUCTS.cappuccino.points, treats: DEFAULT_SHOP_PRODUCTS.cappuccino.treats, coffee: DEFAULT_SHOP_PRODUCTS.cappuccino.coffee }),
  "case-small": Object.freeze({ ...CASE_SHOP_PRODUCTS.small, caseType: "small" }),
  "case-sweet": Object.freeze({ ...CASE_SHOP_PRODUCTS.sweet, caseType: "sweet" }),
  "case-gold": Object.freeze({ ...CASE_SHOP_PRODUCTS.gold, caseType: "gold" }),
  "case-legendary": Object.freeze({ ...CASE_SHOP_PRODUCTS.legendary, caseType: "legendary" })
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

const DEFAULT_SKIN_PRICE_VERSION = 2;
const DEFAULT_SKIN_PRICES = Object.freeze({
  default: Object.freeze({ points: 0, treats: 0, coffee: 0 }),
  barista: Object.freeze({ points: 100000, treats: 0, coffee: 400 }),
  strawberry: Object.freeze({ points: 180000, treats: 400, coffee: 0 }),
  bee: Object.freeze({ points: 350000, treats: 650, coffee: 0 }),
  sailor: Object.freeze({ points: 650000, treats: 0, coffee: 650 }),
  princess: Object.freeze({ points: 1300000, treats: 850, coffee: 850 }),
  angel: Object.freeze({ points: 2400000, treats: 1000, coffee: 1000 })
});

const SKIN_PURCHASE_CASE_BONUSES = Object.freeze({
  bee: Object.freeze({ caseType: "small", title: "Обычный кейс", version: "balance-v1" }),
  sailor: Object.freeze({ caseType: "sweet", title: "Серебряный кейс", version: "balance-v1" }),
  princess: Object.freeze({ caseType: "gold", title: "Золотой кейс", version: "balance-v2" }),
  angel: Object.freeze({ caseType: "legendary", title: "Легендарный кейс", version: "balance-v2" })
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
  small: Object.freeze({ id: "small", title: "Обычный кейс", slots: 1 }),
  sweet: Object.freeze({ id: "sweet", title: "Серебряный кейс", slots: 1 }),
  gold: Object.freeze({ id: "gold", title: "Золотой кейс", slots: 1 }),
  legendary: Object.freeze({ id: "legendary", title: "Легендарный кейс", slots: 1 })
});

const CASE_AVATARS = Object.freeze({
  royal: Object.freeze({ id: "royal", title: "Королевская", rarity: "legendary", weight: 2 }),
  legendary_avatar_1: Object.freeze({ id: "legendary_avatar_1", title: "Королевское Сердце", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_avatar_2: Object.freeze({ id: "legendary_avatar_2", title: "Лунная Принцесса", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_avatar_3: Object.freeze({ id: "legendary_avatar_3", title: "Клубничная Королева", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_avatar_4: Object.freeze({ id: "legendary_avatar_4", title: "Кофейная Герцогиня", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_avatar_5: Object.freeze({ id: "legendary_avatar_5", title: "Золотая Любимица", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  champion: Object.freeze({ id: "champion", title: "Чемпион", rarity: "mythic", weight: 3 }),
  winter_cocoa: Object.freeze({ id: "winter_cocoa", title: "Зимнее какао", rarity: "common", weight: 30 }),
  birthday_gift: Object.freeze({ id: "birthday_gift", title: "Праздничный подарок", rarity: "rare", weight: 20 }),
  sweet_dreams: Object.freeze({ id: "sweet_dreams", title: "Сладкие сны", rarity: "superrare", weight: 9 }),
  strawberry_cake: Object.freeze({ id: "strawberry_cake", title: "Клубничный десерт", rarity: "superrare", weight: 9 }),
  coffee_barista: Object.freeze({ id: "coffee_barista", title: "Кофейный бариста", rarity: "superrare", weight: 9 }),
  marshmallow_cloud: Object.freeze({ id: "marshmallow_cloud", title: "Зефирное облако", rarity: "epic", weight: 6 }),
  pink_hearts: Object.freeze({ id: "pink_hearts", title: "Розовые сердечки", rarity: "epic", weight: 6 }),
  sakura: Object.freeze({ id: "sakura", title: "Сакура", rarity: "epic", weight: 6 })
});

const CASE_FRAMES = Object.freeze({
  heart: Object.freeze({ id: "heart", title: "Рамка Сердечки", rarity: "common", weight: 32 }),
  marshmallow: Object.freeze({ id: "marshmallow", title: "Зефирная рамка", rarity: "rare", weight: 16 }),
  coffee: Object.freeze({ id: "coffee", title: "Кофейная рамка", rarity: "rare", weight: 16 }),
  strawberry: Object.freeze({ id: "strawberry", title: "Клубничная рамка", rarity: "superrare", weight: 14 }),
  winter: Object.freeze({ id: "winter", title: "Зимняя рамка", rarity: "epic", weight: 5 }),
  sleep: Object.freeze({ id: "sleep", title: "Рамка Сладкие сны", rarity: "epic", weight: 5 }),
  lovers: Object.freeze({ id: "lovers", title: "Рамка Влюблённые", rarity: "epic", weight: 5 }),
  elite: Object.freeze({ id: "elite", title: "Элитная рамка", rarity: "mythic", weight: 5 }),
  princess: Object.freeze({ id: "princess", title: "Рамка Принцесса", rarity: "legendary", weight: 2 }),
  legendary_frame_1: Object.freeze({ id: "legendary_frame_1", title: "Корона Сердец", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_frame_2: Object.freeze({ id: "legendary_frame_2", title: "Лунное Сияние", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_frame_3: Object.freeze({ id: "legendary_frame_3", title: "Клубничный Дворец", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_frame_4: Object.freeze({ id: "legendary_frame_4", title: "Королевское Кафе", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_frame_5: Object.freeze({ id: "legendary_frame_5", title: "Золотой Бант", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true })
});

const CASE_TRAILS = Object.freeze({
  marshmallow: Object.freeze({ id: "marshmallow", title: "Зефирный след", rarity: "common", weight: 45 }),
  coffee: Object.freeze({ id: "coffee", title: "Кофейный след", rarity: "rare", weight: 25 }),
  marshmallow_splash: Object.freeze({ id: "marshmallow_splash", title: "Зефирный всплеск", rarity: "superrare", weight: 15 }),
  strawberry: Object.freeze({ id: "strawberry", title: "Любовный след", rarity: "epic", weight: 10 }),
  gold: Object.freeze({ id: "gold", title: "Звёздный след", rarity: "mythic", weight: 5 }),
  legendary_trail_1: Object.freeze({ id: "legendary_trail_1", title: "Крылатое Сияние", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_trail_2: Object.freeze({ id: "legendary_trail_2", title: "Облачные Лапки", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_trail_3: Object.freeze({ id: "legendary_trail_3", title: "Золотой Кофейный След", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_trail_4: Object.freeze({ id: "legendary_trail_4", title: "Клубничные Лапки", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true }),
  legendary_trail_5: Object.freeze({ id: "legendary_trail_5", title: "Королевские Лапки", rarity: "legendary", weight: 2, legendaryOnly: true, isNew: true })
});

const CASE_SKINS = Object.freeze({
  barista: Object.freeze({ id: "barista", title: "Бариста", rarity: "rare", weight: 26 }),
  strawberry: Object.freeze({ id: "strawberry", title: "Клубничка", rarity: "rare", weight: 24 }),
  bee: Object.freeze({ id: "bee", title: "Пчёлка", rarity: "superrare", weight: 20 }),
  sailor: Object.freeze({ id: "sailor", title: "Морячок", rarity: "epic", weight: 14 }),
  princess: Object.freeze({ id: "princess", title: "Принцесса", rarity: "mythic", weight: 10 }),
  angel: Object.freeze({ id: "angel", title: "Ангелок", rarity: "legendary", weight: 6 })
});

const CASE_PHYSICAL_REWARDS = Object.freeze({
  zefir: Object.freeze({ id: "zefir", title: PRODUCTS.zefir.title, chance: 0.015 }),
  americano: Object.freeze({ id: "americano", title: PRODUCTS.americano.title, chance: 0.015 }),
  cappuccino: Object.freeze({ id: "cappuccino", title: PRODUCTS.cappuccino.title, chance: 0.015 })
});
const CASE_PHYSICAL_TOTAL_CHANCE = 0.045;

const CASE_BOOSTER_TYPES = Object.freeze(["points", "treats", "coffee"]);
const CASE_DUPLICATE_COMPENSATION = Object.freeze({ skin: 150000, avatar: 500, frame: 1500, trail: 5000 });
const CASE_RARITY_ORDER = Object.freeze({ common: 0, rare: 1, superrare: 2, epic: 3, mythic: 4, legendary: 5 });

const SHOP_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_prices (
  product_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const SHOP_ASSORTMENT_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_assortment (
  product_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const SHOP_STOCK_LIMIT_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_stock_limits (
  scope_key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('skins', 'prize')),
  product_id TEXT NOT NULL DEFAULT '',
  configured_limit INTEGER NOT NULL DEFAULT 0 CHECK(configured_limit >= 0),
  remaining INTEGER NOT NULL DEFAULT 0 CHECK(remaining >= 0),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const SHOP_STOCK_CONSUMPTION_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS shop_stock_consumptions (
  consumption_id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('skins', 'prize')),
  product_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
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

const STAFF_CUSTOM_NAMES_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS staff_custom_names (
  telegram_id TEXT PRIMARY KEY,
  custom_name TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const BOT_SUBSCRIBERS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS bot_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  first_started_at INTEGER NOT NULL,
  last_started_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  last_error TEXT NOT NULL DEFAULT '',
  last_delivery_at INTEGER NOT NULL DEFAULT 0
)`;

const BOT_BROADCASTS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS bot_broadcasts (
  broadcast_id TEXT PRIMARY KEY,
  message_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  report_chat_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK(total_count >= 0),
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK(sent_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_count >= 0),
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0,
  completion_notified INTEGER NOT NULL DEFAULT 0 CHECK(completion_notified IN (0, 1)),
  lease_token TEXT NOT NULL DEFAULT '',
  lease_until INTEGER NOT NULL DEFAULT 0
)`;

const BOT_BROADCAST_DELIVERIES_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS bot_broadcast_deliveries (
  broadcast_id TEXT NOT NULL,
  subscriber_id INTEGER NOT NULL,
  telegram_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  error_text TEXT NOT NULL DEFAULT '',
  attempted_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (broadcast_id, subscriber_id)
)`;

const BOT_STAFF_WORKFLOWS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS bot_staff_workflows (
  telegram_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  flow_type TEXT NOT NULL,
  step TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;

const SUPPORT_TICKETS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  player_telegram_id TEXT NOT NULL DEFAULT '',
  player_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'working', 'resolved', 'rejected')),
  assigned_to TEXT NOT NULL DEFAULT '',
  assigned_to_name TEXT NOT NULL DEFAULT '',
  resolution TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER NOT NULL DEFAULT 0
)`;

const PLAYER_ADMIN_CONTROLS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS player_admin_controls (
  telegram_id TEXT PRIMARY KEY,
  custom_name TEXT NOT NULL DEFAULT '',
  blocked INTEGER NOT NULL DEFAULT 0 CHECK(blocked IN (0, 1)),
  block_reason TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
)`;

const BOT_SYSTEM_STATE_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS bot_system_state (
  state_key TEXT PRIMARY KEY,
  state_value TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
)`;

const BOT_BROADCAST_BATCH_SIZE = 40;
const BOT_BROADCAST_LEASE_SECONDS = 120;
const BOT_BROADCAST_DELAY_MS = 45;
const BOT_BROADCAST_MAX_ATTEMPTS = 3;
const BOT_STAFF_WORKFLOW_TTL_SECONDS = 15 * 60;
const BOT_LOW_STOCK_THRESHOLD = 5;
const BOT_DAILY_REPORT_HOUR = 19;
const REDEEM_UNDO_SECONDS = 5 * 60;

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
const WORKER_BUILD = "0.55";

// Покупки, созданные раньше этой точки, сохраняют свои коды и статусы,
// но больше не занимают лимитные слоты после глобального сброса 0.1.1 Beta.
const REWARD_LIMIT_RESET_AT_SECONDS = 1784805300; // 23.07.2026 11:15 UTC

// НАСТРОЙКИ ВЕРСИИ И РАЗДЕЛА «ОБНОВЛЕНИЕ» В БОТЕ.
// Меняйте эти значения при каждом новом релизе игры.
const GAME_VERSION = "5.1 OPEN BETA";
const GAME_UPDATE_DATE = "26 июля 2026";
const GAME_UPDATE_TITLE = "Обновление 5.1 OPEN BETA";

// Что произошло с прогрессом в этом релизе:
// "reset" — крупное обновление с обнулением прогресса;
// "keep" — обычное обновление с сохранением прогресса.
const GAME_UPDATE_PROGRESS_MODE = "keep";
const GAME_UPDATE_RESET_REASON = "Прогресс в этом обновлении сохраняется.";

const GAME_UPDATE_NOTES = Object.freeze([
  "Добавлен Легендарный кейс со скинами, аватарками, рамками, следами и крупными наградами.",
  "В окне Легендарного кейса теперь показано, сколько открытий осталось до гарантированной награды.",
  "Шансы категорий, ресурсов и усилителей упорядочены от большего к меньшему.",
  "Перебалансированы цены и бонусы скинов, чтобы покупка ощущалась полезнее.",
  "Товары магазина могут иметь ограниченный запас; закончившийся товар нельзя купить до пополнения.",
  "Исправлено отображение подложек очков призовых мест при прокрутке рейтинга.",
  "Системные улучшения и оптимизация."
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
const DEFAULT_SEASON_REWARD_TYPE = "coffee"; // coffee | points | treats | case | skin | item
const DEFAULT_SEASON_REWARD_TITLE = "50 кофе";
const DEFAULT_SEASON_REWARD_IMAGE_URL = ""; // Пусто = стандартная картинка по типу награды
const DEFAULT_SEASON_REWARD_ITEM_ID = "";
const LEADERBOARD_REWARD_ASSETS = Object.freeze({
  coffee: "/assets/rating/frames/coffee.png",
  points: "/assets/shop/currency_star_256x256.png",
  treats: "/assets/shop/dessert_marshmallow_256x256.png",
  case: Object.freeze({
    small: "/assets/cases/standart_closed.png",
    sweet: "/assets/cases/Bronze_close.png",
    gold: "/assets/cases/gold_closed.png",
    legendary: "/assets/cases/legendary_closed.png"
  })
});
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
const DEFAULT_BOT_NEWS_IMAGE_URL = `${DEFAULT_GAME_URL}assets/news/cases-5.0.1.png?v=5.1-open-beta`;
const BOT_NEWS_TITLE = "Обновление 5.1 OPEN BETA";
const BOT_NEWS_TEXT = "В игре появился Легендарный кейс со скинами и косметикой, добавлен счётчик открытий до гаранта, а шансы наград теперь показаны от большего к меньшему. Мы улучшили баланс скинов, работу магазина и исправили отображение призовых мест при прокрутке рейтинга. Системные улучшения и оптимизация.";
const BOT_NEWS_PUBLISHED_AT = Math.floor(Date.parse("2026-07-26T01:00:00+03:00") / 1000);
// =============================================================

const BOT_COMMANDS = Object.freeze([
  { command: "start", description: "Открыть главное меню" },
  { command: "game", description: "Как запустить игру" },
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
  { command: "adminpanel_kmd", description: "Все команды админ-панели" },
  { command: "adminpanel", description: "Открыть админ-панель" },
  { command: "bot_version", description: "Проверить версию Worker" },
  { command: "staff_me", description: "Моя роль и статистика" },
  { command: "player", description: "Карточка игрока" },
  { command: "players", description: "Список игроков" },
  { command: "block", description: "Заблокировать игрока" },
  { command: "unblock", description: "Разблокировать игрока" },
  { command: "banned", description: "Список заблокированных" },
  { command: "note", description: "Добавить заметку игроку" },
  { command: "notes", description: "Заметки игрока" },
  { command: "economy", description: "Экономика игры" },
  { command: "segments", description: "Сегменты игроков" },
  { command: "campaign", description: "Массовая кампания" },
  { command: "campaigns", description: "Кампании и статусы" },
  { command: "fraud", description: "Антифрод и аномалии" },
  { command: "content", description: "Управление косметикой" },
  { command: "cases_admin", description: "Настройки кейсов" },
  { command: "config_history", description: "История настроек" },
  { command: "shop_admin", description: "Управление магазином" },
  { command: "location", description: "Точка и смена сотрудника" },
  { command: "grant", description: "Выдать награду игроку" },
  { command: "redeem", description: "Проверить и выдать физическую награду" },
  { command: "undo_redeem", description: "Отменить ошибочное списание" },
  { command: "stock", description: "Остатки физических наград" },
  { command: "season", description: "Управление рейтингом" },
  { command: "audit", description: "Журнал действий" },
  { command: "ticket", description: "Создать обращение" },
  { command: "tickets", description: "Список обращений" },
  { command: "status", description: "Состояние игры и бота" },
  { command: "daily_report", description: "Сводка за текущий день" },
  { command: "cancel", description: "Отменить текущее действие" },
  { command: "member_staff", description: "Все сотрудники и роли" },
  { command: "set_name", description: "Имя сотрудника в списке" },
  { command: "post", description: "Рассылка владельца пользователям" },
  { command: "members", description: "Все игроки и Telegram ID" },
  { command: "add_keys", description: "Выдать кейс игроку" },
  { command: "add_frame", description: "Выдать рамку игроку" },
  { command: "addprodyct", description: "Добавить товар в магазин" },
  { command: "deletedprodyct", description: "Убрать товар из магазина" },
  { command: "price", description: "Изменить цену товара" },
  { command: "setlimit", description: "Установить остаток товара" },
  { command: "towar", description: "Показать ассортимент магазина" },
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
        return jsonResponse({ ok: true, service: "zefirok-rewards", workerBuild: WORKER_BUILD, gameVersion: GAME_VERSION });
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
            "/api/skins/bonus-case",
            "/api/cases/state",
            "/api/cases/open",
            "/api/cases/open-granted",
            "/api/cases/purchase"
          ]
        });
      }

      if (url.pathname === "/api/bot/health" && request.method === "GET") {
        return await getTelegramBotHealth(env);
      }

      if (url.pathname === "/api/shop/config" && request.method === "GET") {
        return await getShopConfig(env);
      }

      if (url.pathname === "/api/skins/config" && request.method === "GET") {
        return await getSkinConfig(env);
      }

      if (url.pathname === "/api/skins/bonus-case" && request.method === "POST") {
        return await claimSkinPurchaseCaseBonus(request, env);
      }
      if (url.pathname === "/api/skins/purchase" && request.method === "POST") {
        return await purchaseSkinWithStock(request, env);
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

      if (url.pathname === "/api/cases/purchase" && request.method === "POST") {
        return await purchaseCaseFromShop(request, env);
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
  },

  async scheduled(_controller, env, ctx) {
    const webhookTask = ensureTelegramWebhookHealth(env)
      .then(async () => { try { await clearOperationalIssue(env, "telegram-webhook"); } catch {} })
      .catch(async (error) => {
        console.error("Scheduled Telegram webhook health check failed", error);
        try {
          await notifyOperationalIssue(env, "telegram-webhook", `🔴 <b>Проблема Telegram webhook</b>

${escapeHtml(String(error?.message || error).slice(0, 500))}`);
        } catch (notifyError) {
          console.error("Webhook issue notification failed", notifyError);
        }
      });
    const leaderboardTask = (async () => {
      try {
        await ensureSeason(env);
        await clearOperationalIssue(env, "leaderboard");
      } catch (error) {
        console.error("Scheduled leaderboard finalization failed", error);
        try { await notifyOperationalIssue(env, "leaderboard", `🔴 <b>Ошибка рейтинга</b>

${escapeHtml(String(error?.message || error).slice(0, 500))}`); } catch {}
      }
      try {
        await expireLeaderboardRewardsAndNotify(env);
      } catch (error) {
        console.error("Scheduled leaderboard reward expiry failed", error);
      }
      try {
        await processPendingLeaderboardStaffNotifications(env);
      } catch (error) {
        console.error("Scheduled leaderboard notifications failed", error);
      }
    })();
    const broadcastTask = processPendingBotBroadcast(env)
      .then(async () => { try { await clearOperationalIssue(env, "broadcast"); } catch {} })
      .catch(async (error) => {
        console.error("Scheduled bot broadcast failed", error);
        try { await notifyOperationalIssue(env, "broadcast", `🔴 <b>Ошибка рассылки</b>

${escapeHtml(String(error?.message || error).slice(0, 500))}`); } catch {}
      });
    const operationsTask = processStaffOperationsCron(env)
      .then(async () => { try { await clearOperationalIssue(env, "staff-operations"); } catch {} })
      .catch(async (error) => {
        console.error("Scheduled staff operations failed", error);
        try { await notifyOperationalIssue(env, "staff-operations", `🔴 <b>Ошибка центра сотрудников</b>

${escapeHtml(String(error?.message || error).slice(0, 500))}`); } catch {}
      });
    ctx.waitUntil(Promise.allSettled([webhookTask, leaderboardTask, broadcastTask, operationsTask]));
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
    await ensureShopAssortmentSchema(env);
    return jsonResponse({
      ok: true,
      products: await readShopPrices(env),
      assortment: await readShopAssortment(env),
      stock: await readShopStockAvailability(env, "prize", Object.keys(SHOP_ASSORTMENT_PRODUCTS)),
      defaults: DEFAULT_SHOP_PRODUCTS,
      source: "d1"
    });
  } catch (error) {
    console.error("getShopConfig failed", error);
    return jsonResponse({
      ok: true,
      products: cloneDefaultShopProducts(),
      assortment: cloneDefaultShopAssortment(),
      stock: {},
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
    await ensureShopAssortmentSchema(env);
    await env.DB.batch(Object.entries(products).map(([productId, price]) => env.DB.prepare(
      `UPDATE shop_assortment SET points = ?, treats = ?, coffee = ?, updated_at = ?, updated_by = ?
       WHERE product_id = ?`
    ).bind(price.points, price.treats, price.coffee, now, updatedBy, productId)));
    return jsonResponse({
      ok: true,
      products: await readShopPrices(env),
      assortment: await readShopAssortment(env),
      updatedAt: now * 1000
    });
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

function cloneDefaultShopAssortment() {
  return Object.fromEntries(Object.entries(SHOP_ASSORTMENT_PRODUCTS).map(([id, product]) => [id, {
    enabled: true,
    points: safeAdminNumber(product.points),
    treats: safeAdminNumber(product.treats),
    coffee: safeAdminNumber(product.coffee)
  }]));
}

async function ensureShopAssortmentSchema(env) {
  await ensureShopSchema(env);
  await env.DB.prepare(SHOP_ASSORTMENT_SCHEMA_SQL).run();
  const now = Math.floor(Date.now() / 1000);
  const defaults = cloneDefaultShopAssortment();
  const currentPrices = await readShopPrices(env);
  for (const [productId, price] of Object.entries(currentPrices)) {
    if (defaults[productId]) defaults[productId] = { enabled: true, ...price };
  }
  await env.DB.batch(Object.entries(defaults).map(([productId, product]) => env.DB.prepare(
    `INSERT OR IGNORE INTO shop_assortment (
       product_id, enabled, points, treats, coffee, updated_at, updated_by
     ) VALUES (?, 1, ?, ?, ?, ?, 'system')`
  ).bind(productId, product.points, product.treats, product.coffee, now)));
}

async function readShopAssortment(env) {
  const result = await env.DB.prepare(
    `SELECT product_id, enabled, points, treats, coffee FROM shop_assortment ORDER BY product_id ASC`
  ).all();
  const assortment = cloneDefaultShopAssortment();
  for (const row of result.results || []) {
    if (!assortment[row.product_id]) continue;
    assortment[row.product_id] = {
      enabled: Number(row.enabled || 0) === 1,
      points: safeAdminNumber(row.points),
      treats: safeAdminNumber(row.treats),
      coffee: safeAdminNumber(row.coffee)
    };
  }
  return assortment;
}

async function readShopAssortmentProduct(env, productId) {
  const id = String(productId || "");
  const fallback = cloneDefaultShopAssortment()[id];
  if (!fallback) return null;
  const row = await env.DB.prepare(
    `SELECT product_id, enabled, points, treats, coffee FROM shop_assortment WHERE product_id = ? LIMIT 1`
  ).bind(id).first();
  if (!row) return fallback;
  return {
    enabled: Number(row.enabled || 0) === 1,
    points: safeAdminNumber(row.points),
    treats: safeAdminNumber(row.treats),
    coffee: safeAdminNumber(row.coffee)
  };
}

function shopStockScopeKey(category, productId = "") {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const normalizedProduct = String(productId || "").trim().toLowerCase();
  return normalizedProduct ? `${normalizedCategory}:${normalizedProduct}` : `${normalizedCategory}:*`;
}

async function ensureShopStockSchema(env) {
  await env.DB.batch([
    env.DB.prepare(SHOP_STOCK_LIMIT_SCHEMA_SQL),
    env.DB.prepare(SHOP_STOCK_CONSUMPTION_SCHEMA_SQL)
  ]);
}

async function readShopStockRows(env) {
  await ensureShopStockSchema(env);
  const result = await env.DB.prepare(
    `SELECT scope_key, category, product_id, configured_limit, remaining, updated_at
     FROM shop_stock_limits ORDER BY category ASC, product_id ASC`
  ).all();
  return result.results || [];
}

function shopStockAvailabilityFromRows(rows, category, productId) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const normalizedProduct = String(productId || "").trim().toLowerCase();
  const specificKey = shopStockScopeKey(normalizedCategory, normalizedProduct);
  const categoryKey = shopStockScopeKey(normalizedCategory);
  const row = (rows || []).find((item) => String(item.scope_key) === specificKey)
    || (rows || []).find((item) => String(item.scope_key) === categoryKey);
  if (!row) return { limited: false, soldOut: false, remaining: null, limit: null, scope: "" };
  const remaining = safeAdminNumber(row.remaining);
  return {
    limited: true,
    soldOut: remaining <= 0,
    remaining,
    limit: safeAdminNumber(row.configured_limit),
    scope: String(row.scope_key || "")
  };
}

async function readShopStockAvailability(env, category, productIds) {
  const rows = await readShopStockRows(env);
  return Object.fromEntries((productIds || []).map((productId) => [
    productId,
    shopStockAvailabilityFromRows(rows, category, productId)
  ]));
}

async function consumeShopStock(env, { category, productId, consumptionId, telegramId }) {
  await ensureShopStockSchema(env);
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const normalizedProduct = String(productId || "").trim().toLowerCase();
  const normalizedConsumptionId = String(consumptionId || "").trim();
  if (!normalizedConsumptionId) throw new ApiError(400, "Некорректный идентификатор покупки.");

  const existing = await env.DB.prepare(
    `SELECT scope_key FROM shop_stock_consumptions WHERE consumption_id = ? LIMIT 1`
  ).bind(normalizedConsumptionId).first();
  if (existing) {
    const rows = await readShopStockRows(env);
    return { repeated: true, ...shopStockAvailabilityFromRows(rows, normalizedCategory, normalizedProduct) };
  }

  const rows = await readShopStockRows(env);
  const availability = shopStockAvailabilityFromRows(rows, normalizedCategory, normalizedProduct);
  if (!availability.limited) return availability;
  if (availability.soldOut) throw new ApiError(409, "Товар закончился, загляните позже.");

  const now = Math.floor(Date.now() / 1000);
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO shop_stock_consumptions (
       consumption_id, scope_key, category, product_id, telegram_id, created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(normalizedConsumptionId, availability.scope, normalizedCategory, normalizedProduct, String(telegramId || ""), now).run();
  if (safeAdminNumber(inserted?.meta?.changes) < 1) {
    return { repeated: true, ...availability };
  }

  const decremented = await env.DB.prepare(
    `UPDATE shop_stock_limits SET remaining = remaining - 1
     WHERE scope_key = ? AND remaining > 0`
  ).bind(availability.scope).run();
  if (safeAdminNumber(decremented?.meta?.changes) < 1) {
    await env.DB.prepare(`DELETE FROM shop_stock_consumptions WHERE consumption_id = ?`).bind(normalizedConsumptionId).run();
    throw new ApiError(409, "Товар закончился, загляните позже.");
  }

  const updated = await env.DB.prepare(
    `SELECT configured_limit, remaining FROM shop_stock_limits WHERE scope_key = ? LIMIT 1`
  ).bind(availability.scope).first();
  return {
    limited: true,
    soldOut: safeAdminNumber(updated?.remaining) <= 0,
    remaining: safeAdminNumber(updated?.remaining),
    limit: safeAdminNumber(updated?.configured_limit),
    scope: availability.scope,
    repeated: false
  };
}

async function releaseShopStock(env, consumptionId) {
  const normalizedConsumptionId = String(consumptionId || "").trim();
  if (!normalizedConsumptionId) return;
  await ensureShopStockSchema(env);
  const row = await env.DB.prepare(
    `SELECT scope_key FROM shop_stock_consumptions WHERE consumption_id = ? LIMIT 1`
  ).bind(normalizedConsumptionId).first();
  if (!row?.scope_key) return;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM shop_stock_consumptions WHERE consumption_id = ?`).bind(normalizedConsumptionId),
    env.DB.prepare(
      `UPDATE shop_stock_limits
       SET remaining = MIN(configured_limit, remaining + 1)
       WHERE scope_key = ?`
    ).bind(String(row.scope_key))
  ]);
}

async function claimSkinPurchaseCaseBonus(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const skinId = String(body.skinId || "").trim().toLowerCase();
    const bonus = SKIN_PURCHASE_CASE_BONUSES[skinId];
    if (!bonus) throw new ApiError(400, "Для этого скина подарочный кейс не предусмотрен.");
    const ownedSkins = new Set(
      (Array.isArray(body.ownedSkins) ? body.ownedSkins : [])
        .map((value) => String(value || "").trim().toLowerCase())
        .filter((value) => SKINS[value])
    );
    if (!ownedSkins.has(skinId)) throw new ApiError(409, "Сначала купите этот скин.");

    const current = normalizeAdminProfile(body.current || {});
    await ensureCasePlayerState(env, telegramId, current);
    const now = Math.floor(Date.now() / 1000);
    const grantId = `skinbonus_${telegramId}_${skinId}_${bonus.version.replace(/[^a-z0-9_-]/gi, "")}`;
    const inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO granted_cases (
         id, telegram_id, case_type, status, granted_by, reason, created_at
       ) VALUES (?, ?, ?, 'pending', 'skin-bonus', ?, ?)`
    ).bind(grantId, telegramId, bonus.caseType, `Подарок за образ «${SKINS[skinId]?.title || skinId}»`, now).run();
    const granted = safeAdminNumber(inserted?.meta?.changes) > 0;
    return jsonResponse(await buildCasePayload(env, telegramId, current, {
      bonusCase: {
        skinId,
        caseType: bonus.caseType,
        title: bonus.title,
        granted,
        repeated: !granted
      }
    }));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("claimSkinPurchaseCaseBonus failed", error);
    return jsonResponse({ ok: false, error: "Не удалось выдать подарочный кейс за скин." }, 500);
  }
}

async function purchaseSkinWithStock(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const skinId = String(body.skinId || "").trim().toLowerCase();
    if (!SKINS[skinId] || skinId === "default") throw new ApiError(400, "Неизвестный скин.");
    const telegramId = String(auth.user.id);
    const stock = await consumeShopStock(env, {
      category: "skins",
      productId: skinId,
      consumptionId: `skin:${telegramId}:${skinId}`,
      telegramId
    });
    return jsonResponse({ ok: true, skinId, stock });
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message, details: error.details }, error.status);
    console.error("purchaseSkinWithStock failed", error);
    return jsonResponse({ ok: false, error: "Не удалось подтвердить покупку скина." }, 500);
  }
}

async function getSkinConfig(env) {
  try {
    requireDatabase(env);
    await ensureSkinPriceSchema(env);
    return jsonResponse({
      ok: true,
      skins: await readSkinPrices(env),
      stock: await readShopStockAvailability(env, "skins", Object.keys(SKINS).filter((id) => id !== "default")),
      defaults: DEFAULT_SKIN_PRICES,
      source: "d1"
    });
  } catch (error) {
    console.error("getSkinConfig failed", error);
    return jsonResponse({
      ok: true,
      skins: cloneDefaultSkinPrices(),
      stock: {},
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
  const statements = [];
  for (const [skinId, price] of Object.entries(DEFAULT_SKIN_PRICES)) {
    statements.push(env.DB.prepare(
      `INSERT OR IGNORE INTO skin_prices (
        skin_id, points, treats, coffee, version, updated_at, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'system')`
    ).bind(skinId, price.points, price.treats, price.coffee, DEFAULT_SKIN_PRICE_VERSION, now));
    statements.push(env.DB.prepare(
      `UPDATE skin_prices SET
        points = ?, treats = ?, coffee = ?, version = ?, updated_at = ?, updated_by = 'balance-v2'
       WHERE skin_id = ? AND version < ?`
    ).bind(price.points, price.treats, price.coffee, DEFAULT_SKIN_PRICE_VERSION, now, skinId, DEFAULT_SKIN_PRICE_VERSION));
  }
  await env.DB.batch(statements);
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

    // Снимок коллекции и активного скина обновляется при каждой синхронизации профиля.
    // Старые клиенты, которые не передают эти поля, существующий снимок не перезаписывают.
    await ensureCasePlayerState(env, telegramId, {
      ...current,
      ownedSkins: Array.isArray(body.current?.ownedSkins) ? body.current.ownedSkins : undefined,
      activeSkin: String(body.current?.activeSkin || "")
    });

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
    await ensureShopAssortmentSchema(env);
    const assortmentProduct = await readShopAssortmentProduct(env, product.id);
    if (!assortmentProduct?.enabled) throw new ApiError(409, "Этот товар временно убран из ассортимента.");

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
    const stockConsumptionId = `reward:${ownerId}:${requestId}`;
    const stock = await consumeShopStock(env, {
      category: "prize",
      productId: product.id,
      consumptionId: stockConsumptionId,
      telegramId: ownerId
    });

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
        if (!stock.repeated) await releaseShopStock(env, stockConsumptionId);
        throw error;
      }
    }

    if (!insertedCode) {
      if (!stock.repeated) await releaseShopStock(env, stockConsumptionId);
      throw new ApiError(503, "Не удалось создать уникальный код. Повторите покупку.");
    }

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
      limitStatus: updatedLimitStatus,
      stock
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
       AND request_id NOT LIKE 'case_reward_%'
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


function normalizeLeaderboardRewardType(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (["points", "point", "currency", "score", "очки", "поинты"].includes(raw)) return "points";
  if (["treats", "treat", "marshmallow", "zefir", "zephyr", "зефир", "зефиры"].includes(raw)) return "treats";
  if (["coffee", "coffees", "кофе"].includes(raw)) return "coffee";
  if (raw === "case" || raw === "cases" || raw === "кейс" || raw === "кейсы" || /^case[-_:]/.test(raw) || normalizeCaseType(raw)) return "case";
  if (raw === "skin" || raw === "item") return raw;
  return raw || "coffee";
}

function leaderboardCaseRewardMeta(caseTypeValue) {
  const caseType = normalizeCaseType(caseTypeValue) || "small";
  const config = LEVEL_CASE_CONFIG[caseType] || LEVEL_CASE_CONFIG.small;
  return {
    caseType,
    title: String(config?.title || "Обычный кейс"),
    imageUrl: String(LEADERBOARD_REWARD_ASSETS.case[caseType] || LEADERBOARD_REWARD_ASSETS.case.small)
  };
}

function leaderboardRewardPresentation(typeValue, amountValue, itemIdValue = "", customTitle = "", customImageUrl = "") {
  const rawType = String(typeValue || "coffee").trim().toLowerCase();
  const type = normalizeLeaderboardRewardType(rawType);
  const amount = Math.max(1, Math.floor(Number(amountValue) || 1));
  let itemId = String(itemIdValue || "").trim();
  let title = String(customTitle || "").trim();
  let imageUrl = String(customImageUrl || "").trim();

  if (type === "case") {
    const typeSuffix = rawType.match(/^case[-_:](.+)$/)?.[1] || "";
    const meta = leaderboardCaseRewardMeta(itemId || typeSuffix || rawType);
    itemId = meta.caseType;
    if (!title) title = amount === 1 ? meta.title : `${amount.toLocaleString("ru-RU")} × ${meta.title}`;
    if (!imageUrl) imageUrl = meta.imageUrl;
  } else if (type === "coffee") {
    if (!title) title = `${amount.toLocaleString("ru-RU")} кофе`;
    if (!imageUrl) imageUrl = LEADERBOARD_REWARD_ASSETS.coffee;
  } else if (type === "points") {
    if (!title) title = `${amount.toLocaleString("ru-RU")} очков`;
    if (!imageUrl) imageUrl = LEADERBOARD_REWARD_ASSETS.points;
  } else if (type === "treats") {
    if (!title) title = `${amount.toLocaleString("ru-RU")} зефира`;
    if (!imageUrl) imageUrl = LEADERBOARD_REWARD_ASSETS.treats;
  } else if (!title) {
    title = "Сезонная награда";
  }

  return { type, amount, title, imageUrl, itemId };
}

function configuredSeason(env) {
  const id = String(env.LEADERBOARD_SEASON_ID || DEFAULT_SEASON_ID).trim() || DEFAULT_SEASON_ID;
  const title = String(env.LEADERBOARD_SEASON_TITLE || DEFAULT_SEASON_TITLE).trim() || DEFAULT_SEASON_TITLE;
  const startsAt = parseConfiguredDate(env.LEADERBOARD_SEASON_START_AT || DEFAULT_SEASON_START_AT, "дата старта сезона");
  const endsAt = parseConfiguredDate(env.LEADERBOARD_SEASON_END_AT || DEFAULT_SEASON_END_AT, "дата завершения сезона");
  if (endsAt <= startsAt) throw new ApiError(500, "Дата завершения сезона должна быть позже даты старта.");
  const rawRewardType = String(env.LEADERBOARD_REWARD_TYPE || DEFAULT_SEASON_REWARD_TYPE).trim() || DEFAULT_SEASON_REWARD_TYPE;
  const rawRewardAmount = positiveInt(env.LEADERBOARD_REWARD_AMOUNT || env.LEADERBOARD_REWARD_COFFEE, DEFAULT_SEASON_REWARD_COFFEE);
  const rewardTitleOverride = env.LEADERBOARD_REWARD_TITLE !== undefined
    ? String(env.LEADERBOARD_REWARD_TITLE || "").trim()
    : "";
  const rewardImageOverride = env.LEADERBOARD_REWARD_IMAGE_URL !== undefined
    ? String(env.LEADERBOARD_REWARD_IMAGE_URL || "").trim()
    : DEFAULT_SEASON_REWARD_IMAGE_URL;
  const rewardItemOverride = env.LEADERBOARD_REWARD_ITEM_ID !== undefined
    ? String(env.LEADERBOARD_REWARD_ITEM_ID || "").trim()
    : DEFAULT_SEASON_REWARD_ITEM_ID;
  const reward = leaderboardRewardPresentation(rawRewardType, rawRewardAmount, rewardItemOverride, rewardTitleOverride, rewardImageOverride);
  return {
    id,
    title,
    startsAt,
    endsAt,
    rewardType: reward.type,
    rewardAmount: reward.amount,
    rewardTitle: reward.title,
    rewardImageUrl: reward.imageUrl,
    rewardItemId: reward.itemId,
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
      reward_claim_days, reset_plan_json, reward_title, reward_image_url,
      reward_item_id, manual_override, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.title ELSE excluded.title END,
      starts_at = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.starts_at ELSE excluded.starts_at END,
      ends_at = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.ends_at ELSE excluded.ends_at END,
      reward_type = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_type ELSE excluded.reward_type END,
      reward_amount = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_amount ELSE excluded.reward_amount END,
      reward_title = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_title ELSE excluded.reward_title END,
      reward_image_url = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_image_url ELSE excluded.reward_image_url END,
      reward_item_id = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_item_id ELSE excluded.reward_item_id END,
      reward_claim_days = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reward_claim_days ELSE excluded.reward_claim_days END,
      reset_plan_json = CASE WHEN leaderboard_seasons.manual_override = 1 THEN leaderboard_seasons.reset_plan_json ELSE excluded.reset_plan_json END,
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
    config.rewardTitle,
    config.rewardImageUrl,
    config.rewardItemId,
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
    `SELECT telegram_id, display_name, username, best_score
     FROM leaderboard_entries
     WHERE season_id = ? AND hidden = 0
     ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC
     LIMIT 1`
  ).bind(season.id).first();

  if (!winner) {
    await env.DB.prepare(
      `UPDATE leaderboard_seasons
       SET status = 'ended', finalized_at = COALESCE(finalized_at, ?), updated_at = ?
       WHERE id = ?`
    ).bind(now, now, season.id).run();
    await queueLeaderboardStaffNotification(
      env,
      `leaderboard-season-ended:${season.id}`,
      leaderboardSeasonNotificationText({ season, winner: null, reward: null, status: "no_winner", reason: "В рейтинге нет участников." }, env)
    );
    return;
  }

  const config = configuredSeason(env);
  const rewardType = String(season.reward_type || config.rewardType || "coffee");
  const rewardId = `${season.id}:${winner.telegram_id}:1:${rewardType}`;
  const claimDays = positiveInt(season.reward_claim_days, DEFAULT_SEASON_REWARD_CLAIM_DAYS);
  const expiresAt = Math.max(now, Number(season.ends_at || now)) + claimDays * 24 * 60 * 60;
  let reward = null;
  try {
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
      String(season.reward_item_id || config.rewardItemId || ""),
      now,
      expiresAt
    ).run();
    reward = await env.DB.prepare(`SELECT * FROM leaderboard_rewards WHERE id = ? LIMIT 1`).bind(rewardId).first();
    if (!reward) throw new Error("Запись сезонной награды не была создана.");
  } catch (error) {
    const reason = leaderboardNotificationErrorReason(error);
    await queueLeaderboardStaffNotification(
      env,
      `leaderboard-season-reward-failed:${season.id}:${leaderboardNotificationReasonKey(reason)}`,
      leaderboardSeasonNotificationText({ season, winner, reward: null, status: "failed", reason }, env)
    );
    throw error;
  }

  await env.DB.prepare(
    `UPDATE leaderboard_seasons
     SET status = 'ended', finalized_at = COALESCE(finalized_at, ?), updated_at = ?
     WHERE id = ?`
  ).bind(now, now, season.id).run();

  await queueLeaderboardStaffNotification(
    env,
    `leaderboard-season-ended:${season.id}`,
    leaderboardSeasonNotificationText({ season, winner, reward, status: "pending", reason: "" }, env)
  );
}


function leaderboardNotificationErrorReason(error) {
  const message = String(error?.message || error?.description || "Неизвестная ошибка.").trim();
  return message.slice(0, 500) || "Неизвестная ошибка.";
}

function leaderboardNotificationReasonKey(reason) {
  return String(reason || "unknown")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90) || "unknown";
}

function leaderboardRewardNotificationTitle(reward, season, env) {
  const config = configuredSeason(env);
  const rawType = reward?.reward_type || season?.reward_type || config.rewardType;
  const sameConfiguredType = normalizeLeaderboardRewardType(rawType) === normalizeLeaderboardRewardType(config.rewardType);
  const presentation = leaderboardRewardPresentation(
    rawType,
    reward?.reward_amount ?? season?.reward_amount ?? config.rewardAmount,
    reward?.reward_item_id || season?.reward_item_id || (sameConfiguredType ? config.rewardItemId : ""),
    season?.reward_title || (sameConfiguredType ? config.rewardTitle : ""),
    season?.reward_image_url || (sameConfiguredType ? config.rewardImageUrl : "")
  );
  if (presentation.type === "skin" && !String(season?.reward_title || "").trim()) {
    return presentation.itemId ? `Скин ${presentation.itemId}` : "Сезонный скин";
  }
  return presentation.title;
}

function leaderboardWinnerNotificationLines(winner) {
  if (!winner) return ["Игрок: <b>не определён</b>"];
  const name = String(winner.display_name || "Гость кафе").trim() || "Гость кафе";
  const username = String(winner.username || "").trim().replace(/^@/, "");
  const lines = [
    `Игрок: <b>${escapeHtml(name)}</b>`,
    `Telegram ID: <code>${escapeHtml(String(winner.telegram_id || ""))}</code>`
  ];
  if (username) lines.push(`Имя пользователя: @${escapeHtml(username)}`);
  if (Number.isFinite(Number(winner.best_score))) lines.push(`Результат: <b>${Number(winner.best_score || 0).toLocaleString("ru-RU")}</b>`);
  return lines;
}

function leaderboardSeasonNotificationText({ season, winner, reward, status, reason }, env) {
  const seasonTitle = String(season?.title || "Сезон рейтинга");
  const lines = [
    status === "failed" ? "❌ <b>Ошибка завершения сезона рейтинга</b>" : status === "no_winner" ? "⚠️ <b>Сезон рейтинга завершён без победителя</b>" : "🏆 <b>Сезон рейтинга завершён</b>",
    "",
    ...leaderboardWinnerNotificationLines(winner),
    ...(winner ? [`Место: <b>1</b>`] : []),
    `Сезон: <b>${escapeHtml(seasonTitle)}</b>`
  ];
  if (reward) lines.push(`Награда: <b>${escapeHtml(leaderboardRewardNotificationTitle(reward, season, env))}</b>`);
  else lines.push("Награда: <b>не выдана</b>");
  lines.push("");
  if (status === "pending") lines.push("Статус: 🕒 награда подготовлена и ожидает получения игроком.");
  if (status === "no_winner") lines.push(`Статус: ❌ награда не получена.\nПричина: <b>${escapeHtml(String(reason || "В рейтинге нет участников."))}</b>`);
  if (status === "failed") lines.push(`Статус: ❌ награда не получена.\nПричина: <b>${escapeHtml(String(reason || "Неизвестная ошибка."))}</b>`);
  return lines.join("\n");
}


function leaderboardClaimNotificationText({ season, winner, reward, success, reason }, env) {
  const seasonTitle = String(season?.title || configuredSeason(env).title || "Сезон рейтинга");
  const lines = [
    success ? "✅ <b>Награда рейтинга успешно получена</b>" : "❌ <b>Награда рейтинга не получена</b>",
    "",
    ...leaderboardWinnerNotificationLines(winner),
    `Место: <b>${Number(reward?.place || 1)}</b>`,
    `Сезон: <b>${escapeHtml(seasonTitle)}</b>`,
    `Награда: <b>${escapeHtml(leaderboardRewardNotificationTitle(reward, season, env))}</b>`,
    "",
    success ? "Статус: ✅ награда успешно получена игроком." : `Статус: ❌ награда не получена.\nПричина: <b>${escapeHtml(String(reason || "Неизвестная ошибка."))}</b>`
  ];
  return lines.join("\n");
}

async function leaderboardStaffRecipientIds(env) {
  const recipients = new Set(botAdminTelegramIds(env));
  const rows = await env.DB.prepare(
    `SELECT telegram_id, role FROM staff_users WHERE active = 1`
  ).all();
  for (const row of rows.results || []) {
    if (normalizeTeamRole(row.role) === "administrator") recipients.add(String(row.telegram_id || ""));
  }
  return [...recipients].filter(Boolean);
}

async function queueLeaderboardStaffNotification(env, eventKey, messageHtml) {
  try {
    const recipients = await leaderboardStaffRecipientIds(env);
    if (!recipients.length) return { queued: 0, sent: 0 };
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch(recipients.map((telegramId) => env.DB.prepare(
      `INSERT OR IGNORE INTO leaderboard_staff_notifications (
         event_key, recipient_telegram_id, message_html, status,
         attempts, last_error, created_at, updated_at, sent_at
       ) VALUES (?, ?, ?, 'pending', 0, '', ?, ?, 0)`
    ).bind(String(eventKey), telegramId, String(messageHtml), now, now)));
    const delivery = await processPendingLeaderboardStaffNotifications(env, Math.max(20, recipients.length));
    return { queued: recipients.length, sent: delivery.sent };
  } catch (error) {
    console.error("Queue leaderboard staff notification failed", error);
    return { queued: 0, sent: 0 };
  }
}

async function expireLeaderboardRewardsAndNotify(env, now = Math.floor(Date.now() / 1000)) {
  const rows = await env.DB.prepare(
    `SELECT r.*, s.title AS season_title, s.reward_type AS season_reward_type, s.reward_amount AS season_reward_amount,
            e.display_name, e.username, e.best_score
     FROM leaderboard_rewards r
     LEFT JOIN leaderboard_seasons s ON s.id = r.season_id
     LEFT JOIN leaderboard_entries e ON e.season_id = r.season_id AND e.telegram_id = r.telegram_id
     WHERE r.status = 'pending' AND r.expires_at <= ?
     ORDER BY r.expires_at ASC
     LIMIT 50`
  ).bind(now).all();
  let expired = 0;
  for (const row of rows.results || []) {
    const result = await env.DB.prepare(
      `UPDATE leaderboard_rewards SET status = 'expired' WHERE id = ? AND status = 'pending'`
    ).bind(row.id).run();
    if (Number(result.meta?.changes || 0) !== 1) continue;
    expired += 1;
    const season = {
      id: String(row.season_id || ""),
      title: String(row.season_title || "Сезон рейтинга"),
      reward_type: String(row.season_reward_type || row.reward_type || "coffee"),
      reward_amount: Number(row.season_reward_amount ?? row.reward_amount ?? 0)
    };
    const winner = {
      telegram_id: String(row.telegram_id || ""),
      display_name: String(row.display_name || "Гость кафе"),
      username: String(row.username || ""),
      best_score: Number(row.best_score || 0)
    };
    const reward = { ...row, status: "expired" };
    const reason = "Срок получения награды истёк.";
    await queueLeaderboardStaffNotification(
      env,
      `leaderboard-reward-claim-failed:${row.id}:${leaderboardNotificationReasonKey(reason)}`,
      leaderboardClaimNotificationText({ season, winner, reward, success: false, reason }, env)
    );
  }
  return { expired };
}

async function processPendingLeaderboardStaffNotifications(env, limitValue = 30) {
  const limit = Math.max(1, Math.min(100, Math.floor(Number(limitValue) || 30)));
  const rows = await env.DB.prepare(
    `SELECT id, recipient_telegram_id, message_html, attempts
     FROM leaderboard_staff_notifications
     WHERE status IN ('pending', 'failed') AND attempts < 5
     ORDER BY created_at ASC, id ASC
     LIMIT ?`
  ).bind(limit).all();
  let sent = 0;
  let failed = 0;
  for (const row of rows.results || []) {
    const now = Math.floor(Date.now() / 1000);
    try {
      await sendTelegramMessage(env, String(row.recipient_telegram_id), String(row.message_html || ""));
      await env.DB.prepare(
        `UPDATE leaderboard_staff_notifications
         SET status = 'sent', attempts = attempts + 1, last_error = '', updated_at = ?, sent_at = ?
         WHERE id = ?`
      ).bind(now, now, row.id).run();
      sent += 1;
    } catch (error) {
      const permanent = isPermanentTelegramDeliveryError(error);
      const attempts = permanent ? 5 : Math.max(1, Number(row.attempts || 0) + 1);
      await env.DB.prepare(
        `UPDATE leaderboard_staff_notifications
         SET status = 'failed', attempts = ?, last_error = ?, updated_at = ?
         WHERE id = ?`
      ).bind(attempts, leaderboardNotificationErrorReason(error), now, row.id).run();
      failed += 1;
    }
  }
  return { sent, failed, processed: sent + failed };
}


function normalizeCaseType(value) {
  const raw = String(value || "").trim().toLowerCase();
  const aliases = {
    small: "small", mini: "small", little: "small", "маленький": "small", "малый": "small", standart: "small", standard: "small", common: "small", "обычный": "small",
    sweet: "sweet", silver: "sweet", "сладкий": "sweet", "средний": "sweet", "серебряный": "sweet",
    gold: "gold", golden: "gold", "золотой": "gold",
    legendary: "legendary", legend: "legendary", "легендарный": "legendary", "легенда": "legendary"
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

function leaderboardCaseGrantId(rewardId, index) {
  const safe = String(rewardId || "season_reward")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .slice(0, 120);
  return `leaderboard_${safe}_${Math.max(1, Number(index) || 1)}`;
}

async function createLeaderboardGrantedCases(env, reward, season = null) {
  const presentation = leaderboardRewardPresentation(
    reward?.reward_type || season?.reward_type || "case",
    reward?.reward_amount || season?.reward_amount || 1,
    reward?.reward_item_id || season?.reward_item_id || "small",
    season?.reward_title || "",
    season?.reward_image_url || ""
  );
  if (presentation.type !== "case") return { caseType: "", quantity: 0 };
  const caseType = normalizeCaseType(presentation.itemId);
  if (!caseType) throw new ApiError(400, "Для сезонной награды указан неизвестный тип кейса.");
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(presentation.amount) || 1)));
  const now = Math.floor(Date.now() / 1000);
  const statements = Array.from({ length: quantity }, (_, index) => env.DB.prepare(
    `INSERT OR IGNORE INTO granted_cases (
       id, telegram_id, case_type, status, granted_by, reason, created_at
     ) VALUES (?, ?, ?, 'pending', 'leaderboard', ?, ?)`
  ).bind(
    leaderboardCaseGrantId(reward?.id, index + 1),
    String(reward?.telegram_id || ""),
    caseType,
    `Награда за ${Number(reward?.place || 1)} место в рейтинге`,
    now
  ));
  await env.DB.batch(statements);
  return { caseType, quantity };
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

const CASE_FRAME_ALIASES = Object.freeze({ mint: "lovers", flower: "lovers", gold: "princess" });
function normalizeCaseCosmeticId(kind, value) {
  let id = String(value || "").trim();
  if (!id) return "";
  if (kind === "frame" && CASE_FRAME_ALIASES[id]) id = CASE_FRAME_ALIASES[id];
  if (kind === "avatar") return CASE_AVATARS[id] ? id : "";
  if (kind === "frame") return CASE_FRAMES[id] ? id : "";
  if (kind === "trail") return CASE_TRAILS[id] ? id : "";
  return "";
}

function caseParseOwned(raw, kind, catalog) {
  let values = [];
  try { values = JSON.parse(String(raw || "[]")); } catch {}
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizeCaseCosmeticId(kind, value))
    .filter((value) => Boolean(value && catalog[value]))));
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

function caseWeightedCatalogChoice(catalog, excluded = new Set(), predicate = null) {
  const sourceEntries = Object.entries(catalog || {});
  const filtered = sourceEntries.filter(([id, item]) => !excluded.has(id) && (!predicate || predicate(item, id)));
  const fallback = sourceEntries.filter(([, item]) => !predicate || predicate(item));
  const pool = filtered.length ? filtered : fallback;
  const total = pool.reduce((sum, [, item]) => sum + Math.max(0, Number(item?.weight || 1)), 0);
  if (!pool.length || total <= 0) return null;
  let roll = caseSecureFloat() * total;
  for (const [id, item] of pool) {
    roll -= Math.max(0, Number(item?.weight || 1));
    if (roll < 0) return id;
  }
  return pool[pool.length - 1][0];
}

function caseRarityAtLeast(minRarity) {
  const threshold = CASE_RARITY_ORDER[String(minRarity || "")] ?? 0;
  return (item) => (CASE_RARITY_ORDER[String(item?.rarity || "common")] ?? 0) >= threshold;
}

function caseCatalogHasUnowned(catalog, ownedValues, predicate = null) {
  const owned = new Set(Array.isArray(ownedValues) ? ownedValues : []);
  return Object.entries(catalog || {}).some(([id, item]) => (!predicate || predicate(item, id)) && !owned.has(id));
}

function caseWeightedKind(caseType, state = null, liveops = null, catalogs = null) {
  const caseConfig = liveOpsCaseConfig(liveops, caseType);
  const chances = { ...(caseConfig?.chances || LIVEOPS_CASE_DEFAULTS[caseType]?.chances || {}) };
  const runtimeCatalogs = catalogs || {
    avatar: runtimeCaseCatalog("avatar", CASE_AVATARS, liveops),
    frame: runtimeCaseCatalog("frame", CASE_FRAMES, liveops),
    trail: runtimeCaseCatalog("trail", CASE_TRAILS, liveops),
    skin: runtimeCaseCatalog("skin", CASE_SKINS, liveops)
  };
  const ownedMap = {
    avatar: state?.ownedAvatars,
    frame: state?.ownedFrames,
    trail: state?.ownedTrails,
    skin: state?.ownedSkins
  };
  const categoryOrder = ["points", "treats", "coffee", "booster", "avatar", "frame", "trail", "skin", "physical"];
  let pointsWeight = Math.max(0, Number(chances.points || 0));
  const table = [];
  for (const kind of categoryOrder) {
    let weight = Math.max(0, Number(chances[kind] || 0));
    if (!weight || kind === "points") continue;
    if (["avatar", "frame", "trail", "skin"].includes(kind)) {
      const catalog = runtimeCatalogs[kind] || {};
      const predicate = (item) => caseType === "legendary" || !item?.legendaryOnly;
      const available = caseType === "legendary"
        ? caseCatalogHasUnowned(catalog, ownedMap[kind], predicate)
        : Object.values(catalog).some(predicate);
      if (!available) {
        pointsWeight += weight;
        continue;
      }
    }
    table.push([kind, weight]);
  }
  if (pointsWeight > 0) table.unshift(["points", pointsWeight]);
  if (!table.length) return "points";
  const total = table.reduce((sum, [, weight]) => sum + Math.max(0, Number(weight) || 0), 0);
  if (total <= 0) return "points";
  let roll = caseSecureFloat() * total;
  for (const [kind, weight] of table) {
    roll -= Math.max(0, Number(weight) || 0);
    if (roll < 0) return kind;
  }
  return table[table.length - 1][0];
}

function caseCurrencyRange(caseType, kind, liveops = null) {
  const configured = liveOpsCaseConfig(liveops, caseType)?.ranges?.[kind];
  if (Array.isArray(configured) && configured.length >= 2) {
    const min = Math.max(0, Math.floor(Number(configured[0]) || 0));
    const max = Math.max(min, Math.floor(Number(configured[1]) || min));
    return [min, max];
  }
  const fallback = LIVEOPS_CASE_DEFAULTS[caseType]?.ranges?.[kind];
  if (Array.isArray(fallback)) return [Number(fallback[0] || 0), Number(fallback[1] || 0)];
  return [0, 0];
}

function caseStateFromRow(row) {
  const activeType = CASE_BOOSTER_TYPES.includes(String(row?.active_booster_type || ""))
    ? String(row.active_booster_type)
    : "";
  const activeRuns = activeType ? Math.max(0, Math.min(2, safeAdminNumber(row?.active_booster_runs))) : 0;
  const ownedAvatars = caseParseOwned(row?.owned_avatars_json, "avatar", CASE_AVATARS);
  const ownedFrames = caseParseOwned(row?.owned_frames_json, "frame", CASE_FRAMES);
  const ownedTrails = caseParseOwned(row?.owned_trails_json, "trail", CASE_TRAILS);
  let ownedSkinsRaw = [];
  try { ownedSkinsRaw = JSON.parse(String(row?.owned_skins_json || "[]")); } catch {}
  const ownedSkins = normalizeCurrentOwnedSkins(ownedSkinsRaw);
  const activeSkinId = normalizeCurrentActiveSkin(row?.active_skin_id, ownedSkins);
  const activeAvatarCandidate = normalizeCaseCosmeticId("avatar", row?.active_avatar_id);
  const activeFrameCandidate = normalizeCaseCosmeticId("frame", row?.active_frame_id);
  const activeTrailCandidate = normalizeCaseCosmeticId("trail", row?.active_trail_id);
  const activeAvatarId = ownedAvatars.includes(activeAvatarCandidate) ? activeAvatarCandidate : "";
  const activeFrameId = ownedFrames.includes(activeFrameCandidate) ? activeFrameCandidate : "";
  const activeTrailId = ownedTrails.includes(activeTrailCandidate) ? activeTrailCandidate : "";
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
    ownedSkins,
    activeSkinId,
    legendaryPityCounter: safeAdminNumber(row?.legendary_pity_counter),
    legendaryGuaranteedEvery: 50,
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
      owned_skins_json = ?, active_skin_id = ?,
      legendary_pity_counter = ?,
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
    JSON.stringify(normalizeCurrentOwnedSkins(caseState.ownedSkins)),
    normalizeCurrentActiveSkin(caseState.activeSkinId, normalizeCurrentOwnedSkins(caseState.ownedSkins)),
    Math.max(0, Math.min(49, safeAdminNumber(caseState.legendaryPityCounter))),
    now,
    telegramId
  );
}

async function ensureCasePlayerState(env, telegramId, currentProfile) {
  const now = Math.floor(Date.now() / 1000);
  const current = normalizeAdminProfile(currentProfile || {});
  const hasSkinSnapshot = Array.isArray(currentProfile?.ownedSkins);
  const snapshotOwnedSkins = hasSkinSnapshot ? normalizeCurrentOwnedSkins(currentProfile.ownedSkins) : [];
  const snapshotActiveSkin = hasSkinSnapshot ? normalizeCurrentActiveSkin(currentProfile?.activeSkin, snapshotOwnedSkins) : "";
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
  if (hasSkinSnapshot) {
    await env.DB.prepare(
      `UPDATE case_player_state SET owned_skins_json = ?, active_skin_id = ?, updated_at = ? WHERE telegram_id = ?`
    ).bind(JSON.stringify(snapshotOwnedSkins), snapshotActiveSkin, now, telegramId).run();
  }
  const profile = await env.DB.prepare(
    `SELECT wallet, best_score, treats, coffee, profile_xp, revision, updated_at
     FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(telegramId).first();
  const row = await env.DB.prepare(
    `SELECT * FROM case_player_state WHERE telegram_id = ? LIMIT 1`
  ).bind(telegramId).first();
  return { now, profile, row, state: caseStateFromRow(row) };
}

function normalizeCurrentOwnedSkins(value) {
  const ids = Array.isArray(value) ? value : [];
  return [...new Set(ids.map((item) => String(item || "").trim()).filter((item) => item && item !== "default" && Object.prototype.hasOwnProperty.call(CASE_SKINS, item)))];
}

function normalizeCurrentActiveSkin(value, ownedSkins = []) {
  const id = String(value || "").trim();
  if (!id || id === "default") return "default";
  return Array.isArray(ownedSkins) && ownedSkins.includes(id) && Object.prototype.hasOwnProperty.call(CASE_SKINS, id) ? id : "default";
}

async function buildCasePayload(env, telegramId, currentProfile, extra = {}) {
  const ensured = await ensureCasePlayerState(env, telegramId, currentProfile);
  const liveops = await readLiveOpsConfig(env);
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
  const giftedCases = { small: 0, sweet: 0, gold: 0, legendary: 0 };
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
    caseState: {
      ...ensured.state,
      legendaryGuaranteedEvery: Math.max(0, Math.min(50, Number(liveops?.cases?.legendary?.guaranteeCount ?? 50)))
    },
    liveops,
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

function rollLevelCase(caseType, sourceState, currentOwnedSkins = [], liveops = null) {
  const config = LEVEL_CASE_CONFIG[caseType] || LEVEL_CASE_CONFIG.small;
  const caseConfig = liveOpsCaseConfig(liveops, caseType);
  if (caseConfig?.enabled === false) throw new ApiError(409, "Этот кейс временно отключён администратором.");
  const catalogs = {
    avatar: runtimeCaseCatalog("avatar", CASE_AVATARS, liveops),
    frame: runtimeCaseCatalog("frame", CASE_FRAMES, liveops),
    trail: runtimeCaseCatalog("trail", CASE_TRAILS, liveops),
    skin: runtimeCaseCatalog("skin", CASE_SKINS, liveops)
  };
  const guaranteeCount = caseType === "legendary"
    ? Math.max(0, Math.min(50, Math.floor(Number(caseConfig?.guaranteeCount ?? 50))))
    : 0;
  const pityMax = Math.max(0, guaranteeCount - 1);
  const state = JSON.parse(JSON.stringify(sourceState));
  state.ownedSkins = normalizeCurrentOwnedSkins(currentOwnedSkins);
  state.activeSkinId = normalizeCurrentActiveSkin(state.activeSkinId, state.ownedSkins);
  state.legendaryPityCounter = Math.max(0, Math.min(pityMax, safeAdminNumber(state.legendaryPityCounter)));
  state.legendaryGuaranteedEvery = guaranteeCount;
  const rewards = [];
  const selectedCosmetics = new Set();
  let points = 0;
  let treats = 0;
  let coffee = 0;

  const caseAvailabilityPredicate = (item) => caseType === "legendary" || !item?.legendaryOnly;
  const incrementPity = () => {
    if (caseType === "legendary" && guaranteeCount > 0) state.legendaryPityCounter = Math.min(pityMax, state.legendaryPityCounter + 1);
  };

  const addCosmetic = (kind, catalog, ownedKey, compensation, predicate = null) => {
    const excluded = new Set(
      [...selectedCosmetics]
        .filter((value) => value.startsWith(`${kind}:`))
        .map((value) => value.slice(kind.length + 1))
    );
    const ownedList = Array.isArray(state[ownedKey]) ? state[ownedKey] : [];
    const ownedSet = new Set(ownedList);
    const unownedPredicate = (item, id) => (!predicate || predicate(item, id)) && !ownedSet.has(id);
    const unownedId = caseWeightedCatalogChoice(catalog, excluded, unownedPredicate);
    const id = unownedId || (caseType === "legendary" ? null : caseWeightedCatalogChoice(catalog, excluded, predicate));
    if (!id) return false;
    selectedCosmetics.add(`${kind}:${id}`);
    const item = catalog[id];
    const owned = ownedSet.has(id);
    if (owned) {
      points += compensation;
      rewards.push({ kind, id, title: item.title, duplicate: true, compensationPoints: compensation });
    } else {
      ownedList.push(id);
      state[ownedKey] = [...new Set(ownedList)];
      rewards.push({ kind, id, title: item.title, rarity: item.rarity, isNew: Boolean(item.isNew), duplicate: false });
    }
    return true;
  };

  const guaranteeLegendaryReward = () => {
    const guaranteedCategories = [
      ["skin", 5, catalogs.skin, "ownedSkins"],
      ["avatar", 10, catalogs.avatar, "ownedAvatars"],
      ["frame", 15, catalogs.frame, "ownedFrames"],
      ["trail", 20, catalogs.trail, "ownedTrails"]
    ];
    const rarityPredicate = caseRarityAtLeast("epic");
    const categoriesWithUnowned = guaranteedCategories.filter(([, , catalog, ownedKey]) => {
      const ownedSet = new Set(Array.isArray(state[ownedKey]) ? state[ownedKey] : []);
      return Object.entries(catalog || {}).some(([id, item]) => rarityPredicate(item) && !ownedSet.has(id));
    });
    if (!categoriesWithUnowned.length) return false;
    let roll = caseSecureFloat() * categoriesWithUnowned.reduce((sum, [, weight]) => sum + weight, 0);
    let selected = categoriesWithUnowned[categoriesWithUnowned.length - 1];
    for (const entry of categoriesWithUnowned) {
      roll -= entry[1];
      if (roll < 0) { selected = entry; break; }
    }
    const [kind, , catalog, ownedKey] = selected;
    return addCosmetic(kind, catalog, ownedKey, CASE_DUPLICATE_COMPENSATION[kind], rarityPredicate);
  };

  for (let slot = 0; slot < config.slots; slot += 1) {
    const isLegendaryGuaranteed = caseType === "legendary" && guaranteeCount > 0 && state.legendaryPityCounter >= pityMax;
    if (isLegendaryGuaranteed) {
      const success = guaranteeLegendaryReward();
      state.legendaryPityCounter = 0;
      if (success && rewards.length) rewards[rewards.length - 1].guaranteed = true;
      if (success) continue;
    }
    const kind = caseWeightedKind(caseType, state, liveops, catalogs);
    if (kind === "points" || kind === "treats" || kind === "coffee") {
      const [min, max] = caseCurrencyRange(caseType, kind, liveops);
      const amount = caseRandomInt(min, max);
      if (kind === "points") points += amount;
      if (kind === "treats") treats += amount;
      if (kind === "coffee") coffee += amount;
      rewards.push({ kind, amount });
      incrementPity();
      continue;
    }
    if (kind === "booster") {
      const boosterType = caseRandomChoice(CASE_BOOSTER_TYPES) || "points";
      state.boosters[boosterType] = safeAdminNumber(state.boosters[boosterType] + 1);
      rewards.push({ kind: "booster", boosterType, amount: 1, runs: 2 });
      incrementPity();
      continue;
    }
    if (kind === "physical") {
      const physical = caseRandomChoice(Object.values(CASE_PHYSICAL_REWARDS)) || CASE_PHYSICAL_REWARDS.zefir;
      rewards.push({ kind: "physical", productId: physical.id, productName: physical.title });
      incrementPity();
      continue;
    }
    const mapping = {
      avatar: [catalogs.avatar, "ownedAvatars"],
      frame: [catalogs.frame, "ownedFrames"],
      trail: [catalogs.trail, "ownedTrails"],
      skin: [catalogs.skin, "ownedSkins"]
    };
    if (mapping[kind]) {
      const [catalog, ownedKey] = mapping[kind];
      const success = addCosmetic(kind, catalog, ownedKey, CASE_DUPLICATE_COMPENSATION[kind], kind === "skin" ? null : caseAvailabilityPredicate);
      if (!success) {
        const [min, max] = caseCurrencyRange(caseType, "points", liveops);
        const amount = caseRandomInt(min, max);
        points += amount;
        rewards.push({ kind: "points", amount, fallbackFromUnavailableCategory: kind });
      }
      incrementPity();
    }
  }

  return { rewards, state, points, treats, coffee, caseConfig };
}


function shuffledCasePhysicalProductIds(preferredId = "") {
  const ids = Object.keys(CASE_PHYSICAL_REWARDS);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const target = Math.floor(caseSecureFloat() * (index + 1));
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }
  const preferred = String(preferredId || "");
  return preferred && ids.includes(preferred)
    ? [preferred, ...ids.filter((id) => id !== preferred)]
    : ids;
}

async function generateUniqueRewardCode(env, product) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRewardCode(product.prefix);
    const compact = compactCode(code);
    const exists = await env.DB.prepare(
      `SELECT code FROM reward_codes WHERE code = ? OR code_compact = ? LIMIT 1`
    ).bind(code, compact).first();
    if (!exists) return { code, compact };
  }
  throw new ApiError(503, "Не удалось создать уникальный код физической награды.");
}

async function prepareCasePhysicalRewards(env, { rolled, telegramId, ownerName, sourceId, now }) {
  const statements = [];
  const stockConsumptionIds = [];
  const rewards = Array.isArray(rolled?.rewards) ? rolled.rewards : [];
  if (!rewards.some((reward) => reward?.kind === "physical")) {
    return { statements, stockConsumptionIds };
  }

  try {
    await ensureShopAssortmentSchema(env);
    const ttl = positiveInt(env.REWARD_TTL_SECONDS, DEFAULT_REWARD_TTL_SECONDS);

    for (let index = 0; index < rewards.length; index += 1) {
    const reward = rewards[index];
    if (reward?.kind !== "physical") continue;

    const consumptionId = `case-reward:${sourceId}:${index}`;
    let selectedProduct = null;
    let selectedStock = null;

    for (const productId of shuffledCasePhysicalProductIds(reward.productId)) {
      const product = PRODUCTS[productId];
      if (!product) continue;
      const assortment = await readShopAssortmentProduct(env, productId);
      if (!assortment?.enabled) continue;
      try {
        const stock = await consumeShopStock(env, {
          category: "prize",
          productId,
          consumptionId,
          telegramId
        });
        selectedProduct = product;
        selectedStock = stock;
        break;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) continue;
        throw error;
      }
    }

    if (!selectedProduct) {
      const configuredRange = rolled?.caseConfig?.ranges?.points;
      const [min, max] = Array.isArray(configuredRange)
        ? [Number(configuredRange[0] || 35000), Number(configuredRange[1] || 150000)]
        : caseCurrencyRange("legendary", "points");
      const amount = caseRandomInt(min, max);
      rolled.points = safeAdminNumber(Number(rolled.points || 0) + amount);
      rewards[index] = { kind: "points", amount, fallbackFromPhysical: true };
      continue;
    }

    const requestId = `case_reward_${String(sourceId).replace(/[^A-Za-z0-9_-]/g, "_")}_${index}`;
    const unique = await generateUniqueRewardCode(env, selectedProduct);
    const expiresAt = now + ttl;
    reward.productId = selectedProduct.id;
    reward.productName = selectedProduct.title;
    reward.code = unique.code;
    reward.issuedAt = now * 1000;
    reward.expiresAt = expiresAt * 1000;
    reward.status = "active";
    reward.rarity = "legendary";

    statements.push(env.DB.prepare(
      `INSERT INTO reward_codes (
         code, code_compact, request_id, product_id, product_name,
         owner_telegram_id, owner_name, created_at, expires_at, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    ).bind(
      unique.code,
      unique.compact,
      requestId,
      selectedProduct.id,
      selectedProduct.title,
      String(telegramId),
      String(ownerName || ""),
      now,
      expiresAt
    ));

      if (selectedStock?.limited && !selectedStock?.repeated) {
        stockConsumptionIds.push(consumptionId);
      }
    }

    return { statements, stockConsumptionIds };
  } catch (error) {
    await releaseCasePhysicalStock(env, stockConsumptionIds);
    throw error;
  }
}

async function releaseCasePhysicalStock(env, consumptionIds) {
  for (const consumptionId of Array.isArray(consumptionIds) ? consumptionIds : []) {
    try { await releaseShopStock(env, consumptionId); } catch (error) { console.error("Failed to release case physical stock", error); }
  }
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
    const currentOwnedSkins = normalizeCurrentOwnedSkins(body.current?.ownedSkins);
    const ensured = await ensureCasePlayerState(env, telegramId, current);
    const liveops = await readLiveOpsConfig(env);
    if (liveOpsCaseConfig(liveops, caseType)?.enabled === false) throw new ApiError(409, "Этот кейс временно отключён администратором.");
    const playerLevel = caseProfileLevel(Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp)));
    if (playerLevel < requestedLevel) throw new ApiError(403, `Кейс откроется на ${requestedLevel} уровне.`);
    const existing = await env.DB.prepare(
      `SELECT level FROM level_case_openings WHERE telegram_id = ? AND level = ? LIMIT 1`
    ).bind(telegramId, requestedLevel).first();
    if (existing) throw new ApiError(409, "Этот кейс уже открыт.");

    const rolled = rollLevelCase(caseType, ensured.state, currentOwnedSkins, liveops);
    const baseProfile = {
      wallet: Math.max(current.wallet, safeAdminNumber(ensured.profile?.wallet)),
      best: Math.max(current.best, safeAdminNumber(ensured.profile?.best_score)),
      treats: Math.max(current.treats, safeAdminNumber(ensured.profile?.treats)),
      coffee: Math.max(current.coffee, safeAdminNumber(ensured.profile?.coffee)),
      profileXp: Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp))
    };
    const now = Math.floor(Date.now() / 1000);
    const physicalRewards = await prepareCasePhysicalRewards(env, {
      rolled,
      telegramId,
      ownerName: telegramDisplayName(auth.user),
      sourceId: `level_${telegramId}_${requestedLevel}`,
      now
    });
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
        caseStateUpdateStatement(env, telegramId, rolled.state, now),
        ...physicalRewards.statements
      ]);
    } catch (error) {
      await releaseCasePhysicalStock(env, physicalRewards.stockConsumptionIds);
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

async function purchaseCaseFromShop(request, env) {
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const caseType = normalizeCaseType(body.caseType);
    const baseProduct = caseType ? CASE_SHOP_PRODUCTS[caseType] : null;
    if (!baseProduct) throw new ApiError(400, "Неизвестный тип кейса.");
    const liveops = await readLiveOpsConfig(env);
    if (liveOpsCaseConfig(liveops, caseType)?.enabled === false) throw new ApiError(409, "Этот кейс временно отключён администратором.");
    await ensureShopAssortmentSchema(env);
    const assortmentProduct = await readShopAssortmentProduct(env, baseProduct.id);
    if (!assortmentProduct?.enabled) throw new ApiError(409, "Этот кейс временно убран из ассортимента.");
    const product = {
      ...baseProduct,
      points: assortmentProduct.points,
      treats: assortmentProduct.treats,
      coffee: assortmentProduct.coffee
    };

    const requestId = String(body.requestId || "").trim();
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(requestId)) {
      throw new ApiError(400, "Некорректный идентификатор покупки.");
    }

    const telegramId = String(auth.user.id);
    const current = normalizeAdminProfile(body.current || {});
    const ensured = await ensureCasePlayerState(env, telegramId, current);
    const grantId = `shopcase_${telegramId}_${requestId}`;
    const existing = await env.DB.prepare(
      `SELECT id FROM granted_cases WHERE id = ? AND telegram_id = ? LIMIT 1`
    ).bind(grantId, telegramId).first();

    if (existing) {
      return jsonResponse(await buildCasePayload(env, telegramId, current, {
        authoritativeProfile: true,
        repeated: true,
        purchase: { productId: product.id, caseType, title: product.title }
      }));
    }

    const wallet = Math.max(current.wallet, safeAdminNumber(ensured.profile?.wallet));
    const treats = Math.max(current.treats, safeAdminNumber(ensured.profile?.treats));
    const coffee = Math.max(current.coffee, safeAdminNumber(ensured.profile?.coffee));
    const missing = [];
    if (wallet < product.points) missing.push(`${product.points - wallet} очков`);
    if (treats < product.treats) missing.push(`${product.treats - treats} зефира`);
    if (coffee < product.coffee) missing.push(`${product.coffee - coffee} кофе`);
    if (missing.length) throw new ApiError(400, `Не хватает ${missing.join(" и ")}.`);

    const stockConsumptionId = `case:${telegramId}:${requestId}`;
    const stock = await consumeShopStock(env, {
      category: "prize",
      productId: product.id,
      consumptionId: stockConsumptionId,
      telegramId
    });

    const now = Math.floor(Date.now() / 1000);
    const nextProfile = {
      wallet: wallet - product.points,
      best: Math.max(current.best, safeAdminNumber(ensured.profile?.best_score)),
      treats: treats - product.treats,
      coffee: coffee - product.coffee,
      profileXp: Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp))
    };

    const inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO granted_cases (
         id, telegram_id, case_type, status, granted_by, reason, created_at
       ) VALUES (?, ?, ?, 'pending', 'shop', ?, ?)`
    ).bind(grantId, telegramId, caseType, `Покупка в магазине: ${product.title}`, now).run();

    if (safeAdminNumber(inserted?.meta?.changes) < 1) {
      if (!stock.repeated) await releaseShopStock(env, stockConsumptionId);
      return jsonResponse(await buildCasePayload(env, telegramId, current, {
        authoritativeProfile: true,
        repeated: true,
        purchase: { productId: product.id, caseType, title: product.title }
      }));
    }

    try {
      await env.DB.prepare(
        `UPDATE admin_profile_state SET
           wallet = ?, treats = ?, coffee = ?,
           best_score = MAX(best_score, ?), profile_xp = MAX(profile_xp, ?),
           revision = revision + 1, updated_at = ?, updated_by = ?
         WHERE telegram_id = ?`
      ).bind(
        nextProfile.wallet,
        nextProfile.treats,
        nextProfile.coffee,
        nextProfile.best,
        nextProfile.profileXp,
        now,
        telegramId,
        telegramId
      ).run();
    } catch (error) {
      try { await env.DB.prepare(`DELETE FROM granted_cases WHERE id = ? AND status = 'pending'`).bind(grantId).run(); } catch {}
      if (!stock.repeated) await releaseShopStock(env, stockConsumptionId);
      throw error;
    }

    return jsonResponse(await buildCasePayload(env, telegramId, nextProfile, {
      authoritativeProfile: true,
      purchase: {
        productId: product.id,
        caseType,
        title: product.title,
        cost: { points: product.points, treats: product.treats, coffee: product.coffee },
        stock
      }
    }));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message, details: error.details }, error.status);
    console.error("purchaseCaseFromShop failed", error);
    return jsonResponse({ ok: false, error: "Не удалось купить кейс." }, 500);
  }
}

async function openGrantedCase(request, env) {
  let claimedId = "";
  let physicalStockConsumptionIds = [];
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const telegramId = String(auth.user.id);
    const caseType = normalizeCaseType(body.caseType);
    if (!caseType) throw new ApiError(400, "Неизвестный тип кейса.");
    const current = normalizeAdminProfile(body.current || {});
    const currentOwnedSkins = normalizeCurrentOwnedSkins(body.current?.ownedSkins);
    const ensured = await ensureCasePlayerState(env, telegramId, current);
    const liveops = await readLiveOpsConfig(env);
    if (liveOpsCaseConfig(liveops, caseType)?.enabled === false) throw new ApiError(409, "Этот кейс временно отключён администратором.");
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

    const rolled = rollLevelCase(caseType, ensured.state, currentOwnedSkins, liveops);
    const baseProfile = {
      wallet: Math.max(current.wallet, safeAdminNumber(ensured.profile?.wallet)),
      best: Math.max(current.best, safeAdminNumber(ensured.profile?.best_score)),
      treats: Math.max(current.treats, safeAdminNumber(ensured.profile?.treats)),
      coffee: Math.max(current.coffee, safeAdminNumber(ensured.profile?.coffee)),
      profileXp: Math.max(current.profileXp, safeAdminNumber(ensured.profile?.profile_xp))
    };
    const now = Math.floor(Date.now() / 1000);
    const physicalRewards = await prepareCasePhysicalRewards(env, {
      rolled,
      telegramId,
      ownerName: telegramDisplayName(auth.user),
      sourceId: `grant_${claimedId}`,
      now
    });
    physicalStockConsumptionIds = physicalRewards.stockConsumptionIds;
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
      ).bind(JSON.stringify(rolled.rewards), now, claimedId, telegramId),
      ...physicalRewards.statements
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
    await releaseCasePhysicalStock(env, physicalStockConsumptionIds);
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
    let achievedAt = now;

    try {
      await env.DB.prepare(
        `INSERT INTO leaderboard_runs (
          run_id, season_id, telegram_id, score, duration_ms, accepted, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?)`
      ).bind(runId, season.id, telegramId, score, durationMs, now).run();
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("unique")) throw error;
      const existingRun = await env.DB.prepare(
        `SELECT season_id, telegram_id, score, duration_ms, accepted, created_at
         FROM leaderboard_runs WHERE run_id = ? LIMIT 1`
      ).bind(runId).first();
      const sameRun = existingRun
        && String(existingRun.season_id || "") === String(season.id)
        && String(existingRun.telegram_id || "") === telegramId
        && Number(existingRun.score || 0) === score
        && Number(existingRun.duration_ms || 0) === durationMs
        && Number(existingRun.accepted || 0) === 1;
      if (!sameRun) throw new ApiError(409, "Этот идентификатор забега уже использован.");
      achievedAt = Number(existingRun.created_at || now);
      // Не завершаем повторную отправку раньше времени: UPSERT-ы ниже
      // восстановят таблицу, если первая попытка оборвалась после записи забега.
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
    ).bind(season.id, telegramId, displayName, username, photoUrl, score, level, achievedAt, now, caseAvatarId, caseFrameId).run();

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
    ).bind(telegramId, displayName, username, photoUrl, score, level, achievedAt, now, caseAvatarId, caseFrameId).run();

    return jsonResponse(await buildLeaderboardPayload(env, season, telegramId, "season"));
  } catch (error) {
    if (error instanceof ApiError) return jsonResponse({ ok: false, error: error.message }, error.status);
    console.error("submitLeaderboardRun failed", error);
    return jsonResponse({ ok: false, error: "Не удалось отправить результат в рейтинг." }, 500);
  }
}

async function claimLeaderboardReward(request, env) {
  let notificationContext = null;
  try {
    requireDatabase(env);
    requireBotToken(env);
    const body = await readJson(request);
    const auth = await validateTelegramInitData(String(body.initData || ""), env);
    const season = await ensureSeason(env);
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
    const rewardSeason = String(reward.season_id || "") === String(season.id || "")
      ? season
      : await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(String(reward.season_id || "")).first();
    const winner = await env.DB.prepare(
      `SELECT telegram_id, display_name, username, best_score
       FROM leaderboard_entries WHERE season_id = ? AND telegram_id = ? LIMIT 1`
    ).bind(String(reward.season_id || ""), telegramId).first();
    notificationContext = { reward, season: rewardSeason || season, winner: winner || { telegram_id: telegramId, display_name: telegramDisplayName(auth.user), username: auth.user.username || "" } };

    const now = Math.floor(Date.now() / 1000);
    if (String(reward.status) === "cancelled") throw new ApiError(409, "Награда отменена.");
    if (Number(reward.expires_at || 0) <= now && String(reward.status) !== "claimed") {
      await env.DB.prepare(`UPDATE leaderboard_rewards SET status = 'expired' WHERE id = ?`).bind(reward.id).run();
      throw new ApiError(410, "Срок получения награды истёк.");
    }
    const rewardPresentation = leaderboardRewardPresentation(
      reward.reward_type || rewardSeason?.reward_type || "coffee",
      reward.reward_amount || rewardSeason?.reward_amount || 1,
      reward.reward_item_id || rewardSeason?.reward_item_id || "",
      rewardSeason?.reward_title || "",
      rewardSeason?.reward_image_url || ""
    );
    if (rewardPresentation.type === "case") {
      await createLeaderboardGrantedCases(env, reward, rewardSeason || season);
    }
    if (String(reward.status) === "claimed") {
      return jsonResponse({ ok: true, claimed: false, alreadyClaimed: true, reward: rewardToClient(reward, seasonRewardClientConfig(rewardSeason || season, env)) });
    }
    const result = await env.DB.prepare(
      `UPDATE leaderboard_rewards SET status = 'claimed', claimed_at = ? WHERE id = ? AND status = 'pending'`
    ).bind(now, reward.id).run();
    if (Number(result.meta?.changes || 0) !== 1) throw new ApiError(409, "Награда уже была обработана.");
    let updated = { ...reward, status: "claimed", claimed_at: now };
    try {
      updated = await env.DB.prepare(`SELECT * FROM leaderboard_rewards WHERE id = ?`).bind(reward.id).first() || updated;
    } catch (error) {
      console.error("Read claimed leaderboard reward failed", error);
    }
    await queueLeaderboardStaffNotification(
      env,
      `leaderboard-reward-claimed:${reward.id}`,
      leaderboardClaimNotificationText({ ...notificationContext, reward: updated, success: true, reason: "" }, env)
    );
    return jsonResponse({ ok: true, claimed: true, reward: rewardToClient(updated, seasonRewardClientConfig(rewardSeason || season, env)) });
  } catch (error) {
    if (notificationContext?.reward) {
      const reason = leaderboardNotificationErrorReason(error);
      await queueLeaderboardStaffNotification(
        env,
        `leaderboard-reward-claim-failed:${notificationContext.reward.id}:${leaderboardNotificationReasonKey(reason)}`,
        leaderboardClaimNotificationText({ ...notificationContext, success: false, reason }, env)
      );
    }
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
  const seasonReward = leaderboardRewardPresentation(
    season.reward_type || rewardConfig.rewardType,
    season.reward_amount || rewardConfig.rewardAmount,
    season.reward_item_id || rewardConfig.rewardItemId,
    season.reward_title || "",
    season.reward_image_url || ""
  );
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
        type: seasonReward.type,
        amount: seasonReward.amount,
        title: seasonReward.title,
        imageUrl: seasonReward.imageUrl,
        itemId: seasonReward.itemId
      },
      resetPlan: resetPlan ? { ...resetPlan, applyAt: Number(season.ends_at || 0) * 1000 } : null
    },
    top,
    me: myEntry,
    firstScore,
    gapToFirst: myEntry ? Math.max(0, firstScore - myEntry.score) : firstScore,
    reward: reward ? rewardToClient(reward, {
      ...rewardConfig,
      rewardType: seasonReward.type,
      rewardAmount: seasonReward.amount,
      rewardTitle: seasonReward.title,
      rewardImageUrl: seasonReward.imageUrl,
      rewardItemId: seasonReward.itemId,
      id: String(season.id || rewardConfig.id)
    }) : null
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

function seasonRewardClientConfig(season, env) {
  const fallback = configuredSeason(env);
  if (!season) return fallback;
  const presentation = leaderboardRewardPresentation(
    season.reward_type || fallback.rewardType,
    season.reward_amount || fallback.rewardAmount,
    season.reward_item_id || fallback.rewardItemId,
    season.reward_title || "",
    season.reward_image_url || ""
  );
  return {
    ...fallback,
    id: String(season.id || fallback.id),
    rewardType: presentation.type,
    rewardAmount: presentation.amount,
    rewardTitle: presentation.title,
    rewardImageUrl: presentation.imageUrl,
    rewardItemId: presentation.itemId
  };
}

function rewardToClient(row, config = null) {
  const sameSeason = Boolean(config && String(row.season_id || "") === String(config.id || ""));
  const rowType = normalizeLeaderboardRewardType(row.reward_type || config?.rewardType || "coffee");
  const configType = normalizeLeaderboardRewardType(config?.rewardType || "");
  const matchesConfig = sameSeason && rowType === configType;
  const presentation = leaderboardRewardPresentation(
    row.reward_type || config?.rewardType || "coffee",
    row.reward_amount || config?.rewardAmount || 1,
    row.reward_item_id || (matchesConfig ? config?.rewardItemId : ""),
    matchesConfig ? config?.rewardTitle : "",
    matchesConfig ? config?.rewardImageUrl : ""
  );
  return {
    id: String(row.id || ""),
    seasonId: String(row.season_id || ""),
    place: Number(row.place || 0),
    type: presentation.type,
    amount: presentation.amount,
    title: presentation.title,
    imageUrl: presentation.imageUrl,
    itemId: presentation.itemId,
    status: String(row.status || "pending"),
    createdAt: Number(row.created_at || 0) * 1000,
    claimedAt: Number(row.claimed_at || 0) * 1000,
    expiresAt: Number(row.expires_at || 0) * 1000
  };
}

let telegramWebhookRepairCooldownUntil = 0;

function expectedTelegramWebhookUrl(env) {
  const url = new URL(configuredGameUrl(env));
  url.pathname = "/telegram/webhook";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function getTelegramBotHealth(env) {
  try {
    requireBotToken(env);
    const info = await telegramApi(env, "getWebhookInfo", {});
    return jsonResponse({
      ok: true,
      worker: GAME_VERSION,
      workerBuild: WORKER_BUILD,
      expectedWebhookUrl: expectedTelegramWebhookUrl(env),
      webhookUrl: String(info?.url || ""),
      pendingUpdates: Math.max(0, Number(info?.pending_update_count || 0)),
      lastErrorDate: Math.max(0, Number(info?.last_error_date || 0)),
      lastErrorMessage: String(info?.last_error_message || "").slice(0, 500),
      botTokenConfigured: true,
      webhookSecretConfigured: Boolean(String(env.TELEGRAM_WEBHOOK_SECRET || ""))
    });
  } catch (error) {
    console.error("getTelegramBotHealth failed", error);
    return jsonResponse({ ok: false, error: String(error?.message || "Не удалось проверить Telegram-бота.") }, 500);
  }
}

async function ensureTelegramWebhookHealth(env) {
  if (!env?.TELEGRAM_BOT_TOKEN || !env?.TELEGRAM_WEBHOOK_SECRET) return { skipped: true };
  const nowMs = Date.now();
  const info = await telegramApi(env, "getWebhookInfo", {});
  const expectedUrl = expectedTelegramWebhookUrl(env);
  const currentUrl = String(info?.url || "");
  const lastErrorDate = Math.max(0, Number(info?.last_error_date || 0));
  const recentWebhookError = lastErrorDate > Math.floor(nowMs / 1000) - 15 * 60;
  const needsRepair = currentUrl !== expectedUrl || !currentUrl || recentWebhookError;
  if (!needsRepair || nowMs < telegramWebhookRepairCooldownUntil) {
    return { repaired: false, currentUrl, expectedUrl, recentWebhookError };
  }
  telegramWebhookRepairCooldownUntil = nowMs + 5 * 60 * 1000;
  const webhookSecret = String(env.TELEGRAM_WEBHOOK_SECRET || "");
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(webhookSecret)) {
    throw new ApiError(500, "TELEGRAM_WEBHOOK_SECRET не настроен или содержит недопустимые символы.");
  }
  const result = await telegramApi(env, "setWebhook", {
    url: expectedUrl,
    secret_token: webhookSecret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false
  });
  return { repaired: true, result, expectedUrl };
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

  const runtime = { ctx };
  const task = handleTelegramUpdate(update, env, runtime).catch(async (error) => {
    console.error("Telegram update failed", error);
    const chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id;
    if (!chatId) return;
    try {
      await sendTelegramPlainMessage(env, chatId, `Команда получена, но произошла ошибка: ${String(error?.message || "временная ошибка сервиса").slice(0, 300)}`);
    } catch (notifyError) {
      console.error("Telegram command error notification failed", notifyError);
    }
  });
  if (ctx?.waitUntil) ctx.waitUntil(task);
  else await task;
  return new Response("OK", { status: 200 });
}

async function handleTelegramUpdate(update, env, runtime = {}) {
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

  if (/^\/cancel(?:@\w+)?$/i.test(text)) {
    await clearStaffWorkflow(user.id, env);
    await sendTelegramMessage(env, chatId, "Текущее действие отменено.");
    return;
  }

  if (text && !text.startsWith("/") && await handleActiveStaffWorkflowMessage(message, env)) {
    return;
  }

  if (/^\/whoami(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, `<b>Ваш Telegram ID:</b> <code>${escapeHtml(String(user.id))}</code>`);
    return;
  }

  if (/^\/(?:help_staff|adminpanel_kmd)(?:@\w+)?$/i.test(text)) {
    await showAdminPanelCommands(chatId, user, env);
    return;
  }

  if (/^\/(?:adminpanel|admin|panel)(?:@\w+)?$/i.test(text)) {
    await showAdminMainMenu(chatId, user, env);
    return;
  }

  if (/^\/(?:bot_version|worker_version)(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId,
      `<b>Версия серверной части</b>\n\nWorker: <b>v${escapeHtml(WORKER_BUILD)}</b>\nИгра: <b>${escapeHtml(GAME_VERSION)}</b>\nАдмин-команды: <b>подключены</b>\n\nЕсли здесь указана более старая версия, деплой выполнен не из актуальной папки проекта.`
    );
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

  const setStaffNameMatch = text.match(/^\/set_name(?:@\w+)?\s+(\d{4,20})\s+(.+)$/i);
  if (setStaffNameMatch) {
    await setStaffListName(chatId, user, setStaffNameMatch[1], setStaffNameMatch[2], env);
    return;
  }

  if (/^\/set_name(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, `<b>Формат команды</b>\n\n<code>/set_name TELEGRAM_ID ИМЯ</code>\n\nПример: <code>/set_name 934486520 Анна</code>\nСбросить имя: <code>/set_name 934486520 off</code>`);
    return;
  }

  const postMatch = text.match(/^\/post(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (postMatch) {
    await createBotBroadcast(chatId, user, String(postMatch[1] || ""), env, runtime);
    return;
  }

  if (/^\/block(?:@\w+)?$/i.test(text)) {
    await startBlockCommand(chatId, user, env);
    return;
  }

  if (/^\/unblock(?:@\w+)?$/i.test(text)) {
    await startUnblockCommand(chatId, user, env);
    return;
  }

  if (/^\/(?:banned|banlist)(?:@\w+)?$/i.test(text)) {
    await showBannedPlayers(chatId, user, env);
    return;
  }

  const noteMatch = text.match(/^\/note(?:@\w+)?\s+(@?[A-Za-z0-9_]{3,32}|\d{4,20})\s+([\s\S]+)$/i);
  if (noteMatch) {
    await addPlayerNote(chatId, user, noteMatch[1], noteMatch[2], env);
    return;
  }

  const notesMatch = text.match(/^\/notes(?:@\w+)?\s+(@?[A-Za-z0-9_]{3,32}|\d{4,20})$/i);
  if (notesMatch) {
    await showPlayerNotes(chatId, user, notesMatch[1], env);
    return;
  }

  if (/^\/economy(?:@\w+)?$/i.test(text)) {
    await showEconomyDashboard(chatId, user, env);
    return;
  }

  if (/^\/segments(?:@\w+)?$/i.test(text)) {
    await showSegmentsDashboard(chatId, user, env);
    return;
  }

  if (/^\/campaign(?:@\w+)?$/i.test(text)) {
    await startCampaignWorkflow(chatId, user, env);
    return;
  }

  if (/^\/campaigns(?:@\w+)?$/i.test(text)) {
    await showCampaignsDashboard(chatId, user, env);
    return;
  }

  if (/^\/fraud(?:@\w+)?$/i.test(text)) {
    await showFraudDashboard(chatId, user, env);
    return;
  }

  if (/^\/content(?:@\w+)?$/i.test(text)) {
    await showContentDashboard(chatId, user, env);
    return;
  }

  const contentWeightMatch = text.match(/^\/content_weight(?:@\w+)?\s+(avatar|frame|trail|skin)\s+([A-Za-z0-9_-]+)\s+([0-9]+(?:[.,][0-9]+)?)$/i);
  if (contentWeightMatch) {
    await setContentWeight(chatId, user, contentWeightMatch[1].toLowerCase(), contentWeightMatch[2], Number(contentWeightMatch[3].replace(',', '.')), env);
    return;
  }

  if (/^\/cases_admin(?:@\w+)?$/i.test(text)) {
    await showCasesAdminDashboard(chatId, user, env);
    return;
  }

  const caseChanceMatch = text.match(/^\/case_chance(?:@\w+)?\s+(small|sweet|gold|legendary)\s+(points|treats|coffee|booster|skin|avatar|frame|trail|physical)\s+([0-9]+(?:[.,][0-9]+)?)$/i);
  if (caseChanceMatch) {
    await setCaseChance(chatId, user, caseChanceMatch[1].toLowerCase(), caseChanceMatch[2].toLowerCase(), Number(caseChanceMatch[3].replace(',', '.')), env);
    return;
  }

  const caseGuaranteeMatch = text.match(/^\/case_guarantee(?:@\w+)?\s+(small|sweet|gold|legendary)\s+(\d{1,3})$/i);
  if (caseGuaranteeMatch) {
    await setCaseGuarantee(chatId, user, caseGuaranteeMatch[1].toLowerCase(), Number(caseGuaranteeMatch[2]), env);
    return;
  }

  if (/^\/config_history(?:@\w+)?$/i.test(text)) {
    await showConfigHistory(chatId, user, env);
    return;
  }

  if (/^\/shop_admin(?:@\w+)?$/i.test(text)) {
    await showShopAdminDashboard(chatId, user, env);
    return;
  }

  const locationMatch = text.match(/^\/location(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (locationMatch) {
    await setStaffWorkContext(chatId, user, String(locationMatch[1] || ''), env);
    return;
  }

  if (/^\/(?:members|players|pleyers)(?:@\w+)?$/i.test(text)) {
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

  const playerMatch = text.match(/^\/player(?:@\w+)?\s+(@?[A-Za-z0-9_]{3,32}|\d{4,20})$/i);
  if (playerMatch) {
    const resolvedTelegramId = await resolvePlayerTelegramId(playerMatch[1], env);
    if (!resolvedTelegramId) {
      await sendTelegramMessage(env, chatId, `Игрок <code>${escapeHtml(playerMatch[1])}</code> не найден. Используйте Telegram ID или точный @username.`);
      return;
    }
    await showPlayerProfile(chatId, user, resolvedTelegramId, env);
    return;
  }

  if (/^\/player(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(env, chatId, `<b>Карточка игрока</b>

<code>/player TELEGRAM_ID</code>
или
<code>/player @username</code>

Telegram ID можно найти командой <code>/members</code>.`);
    return;
  }

  if (/^\/grant(?:@\w+)?$/i.test(text)) {
    await startGrantWorkflow(chatId, user, env);
    return;
  }

  if (/^\/redeem(?:@\w+)?$/i.test(text)) {
    await startRedeemWorkflow(chatId, user, env);
    return;
  }

  const undoRedeemMatch = text.match(/^\/undo_redeem(?:@\w+)?\s+(.+)$/i);
  if (undoRedeemMatch) {
    await undoRewardRedemption(chatId, user, undoRedeemMatch[1], env);
    return;
  }

  if (/^\/stock(?:@\w+)?$/i.test(text)) {
    await showStockDashboard(chatId, user, env);
    return;
  }

  if (/^\/season(?:@\w+)?$/i.test(text)) {
    await showSeasonAdminDashboard(chatId, user, env);
    return;
  }

  const auditMatch = text.match(/^\/audit(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (auditMatch) {
    await showAdvancedAuditLog(chatId, user, String(auditMatch[1] || ""), env);
    return;
  }

  if (/^\/ticket(?:@\w+)?$/i.test(text)) {
    await startTicketWorkflow(chatId, user, env);
    return;
  }

  const ticketsMatch = text.match(/^\/tickets(?:@\w+)?(?:\s+(open|mine|all|resolved))?$/i);
  if (ticketsMatch) {
    await showTicketsList(chatId, user, String(ticketsMatch[1] || "open"), env);
    return;
  }

  const ticketInfoMatch = text.match(/^\/ticket_info(?:@\w+)?\s+(\d{1,9})$/i);
  if (ticketInfoMatch) {
    await showTicketDetails(chatId, user, Number(ticketInfoMatch[1]), env);
    return;
  }

  if (/^\/status(?:@\w+)?$/i.test(text)) {
    await showOperationsStatus(chatId, user, env);
    return;
  }

  if (/^\/daily_report(?:@\w+)?$/i.test(text)) {
    await showDailyStaffReport(chatId, user, env);
    return;
  }

  if (/^\/towar(?:@\w+)?$/i.test(text)) {
    await showShopProductsFromBot(chatId, user, env);
    return;
  }

  const addProductMatch = text.match(/^\/addprodyct(?:@\w+)?\s+([\s\S]+)$/i);
  if (addProductMatch) {
    await addShopProductFromBot(chatId, user, addProductMatch[1], env);
    return;
  }

  const deleteProductMatch = text.match(/^\/deletedprodyct(?:@\w+)?\s+([\s\S]+)$/i);
  if (deleteProductMatch) {
    await deleteShopProductFromBot(chatId, user, deleteProductMatch[1], env);
    return;
  }

  const priceProductMatch = text.match(/^\/price(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (priceProductMatch) {
    await updateShopProductPriceFromBot(chatId, user, priceProductMatch[1] || "", env);
    return;
  }

  const setLimitMatch = text.match(/^\/setlimit(?:@\w+)?(?:\s+([\s\S]+))?$/i);
  if (setLimitMatch) {
    await setShopStockLimitFromBot(chatId, user, setLimitMatch[1] || "", env);
    return;
  }

  const currencyAddMatch = text.match(/^\/add_(zefir|coffee|points)(?:@\w+)?\s+(\d{1,9})\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  if (currencyAddMatch) {
    await addPlayerCurrency(chatId, user, currencyAddMatch[1].toLowerCase(), Number(currencyAddMatch[2]), currencyAddMatch[3], String(currencyAddMatch[4] || "Компенсация").trim(), env);
    return;
  }

  const addKeysWithCountMatch = text.match(/^\/add_keys(?:@\w+)?\s+(small|sweet|gold|legendary|legend|маленький|малый|сладкий|золотой|легендарный|легенда)\s+(\d{1,2})\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
  const addKeysSingleMatch = text.match(/^\/add_keys(?:@\w+)?\s+(small|sweet|gold|legendary|legend|маленький|малый|сладкий|золотой|легендарный|легенда)\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
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

  const addFrameMatch = text.match(/^\/add_frame(?:@\w+)?\s+(strawberry|coffee|marshmallow|flower|gold|elite|mint|клубничная|кофейная|зефирная|цветочная|золотая|элитная|легендарная)\s+(\d{4,20})(?:\s+([\s\S]+))?$/i);
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
    try {
      await registerBotSubscriber(message, env);
    } catch (error) {
      console.error("Bot subscriber registration failed", error);
    }
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

  if (text.startsWith("/")) {
    await sendTelegramMessage(env, chatId,
      `<b>Команда не распознана</b>\n\nПроверьте написание. Админ-панель: <code>/adminpanel_kmd</code>\nСписок игроков: <code>/players</code>\nКарточка игрока: <code>/player TELEGRAM_ID</code>\nВерсия Worker: <code>/bot_version</code>`
    );
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
  return `<b>Зефирок — помощник кафе</b>\n\nТекущая версия игры: <b>${escapeHtml(GAME_VERSION)}</b>\n\nЗапускайте игру только системной кнопкой <b>«ИГРАТЬ»</b> в профиле бота — так Telegram передаст данные игрока для рейтинга и сохранений.\n\nЗдесь можно посмотреть сезонный рейтинг и новости, узнать историю Зефи, прочитать ответы на частые вопросы и проверить код награды.\n\nЧтобы проверить подарок, просто отправьте код из раздела «Мои покупки» одним сообщением.`;
}

function botGameText() {
  return `<b>Сладкий забег</b>\n\nДля запуска используйте системную кнопку <b>«ИГРАТЬ»</b> в профиле бота. Обычная ссылка не используется, потому что через неё Telegram может не передать данные игрока для рейтинга.`;
}

function botStoryText() {
  return `<b>Сюжет «Сладкого забега»</b>\n\nЗефи — маленький мальтипу и главный помощник уютного кафе. Перед открытием он отправляется в сладкий забег: собирает зефир и кофе, перепрыгивает пуфики и помогает наполнить витрину любимыми угощениями гостей.\n\nЧем дальше пробежит Зефи, тем больше наград, опыта и новых возможностей откроется в его профиле.`;
}

function botFaqText() {
  return `<b>FAQ — частые вопросы</b>

<b>Как начать играть?</b>
Нажмите системную кнопку «ИГРАТЬ» в профиле бота, перейдите во вкладку «Играть» и нажмите «Старт».

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
        `<b>🏆 ${escapeHtml(payload.season.title)}</b>\n\n<b>Уже скоро!</b>\nСтарт: <b>${escapeHtml(start)}</b>\n\nГлавная награда: <b>${escapeHtml(payload.season.reward.title || `${payload.season.reward.amount} кофе`)}</b>\n\nВ рейтинг попадёт лучший результат одного забега.`,
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
      `<b>🏆 ${escapeHtml(payload.season.title)}</b>\n\n${statusLine}\nНаграда за 1 место: <b>${escapeHtml(payload.season.reward.title || `${payload.season.reward.amount} кофе`)}</b>\n\n${lines.length ? lines.join("\n") : "Пока нет результатов."}${me}`,
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
  const useBuiltInRelease = !news || Number(news.published_at || 0) < BOT_NEWS_PUBLISHED_AT;
  const title = String(useBuiltInRelease ? BOT_NEWS_TITLE : news.title);
  const body = String(useBuiltInRelease ? BOT_NEWS_TEXT : news.body);
  const text = `<b>📰 ${escapeHtml(title)}</b>

${escapeHtml(body)}

Версия: <b>${escapeHtml(GAME_VERSION)}</b>`;
  const imageUrl = String(useBuiltInRelease ? (env.BOT_NEWS_IMAGE_URL || DEFAULT_BOT_NEWS_IMAGE_URL) : (news.image_url || env.BOT_NEWS_IMAGE_URL || DEFAULT_BOT_NEWS_IMAGE_URL)).trim();
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
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
}

function mainMenuMarkup(env) {
  return {
    inline_keyboard: [
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
      [{ text: "← Главное меню", callback_data: "menu:home" }]
    ]
  };
}

function sectionMenuMarkup(env) {
  return {
    inline_keyboard: [
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

  await answerCallback(env, query.id, section === "home" ? "Главное меню" : "Раздел открыт");
  await sendTelegramMessage(env, message.chat.id, text, replyMarkup);
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

const BOT_SHOP_PRODUCT_ALIASES = Object.freeze({
  zefir: "zefir",
  "зефир": "zefir",
  americano: "americano",
  "американо": "americano",
  cappuccino: "cappuccino",
  capuccino: "cappuccino",
  "капучино": "cappuccino",
  "case-small": "case-small",
  "case-sweet": "case-sweet",
  "case-gold": "case-gold",
  "case-legendary": "case-legendary"
});

const BOT_CASE_TYPE_ALIASES = Object.freeze({
  small: "case-small",
  standart: "case-small",
  standard: "case-small",
  common: "case-small",
  "обычный": "case-small",
  "маленький": "case-small",
  sweet: "case-sweet",
  silver: "case-sweet",
  "серебряный": "case-sweet",
  "сладкий": "case-sweet",
  gold: "case-gold",
  golden: "case-gold",
  "золотой": "case-gold",
  legendary: "case-legendary",
  legend: "case-legendary",
  "легендарный": "case-legendary",
  "легенда": "case-legendary"
});

function normalizeBotShopToken(value) {
  return String(value || "").trim().toLowerCase().replace(/_/g, "-");
}

function extractBotShopProduct(rawPayload) {
  const tokens = String(rawPayload || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const first = normalizeBotShopToken(tokens[0]);
  if (first === "case" || first === "кейс") {
    const id = BOT_CASE_TYPE_ALIASES[normalizeBotShopToken(tokens[1])];
    return id ? { id, rest: tokens.slice(2) } : null;
  }
  const id = BOT_SHOP_PRODUCT_ALIASES[first];
  return id ? { id, rest: tokens.slice(1) } : null;
}

function parseBotShopPriceNumber(value) {
  const normalized = String(value || "").trim().replace(/[._]/g, "");
  if (!/^\d{1,9}$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}

function normalizeBotShopPriceKey(value) {
  const token = normalizeBotShopToken(value).replace(/[:=]$/, "");
  if (["points", "point", "score", "очки", "очков"].includes(token)) return "points";
  if (["zefir", "treats", "marshmallow", "зефир", "зефира"].includes(token)) return "treats";
  if (["coffee", "кофе"].includes(token)) return "coffee";
  return "";
}

function parseBotShopPrices(tokens) {
  const expanded = [];
  for (const token of tokens || []) {
    const text = String(token || "").trim();
    if (text.includes("=")) {
      const [left, right] = text.split("=", 2);
      expanded.push(left, right);
    } else {
      expanded.push(text);
    }
  }
  if (!expanded.length) return null;
  const positional = expanded.map(parseBotShopPriceNumber);
  if (positional.every((value) => value !== null)) {
    if (positional.length > 3) return null;
    const [points = 0, treats = 0, coffee = 0] = positional;
    return points + treats + coffee > 0 ? { points, treats, coffee } : null;
  }
  const price = { points: 0, treats: 0, coffee: 0 };
  const used = new Set();
  for (let index = 0; index < expanded.length; index += 2) {
    const key = normalizeBotShopPriceKey(expanded[index]);
    const value = parseBotShopPriceNumber(expanded[index + 1]);
    if (!key || value === null || used.has(key)) return null;
    price[key] = value;
    used.add(key);
  }
  return used.size && price.points + price.treats + price.coffee > 0 ? price : null;
}

function botShopProductTitle(productId) {
  return SHOP_ASSORTMENT_PRODUCTS[String(productId || "")]?.title || String(productId || "");
}

const BOT_SHOP_PRODUCT_COMMAND_NAMES = Object.freeze({
  zefir: "zefir",
  americano: "americano",
  cappuccino: "cappuccino",
  "case-small": "case small",
  "case-sweet": "case sweet",
  "case-gold": "case gold",
  "case-legendary": "case legendary"
});

function botShopProductCommandName(productId) {
  return BOT_SHOP_PRODUCT_COMMAND_NAMES[String(productId || "")] || String(productId || "");
}

function botShopPriceText(product) {
  const values = [
    safeAdminNumber(product?.points) ? `${safeAdminNumber(product.points).toLocaleString("ru-RU")} очков` : "",
    safeAdminNumber(product?.treats) ? `${safeAdminNumber(product.treats).toLocaleString("ru-RU")} зефира` : "",
    safeAdminNumber(product?.coffee) ? `${safeAdminNumber(product.coffee).toLocaleString("ru-RU")} кофе` : ""
  ].filter(Boolean);
  return values.length ? values.join(" + ") : "бесплатно";
}

const BOT_SKIN_LIMIT_ALIASES = Object.freeze({
  barista: "barista", "бариста": "barista",
  strawberry: "strawberry", "клубничка": "strawberry", "клубника": "strawberry",
  bee: "bee", "пчелка": "bee", "пчёлка": "bee",
  sailor: "sailor", "морячок": "sailor",
  princess: "princess", "принцесса": "princess",
  angel: "angel", "ангелок": "angel", "ангел": "angel"
});

function parseBotStockAmount(value) {
  const token = String(value || "").trim().toLowerCase();
  if (["off", "none", "unlimited", "безлимит", "убрать", "снять"].includes(token)) return { remove: true, amount: null };
  if (!/^\d{1,9}$/.test(token)) return null;
  return { remove: false, amount: Number(token) };
}

function parseBotStockLimitPayload(rawPayload) {
  const tokens = String(rawPayload || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const categoryToken = normalizeBotShopToken(tokens.shift());
  const category = ["skins", "skin", "скины", "скин"].includes(categoryToken)
    ? "skins"
    : ["prize", "prizes", "reward", "rewards", "награда", "награды"].includes(categoryToken)
      ? "prize"
      : "";
  if (!category) return null;
  const amount = parseBotStockAmount(tokens[tokens.length - 1]);
  if (!amount) return null;
  tokens.pop();

  if (!tokens.length) {
    return { category, productId: "", title: category === "skins" ? "Все скины" : "Все товары раздела «Награды»", ...amount };
  }

  if (category === "skins") {
    if (tokens.length !== 1) return null;
    const skinId = BOT_SKIN_LIMIT_ALIASES[normalizeBotShopToken(tokens[0])];
    if (!skinId) return null;
    return { category, productId: skinId, title: SKINS[skinId]?.title || skinId, ...amount };
  }

  const parsedProduct = extractBotShopProduct(tokens.join(" "));
  if (!parsedProduct || parsedProduct.rest.length) return null;
  return { category, productId: parsedProduct.id, title: botShopProductTitle(parsedProduct.id), ...amount };
}

function botStockLimitHelp() {
  return `<b>Формат лимита остатков</b>

` +
    `<code>/setlimit skins 1</code> — общий остаток на любые скины
` +
    `<code>/setlimit skins angel 3</code> — остаток конкретного скина
` +
    `<code>/setlimit prize 50</code> — общий остаток раздела «Награды»
` +
    `<code>/setlimit prize zefir 25</code> — остаток конкретного товара
` +
    `<code>/setlimit prize case legendary 10</code> — остаток конкретного кейса

` +
    `Повторная команда полностью обновляет остаток. Чтобы снять лимит: <code>/setlimit skins off</code>.`;
}

async function setShopStockLimitFromBot(chatId, user, rawPayload, env) {
  const access = await requireCatalogAdministrator(chatId, user, env);
  if (!access) return;
  const parsed = parseBotStockLimitPayload(rawPayload);
  if (!parsed) {
    await sendTelegramMessage(env, chatId, botStockLimitHelp());
    return;
  }
  await ensureShopStockSchema(env);
  const scopeKey = shopStockScopeKey(parsed.category, parsed.productId);
  const now = Math.floor(Date.now() / 1000);
  if (parsed.remove) {
    await env.DB.prepare(`DELETE FROM shop_stock_limits WHERE scope_key = ?`).bind(scopeKey).run();
    await logStaffAction(env, user, access, "shop_stock_limit_remove", null, "product", null, null, {
      category: parsed.category, productId: parsed.productId, scopeKey
    });
    await sendTelegramMessage(env, chatId, `♾ Лимит снят: <b>${escapeHtml(parsed.title)}</b>. Покупки снова без общего ограничения.`);
    return;
  }
  await env.DB.prepare(
    `INSERT INTO shop_stock_limits (
       scope_key, category, product_id, configured_limit, remaining, updated_at, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(scope_key) DO UPDATE SET
       configured_limit = excluded.configured_limit,
       remaining = excluded.remaining,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).bind(scopeKey, parsed.category, parsed.productId, parsed.amount, parsed.amount, now, String(user.id)).run();
  await logStaffAction(env, user, access, "shop_stock_limit_set", null, "product", null, parsed.amount, {
    category: parsed.category, productId: parsed.productId, scopeKey
  });
  const ending = parsed.amount === 1 ? "покупка" : parsed.amount >= 2 && parsed.amount <= 4 ? "покупки" : "покупок";
  await sendTelegramMessage(env, chatId,
    `📦 Остаток установлен: <b>${escapeHtml(parsed.title)}</b>

Доступно: <b>${parsed.amount.toLocaleString("ru-RU")} ${ending}</b>.
После исчерпания игрок увидит: «Товар закончился, загляните позже».`
  );
}

async function requireCatalogAdministrator(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? "Рабочая сессия истекла. Выполните <code>/staff</code> и повторите действие."
      : "У вас нет активного доступа к команде.");
    return null;
  }
  if (!access.owner && normalizeTeamRole(access.role) !== "administrator") {
    await sendTelegramMessage(env, chatId, "Эта команда доступна только администратору или владельцу.");
    return null;
  }
  return access;
}

function botShopCommandHelp(command = "add") {
  if (command === "delete") {
    return `<b>Формат удаления</b>\n\n<code>/deletedprodyct zefir</code>\n<code>/deletedprodyct case gold</code>`;
  }
  if (command === "price") {
    return `<b>Формат изменения цены</b>\n\n<code>/price zefir очки 40000 зефир 350</code>\n<code>/price americano кофе 350</code>\n<code>/price case gold очки 10000 зефир 100 кофе 100</code>\n\nМожно указать одну, две или три валюты. Неуказанные валюты будут равны нулю. Команда меняет только цену и не добавляет удалённый товар обратно в магазин.`;
  }
  return `<b>Формат добавления</b>\n\n<code>/addprodyct zefir очки 40000 зефир 350</code>\n<code>/addprodyct americano кофе 350</code>\n<code>/addprodyct case gold очки 10000 зефир 100 кофе 100</code>\n\nМожно указать одну, две или три валюты. Неуказанные валюты будут равны нулю.`;
}

async function addShopProductFromBot(chatId, user, rawPayload, env) {
  const access = await requireCatalogAdministrator(chatId, user, env);
  if (!access) return;
  const parsedProduct = extractBotShopProduct(rawPayload);
  const price = parsedProduct ? parseBotShopPrices(parsedProduct.rest) : null;
  if (!parsedProduct || !price) {
    await sendTelegramMessage(env, chatId, botShopCommandHelp("add"));
    return;
  }
  await ensureShopAssortmentSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const actorId = String(user.id);
  const statements = [env.DB.prepare(
    `INSERT INTO shop_assortment (product_id, enabled, points, treats, coffee, updated_at, updated_by)
     VALUES (?, 1, ?, ?, ?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET
       enabled = 1,
       points = excluded.points,
       treats = excluded.treats,
       coffee = excluded.coffee,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).bind(parsedProduct.id, price.points, price.treats, price.coffee, now, actorId)];
  if (DEFAULT_SHOP_PRODUCTS[parsedProduct.id]) {
    statements.push(env.DB.prepare(
      `INSERT INTO shop_prices (product_id, points, treats, coffee, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET
         points = excluded.points,
         treats = excluded.treats,
         coffee = excluded.coffee,
         version = shop_prices.version + 1,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(parsedProduct.id, price.points, price.treats, price.coffee, now, actorId));
  }
  await env.DB.batch(statements);
  await logStaffAction(env, user, access, "shop_product_enable", null, "product", null, null, {
    productId: parsedProduct.id,
    price
  });
  const costs = [
    price.points ? `${price.points.toLocaleString("ru-RU")} очков` : "",
    price.treats ? `${price.treats.toLocaleString("ru-RU")} зефира` : "",
    price.coffee ? `${price.coffee.toLocaleString("ru-RU")} кофе` : ""
  ].filter(Boolean).join(" + ");
  await sendTelegramMessage(env, chatId,
    `✅ <b>${escapeHtml(botShopProductTitle(parsedProduct.id))}</b> добавлен в ассортимент.\n\nЦена: <b>${escapeHtml(costs)}</b>\nИзменение появится у игроков после обновления магазина.`
  );
}

async function updateShopProductPriceFromBot(chatId, user, rawPayload, env) {
  const access = await requireCatalogAdministrator(chatId, user, env);
  if (!access) return;
  const parsedProduct = extractBotShopProduct(rawPayload);
  const price = parsedProduct ? parseBotShopPrices(parsedProduct.rest) : null;
  if (!parsedProduct || !price) {
    await sendTelegramMessage(env, chatId, botShopCommandHelp("price"));
    return;
  }

  await ensureShopAssortmentSchema(env);
  const current = await readShopAssortmentProduct(env, parsedProduct.id);
  if (!current) {
    await sendTelegramMessage(env, chatId, "Такого товара нет в ассортименте.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const actorId = String(user.id);
  const statements = [env.DB.prepare(
    `UPDATE shop_assortment
     SET points = ?, treats = ?, coffee = ?, updated_at = ?, updated_by = ?
     WHERE product_id = ?`
  ).bind(price.points, price.treats, price.coffee, now, actorId, parsedProduct.id)];

  if (DEFAULT_SHOP_PRODUCTS[parsedProduct.id]) {
    statements.push(env.DB.prepare(
      `INSERT INTO shop_prices (product_id, points, treats, coffee, version, updated_at, updated_by)
       VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET
         points = excluded.points,
         treats = excluded.treats,
         coffee = excluded.coffee,
         version = shop_prices.version + 1,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(parsedProduct.id, price.points, price.treats, price.coffee, now, actorId));
  }

  await env.DB.batch(statements);
  await logStaffAction(env, user, access, "shop_product_price_update", null, "product", null, null, {
    productId: parsedProduct.id,
    previousPrice: { points: current.points, treats: current.treats, coffee: current.coffee },
    price,
    enabled: current.enabled
  });

  const costs = [
    price.points ? `${price.points.toLocaleString("ru-RU")} очков` : "",
    price.treats ? `${price.treats.toLocaleString("ru-RU")} зефира` : "",
    price.coffee ? `${price.coffee.toLocaleString("ru-RU")} кофе` : ""
  ].filter(Boolean).join(" + ");
  const stateText = current.enabled
    ? "Товар остаётся в ассортименте."
    : "Товар пока скрыт из ассортимента; цена сохранена и применится после его возвращения.";

  await sendTelegramMessage(env, chatId,
    `💰 Цена товара <b>${escapeHtml(botShopProductTitle(parsedProduct.id))}</b> изменена.\n\nНовая цена: <b>${escapeHtml(costs)}</b>\n${escapeHtml(stateText)}\nИзменение появится у игроков после обновления магазина.`
  );
}

async function showShopProductsFromBot(chatId, user, env) {
  const access = await requireCatalogAdministrator(chatId, user, env);
  if (!access) return;
  await ensureShopAssortmentSchema(env);
  const assortment = await readShopAssortment(env);
  const stockRows = await readShopStockRows(env);
  const entries = Object.keys(SHOP_ASSORTMENT_PRODUCTS).map((productId, index) => {
    const product = assortment[productId] || cloneDefaultShopAssortment()[productId];
    const enabled = product?.enabled !== false;
    const status = enabled ? "🟢 Показан" : "🔴 Скрыт";
    const stock = shopStockAvailabilityFromRows(stockRows, "prize", productId);
    const stockText = stock.limited
      ? `Остаток: <b>${stock.remaining.toLocaleString("ru-RU")} / ${stock.limit.toLocaleString("ru-RU")}</b>`
      : `Остаток: <b>без лимита</b>`;
    return `${index + 1}. <b>${escapeHtml(botShopProductTitle(productId))}</b> (<code>${escapeHtml(botShopProductCommandName(productId))}</code>)
` +
      `${status}
` +
      `ID в файлах: <code>${escapeHtml(productId)}</code>
` +
      `Цена: <b>${escapeHtml(botShopPriceText(product))}</b>
` +
      stockText;
  });
  await sendTelegramListChunks(env, chatId, "Товары магазина", entries, "Товары не найдены.");
}

async function deleteShopProductFromBot(chatId, user, rawPayload, env) {
  const access = await requireCatalogAdministrator(chatId, user, env);
  if (!access) return;
  const parsedProduct = extractBotShopProduct(rawPayload);
  if (!parsedProduct || parsedProduct.rest.length) {
    await sendTelegramMessage(env, chatId, botShopCommandHelp("delete"));
    return;
  }
  await ensureShopAssortmentSchema(env);
  const current = await readShopAssortmentProduct(env, parsedProduct.id);
  if (!current?.enabled) {
    await sendTelegramMessage(env, chatId, `Товар <b>${escapeHtml(botShopProductTitle(parsedProduct.id))}</b> уже убран из ассортимента.`);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO shop_assortment (product_id, enabled, points, treats, coffee, updated_at, updated_by)
     VALUES (?, 0, ?, ?, ?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET
       enabled = 0,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).bind(parsedProduct.id, current.points, current.treats, current.coffee, now, String(user.id)).run();
  const verified = await readShopAssortmentProduct(env, parsedProduct.id);
  if (!verified || verified.enabled) {
    await sendTelegramMessage(env, chatId, "Не удалось скрыть товар. Повторите команду через несколько секунд.");
    return;
  }
  await logStaffAction(env, user, access, "shop_product_disable", null, "product", null, null, {
    productId: parsedProduct.id
  });
  await sendTelegramMessage(env, chatId,
    `🗑 <b>${escapeHtml(botShopProductTitle(parsedProduct.id))}</b> убран из ассортимента.

Статус: <b>скрыт</b>. Проверить весь список: <code>/towar</code>.
Старые покупки и уже полученные кейсы не изменены.`
  );
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

async function ensureStaffCustomNamesSchema(env) {
  await env.DB.prepare(STAFF_CUSTOM_NAMES_SCHEMA_SQL).run();
}

function normalizeStaffCustomName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function staffListDisplayName(row) {
  const telegramId = String(row?.telegram_id || "");
  const baseName = String(row?.display_name || "").trim() || `Telegram ${telegramId}`;
  const customName = String(row?.custom_name || "").trim();
  if (!customName || customName.toLocaleLowerCase("ru-RU") === baseName.toLocaleLowerCase("ru-RU")) return baseName;
  return `${baseName} (${customName})`;
}

function staffListRoleLabel(row, env) {
  return isBotAdminTelegramId(row?.telegram_id, env) ? "Владелец" : teamRoleLabel(row?.role);
}

async function setStaffListName(chatId, requester, telegramId, rawName, env) {
  const access = await requireTeamPermission(chatId, requester, "staff", env);
  if (!access) return;
  await ensureStaffCustomNamesSchema(env);

  const target = await targetTeamMember(env, telegramId);
  if (!target && !isBotAdminTelegramId(telegramId, env)) {
    await sendTelegramMessage(env, chatId, `Сотрудник с Telegram ID <code>${escapeHtml(String(telegramId))}</code> не найден в <code>/member_staff</code>.`);
    return;
  }

  const normalized = normalizeStaffCustomName(rawName);
  const clearName = /^(?:off|clear|reset|-|сброс|удалить)$/i.test(normalized);
  if (!clearName && (!normalized || Array.from(normalized).length > 64)) {
    await sendTelegramMessage(env, chatId, "Имя должно содержать от 1 до 64 символов.");
    return;
  }

  const previous = await env.DB.prepare(
    `SELECT custom_name FROM staff_custom_names WHERE telegram_id = ? LIMIT 1`
  ).bind(String(telegramId)).first();
  const oldName = String(previous?.custom_name || "");
  const now = Math.floor(Date.now() / 1000);

  if (clearName) {
    await env.DB.prepare(`DELETE FROM staff_custom_names WHERE telegram_id = ?`)
      .bind(String(telegramId)).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO staff_custom_names (telegram_id, custom_name, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET
         custom_name = excluded.custom_name,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`
    ).bind(String(telegramId), normalized, now, String(requester.id)).run();
  }

  await logStaffAction(env, requester, access, clearName ? "staff_name_clear" : "staff_name_set", String(telegramId), "staff", null, null, {
    oldName,
    newName: clearName ? "" : normalized
  });

  await sendTelegramMessage(env, chatId, clearName
    ? `Имя для <code>${escapeHtml(String(telegramId))}</code> удалено из списка сотрудников.`
    : `В списке сотрудников для <code>${escapeHtml(String(telegramId))}</code> установлено имя: <b>${escapeHtml(normalized)}</b>.`);
}

async function showStaffMembers(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "staff", env);
  if (!access) return;
  await ensureStaffCustomNamesSchema(env);

  const result = await env.DB.prepare(
    `SELECT s.telegram_id, s.display_name, s.role, s.active, s.session_expires_at,
            COALESCE(n.custom_name, '') AS custom_name
     FROM staff_users s
     LEFT JOIN staff_custom_names n ON n.telegram_id = s.telegram_id`
  ).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  rows.sort((first, second) => {
    const ownerDifference = Number(isBotAdminTelegramId(second.telegram_id, env)) - Number(isBotAdminTelegramId(first.telegram_id, env));
    if (ownerDifference) return ownerDifference;
    const activeDifference = Number(second.active || 0) - Number(first.active || 0);
    if (activeDifference) return activeDifference;
    const roleOrder = { administrator: 1, cashier: 2, cook: 3 };
    const roleDifference = (roleOrder[normalizeTeamRole(first.role)] || 4) - (roleOrder[normalizeTeamRole(second.role)] || 4);
    if (roleDifference) return roleDifference;
    return staffListDisplayName(first).localeCompare(staffListDisplayName(second), "ru-RU");
  });

  const now = Math.floor(Date.now() / 1000);
  const entries = rows.map((row, index) => {
    const active = Number(row.active || 0) === 1;
    const sessionActive = Number(row.session_expires_at || 0) > now;
    const status = active ? (sessionActive ? "активен · сессия открыта" : "активен · требуется /staff") : "отключён";
    return `${index + 1}. <b>${escapeHtml(staffListDisplayName(row))}</b>
Роль: ${escapeHtml(staffListRoleLabel(row, env))}
Telegram ID: <code>${escapeHtml(String(row.telegram_id || ""))}</code>
Статус: ${escapeHtml(status)}`;
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
  await ensureStaffCustomNamesSchema(env);
  const result = await env.DB.prepare(
    `SELECT s.telegram_id, s.display_name, s.role, s.active, s.session_expires_at,
            s.can_redeem_rewards, s.can_adjust_points, s.can_manage_products,
            s.can_publish_news, s.can_manage_staff,
            COALESCE(n.custom_name, '') AS custom_name
     FROM staff_users s
     LEFT JOIN staff_custom_names n ON n.telegram_id = s.telegram_id
     ORDER BY s.active DESC, s.role DESC, s.display_name ASC LIMIT 50`
  ).all();
  const rows = Array.isArray(result.results) ? result.results : [];
  rows.sort((first, second) => Number(isBotAdminTelegramId(second.telegram_id, env)) - Number(isBotAdminTelegramId(first.telegram_id, env)));
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
    return `• <code>${escapeHtml(String(row.telegram_id))}</code> — ${escapeHtml(staffListDisplayName(row))}
  ${escapeHtml(staffListRoleLabel(row, env))} · ${Number(row.active) ? session : "отключён"}
  Права: ${escapeHtml(permissions)}`;
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
  return showAdminPanelCommands(chatId, user, env);
}

async function showAdminPanelCommands(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? `Рабочая сессия истекла. Снова выполните <code>/staff</code>.\n\nВаш Telegram ID: <code>${escapeHtml(String(user.id))}</code>`
      : `У вас нет доступа сотрудника. Передайте владельцу ваш Telegram ID: <code>${escapeHtml(String(user.id))}</code>`);
    return;
  }

  const entries = [
    `<b>Основное</b>\n<code>/staff_me</code> — моя роль, права и статистика\n<code>/adminpanel</code> — кнопочная админ-панель\n<code>/adminpanel_kmd</code> — полный справочник команд\n<code>/bot_version</code> — проверить версию Worker\n<code>/status</code> — состояние игры, бота, Cron и рейтинга\n<code>/cancel</code> — отменить текущее действие\n<code>/whoami</code> — мой Telegram ID`,
    `<b>Обращения</b>\n<code>/ticket</code> — создать обращение через кнопки\n<code>/tickets</code> — открытые обращения\n<code>/tickets mine</code> — мои обращения\n<code>/ticket_info НОМЕР</code> — открыть карточку обращения`,
    `<b>Проверка заказов</b>\n<code>/check_code КОД</code> — проверить код без списания\n<code>/pending_orders</code> — активные заказы`
  ];

  if (access.permissions?.redeem) {
    entries.push(`<b>Выдача физических наград</b>\n<code>/redeem</code> — пошаговая проверка кода\n<code>/redeem КОД</code> — сразу открыть подтверждение\n<code>/my_redemptions</code> — мои последние выдачи\n<code>/redemptions_today</code> — сколько выдано сегодня
<code>/stock</code> — остатки физических наград${access.owner ? `\n<code>/undo_redeem КОД</code> — отменить ошибочное списание в течение 5 минут` : ""}`);
  }

  if (access.permissions?.points) {
    entries.push(
      `<b>Карточка игрока</b>\n<code>/player TELEGRAM_ID</code>\n<code>/player @username</code>\nПоказывает баланс, прогресс, рейтинг, коллекцию, кейсы, бустер, покупки и физические награды. Владелец и администратор могут изменить имя, заблокировать или разблокировать игрока кнопками в карточке.`,
      `<b>Выдача наград</b>\n<code>/grant</code> — пошаговая выдача валюты, кейса, аватарки, рамки, следа или скина с подтверждением и причиной\n\nПрямые команды:\n<code>/add_zefir СУММА TELEGRAM_ID ПРИЧИНА</code>\n<code>/add_coffee СУММА TELEGRAM_ID ПРИЧИНА</code>\n<code>/add_points СУММА TELEGRAM_ID ПРИЧИНА</code>\n<code>/add_keys ТИП КОЛИЧЕСТВО TELEGRAM_ID ПРИЧИНА</code>`,
      `<b>Рейтинг</b>\n<code>/season</code> — карточка сезона, топ-10, продление, изменение награды и досрочное завершение`
    );
  }

  if (access.owner || normalizeTeamRole(access.role) === "administrator" || access.permissions?.products) {
    entries.push(`<b>Магазин и остатки</b>\n<code>/stock</code> — остатки физических наград и выдачи за сегодня\n<code>/towar</code> — ассортимент, цены и все лимиты\n<code>/addprodyct ТОВАР ЦЕНА</code> — добавить или вернуть товар\n<code>/deletedprodyct ТОВАР</code> — скрыть товар\n<code>/price ТОВАР ЦЕНА</code> — изменить цену\n<code>/setlimit КАТЕГОРИЯ [ТОВАР] КОЛИЧЕСТВО</code>\nПримеры: <code>/setlimit skins 1</code>, <code>/setlimit prize case legendary 10</code>`);
  }

  if (access.owner || normalizeTeamRole(access.role) === "administrator") {
    entries.push(
      `<b>LiveOps и экономика</b>
<code>/economy</code> — экономика и основные показатели
<code>/segments</code> — сегменты игроков
<code>/campaign</code> — массовая выдача с подтверждением
<code>/campaigns</code> — статусы кампаний
<code>/fraud</code> — очередь подозрительных событий`,
      `<b>Контент и кейсы без деплоя</b>
<code>/content</code> — включение предметов и метки NEW
<code>/content_weight KIND ITEM_ID ВЕС</code> — внутренний вес
<code>/cases_admin</code> — конструктор кейсов
<code>/case_chance CASE CATEGORY VALUE</code> — изменить шанс; сумма должна быть 100%
<code>/case_guarantee CASE COUNT</code> — гарант, максимум 50
<code>/config_history</code> — история и откат настроек`
    );
  }

  if (access.permissions?.news) {
    entries.push(`<b>Новости</b>\n<code>/publish ЗАГОЛОВОК | ТЕКСТ | URL_КАРТИНКИ</code> — опубликовать новость`);
  }

  if (access.permissions?.staff) {
    entries.push(
      `<b>Команда и контроль</b>\n<code>/team</code> или <code>/staff_list</code> — управление сотрудниками\n<code>/member_staff</code> — сотрудники и роли\n<code>/set_name TELEGRAM_ID ИМЯ</code> — имя в списке\n<code>/players</code> или <code>/members</code> — игроки и Telegram ID\n<code>/audit</code> — последние действия\n<code>/audit today</code> — действия за сегодня\n<code>/audit rewards</code> — только награды\n<code>/audit TELEGRAM_ID</code> — действия по игроку\n<code>/tickets all</code> — все обращения\n<code>/daily_report</code> — сводка за текущий день`,
      `<b>Роли и доступ</b>\n<code>/rang_staff_kassir TELEGRAM_ID</code>\n<code>/rang_staff_povar TELEGRAM_ID</code>\n<code>/staff_enable TELEGRAM_ID</code>\n<code>/staff_disable TELEGRAM_ID</code>\n<code>/team_add TELEGRAM_ID РОЛЬ</code>\n<code>/team_role TELEGRAM_ID РОЛЬ</code>\n<code>/team_remove TELEGRAM_ID</code>`
    );
    if (access.owner) {
      entries.push(`<b>Только владелец</b>\n<code>/rang_staff_administrator TELEGRAM_ID</code>\n<code>/permit TELEGRAM_ID redeem|points|products|news|staff on|off</code>\n<code>/post ТЕКСТ</code> — рассылка всем пользователям`);
    }
  } else if (access.owner) {
    entries.push(`<b>Только владелец</b>\n<code>/post ТЕКСТ</code> — рассылка всем пользователям`);
  }

  await logStaffAction(env, user, access, "view_admin_command_panel", null, "staff", null, null, { sections: entries.length });
  await sendTelegramListChunks(env, chatId, `Админ-панель · ${staffRoleTitle(access)}`, entries, "Для вашей роли команды не настроены.");
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

async function resolvePlayerTelegramId(value, env) {
  const raw = String(value || "").trim();
  if (/^\d{4,20}$/.test(raw)) return raw;
  const username = raw.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(username)) return "";

  const allTime = await env.DB.prepare(
    `SELECT telegram_id FROM leaderboard_all_time WHERE LOWER(username) = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(username).first();
  if (allTime?.telegram_id) return String(allTime.telegram_id);

  const seasonal = await env.DB.prepare(
    `SELECT telegram_id FROM leaderboard_entries WHERE LOWER(username) = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(username).first();
  if (seasonal?.telegram_id) return String(seasonal.telegram_id);

  try {
    const subscriber = await env.DB.prepare(
      `SELECT telegram_id FROM bot_subscribers WHERE LOWER(username) = ? ORDER BY last_started_at DESC LIMIT 1`
    ).bind(username).first();
    if (subscriber?.telegram_id) return String(subscriber.telegram_id);
  } catch {}
  return "";
}

function playerCatalogNames(ids, catalog, limit = 20) {
  const names = (Array.isArray(ids) ? ids : [])
    .map((id) => catalog?.[id]?.title || SKINS?.[id]?.title || String(id || ""))
    .filter(Boolean);
  if (!names.length) return "нет";
  const shown = names.slice(0, Math.max(1, limit));
  return `${shown.join(", ")}${names.length > shown.length ? ` и ещё ${names.length - shown.length}` : ""}`;
}

function playerRewardStatusLabel(status, expiresAt = 0) {
  const now = Math.floor(Date.now() / 1000);
  const normalized = String(status || "active");
  if (normalized === "active" && Number(expiresAt || 0) <= now) return "истекла";
  return ({ active: "ожидает выдачи", used: "выдана", expired: "истекла", cancelled: "отменена" })[normalized] || normalized;
}

function playerCaseTypeTitle(caseType) {
  return LEVEL_CASE_CONFIG[String(caseType || "")]?.title || String(caseType || "Кейс");
}

function playerActiveCosmeticTitle(id, catalog, emptyText = "не выбрано") {
  return id && catalog?.[id]?.title ? catalog[id].title : emptyText;
}

async function showPlayerProfile(chatId, user, telegramId, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const playerId = String(telegramId);
  const profile = await env.DB.prepare(
    `SELECT telegram_id, wallet, best_score, treats, coffee, profile_xp,
            pending_wallet, pending_treats, pending_coffee,
            revision, created_at, updated_at
     FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(playerId).first();
  if (!profile) {
    await sendTelegramMessage(env, chatId, `Игрок <code>${escapeHtml(playerId)}</code> ещё не синхронизировал профиль. Попросите его один раз открыть игру.`);
    return;
  }

  await ensureLiveOpsAdminSchema(env);
  const [season, playerControl, liveops, notesCountRow] = await Promise.all([
    ensureSeason(env),
    getPlayerAdminControl(playerId, env),
    readLiveOpsConfig(env),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM player_notes WHERE telegram_id = ? AND deleted_at = 0`).bind(playerId).first()
  ]);
  const [allTime, seasonIdentity, subscriber, caseRow, seasonRank, runStats, pendingCasesResult, rewardsResult, casePurchasesResult, skinPurchasesResult] = await Promise.all([
    env.DB.prepare(`SELECT display_name, username, best_score, level, updated_at FROM leaderboard_all_time WHERE telegram_id = ? LIMIT 1`).bind(playerId).first(),
    env.DB.prepare(`SELECT display_name, username, best_score, level, updated_at FROM leaderboard_entries WHERE season_id = ? AND telegram_id = ? LIMIT 1`).bind(String(season.id), playerId).first(),
    env.DB.prepare(`SELECT display_name, username, last_started_at, active FROM bot_subscribers WHERE telegram_id = ? LIMIT 1`).bind(playerId).first().catch(() => null),
    env.DB.prepare(`SELECT * FROM case_player_state WHERE telegram_id = ? LIMIT 1`).bind(playerId).first(),
    env.DB.prepare(
      `SELECT place, best_score, level, display_name, username, updated_at FROM (
         SELECT telegram_id, best_score, level, display_name, username, updated_at,
                ROW_NUMBER() OVER (ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC) AS place
         FROM leaderboard_entries WHERE season_id = ? AND hidden = 0
       ) WHERE telegram_id = ? LIMIT 1`
    ).bind(String(season.id), playerId).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total_runs,
              SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) AS accepted_runs,
              MAX(created_at) AS last_run_at
       FROM leaderboard_runs WHERE telegram_id = ?`
    ).bind(playerId).first(),
    env.DB.prepare(
      `SELECT case_type, COUNT(*) AS count FROM granted_cases
       WHERE telegram_id = ? AND status = 'pending' GROUP BY case_type`
    ).bind(playerId).all(),
    env.DB.prepare(
      `SELECT product_name, status, created_at, expires_at, request_id
       FROM reward_codes WHERE owner_telegram_id = ?
       ORDER BY created_at DESC LIMIT 3`
    ).bind(playerId).all(),
    env.DB.prepare(
      `SELECT case_type, status, created_at FROM granted_cases
       WHERE telegram_id = ? AND granted_by = 'shop'
       ORDER BY created_at DESC LIMIT 3`
    ).bind(playerId).all(),
    env.DB.prepare(
      `SELECT product_id, created_at FROM shop_stock_consumptions
       WHERE telegram_id = ? AND category = 'skins'
       ORDER BY created_at DESC LIMIT 100`
    ).bind(playerId).all()
  ]);

  const identity = seasonIdentity || allTime || subscriber || {};
  const displayName = String(playerControl.customName || identity.display_name || allTime?.display_name || subscriber?.display_name || "Игрок без имени").trim() || "Игрок без имени";
  const username = String(identity.username || allTime?.username || subscriber?.username || "").trim().replace(/^@/, "");
  const caseState = caseStateFromRow(caseRow || {});
  const purchasedSkinIds = (Array.isArray(skinPurchasesResult.results) ? skinPurchasesResult.results : [])
    .map((row) => String(row?.product_id || ""))
    .filter((skinId) => skinId !== "default" && Object.prototype.hasOwnProperty.call(SKINS, skinId));
  const synchronizedOwnedSkins = normalizeCurrentOwnedSkins(caseState.ownedSkins);
  const mergedOwnedSkins = [...new Set([...synchronizedOwnedSkins, ...purchasedSkinIds])];
  const ownedSkins = ["default", ...mergedOwnedSkins];
  const activeSkinId = normalizeCurrentActiveSkin(caseState.activeSkinId, mergedOwnedSkins);
  const activeSkinTitle = SKINS[activeSkinId]?.title || SKINS.default.title;
  const pendingCaseCounts = { small: 0, sweet: 0, gold: 0, legendary: 0 };
  for (const row of Array.isArray(pendingCasesResult.results) ? pendingCasesResult.results : []) {
    if (Object.prototype.hasOwnProperty.call(pendingCaseCounts, String(row.case_type))) {
      pendingCaseCounts[String(row.case_type)] = Math.max(0, Number(row.count || 0));
    }
  }

  const pendingLines = [
    Number(profile.pending_wallet || 0) > 0 ? `+${Number(profile.pending_wallet).toLocaleString("ru-RU")} очков` : null,
    Number(profile.pending_treats || 0) > 0 ? `+${Number(profile.pending_treats).toLocaleString("ru-RU")} зефира` : null,
    Number(profile.pending_coffee || 0) > 0 ? `+${Number(profile.pending_coffee).toLocaleString("ru-RU")} кофе` : null
  ].filter(Boolean);

  const boosterType = String(caseState.activeBooster?.type || "");
  const boosterLabel = boosterType
    ? `${CASE_BOOSTER_TYPES.includes(boosterType) ? ({ points: "×2 очки", treats: "×2 зефир", coffee: "×2 кофе" })[boosterType] : boosterType} · ${Number(caseState.activeBooster.runsLeft || 0)} забега`
    : "не активен";

  const seasonStatus = String(season.status || "scheduled");
  const seasonLine = seasonRank
    ? `Место: <b>${Number(seasonRank.place || 0)}</b> · результат: <b>${Number(seasonRank.best_score || 0).toLocaleString("ru-RU")}</b>`
    : "В рейтинг ещё не попал";

  const purchases = [];
  for (const row of Array.isArray(casePurchasesResult.results) ? casePurchasesResult.results : []) {
    purchases.push({ at: Number(row.created_at || 0), text: `${playerCaseTypeTitle(row.case_type)} · ${String(row.status) === "opened" ? "открыт" : "ожидает открытия"}` });
  }
  for (const row of Array.isArray(skinPurchasesResult.results) ? skinPurchasesResult.results : []) {
    purchases.push({ at: Number(row.created_at || 0), text: `Скин «${SKINS[String(row.product_id)]?.title || String(row.product_id || "") }»` });
  }
  purchases.sort((a, b) => b.at - a.at);
  const purchaseLines = purchases.slice(0, 4).map((entry) => `• ${escapeHtml(entry.text)} · ${escapeHtml(formatUtcDate(entry.at))}`);

  const rewardLines = (Array.isArray(rewardsResult.results) ? rewardsResult.results : []).map((row) => {
    const source = String(row.request_id || "").startsWith("case_reward_") ? "из кейса" : "из магазина";
    return `• ${escapeHtml(String(row.product_name || "Награда"))} · ${escapeHtml(playerRewardStatusLabel(row.status, row.expires_at))} · ${source}`;
  });

  const moderationStatus = playerControl.blocked
    ? `🔴 доступ ограничен ${banDurationLabel(playerControl.blockType, playerControl.blockedUntil)}${playerControl.blockReason ? ` · ${playerControl.blockReason}` : ""}`
    : "🟢 доступ разрешён";
  const legendaryGuarantee = Math.max(1, Math.min(50, Number(liveops?.cases?.legendary?.guaranteeCount || 50)));
  const customNameLine = playerControl.customName
    ? `Административное имя: <b>${escapeHtml(playerControl.customName)}</b>\n`
    : "";

  const lastActivity = Math.max(
    Number(profile.updated_at || 0),
    Number(allTime?.updated_at || 0),
    Number(seasonIdentity?.updated_at || 0),
    Number(subscriber?.last_started_at || 0),
    Number(caseRow?.updated_at || 0),
    Number(runStats?.last_run_at || 0)
  );

  const text = `<b>👤 Карточка игрока</b>

` +
    `Имя: <b>${escapeHtml(displayName)}</b>\n` +
    `Username: ${username ? `@${escapeHtml(username)}` : "не указан"}\n` +
    `Telegram ID: <code>${escapeHtml(playerId)}</code>\n` +
    customNameLine +
    `Доступ: <b>${escapeHtml(moderationStatus)}</b>\n` +
    `Последняя активность: <b>${escapeHtml(lastActivity ? formatUtcDate(lastActivity) : "нет данных")}</b>\n\n` +
    `<b>Баланс и прогресс</b>\n` +
    `Очки: <b>${Number(profile.wallet || 0).toLocaleString("ru-RU")}</b>\n` +
    `Зефир: <b>${Number(profile.treats || 0).toLocaleString("ru-RU")}</b>\n` +
    `Кофе: <b>${Number(profile.coffee || 0).toLocaleString("ru-RU")}</b>\n` +
    `Ожидает начисления: <b>${escapeHtml(pendingLines.length ? pendingLines.join(", ") : "нет")}</b>\n` +
    `Уровень: <b>${profileLevelFromXp(profile.profile_xp)}</b> · XP: <b>${Number(profile.profile_xp || 0).toLocaleString("ru-RU")}</b>\n` +
    `Личный рекорд: <b>${Math.max(Number(profile.best_score || 0), Number(allTime?.best_score || 0)).toLocaleString("ru-RU")}</b>\n` +
    `Забеги: <b>${Number(runStats?.accepted_runs || 0)}</b> зачтено из ${Number(runStats?.total_runs || 0)}\n\n` +
    `<b>🏆 ${escapeHtml(String(season.title || "Текущий сезон"))}</b>\n` +
    `${seasonLine}\nСтатус: <b>${escapeHtml(({ scheduled: "ожидает старта", active: "идёт", ended: "завершён", cancelled: "отменён" })[seasonStatus] || seasonStatus)}</b>\n\n` +
    `<b>Коллекция</b>\n` +
    `Скины: <b>${ownedSkins.length}/${Object.keys(SKINS).length}</b> · надет: <b>${escapeHtml(activeSkinTitle)}</b>\n${escapeHtml(playerCatalogNames(ownedSkins, SKINS))}\n` +
    `Аватарки: <b>${caseState.ownedAvatars.length}/${Object.keys(CASE_AVATARS).length}</b> · активная: <b>${escapeHtml(playerActiveCosmeticTitle(caseState.activeAvatarId, CASE_AVATARS))}</b>\n${escapeHtml(playerCatalogNames(caseState.ownedAvatars, CASE_AVATARS))}\n` +
    `Рамки: <b>${caseState.ownedFrames.length}/${Object.keys(CASE_FRAMES).length}</b> · активная: <b>${escapeHtml(playerActiveCosmeticTitle(caseState.activeFrameId, CASE_FRAMES))}</b>\n${escapeHtml(playerCatalogNames(caseState.ownedFrames, CASE_FRAMES))}\n` +
    `Следы: <b>${caseState.ownedTrails.length}/${Object.keys(CASE_TRAILS).length}</b> · активный: <b>${escapeHtml(playerActiveCosmeticTitle(caseState.activeTrailId, CASE_TRAILS))}</b>\n${escapeHtml(playerCatalogNames(caseState.ownedTrails, CASE_TRAILS))}\n\n` +
    `<b>Кейсы и усилители</b>\n` +
    `Обычные: <b>${pendingCaseCounts.small}</b> · Серебряные: <b>${pendingCaseCounts.sweet}</b> · Золотые: <b>${pendingCaseCounts.gold}</b> · Легендарные: <b>${pendingCaseCounts.legendary}</b>\n` +
    `Активный бустер: <b>${escapeHtml(boosterLabel)}</b>\n` +
    `До гаранта Легендарного кейса: <b>${Math.max(1, legendaryGuarantee - Math.max(0, Math.min(legendaryGuarantee - 1, Number(caseState.legendaryPityCounter || 0))))}</b> открытий\n\n` +
    `<b>Последние покупки</b>\n${purchaseLines.length ? purchaseLines.join("\n") : "Покупок не найдено."}\n\n` +
    `<b>Физические награды</b>\n${rewardLines.length ? rewardLines.join("\n") : "Физических наград не найдено."}`;

  await logStaffAction(env, user, access, "view_player_card", playerId, "player", null, null, {
    seasonId: String(season.id || ""),
    rank: Number(seasonRank?.place || 0),
    ownedSkins: ownedSkins.length,
    ownedAvatars: caseState.ownedAvatars.length,
    ownedFrames: caseState.ownedFrames.length,
    ownedTrails: caseState.ownedTrails.length,
    customName: playerControl.customName,
    blocked: playerControl.blocked
  });
  const primaryPlayerActions = [
    { text: "🎁 Выдать награду", callback_data: `player_grant:${playerId}` },
    { text: `📝 Заметки (${Number(notesCountRow?.count || 0)})`, callback_data: `player_notes:${playerId}` }
  ];
  if (access.owner || access.permissions?.log) {
    primaryPlayerActions.push({ text: "📋 История", callback_data: `player_audit:${playerId}` });
  }
  const playerActions = [primaryPlayerActions];
  if (canManagePlayerControls(access)) {
    playerActions.push([
      { text: "✏️ Изменить имя", callback_data: `player_name:${playerId}` },
      playerControl.blocked
        ? { text: "✅ Разблокировать", callback_data: `player_unblock:${playerId}` }
        : { text: "⛔ Заблокировать", callback_data: `player_block:${playerId}` }
    ]);
  }
  playerActions.push(
    [
      { text: "🔄 Обновить карточку", callback_data: `player_refresh:${playerId}` },
      { text: "📚 Все команды", callback_data: "adminpanel_commands" }
    ]
  );
  await sendTelegramMessage(env, chatId, text, { inline_keyboard: playerActions });
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
  return ({ strawberry: "strawberry", "клубничная": "strawberry", coffee: "coffee", "кофейная": "coffee", marshmallow: "marshmallow", "зефирная": "marshmallow", flower: "flower", mint: "flower", "цветочная": "flower", "мятная": "flower", gold: "gold", "золотая": "gold", elite: "elite", "элитная": "elite", "легендарная": "elite" })[raw] || "";
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
    await sendTelegramMessage(env, chatId, "Неизвестный тип кейса. Доступно: <code>small</code>, <code>sweet</code>, <code>gold</code>, <code>legendary</code>.");
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
    await sendTelegramMessage(env, chatId, "Неизвестная рамка. Доступно: <code>strawberry</code>, <code>coffee</code>, <code>marshmallow</code>, <code>flower</code>, <code>gold</code>, <code>elite</code>.");
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
    shop_stock_limit_set: "установка остатка магазина",
    shop_stock_limit_remove: "снятие лимита остатка",
    add_frame: "выдача рамки",
    grant_avatar: "выдача аватарки",
    grant_frame: "выдача рамки",
    grant_trail: "выдача следа",
    grant_skin: "выдача скина",
    undo_redeem: "отмена списания награды",
    view_stock: "просмотр остатков",
    view_season: "просмотр сезона",
    season_extend: "продление сезона",
    season_reward_change: "изменение награды сезона",
    season_finish_early: "досрочное завершение сезона",
    ticket_create: "создание обращения",
    ticket_status: "изменение статуса обращения",
    view_daily_report: "просмотр дневной сводки",
    player_name_change: "изменение имени игрока",
    player_block: "блокировка игрока",
    player_unblock: "разблокировка игрока",
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

function botAdminTelegramIds(env) {
  return String(env.SHOP_ADMIN_TELEGRAM_IDS || env.ADMIN_TELEGRAM_IDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isBotAdminTelegramId(telegramId, env) {
  return botAdminTelegramIds(env).includes(String(telegramId || ""));
}

function isBotAdminUser(user, env) {
  return isBotAdminTelegramId(user?.id, env);
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

async function deleteCallbackSourceMessage(query, env) {
  const chatId = query?.message?.chat?.id;
  const messageId = query?.message?.message_id;
  if (!chatId || !messageId) return;
  try {
    await telegramApi(env, "deleteMessage", { chat_id: chatId, message_id: messageId });
  } catch (error) {
    const description = String(error?.description || error?.message || "");
    if (!/message to delete not found|message can.t be deleted|message identifier is not specified/i.test(description)) {
      console.warn("Telegram callback source cleanup failed", description);
    }
  }
}

async function handleCallbackQuery(query, env) {
  try {
    return await handleCallbackQueryAction(query, env);
  } finally {
    await deleteCallbackSourceMessage(query, env);
  }
}

async function handleCallbackQueryAction(query, env) {
  const data = String(query.data || "");
  const user = query.from;
  const message = query.message;
  const chatId = message?.chat?.id;
  if (!chatId || !user?.id) return;

  if (await handleMenuCallback(query, env)) return;

  const playerRefresh = data.match(/^player_refresh:(\d{4,20})$/);
  if (playerRefresh) {
    await answerCallback(env, query.id, "Карточка обновлена.");
    await showPlayerProfile(chatId, user, playerRefresh[1], env);
    return;
  }
  if (data === "adminpanel_commands") {
    await answerCallback(env, query.id, "Открываю список команд.");
    await showAdminPanelCommands(chatId, user, env);
    return;
  }

  if (await handleLiveOpsAdminCallback(query, env)) return;
  if (await handleStaffOperationsCallback(query, env)) return;

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
    await sendTelegramMessage(
      env,
      chatId,
      `⚠️ <b>Подтвердите выдачу</b>\n\nНаграда: <b>${escapeHtml(reward.product_name)}</b>\nКод: <code>${escapeHtml(reward.code)}</code>\n\nНажимайте «Да, списать» только после того, как подарок передан гостю.`,
      {
        inline_keyboard: [[
          { text: "Да, подарок выдан", callback_data: `confirm:${reward.code_compact}` },
          { text: "Отмена", callback_data: `cancel:${reward.code_compact}` }
        ]]
      }
    );
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
      await recordRedemptionWorkContext(env, reward, user);
      const workContext = await env.DB.prepare(`SELECT location_name, shift_name FROM staff_work_context WHERE telegram_id = ? LIMIT 1`).bind(String(user.id)).first();
      await logStaffAction(env, user, access, "redeem_reward", String(reward.owner_telegram_id || ""), "reward", null, null, {
        code: reward.code,
        product: reward.product_name,
        location: String(workContext?.location_name || env.CAFE_LOCATION_NAME || "Основное кафе"),
        shift: String(workContext?.shift_name || "")
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
  await sendTelegramMessage(env, message.chat.id, view.text, view.replyMarkup || null);
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

async function ensureBotSubscriberSchema(env) {
  await env.DB.prepare(BOT_SUBSCRIBERS_SCHEMA_SQL).run();
}

async function ensureBotBroadcastSchema(env) {
  await env.DB.batch([
    env.DB.prepare(BOT_SUBSCRIBERS_SCHEMA_SQL),
    env.DB.prepare(BOT_BROADCASTS_SCHEMA_SQL),
    env.DB.prepare(BOT_BROADCAST_DELIVERIES_SCHEMA_SQL),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_bot_subscribers_active ON bot_subscribers(active, id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_bot_broadcasts_pending ON bot_broadcasts(status, lease_until, created_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_bot_broadcast_deliveries_pending ON bot_broadcast_deliveries(broadcast_id, status, subscriber_id)`)
  ]);
}

async function registerBotSubscriber(message, env) {
  if (!message?.from?.id || !message?.chat?.id) return;
  if (message.chat.type && String(message.chat.type) !== "private") return;
  await ensureBotSubscriberSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const telegramId = String(message.from.id);
  const chatId = String(message.chat.id);
  const username = String(message.from.username || "").trim().slice(0, 64);
  const displayName = telegramDisplayName(message.from).slice(0, 160);
  await env.DB.prepare(
    `INSERT INTO bot_subscribers (
       telegram_id, chat_id, username, display_name, first_started_at, last_started_at,
       active, last_error, last_delivery_at
     ) VALUES (?, ?, ?, ?, ?, ?, 1, '', 0)
     ON CONFLICT(telegram_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       username = excluded.username,
       display_name = excluded.display_name,
       last_started_at = excluded.last_started_at,
       active = 1,
       last_error = ''`
  ).bind(telegramId, chatId, username, displayName, now, now).run();
}

async function createBotBroadcast(chatId, user, rawText, env, runtime = {}) {
  if (!isBotAdminUser(user, env)) {
    await sendTelegramMessage(env, chatId, "Команда <code>/post</code> доступна только владельцу.");
    return;
  }

  const messageText = String(rawText || "").trim();
  if (!messageText) {
    await sendTelegramMessage(env, chatId, `<b>Формат команды</b>\n\n<code>/post ТЕКСТ</code>\n\nПример: <code>/post Внимание! Следующее обновление будет со сбросом данных.</code>`);
    return;
  }
  if (messageText.length > 4096) {
    await sendTelegramMessage(env, chatId, "Сообщение слишком длинное. Максимум — 4096 символов.");
    return;
  }

  await ensureBotBroadcastSchema(env);
  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM bot_subscribers WHERE active = 1`
  ).first();
  const total = safeAdminNumber(totalRow?.total);
  if (total < 1) {
    await sendTelegramMessage(env, chatId, "В списке рассылки пока нет пользователей. Они добавляются после команды <code>/start</code>.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const broadcastId = caseGrantId("post");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO bot_broadcasts (
         broadcast_id, message_text, created_by, report_chat_id, created_at, status,
         total_count, sent_count, failed_count, updated_at, completed_at,
         completion_notified, lease_token, lease_until
       ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 0, 0, ?, 0, 0, '', 0)`
    ).bind(broadcastId, messageText, String(user.id), String(chatId), now, total, now),
    env.DB.prepare(
      `INSERT INTO bot_broadcast_deliveries (
         broadcast_id, subscriber_id, telegram_id, status, attempts, error_text, attempted_at
       )
       SELECT ?, id, telegram_id, 'pending', 0, '', 0
       FROM bot_subscribers WHERE active = 1`
    ).bind(broadcastId)
  ]);

  await sendTelegramMessage(
    env,
    chatId,
    `<b>Рассылка запущена</b>\n\nПолучателей: <b>${formatBotBroadcastCount(total)}</b>\nПервая часть отправится сразу, остальные — автоматически. После завершения придёт отчёт.`
  );

  const task = processBotBroadcastJob(env, broadcastId).catch((error) => {
    console.error("Initial bot broadcast batch failed", error);
  });
  if (runtime?.ctx?.waitUntil) runtime.ctx.waitUntil(task);
  else await task;
}

function formatBotBroadcastCount(value) {
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, Number(value) || 0));
}

async function processPendingBotBroadcast(env) {
  await ensureBotBroadcastSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const job = await env.DB.prepare(
    `SELECT broadcast_id
     FROM bot_broadcasts
     WHERE status IN ('pending', 'running')
       AND (lease_until = 0 OR lease_until < ?)
     ORDER BY created_at ASC
     LIMIT 1`
  ).bind(now).first();
  if (!job?.broadcast_id) return { processed: false };
  return processBotBroadcastJob(env, String(job.broadcast_id));
}

async function processBotBroadcastJob(env, broadcastId) {
  await ensureBotBroadcastSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const leaseToken = caseGrantId("broadcast_lock");
  const lease = await env.DB.prepare(
    `UPDATE bot_broadcasts
     SET status = 'running', lease_token = ?, lease_until = ?, updated_at = ?
     WHERE broadcast_id = ?
       AND status IN ('pending', 'running')
       AND (lease_until = 0 OR lease_until < ?)`
  ).bind(leaseToken, now + BOT_BROADCAST_LEASE_SECONDS, now, broadcastId, now).run();
  if (safeAdminNumber(lease?.meta?.changes) < 1) return { processed: false, locked: true };

  const job = await env.DB.prepare(
    `SELECT broadcast_id, message_text, report_chat_id, total_count,
            sent_count, failed_count, completion_notified
     FROM bot_broadcasts
     WHERE broadcast_id = ? AND lease_token = ? LIMIT 1`
  ).bind(broadcastId, leaseToken).first();
  if (!job) return { processed: false };

  const result = await env.DB.prepare(
    `SELECT d.subscriber_id, d.telegram_id, d.attempts, s.chat_id
     FROM bot_broadcast_deliveries d
     JOIN bot_subscribers s ON s.id = d.subscriber_id
     WHERE d.broadcast_id = ? AND d.status = 'pending'
     ORDER BY d.subscriber_id ASC
     LIMIT ?`
  ).bind(broadcastId, BOT_BROADCAST_BATCH_SIZE).all();
  const deliveries = result.results || [];

  for (const delivery of deliveries) {
    const attemptedAt = Math.floor(Date.now() / 1000);
    const attempts = safeAdminNumber(delivery.attempts) + 1;
    try {
      await sendTelegramPlainMessage(env, delivery.chat_id, String(job.message_text || ""));
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE bot_broadcast_deliveries
           SET status = 'sent', attempts = ?, error_text = '', attempted_at = ?
           WHERE broadcast_id = ? AND subscriber_id = ? AND status = 'pending'`
        ).bind(attempts, attemptedAt, broadcastId, delivery.subscriber_id),
        env.DB.prepare(
          `UPDATE bot_subscribers
           SET last_delivery_at = ?, last_error = ''
           WHERE id = ?`
        ).bind(attemptedAt, delivery.subscriber_id)
      ]);
    } catch (error) {
      const errorText = String(error?.message || error || "Ошибка Telegram").slice(0, 500);
      const permanent = isPermanentTelegramDeliveryError(error);
      const exhausted = attempts >= BOT_BROADCAST_MAX_ATTEMPTS;
      const nextStatus = permanent || exhausted ? "failed" : "pending";
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE bot_broadcast_deliveries
           SET status = ?, attempts = ?, error_text = ?, attempted_at = ?
           WHERE broadcast_id = ? AND subscriber_id = ? AND status = 'pending'`
        ).bind(nextStatus, attempts, errorText, attemptedAt, broadcastId, delivery.subscriber_id),
        env.DB.prepare(
          `UPDATE bot_subscribers
           SET active = CASE WHEN ? = 1 THEN 0 ELSE active END,
               last_error = ?
           WHERE id = ?`
        ).bind(permanent ? 1 : 0, errorText, delivery.subscriber_id)
      ]);

      if (Number(error?.status || 0) === 429) {
        const retrySeconds = Math.max(1, Math.min(20, safeAdminNumber(error?.retryAfter) || 2));
        await sleep(retrySeconds * 1000);
        break;
      }
    }
    await sleep(BOT_BROADCAST_DELAY_MS);
  }

  const counts = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count
     FROM bot_broadcast_deliveries WHERE broadcast_id = ?`
  ).bind(broadcastId).first();
  const sent = safeAdminNumber(counts?.sent_count);
  const failed = safeAdminNumber(counts?.failed_count);
  const pending = safeAdminNumber(counts?.pending_count);
  const completed = pending === 0;
  const finishedAt = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `UPDATE bot_broadcasts
     SET status = ?, sent_count = ?, failed_count = ?, updated_at = ?,
         completed_at = ?, lease_token = '', lease_until = 0
     WHERE broadcast_id = ? AND lease_token = ?`
  ).bind(
    completed ? "completed" : "running",
    sent,
    failed,
    finishedAt,
    completed ? finishedAt : 0,
    broadcastId,
    leaseToken
  ).run();

  if (completed && Number(job.completion_notified || 0) !== 1) {
    try {
      await sendTelegramMessage(
        env,
        job.report_chat_id,
        `<b>Рассылка завершена</b>\n\nДоставлено: <b>${formatBotBroadcastCount(sent)}</b>\nНе доставлено: <b>${formatBotBroadcastCount(failed)}</b>\nВсего получателей: <b>${formatBotBroadcastCount(job.total_count)}</b>`
      );
    } catch (error) {
      console.error("Broadcast completion report failed", error);
    }
    await env.DB.prepare(
      `UPDATE bot_broadcasts SET completion_notified = 1 WHERE broadcast_id = ?`
    ).bind(broadcastId).run();
  }

  return {
    processed: true,
    completed,
    sent,
    failed,
    pending,
    total: safeAdminNumber(job.total_count)
  };
}

function isPermanentTelegramDeliveryError(error) {
  const status = Number(error?.status || 0);
  const text = String(error?.message || "").toLowerCase();
  return status === 403
    || text.includes("bot was blocked")
    || text.includes("chat not found")
    || text.includes("user is deactivated")
    || text.includes("forbidden");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(milliseconds) || 0)));
}

let staffOperationsSchemaPromise = null;

async function ensureStaffOperationsSchema(env) {
  if (!staffOperationsSchemaPromise) {
    staffOperationsSchemaPromise = env.DB.batch([
      env.DB.prepare(BOT_STAFF_WORKFLOWS_SCHEMA_SQL),
      env.DB.prepare(SUPPORT_TICKETS_SCHEMA_SQL),
      env.DB.prepare(PLAYER_ADMIN_CONTROLS_SCHEMA_SQL),
      env.DB.prepare(BOT_SYSTEM_STATE_SCHEMA_SQL),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_bot_staff_workflows_expiry ON bot_staff_workflows(expires_at)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated ON support_tickets(status, updated_at DESC)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_support_tickets_creator ON support_tickets(created_by, created_at DESC)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_support_tickets_player ON support_tickets(player_telegram_id, created_at DESC)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_player_admin_controls_blocked ON player_admin_controls(blocked, updated_at DESC)`)
    ]).catch((error) => {
      staffOperationsSchemaPromise = null;
      throw error;
    });
  }
  await staffOperationsSchemaPromise;
}

function parseJsonObject(value, fallback = {}) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function setStaffWorkflow(userId, chatId, flowType, step, data, env) {
  await ensureStaffOperationsSchema(env);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO bot_staff_workflows (
       telegram_id, chat_id, flow_type, step, data_json, expires_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       flow_type = excluded.flow_type,
       step = excluded.step,
       data_json = excluded.data_json,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`
  ).bind(
    String(userId),
    String(chatId),
    String(flowType),
    String(step),
    JSON.stringify(data || {}),
    now + BOT_STAFF_WORKFLOW_TTL_SECONDS,
    now
  ).run();
}

async function getStaffWorkflow(userId, env) {
  await ensureStaffOperationsSchema(env);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`DELETE FROM bot_staff_workflows WHERE expires_at <= ?`).bind(now).run();
  const row = await env.DB.prepare(
    `SELECT telegram_id, chat_id, flow_type, step, data_json, expires_at
     FROM bot_staff_workflows WHERE telegram_id = ? LIMIT 1`
  ).bind(String(userId)).first();
  if (!row) return null;
  return { ...row, data: parseJsonObject(row.data_json, {}) };
}

async function clearStaffWorkflow(userId, env) {
  await ensureStaffOperationsSchema(env);
  await env.DB.prepare(`DELETE FROM bot_staff_workflows WHERE telegram_id = ?`).bind(String(userId)).run();
}

async function updateStaffWorkflow(userId, patch, env) {
  const workflow = await getStaffWorkflow(userId, env);
  if (!workflow) return null;
  const data = { ...(workflow.data || {}), ...(patch?.data || {}) };
  await setStaffWorkflow(
    userId,
    patch?.chatId || workflow.chat_id,
    patch?.flowType || workflow.flow_type,
    patch?.step || workflow.step,
    data,
    env
  );
  return { ...workflow, ...patch, data };
}

async function playerProfileExists(telegramId, env) {
  const row = await env.DB.prepare(
    `SELECT telegram_id FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
  ).bind(String(telegramId)).first();
  return Boolean(row?.telegram_id);
}

async function playerDisplayNameById(telegramId, env) {
  const id = String(telegramId || "");
  const control = await getPlayerAdminControl(id, env);
  if (control.customName) return control.customName;
  const row = await env.DB.prepare(
    `SELECT display_name, username FROM leaderboard_all_time WHERE telegram_id = ? LIMIT 1`
  ).bind(id).first();
  if (row?.display_name || row?.username) return String(row.display_name || `@${row.username}`);
  try {
    const subscriber = await env.DB.prepare(
      `SELECT display_name, username FROM bot_subscribers WHERE telegram_id = ? LIMIT 1`
    ).bind(id).first();
    if (subscriber?.display_name || subscriber?.username) return String(subscriber.display_name || `@${subscriber.username}`);
  } catch {}
  return `Игрок ${id}`;
}

async function getPlayerAdminControl(telegramId, env) {
  await ensureLiveOpsAdminSchema(env);
  const id = String(telegramId || "");
  await expireTemporaryPlayerBan(id, env);
  const row = await env.DB.prepare(
    `SELECT telegram_id, custom_name, blocked, block_reason, block_type, blocked_until,
            blocked_at, blocked_by_name, appeal_note, last_unblocked_at, last_unblocked_by,
            updated_at, updated_by
     FROM player_admin_controls WHERE telegram_id = ? LIMIT 1`
  ).bind(id).first();
  return row ? {
    telegramId: String(row.telegram_id || id),
    customName: String(row.custom_name || "").trim(),
    blocked: Number(row.blocked || 0) === 1,
    blockReason: String(row.block_reason || "").trim(),
    blockType: String(row.block_type || "permanent") === "temporary" ? "temporary" : "permanent",
    blockedUntil: Number(row.blocked_until || 0),
    blockedAt: Number(row.blocked_at || 0),
    blockedByName: String(row.blocked_by_name || ""),
    appealNote: String(row.appeal_note || ""),
    lastUnblockedAt: Number(row.last_unblocked_at || 0),
    lastUnblockedBy: String(row.last_unblocked_by || ""),
    updatedAt: Number(row.updated_at || 0),
    updatedBy: String(row.updated_by || "")
  } : {
    telegramId: id,
    customName: "",
    blocked: false,
    blockReason: "",
    blockType: "permanent",
    blockedUntil: 0,
    blockedAt: 0,
    blockedByName: "",
    appealNote: "",
    lastUnblockedAt: 0,
    lastUnblockedBy: "",
    updatedAt: 0,
    updatedBy: ""
  };
}

async function savePlayerAdminControl(telegramId, patch, updatedBy, env) {
  await ensureLiveOpsAdminSchema(env);
  const current = await getPlayerAdminControl(telegramId, env);
  const next = {
    customName: patch?.customName == null ? current.customName : String(patch.customName || "").trim().slice(0, 40),
    blocked: patch?.blocked == null ? current.blocked : Boolean(patch.blocked),
    blockReason: patch?.blockReason == null ? current.blockReason : String(patch.blockReason || "").trim().slice(0, 300),
    blockType: patch?.blockType == null ? current.blockType : (String(patch.blockType) === "temporary" ? "temporary" : "permanent"),
    blockedUntil: patch?.blockedUntil == null ? current.blockedUntil : Math.max(0, Math.floor(Number(patch.blockedUntil) || 0)),
    blockedAt: patch?.blockedAt == null ? current.blockedAt : Math.max(0, Math.floor(Number(patch.blockedAt) || 0)),
    blockedByName: patch?.blockedByName == null ? current.blockedByName : String(patch.blockedByName || "").trim().slice(0, 100),
    appealNote: patch?.appealNote == null ? current.appealNote : String(patch.appealNote || "").trim().slice(0, 500),
    lastUnblockedAt: patch?.lastUnblockedAt == null ? current.lastUnblockedAt : Math.max(0, Math.floor(Number(patch.lastUnblockedAt) || 0)),
    lastUnblockedBy: patch?.lastUnblockedBy == null ? current.lastUnblockedBy : String(patch.lastUnblockedBy || "").trim().slice(0, 100)
  };
  if (!next.blocked) {
    next.blockReason = "";
    next.blockType = "permanent";
    next.blockedUntil = 0;
    next.blockedAt = 0;
    next.blockedByName = "";
  } else if (next.blockType === "permanent") {
    next.blockedUntil = 0;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO player_admin_controls (
       telegram_id, custom_name, blocked, block_reason, block_type, blocked_until,
       blocked_at, blocked_by_name, appeal_note, last_unblocked_at, last_unblocked_by,
       updated_at, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET
       custom_name = excluded.custom_name,
       blocked = excluded.blocked,
       block_reason = excluded.block_reason,
       block_type = excluded.block_type,
       blocked_until = excluded.blocked_until,
       blocked_at = excluded.blocked_at,
       blocked_by_name = excluded.blocked_by_name,
       appeal_note = excluded.appeal_note,
       last_unblocked_at = excluded.last_unblocked_at,
       last_unblocked_by = excluded.last_unblocked_by,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).bind(
    String(telegramId), next.customName, next.blocked ? 1 : 0, next.blockReason,
    next.blockType, next.blockedUntil, next.blockedAt, next.blockedByName,
    next.appealNote, next.lastUnblockedAt, next.lastUnblockedBy,
    now, String(updatedBy || "")
  ).run();
  return { ...next, telegramId: String(telegramId), updatedAt: now, updatedBy: String(updatedBy || "") };
}

async function applyPlayerAdminControl(user, env) {
  const control = await getPlayerAdminControl(String(user?.id || ""), env);
  if (control.blocked) {
    const until = control.blockType === "temporary" && control.blockedUntil
      ? ` Ограничение действует до ${formatUtcDate(control.blockedUntil)}.`
      : " Ограничение действует бессрочно.";
    const reason = control.blockReason ? ` Причина: ${control.blockReason}` : "";
    throw new ApiError(403, `Доступ к игре ограничен.${until}${reason}`);
  }
  if (control.customName) return { ...user, first_name: control.customName, last_name: "" };
  return user;
}

function grantRewardTitle(kind, rewardId = "") {
  if (kind === "points") return "Очки";
  if (kind === "zefir") return "Зефир";
  if (kind === "coffee") return "Кофе";
  if (kind === "case") return LEVEL_CASE_CONFIG[rewardId]?.title || "Кейс";
  if (kind === "avatar") return CASE_AVATARS[rewardId]?.title || rewardId;
  if (kind === "frame") return CASE_FRAMES[rewardId]?.title || rewardId;
  if (kind === "trail") return CASE_TRAILS[rewardId]?.title || rewardId;
  if (kind === "skin") return SKINS[rewardId]?.title || rewardId;
  return rewardId || kind;
}

function grantMainMarkup() {
  return {
    inline_keyboard: [
      [
        { text: "⭐ Очки", callback_data: "grant_pick:points:_" },
        { text: "🍥 Зефир", callback_data: "grant_pick:zefir:_" },
        { text: "☕ Кофе", callback_data: "grant_pick:coffee:_" }
      ],
      [{ text: "🎁 Кейс", callback_data: "grant_catalog:case" }],
      [
        { text: "🖼 Аватарка", callback_data: "grant_catalog:avatar" },
        { text: "✨ Рамка", callback_data: "grant_catalog:frame" }
      ],
      [
        { text: "🐾 След", callback_data: "grant_catalog:trail" },
        { text: "🐶 Скин", callback_data: "grant_catalog:skin" }
      ],
      [{ text: "Отмена", callback_data: "ops_cancel" }]
    ]
  };
}

function grantCatalogItems(kind) {
  if (kind === "case") return Object.entries(LEVEL_CASE_CONFIG).map(([id, item]) => ({ id, title: item.title }));
  if (kind === "avatar") return Object.entries(CASE_AVATARS).map(([id, item]) => ({ id, title: item.title }));
  if (kind === "frame") return Object.entries(CASE_FRAMES).map(([id, item]) => ({ id, title: item.title }));
  if (kind === "trail") return Object.entries(CASE_TRAILS).map(([id, item]) => ({ id, title: item.title }));
  if (kind === "skin") return Object.entries(SKINS).filter(([id]) => id !== "default").map(([id, item]) => ({ id, title: item.title }));
  return [];
}

function grantCatalogMarkup(kind) {
  const items = grantCatalogItems(kind);
  const rows = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2).map((item) => ({
      text: item.title.slice(0, 28),
      callback_data: `grant_pick:${kind}:${item.id}`
    })));
  }
  rows.push([{ text: "← Назад", callback_data: "grant_home" }, { text: "Отмена", callback_data: "ops_cancel" }]);
  return { inline_keyboard: rows };
}

async function startGrantWorkflow(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  await clearStaffWorkflow(user.id, env);
  await sendTelegramMessage(env, chatId,
    `<b>Выдача награды игроку</b>\n\nВыберите тип награды. Перед выполнением бот попросит игрока, количество и обязательную причину.`,
    grantMainMarkup()
  );
}

async function beginGrantSelection(query, kind, rewardId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "points", env);
  if (!access) return;
  const needsAmount = ["points", "zefir", "coffee", "case"].includes(kind);
  const normalizedRewardId = kind === "case" ? String(rewardId || "") : String(rewardId || "");
  if (kind === "case" && !LEVEL_CASE_CONFIG[normalizedRewardId]) {
    await answerCallback(env, query.id, "Неизвестный кейс.", true);
    return;
  }
  if (kind === "avatar" && !CASE_AVATARS[normalizedRewardId]) return answerCallback(env, query.id, "Неизвестная аватарка.", true);
  if (kind === "frame" && !CASE_FRAMES[normalizedRewardId]) return answerCallback(env, query.id, "Неизвестная рамка.", true);
  if (kind === "trail" && !CASE_TRAILS[normalizedRewardId]) return answerCallback(env, query.id, "Неизвестный след.", true);
  if (kind === "skin" && (!SKINS[normalizedRewardId] || normalizedRewardId === "default")) return answerCallback(env, query.id, "Неизвестный скин.", true);
  const existingWorkflow = await getStaffWorkflow(query.from.id, env);
  const prefilledTargetId = existingWorkflow?.flow_type === "grant_prefill" ? String(existingWorkflow.data?.targetId || "") : "";
  const prefilledPlayerName = existingWorkflow?.flow_type === "grant_prefill" ? String(existingWorkflow.data?.playerName || "") : "";
  const nextStep = prefilledTargetId ? (needsAmount ? "amount" : "reason") : "target";
  await setStaffWorkflow(query.from.id, chatId, "grant", nextStep, {
    kind,
    rewardId: normalizedRewardId,
    title: grantRewardTitle(kind, normalizedRewardId),
    needsAmount,
    amount: needsAmount && kind === "case" ? 1 : 0,
    targetId: prefilledTargetId,
    playerName: prefilledPlayerName
  }, env);
  await answerCallback(env, query.id, "Награда выбрана.");
  if (prefilledTargetId) {
    if (needsAmount) {
      const max = grantAmountLimit(access, kind);
      await sendTelegramMessage(env, chatId,
        `<b>Игрок:</b> ${escapeHtml(prefilledPlayerName || prefilledTargetId)} · <code>${escapeHtml(prefilledTargetId)}</code>
<b>Награда:</b> ${escapeHtml(grantRewardTitle(kind, normalizedRewardId))}

Введите количество от 1 до <b>${max.toLocaleString("ru-RU")}</b>.

Отмена: <code>/cancel</code>`
      );
    } else {
      await sendTelegramMessage(env, chatId,
        `<b>Игрок:</b> ${escapeHtml(prefilledPlayerName || prefilledTargetId)} · <code>${escapeHtml(prefilledTargetId)}</code>
<b>Награда:</b> ${escapeHtml(grantRewardTitle(kind, normalizedRewardId))}

Укажите причину выдачи одним сообщением.

Отмена: <code>/cancel</code>`
      );
    }
  } else {
    await sendTelegramMessage(env, chatId,
      `<b>Выбрано:</b> ${escapeHtml(grantRewardTitle(kind, normalizedRewardId))}

Отправьте Telegram ID игрока или точный <code>@username</code>.

Отмена: <code>/cancel</code>`
    );
  }
}

function grantAmountLimit(access, kind) {
  if (access?.owner) return kind === "case" ? 20 : 999999999;
  if (kind === "points") return 10000;
  if (kind === "case") return 5;
  return 100;
}

async function handleGrantWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const user = message.from;
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return true;
  const text = String(message.text || "").trim();
  const data = workflow.data || {};

  if (workflow.step === "target") {
    const targetId = await resolvePlayerTelegramId(text, env);
    if (!targetId || !(await playerProfileExists(targetId, env))) {
      await sendTelegramMessage(env, chatId, "Игрок не найден. Отправьте Telegram ID из <code>/members</code> или точный @username.");
      return true;
    }
    const playerName = await playerDisplayNameById(targetId, env);
    await updateStaffWorkflow(user.id, { step: data.needsAmount ? "amount" : "reason", data: { targetId, playerName } }, env);
    if (data.needsAmount) {
      const max = grantAmountLimit(access, data.kind);
      await sendTelegramMessage(env, chatId,
        `<b>Игрок:</b> ${escapeHtml(playerName)} · <code>${escapeHtml(targetId)}</code>\n\nВведите количество от 1 до <b>${max.toLocaleString("ru-RU")}</b>.`
      );
    } else {
      await sendTelegramMessage(env, chatId, "Укажите причину выдачи одним сообщением.");
    }
    return true;
  }

  if (workflow.step === "amount") {
    const amount = Math.floor(Number(text.replace(/\s+/g, "")) || 0);
    const max = grantAmountLimit(access, data.kind);
    if (amount < 1 || amount > max) {
      await sendTelegramMessage(env, chatId, `Введите целое количество от 1 до ${max.toLocaleString("ru-RU")}.`);
      return true;
    }
    await updateStaffWorkflow(user.id, { step: "reason", data: { amount } }, env);
    await sendTelegramMessage(env, chatId, "Укажите причину выдачи одним сообщением.");
    return true;
  }

  if (workflow.step === "reason") {
    const reason = text.slice(0, 300).trim();
    if (reason.length < 3) {
      await sendTelegramMessage(env, chatId, "Причина слишком короткая. Опишите её минимум тремя символами.");
      return true;
    }
    const updated = await updateStaffWorkflow(user.id, { step: "confirm", data: { reason } }, env);
    const finalData = updated?.data || { ...data, reason };
    const amountLine = finalData.needsAmount ? `\nКоличество: <b>${Number(finalData.amount || 1).toLocaleString("ru-RU")}</b>` : "";
    await sendTelegramMessage(env, chatId,
      `<b>Подтвердите выдачу</b>\n\nИгрок: <b>${escapeHtml(finalData.playerName || finalData.targetId)}</b>\nTelegram ID: <code>${escapeHtml(finalData.targetId)}</code>\nНаграда: <b>${escapeHtml(finalData.title)}</b>${amountLine}\nПричина: ${escapeHtml(reason)}`,
      { inline_keyboard: [[
        { text: "✅ Выдать", callback_data: "grant_confirm" },
        { text: "❌ Отмена", callback_data: "ops_cancel" }
      ]] }
    );
    return true;
  }

  await sendTelegramMessage(env, chatId, "Ожидается подтверждение кнопкой под предыдущим сообщением или <code>/cancel</code>.");
  return true;
}

async function grantCosmeticToPlayer(env, telegramId, kind, rewardId) {
  const ensured = await ensureCasePlayerState(env, String(telegramId), {});
  const state = ensured.state;
  const keyMap = {
    avatar: "ownedAvatars",
    frame: "ownedFrames",
    trail: "ownedTrails",
    skin: "ownedSkins"
  };
  const key = keyMap[kind];
  if (!key) throw new ApiError(400, "Неизвестный тип косметики.");
  const owned = Array.isArray(state[key]) ? [...state[key]] : [];
  if (owned.includes(rewardId)) return { alreadyOwned: true };
  owned.push(rewardId);
  state[key] = owned;
  const now = Math.floor(Date.now() / 1000);
  await caseStateUpdateStatement(env, String(telegramId), state, now).run();
  return { alreadyOwned: false };
}

async function executeGrantWorkflow(query, env) {
  const chatId = query.message?.chat?.id;
  const user = query.from;
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const workflow = await getStaffWorkflow(user.id, env);
  if (!workflow || workflow.flow_type !== "grant" || workflow.step !== "confirm") {
    await answerCallback(env, query.id, "Сценарий выдачи истёк. Начните заново: /grant", true);
    return;
  }
  const data = workflow.data || {};
  if (!data.targetId || !data.kind || !data.reason) {
    await answerCallback(env, query.id, "Данные выдачи неполные.", true);
    return;
  }
  const amount = Math.max(1, Math.floor(Number(data.amount || 1)));
  let resultText = "";
  let action = "grant_reward";
  let details = { kind: data.kind, rewardId: data.rewardId || "", amount, reason: data.reason };

  if (["points", "zefir", "coffee"].includes(data.kind)) {
    const field = ({ points: "pending_wallet", zefir: "pending_treats", coffee: "pending_coffee" })[data.kind];
    const row = await env.DB.prepare(
      `SELECT ${field} AS queued FROM admin_profile_state WHERE telegram_id = ? LIMIT 1`
    ).bind(String(data.targetId)).first();
    if (!row) throw new ApiError(404, "Профиль игрока не найден.");
    const before = safeAdminNumber(row.queued);
    const after = before + amount;
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `UPDATE admin_profile_state SET ${field} = ?, revision = revision + 1,
       updated_at = ?, updated_by = ? WHERE telegram_id = ?`
    ).bind(after, now, String(user.id), String(data.targetId)).run();
    action = `add_${data.kind}`;
    details = { ...details, status: "queued" };
    resultText = `Поставлено в очередь: <b>+${amount.toLocaleString("ru-RU")} ${escapeHtml(data.title.toLowerCase())}</b>.`;
  } else if (data.kind === "case") {
    const grant = await createGrantedCases(env, String(data.targetId), String(data.rewardId), amount, String(user.id), data.reason);
    action = "add_keys";
    details = { ...details, quantity: grant.quantity, caseType: data.rewardId };
    resultText = `Выдано кейсов: <b>${grant.quantity}</b>.`;
  } else {
    const cosmetic = await grantCosmeticToPlayer(env, String(data.targetId), data.kind, String(data.rewardId));
    action = `grant_${data.kind}`;
    details = { ...details, alreadyOwned: cosmetic.alreadyOwned };
    resultText = cosmetic.alreadyOwned
      ? "Предмет уже был в коллекции игрока. Повторная копия не добавлена."
      : "Предмет добавлен в коллекцию игрока.";
  }

  await logStaffAction(env, user, access, action, String(data.targetId), data.kind, null, amount, details);
  await clearStaffWorkflow(user.id, env);
  await answerCallback(env, query.id, "Награда обработана.");
  await sendTelegramMessage(env, chatId,
    `<b>Награда обработана</b>\n\nИгрок: <b>${escapeHtml(data.playerName || data.targetId)}</b>\nНаграда: <b>${escapeHtml(data.title)}</b>\n${resultText}\nПричина: ${escapeHtml(data.reason)}`,
    { inline_keyboard: [[
      { text: "👤 Карточка игрока", callback_data: `player_refresh:${data.targetId}` },
      { text: "➕ Новая выдача", callback_data: "grant_home" }
    ]] }
  );
}

async function startRedeemWorkflow(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "redeem", env);
  if (!access) return;
  await setStaffWorkflow(user.id, chatId, "redeem", "code", {}, env);
  await sendTelegramMessage(env, chatId,
    `<b>Проверка физической награды</b>\n\nОтправьте код игрока одним сообщением. После проверки бот покажет товар и кнопку подтверждения.\n\nОтмена: <code>/cancel</code>`
  );
}

async function handleRedeemWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const user = message.from;
  const access = await requireTeamPermission(chatId, user, "redeem", env);
  if (!access) return true;
  const code = compactCode(message.text || "");
  if (code.length < 8 || code.length > 20) {
    await sendTelegramMessage(env, chatId, "Код выглядит некорректно. Проверьте символы и отправьте его ещё раз.");
    return true;
  }
  await clearStaffWorkflow(user.id, env);
  await showRewardInBot(chatId, user, code, env, { forceRedeem: true });
  return true;
}

async function undoRewardRedemption(chatId, user, rawCode, env) {
  const access = await requireTeamPermission(chatId, user, "redeem", env);
  if (!access) return;
  if (!access.owner) {
    await sendTelegramMessage(env, chatId, "Отмена списания доступна только владельцу.");
    return;
  }
  const code = compactCode(rawCode);
  const reward = await getRewardByCompact(code, env);
  if (!reward) {
    await sendTelegramMessage(env, chatId, "Код не найден.");
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  if (String(reward.status) !== "used" || !reward.redeemed_at) {
    await sendTelegramMessage(env, chatId, "Этот код не находится в статусе выданного.");
    return;
  }
  const age = now - Number(reward.redeemed_at || 0);
  if (age < 0 || age > REDEEM_UNDO_SECONDS) {
    await sendTelegramMessage(env, chatId, "Отменить списание можно только в течение пяти минут после выдачи.");
    return;
  }
  if (Number(reward.expires_at || 0) <= now) {
    await sendTelegramMessage(env, chatId, "Срок действия кода уже истёк, вернуть его в активный статус нельзя.");
    return;
  }
  await env.DB.prepare(
    `UPDATE reward_codes SET status = 'active', redeemed_at = NULL,
     redeemed_by = NULL, redeemed_by_name = NULL
     WHERE code_compact = ? AND status = 'used'`
  ).bind(code).run();
  await logStaffAction(env, user, access, "undo_redeem", String(reward.owner_telegram_id || ""), "reward", 1, 0, {
    code: reward.code,
    product: reward.product_name,
    previousRedeemedBy: reward.redeemed_by || ""
  });
  await sendTelegramMessage(env, chatId,
    `<b>Списание отменено</b>\n\nКод <code>${escapeHtml(reward.code)}</code> снова активен. Игрок сможет предъявить его повторно до окончания срока действия.`
  );
}
async function showStockDashboard(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired" ? "Сессия истекла. Выполните <code>/staff</code>." : "Доступно только сотрудникам.");
    return;
  }
  if (!access.owner && !access.permissions?.products && !access.permissions?.redeem) {
    await sendTelegramMessage(env, chatId, "У вашей роли нет доступа к остаткам наград.");
    return;
  }
  await ensureShopStockSchema(env);
  const rows = await readShopStockRows(env);
  const start = moscowDayStartUnix();
  const usageResult = await env.DB.prepare(
    `SELECT product_id, COUNT(*) AS count
     FROM shop_stock_consumptions WHERE created_at >= ?
     GROUP BY product_id`
  ).bind(start).all();
  const usage = Object.fromEntries((usageResult.results || []).map((row) => [String(row.product_id), Number(row.count || 0)]));
  const physicalIds = ["zefir", "americano", "cappuccino"];
  const lines = physicalIds.map((productId) => {
    const item = PRODUCTS[productId];
    const availability = shopStockAvailabilityFromRows(rows, "prize", productId);
    const status = availability.limited
      ? availability.remaining <= 0
        ? "🔴 закончился"
        : availability.remaining <= BOT_LOW_STOCK_THRESHOLD
          ? `🟡 осталось ${availability.remaining}`
          : `🟢 осталось ${availability.remaining}`
      : "♾ без лимита";
    return `• <b>${escapeHtml(item.title)}</b> — ${status}\n  Использовано сегодня: <b>${Number(usage[productId] || 0)}</b>`;
  });

  const otherRows = rows.filter((row) => !physicalIds.includes(String(row.product_id || "")));
  const otherLines = otherRows.slice(0, 20).map((row) => {
    const productId = String(row.product_id || "");
    const title = SHOP_ASSORTMENT_PRODUCTS[productId]?.title || SKINS[productId]?.title || productId || row.scope_key;
    return `• ${escapeHtml(title)}: <b>${Number(row.remaining || 0)}</b> из ${Number(row.configured_limit || 0)}`;
  });

  await logStaffAction(env, user, access, "view_stock", null, "stock", null, null, { rows: rows.length });
  await sendTelegramMessage(env, chatId,
    `<b>📦 Остатки наград</b>\n\n${lines.join("\n\n")}` +
    (otherLines.length ? `\n\n<b>Другие ограниченные позиции</b>\n${otherLines.join("\n")}` : "") +
    `\n\nПорог предупреждения: <b>${BOT_LOW_STOCK_THRESHOLD}</b>.`,
    { inline_keyboard: [[
      { text: "🔄 Обновить", callback_data: "stock_refresh" },
      { text: "📚 Команды", callback_data: "adminpanel_commands" }
    ]] }
  );
}

function seasonStatusLabel(status) {
  return ({ scheduled: "ожидает старта", active: "идёт", ended: "завершён", cancelled: "отменён" })[String(status || "")] || String(status || "неизвестно");
}

function canManageSeason(access) {
  return Boolean(access?.owner || access?.role === "administrator" || access?.permissions?.staff);
}

function canManagePlayerControls(access) {
  return Boolean(access?.owner || normalizeTeamRole(access?.role) === "administrator");
}

async function requirePlayerControlAccess(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? "Рабочая сессия истекла. Выполните <code>/staff</code> и повторите действие."
      : "У вас нет активного доступа к команде.");
    return null;
  }
  if (!canManagePlayerControls(access)) {
    await sendTelegramMessage(env, chatId, "Изменять имя и доступ игрока может только владелец или администратор.");
    return null;
  }
  return access;
}

async function showSeasonAdminDashboard(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const season = await ensureSeason(env);
  const [countRow, topResult, rewardRow] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM leaderboard_entries WHERE season_id = ? AND hidden = 0`).bind(season.id).first(),
    env.DB.prepare(
      `SELECT telegram_id, display_name, username, best_score FROM leaderboard_entries
       WHERE season_id = ? AND hidden = 0
       ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC LIMIT 3`
    ).bind(season.id).all(),
    env.DB.prepare(
      `SELECT status, telegram_id, reward_type, reward_amount, claimed_at, expires_at
       FROM leaderboard_rewards WHERE season_id = ? ORDER BY place ASC LIMIT 1`
    ).bind(season.id).first()
  ]);
  const top = (topResult.results || []).map((row, index) =>
    `${index + 1}. ${escapeHtml(row.display_name || row.username || row.telegram_id)} — <b>${Number(row.best_score || 0).toLocaleString("ru-RU")}</b>`
  );
  const rewardTitle = leaderboardRewardNotificationTitle(rewardRow, season, env);
  const rewardStatus = rewardRow
    ? ({ pending: "ожидает получения", claimed: "получена", expired: "истекла", cancelled: "отменена" })[String(rewardRow.status)] || rewardRow.status
    : "ещё не создана";
  const manual = Number(season.manual_override || 0) === 1 ? "да" : "нет";
  const manage = canManageSeason(access);
  const keyboard = [
    [{ text: "🏆 Топ-10", callback_data: "season_top" }, { text: "🔄 Обновить", callback_data: "season_refresh" }]
  ];
  if (manage && !season.finalized_at) {
    keyboard.push([
      { text: "+1 день", callback_data: "season_extend:1" },
      { text: "+7 дней", callback_data: "season_extend:7" }
    ]);
    keyboard.push([{ text: "🎁 Изменить награду", callback_data: "season_reward" }]);
    keyboard.push([{ text: "⛔ Завершить досрочно", callback_data: "season_finish_preview" }]);
  }
  keyboard.push([{ text: "📚 Все команды", callback_data: "adminpanel_commands" }]);

  await logStaffAction(env, user, access, "view_season", null, "season", null, null, { seasonId: season.id });
  await sendTelegramMessage(env, chatId,
    `<b>🏆 Управление сезоном</b>\n\n` +
    `Название: <b>${escapeHtml(season.title)}</b>\n` +
    `ID: <code>${escapeHtml(season.id)}</code>\n` +
    `Статус: <b>${escapeHtml(seasonStatusLabel(season.status))}</b>\n` +
    `Старт: <b>${escapeHtml(formatUtcDate(season.starts_at))}</b>\n` +
    `Завершение: <b>${escapeHtml(formatUtcDate(season.ends_at))}</b>\n` +
    `Участников: <b>${Number(countRow?.count || 0)}</b>\n` +
    `Ручные настройки: <b>${manual}</b>\n\n` +
    `<b>Текущий топ</b>\n${top.length ? top.join("\n") : "Участников пока нет."}\n\n` +
    `<b>Награда за 1 место</b>\n${escapeHtml(rewardTitle)}\nСтатус награды: <b>${escapeHtml(rewardStatus)}</b>`,
    { inline_keyboard: keyboard }
  );
}

async function showSeasonTop10(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const season = await ensureSeason(env);
  const result = await env.DB.prepare(
    `SELECT telegram_id, display_name, username, best_score, achieved_at
     FROM leaderboard_entries WHERE season_id = ? AND hidden = 0
     ORDER BY best_score DESC, achieved_at ASC, telegram_id ASC LIMIT 10`
  ).bind(season.id).all();
  const lines = (result.results || []).map((row, index) =>
    `${index + 1}. <b>${escapeHtml(row.display_name || row.username || "Игрок")}</b> — ${Number(row.best_score || 0).toLocaleString("ru-RU")}\n   <code>${escapeHtml(row.telegram_id)}</code>`
  );
  await sendTelegramMessage(env, chatId, `<b>Топ-10 · ${escapeHtml(season.title)}</b>\n\n${lines.length ? lines.join("\n\n") : "Участников пока нет."}`);
}

async function extendSeason(query, days, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "staff", env);
  if (!access) return;
  if (!canManageSeason(access)) return;
  const season = await ensureSeason(env);
  if (season.finalized_at || String(season.status) === "ended") {
    await answerCallback(env, query.id, "Завершённый сезон нельзя продлить.", true);
    return;
  }
  const extension = Math.max(1, Math.min(30, Number(days || 1))) * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const nextEnd = Math.max(now, Number(season.ends_at || now)) + extension;
  await env.DB.prepare(
    `UPDATE leaderboard_seasons SET ends_at = ?, manual_override = 1,
     status = CASE WHEN starts_at <= ? THEN 'active' ELSE 'scheduled' END,
     updated_at = ? WHERE id = ? AND finalized_at IS NULL`
  ).bind(nextEnd, now, now, season.id).run();
  await logStaffAction(env, query.from, access, "season_extend", null, "season", Number(season.ends_at || 0), nextEnd, { seasonId: season.id, days });
  await answerCallback(env, query.id, `Сезон продлён на ${days} дн.`);
  await showSeasonAdminDashboard(chatId, query.from, env);
}

function seasonRewardTypeKeyboard() {
  return { inline_keyboard: [
    [
      { text: "⭐ Очки", callback_data: "season_reward_pick:points" },
      { text: "🍥 Зефир", callback_data: "season_reward_pick:treats" }
    ],
    [
      { text: "☕ Кофе", callback_data: "season_reward_pick:coffee" },
      { text: "🎁 Кейс", callback_data: "season_reward_pick:case" }
    ],
    [{ text: "Отмена", callback_data: "ops_cancel" }]
  ] };
}

function seasonRewardCaseKeyboard() {
  return { inline_keyboard: [
    [
      { text: "Обычный", callback_data: "season_reward_case:small" },
      { text: "Серебряный", callback_data: "season_reward_case:sweet" }
    ],
    [
      { text: "Золотой", callback_data: "season_reward_case:gold" },
      { text: "Легендарный", callback_data: "season_reward_case:legendary" }
    ],
    [{ text: "← Назад", callback_data: "season_reward" }]
  ] };
}

async function startSeasonRewardWorkflow(query, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "staff", env);
  if (!access || !canManageSeason(access)) return;
  const season = await ensureSeason(env);
  if (season.finalized_at) {
    await answerCallback(env, query.id, "Награду завершённого сезона менять нельзя.", true);
    return;
  }
  await setStaffWorkflow(query.from.id, chatId, "season_reward", "choose_type", { seasonId: season.id }, env);
  await answerCallback(env, query.id, "Выберите тип награды.");
  await sendTelegramMessage(env, chatId,
    `<b>Изменение награды сезона</b>\n\nВыберите тип награды. Картинка подставится автоматически и будет показана внутри рамки награды.\n\nТакже можно отправить вручную:\n<code>points 100000 | 100 000 очков</code>\n<code>treats 100 | 100 зефира</code>\n<code>coffee 50 | 50 кофе</code>\n<code>case legendary 1 | Легендарный кейс</code>`,
    seasonRewardTypeKeyboard()
  );
}

async function beginSeasonRewardAmountWorkflow(query, rewardTypeValue, itemIdValue, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "staff", env);
  if (!access || !canManageSeason(access)) return;
  const season = await ensureSeason(env);
  if (season.finalized_at) {
    await answerCallback(env, query.id, "Награду завершённого сезона менять нельзя.", true);
    return;
  }
  const rewardType = normalizeLeaderboardRewardType(rewardTypeValue);
  if (rewardType === "case" && !normalizeCaseType(itemIdValue)) {
    await answerCallback(env, query.id, "Выберите тип кейса.");
    await sendTelegramMessage(env, chatId, "<b>Какой кейс станет наградой?</b>", seasonRewardCaseKeyboard());
    return;
  }
  const itemId = rewardType === "case" ? normalizeCaseType(itemIdValue) : "";
  await setStaffWorkflow(query.from.id, chatId, "season_reward", "amount", {
    seasonId: season.id,
    rewardType,
    itemId
  }, env);
  const preview = leaderboardRewardPresentation(rewardType, 1, itemId);
  const amountHint = rewardType === "case" ? "Введите количество кейсов от 1 до 20." : "Введите количество награды.";
  await answerCallback(env, query.id, "Введите количество.");
  await sendTelegramMessage(env, chatId,
    `<b>${escapeHtml(preview.title)}</b>\n\n${amountHint}\nМожно добавить своё название через символ <code>|</code>.\n\nПример: <code>1 | ${escapeHtml(preview.title)}</code>\nОтмена: <code>/cancel</code>`
  );
}

function parseSeasonRewardInput(textValue, workflow) {
  const text = String(textValue || "").trim();
  const presetRawType = String(workflow?.data?.rewardType || "").trim();
  const presetType = presetRawType ? normalizeLeaderboardRewardType(presetRawType) : "";
  const presetItemId = String(workflow?.data?.itemId || "").trim();
  if (presetType && workflow?.step === "amount") {
    const amountMatch = text.match(/^(\d{1,9})(?:\s*\|\s*(.{1,100}))?$/i);
    if (!amountMatch) return null;
    return {
      type: presetType,
      itemId: presetType === "case" ? normalizeCaseType(presetItemId) : presetItemId,
      amount: Math.floor(Number(amountMatch[1]) || 0),
      title: String(amountMatch[2] || "").trim()
    };
  }

  const caseMatch = text.match(/^(?:case|cases|кейс|кейсы)?\s*(small|mini|standart|standard|common|обычный|sweet|silver|серебряный|gold|golden|золотой|legendary|legend|легендарный)\s+(\d{1,2})(?:\s*\|\s*(.{1,100}))?$/i);
  if (caseMatch) {
    return {
      type: "case",
      itemId: normalizeCaseType(caseMatch[1]),
      amount: Math.floor(Number(caseMatch[2]) || 0),
      title: String(caseMatch[3] || "").trim()
    };
  }

  const resourceMatch = text.match(/^(coffee|points|currency|treats|marshmallow|zefir|кофе|очки|поинты|зефир)\s+(\d{1,9})(?:\s*\|\s*(.{1,100}))?$/i);
  if (!resourceMatch) return null;
  return {
    type: normalizeLeaderboardRewardType(resourceMatch[1]),
    itemId: "",
    amount: Math.floor(Number(resourceMatch[2]) || 0),
    title: String(resourceMatch[3] || "").trim()
  };
}

async function handleSeasonRewardWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const user = message.from;
  const access = await requireTeamPermission(chatId, user, "staff", env);
  if (!access || !canManageSeason(access)) return true;
  const parsed = parseSeasonRewardInput(message.text, workflow);
  if (!parsed || !parsed.type || (parsed.type === "case" && !parsed.itemId)) {
    await sendTelegramMessage(env, chatId,
      "Формат не распознан. Используйте кнопки или пример: <code>case legendary 1 | Легендарный кейс</code>"
    );
    return true;
  }
  const maxAmount = parsed.type === "case" ? 20 : 999999999;
  if (parsed.amount < 1 || parsed.amount > maxAmount) {
    await sendTelegramMessage(env, chatId, parsed.type === "case"
      ? "Количество кейсов должно быть от 1 до 20."
      : "Количество должно быть целым числом больше нуля.");
    return true;
  }

  const presentation = leaderboardRewardPresentation(parsed.type, parsed.amount, parsed.itemId, parsed.title, "");
  const seasonId = String(workflow.data?.seasonId || configuredSeason(env).id);
  const now = Math.floor(Date.now() / 1000);
  const season = await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(seasonId).first();
  if (!season || season.finalized_at) {
    await clearStaffWorkflow(user.id, env);
    await sendTelegramMessage(env, chatId, "Сезон уже завершён или не найден.");
    return true;
  }
  await env.DB.prepare(
    `UPDATE leaderboard_seasons SET reward_type = ?, reward_amount = ?, reward_title = ?,
     reward_image_url = ?, reward_item_id = ?, manual_override = 1, updated_at = ?
     WHERE id = ? AND finalized_at IS NULL`
  ).bind(
    presentation.type,
    presentation.amount,
    presentation.title,
    presentation.imageUrl,
    presentation.itemId,
    now,
    seasonId
  ).run();
  await logStaffAction(env, user, access, "season_reward_change", null, "season", Number(season.reward_amount || 0), presentation.amount, {
    seasonId,
    oldType: season.reward_type,
    newType: presentation.type,
    itemId: presentation.itemId,
    title: presentation.title,
    imageUrl: presentation.imageUrl
  });
  await clearStaffWorkflow(user.id, env);
  await sendTelegramMessage(env, chatId,
    `<b>Награда сезона изменена</b>\n\nНовая награда: <b>${escapeHtml(presentation.title)}</b>\nТип: <code>${escapeHtml(presentation.type)}</code>${presentation.itemId ? `\nПредмет: <code>${escapeHtml(presentation.itemId)}</code>` : ""}\nКартинка: подставлена автоматически.`
  );
  return true;
}

async function finishSeasonEarly(query, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "staff", env);
  if (!access || !canManageSeason(access)) return;
  const season = await ensureSeason(env);
  if (season.finalized_at || String(season.status) === "ended") {
    await answerCallback(env, query.id, "Сезон уже завершён.", true);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE leaderboard_seasons SET ends_at = ?, status = 'ended', manual_override = 1,
     close_reason = 'Завершён досрочно через Telegram-бота', updated_at = ?
     WHERE id = ? AND finalized_at IS NULL`
  ).bind(now, now, season.id).run();
  const updated = await env.DB.prepare(`SELECT * FROM leaderboard_seasons WHERE id = ? LIMIT 1`).bind(season.id).first();
  await finalizeSeason(env, updated, now);
  await logStaffAction(env, query.from, access, "season_finish_early", null, "season", Number(season.ends_at || 0), now, { seasonId: season.id });
  await answerCallback(env, query.id, "Сезон завершён.");
  await showSeasonAdminDashboard(chatId, query.from, env);
}

async function showAdvancedAuditLog(chatId, user, rawFilter, env) {
  const access = await requireTeamPermission(chatId, user, "log", env);
  if (!access) return;
  const tokens = String(rawFilter || "").trim().split(/\s+/).filter(Boolean);
  let limit = 20;
  let startAt = 0;
  let actionFilter = "";
  let actorId = "";
  let targetId = "";
  for (const token of tokens) {
    if (/^\d{1,2}$/.test(token)) limit = Math.max(1, Math.min(50, Number(token)));
    else if (token.toLowerCase() === "today") startAt = moscowDayStartUnix();
    else if (token.toLowerCase() === "rewards") actionFilter = "reward";
    else if (/^@?[a-z0-9_]{3,32}$/i.test(token) && !/^\d+$/.test(token)) {
      const username = token.replace(/^@/, "").toLowerCase();
      const staff = await env.DB.prepare(
        `SELECT s.telegram_id FROM staff_users s
         LEFT JOIN bot_subscribers b ON b.telegram_id = s.telegram_id
         WHERE LOWER(b.username) = ? OR LOWER(s.display_name) = ? LIMIT 1`
      ).bind(username, username).first();
      if (staff?.telegram_id) actorId = String(staff.telegram_id);
    } else if (/^\d{4,20}$/.test(token)) targetId = token;
  }
  const conditions = [];
  const bindings = [];
  if (startAt) { conditions.push("created_at >= ?"); bindings.push(startAt); }
  if (actorId) { conditions.push("actor_telegram_id = ?"); bindings.push(actorId); }
  if (targetId) { conditions.push("target_telegram_id = ?"); bindings.push(targetId); }
  if (actionFilter === "reward") {
    conditions.push(`(action LIKE 'add_%' OR action LIKE 'grant_%' OR action IN ('redeem_reward','undo_redeem','add_keys'))`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await env.DB.prepare(
    `SELECT id, actor_telegram_id, actor_name, actor_role, action,
            target_telegram_id, target_type, old_value, new_value,
            details_json, created_at, success
     FROM staff_action_log ${where}
     ORDER BY id DESC LIMIT ?`
  ).bind(...bindings, limit).all();
  const rows = result.results || [];
  const entries = rows.map((row, index) => {
    const details = parseJsonObject(row.details_json, {});
    const target = row.target_telegram_id ? `\nИгрок/цель: <code>${escapeHtml(row.target_telegram_id)}</code>` : "";
    const reason = details.reason ? `\nПричина: ${escapeHtml(details.reason)}` : "";
    const resultLabel = Number(row.success || 0) === 1 ? "✅" : "❌";
    return `${index + 1}. ${resultLabel} <b>${escapeHtml(staffActionLabel(row.action))}</b>\n${escapeHtml(row.actor_name || row.actor_telegram_id)} · ${escapeHtml(row.actor_role)}${target}${reason}\n${escapeHtml(formatUtcDate(row.created_at))}`;
  });
  await sendTelegramListChunks(env, chatId, `Журнал действий · ${rows.length}`, entries, "По заданному фильтру записей нет.");
}
const SUPPORT_TICKET_CATEGORIES = Object.freeze({
  reward_missing: "Не начислилась награда",
  code_problem: "Не работает код",
  item_missing: "Пропал предмет",
  balance_problem: "Неправильный баланс",
  rating_problem: "Проблема с рейтингом",
  other: "Другое"
});

function ticketStatusLabel(status) {
  return ({ new: "новое", working: "в работе", resolved: "решено", rejected: "отклонено" })[String(status || "")] || String(status || "");
}

function ticketCategoryMarkup() {
  const entries = Object.entries(SUPPORT_TICKET_CATEGORIES);
  const rows = [];
  for (let index = 0; index < entries.length; index += 2) {
    rows.push(entries.slice(index, index + 2).map(([id, title]) => ({
      text: title.slice(0, 28),
      callback_data: `ticket_cat:${id}`
    })));
  }
  rows.push([{ text: "Отмена", callback_data: "ops_cancel" }]);
  return { inline_keyboard: rows };
}

async function startTicketWorkflow(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired"
      ? "Рабочая сессия истекла. Выполните <code>/staff</code>."
      : "Создавать обращения могут только сотрудники.");
    return;
  }
  await clearStaffWorkflow(user.id, env);
  await sendTelegramMessage(env, chatId,
    `<b>Новое обращение</b>\n\nВыберите категорию проблемы.`,
    ticketCategoryMarkup()
  );
}

async function beginTicketCategory(query, category, env) {
  const access = await getTeamAccess(query.from, env);
  const chatId = query.message?.chat?.id;
  if (!access.authorized) {
    await answerCallback(env, query.id, "Сначала выполните /staff.", true);
    return;
  }
  if (!SUPPORT_TICKET_CATEGORIES[category]) {
    await answerCallback(env, query.id, "Неизвестная категория.", true);
    return;
  }
  await setStaffWorkflow(query.from.id, chatId, "ticket", "target", { category }, env);
  await answerCallback(env, query.id, "Категория выбрана.");
  await sendTelegramMessage(env, chatId,
    `<b>${escapeHtml(SUPPORT_TICKET_CATEGORIES[category])}</b>\n\nОтправьте Telegram ID игрока или точный <code>@username</code>.\nЕсли обращение не связано с конкретным игроком, отправьте <code>skip</code>.`
  );
}

async function handleTicketWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const user = message.from;
  const access = await getTeamAccess(user, env);
  if (!access.authorized) return true;
  const text = String(message.text || "").trim();
  const data = workflow.data || {};
  if (workflow.step === "target") {
    if (/^(skip|нет|пропустить)$/i.test(text)) {
      await updateStaffWorkflow(user.id, { step: "description", data: { targetId: "", playerName: "" } }, env);
      await sendTelegramMessage(env, chatId, "Опишите проблему или предложение одним сообщением.");
      return true;
    }
    const targetId = await resolvePlayerTelegramId(text, env);
    if (!targetId || !(await playerProfileExists(targetId, env))) {
      await sendTelegramMessage(env, chatId, "Игрок не найден. Отправьте Telegram ID, точный @username или <code>skip</code>.");
      return true;
    }
    const playerName = await playerDisplayNameById(targetId, env);
    await updateStaffWorkflow(user.id, { step: "description", data: { targetId, playerName } }, env);
    await sendTelegramMessage(env, chatId, `Игрок найден: <b>${escapeHtml(playerName)}</b>.\n\nТеперь опишите проблему одним сообщением.`);
    return true;
  }
  if (workflow.step === "description") {
    const description = text.slice(0, 2000).trim();
    if (description.length < 5) {
      await sendTelegramMessage(env, chatId, "Описание слишком короткое. Добавьте детали проблемы.");
      return true;
    }
    await ensureStaffOperationsSchema(env);
    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      `INSERT INTO support_tickets (
         created_by, created_by_name, player_telegram_id, player_name,
         category, description, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)`
    ).bind(
      String(user.id), telegramDisplayName(user), String(data.targetId || ""), String(data.playerName || ""),
      String(data.category || "other"), description, now, now
    ).run();
    let ticketId = Number(result?.meta?.last_row_id || 0);
    if (!ticketId) {
      const inserted = await env.DB.prepare(
        `SELECT id FROM support_tickets WHERE created_by = ? AND created_at = ? ORDER BY id DESC LIMIT 1`
      ).bind(String(user.id), now).first();
      ticketId = Number(inserted?.id || 0);
    }
    if (!ticketId) throw new ApiError(500, "Не удалось определить номер обращения.");
    await clearStaffWorkflow(user.id, env);
    await logStaffAction(env, user, access, "ticket_create", String(data.targetId || ""), "ticket", null, ticketId, {
      category: data.category,
      description: description.slice(0, 300)
    });
    const playerLine = data.targetId ? `\nИгрок: <b>${escapeHtml(data.playerName || data.targetId)}</b> · <code>${escapeHtml(data.targetId)}</code>` : "";
    const messageText = `<b>🎫 Новое обращение #${ticketId}</b>\n\nКатегория: <b>${escapeHtml(SUPPORT_TICKET_CATEGORIES[data.category] || data.category)}</b>${playerLine}\nСоздал: <b>${escapeHtml(telegramDisplayName(user))}</b>\n\n${escapeHtml(description)}`;
    await queueLeaderboardStaffNotification(env, `support-ticket-created:${ticketId}`, messageText);
    await sendTelegramMessage(env, chatId,
      `<b>Обращение #${ticketId} создано</b>${playerLine}\n\nКатегория: ${escapeHtml(SUPPORT_TICKET_CATEGORIES[data.category] || data.category)}\nСтатус: <b>новое</b>`,
      { inline_keyboard: [[{ text: "Открыть обращение", callback_data: `ticket_view:${ticketId}` }]] }
    );
    return true;
  }
  return true;
}

async function ticketAccess(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired" ? "Сессия истекла. Выполните <code>/staff</code>." : "Доступно только сотрудникам.");
    return null;
  }
  return access;
}

async function showTicketsList(chatId, user, mode, env) {
  const access = await ticketAccess(chatId, user, env);
  if (!access) return;
  await ensureStaffOperationsSchema(env);
  const normalizedMode = String(mode || "open").toLowerCase();
  const conditions = [];
  const binds = [];
  if (normalizedMode === "mine") { conditions.push("created_by = ?"); binds.push(String(user.id)); }
  else if (normalizedMode === "resolved") conditions.push("status IN ('resolved','rejected')");
  else if (normalizedMode !== "all") conditions.push("status IN ('new','working')");
  if (!access.owner && !access.permissions?.staff) {
    conditions.push("created_by = ?");
    binds.push(String(user.id));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await env.DB.prepare(
    `SELECT id, created_by_name, player_telegram_id, player_name, category,
            description, status, assigned_to_name, created_at, updated_at
     FROM support_tickets ${where}
     ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'working' THEN 1 ELSE 2 END,
              updated_at DESC LIMIT 20`
  ).bind(...binds).all();
  const rows = result.results || [];
  if (!rows.length) {
    await sendTelegramMessage(env, chatId, "Обращений по выбранному фильтру нет.");
    return;
  }
  const entries = rows.map((row) => {
    const player = row.player_telegram_id ? ` · ${row.player_name || row.player_telegram_id}` : "";
    return `#${Number(row.id)} · <b>${escapeHtml(ticketStatusLabel(row.status))}</b>\n${escapeHtml(SUPPORT_TICKET_CATEGORIES[row.category] || row.category)}${escapeHtml(player)}\n${escapeHtml(String(row.description || "").slice(0, 140))}${String(row.description || "").length > 140 ? "…" : ""}`;
  });
  const buttons = rows.slice(0, 10).map((row) => [{ text: `Открыть #${Number(row.id)}`, callback_data: `ticket_view:${Number(row.id)}` }]);
  await sendTelegramMessage(env, chatId, `<b>Обращения · ${rows.length}</b>\n\n${entries.join("\n\n")}`, { inline_keyboard: buttons });
}

async function showTicketDetails(chatId, user, ticketId, env) {
  const access = await ticketAccess(chatId, user, env);
  if (!access) return;
  await ensureStaffOperationsSchema(env);
  const row = await env.DB.prepare(`SELECT * FROM support_tickets WHERE id = ? LIMIT 1`).bind(Number(ticketId)).first();
  if (!row) {
    await sendTelegramMessage(env, chatId, "Обращение не найдено.");
    return;
  }
  if (!access.owner && !access.permissions?.staff && String(row.created_by) !== String(user.id)) {
    await sendTelegramMessage(env, chatId, "У вас нет доступа к этому обращению.");
    return;
  }
  const playerLine = row.player_telegram_id
    ? `Игрок: <b>${escapeHtml(row.player_name || row.player_telegram_id)}</b> · <code>${escapeHtml(row.player_telegram_id)}</code>\n`
    : "Игрок: не указан\n";
  const assignee = row.assigned_to_name || row.assigned_to || "не назначен";
  const keyboard = [];
  if (access.owner || access.permissions?.staff) {
    if (String(row.status) !== "working") keyboard.push([{ text: "🛠 В работу", callback_data: `ticket_status:${row.id}:working` }]);
    if (String(row.status) !== "resolved") keyboard.push([{ text: "✅ Решено", callback_data: `ticket_status:${row.id}:resolved` }]);
    if (String(row.status) !== "rejected") keyboard.push([{ text: "❌ Отклонить", callback_data: `ticket_status:${row.id}:rejected` }]);
  }
  keyboard.push([{ text: "📋 К списку", callback_data: "tickets_open" }]);
  await sendTelegramMessage(env, chatId,
    `<b>🎫 Обращение #${Number(row.id)}</b>\n\n` +
    `Категория: <b>${escapeHtml(SUPPORT_TICKET_CATEGORIES[row.category] || row.category)}</b>\n` +
    `Статус: <b>${escapeHtml(ticketStatusLabel(row.status))}</b>\n` +
    `${playerLine}` +
    `Создал: <b>${escapeHtml(row.created_by_name || row.created_by)}</b>\n` +
    `Ответственный: <b>${escapeHtml(assignee)}</b>\n` +
    `Создано: ${escapeHtml(formatUtcDate(row.created_at))}\n\n` +
    `<b>Описание</b>\n${escapeHtml(row.description)}${row.resolution ? `\n\n<b>Решение</b>\n${escapeHtml(row.resolution)}` : ""}`,
    { inline_keyboard: keyboard }
  );
}

async function updateTicketStatus(query, ticketId, status, env) {
  const chatId = query.message?.chat?.id;
  const access = await requireTeamPermission(chatId, query.from, "staff", env);
  if (!access) return;
  if (!["working", "resolved", "rejected"].includes(status)) {
    await answerCallback(env, query.id, "Некорректный статус.", true);
    return;
  }
  const row = await env.DB.prepare(`SELECT * FROM support_tickets WHERE id = ? LIMIT 1`).bind(Number(ticketId)).first();
  if (!row) {
    await answerCallback(env, query.id, "Обращение не найдено.", true);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE support_tickets SET status = ?, assigned_to = ?, assigned_to_name = ?,
     updated_at = ?, closed_at = CASE WHEN ? IN ('resolved','rejected') THEN ? ELSE 0 END
     WHERE id = ?`
  ).bind(status, String(query.from.id), telegramDisplayName(query.from), now, status, now, Number(ticketId)).run();
  await logStaffAction(env, query.from, access, "ticket_status", String(row.player_telegram_id || ""), "ticket", null, Number(ticketId), {
    ticketId: Number(ticketId), oldStatus: row.status, newStatus: status
  });
  if (String(row.created_by || "") && String(row.created_by) !== String(query.from.id)) {
    try {
      await sendTelegramMessage(env, String(row.created_by),
        `<b>Обращение #${Number(ticketId)} обновлено</b>

Статус: <b>${escapeHtml(ticketStatusLabel(status))}</b>
Ответственный: <b>${escapeHtml(telegramDisplayName(query.from))}</b>`
      );
    } catch (error) {
      console.error("Ticket creator notification failed", error);
    }
  }
  await answerCallback(env, query.id, `Статус: ${ticketStatusLabel(status)}.`);
  await showTicketDetails(chatId, query.from, Number(ticketId), env);
}

async function getSystemState(env, key) {
  await ensureStaffOperationsSchema(env);
  const row = await env.DB.prepare(`SELECT state_value, updated_at FROM bot_system_state WHERE state_key = ? LIMIT 1`).bind(String(key)).first();
  return row ? { value: String(row.state_value || ""), updatedAt: Number(row.updated_at || 0) } : null;
}

async function setSystemState(env, key, value) {
  await ensureStaffOperationsSchema(env);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO bot_system_state (state_key, state_value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = excluded.updated_at`
  ).bind(String(key), String(value ?? ""), now).run();
}

async function deleteSystemState(env, key) {
  await ensureStaffOperationsSchema(env);
  await env.DB.prepare(`DELETE FROM bot_system_state WHERE state_key = ?`).bind(String(key)).run();
}

function moscowDateParts(nowMs = Date.now()) {
  const shifted = new Date(nowMs + 3 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes()
  };
}

function moscowDateKey(nowMs = Date.now()) {
  const parts = moscowDateParts(nowMs);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

async function showOperationsStatus(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired" ? "Сессия истекла. Выполните <code>/staff</code>." : "Доступно только сотрудникам.");
    return;
  }
  let dbStatus = "🟢 доступна";
  let webhookStatus = "🟢 работает";
  let webhookDetails = "";
  let seasonStatus = "не проверен";
  let lowStock = [];
  try { await env.DB.prepare(`SELECT 1 AS ok`).first(); } catch (error) { dbStatus = `🔴 ошибка: ${String(error?.message || error).slice(0, 100)}`; }
  try {
    const info = await telegramApi(env, "getWebhookInfo", {});
    const expected = expectedTelegramWebhookUrl(env);
    const actual = String(info?.url || "");
    if (!actual || actual !== expected || info?.last_error_message) webhookStatus = "🟡 требует внимания";
    webhookDetails = `URL: ${actual === expected ? "верный" : "не совпадает"} · очередь: ${Number(info?.pending_update_count || 0)}${info?.last_error_message ? ` · ${String(info.last_error_message).slice(0, 120)}` : ""}`;
  } catch (error) {
    webhookStatus = `🔴 ошибка: ${String(error?.message || error).slice(0, 100)}`;
  }
  try {
    const season = await ensureSeason(env);
    seasonStatus = `${seasonStatusLabel(season.status)} · до ${formatUtcDate(season.ends_at)}`;
  } catch (error) {
    seasonStatus = `ошибка: ${String(error?.message || error).slice(0, 100)}`;
  }
  try {
    const rows = await readShopStockRows(env);
    lowStock = ["zefir", "americano", "cappuccino"].map((id) => ({ id, availability: shopStockAvailabilityFromRows(rows, "prize", id) }))
      .filter((item) => item.availability.limited && item.availability.remaining <= BOT_LOW_STOCK_THRESHOLD);
  } catch {}
  const heartbeat = await getSystemState(env, "cron:last_success");
  const now = Math.floor(Date.now() / 1000);
  const heartbeatAge = heartbeat?.updatedAt ? now - heartbeat.updatedAt : 0;
  const cronStatus = !heartbeat
    ? "🟡 данных ещё нет"
    : heartbeatAge <= 180 ? `🟢 ${heartbeatAge} сек. назад` : `🔴 ${Math.floor(heartbeatAge / 60)} мин. назад`;
  const stockText = lowStock.length
    ? lowStock.map((item) => `${PRODUCTS[item.id]?.title || item.id}: ${item.availability.remaining}`).join(", ")
    : "остатки выше порога";
  await sendTelegramMessage(env, chatId,
    `<b>🩺 Состояние системы</b>\n\n` +
    `Игра/Worker: 🟢 отвечает · <b>${escapeHtml(GAME_VERSION)}</b>\n` +
    `База данных: ${escapeHtml(dbStatus)}\n` +
    `Telegram webhook: ${escapeHtml(webhookStatus)}\n` +
    `${escapeHtml(webhookDetails)}\n` +
    `Последний Cron: ${escapeHtml(cronStatus)}\n` +
    `Рейтинг: <b>${escapeHtml(seasonStatus)}</b>\n` +
    `Остатки: <b>${escapeHtml(stockText)}</b>`,
    { inline_keyboard: [[
      { text: "🔄 Обновить", callback_data: "status_refresh" },
      { text: "📦 Остатки", callback_data: "stock_refresh" }
    ]] }
  );
}

async function notifyOperationalIssue(env, issueKey, messageHtml) {
  const stateKey = `ops-alert:${issueKey}`;
  const existing = await getSystemState(env, stateKey);
  if (existing?.value === "active") return;
  await queueLeaderboardStaffNotification(env, `ops-alert:${issueKey}:${Math.floor(Date.now() / 1000)}`, messageHtml);
  await setSystemState(env, stateKey, "active");
}

async function clearOperationalIssue(env, issueKey) {
  const stateKey = `ops-alert:${issueKey}`;
  const existing = await getSystemState(env, stateKey);
  if (existing?.value === "active") {
    await queueLeaderboardStaffNotification(env, `ops-recovered:${issueKey}:${Math.floor(Date.now() / 1000)}`, `✅ <b>Система восстановлена</b>\n\nПроблема «${escapeHtml(issueKey)}» больше не обнаруживается.`);
    await deleteSystemState(env, stateKey);
  }
}

async function checkLowStockAlerts(env) {
  const rows = await readShopStockRows(env);
  for (const productId of ["zefir", "americano", "cappuccino"]) {
    const availability = shopStockAvailabilityFromRows(rows, "prize", productId);
    const stateKey = `low-stock:${productId}`;
    if (!availability.limited || availability.remaining > BOT_LOW_STOCK_THRESHOLD) {
      await deleteSystemState(env, stateKey);
      continue;
    }
    const existing = await getSystemState(env, stateKey);
    const alertLevel = availability.remaining <= 0 ? "empty" : "low";
    if (existing?.value === alertLevel) continue;
    const title = PRODUCTS[productId]?.title || productId;
    const status = availability.remaining <= 0 ? "Товар закончился." : `Осталось ${availability.remaining} шт.`;
    await queueLeaderboardStaffNotification(env,
      `low-stock:${productId}:${alertLevel}:${Math.floor(Date.now() / 1000)}`,
      `⚠️ <b>${alertLevel === "empty" ? "Товар закончился" : "Низкий остаток"}</b>\n\nТовар: <b>${escapeHtml(title)}</b>\n${escapeHtml(status)}\n\nПополните остаток командой <code>/setlimit prize ${escapeHtml(productId)} КОЛИЧЕСТВО</code>.`
    );
    await setSystemState(env, stateKey, alertLevel);
  }
}

async function buildDailyStaffReport(env, startAt, dateKey) {
  const [players, runs, openedLevel, openedGranted, rewardsCreated, rewardsUsed, casePurchases, skinPurchases, physicalPurchases, staffActive, staffActors, actionErrors, notificationErrors, broadcastErrors, tickets] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM admin_profile_state WHERE created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) AS accepted FROM leaderboard_runs WHERE created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM level_case_openings WHERE opened_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM granted_cases WHERE opened_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM reward_codes WHERE created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM reward_codes WHERE status = 'used' AND redeemed_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM granted_cases WHERE granted_by = 'shop' AND created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM shop_stock_consumptions WHERE category = 'skins' AND created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM reward_codes WHERE created_at >= ? AND request_id NOT LIKE 'case_reward_%'`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM staff_users WHERE active = 1`).first(),
    env.DB.prepare(`SELECT COUNT(DISTINCT actor_telegram_id) AS count FROM staff_action_log WHERE created_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM staff_action_log WHERE created_at >= ? AND success = 0`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM leaderboard_staff_notifications WHERE status = 'failed' AND updated_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM bot_broadcast_deliveries WHERE status = 'failed' AND attempted_at >= ?`).bind(startAt).first(),
    env.DB.prepare(`SELECT
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS created,
       SUM(CASE WHEN status IN ('new','working') THEN 1 ELSE 0 END) AS open_count
     FROM support_tickets`).bind(startAt).first()
  ]);
  const stockRows = await readShopStockRows(env);
  const stockLine = ["zefir", "americano", "cappuccino"].map((id) => {
    const availability = shopStockAvailabilityFromRows(stockRows, "prize", id);
    return `${PRODUCTS[id]?.title || id}: ${availability.limited ? availability.remaining : "∞"}`;
  }).join(" · ");
  const openedCases = Number(openedLevel?.count || 0) + Number(openedGranted?.count || 0);
  const purchases = Number(casePurchases?.count || 0) + Number(skinPurchases?.count || 0) + Number(physicalPurchases?.count || 0);
  const errors = Number(actionErrors?.count || 0) + Number(notificationErrors?.count || 0) + Number(broadcastErrors?.count || 0);
  return `<b>📊 Итоги за ${escapeHtml(dateKey)}</b>\n\n` +
    `Новых игроков: <b>${Number(players?.count || 0)}</b>\n` +
    `Забегов: <b>${Number(runs?.total || 0)}</b> · зачтено ${Number(runs?.accepted || 0)}\n` +
    `Открыто кейсов: <b>${openedCases}</b>\n` +
    `Покупок кейсов/скинов/призов: <b>${purchases}</b>\n` +
    `Создано физических наград: <b>${Number(rewardsCreated?.count || 0)}</b>\n` +
    `Погашено кодов: <b>${Number(rewardsUsed?.count || 0)}</b>\n` +
    `Активных сотрудников: <b>${Number(staffActive?.count || 0)}</b> · работали сегодня ${Number(staffActors?.count || 0)}\n` +
    `Новых обращений: <b>${Number(tickets?.created || 0)}</b> · открыто сейчас ${Number(tickets?.open_count || 0)}\n` +
    `Ошибок и недоставок: <b>${errors}</b>\n\n` +
    `<b>Остатки</b>\n${escapeHtml(stockLine)}`;
}

async function showDailyStaffReport(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "staff", env);
  if (!access) return;
  await ensureStaffOperationsSchema(env);
  const dateKey = moscowDateKey();
  const report = await buildDailyStaffReport(env, moscowDayStartUnix(), dateKey);
  await logStaffAction(env, user, access, "view_daily_report", null, "system", null, null, { dateKey });
  await sendTelegramMessage(env, chatId, report, {
    inline_keyboard: [[
      { text: "🔄 Обновить", callback_data: "daily_report_refresh" },
      { text: "🩺 Статус", callback_data: "status_refresh" }
    ]]
  });
}

async function maybeSendDailyStaffReport(env) {
  const parts = moscowDateParts();
  const configuredHour = Math.floor(Number(env.BOT_DAILY_REPORT_HOUR));
  const hour = Number.isFinite(configuredHour) && configuredHour >= 0 && configuredHour <= 23
    ? configuredHour
    : BOT_DAILY_REPORT_HOUR;
  if (parts.hour < hour) return { sent: false, reason: "too_early" };
  const dateKey = moscowDateKey();
  const stateKey = `daily-report:${dateKey}`;
  const existing = await getSystemState(env, stateKey);
  if (existing) return { sent: false, reason: "already_sent" };
  const report = await buildDailyStaffReport(env, moscowDayStartUnix(), dateKey);
  await queueLeaderboardStaffNotification(env, stateKey, report);
  await setSystemState(env, stateKey, "sent");
  return { sent: true };
}

function isPlayerNameResetValue(value) {
  return /^(?:off|reset|сброс|сбросить|удалить)$/i.test(String(value || "").trim());
}

async function protectedPlayerControlTarget(telegramId, env) {
  const id = String(telegramId || "");
  if (isBotAdminUser({ id }, env)) return true;
  try {
    const row = await env.DB.prepare(
      `SELECT active FROM staff_users WHERE telegram_id = ? LIMIT 1`
    ).bind(id).first();
    return Number(row?.active || 0) === 1;
  } catch {
    return false;
  }
}

async function beginPlayerNameWorkflow(query, telegramId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) {
    await answerCallback(env, query.id, "Только владелец или администратор.", true);
    return;
  }
  if (!(await playerProfileExists(telegramId, env))) {
    await answerCallback(env, query.id, "Игрок не найден.", true);
    return;
  }
  const [control, playerName] = await Promise.all([
    getPlayerAdminControl(telegramId, env),
    playerDisplayNameById(telegramId, env)
  ]);
  await setStaffWorkflow(query.from.id, chatId, "player_name", "input", {
    targetId: String(telegramId),
    playerName,
    previousName: control.customName
  }, env);
  await answerCallback(env, query.id, "Введите новое имя.");
  await sendTelegramMessage(env, chatId,
    `<b>Изменение имени игрока</b>\n\nИгрок: <b>${escapeHtml(playerName)}</b> · <code>${escapeHtml(String(telegramId))}</code>\n` +
    `Текущее административное имя: <b>${escapeHtml(control.customName || "не задано")}</b>\n\n` +
    `Отправьте новое имя длиной от 2 до 40 символов. Чтобы вернуть имя из Telegram, отправьте <code>off</code>.`,
    { inline_keyboard: [[{ text: "Отмена", callback_data: "ops_cancel" }]] }
  );
}

async function handlePlayerNameWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const access = await requirePlayerControlAccess(chatId, message.from, env);
  if (!access) {
    await clearStaffWorkflow(message.from.id, env);
    return true;
  }
  const targetId = String(workflow.data?.targetId || "");
  if (!targetId || !(await playerProfileExists(targetId, env))) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, chatId, "Игрок больше не найден. Действие отменено.");
    return true;
  }
  const raw = String(message.text || "").trim();
  const customName = isPlayerNameResetValue(raw) ? "" : raw.replace(/\s+/g, " ");
  if (customName && (customName.length < 2 || customName.length > 40)) {
    await sendTelegramMessage(env, chatId, "Имя должно содержать от 2 до 40 символов. Для сброса отправьте <code>off</code>.");
    return true;
  }
  const before = await getPlayerAdminControl(targetId, env);
  const after = await savePlayerAdminControl(targetId, { customName }, message.from.id, env);
  await logStaffAction(env, message.from, access, "player_name_change", targetId, "player", null, null, {
    oldName: before.customName,
    newName: after.customName
  });
  await clearStaffWorkflow(message.from.id, env);
  await sendTelegramMessage(env, chatId,
    after.customName
      ? `✅ Имя игрока изменено на <b>${escapeHtml(after.customName)}</b>. Оно будет использоваться в игре и рейтинге после следующей синхронизации.`
      : "✅ Административное имя сброшено. После следующей синхронизации снова будет использоваться имя из Telegram."
  );
  await showPlayerProfile(chatId, message.from, targetId, env);
  return true;
}

async function beginPlayerBlockWorkflow(query, telegramId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) {
    await answerCallback(env, query.id, "Только владелец или администратор.", true);
    return;
  }
  if (!(await playerProfileExists(telegramId, env))) {
    await answerCallback(env, query.id, "Игрок не найден.", true);
    return;
  }
  if (await protectedPlayerControlTarget(telegramId, env)) {
    await answerCallback(env, query.id, "Нельзя заблокировать владельца или активного сотрудника.", true);
    return;
  }
  const control = await getPlayerAdminControl(telegramId, env);
  if (control.blocked) {
    await answerCallback(env, query.id, "Игрок уже заблокирован.", true);
    return;
  }
  const playerName = await playerDisplayNameById(telegramId, env);
  await setStaffWorkflow(query.from.id, chatId, "player_block", "duration", {
    targetId: String(telegramId),
    playerName
  }, env);
  await answerCallback(env, query.id, "Выберите срок блокировки.");
  await sendTelegramMessage(env, chatId,
    `<b>Серьёзная блокировка игрока</b>\n\nИгрок: <b>${escapeHtml(playerName)}</b> · <code>${escapeHtml(String(telegramId))}</code>\n\nВыберите срок. После этого бот запросит причину и покажет финальное подтверждение. Код вводить не требуется.`,
    { inline_keyboard: [
      [{ text: "24 часа", callback_data: `ban_duration:${telegramId}:1d` }, { text: "7 дней", callback_data: `ban_duration:${telegramId}:7d` }],
      [{ text: "30 дней", callback_data: `ban_duration:${telegramId}:30d` }, { text: "Навсегда", callback_data: `ban_duration:${telegramId}:permanent` }],
      [{ text: "Отмена", callback_data: "ops_cancel" }]
    ] }
  );
}

async function handlePlayerBlockWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const access = await requirePlayerControlAccess(chatId, message.from, env);
  if (!access) {
    await clearStaffWorkflow(message.from.id, env);
    return true;
  }
  if (workflow.step !== "reason") {
    await sendTelegramMessage(env, chatId, "Сначала выберите срок блокировки кнопкой в предыдущем сообщении или отмените действие командой <code>/cancel</code>.");
    return true;
  }
  const targetId = String(workflow.data?.targetId || "");
  const reason = String(message.text || "").trim().replace(/\s+/g, " ");
  if (reason.length < 3 || reason.length > 300) {
    await sendTelegramMessage(env, chatId, "Причина должна содержать от 3 до 300 символов.");
    return true;
  }
  if (!targetId || !(await playerProfileExists(targetId, env)) || await protectedPlayerControlTarget(targetId, env)) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, chatId, "Игрок не найден либо его нельзя блокировать. Действие отменено.");
    return true;
  }
  const blockType = String(workflow.data?.blockType || "permanent") === "temporary" ? "temporary" : "permanent";
  const blockedUntil = blockType === "temporary" ? Number(workflow.data?.blockedUntil || 0) : 0;
  if (blockType === "temporary" && blockedUntil <= Math.floor(Date.now() / 1000)) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, chatId, "Срок блокировки устарел. Начните действие заново.");
    return true;
  }
  await updateStaffWorkflow(message.from.id, { step: "confirm", data: { reason, blockType, blockedUntil } }, env);
  const playerName = String(workflow.data?.playerName || await playerDisplayNameById(targetId, env));
  await sendTelegramMessage(env, chatId,
    `<b>Подтвердите блокировку</b>\n\nИгрок: <b>${escapeHtml(playerName)}</b> · <code>${escapeHtml(targetId)}</code>\n` +
    `Срок: <b>${escapeHtml(banDurationLabel(blockType, blockedUntil))}</b>\n` +
    `Причина: <b>${escapeHtml(reason)}</b>\n\nДоступ к игре будет ограничен сразу. Действие попадёт в журнал модерации.`,
    { inline_keyboard: [[
      { text: "⛔ Заблокировать", callback_data: `player_block_confirm:${targetId}` },
      { text: "Отмена", callback_data: "ops_cancel" }
    ]] }
  );
  return true;
}

async function confirmPlayerBlock(query, telegramId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) {
    await answerCallback(env, query.id, "Только владелец или администратор.", true);
    return;
  }
  const workflow = await getStaffWorkflow(query.from.id, env);
  const targetId = String(telegramId || "");
  if (!workflow || workflow.flow_type !== "player_block" || workflow.step !== "confirm" || String(workflow.data?.targetId || "") !== targetId) {
    await answerCallback(env, query.id, "Подтверждение устарело. Откройте карточку игрока заново.", true);
    return;
  }
  if (await protectedPlayerControlTarget(targetId, env)) {
    await clearStaffWorkflow(query.from.id, env);
    await answerCallback(env, query.id, "Нельзя заблокировать владельца или активного сотрудника.", true);
    return;
  }
  const reason = String(workflow.data?.reason || "").trim();
  const blockType = String(workflow.data?.blockType || "permanent") === "temporary" ? "temporary" : "permanent";
  const blockedUntil = blockType === "temporary" ? Number(workflow.data?.blockedUntil || 0) : 0;
  if (reason.length < 3 || (blockType === "temporary" && blockedUntil <= Math.floor(Date.now() / 1000))) {
    await answerCallback(env, query.id, "Данные блокировки устарели. Начните заново.", true);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const before = await getPlayerAdminControl(targetId, env);
  const after = await savePlayerAdminControl(targetId, {
    blocked: true,
    blockReason: reason,
    blockType,
    blockedUntil,
    blockedAt: now,
    blockedByName: telegramDisplayName(query.from)
  }, query.from.id, env);
  await writeModerationHistory(env, targetId, "block", after, query.from, reason);
  await logStaffAction(env, query.from, access, "player_block", targetId, "player", before.blocked ? 1 : 0, 1, {
    reason: after.blockReason,
    blockType: after.blockType,
    blockedUntil: after.blockedUntil
  });
  await notifyPlayerModeration(env, targetId,
    `⛔ <b>Доступ к игре ограничен</b>\n\nСрок: <b>${escapeHtml(banDurationLabel(after.blockType, after.blockedUntil))}</b>\nПричина: <b>${escapeHtml(after.blockReason)}</b>\n\nПо вопросам обратитесь в поддержку игры.`
  );
  await clearStaffWorkflow(query.from.id, env);
  await answerCallback(env, query.id, "Игрок заблокирован.");
  await sendTelegramMessage(env, chatId,
    `⛔ Игрок <code>${escapeHtml(targetId)}</code> заблокирован <b>${escapeHtml(banDurationLabel(after.blockType, after.blockedUntil))}</b>.\nПричина: <b>${escapeHtml(after.blockReason)}</b>`
  );
  await showPlayerProfile(chatId, query.from, targetId, env);
}

async function beginPlayerUnblockWorkflow(query, telegramId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) {
    await answerCallback(env, query.id, "Только владелец или администратор.", true);
    return;
  }
  const control = await getPlayerAdminControl(telegramId, env);
  if (!control.blocked) {
    await answerCallback(env, query.id, "Игрок уже разблокирован.", true);
    return;
  }
  const playerName = await playerDisplayNameById(telegramId, env);
  await setStaffWorkflow(query.from.id, chatId, "player_unblock", "confirm", {
    targetId: String(telegramId),
    playerName,
    previousReason: control.blockReason,
    previousBlockType: control.blockType,
    previousBlockedUntil: control.blockedUntil
  }, env);
  await answerCallback(env, query.id, "Требуется подтверждение.");
  await sendTelegramMessage(env, chatId,
    `<b>Подтвердите разблокировку</b>\n\nИгрок: <b>${escapeHtml(playerName)}</b> · <code>${escapeHtml(String(telegramId))}</code>\n` +
    `Срок блокировки: <b>${escapeHtml(banDurationLabel(control.blockType, control.blockedUntil))}</b>\n` +
    `Причина: <b>${escapeHtml(control.blockReason || "не указана")}</b>\n\nПосле подтверждения доступ будет восстановлен сразу.`,
    { inline_keyboard: [[
      { text: "✅ Разблокировать", callback_data: `player_unblock_confirm:${telegramId}` },
      { text: "Отмена", callback_data: "ops_cancel" }
    ]] }
  );
}

async function confirmPlayerUnblock(query, telegramId, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) {
    await answerCallback(env, query.id, "Только владелец или администратор.", true);
    return;
  }
  const workflow = await getStaffWorkflow(query.from.id, env);
  const targetId = String(telegramId || "");
  if (!workflow || workflow.flow_type !== "player_unblock" || workflow.step !== "confirm" || String(workflow.data?.targetId || "") !== targetId) {
    await answerCallback(env, query.id, "Подтверждение устарело. Откройте карточку игрока заново.", true);
    return;
  }
  const before = await getPlayerAdminControl(targetId, env);
  if (!before.blocked) {
    await clearStaffWorkflow(query.from.id, env);
    await answerCallback(env, query.id, "Игрок уже разблокирован.", true);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const after = await savePlayerAdminControl(targetId, {
    blocked: false,
    blockReason: "",
    lastUnblockedAt: now,
    lastUnblockedBy: telegramDisplayName(query.from)
  }, query.from.id, env);
  await writeModerationHistory(env, targetId, "unblock", {
    blockType: before.blockType,
    blockReason: before.blockReason,
    blockedUntil: before.blockedUntil
  }, query.from, before.blockReason);
  await logStaffAction(env, query.from, access, "player_unblock", targetId, "player", 1, 0, {
    previousReason: before.blockReason,
    previousBlockType: before.blockType,
    previousBlockedUntil: before.blockedUntil
  });
  await notifyPlayerModeration(env, targetId, "✅ <b>Доступ к игре восстановлен</b>\n\nВы снова можете пользоваться игрой и участвовать в рейтинге.");
  await clearStaffWorkflow(query.from.id, env);
  await answerCallback(env, query.id, "Игрок разблокирован.");
  await sendTelegramMessage(env, chatId, `✅ Игрок <code>${escapeHtml(targetId)}</code> разблокирован и снова может пользоваться игрой.`);
  await showPlayerProfile(chatId, query.from, targetId, env);
}

async function processStaffOperationsCron(env) {
  await ensureStaffOperationsSchema(env);
  await ensureLiveOpsAdminSchema(env);
  const now = Math.floor(Date.now() / 1000);
  await setSystemState(env, "cron:last_start", String(now));
  await env.DB.prepare(`DELETE FROM bot_staff_workflows WHERE expires_at <= ?`).bind(now).run();
  await expireAllTemporaryPlayerBans(env);
  await processPendingAdminCampaign(env);
  const lastFraudScan = Number(await getSystemState(env, "fraud:last_scan") || 0);
  if (!lastFraudScan || now - lastFraudScan >= 3600) {
    await scanFraudAlerts(env);
    await setSystemState(env, "fraud:last_scan", String(now));
  }
  await checkLowStockAlerts(env);
  await maybeSendDailyStaffReport(env);
  await setSystemState(env, "cron:last_success", String(now));
}

async function handleActiveStaffWorkflowMessage(message, env) {
  const workflow = await getStaffWorkflow(message.from.id, env);
  if (!workflow) return false;
  if (String(workflow.chat_id) !== String(message.chat.id)) return false;
  if (workflow.flow_type === "grant_prefill") {
    await sendTelegramMessage(env, message.chat.id, "Выберите награду кнопкой в предыдущем сообщении или отмените действие командой <code>/cancel</code>.");
    return true;
  }
  if (workflow.flow_type === "grant") return handleGrantWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "redeem") return handleRedeemWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "ticket") return handleTicketWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "season_reward") return handleSeasonRewardWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "player_name") return handlePlayerNameWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "player_block_select") return handleBlockSelectMessage(message, workflow, env);
  if (workflow.flow_type === "player_unblock_select") return handleUnblockSelectMessage(message, workflow, env);
  if (workflow.flow_type === "player_block") return handlePlayerBlockWorkflowMessage(message, workflow, env);
  if (workflow.flow_type === "campaign") return handleCampaignWorkflowMessage(message, workflow, env);
  return false;
}

async function handleStaffOperationsCallback(query, env) {
  const data = String(query.data || "");
  const chatId = query.message?.chat?.id;
  if (!chatId) return false;

  const playerNameEdit = data.match(/^player_name:(\d{4,20})$/);
  if (playerNameEdit) {
    await beginPlayerNameWorkflow(query, playerNameEdit[1], env);
    return true;
  }
  const playerBlock = data.match(/^player_block:(\d{4,20})$/);
  if (playerBlock) {
    await beginPlayerBlockWorkflow(query, playerBlock[1], env);
    return true;
  }
  const playerBlockConfirm = data.match(/^player_block_confirm:(\d{4,20})$/);
  if (playerBlockConfirm) {
    await confirmPlayerBlock(query, playerBlockConfirm[1], env);
    return true;
  }
  const playerUnblock = data.match(/^player_unblock:(\d{4,20})$/);
  if (playerUnblock) {
    await beginPlayerUnblockWorkflow(query, playerUnblock[1], env);
    return true;
  }
  const playerUnblockConfirm = data.match(/^player_unblock_confirm:(\d{4,20})$/);
  if (playerUnblockConfirm) {
    await confirmPlayerUnblock(query, playerUnblockConfirm[1], env);
    return true;
  }
  const playerGrant = data.match(/^player_grant:(\d{4,20})$/);
  if (playerGrant) {
    const access = await requireTeamPermission(chatId, query.from, "points", env);
    if (!access) { await answerCallback(env, query.id, "Недостаточно прав.", true); return true; }
    if (!(await playerProfileExists(playerGrant[1], env))) {
      await answerCallback(env, query.id, "Игрок не найден.", true);
      return true;
    }
    const playerName = await playerDisplayNameById(playerGrant[1], env);
    await setStaffWorkflow(query.from.id, chatId, "grant_prefill", "choose", { targetId: playerGrant[1], playerName }, env);
    await answerCallback(env, query.id, "Выберите награду.");
    await sendTelegramMessage(env, chatId,
      `<b>Выдача для игрока</b>

Игрок: <b>${escapeHtml(playerName)}</b> · <code>${escapeHtml(playerGrant[1])}</code>

Выберите награду.`,
      grantMainMarkup()
    );
    return true;
  }
  const playerAudit = data.match(/^player_audit:(\d{4,20})$/);
  if (playerAudit) {
    await answerCallback(env, query.id, "Открываю историю.");
    await showAdvancedAuditLog(chatId, query.from, playerAudit[1], env);
    return true;
  }
  if (data === "daily_report_refresh") {
    await answerCallback(env, query.id, "Сводка обновлена.");
    await showDailyStaffReport(chatId, query.from, env);
    return true;
  }

  if (data === "ops_cancel") {
    await clearStaffWorkflow(query.from.id, env);
    await answerCallback(env, query.id, "Действие отменено.");
    await sendTelegramMessage(env, chatId, "Текущее действие отменено.");
    return true;
  }
  if (data === "grant_home") {
    const access = await requireTeamPermission(chatId, query.from, "points", env);
    if (!access) return true;
    await clearStaffWorkflow(query.from.id, env);
    await answerCallback(env, query.id, "Выберите награду.");
    await sendTelegramMessage(env, chatId, "<b>Выдача награды</b>\n\nВыберите тип награды.", grantMainMarkup());
    return true;
  }
  const grantCatalog = data.match(/^grant_catalog:(case|avatar|frame|trail|skin)$/);
  if (grantCatalog) {
    const access = await requireTeamPermission(chatId, query.from, "points", env);
    if (!access) return true;
    await answerCallback(env, query.id, "Выберите предмет.");
    await sendTelegramMessage(env, chatId, `<b>${escapeHtml(({ case: "Кейсы", avatar: "Аватарки", frame: "Рамки", trail: "Следы", skin: "Скины" })[grantCatalog[1]])}</b>`, grantCatalogMarkup(grantCatalog[1]));
    return true;
  }
  const grantPick = data.match(/^grant_pick:(points|zefir|coffee|case|avatar|frame|trail|skin):([A-Za-z0-9_-]+)$/);
  if (grantPick) {
    await beginGrantSelection(query, grantPick[1], grantPick[2] === "_" ? "" : grantPick[2], env);
    return true;
  }
  if (data === "grant_confirm") {
    await executeGrantWorkflow(query, env);
    return true;
  }
  if (data === "stock_refresh") {
    await answerCallback(env, query.id, "Остатки обновлены.");
    await showStockDashboard(chatId, query.from, env);
    return true;
  }
  if (data === "status_refresh") {
    await answerCallback(env, query.id, "Статус обновлён.");
    await showOperationsStatus(chatId, query.from, env);
    return true;
  }
  if (data === "season_refresh") {
    await answerCallback(env, query.id, "Сезон обновлён.");
    await showSeasonAdminDashboard(chatId, query.from, env);
    return true;
  }
  if (data === "season_top") {
    await answerCallback(env, query.id, "Открываю топ-10.");
    await showSeasonTop10(chatId, query.from, env);
    return true;
  }
  const seasonExtend = data.match(/^season_extend:(1|7)$/);
  if (seasonExtend) {
    await extendSeason(query, Number(seasonExtend[1]), env);
    return true;
  }
  if (data === "season_reward") {
    await startSeasonRewardWorkflow(query, env);
    return true;
  }
  const seasonRewardPick = data.match(/^season_reward_pick:(points|treats|coffee|case)$/);
  if (seasonRewardPick) {
    await beginSeasonRewardAmountWorkflow(query, seasonRewardPick[1], "", env);
    return true;
  }
  const seasonRewardCase = data.match(/^season_reward_case:(small|sweet|gold|legendary)$/);
  if (seasonRewardCase) {
    await beginSeasonRewardAmountWorkflow(query, "case", seasonRewardCase[1], env);
    return true;
  }
  if (data === "season_finish_preview") {
    const access = await requireTeamPermission(chatId, query.from, "staff", env);
    if (!access || !canManageSeason(access)) return true;
    await answerCallback(env, query.id, "Требуется подтверждение.");
    await sendTelegramMessage(env, chatId,
      `<b>Подтвердите досрочное завершение</b>\n\nРейтинг будет закрыт немедленно, победитель и награда будут зафиксированы. Отменить это действие нельзя.`,
      { inline_keyboard: [[
        { text: "⛔ Да, завершить", callback_data: "season_finish_confirm" },
        { text: "Отмена", callback_data: "ops_cancel" }
      ]] }
    );
    return true;
  }
  if (data === "season_finish_confirm") {
    await finishSeasonEarly(query, env);
    return true;
  }
  const ticketCategory = data.match(/^ticket_cat:([a-z_]+)$/);
  if (ticketCategory) {
    await beginTicketCategory(query, ticketCategory[1], env);
    return true;
  }
  const ticketView = data.match(/^ticket_view:(\d{1,9})$/);
  if (ticketView) {
    await answerCallback(env, query.id, "Открываю обращение.");
    await showTicketDetails(chatId, query.from, Number(ticketView[1]), env);
    return true;
  }
  const ticketStatus = data.match(/^ticket_status:(\d{1,9}):(working|resolved|rejected)$/);
  if (ticketStatus) {
    await updateTicketStatus(query, Number(ticketStatus[1]), ticketStatus[2], env);
    return true;
  }
  if (data === "tickets_open") {
    await answerCallback(env, query.id, "Открываю обращения.");
    await showTicketsList(chatId, query.from, "open", env);
    return true;
  }
  return false;
}



// =============================================================
// LIVEOPS ADMIN CENTER v0.55
// =============================================================
const LIVEOPS_CAMPAIGN_BATCH_SIZE = 30;
const LIVEOPS_CAMPAIGN_LEASE_SECONDS = 120;
const LIVEOPS_RARITIES = Object.freeze(["common", "rare", "superrare", "epic", "mythic", "legendary"]);
const LIVEOPS_CASE_IDS = Object.freeze(["small", "sweet", "gold", "legendary"]);
const LIVEOPS_CASE_DEFAULTS = Object.freeze({
  small: Object.freeze({ enabled: true, title: "Обычный кейс", guaranteeCount: 0, chances: { treats: 40.5, coffee: 40.5, points: 16.5, booster: 2.5, skin: 0, avatar: 0, frame: 0, trail: 0, physical: 0 }, ranges: { treats: [10, 20], coffee: [10, 20], points: [500, 1000] } }),
  sweet: Object.freeze({ enabled: true, title: "Серебряный кейс", guaranteeCount: 0, chances: { treats: 30, coffee: 30, points: 23.5, booster: 12, skin: 0, avatar: 3, frame: 1, trail: 0.5, physical: 0 }, ranges: { treats: [20, 40], coffee: [20, 40], points: [1000, 2500] } }),
  gold: Object.freeze({ enabled: true, title: "Золотой кейс", guaranteeCount: 0, chances: { treats: 25, coffee: 25, points: 26, booster: 15, skin: 0, avatar: 5, frame: 3, trail: 1, physical: 0 }, ranges: { treats: [40, 70], coffee: [40, 70], points: [2500, 5000] } }),
  legendary: Object.freeze({ enabled: true, title: "Легендарный кейс", guaranteeCount: 50, chances: { treats: 25, coffee: 25, points: 39.955, booster: 0, skin: 0.5, avatar: 2, frame: 3, trail: 4.5, physical: 0.045 }, ranges: { treats: [250, 1200], coffee: [250, 1200], points: [35000, 150000] } })
});

const LIVEOPS_CONTENT_IMAGES = Object.freeze({
  avatar: Object.freeze({
    royal: "/assets/cases/avatars/AE100D7E-3441-428C-B67F-C7A46B23F712.PNG",
    legendary_avatar_1: "/assets/cases/avatars/legendary_avatarka_1.png",
    legendary_avatar_2: "/assets/cases/avatars/legendary_avatarka_2.png",
    legendary_avatar_3: "/assets/cases/avatars/legendary_avatarka_3.png",
    legendary_avatar_4: "/assets/cases/avatars/legendary_avatarka_4.png",
    legendary_avatar_5: "/assets/cases/avatars/legendary_avatarka_5.png"
  }),
  frame: Object.freeze({
    legendary_frame_1: "/assets/rating/frames/profile/legendary_ramka_1.png",
    legendary_frame_2: "/assets/rating/frames/profile/legendary_ramka_2.png",
    legendary_frame_3: "/assets/rating/frames/profile/legendary_ramka_3.png",
    legendary_frame_4: "/assets/rating/frames/profile/legendary_ramka_4.png",
    legendary_frame_5: "/assets/rating/frames/profile/legendary_ramka_5.png"
  }),
  trail: Object.freeze({
    legendary_trail_1: "/assets/cases/trails/legendary_trail_1.png",
    legendary_trail_2: "/assets/cases/trails/legendary_trail_2.png",
    legendary_trail_3: "/assets/cases/trails/legendary_trail_3.png",
    legendary_trail_4: "/assets/cases/trails/legendary_trail_4.png",
    legendary_trail_5: "/assets/cases/trails/legendary_trail_5.png?v=45"
  }),
  skin: Object.freeze({})
});

let liveOpsAdminSchemaPromise = null;
async function ensureLiveOpsAdminSchema(env) {
  if (!liveOpsAdminSchemaPromise) {
    liveOpsAdminSchemaPromise = (async () => {
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS player_moderation_history (id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id TEXT NOT NULL, action TEXT NOT NULL, block_type TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL DEFAULT '', blocked_until INTEGER NOT NULL DEFAULT 0, actor_telegram_id TEXT NOT NULL DEFAULT '', actor_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS player_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id TEXT NOT NULL, note_text TEXT NOT NULL, created_by TEXT NOT NULL, created_by_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, deleted_at INTEGER NOT NULL DEFAULT 0, deleted_by TEXT NOT NULL DEFAULT '')`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS liveops_content_items (item_kind TEXT NOT NULL, item_id TEXT NOT NULL, title TEXT NOT NULL, rarity TEXT NOT NULL DEFAULT 'common', weight REAL NOT NULL DEFAULT 1, enabled INTEGER NOT NULL DEFAULT 1, is_new INTEGER NOT NULL DEFAULT 0, legendary_only INTEGER NOT NULL DEFAULT 0, image_url TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT '', PRIMARY KEY(item_kind, item_id))`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS liveops_case_configs (case_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, title TEXT NOT NULL, guarantee_count INTEGER NOT NULL DEFAULT 0, chances_json TEXT NOT NULL DEFAULT '{}', ranges_json TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT '')`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS liveops_config_history (id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, old_json TEXT NOT NULL DEFAULT '{}', new_json TEXT NOT NULL DEFAULT '{}', reason TEXT NOT NULL DEFAULT '', actor_telegram_id TEXT NOT NULL, actor_name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_campaigns (campaign_id TEXT PRIMARY KEY, title TEXT NOT NULL, segment_key TEXT NOT NULL, reward_kind TEXT NOT NULL, reward_id TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 1, reason TEXT NOT NULL, message_text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL, created_by_name TEXT NOT NULL DEFAULT '', report_chat_id TEXT NOT NULL, total_count INTEGER NOT NULL DEFAULT 0, processed_count INTEGER NOT NULL DEFAULT 0, failed_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, started_at INTEGER NOT NULL DEFAULT 0, completed_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, lease_token TEXT NOT NULL DEFAULT '', lease_until INTEGER NOT NULL DEFAULT 0)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_campaign_recipients (campaign_id TEXT NOT NULL, telegram_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', error_text TEXT NOT NULL DEFAULT '', processed_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(campaign_id, telegram_id))`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS fraud_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id TEXT NOT NULL, alert_type TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium', title TEXT NOT NULL, details_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'open', assigned_to TEXT NOT NULL DEFAULT '', resolution TEXT NOT NULL DEFAULT '', fingerprint TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS staff_work_context (telegram_id TEXT PRIMARY KEY, location_name TEXT NOT NULL DEFAULT 'Основное кафе', shift_name TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL)`),
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS physical_redemption_context (reward_code TEXT PRIMARY KEY, employee_telegram_id TEXT NOT NULL, employee_name TEXT NOT NULL DEFAULT '', location_name TEXT NOT NULL DEFAULT 'Основное кафе', shift_name TEXT NOT NULL DEFAULT '', redeemed_at INTEGER NOT NULL)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_player_notes_player ON player_notes(telegram_id, deleted_at, created_at DESC)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_campaigns_pending ON admin_campaigns(status, lease_until, created_at)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_campaign_recipients_pending ON admin_campaign_recipients(campaign_id, status, telegram_id)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status_severity ON fraud_alerts(status, severity, created_at DESC)`),
        env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_liveops_config_history_recent ON liveops_config_history(created_at DESC, id DESC)`)
      ]);
      const now = Math.floor(Date.now() / 1000);
      const contentStatements = [];
      for (const [kind, catalog] of Object.entries({ avatar: CASE_AVATARS, frame: CASE_FRAMES, trail: CASE_TRAILS, skin: CASE_SKINS })) {
        for (const [itemId, item] of Object.entries(catalog)) {
          contentStatements.push(env.DB.prepare(
            `INSERT OR IGNORE INTO liveops_content_items (item_kind, item_id, title, rarity, weight, enabled, is_new, legendary_only, image_url, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'system')`
          ).bind(kind, itemId, String(item.title || itemId), String(item.rarity || "common"), Math.max(0, Number(item.weight || 1)), item.isNew ? 1 : 0, item.legendaryOnly ? 1 : 0, String(LIVEOPS_CONTENT_IMAGES[kind]?.[itemId] || ""), now));
        }
      }
      if (contentStatements.length) await env.DB.batch(contentStatements);
      const caseStatements = LIVEOPS_CASE_IDS.map((caseId) => {
        const item = LIVEOPS_CASE_DEFAULTS[caseId];
        return env.DB.prepare(
          `INSERT OR IGNORE INTO liveops_case_configs (case_id, enabled, title, guarantee_count, chances_json, ranges_json, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'system')`
        ).bind(caseId, item.enabled ? 1 : 0, item.title, item.guaranteeCount, JSON.stringify(item.chances), JSON.stringify(item.ranges), now);
      });
      await env.DB.batch(caseStatements);
    })().catch((error) => {
      liveOpsAdminSchemaPromise = null;
      throw error;
    });
  }
  await liveOpsAdminSchemaPromise;
}

function liveOpsCaseConfigFromRow(row) {
  const caseId = String(row?.case_id || "");
  const fallback = LIVEOPS_CASE_DEFAULTS[caseId] || LIVEOPS_CASE_DEFAULTS.small;
  const chances = { ...fallback.chances, ...parseJsonObject(row?.chances_json, {}) };
  const ranges = { ...fallback.ranges, ...parseJsonObject(row?.ranges_json, {}) };
  return {
    id: caseId,
    enabled: Number(row?.enabled || 0) === 1,
    title: String(row?.title || fallback.title),
    guaranteeCount: Math.max(0, Math.floor(Number(row?.guarantee_count ?? fallback.guaranteeCount))),
    chances,
    ranges,
    updatedAt: Number(row?.updated_at || 0),
    updatedBy: String(row?.updated_by || "")
  };
}

async function readLiveOpsConfig(env) {
  await ensureLiveOpsAdminSchema(env);
  const [contentResult, caseResult] = await Promise.all([
    env.DB.prepare(`SELECT * FROM liveops_content_items ORDER BY item_kind, title`).all(),
    env.DB.prepare(`SELECT * FROM liveops_case_configs ORDER BY CASE case_id WHEN 'small' THEN 1 WHEN 'sweet' THEN 2 WHEN 'gold' THEN 3 ELSE 4 END`).all()
  ]);
  const content = { avatar: {}, frame: {}, trail: {}, skin: {} };
  for (const row of contentResult.results || []) {
    const kind = String(row.item_kind || "");
    if (!content[kind]) continue;
    content[kind][String(row.item_id)] = {
      title: String(row.title || row.item_id),
      rarity: String(row.rarity || "common"),
      weight: Math.max(0, Number(row.weight || 0)),
      enabled: Number(row.enabled || 0) === 1,
      isNew: Number(row.is_new || 0) === 1,
      legendaryOnly: Number(row.legendary_only || 0) === 1,
      imageUrl: String(row.image_url || "")
    };
  }
  const cases = {};
  for (const row of caseResult.results || []) cases[String(row.case_id)] = liveOpsCaseConfigFromRow(row);
  for (const caseId of LIVEOPS_CASE_IDS) if (!cases[caseId]) cases[caseId] = { id: caseId, ...LIVEOPS_CASE_DEFAULTS[caseId] };
  return { content, cases, version: 1 };
}

function runtimeCaseCatalog(kind, baseCatalog, liveops) {
  const overrides = liveops?.content?.[kind] || {};
  const result = {};
  for (const [id, item] of Object.entries(baseCatalog || {})) {
    const override = overrides[id];
    if (override && override.enabled === false) continue;
    result[id] = {
      ...item,
      title: String(override?.title || item.title || id),
      rarity: String(override?.rarity || item.rarity || "common"),
      weight: Math.max(0, Number(override?.weight ?? item.weight ?? 1)),
      isNew: override?.isNew == null ? Boolean(item.isNew) : Boolean(override.isNew),
      legendaryOnly: override?.legendaryOnly == null ? Boolean(item.legendaryOnly) : Boolean(override.legendaryOnly)
    };
  }
  return result;
}

function liveOpsCaseConfig(liveops, caseType) {
  return liveops?.cases?.[caseType] || { id: caseType, ...LIVEOPS_CASE_DEFAULTS[caseType] };
}

async function logLiveOpsConfigChange(env, user, entityType, entityId, action, oldValue, newValue, reason = "") {
  await ensureLiveOpsAdminSchema(env);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO liveops_config_history (entity_type, entity_id, action, old_json, new_json, reason, actor_telegram_id, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(entityType, entityId, action, JSON.stringify(oldValue || {}), JSON.stringify(newValue || {}), String(reason || "").slice(0, 300), String(user?.id || ""), telegramDisplayName(user), now).run();
}

function adminMainMenuMarkup(access) {
  const rows = [
    [{ text: "👤 Игроки", callback_data: "adm_players" }, { text: "🛡 Модерация", callback_data: "adm_moderation" }],
    [{ text: "🎁 Награды", callback_data: "grant_home" }, { text: "☕ Физические товары", callback_data: "adm_physical" }],
    [{ text: "📦 Контент", callback_data: "adm_content" }, { text: "🎲 Кейсы", callback_data: "adm_cases" }],
    [{ text: "🛒 Магазин", callback_data: "adm_shop" }, { text: "📊 Экономика", callback_data: "adm_economy" }],
    [{ text: "🎯 Сегменты", callback_data: "adm_segments" }, { text: "📣 Кампании", callback_data: "adm_campaigns" }],
    [{ text: "🚨 Антифрод", callback_data: "adm_fraud" }, { text: "🧾 История настроек", callback_data: "adm_config_history" }],
    [{ text: "🏆 Рейтинг", callback_data: "season_refresh" }, { text: "🎫 Обращения", callback_data: "tickets_open" }],
    [{ text: "🩺 Система", callback_data: "status_refresh" }, { text: "📚 Все команды", callback_data: "adminpanel_commands" }]
  ];
  if (!access.owner && normalizeTeamRole(access.role) !== "administrator") {
    return { inline_keyboard: rows.filter((_, index) => ![2, 3, 4, 5].includes(index)) };
  }
  return { inline_keyboard: rows };
}

async function showAdminMainMenu(chatId, user, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, access.reason === "expired" ? "Сессия истекла. Выполните <code>/staff</code>." : "Доступно только сотрудникам.");
    return;
  }
  await sendTelegramMessage(env, chatId,
    `<b>⚙️ Админ-панель</b>\n\nСотрудник: <b>${escapeHtml(telegramDisplayName(user))}</b>\nРоль: <b>${escapeHtml(staffRoleTitle(access))}</b>\nWorker: <b>v${escapeHtml(WORKER_BUILD)}</b>\n\nВыберите раздел. Критические действия требуют подтверждения и записываются в журнал.`,
    adminMainMenuMarkup(access)
  );
}

function banDurationLabel(blockType, blockedUntil) {
  if (blockType === "permanent" || !blockedUntil) return "навсегда";
  return `до ${formatUtcDate(blockedUntil)}`;
}

async function writeModerationHistory(env, telegramId, action, control, user, reason = "") {
  await ensureLiveOpsAdminSchema(env);
  await env.DB.prepare(
    `INSERT INTO player_moderation_history (telegram_id, action, block_type, reason, blocked_until, actor_telegram_id, actor_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(String(telegramId), action, String(control?.blockType || ""), String(reason || control?.blockReason || "").slice(0, 300), Number(control?.blockedUntil || 0), String(user?.id || "system"), telegramDisplayName(user || { id: "system", first_name: "Система" }), Math.floor(Date.now() / 1000)).run();
}

async function notifyPlayerModeration(env, telegramId, text) {
  try {
    const subscriber = await env.DB.prepare(`SELECT chat_id FROM bot_subscribers WHERE telegram_id = ? AND active = 1 LIMIT 1`).bind(String(telegramId)).first();
    if (subscriber?.chat_id) await sendTelegramMessage(env, subscriber.chat_id, text);
  } catch (error) {
    console.error("moderation notification failed", error);
  }
}

async function expireTemporaryPlayerBan(telegramId, env) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT telegram_id, blocked, block_reason, block_type, blocked_until FROM player_admin_controls
     WHERE telegram_id = ? AND blocked = 1 AND blocked_until > 0 AND blocked_until <= ? LIMIT 1`
  ).bind(String(telegramId), now).first();
  if (!row) return false;
  await env.DB.prepare(
    `UPDATE player_admin_controls SET blocked = 0, block_reason = '', block_type = 'permanent', blocked_until = 0,
     last_unblocked_at = ?, last_unblocked_by = 'system', updated_at = ?, updated_by = 'system' WHERE telegram_id = ?`
  ).bind(now, now, String(telegramId)).run();
  await writeModerationHistory(env, telegramId, "expire", { blockType: row.block_type, blockReason: row.block_reason, blockedUntil: row.blocked_until }, { id: "system", first_name: "Система" }, row.block_reason);
  await notifyPlayerModeration(env, telegramId, "✅ <b>Ограничение доступа завершено</b>\n\nВы снова можете пользоваться игрой.");
  return true;
}

async function expireAllTemporaryPlayerBans(env) {
  await ensureLiveOpsAdminSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    `SELECT telegram_id FROM player_admin_controls WHERE blocked = 1 AND blocked_until > 0 AND blocked_until <= ? LIMIT 100`
  ).bind(now).all();
  for (const row of result.results || []) await expireTemporaryPlayerBan(row.telegram_id, env);
}

async function startBlockCommand(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await setStaffWorkflow(user.id, chatId, "player_block_select", "target", {}, env);
  await sendTelegramMessage(env, chatId, `<b>Серьёзная блокировка</b>\n\nОтправьте Telegram ID или точный @username игрока. Код подтверждения вводить не нужно: далее будут выбор срока, причина и кнопка финального подтверждения.\n\nОтмена: <code>/cancel</code>`);
}

async function startUnblockCommand(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await setStaffWorkflow(user.id, chatId, "player_unblock_select", "target", {}, env);
  await sendTelegramMessage(env, chatId, `<b>Разблокировка игрока</b>\n\nОтправьте Telegram ID или точный @username игрока.\n\nОтмена: <code>/cancel</code>`);
}

async function handleBlockSelectMessage(message, workflow, env) {
  const targetId = await resolvePlayerTelegramId(String(message.text || "").trim(), env);
  if (!targetId || !(await playerProfileExists(targetId, env))) {
    await sendTelegramMessage(env, message.chat.id, "Игрок не найден. Отправьте точный Telegram ID или @username.");
    return true;
  }
  if (await protectedPlayerControlTarget(targetId, env)) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, message.chat.id, "Владельца и активного сотрудника блокировать нельзя.");
    return true;
  }
  const control = await getPlayerAdminControl(targetId, env);
  if (control.blocked) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, message.chat.id, `Игрок уже заблокирован: <b>${escapeHtml(control.blockReason || "причина не указана")}</b>.`);
    return true;
  }
  await updateStaffWorkflow(message.from.id, { flowType: "player_block", step: "duration", data: { targetId, playerName: await playerDisplayNameById(targetId, env) } }, env);
  await sendTelegramMessage(env, message.chat.id, `<b>Выберите срок блокировки</b>\n\nИгрок: <b>${escapeHtml(await playerDisplayNameById(targetId, env))}</b> · <code>${escapeHtml(targetId)}</code>`, {
    inline_keyboard: [
      [{ text: "24 часа", callback_data: `ban_duration:${targetId}:1d` }, { text: "7 дней", callback_data: `ban_duration:${targetId}:7d` }],
      [{ text: "30 дней", callback_data: `ban_duration:${targetId}:30d` }, { text: "Навсегда", callback_data: `ban_duration:${targetId}:permanent` }],
      [{ text: "Отмена", callback_data: "ops_cancel" }]
    ]
  });
  return true;
}

async function handleUnblockSelectMessage(message, workflow, env) {
  const targetId = await resolvePlayerTelegramId(String(message.text || "").trim(), env);
  if (!targetId) {
    await sendTelegramMessage(env, message.chat.id, "Игрок не найден. Отправьте точный Telegram ID или @username.");
    return true;
  }
  const control = await getPlayerAdminControl(targetId, env);
  if (!control.blocked) {
    await clearStaffWorkflow(message.from.id, env);
    await sendTelegramMessage(env, message.chat.id, "Этот игрок не заблокирован.");
    return true;
  }
  await setStaffWorkflow(message.from.id, message.chat.id, "player_unblock", "confirm", { targetId, playerName: await playerDisplayNameById(targetId, env), previousReason: control.blockReason }, env);
  await sendTelegramMessage(env, message.chat.id,
    `<b>Подтвердите разблокировку</b>\n\nИгрок: <b>${escapeHtml(await playerDisplayNameById(targetId, env))}</b> · <code>${escapeHtml(targetId)}</code>\nПричина блокировки: <b>${escapeHtml(control.blockReason || "не указана")}</b>`,
    { inline_keyboard: [[{ text: "✅ Разблокировать", callback_data: `player_unblock_confirm:${targetId}` }, { text: "Отмена", callback_data: "ops_cancel" }]] }
  );
  return true;
}

async function chooseBanDuration(query, telegramId, durationKey, env) {
  const access = await requirePlayerControlAccess(query.message?.chat?.id, query.from, env);
  if (!access) return;
  const workflow = await getStaffWorkflow(query.from.id, env);
  if (!workflow || workflow.flow_type !== "player_block" || String(workflow.data?.targetId || "") !== String(telegramId)) {
    await answerCallback(env, query.id, "Сценарий устарел. Начните заново: /block", true);
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const durationMap = { "1d": 86400, "7d": 7 * 86400, "30d": 30 * 86400, permanent: 0 };
  if (!(durationKey in durationMap)) {
    await answerCallback(env, query.id, "Некорректный срок.", true);
    return;
  }
  const blockType = durationKey === "permanent" ? "permanent" : "temporary";
  const blockedUntil = durationMap[durationKey] ? now + durationMap[durationKey] : 0;
  await updateStaffWorkflow(query.from.id, { step: "reason", data: { blockType, blockedUntil, durationKey } }, env);
  await answerCallback(env, query.id, "Срок выбран.");
  await sendTelegramMessage(env, query.message.chat.id,
    `<b>Укажите причину блокировки</b>\n\nСрок: <b>${escapeHtml(banDurationLabel(blockType, blockedUntil))}</b>\n\nОпишите нарушение одним сообщением — от 3 до 300 символов. Причина попадёт в журнал и будет показана игроку.`
  );
}

async function showBannedPlayers(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await expireAllTemporaryPlayerBans(env);
  const result = await env.DB.prepare(
    `SELECT telegram_id FROM player_admin_controls WHERE blocked = 1 ORDER BY CASE WHEN blocked_until = 0 THEN 0 ELSE 1 END, updated_at DESC LIMIT 30`
  ).all();
  const rows = result.results || [];
  if (!rows.length) {
    await sendTelegramMessage(env, chatId, "<b>🛡 Заблокированные игроки</b>\n\nСписок пуст.", { inline_keyboard: [[{ text: "⛔ Заблокировать игрока", callback_data: "ban_start" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]] });
    return;
  }
  const lines = [];
  const buttons = [];
  for (const row of rows) {
    const control = await getPlayerAdminControl(row.telegram_id, env);
    const name = await playerDisplayNameById(row.telegram_id, env);
    lines.push(`• <b>${escapeHtml(name)}</b> · <code>${escapeHtml(String(row.telegram_id))}</code>\n  ${escapeHtml(banDurationLabel(control.blockType, control.blockedUntil))} · ${escapeHtml(control.blockReason || "без причины")}`);
    buttons.push([{ text: `👤 ${String(name).slice(0, 24)}`, callback_data: `ban_view:${row.telegram_id}` }, { text: "✅ Разблокировать", callback_data: `player_unblock:${row.telegram_id}` }]);
  }
  buttons.push([{ text: "⛔ Новая блокировка", callback_data: "ban_start" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]);
  await sendTelegramMessage(env, chatId, `<b>🛡 Заблокированные игроки</b>\n\n${lines.join("\n\n")}`, { inline_keyboard: buttons });
}

async function addPlayerNote(chatId, user, rawTarget, noteText, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, "Доступно только сотрудникам.");
    return;
  }
  const targetId = await resolvePlayerTelegramId(rawTarget, env);
  if (!targetId) {
    await sendTelegramMessage(env, chatId, "Игрок не найден.");
    return;
  }
  const note = String(noteText || "").trim().replace(/\s+/g, " ").slice(0, 700);
  if (note.length < 3) {
    await sendTelegramMessage(env, chatId, "Заметка должна содержать минимум 3 символа.");
    return;
  }
  await ensureLiveOpsAdminSchema(env);
  await env.DB.prepare(`INSERT INTO player_notes (telegram_id, note_text, created_by, created_by_name, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(targetId, note, String(user.id), telegramDisplayName(user), Math.floor(Date.now() / 1000)).run();
  await logStaffAction(env, user, access, "player_note_add", targetId, "player", null, null, { note });
  await sendTelegramMessage(env, chatId, `✅ Заметка добавлена игроку <code>${escapeHtml(targetId)}</code>.`, { inline_keyboard: [[{ text: "📝 Открыть заметки", callback_data: `player_notes:${targetId}` }, { text: "👤 Карточка", callback_data: `player_refresh:${targetId}` }]] });
}

async function showPlayerNotes(chatId, user, rawTarget, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) {
    await sendTelegramMessage(env, chatId, "Доступно только сотрудникам.");
    return;
  }
  const targetId = await resolvePlayerTelegramId(rawTarget, env) || String(rawTarget || "");
  if (!/^\d{4,20}$/.test(targetId)) {
    await sendTelegramMessage(env, chatId, "Игрок не найден.");
    return;
  }
  await ensureLiveOpsAdminSchema(env);
  const result = await env.DB.prepare(`SELECT id, note_text, created_by_name, created_at FROM player_notes WHERE telegram_id = ? AND deleted_at = 0 ORDER BY created_at DESC LIMIT 20`).bind(targetId).all();
  const rows = result.results || [];
  const lines = rows.map((row) => `• ${escapeHtml(formatUtcDate(row.created_at))} · <b>${escapeHtml(row.created_by_name || "Сотрудник")}</b>\n${escapeHtml(row.note_text)}`);
  await sendTelegramMessage(env, chatId,
    `<b>📝 Заметки игрока</b>\n\nИгрок: <b>${escapeHtml(await playerDisplayNameById(targetId, env))}</b> · <code>${escapeHtml(targetId)}</code>\n\n${lines.length ? lines.join("\n\n") : "Заметок пока нет."}\n\nДобавить: <code>/note ${escapeHtml(targetId)} ТЕКСТ</code>`,
    { inline_keyboard: [[{ text: "👤 Карточка игрока", callback_data: `player_refresh:${targetId}` }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]] }
  );
}

async function showEconomyDashboard(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const now = Math.floor(Date.now() / 1000);
  const day = moscowDayStartUnix();
  const week = now - 7 * 86400;
  const [totals, dayRuns, weekRuns, casesDay, physicalPending, grantsDay, topResult] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS players, SUM(wallet) AS wallet, SUM(treats) AS treats, SUM(coffee) AS coffee, SUM(pending_wallet) AS pending_wallet, SUM(pending_treats) AS pending_treats, SUM(pending_coffee) AS pending_coffee FROM admin_profile_state`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) AS accepted FROM leaderboard_runs WHERE created_at >= ?`).bind(day).first(),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(score) AS score FROM leaderboard_runs WHERE created_at >= ? AND accepted = 1`).bind(week).first(),
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM level_case_openings WHERE opened_at >= ?) + (SELECT COUNT(*) FROM granted_cases WHERE opened_at >= ?) AS total`).bind(day, day).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM reward_codes WHERE status = 'active' AND expires_at > ?`).bind(now).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM staff_action_log WHERE action IN ('add_points','add_zefir','add_coffee','add_keys','grant_avatar','grant_frame','grant_trail','grant_skin') AND created_at >= ?`).bind(day).first(),
    env.DB.prepare(`SELECT telegram_id, wallet, treats, coffee FROM admin_profile_state ORDER BY wallet DESC LIMIT 5`).all()
  ]);
  const topLines = [];
  for (const row of topResult.results || []) topLines.push(`• <code>${escapeHtml(row.telegram_id)}</code> — ${Number(row.wallet || 0).toLocaleString("ru-RU")} очков`);
  await sendTelegramMessage(env, chatId,
    `<b>📊 Экономика игры</b>\n\n` +
    `Игроков в базе: <b>${Number(totals?.players || 0).toLocaleString("ru-RU")}</b>\n` +
    `Очков у игроков: <b>${Number(totals?.wallet || 0).toLocaleString("ru-RU")}</b>\n` +
    `Зефира: <b>${Number(totals?.treats || 0).toLocaleString("ru-RU")}</b>\n` +
    `Кофе: <b>${Number(totals?.coffee || 0).toLocaleString("ru-RU")}</b>\n` +
    `В очереди начисления: <b>${Number(totals?.pending_wallet || 0).toLocaleString("ru-RU")} очков · ${Number(totals?.pending_treats || 0).toLocaleString("ru-RU")} зефира · ${Number(totals?.pending_coffee || 0).toLocaleString("ru-RU")} кофе</b>\n\n` +
    `<b>Сегодня</b>\nЗабегов: <b>${Number(dayRuns?.accepted || 0)}/${Number(dayRuns?.total || 0)}</b>\nОткрыто кейсов: <b>${Number(casesDay?.total || 0)}</b>\nРучных выдач: <b>${Number(grantsDay?.count || 0)}</b>\n\n` +
    `<b>За 7 дней</b>\nЗачтённых забегов: <b>${Number(weekRuns?.total || 0)}</b>\nСуммарный счёт: <b>${Number(weekRuns?.score || 0).toLocaleString("ru-RU")}</b>\n\n` +
    `Активных физических кодов: <b>${Number(physicalPending?.count || 0)}</b>\n\n<b>Топ по очкам</b>\n${topLines.join("\n") || "Нет данных."}`,
    { inline_keyboard: [[{ text: "🔄 Обновить", callback_data: "adm_economy" }, { text: "🎯 Сегменты", callback_data: "adm_segments" }], [{ text: "⬅️ Админ-панель", callback_data: "adm_home" }]] }
  );
}

const PLAYER_SEGMENTS = Object.freeze({
  new_today: "Новые сегодня",
  inactive_7d: "Неактивны 7 дней",
  top_10: "Топ-10 рейтинга",
  legendary_openers: "Открывали Легендарный кейс",
  physical_winners: "Получали физическую награду",
  no_purchases: "Без покупок",
  banned: "Заблокированные"
});

async function segmentPlayerIds(env, key, limit = 10000) {
  const now = Math.floor(Date.now() / 1000);
  const day = moscowDayStartUnix();
  const max = Math.max(1, Math.min(10000, Number(limit) || 10000));
  let sql = "";
  let binds = [];
  if (key === "new_today") { sql = `SELECT telegram_id FROM admin_profile_state WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?`; binds = [day, max]; }
  else if (key === "inactive_7d") { sql = `SELECT telegram_id FROM admin_profile_state WHERE updated_at <= ? ORDER BY updated_at ASC LIMIT ?`; binds = [now - 7 * 86400, max]; }
  else if (key === "top_10") { sql = `SELECT telegram_id FROM leaderboard_all_time WHERE hidden = 0 ORDER BY best_score DESC, achieved_at ASC LIMIT 10`; }
  else if (key === "legendary_openers") { sql = `SELECT DISTINCT telegram_id FROM granted_cases WHERE case_type = 'legendary' AND status = 'opened' ORDER BY opened_at DESC LIMIT ?`; binds = [max]; }
  else if (key === "physical_winners") { sql = `SELECT DISTINCT owner_telegram_id AS telegram_id FROM reward_codes WHERE owner_telegram_id <> '' ORDER BY created_at DESC LIMIT ?`; binds = [max]; }
  else if (key === "no_purchases") { sql = `SELECT p.telegram_id FROM admin_profile_state p WHERE NOT EXISTS (SELECT 1 FROM granted_cases g WHERE g.telegram_id = p.telegram_id AND g.granted_by = 'shop') AND NOT EXISTS (SELECT 1 FROM shop_stock_consumptions s WHERE s.telegram_id = p.telegram_id AND s.category = 'skins') ORDER BY p.created_at DESC LIMIT ?`; binds = [max]; }
  else if (key === "banned") { sql = `SELECT telegram_id FROM player_admin_controls WHERE blocked = 1 ORDER BY updated_at DESC LIMIT ?`; binds = [max]; }
  else return [];
  let statement = env.DB.prepare(sql);
  if (binds.length) statement = statement.bind(...binds);
  const result = await statement.all();
  return [...new Set((result.results || []).map((row) => String(row.telegram_id || "")).filter(Boolean))];
}

async function showSegmentsDashboard(chatId, user, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const rows = [];
  for (const [key, title] of Object.entries(PLAYER_SEGMENTS)) {
    const ids = await segmentPlayerIds(env, key, 10000);
    rows.push({ key, title, count: ids.length });
  }
  await sendTelegramMessage(env, chatId,
    `<b>🎯 Сегменты игроков</b>\n\n${rows.map((row) => `• <b>${escapeHtml(row.title)}</b> — ${row.count.toLocaleString("ru-RU")}`).join("\n")}\n\nВыберите сегмент, чтобы посмотреть первых игроков или использовать его для кампании.`,
    { inline_keyboard: [
      ...rows.map((row) => [{ text: `${row.title} · ${row.count}`, callback_data: `segment_view:${row.key}` }]),
      [{ text: "📣 Создать кампанию", callback_data: "campaign_start" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]
    ] }
  );
}

async function showSegmentPlayers(chatId, user, key, env) {
  const access = await requireTeamPermission(chatId, user, "points", env);
  if (!access) return;
  const ids = await segmentPlayerIds(env, key, 10000);
  const lines = [];
  for (const id of ids.slice(0, 20)) lines.push(`• <b>${escapeHtml(await playerDisplayNameById(id, env))}</b> · <code>${escapeHtml(id)}</code>`);
  await sendTelegramMessage(env, chatId,
    `<b>🎯 ${escapeHtml(PLAYER_SEGMENTS[key] || key)}</b>\n\nВсего: <b>${ids.length.toLocaleString("ru-RU")}</b>\n\n${lines.join("\n") || "Игроков нет."}${ids.length > 20 ? `\n\nПоказаны первые 20.` : ""}`,
    { inline_keyboard: [[{ text: "📣 Кампания для сегмента", callback_data: `campaign_segment:${key}` }, { text: "⬅️ Сегменты", callback_data: "adm_segments" }]] }
  );
}

function campaignRewardTitle(kind, rewardId = "", amount = 1) {
  if (kind === "points") return `${amount.toLocaleString("ru-RU")} очков`;
  if (kind === "zefir") return `${amount.toLocaleString("ru-RU")} зефира`;
  if (kind === "coffee") return `${amount.toLocaleString("ru-RU")} кофе`;
  if (kind === "case") return `${amount} × ${LEVEL_CASE_CONFIG[rewardId]?.title || rewardId}`;
  return `${amount} × ${kind}`;
}

async function startCampaignWorkflow(chatId, user, env, presetSegment = "") {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await setStaffWorkflow(user.id, chatId, "campaign", presetSegment ? "reward" : "segment", presetSegment ? { segmentKey: presetSegment } : {}, env);
  if (presetSegment) {
    await sendTelegramMessage(env, chatId, `<b>Кампания · ${escapeHtml(PLAYER_SEGMENTS[presetSegment] || presetSegment)}</b>\n\nВыберите награду.`, campaignRewardMarkup());
    return;
  }
  await sendTelegramMessage(env, chatId, "<b>Новая массовая кампания</b>\n\nВыберите сегмент получателей.", {
    inline_keyboard: [...Object.entries(PLAYER_SEGMENTS).map(([key, title]) => [{ text: title, callback_data: `campaign_segment:${key}` }]), [{ text: "Отмена", callback_data: "ops_cancel" }]]
  });
}

function campaignRewardMarkup() {
  return { inline_keyboard: [
    [{ text: "⭐ Очки", callback_data: "campaign_reward:points:_" }, { text: "🍥 Зефир", callback_data: "campaign_reward:zefir:_" }, { text: "☕ Кофе", callback_data: "campaign_reward:coffee:_" }],
    [{ text: "📦 Обычный кейс", callback_data: "campaign_reward:case:small" }, { text: "🥈 Серебряный", callback_data: "campaign_reward:case:sweet" }],
    [{ text: "🥇 Золотой", callback_data: "campaign_reward:case:gold" }, { text: "👑 Легендарный", callback_data: "campaign_reward:case:legendary" }],
    [{ text: "Отмена", callback_data: "ops_cancel" }]
  ] };
}

async function handleCampaignWorkflowMessage(message, workflow, env) {
  const chatId = message.chat.id;
  const access = await requirePlayerControlAccess(chatId, message.from, env);
  if (!access) return true;
  if (workflow.step === "amount") {
    const amount = Math.floor(Number(String(message.text || "").replace(/\s/g, "")));
    const max = workflow.data?.rewardKind === "case" ? 10 : workflow.data?.rewardKind === "points" ? 1000000 : 5000;
    if (!Number.isFinite(amount) || amount < 1 || amount > max) {
      await sendTelegramMessage(env, chatId, `Введите целое число от 1 до ${max.toLocaleString("ru-RU")}.`);
      return true;
    }
    await updateStaffWorkflow(message.from.id, { step: "reason", data: { amount } }, env);
    await sendTelegramMessage(env, chatId, "Укажите причину массовой выдачи. Она попадёт в журнал и будет видна в отчёте.");
    return true;
  }
  if (workflow.step === "reason") {
    const reason = String(message.text || "").trim().replace(/\s+/g, " ").slice(0, 300);
    if (reason.length < 3) {
      await sendTelegramMessage(env, chatId, "Причина должна содержать минимум 3 символа.");
      return true;
    }
    await updateStaffWorkflow(message.from.id, { step: "confirm", data: { reason } }, env);
    const updated = await getStaffWorkflow(message.from.id, env);
    const ids = await segmentPlayerIds(env, updated.data.segmentKey, 10000);
    await sendTelegramMessage(env, chatId,
      `<b>Подтвердите массовую кампанию</b>\n\nСегмент: <b>${escapeHtml(PLAYER_SEGMENTS[updated.data.segmentKey] || updated.data.segmentKey)}</b>\nПолучателей: <b>${ids.length.toLocaleString("ru-RU")}</b>\nНаграда: <b>${escapeHtml(campaignRewardTitle(updated.data.rewardKind, updated.data.rewardId, updated.data.amount))}</b>\nПричина: <b>${escapeHtml(reason)}</b>\n\nКампания будет обработана очередью Cron и записана в журнал.`,
      { inline_keyboard: [[{ text: "✅ Запустить", callback_data: "campaign_confirm" }, { text: "Отмена", callback_data: "ops_cancel" }]] }
    );
    return true;
  }
  await sendTelegramMessage(env, chatId, "Используйте кнопки в предыдущем сообщении или /cancel.");
  return true;
}

async function createCampaignFromWorkflow(query, env) {
  const chatId = query.message?.chat?.id;
  const access = await requirePlayerControlAccess(chatId, query.from, env);
  if (!access) return;
  const workflow = await getStaffWorkflow(query.from.id, env);
  if (!workflow || workflow.flow_type !== "campaign" || workflow.step !== "confirm") {
    await answerCallback(env, query.id, "Сценарий устарел. Начните заново: /campaign", true);
    return;
  }
  const data = workflow.data || {};
  const ids = await segmentPlayerIds(env, data.segmentKey, 10000);
  if (!ids.length) {
    await answerCallback(env, query.id, "В сегменте нет игроков.", true);
    return;
  }
  await ensureLiveOpsAdminSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const campaignId = caseGrantId("campaign");
  await env.DB.prepare(
    `INSERT INTO admin_campaigns (campaign_id, title, segment_key, reward_kind, reward_id, amount, reason, status, created_by, created_by_name, report_chat_id, total_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
  ).bind(campaignId, `${PLAYER_SEGMENTS[data.segmentKey] || data.segmentKey}: ${campaignRewardTitle(data.rewardKind, data.rewardId, data.amount)}`, data.segmentKey, data.rewardKind, String(data.rewardId || ""), Number(data.amount || 1), data.reason, String(query.from.id), telegramDisplayName(query.from), String(chatId), ids.length, now, now).run();
  const statements = ids.map((id) => env.DB.prepare(`INSERT OR IGNORE INTO admin_campaign_recipients (campaign_id, telegram_id) VALUES (?, ?)`).bind(campaignId, id));
  for (let index = 0; index < statements.length; index += 80) await env.DB.batch(statements.slice(index, index + 80));
  await logStaffAction(env, query.from, access, "campaign_create", null, "campaign", null, ids.length, { campaignId, ...data });
  await clearStaffWorkflow(query.from.id, env);
  await answerCallback(env, query.id, "Кампания запущена.");
  await sendTelegramMessage(env, chatId, `<b>📣 Кампания создана</b>\n\nID: <code>${escapeHtml(campaignId)}</code>\nПолучателей: <b>${ids.length.toLocaleString("ru-RU")}</b>\nСтатус: ожидает Cron.`, { inline_keyboard: [[{ text: "📋 Кампании", callback_data: "adm_campaigns" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]] });
}

async function processCampaignRecipient(env, campaign, telegramId) {
  const amount = Math.max(1, Math.floor(Number(campaign.amount || 1)));
  if (["points", "zefir", "coffee"].includes(campaign.reward_kind)) {
    const field = ({ points: "pending_wallet", zefir: "pending_treats", coffee: "pending_coffee" })[campaign.reward_kind];
    const result = await env.DB.prepare(`UPDATE admin_profile_state SET ${field} = ${field} + ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE telegram_id = ?`)
      .bind(amount, Math.floor(Date.now() / 1000), `campaign:${campaign.campaign_id}`, telegramId).run();
    if (Number(result.meta?.changes || 0) < 1) throw new Error("Профиль игрока не найден");
  } else if (campaign.reward_kind === "case") {
    await createGrantedCases(env, telegramId, campaign.reward_id, amount, `campaign:${campaign.campaign_id}`, campaign.reason);
  } else throw new Error("Неизвестный тип награды");
  try {
    const subscriber = await env.DB.prepare(`SELECT chat_id FROM bot_subscribers WHERE telegram_id = ? AND active = 1 LIMIT 1`).bind(telegramId).first();
    if (subscriber?.chat_id) await sendTelegramMessage(env, subscriber.chat_id, `<b>🎁 Вам выдана награда</b>\n\n${escapeHtml(campaignRewardTitle(campaign.reward_kind, campaign.reward_id, amount))}\nПричина: ${escapeHtml(campaign.reason)}\n\nНаграда появится после следующей синхронизации игры.`);
  } catch {}
}

async function processPendingAdminCampaign(env) {
  await ensureLiveOpsAdminSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const job = await env.DB.prepare(`SELECT * FROM admin_campaigns WHERE status IN ('pending','running') AND (lease_until = 0 OR lease_until < ?) ORDER BY created_at ASC LIMIT 1`).bind(now).first();
  if (!job) return { processed: false };
  const leaseToken = caseGrantId("campaign_lock");
  const lease = await env.DB.prepare(`UPDATE admin_campaigns SET status = 'running', lease_token = ?, lease_until = ?, started_at = CASE WHEN started_at = 0 THEN ? ELSE started_at END, updated_at = ? WHERE campaign_id = ? AND status IN ('pending','running') AND (lease_until = 0 OR lease_until < ?)`)
    .bind(leaseToken, now + LIVEOPS_CAMPAIGN_LEASE_SECONDS, now, now, job.campaign_id, now).run();
  if (Number(lease.meta?.changes || 0) < 1) return { processed: false };
  const recipients = await env.DB.prepare(`SELECT telegram_id FROM admin_campaign_recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY telegram_id LIMIT ?`).bind(job.campaign_id, LIVEOPS_CAMPAIGN_BATCH_SIZE).all();
  for (const row of recipients.results || []) {
    try {
      await processCampaignRecipient(env, job, String(row.telegram_id));
      await env.DB.prepare(`UPDATE admin_campaign_recipients SET status = 'processed', processed_at = ? WHERE campaign_id = ? AND telegram_id = ?`).bind(Math.floor(Date.now() / 1000), job.campaign_id, row.telegram_id).run();
    } catch (error) {
      await env.DB.prepare(`UPDATE admin_campaign_recipients SET status = 'failed', error_text = ?, processed_at = ? WHERE campaign_id = ? AND telegram_id = ?`).bind(String(error?.message || error).slice(0, 500), Math.floor(Date.now() / 1000), job.campaign_id, row.telegram_id).run();
    }
  }
  const counts = await env.DB.prepare(`SELECT SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processed, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending FROM admin_campaign_recipients WHERE campaign_id = ?`).bind(job.campaign_id).first();
  const pending = Number(counts?.pending || 0);
  const completed = pending === 0;
  const finish = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`UPDATE admin_campaigns SET status = ?, processed_count = ?, failed_count = ?, completed_at = ?, updated_at = ?, lease_token = '', lease_until = 0 WHERE campaign_id = ? AND lease_token = ?`)
    .bind(completed ? "completed" : "running", Number(counts?.processed || 0), Number(counts?.failed || 0), completed ? finish : 0, finish, job.campaign_id, leaseToken).run();
  if (completed) {
    try { await sendTelegramMessage(env, job.report_chat_id, `<b>📣 Кампания завершена</b>\n\n${escapeHtml(job.title)}\nУспешно: <b>${Number(counts?.processed || 0)}</b>\nОшибок: <b>${Number(counts?.failed || 0)}</b>`); } catch {}
  }
  return { processed: true, completed };
}

async function showCampaignsDashboard(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await ensureLiveOpsAdminSchema(env);
  const result = await env.DB.prepare(`SELECT * FROM admin_campaigns ORDER BY created_at DESC LIMIT 15`).all();
  const lines = (result.results || []).map((row) => `• <b>${escapeHtml(row.title)}</b>\n  <code>${escapeHtml(row.campaign_id)}</code> · ${escapeHtml(row.status)} · ${Number(row.processed_count || 0)}/${Number(row.total_count || 0)} · ошибок ${Number(row.failed_count || 0)}`);
  await sendTelegramMessage(env, chatId, `<b>📣 Массовые кампании</b>\n\n${lines.join("\n\n") || "Кампаний пока нет."}`, { inline_keyboard: [[{ text: "➕ Новая кампания", callback_data: "campaign_start" }, { text: "🔄 Обновить", callback_data: "adm_campaigns" }], [{ text: "⬅️ Админ-панель", callback_data: "adm_home" }]] });
}

async function scanFraudAlerts(env) {
  await ensureLiveOpsAdminSchema(env);
  const since = Math.floor(Date.now() / 1000) - 7 * 86400;
  const suspiciousRuns = await env.DB.prepare(
    `SELECT run_id, telegram_id, score, duration_ms, accepted, rejection_reason, created_at
     FROM leaderboard_runs WHERE created_at >= ? AND (score >= 100000 OR (accepted = 1 AND duration_ms < 12000) OR rejection_reason <> '') ORDER BY created_at DESC LIMIT 200`
  ).bind(since).all();
  const now = Math.floor(Date.now() / 1000);
  for (const row of suspiciousRuns.results || []) {
    const severity = Number(row.score || 0) >= 250000 ? "critical" : Number(row.score || 0) >= 100000 ? "high" : row.accepted && Number(row.duration_ms || 0) < 12000 ? "high" : "medium";
    const alertType = row.rejection_reason ? "rejected_run" : Number(row.score || 0) >= 100000 ? "extreme_score" : "too_fast_run";
    const fingerprint = `run:${row.run_id}:${alertType}`;
    await env.DB.prepare(
      `INSERT OR IGNORE INTO fraud_alerts (telegram_id, alert_type, severity, title, details_json, status, fingerprint, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`
    ).bind(String(row.telegram_id), alertType, severity, alertType === "extreme_score" ? "Аномально высокий результат" : alertType === "too_fast_run" ? "Зачтён слишком быстрый забег" : "Отклонённый забег", JSON.stringify({ runId: row.run_id, score: row.score, durationMs: row.duration_ms, accepted: row.accepted, rejectionReason: row.rejection_reason }), fingerprint, row.created_at || now, now).run();
  }
  const repeatedCodes = await env.DB.prepare(`SELECT owner_telegram_id AS telegram_id, COUNT(*) AS count FROM reward_codes WHERE created_at >= ? GROUP BY owner_telegram_id HAVING COUNT(*) >= 15 LIMIT 100`).bind(since).all();
  for (const row of repeatedCodes.results || []) {
    const fingerprint = `physical-volume:${row.telegram_id}:${Math.floor(since / 604800)}`;
    await env.DB.prepare(`INSERT OR IGNORE INTO fraud_alerts (telegram_id, alert_type, severity, title, details_json, status, fingerprint, created_at, updated_at) VALUES (?, 'physical_volume', 'medium', 'Много физических наград за 7 дней', ?, 'open', ?, ?, ?)`)
      .bind(String(row.telegram_id), JSON.stringify({ count: Number(row.count || 0) }), fingerprint, now, now).run();
  }
}

async function showFraudDashboard(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await scanFraudAlerts(env);
  const result = await env.DB.prepare(`SELECT * FROM fraud_alerts WHERE status IN ('open','reviewing') ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC LIMIT 20`).all();
  const rows = result.results || [];
  const lines = rows.map((row) => `${row.severity === "critical" ? "🔴" : row.severity === "high" ? "🟠" : "🟡"} <b>#${row.id} ${escapeHtml(row.title)}</b>\nИгрок: <code>${escapeHtml(row.telegram_id)}</code> · ${escapeHtml(row.status)}`);
  const buttons = rows.slice(0, 10).map((row) => [{ text: `#${row.id} ${String(row.title).slice(0, 25)}`, callback_data: `fraud_view:${row.id}` }]);
  buttons.push([{ text: "🔍 Пересканировать", callback_data: "adm_fraud" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]);
  await sendTelegramMessage(env, chatId, `<b>🚨 Очередь антифрода</b>\n\n${lines.join("\n\n") || "Открытых сигналов нет."}\n\nСигнал не блокирует игрока автоматически — решение принимает администратор.`, { inline_keyboard: buttons });
}

async function showFraudAlert(chatId, user, alertId, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const row = await env.DB.prepare(`SELECT * FROM fraud_alerts WHERE id = ? LIMIT 1`).bind(Number(alertId)).first();
  if (!row) {
    await sendTelegramMessage(env, chatId, "Сигнал не найден.");
    return;
  }
  const details = parseJsonObject(row.details_json, {});
  await sendTelegramMessage(env, chatId,
    `<b>🚨 Сигнал #${Number(row.id)}</b>\n\nТип: <b>${escapeHtml(row.title)}</b>\nРиск: <b>${escapeHtml(row.severity)}</b>\nИгрок: <code>${escapeHtml(row.telegram_id)}</code>\nСтатус: <b>${escapeHtml(row.status)}</b>\nСоздан: ${escapeHtml(formatUtcDate(row.created_at))}\n\n<pre>${escapeHtml(JSON.stringify(details, null, 2).slice(0, 2500))}</pre>`,
    { inline_keyboard: [
      [{ text: "👤 Карточка игрока", callback_data: `player_refresh:${row.telegram_id}` }, { text: "⛔ Заблокировать", callback_data: `player_block:${row.telegram_id}` }],
      [{ text: "✅ Нормально", callback_data: `fraud_status:${row.id}:dismissed` }, { text: "✔️ Решено", callback_data: `fraud_status:${row.id}:resolved` }],
      [{ text: "⬅️ Антифрод", callback_data: "adm_fraud" }]
    ] }
  );
}

async function updateFraudStatus(query, alertId, status, env) {
  const access = await requirePlayerControlAccess(query.message?.chat?.id, query.from, env);
  if (!access) return;
  if (!["resolved", "dismissed", "reviewing"].includes(status)) return;
  await env.DB.prepare(`UPDATE fraud_alerts SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ?`).bind(status, String(query.from.id), Math.floor(Date.now() / 1000), Number(alertId)).run();
  await logStaffAction(env, query.from, access, "fraud_status", null, "fraud", null, Number(alertId), { status });
  await answerCallback(env, query.id, "Статус обновлён.");
  await showFraudDashboard(query.message.chat.id, query.from, env);
}

function liveOpsKindLabel(kind) {
  return ({ avatar: "Аватарки", frame: "Рамки", trail: "Следы", skin: "Скины" })[kind] || kind;
}

async function showContentDashboard(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const config = await readLiveOpsConfig(env);
  const lines = Object.entries(config.content).map(([kind, items]) => {
    const values = Object.values(items);
    return `• <b>${escapeHtml(liveOpsKindLabel(kind))}</b> — ${values.filter((item) => item.enabled).length}/${values.length} включено · NEW ${values.filter((item) => item.isNew).length}`;
  });
  await sendTelegramMessage(env, chatId, `<b>📦 Управление контентом</b>\n\n${lines.join("\n")}\n\nЗдесь можно включать и выключать существующие предметы, менять метку NEW и внутренний вес выпадения без нового деплоя.`, {
    inline_keyboard: [
      [{ text: "🖼 Аватарки", callback_data: "content_kind:avatar" }, { text: "🪞 Рамки", callback_data: "content_kind:frame" }],
      [{ text: "✨ Следы", callback_data: "content_kind:trail" }, { text: "🐶 Скины", callback_data: "content_kind:skin" }],
      [{ text: "🧾 История", callback_data: "adm_config_history" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]
    ]
  });
}

async function showContentKind(chatId, user, kind, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const config = await readLiveOpsConfig(env);
  const items = Object.entries(config.content[kind] || {}).sort(([, a], [, b]) => String(a.title).localeCompare(String(b.title), "ru"));
  const lines = items.map(([id, item]) => `${item.enabled ? "🟢" : "⚫"} <b>${escapeHtml(item.title)}</b> · ${escapeHtml(item.rarity)} · вес ${Number(item.weight)}${item.isNew ? " · NEW" : ""}\n<code>${escapeHtml(id)}</code>`);
  const buttons = items.slice(0, 20).flatMap(([id, item]) => [
    [{ text: `${item.enabled ? "Выключить" : "Включить"}: ${String(item.title).slice(0, 21)}`, callback_data: `content_toggle:${kind}:${id}:enabled` }, { text: item.isNew ? "Снять NEW" : "Поставить NEW", callback_data: `content_toggle:${kind}:${id}:new` }]
  ]);
  buttons.push([{ text: "⬅️ Контент", callback_data: "adm_content" }, { text: "🧾 История", callback_data: "adm_config_history" }]);
  await sendTelegramMessage(env, chatId, `<b>📦 ${escapeHtml(liveOpsKindLabel(kind))}</b>\n\n${lines.join("\n\n") || "Нет предметов."}\n\nИзменить вес: <code>/content_weight ${escapeHtml(kind)} ITEM_ID ВЕС</code>`, { inline_keyboard: buttons });
}

async function toggleContentItem(query, kind, itemId, field, env) {
  const access = await requirePlayerControlAccess(query.message?.chat?.id, query.from, env);
  if (!access) return;
  await ensureLiveOpsAdminSchema(env);
  const row = await env.DB.prepare(`SELECT * FROM liveops_content_items WHERE item_kind = ? AND item_id = ? LIMIT 1`).bind(kind, itemId).first();
  if (!row) {
    await answerCallback(env, query.id, "Предмет не найден.", true);
    return;
  }
  const oldValue = { ...row };
  if (field === "enabled") await env.DB.prepare(`UPDATE liveops_content_items SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = ?, updated_by = ? WHERE item_kind = ? AND item_id = ?`).bind(Math.floor(Date.now() / 1000), String(query.from.id), kind, itemId).run();
  else await env.DB.prepare(`UPDATE liveops_content_items SET is_new = CASE is_new WHEN 1 THEN 0 ELSE 1 END, updated_at = ?, updated_by = ? WHERE item_kind = ? AND item_id = ?`).bind(Math.floor(Date.now() / 1000), String(query.from.id), kind, itemId).run();
  const next = await env.DB.prepare(`SELECT * FROM liveops_content_items WHERE item_kind = ? AND item_id = ? LIMIT 1`).bind(kind, itemId).first();
  await logLiveOpsConfigChange(env, query.from, "content", `${kind}:${itemId}`, `toggle_${field}`, oldValue, next, "Изменение из админ-панели");
  await logStaffAction(env, query.from, access, "content_update", itemId, kind, null, null, { field, before: oldValue[field === "new" ? "is_new" : "enabled"], after: next[field === "new" ? "is_new" : "enabled"] });
  await answerCallback(env, query.id, "Настройка сохранена.");
  await showContentKind(query.message.chat.id, query.from, kind, env);
}

async function setContentWeight(chatId, user, kind, itemId, rawWeight, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const weight = Number(rawWeight);
  if (!LIVEOPS_RARITIES || !["avatar", "frame", "trail", "skin"].includes(kind) || !Number.isFinite(weight) || weight < 0 || weight > 10000) {
    await sendTelegramMessage(env, chatId, "Формат: <code>/content_weight avatar|frame|trail|skin ITEM_ID ВЕС</code>. Вес от 0 до 10000.");
    return;
  }
  await ensureLiveOpsAdminSchema(env);
  const old = await env.DB.prepare(`SELECT * FROM liveops_content_items WHERE item_kind = ? AND item_id = ? LIMIT 1`).bind(kind, itemId).first();
  if (!old) { await sendTelegramMessage(env, chatId, "Предмет не найден."); return; }
  await env.DB.prepare(`UPDATE liveops_content_items SET weight = ?, updated_at = ?, updated_by = ? WHERE item_kind = ? AND item_id = ?`).bind(weight, Math.floor(Date.now() / 1000), String(user.id), kind, itemId).run();
  const next = { ...old, weight };
  await logLiveOpsConfigChange(env, user, "content", `${kind}:${itemId}`, "weight", old, next, "Изменение веса выпадения");
  await sendTelegramMessage(env, chatId, `✅ Вес предмета <b>${escapeHtml(old.title)}</b> изменён: ${Number(old.weight)} → <b>${weight}</b>.`);
}

async function showCasesAdminDashboard(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const config = await readLiveOpsConfig(env);
  const lines = LIVEOPS_CASE_IDS.map((caseId) => {
    const item = config.cases[caseId];
    const total = Object.values(item.chances || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    return `${item.enabled ? "🟢" : "⚫"} <b>${escapeHtml(item.title)}</b> · сумма ${total.toFixed(3)}%${item.guaranteeCount ? ` · гарант ${item.guaranteeCount}` : ""}`;
  });
  await sendTelegramMessage(env, chatId,
    `<b>🎲 Конструктор кейсов</b>\n\n${lines.join("\n")}\n\nКоманды настройки:\n<code>/case_chance CASE CATEGORY VALUE</code>\n<code>/case_guarantee CASE COUNT</code>\n\nПосле каждого изменения бот проверяет, что сумма шансов равна 100%.`,
    { inline_keyboard: [
      ...LIVEOPS_CASE_IDS.map((caseId) => [{ text: `${config.cases[caseId].enabled ? "🟢" : "⚫"} ${config.cases[caseId].title}`, callback_data: `case_admin:${caseId}` }]),
      [{ text: "🧪 Проверить 100 000 открытий", callback_data: "case_simulate:legendary" }],
      [{ text: "🧾 История", callback_data: "adm_config_history" }, { text: "⬅️ Админ-панель", callback_data: "adm_home" }]
    ] }
  );
}

async function showCaseAdminDetails(chatId, user, caseId, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const config = await readLiveOpsConfig(env);
  const item = config.cases[caseId];
  if (!item) { await sendTelegramMessage(env, chatId, "Кейс не найден."); return; }
  const lines = Object.entries(item.chances).sort((a, b) => Number(b[1]) - Number(a[1])).map(([kind, chance]) => `• ${escapeHtml(kind)} — <b>${Number(chance).toLocaleString("ru-RU", { maximumFractionDigits: 3 })}%</b>`);
  const total = Object.values(item.chances).reduce((sum, value) => sum + Number(value || 0), 0);
  await sendTelegramMessage(env, chatId,
    `<b>🎲 ${escapeHtml(item.title)}</b>\n\nСтатус: <b>${item.enabled ? "включён" : "выключен"}</b>\nГарант: <b>${item.guaranteeCount || "нет"}</b>\nСумма: <b>${total.toFixed(3)}%</b>\n\n${lines.join("\n")}\n\nИзменить шанс: <code>/case_chance ${escapeHtml(caseId)} CATEGORY VALUE</code>`,
    { inline_keyboard: [[{ text: item.enabled ? "⚫ Выключить" : "🟢 Включить", callback_data: `case_toggle:${caseId}` }, { text: "🧪 100 000 открытий", callback_data: `case_simulate:${caseId}` }], [{ text: "⬅️ Кейсы", callback_data: "adm_cases" }, { text: "🧾 История", callback_data: "adm_config_history" }]] }
  );
}

async function toggleCaseEnabled(query, caseId, env) {
  const access = await requirePlayerControlAccess(query.message?.chat?.id, query.from, env);
  if (!access) return;
  const old = await env.DB.prepare(`SELECT * FROM liveops_case_configs WHERE case_id = ? LIMIT 1`).bind(caseId).first();
  if (!old) { await answerCallback(env, query.id, "Кейс не найден.", true); return; }
  await env.DB.prepare(`UPDATE liveops_case_configs SET enabled = CASE enabled WHEN 1 THEN 0 ELSE 1 END, updated_at = ?, updated_by = ? WHERE case_id = ?`).bind(Math.floor(Date.now() / 1000), String(query.from.id), caseId).run();
  const next = await env.DB.prepare(`SELECT * FROM liveops_case_configs WHERE case_id = ? LIMIT 1`).bind(caseId).first();
  await logLiveOpsConfigChange(env, query.from, "case", caseId, "toggle_enabled", old, next, "Изменение доступности кейса");
  await answerCallback(env, query.id, "Статус кейса изменён.");
  await showCaseAdminDetails(query.message.chat.id, query.from, caseId, env);
}

async function setCaseChance(chatId, user, caseId, category, rawValue, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  if (!LIVEOPS_CASE_IDS.includes(caseId)) { await sendTelegramMessage(env, chatId, "Неизвестный кейс."); return; }
  const allowed = ["points", "treats", "coffee", "booster", "skin", "avatar", "frame", "trail", "physical"];
  if (!allowed.includes(category)) { await sendTelegramMessage(env, chatId, `Категория: ${allowed.map((value) => `<code>${value}</code>`).join(", ")}.`); return; }
  const value = Number(String(rawValue).replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 100) { await sendTelegramMessage(env, chatId, "Шанс должен быть от 0 до 100."); return; }
  await ensureLiveOpsAdminSchema(env);
  const old = await env.DB.prepare(`SELECT * FROM liveops_case_configs WHERE case_id = ? LIMIT 1`).bind(caseId).first();
  const config = liveOpsCaseConfigFromRow(old);
  const chances = { ...config.chances };
  const previous = Math.max(0, Number(chances[category] || 0));
  chances[category] = value;
  let adjustedPoints = false;
  if (category !== "points") {
    const delta = value - previous;
    const nextPoints = Math.max(0, Number(chances.points || 0) - delta);
    if (nextPoints < -0.0005 || nextPoints > 100) {
      await sendTelegramMessage(env, chatId, "Изменение невозможно: для автоматической компенсации не хватает шанса категории points.");
      return;
    }
    chances.points = Number(nextPoints.toFixed(6));
    adjustedPoints = true;
  }
  const total = Object.values(chances).reduce((sum, item) => sum + Number(item || 0), 0);
  if (Math.abs(total - 100) > 0.0005) {
    await sendTelegramMessage(env, chatId, `Изменение не сохранено: сумма станет <b>${total.toFixed(3)}%</b>, а должна быть ровно 100%. Для прямого изменения points сначала скорректируйте другую категорию.`);
    return;
  }
  await env.DB.prepare(`UPDATE liveops_case_configs SET chances_json = ?, updated_at = ?, updated_by = ? WHERE case_id = ?`).bind(JSON.stringify(chances), Math.floor(Date.now() / 1000), String(user.id), caseId).run();
  const next = { ...old, chances_json: JSON.stringify(chances) };
  await logLiveOpsConfigChange(env, user, "case", caseId, "chance", old, next, `Категория ${category}`);
  await logStaffAction(env, user, access, "case_chance_update", null, "case", null, null, { caseId, category, previous, value, points: chances.points });
  await sendTelegramMessage(env, chatId,
    `✅ Шанс <code>${escapeHtml(category)}</code> в кейсе <b>${escapeHtml(config.title)}</b> установлен на <b>${value}%</b>.` +
    (adjustedPoints ? `\nШанс <code>points</code> автоматически изменён до <b>${Number(chances.points).toLocaleString("ru-RU", { maximumFractionDigits: 6 })}%</b>, поэтому сумма осталась 100%.` : "")
  );
}

async function setCaseGuarantee(chatId, user, caseId, rawCount, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const count = Math.floor(Number(rawCount));
  if (!LIVEOPS_CASE_IDS.includes(caseId) || !Number.isFinite(count) || count < 0 || count > 50) { await sendTelegramMessage(env, chatId, "Формат: <code>/case_guarantee CASE COUNT</code>. 0 отключает гарант, максимум 50."); return; }
  const old = await env.DB.prepare(`SELECT * FROM liveops_case_configs WHERE case_id = ? LIMIT 1`).bind(caseId).first();
  await env.DB.prepare(`UPDATE liveops_case_configs SET guarantee_count = ?, updated_at = ?, updated_by = ? WHERE case_id = ?`).bind(count, Math.floor(Date.now() / 1000), String(user.id), caseId).run();
  const next = { ...old, guarantee_count: count };
  await logLiveOpsConfigChange(env, user, "case", caseId, "guarantee", old, next, "Изменение гаранта");
  await sendTelegramMessage(env, chatId, `✅ Гарант кейса <code>${escapeHtml(caseId)}</code>: <b>${count || "выключен"}</b>.`);
}

async function showCaseSimulation(chatId, user, caseId, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  const config = await readLiveOpsConfig(env);
  const item = config.cases[caseId];
  if (!item) return;
  const openings = 100000;
  const lines = Object.entries(item.chances).sort((a, b) => Number(b[1]) - Number(a[1])).map(([kind, chance]) => `• ${escapeHtml(kind)} — ≈ <b>${Math.round(openings * Number(chance || 0) / 100).toLocaleString("ru-RU")}</b>`);
  await sendTelegramMessage(env, chatId, `<b>🧪 Оценка ${openings.toLocaleString("ru-RU")} открытий</b>\n\nКейс: <b>${escapeHtml(item.title)}</b>\n\n${lines.join("\n")}\n\nЭто математическое ожидание по текущим шансам. Для косметики итог дополнительно зависит от внутренних весов и уже собранной коллекции игрока.`, { inline_keyboard: [[{ text: "⬅️ К кейсу", callback_data: `case_admin:${caseId}` }]] });
}

async function showConfigHistory(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await ensureLiveOpsAdminSchema(env);
  const result = await env.DB.prepare(`SELECT * FROM liveops_config_history ORDER BY created_at DESC, id DESC LIMIT 20`).all();
  const rows = result.results || [];
  const lines = rows.map((row) => `• <b>#${row.id} ${escapeHtml(row.entity_type)} · ${escapeHtml(row.entity_id)}</b>\n  ${escapeHtml(row.action)} · ${escapeHtml(row.actor_name || row.actor_telegram_id)} · ${escapeHtml(formatUtcDate(row.created_at))}`);
  const buttons = rows.slice(0, 10).map((row) => [{ text: `↩️ Откатить #${row.id}`, callback_data: `cfg_rollback:${row.id}` }]);
  buttons.push([{ text: "⬅️ Админ-панель", callback_data: "adm_home" }]);
  await sendTelegramMessage(env, chatId, `<b>🧾 История настроек</b>\n\n${lines.join("\n\n") || "Изменений пока нет."}\n\nОткат создаёт новую запись истории и не удаляет старую.`, { inline_keyboard: buttons });
}

async function rollbackConfigChange(query, historyId, env) {
  const access = await requirePlayerControlAccess(query.message?.chat?.id, query.from, env);
  if (!access || !access.owner) {
    await answerCallback(env, query.id, "Откат доступен только владельцу.", true);
    return;
  }
  const row = await env.DB.prepare(`SELECT * FROM liveops_config_history WHERE id = ? LIMIT 1`).bind(Number(historyId)).first();
  if (!row) { await answerCallback(env, query.id, "Запись не найдена.", true); return; }
  const oldValue = parseJsonObject(row.old_json, {});
  if (row.entity_type === "content") {
    const [kind, itemId] = String(row.entity_id).split(":");
    await env.DB.prepare(`UPDATE liveops_content_items SET title = ?, rarity = ?, weight = ?, enabled = ?, is_new = ?, legendary_only = ?, image_url = ?, updated_at = ?, updated_by = ? WHERE item_kind = ? AND item_id = ?`)
      .bind(String(oldValue.title || itemId), String(oldValue.rarity || "common"), Number(oldValue.weight || 0), Number(oldValue.enabled || 0), Number(oldValue.is_new || 0), Number(oldValue.legendary_only || 0), String(oldValue.image_url || ""), Math.floor(Date.now() / 1000), String(query.from.id), kind, itemId).run();
  } else if (row.entity_type === "case") {
    await env.DB.prepare(`UPDATE liveops_case_configs SET enabled = ?, title = ?, guarantee_count = ?, chances_json = ?, ranges_json = ?, updated_at = ?, updated_by = ? WHERE case_id = ?`)
      .bind(Number(oldValue.enabled || 0), String(oldValue.title || row.entity_id), Number(oldValue.guarantee_count || 0), String(oldValue.chances_json || "{}"), String(oldValue.ranges_json || "{}"), Math.floor(Date.now() / 1000), String(query.from.id), row.entity_id).run();
  } else {
    await answerCallback(env, query.id, "Для этого типа откат пока не поддерживается.", true);
    return;
  }
  await logLiveOpsConfigChange(env, query.from, row.entity_type, row.entity_id, "rollback", parseJsonObject(row.new_json, {}), oldValue, `Откат записи #${row.id}`);
  await answerCallback(env, query.id, "Настройка откатана.");
  await showConfigHistory(query.message.chat.id, query.from, env);
}

async function showShopAdminDashboard(chatId, user, env) {
  const access = await requirePlayerControlAccess(chatId, user, env);
  if (!access) return;
  await ensureShopAssortmentSchema(env);
  const assortment = await readShopAssortment(env);
  const lines = Object.entries(assortment).map(([id, item]) => `${item.enabled ? "🟢" : "⚫"} <b>${escapeHtml(SHOP_ASSORTMENT_PRODUCTS[id]?.title || id)}</b> · ${Number(item.points || 0).toLocaleString("ru-RU")} очк. · ${Number(item.treats || 0)} зеф. · ${Number(item.coffee || 0)} кофе`);
  await sendTelegramMessage(env, chatId,
    `<b>🛒 Управление магазином</b>\n\n${lines.join("\n")}\n\nИзменить цену: <code>/price ТОВАР ЦЕНА</code>\nСкрыть: <code>/deletedprodyct ТОВАР</code>\nВернуть: <code>/addprodyct ТОВАР ЦЕНА</code>\nОстаток: <code>/setlimit ...</code>`,
    { inline_keyboard: [[{ text: "📦 Остатки", callback_data: "stock_refresh" }, { text: "🧾 Ассортимент", callback_data: "shop_assortment_refresh" }], [{ text: "⬅️ Админ-панель", callback_data: "adm_home" }]] }
  );
}

async function setStaffWorkContext(chatId, user, raw, env) {
  const access = await getTeamAccess(user, env);
  if (!access.authorized) { await sendTelegramMessage(env, chatId, "Доступно только сотрудникам."); return; }
  await ensureLiveOpsAdminSchema(env);
  const [locationRaw, shiftRaw = ""] = String(raw || "").split("|");
  const location = String(locationRaw || "").trim().slice(0, 80);
  const shift = String(shiftRaw || "").trim().slice(0, 80);
  if (!location) {
    const row = await env.DB.prepare(`SELECT location_name, shift_name FROM staff_work_context WHERE telegram_id = ? LIMIT 1`).bind(String(user.id)).first();
    await sendTelegramMessage(env, chatId, `<b>📍 Рабочая точка</b>\n\nТочка: <b>${escapeHtml(row?.location_name || "Основное кафе")}</b>\nСмена: <b>${escapeHtml(row?.shift_name || "не указана")}</b>\n\nИзменить: <code>/location НАЗВАНИЕ ТОЧКИ | СМЕНА</code>`);
    return;
  }
  await env.DB.prepare(`INSERT INTO staff_work_context (telegram_id, location_name, shift_name, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(telegram_id) DO UPDATE SET location_name = excluded.location_name, shift_name = excluded.shift_name, updated_at = excluded.updated_at`)
    .bind(String(user.id), location, shift, Math.floor(Date.now() / 1000)).run();
  await sendTelegramMessage(env, chatId, `✅ Рабочий контекст сохранён.\n\nТочка: <b>${escapeHtml(location)}</b>\nСмена: <b>${escapeHtml(shift || "не указана")}</b>`);
}

async function recordRedemptionWorkContext(env, reward, user) {
  await ensureLiveOpsAdminSchema(env);
  const context = await env.DB.prepare(`SELECT location_name, shift_name FROM staff_work_context WHERE telegram_id = ? LIMIT 1`).bind(String(user.id)).first();
  await env.DB.prepare(`INSERT OR REPLACE INTO physical_redemption_context (reward_code, employee_telegram_id, employee_name, location_name, shift_name, redeemed_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(String(reward.code || ""), String(user.id), telegramDisplayName(user), String(context?.location_name || "Основное кафе"), String(context?.shift_name || ""), Math.floor(Date.now() / 1000)).run();
}

async function handleLiveOpsAdminCallback(query, env) {
  const data = String(query.data || "");
  const chatId = query.message?.chat?.id;
  if (!chatId) return false;
  if (data === "adm_home") { await answerCallback(env, query.id, "Админ-панель."); await showAdminMainMenu(chatId, query.from, env); return true; }
  if (data === "adm_players") { await answerCallback(env, query.id, "Список игроков."); await showPlayerMembers(chatId, query.from, env); return true; }
  if (data === "adm_moderation") { await answerCallback(env, query.id, "Модерация."); await showBannedPlayers(chatId, query.from, env); return true; }
  if (data === "ban_start") { await answerCallback(env, query.id, "Отправьте игрока."); await startBlockCommand(chatId, query.from, env); return true; }
  const banView = data.match(/^ban_view:(\d{4,20})$/); if (banView) { await answerCallback(env, query.id, "Открываю карточку."); await showPlayerProfile(chatId, query.from, banView[1], env); return true; }
  const banDuration = data.match(/^ban_duration:(\d{4,20}):(1d|7d|30d|permanent)$/); if (banDuration) { await chooseBanDuration(query, banDuration[1], banDuration[2], env); return true; }
  const playerNotes = data.match(/^player_notes:(\d{4,20})$/); if (playerNotes) { await answerCallback(env, query.id, "Открываю заметки."); await showPlayerNotes(chatId, query.from, playerNotes[1], env); return true; }
  if (data === "adm_economy") { await answerCallback(env, query.id, "Экономика обновлена."); await showEconomyDashboard(chatId, query.from, env); return true; }
  if (data === "adm_segments") { await answerCallback(env, query.id, "Сегменты."); await showSegmentsDashboard(chatId, query.from, env); return true; }
  const segmentView = data.match(/^segment_view:([a-z0-9_]+)$/); if (segmentView) { await answerCallback(env, query.id, "Открываю сегмент."); await showSegmentPlayers(chatId, query.from, segmentView[1], env); return true; }
  if (data === "campaign_start") { await answerCallback(env, query.id, "Новая кампания."); await startCampaignWorkflow(chatId, query.from, env); return true; }
  const campaignSegment = data.match(/^campaign_segment:([a-z0-9_]+)$/); if (campaignSegment) {
    const access = await requirePlayerControlAccess(chatId, query.from, env); if (!access) return true;
    const current = await getStaffWorkflow(query.from.id, env);
    if (!current || current.flow_type !== "campaign") await setStaffWorkflow(query.from.id, chatId, "campaign", "reward", { segmentKey: campaignSegment[1] }, env);
    else await updateStaffWorkflow(query.from.id, { step: "reward", data: { segmentKey: campaignSegment[1] } }, env);
    await answerCallback(env, query.id, "Сегмент выбран."); await sendTelegramMessage(env, chatId, "Выберите награду.", campaignRewardMarkup()); return true;
  }
  const campaignReward = data.match(/^campaign_reward:(points|zefir|coffee|case):([A-Za-z0-9_-]+)$/); if (campaignReward) {
    const workflow = await getStaffWorkflow(query.from.id, env);
    if (!workflow || workflow.flow_type !== "campaign") { await answerCallback(env, query.id, "Начните заново: /campaign", true); return true; }
    await updateStaffWorkflow(query.from.id, { step: "amount", data: { rewardKind: campaignReward[1], rewardId: campaignReward[2] === "_" ? "" : campaignReward[2] } }, env);
    await answerCallback(env, query.id, "Награда выбрана."); await sendTelegramMessage(env, chatId, "Введите количество на одного игрока целым числом."); return true;
  }
  if (data === "campaign_confirm") { await createCampaignFromWorkflow(query, env); return true; }
  if (data === "adm_campaigns") { await answerCallback(env, query.id, "Кампании."); await showCampaignsDashboard(chatId, query.from, env); return true; }
  if (data === "adm_fraud") { await answerCallback(env, query.id, "Антифрод обновлён."); await showFraudDashboard(chatId, query.from, env); return true; }
  const fraudView = data.match(/^fraud_view:(\d+)$/); if (fraudView) { await answerCallback(env, query.id, "Открываю сигнал."); await showFraudAlert(chatId, query.from, Number(fraudView[1]), env); return true; }
  const fraudStatus = data.match(/^fraud_status:(\d+):(resolved|dismissed|reviewing)$/); if (fraudStatus) { await updateFraudStatus(query, Number(fraudStatus[1]), fraudStatus[2], env); return true; }
  if (data === "adm_content") { await answerCallback(env, query.id, "Контент."); await showContentDashboard(chatId, query.from, env); return true; }
  const contentKind = data.match(/^content_kind:(avatar|frame|trail|skin)$/); if (contentKind) { await answerCallback(env, query.id, "Каталог."); await showContentKind(chatId, query.from, contentKind[1], env); return true; }
  const contentToggle = data.match(/^content_toggle:(avatar|frame|trail|skin):([A-Za-z0-9_-]+):(enabled|new)$/); if (contentToggle) { await toggleContentItem(query, contentToggle[1], contentToggle[2], contentToggle[3], env); return true; }
  if (data === "adm_cases") { await answerCallback(env, query.id, "Кейсы."); await showCasesAdminDashboard(chatId, query.from, env); return true; }
  const caseAdmin = data.match(/^case_admin:(small|sweet|gold|legendary)$/); if (caseAdmin) { await answerCallback(env, query.id, "Настройки кейса."); await showCaseAdminDetails(chatId, query.from, caseAdmin[1], env); return true; }
  const caseToggle = data.match(/^case_toggle:(small|sweet|gold|legendary)$/); if (caseToggle) { await toggleCaseEnabled(query, caseToggle[1], env); return true; }
  const caseSimulate = data.match(/^case_simulate:(small|sweet|gold|legendary)$/); if (caseSimulate) { await answerCallback(env, query.id, "Расчёт готов."); await showCaseSimulation(chatId, query.from, caseSimulate[1], env); return true; }
  if (data === "adm_config_history") { await answerCallback(env, query.id, "История настроек."); await showConfigHistory(chatId, query.from, env); return true; }
  const rollback = data.match(/^cfg_rollback:(\d+)$/); if (rollback) { await rollbackConfigChange(query, Number(rollback[1]), env); return true; }
  if (data === "adm_shop") { await answerCallback(env, query.id, "Магазин."); await showShopAdminDashboard(chatId, query.from, env); return true; }
  if (data === "shop_assortment_refresh") { await answerCallback(env, query.id, "Ассортимент обновлён."); await showShopProductsFromBot(chatId, query.from, env); return true; }
  if (data === "adm_physical") { await answerCallback(env, query.id, "Физические награды."); await showStockDashboard(chatId, query.from, env); return true; }
  return false;
}

// =============================================================
// END LIVEOPS ADMIN CENTER v0.55
// =============================================================

async function syncBotCommands(env) {
  return telegramApi(env, "setMyCommands", { commands: BOT_COMMANDS });
}

async function sendTelegramMessage(env, chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return telegramApi(env, "sendMessage", payload);
}

async function sendTelegramPlainMessage(env, chatId, text) {
  return telegramApi(env, "sendMessage", {
    chat_id: chatId,
    text: String(text || ""),
    disable_web_page_preview: true
  });
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
    const error = new Error(`Telegram ${method} failed: ${data?.description || response.status}`);
    error.status = Number(data?.error_code || response.status || 0);
    error.description = String(data?.description || "");
    error.retryAfter = safeAdminNumber(data?.parameters?.retry_after);
    throw error;
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
  user = await applyPlayerAdminControl(user, env);
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
