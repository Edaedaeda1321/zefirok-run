(() => {
  if (window.__ZEFIROK_LOCAL_BUILD_V2__?.active) return;

  const LOCAL_VERSION = "2.0";
  const STORAGE_PREFIX = "zefirok-local-build-v2:";
  const SERVER_STATE_KEY = "__local_server_state__";
  const SNAPSHOT_KEY = "__local_snapshot_a__";
  const NETWORK_LOG_LIMIT = 80;
  const CASE_TYPES = ["small", "sweet", "gold", "mythic", "legendary", "alex"];
  const CASE_TITLES = {
    small: "Обычный кейс",
    sweet: "Серебряный кейс",
    gold: "Золотой кейс",
    mythic: "Мифический кейс",
    legendary: "Легендарный кейс",
    alex: "Кейс Алекса"
  };
  const CASE_DUPLICATE_POINTS = { skin:150000, avatar:500, frame:1500, trail:5000, music:150000 };
  const NATIVE_DATE = Date;
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  const localStore = window.localStorage;
  const sessionStore = window.sessionStorage;
  const storageProto = Object.getPrototypeOf(localStore);
  const nativeStorage = {
    get: storageProto.getItem,
    set: storageProto.setItem,
    remove: storageProto.removeItem,
    clear: storageProto.clear,
    key: storageProto.key
  };

  function scopedKey(store, key) {
    return `${STORAGE_PREFIX}${store === sessionStore ? "session" : "local"}:${String(key)}`;
  }
  function scopedPrefix(store) {
    return `${STORAGE_PREFIX}${store === sessionStore ? "session" : "local"}:`;
  }
  function installStorageIsolation() {
    storageProto.getItem = function(key) {
      return this === localStore || this === sessionStore
        ? nativeStorage.get.call(this, scopedKey(this, key))
        : nativeStorage.get.call(this, key);
    };
    storageProto.setItem = function(key, value) {
      return this === localStore || this === sessionStore
        ? nativeStorage.set.call(this, scopedKey(this, key), String(value))
        : nativeStorage.set.call(this, key, value);
    };
    storageProto.removeItem = function(key) {
      return this === localStore || this === sessionStore
        ? nativeStorage.remove.call(this, scopedKey(this, key))
        : nativeStorage.remove.call(this, key);
    };
    storageProto.clear = function() {
      if (this !== localStore && this !== sessionStore) return nativeStorage.clear.call(this);
      const prefix = scopedPrefix(this);
      const remove = [];
      for (let index = 0; index < this.length; index += 1) {
        const key = nativeStorage.key.call(this, index);
        if (String(key || "").startsWith(prefix)) remove.push(key);
      }
      for (const key of remove) nativeStorage.remove.call(this, key);
    };
    storageProto.key = function(index) {
      if (this !== localStore && this !== sessionStore) return nativeStorage.key.call(this, index);
      const prefix = scopedPrefix(this);
      const keys = [];
      for (let i = 0; i < this.length; i += 1) {
        const key = nativeStorage.key.call(this, i);
        if (String(key || "").startsWith(prefix)) keys.push(String(key).slice(prefix.length));
      }
      return keys[Math.max(0, Number(index) || 0)] ?? null;
    };
  }
  installStorageIsolation();

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
  }
  function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
  }
  function nowNative() { return NATIVE_DATE.now(); }
  function localNow() {
    const state = loadState(false);
    return nowNative() + Number(state?.clock?.offsetMs || 0);
  }
  function isoAt(ms) { return new NATIVE_DATE(Number(ms || localNow())).toISOString(); }
  function randomId(prefix = "local") {
    try { return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`; }
    catch { return `${prefix}_${nowNative().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }
  }

  function defaultTasks() {
    return [
      { id:"d_run_1", period:"daily", premium:false, title:"Заверши 1 забег", description:"Локальный сценарий: любой завершённый забег.", target:1, progress:1, step:1, xp:180, complete:true, claimed:false, locked:false, periodKey:"local-daily" },
      { id:"d_marsh_20", period:"daily", premium:false, title:"Собери 20 зефирок", description:"Локальный прогресс можно менять из LOCAL панели.", target:20, progress:12, step:5, xp:140, complete:false, claimed:false, locked:false, periodKey:"local-daily" },
      { id:"d_case_1", period:"daily", premium:false, title:"Открой 1 кейс", description:"Открытие любого локального кейса завершит сценарий.", target:1, progress:0, step:1, xp:220, complete:false, claimed:false, locked:false, periodKey:"local-daily" },
      { id:"w_run_15", period:"weekly", premium:false, title:"Заверши 15 забегов", description:"Недельная тестовая цель.", target:15, progress:9, step:3, xp:800, complete:false, claimed:false, locked:false, periodKey:"local-weekly" },
      { id:"w_cases_5", period:"weekly", premium:false, title:"Открой 5 кейсов", description:"Недельный сценарий кейсов.", target:5, progress:3, step:1, xp:950, complete:false, claimed:false, locked:false, periodKey:"local-weekly" },
      { id:"w_p_run_25", period:"weekly", premium:true, title:"Заверши 25 забегов", description:"Премиальная локальная цель.", target:25, progress:10, step:5, xp:1200, complete:false, claimed:false, locked:true, periodKey:"local-weekly" }
    ];
  }

  function defaultLeaderboardEntries() {
    const names = ["Зефирная Лапка","Кофейная Звезда","Розовый Хвостик","Булочка","Сахарок","Луна","Мята","Клубничка","Мокко","Пончик","Ириска","Сливка"];
    return names.map((displayName, index) => ({
      telegramId: index === 6 ? "990055001" : `local-rival-${index + 1}`,
      displayName,
      username: `local_${index + 1}`,
      score: Math.max(1000, 185000 - index * 11750),
      place: index + 1,
      avatarId: index % 4 === 0 ? "legendary_avatar_1" : "",
      frameId: index % 5 === 0 ? "princess" : "",
      photoUrl: ""
    }));
  }

  function defaultReferrals() {
    return {
      program:{ enabled:true, title:"Друзья кафе" },
      invite:{ code:"LOCALCAFE", url:"https://t.me/local_test_bot?start=LOCALCAFE" },
      activeFriends:3,
      nextNetworkMilestone:{ threshold:5, remaining:2, title:"Компания из пяти" },
      networkMilestones:[
        { threshold:1, title:"Первый друг", achieved:true, reward:{kind:"points",amount:5000}, rewardLabel:"5 000 очков" },
        { threshold:3, title:"Своя компания", achieved:true, reward:{kind:"case",id:"gold"}, rewardLabel:"Золотой кейс" },
        { threshold:5, title:"Компания из пяти", achieved:false, reward:{kind:"case",id:"legendary"}, rewardLabel:"Легендарный кейс" }
      ],
      friends:[
        { telegramId:"friend-local-1", displayName:"Мила", status:"active", level:14, weekly:{friendRuns:4}, milestones:[] },
        { telegramId:"friend-local-2", displayName:"Кекс", status:"active", level:8, weekly:{friendRuns:2}, milestones:[] },
        { telegramId:"friend-local-3", displayName:"Рози", status:"active", level:21, weekly:{friendRuns:5}, milestones:[] }
      ],
      rewards:[
        { id:"ref-local-1", status:"pending", reward:{kind:"case",id:"gold"}, rewardLabel:"Золотой кейс", sourceKey:"network:3", sourceType:"network" }
      ],
      pendingChoices:[],
      notifications:{ available:true, enabled:false, dailyCap:2 },
      weeklyProgram:{ enabled:true, target:3, partnerId:"friend-local-3", completed:true },
      friendGift:{ available:true, nextGiftAt:0, reward:{kind:"treats",amount:100}, rewardLabel:"100 зефира" },
      feed:[
        { type:"joined", title:"Мила пришла в кафе", text:"Друг активировал приглашение.", at:Math.floor(nowNative()/1000)-3600 },
        { type:"milestone", title:"Рози прошла новый этап", text:"Совместная награда стала ближе.", at:Math.floor(nowNative()/1000)-7200 }
      ],
      inviter:null
    };
  }

  function defaultState() {
    const now = nowNative();
    return {
      schemaVersion:2,
      build:"LOCAL 2.0",
      player:{ id:"990055001", firstName:"LOCAL", lastName:"Тестер", username:"local_tester" },
      profile:{ wallet:900000000, best:999999, treats:123000, coffee:123000, profileXp:250000, completedRuns:12 },
      cases:{
        inventory:{ small:25, sweet:25, gold:25, mythic:25, legendary:25, alex:25 },
        openedLevels:[], mythicPityCounter:0, mythicGuaranteedEvery:25, legendaryPityCounter:0, legendaryGuaranteedEvery:50,
        boosters:{ points:10, treats:10, coffee:10 }, activeBooster:{ type:"", runsLeft:0 }, ownedSpecials:[],
        ownedSkins:["default"], activeSkinId:"default", ownedAvatars:[], activeAvatarId:"", ownedFrames:[], activeFrameId:"", ownedTrails:[], activeTrailId:"",
        ownedMusicTracks:["cafe_run"], activeMusicTrackId:"cafe_run", alexRewardClaimed:false
      },
      pass:{
        player:{ xp:14600, level:15, premiumTier:"none", elitePlusBonusGranted:false },
        claimed:[], entitlements:[], tasks:defaultTasks(), overflow:{ claimed:0, stepXp:1500 }, seasonalCases:[],
        story:{ pending:null, completed:[] }, letter:{ available:true, opened:false },
        season:{ id:"season_1", title:"Сезон I: Открытие кафе", status:"active", startsAt:now-7*86400000, endsAt:now+21*86400000 },
        taskPeriods:{ daily:{resetAt:isoAt(now+8*3600000)}, weekly:{resetAt:isoAt(now+4*86400000)} }
      },
      leaderboard:{ entries:defaultLeaderboardEntries(), seasonBest:125000, allTimeBest:180000 },
      gifts:{ items:[] },
      rewards:{ codes:[] },
      support:{ tickets:[] },
      referrals:defaultReferrals(),
      offers:{ flash:[] },
      shop:{ liveContent:[] },
      polls:{ voted:[] },
      clock:{ offsetMs:0 },
      faults:{ mode:"none", path:"", delayMs:0 },
      forcedCase:{ reward:"auto", duplicate:false, guaranteed:false, alexComplete:false },
      network:{ externalAttempts:0, blocked:[], apiCalls:0, lastApi:"" },
      updatedAt:now
    };
  }

  function normalizeState(candidate) {
    const base = defaultState();
    const source = candidate && typeof candidate === "object" ? candidate : {};
    const next = {
      ...base,
      ...source,
      player:{...base.player,...(source.player||{})},
      profile:{...base.profile,...(source.profile||{})},
      cases:{...base.cases,...(source.cases||{})},
      pass:{...base.pass,...(source.pass||{})},
      leaderboard:{...base.leaderboard,...(source.leaderboard||{})},
      gifts:{...base.gifts,...(source.gifts||{})},
      rewards:{...base.rewards,...(source.rewards||{})},
      support:{...base.support,...(source.support||{})},
      referrals:{...base.referrals,...(source.referrals||{})},
      offers:{...base.offers,...(source.offers||{})},
      shop:{...base.shop,...(source.shop||{})},
      polls:{...base.polls,...(source.polls||{})},
      clock:{...base.clock,...(source.clock||{})},
      faults:{...base.faults,...(source.faults||{})},
      forcedCase:{...base.forcedCase,...(source.forcedCase||{})},
      network:{...base.network,...(source.network||{})}
    };
    next.cases.inventory = {...base.cases.inventory,...(source.cases?.inventory||{})};
    next.cases.boosters = {...base.cases.boosters,...(source.cases?.boosters||{})};
    next.cases.activeBooster = {...base.cases.activeBooster,...(source.cases?.activeBooster||{})};
    next.pass.player = {...base.pass.player,...(source.pass?.player||{})};
    next.pass.season = {...base.pass.season,...(source.pass?.season||{})};
    next.pass.overflow = {...base.pass.overflow,...(source.pass?.overflow||{})};
    next.pass.taskPeriods = {...base.pass.taskPeriods,...(source.pass?.taskPeriods||{})};
    if (!Array.isArray(next.pass.tasks)) next.pass.tasks = defaultTasks();
    if (!Array.isArray(next.leaderboard.entries)) next.leaderboard.entries = defaultLeaderboardEntries();
    if (!Array.isArray(next.gifts.items)) next.gifts.items = [];
    if (!Array.isArray(next.rewards.codes)) next.rewards.codes = [];
    if (!Array.isArray(next.support.tickets)) next.support.tickets = [];
    if (!Array.isArray(next.network.blocked)) next.network.blocked = [];
    return next;
  }

  let stateCache = null;
  function loadState(refresh = true) {
    if (!refresh && stateCache) return stateCache;
    try {
      const parsed = JSON.parse(localStorage.getItem(SERVER_STATE_KEY) || "null");
      stateCache = normalizeState(parsed);
    } catch {
      stateCache = defaultState();
    }
    return stateCache;
  }
  function saveState(state = stateCache) {
    stateCache = normalizeState(state || defaultState());
    stateCache.updatedAt = nowNative();
    localStorage.setItem(SERVER_STATE_KEY, JSON.stringify(stateCache));
    try { window.dispatchEvent(new CustomEvent("zefirok-local-state-changed", { detail:safeClone(stateCache) })); } catch {}
    return stateCache;
  }
  function replaceState(next) { stateCache = normalizeState(next); return saveState(stateCache); }
  if (!localStorage.getItem(SERVER_STATE_KEY)) saveState(defaultState()); else loadState(true);

  function clearClientCaches() {
    const keep = new Set([SERVER_STATE_KEY, SNAPSHOT_KEY]);
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && !keep.has(key)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
    try { sessionStorage.clear(); } catch {}
  }

  function installVirtualClock() {
    function LocalDate(...args) {
      if (!(this instanceof LocalDate)) return new NATIVE_DATE(localNow()).toString();
      if (args.length === 0) return new NATIVE_DATE(localNow());
      return new NATIVE_DATE(...args);
    }
    LocalDate.now = () => localNow();
    LocalDate.parse = NATIVE_DATE.parse.bind(NATIVE_DATE);
    LocalDate.UTC = NATIVE_DATE.UTC.bind(NATIVE_DATE);
    LocalDate.prototype = NATIVE_DATE.prototype;
    Object.setPrototypeOf(LocalDate, NATIVE_DATE);
    window.Date = LocalDate;
  }
  installVirtualClock();

  const telegramEvents = new Map();
  function emitTelegram(name, payload) {
    for (const callback of telegramEvents.get(name) || []) {
      try { callback(payload); } catch {}
    }
  }
  function buttonStub() {
    let visible = false;
    let callback = null;
    return {
      get isVisible(){ return visible; },
      show(){ visible = true; return this; }, hide(){ visible = false; return this; },
      onClick(fn){ callback = fn; return this; }, offClick(){ callback = null; return this; },
      setText(){ return this; }, enable(){ return this; }, disable(){ return this; },
      _click(){ try { callback?.(); } catch {} }
    };
  }
  const fakeWebApp = {
    initData:"local-build-v2",
    initDataUnsafe:{ user:{ id:990055001, first_name:"LOCAL", last_name:"Тестер", username:"local_tester", language_code:"ru", is_premium:false }, query_id:"local-build-v2", auth_date:0, hash:"local-build-v2" },
    version:"9.9", platform:"ios", colorScheme:"light", isExpanded:true, isFullscreen:false,
    viewportHeight:window.innerHeight || 800, viewportStableHeight:window.innerHeight || 800,
    safeAreaInset:{top:0,right:0,bottom:0,left:0}, contentSafeAreaInset:{top:0,right:0,bottom:0,left:0},
    CloudStorage:null,
    BackButton:buttonStub(), MainButton:buttonStub(), SecondaryButton:buttonStub(), SettingsButton:buttonStub(),
    HapticFeedback:{ impactOccurred(){}, notificationOccurred(){}, selectionChanged(){} },
    ready(){}, expand(){ this.isExpanded = true; }, close(){},
    setHeaderColor(){}, setBackgroundColor(){}, setBottomBarColor(){},
    requestFullscreen(){ this.isFullscreen = true; emitTelegram("fullscreenChanged", {isFullscreen:true}); },
    exitFullscreen(){ this.isFullscreen = false; emitTelegram("fullscreenChanged", {isFullscreen:false}); },
    isVersionAtLeast(){ return true; },
    onEvent(name, callback){ if (!telegramEvents.has(name)) telegramEvents.set(name, new Set()); telegramEvents.get(name).add(callback); },
    offEvent(name, callback){ telegramEvents.get(name)?.delete(callback); },
    openLink(url){ recordBlocked("telegram-open-link", String(url || "")); },
    openTelegramLink(url){ recordBlocked("telegram-open-link", String(url || "")); },
    showAlert(message, callback){ try { console.info("LOCAL Telegram alert:", message); } catch {}; callback?.(); },
    showPopup(params, callback){ try { console.info("LOCAL Telegram popup:", params); } catch {}; callback?.(params?.buttons?.[0]?.id || "ok"); },
    enableClosingConfirmation(){}, disableClosingConfirmation(){}
  };
  window.Telegram = { ...(window.Telegram || {}), WebApp:fakeWebApp };

  try {
    Object.defineProperty(navigator, "share", { configurable:true, value:async (payload) => { recordBlocked("navigator.share", JSON.stringify(payload || {})); return undefined; } });
  } catch {}

  function recordBlocked(kind, target) {
    const state = loadState(true);
    state.network.externalAttempts = Math.max(0, Number(state.network.externalAttempts || 0)) + 1;
    state.network.blocked = [...(state.network.blocked || []), { at:localNow(), kind:String(kind || "network"), target:String(target || "") }].slice(-NETWORK_LOG_LIMIT);
    saveState(state);
    updateNetworkBadge();
  }
  function recordApi(path) {
    const state = loadState(true);
    state.network.apiCalls = Math.max(0, Number(state.network.apiCalls || 0)) + 1;
    state.network.lastApi = String(path || "");
    saveState(state);
    updateNetworkBadge();
  }

  function profileData() {
    const p = loadState(true).profile;
    return {
      wallet:Math.floor(clampNumber(p.wallet)), best:Math.floor(clampNumber(p.best)), treats:Math.floor(clampNumber(p.treats)), coffee:Math.floor(clampNumber(p.coffee)), profileXp:Math.floor(clampNumber(p.profileXp)),
      authoritativeWallet:true,
      authoritativeFields:{ wallet:true, best:true, treats:true, coffee:true, profileXp:true }
    };
  }
  function publicCaseState() {
    const c = loadState(true).cases;
    return {
      mythicPityCounter:Math.floor(clampNumber(c.mythicPityCounter,0,49)), mythicGuaranteedEvery:Math.floor(clampNumber(c.mythicGuaranteedEvery,0,50)),
      legendaryPityCounter:Math.floor(clampNumber(c.legendaryPityCounter,0,49)), legendaryGuaranteedEvery:Math.floor(clampNumber(c.legendaryGuaranteedEvery,0,50)),
      boosters:{...c.boosters}, ownedSpecials:[...(c.ownedSpecials||[])], activeBooster:{...(c.activeBooster||{})},
      ownedSkins:[...(c.ownedSkins||["default"])], activeSkinId:String(c.activeSkinId || "default"),
      ownedAvatars:[...(c.ownedAvatars||[])], activeAvatarId:String(c.activeAvatarId || ""),
      ownedFrames:[...(c.ownedFrames||[])], activeFrameId:String(c.activeFrameId || ""),
      ownedTrails:[...(c.ownedTrails||[])], activeTrailId:String(c.activeTrailId || ""),
      ownedMusicTracks:[...(c.ownedMusicTracks||["cafe_run"])], activeMusicTrackId:String(c.activeMusicTrackId || "cafe_run")
    };
  }
  function alexCollectionCount() {
    const c = loadState(true).cases;
    let count = 0;
    if ((c.ownedSkins || []).includes("alex")) count += 1;
    if ((c.ownedTrails || []).includes("alex_trail")) count += 1;
    if ((c.ownedFrames || []).some(id => String(id).startsWith("alex_frame_"))) count += 1;
    if ((c.ownedAvatars || []).some(id => String(id).startsWith("alex_avatar_"))) count += 1;
    return Math.min(4, count);
  }
  function casePayload(extra = {}) {
    const state = loadState(true);
    return {
      ok:true, localBuild:true, authoritativeProfile:true,
      giftedCases:{...state.cases.inventory}, openedLevels:[...(state.cases.openedLevels||[])], caseState:publicCaseState(), profile:profileData(),
      alexCollection:{ count:alexCollectionCount(), rewardClaimed:Boolean(state.cases.alexRewardClaimed) },
      ...extra
    };
  }
  function addOwned(kind, id) {
    const c = loadState(true).cases;
    if (!id) return;
    const table = { skin:"ownedSkins", avatar:"ownedAvatars", frame:"ownedFrames", trail:"ownedTrails", music:"ownedMusicTracks" };
    const key = table[kind];
    if (!key) return;
    if (!Array.isArray(c[key])) c[key] = [];
    if (!c[key].includes(id)) c[key].push(id);
  }
  function makeCaseReward(type) {
    const state = loadState(true);
    const cfg = state.forcedCase || {};
    const auto = { small:"points", sweet:"avatar", gold:"trail", mythic:"frame", legendary:"skin", alex:"alex_skin" }[type] || "points";
    const choice = String(cfg.reward || "auto") === "auto" ? auto : String(cfg.reward || auto);
    let reward;
    if (choice === "points") reward = {kind:"points",amount:100000};
    else if (choice === "treats") reward = {kind:"treats",amount:750};
    else if (choice === "coffee") reward = {kind:"coffee",amount:750};
    else if (choice === "booster_points") reward = {kind:"booster",boosterType:"points"};
    else if (choice === "booster_treats") reward = {kind:"booster",boosterType:"treats"};
    else if (choice === "booster_coffee") reward = {kind:"booster",boosterType:"coffee"};
    else if (choice === "skin") reward = {kind:"skin",id:"angel"};
    else if (choice === "avatar") reward = {kind:"avatar",id:"legendary_avatar_1"};
    else if (choice === "frame") reward = {kind:"frame",id:"legendary_frame_1"};
    else if (choice === "trail") reward = {kind:"trail",id:"legendary_trail_1"};
    else if (choice === "music") reward = {kind:"music",id:"legendary_cafe_run"};
    else if (choice === "physical") reward = {kind:"physical",productId:"zefir",productName:"Фирменный зефир",code:`LOCAL-${localNow().toString(36).toUpperCase()}`,issuedAt:localNow(),expiresAt:localNow()+86400000,status:"active"};
    else if (choice === "alex_skin") reward = {kind:"skin",id:"alex"};
    else if (choice === "alex_trail") reward = {kind:"trail",id:"alex_trail"};
    else if (choice === "alex_frame") reward = {kind:"frame",id:"alex_frame_1"};
    else if (choice === "alex_avatar") reward = {kind:"avatar",id:"alex_avatar_1"};
    else reward = {kind:"points",amount:100000};
    if (["skin","avatar","frame","trail","music"].includes(reward.kind)) {
      reward.duplicate = Boolean(cfg.duplicate);
      reward.guaranteed = Boolean(cfg.guaranteed);
      if (reward.duplicate) reward.compensationPoints = CASE_DUPLICATE_POINTS[reward.kind] || 1000;
    }
    return reward;
  }
  function applyReward(reward) {
    const state = loadState(true);
    const p = state.profile;
    if (reward.kind === "points") p.wallet += Math.max(0, Number(reward.amount || 0));
    if (reward.kind === "treats") p.treats += Math.max(0, Number(reward.amount || 0));
    if (reward.kind === "coffee") p.coffee += Math.max(0, Number(reward.amount || 0));
    if (reward.kind === "booster") {
      const type = String(reward.boosterType || "");
      if (Object.prototype.hasOwnProperty.call(state.cases.boosters, type)) state.cases.boosters[type] = Math.max(0, Number(state.cases.boosters[type] || 0)) + 1;
    }
    if (["skin","avatar","frame","trail","music"].includes(reward.kind)) {
      if (reward.duplicate) p.wallet += Math.max(0, Number(reward.compensationPoints || 0));
      else addOwned(reward.kind, String(reward.id || ""));
    }
    saveState(state);
  }
  function openCase(typeInput) {
    const state = loadState(true);
    const type = CASE_TYPES.includes(String(typeInput || "")) ? String(typeInput) : "legendary";
    if (Number(state.cases.inventory[type] || 0) <= 0) state.cases.inventory[type] = 1;
    state.cases.inventory[type] = Math.max(0, Number(state.cases.inventory[type] || 0) - 1);
    saveState(state);
    const reward = makeCaseReward(type);
    applyReward(reward);
    const next = loadState(true);
    let alexCollection = null;
    let alexCollectionRewardGranted = false;
    if (type === "alex") {
      if (next.forcedCase?.alexComplete) {
        if (!next.cases.ownedSkins.includes("alex")) next.cases.ownedSkins.push("alex");
        if (!next.cases.ownedTrails.includes("alex_trail")) next.cases.ownedTrails.push("alex_trail");
        if (!next.cases.ownedFrames.includes("alex_frame_1")) next.cases.ownedFrames.push("alex_frame_1");
        if (!next.cases.ownedAvatars.includes("alex_avatar_1")) next.cases.ownedAvatars.push("alex_avatar_1");
      }
      const count = alexCollectionCount();
      if (count >= 4 && !next.cases.alexRewardClaimed) {
        next.cases.alexRewardClaimed = true;
        next.cases.inventory.gold = Math.max(0, Number(next.cases.inventory.gold || 0)) + 1;
        alexCollectionRewardGranted = true;
      }
      alexCollection = { count, rewardClaimed:Boolean(next.cases.alexRewardClaimed) };
      saveState(next);
    }
    const opened = { caseType:type, title:CASE_TITLES[type], rewards:[reward], alexCollection, alexCollectionRewardGranted };
    return casePayload({ opened, alexCollection });
  }

  function seasonPassPayload(extra = {}) {
    const state = loadState(true);
    const p = state.pass;
    const season = {
      ...p.season,
      startsAt:Number(p.season.startsAt || localNow()-86400000),
      endsAt:Number(p.season.endsAt || localNow()+86400000),
      capabilities:{ canClaimRewards:true, canClaimTasks:true, canPurchaseTier:true, canPurchaseLevels:true, canOpenStory:true, canOpenSeasonalCases:true },
      progression:{ overflowStepXp:Math.max(1,Number(p.overflow.stepXp||1500)), level50CompleteXp:50000 },
      tierSettings:{ elite:{xpBoost:false}, elitePlus:{xpBoost:true} }
    };
    return {
      ok:true, localBuild:true, serverTime:localNow(), season,
      player:{...p.player}, claimed:[...(p.claimed||[])], entitlements:[...(p.entitlements||[])], tasks:safeClone(p.tasks||[]),
      overflow:{...p.overflow}, seasonalCases:safeClone(p.seasonalCases||[]), story:safeClone(p.story||{}), letter:safeClone(p.letter||{}),
      taskPeriods:safeClone(p.taskPeriods||{}), balance:profileData(), catchUp:{active:false,multiplier:1},
      ...extra
    };
  }
  function setPassLevel(level) {
    const state = loadState(true);
    const nextLevel = Math.max(1, Math.min(50, Math.floor(Number(level || 1))));
    state.pass.player.level = nextLevel;
    state.pass.player.xp = Math.max(0, Math.floor(nextLevel <= 1 ? 0 : (nextLevel - 1) * 1000));
    saveState(state);
  }
  function claimPassReward(level, lane) {
    const state = loadState(true);
    const id = `${Math.max(1,Math.min(50,Math.floor(Number(level||1))))}:${lane === "premium" ? "premium" : "free"}`;
    if (!state.pass.claimed.includes(id)) state.pass.claimed.push(id);
    state.profile.wallet += lane === "premium" ? 2500 : 750;
    saveState(state);
    return seasonPassPayload({claimedAdded:[id]});
  }

  function leaderboardPayload(modeInput = "season") {
    const state = loadState(true);
    const mode = modeInput === "all_time" ? "all_time" : "season";
    const entries = safeClone(state.leaderboard.entries || []).sort((a,b)=>Number(b.score||0)-Number(a.score||0)).map((entry,index)=>({...entry,place:index+1}));
    const meIndex = entries.findIndex(entry => String(entry.telegramId) === String(state.player.id));
    const me = meIndex >= 0 ? entries[meIndex] : {telegramId:String(state.player.id),displayName:`${state.player.firstName} ${state.player.lastName}`.trim(),username:state.player.username,score:mode==="season"?state.leaderboard.seasonBest:state.leaderboard.allTimeBest,place:entries.length+1};
    const endsAt = localNow() + 21 * 86400000;
    return {
      ok:true, localBuild:true, mode, serverTime:localNow(),
      season:{ id:mode === "season" ? "season_1" : "all_time", title:mode === "season" ? "Сезон I: Открытие кафе" : "За всё время", status:"active", startsAt:localNow()-7*86400000, endsAt },
      top:entries.slice(0,20), me, gapToFirst:Math.max(0,Number(entries[0]?.score||0)-Number(me.score||0)),
      reward:mode === "season" ? { title:"Награда сезона", subtitle:"LOCAL preview", placeFrom:1, placeTo:10, rewardLabel:"Золотой кейс", caseType:"gold" } : null,
      nextSeason:null
    };
  }

  function giftStatePayload() {
    const state = loadState(true);
    const items = safeClone(state.gifts.items || []);
    return { ok:true, localBuild:true, items, pendingCount:items.filter(item=>String(item.status)!=="claimed").length };
  }
  function supportPayload() {
    const state = loadState(true);
    const tickets = safeClone(state.support.tickets || []);
    return { ok:true, localBuild:true, tickets, openCount:tickets.filter(ticket=>["new","working"].includes(String(ticket.status))).length, unreadCount:tickets.filter(ticket=>ticket.unread).length };
  }
  function referralStatePayload() {
    return { ok:true, localBuild:true, ...safeClone(loadState(true).referrals) };
  }

  function localDocumentPayload(query) {
    const key = String(query.get("doc") || "privacy");
    const titles = { privacy:"Политика конфиденциальности", terms:"Пользовательское соглашение", consent:"Согласие на обработку данных" };
    return { ok:true, localBuild:true, document:{ key, title:titles[key]||"Документ", version:"LOCAL", html:"<h2>LOCAL BUILD</h2><p>Это автономная тестовая копия. Юридический сервер и фиксация согласий отключены.</p>" } };
  }

  function genericGameConfig() {
    return {
      speedStart:8, speedMax:18, acceleration:0.018, difficultyScale:1,
      gravity:2200, jumpVelocity:760, obstacleSpawnMin:0.95, obstacleSpawnMax:1.65, resourceSpawnMin:0.45, resourceSpawnMax:0.9, pointsMultiplier:1
    };
  }
  function startupPayload() {
    return {
      ok:true, localBuild:true, flags:{ localBuild:true },
      publicConfig:{ gameplay:genericGameConfig(), shop:{ok:true,products:{},assortment:{},liveContent:[]}, skins:{ok:true,skins:{}} },
      profile:{ok:true,profile:profileData()}, cases:casePayload(), gifts:giftStatePayload(), rewards:{ok:true,rewards:safeClone(loadState(true).rewards.codes||[]),limitStatus:{count:0,limit:999,remaining:999}},
      seasonPassBonus:{ok:true,active:false,multiplier:1}, seasonPassTaskNotice:null, news:null,
      miniGameVisuals:null
    };
  }

  function parseBodySync(body) {
    if (body == null) return {};
    if (typeof body === "string") { try { return JSON.parse(body); } catch { return {raw:body}; } }
    if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      const out = {};
      for (const [key,value] of body.entries()) if (typeof value === "string") out[key] = value;
      return out;
    }
    return typeof body === "object" ? body : {};
  }
  async function requestPayload(input, init, method) {
    let body = init?.body;
    if (body == null && input instanceof Request && method !== "GET" && method !== "HEAD") {
      try { body = await input.clone().text(); } catch { body = null; }
    }
    return parseBodySync(body);
  }
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Zefirok-Local-Build":LOCAL_VERSION} });
  }
  function errorResponse(message, status = 418, code = "LOCAL_TEST_BLOCKED") {
    return jsonResponse({ok:false,localBuild:true,networkBlocked:true,code,error:String(message||"LOCAL TEST blocked")}, status);
  }

  function faultFor(path, signal) {
    const fault = loadState(true).faults || {};
    const mode = String(fault.mode || "none");
    const filter = String(fault.path || "").trim();
    if (mode === "none" || (filter && !String(path).includes(filter))) return null;
    if (mode === "500") return Promise.resolve(errorResponse(`LOCAL fault 500 · ${path}`, 500, "LOCAL_FAULT_500"));
    if (mode === "offline") return Promise.reject(Object.assign(new TypeError(`LOCAL offline · ${path}`), {code:"LOCAL_OFFLINE"}));
    if (mode === "timeout") {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
        signal?.addEventListener?.("abort", () => reject(new DOMException("Aborted", "AbortError")), {once:true});
      });
    }
    const delayMs = Math.max(0, Number(fault.delayMs || 0));
    if (mode === "delay" && delayMs > 0) return new Promise(resolve => setTimeout(() => resolve(null), delayMs));
    return null;
  }

  async function routeApi(path, payload, query) {
    recordApi(path);
    const state = loadState(true);
    if (path === "/api/access/bootstrap") return { ok:true, allowed:true, maintenance:{maintenance:false,allowed:true,mode:"open"}, legal:{accepted:true,required:false}, localBuild:true };
    if (path === "/api/legal/status") return { ok:true, accepted:true, required:false, localBuild:true, documents:{privacy:"LOCAL",terms:"LOCAL",consent:"LOCAL"} };
    if (path === "/api/legal/accept") return { ok:true, accepted:true, localBuild:true };
    if (path === "/api/legal/document") return localDocumentPayload(query);
    if (path === "/api/game/startup") return startupPayload();
    if (path === "/api/profile/sync") {
      if (payload?.mode === "write" && payload?.current && typeof payload.current === "object") {
        for (const field of ["wallet","best","treats","coffee","profileXp"]) if (field in payload.current) state.profile[field] = Math.floor(clampNumber(payload.current[field]));
        saveState(state);
      }
      return {ok:true,localBuild:true,profile:profileData()};
    }
    if (path === "/api/shop/config") return {ok:true,localBuild:true,products:{},assortment:{},liveContent:safeClone(state.shop.liveContent||[])};
    if (path === "/api/skins/config") return {ok:true,localBuild:true,skins:{}};
    if (path === "/api/cases/state") return casePayload();
    if (path === "/api/cases/open-granted") return openCase(payload.caseType);
    if (path === "/api/cases/open") {
      const level = Math.max(2, Math.floor(Number(payload.level || 2)));
      const type = level % 10 === 0 ? "gold" : level % 5 === 0 ? "sweet" : "small";
      if (!state.cases.openedLevels.includes(level)) state.cases.openedLevels.push(level);
      saveState(state);
      return openCase(type);
    }
    if (path === "/api/cases/purchase") {
      const type = CASE_TYPES.includes(String(payload.caseType || "")) ? String(payload.caseType) : "small";
      const costs = { small:[5000,0,0], sweet:[15000,0,0], gold:[30000,0,0], mythic:[50000,25,25], legendary:[75000,50,50], alex:[100000,75,75] }[type];
      state.profile.wallet = Math.max(0, state.profile.wallet - costs[0]);
      state.profile.treats = Math.max(0, state.profile.treats - costs[1]);
      state.profile.coffee = Math.max(0, state.profile.coffee - costs[2]);
      state.cases.inventory[type] = Math.max(0, Number(state.cases.inventory[type] || 0)) + 1;
      saveState(state);
      return casePayload({purchase:{caseType:type,repeated:false}});
    }
    if (path === "/api/cases/activate") {
      const type = String(payload.boosterType || "");
      if (Object.prototype.hasOwnProperty.call(state.cases.boosters,type) && Number(state.cases.boosters[type]||0)>0) {
        state.cases.boosters[type] -= 1; state.cases.activeBooster = {type,runsLeft:2}; saveState(state);
      }
      return casePayload();
    }
    if (path === "/api/cases/equip") {
      const kind = String(payload.kind || ""), id = String(payload.id || "");
      if (kind === "avatar") state.cases.activeAvatarId = id;
      if (kind === "frame") state.cases.activeFrameId = id;
      if (kind === "trail") state.cases.activeTrailId = id;
      if (kind === "music") state.cases.activeMusicTrackId = id || "cafe_run";
      if (kind === "skin") state.cases.activeSkinId = id || "default";
      saveState(state); return casePayload();
    }
    if (path === "/api/cases/consume-run") {
      if (Number(state.cases.activeBooster?.runsLeft||0)>0) state.cases.activeBooster.runsLeft -= 1;
      if (Number(state.cases.activeBooster?.runsLeft||0)<=0) state.cases.activeBooster = {type:"",runsLeft:0};
      saveState(state); return casePayload();
    }
    if (path === "/api/skins/bonus-case") {
      const type = "gold"; state.cases.inventory[type] += 1; saveState(state); return casePayload({bonusCase:{granted:true,caseType:type}});
    }
    if (path === "/api/skins/purchase") {
      const skinId = String(payload.skinId || "default"); if (!state.cases.ownedSkins.includes(skinId)) state.cases.ownedSkins.push(skinId); state.cases.activeSkinId = skinId; saveState(state); return casePayload({skin:{id:skinId,purchased:true}});
    }
    if (path === "/api/live-content/shop/buy") return casePayload({repeated:false,purchase:{kind:String(payload.kind||""),itemId:String(payload.itemId||"")}});
    if (path === "/api/gifts/state") return giftStatePayload();
    if (path === "/api/gifts/claim") {
      const gift = state.gifts.items.find(item => String(item.id) === String(payload.giftId));
      if (gift) { gift.status = "claimed"; gift.claimedAt = Math.floor(localNow()/1000); for (const reward of gift.rewards || []) { if (reward.kind === "case" && CASE_TYPES.includes(String(reward.id))) state.cases.inventory[reward.id] += Math.max(1,Number(reward.amount||1)); else applyReward(reward); } }
      saveState(state); return {ok:true,localBuild:true,profile:{ok:true,profile:profileData()},cases:casePayload(),gifts:giftStatePayload()};
    }
    if (path === "/api/rewards/mine") return {ok:true,localBuild:true,rewards:safeClone(state.rewards.codes||[]),limitStatus:{count:state.rewards.codes.length,limit:999,remaining:999}};
    if (path === "/api/rewards/create") {
      const code = `LOCAL-${localNow().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      const reward = { code, productId:String(payload.productId||"zefir"), productName:"LOCAL награда", issuedAt:localNow(), expiresAt:localNow()+86400000, status:"active" };
      state.rewards.codes.push(reward); state.profile.profileXp += 50; saveState(state);
      return {ok:true,localBuild:true,reward,profile:profileData(),profileXpAwarded:50,limitStatus:{count:state.rewards.codes.length,limit:999,remaining:999},repeated:false};
    }
    if (path === "/api/leaderboard/state") return leaderboardPayload(payload.mode || query.get("mode") || "season");
    if (path === "/api/leaderboard/submit") {
      const score = Math.floor(clampNumber(payload.score || payload.best || 0)); state.leaderboard.seasonBest = Math.max(state.leaderboard.seasonBest, score); state.leaderboard.allTimeBest = Math.max(state.leaderboard.allTimeBest, score); saveState(state); return leaderboardPayload(payload.mode || "season");
    }
    if (path === "/api/leaderboard/claim") { state.cases.inventory.gold += 1; saveState(state); return {ok:true,localBuild:true,reward:{kind:"case",id:"gold",title:"Золотой кейс"},cases:casePayload()}; }
    if (path === "/api/runs/start") return {ok:true,localBuild:true,runId:String(payload.runId||randomId("run")),sessionId:randomId("session"),serverTime:localNow()};
    if (path === "/api/runs/checkpoint") return {ok:true,localBuild:true,accepted:true,serverTime:localNow()};
    if (path === "/api/battle-pass/run") { state.profile.completedRuns += 1; state.pass.player.xp += 100; state.pass.player.level = Math.max(1,Math.min(50,Math.floor(state.pass.player.xp/1000)+1)); saveState(state); return {ok:true,localBuild:true,credited:true,xpAwarded:100,state:seasonPassPayload()}; }
    if (path === "/api/battle-pass/profile-bonus") return {ok:true,localBuild:true,active:state.pass.player.premiumTier==="elite_plus",multiplier:state.pass.player.premiumTier==="elite_plus"?2:1};
    if (path === "/api/battle-pass/task-notices/pending") return {ok:true,localBuild:true,notice:null};
    if (path === "/api/battle-pass/task-notices/read") return {ok:true,localBuild:true};
    if (path === "/api/battle-pass/story/visual-notice/read") return {ok:true,localBuild:true};
    if (path === "/api/battle-pass/access") return {ok:true,allowed:true,localBuild:true,season:seasonPassPayload().season,canPreviewUpcoming:true,accessRole:"local",state:seasonPassPayload()};
    if (path === "/api/battle-pass/state") return seasonPassPayload();
    if (path === "/api/battle-pass/purchase-tier") { state.pass.player.premiumTier = ["elite","elite_plus"].includes(String(payload.tier||payload.premiumTier)) ? String(payload.tier||payload.premiumTier) : "elite"; saveState(state); return seasonPassPayload({purchase:{tier:state.pass.player.premiumTier}}); }
    if (path === "/api/battle-pass/purchase-level") { setPassLevel(Math.min(50,Number(state.pass.player.level||1)+Math.max(1,Number(payload.levels||payload.count||1)))); return seasonPassPayload(); }
    if (path === "/api/battle-pass/claim") return claimPassReward(payload.level, payload.lane || payload.type);
    if (path === "/api/battle-pass/claim-all") { const level=Math.max(1,Number(state.pass.player.level||1)); const added=[]; for(let l=1;l<=level;l++){for(const lane of ["free",...(state.pass.player.premiumTier!=="none"?["premium"]:[])]){const id=`${l}:${lane}`;if(!state.pass.claimed.includes(id)){state.pass.claimed.push(id);added.push(id);}}} saveState(state); return seasonPassPayload({claimedAdded:added}); }
    if (path === "/api/battle-pass/tasks/claim") { const task=state.pass.tasks.find(t=>String(t.id)===String(payload.taskId||payload.id)); if(task&&!task.claimed){task.complete=true;task.progress=task.target;task.claimed=true;state.pass.player.xp += Math.max(0,Number(task.xp||0));state.pass.player.level=Math.max(1,Math.min(50,Math.floor(state.pass.player.xp/1000)+1));} saveState(state); return seasonPassPayload({task}); }
    if (path === "/api/battle-pass/tasks/claim-all") { let count=0; for(const task of state.pass.tasks){if(task.complete&&!task.claimed&&!task.locked){task.claimed=true;state.pass.player.xp+=Math.max(0,Number(task.xp||0));count++;}} state.pass.player.level=Math.max(1,Math.min(50,Math.floor(state.pass.player.xp/1000)+1));saveState(state);return seasonPassPayload({claimedTasks:count}); }
    if (path === "/api/battle-pass/overflow/claim") { state.pass.overflow.claimed=Math.max(0,Number(state.pass.overflow.claimed||0))+1;state.cases.inventory.gold+=1;saveState(state);return seasonPassPayload({overflow:{...state.pass.overflow},reward:{kind:"case",id:"gold"}}); }
    if (path === "/api/battle-pass/letter/state") return {ok:true,localBuild:true,letter:safeClone(state.pass.letter)};
    if (path === "/api/battle-pass/letter/open") { state.pass.letter.opened=true;saveState(state);return {ok:true,localBuild:true,letter:safeClone(state.pass.letter)}; }
    if (path === "/api/battle-pass/story/open" || path === "/api/battle-pass/story/test/open") { const chapter={id:String(payload.chapterId||payload.id||"local-story-1"),title:"LOCAL история",body:"Автономная сюжетная сцена для проверки интерфейса.",completed:false};state.pass.story.pending=chapter;saveState(state);return seasonPassPayload({story:safeClone(state.pass.story),chapter}); }
    if (path === "/api/battle-pass/story/complete") { if(state.pass.story.pending){state.pass.story.completed=[...(state.pass.story.completed||[]),state.pass.story.pending.id];state.pass.story.pending=null;} saveState(state);return seasonPassPayload({story:safeClone(state.pass.story)}); }
    if (path === "/api/battle-pass/seasonal-case/open") return {ok:true,localBuild:true,opened:openCase("gold").opened,state:seasonPassPayload()};
    if (path === "/api/support/state") return supportPayload();
    if (path === "/api/support/create") { const id=(state.support.tickets.reduce((m,t)=>Math.max(m,Number(t.id||0)),0)+1); const ticket={id,subject:String(payload.subject||"LOCAL обращение"),category:String(payload.category||"other"),categoryLabel:"Локальный тест",status:"new",statusLabel:"новое",unread:false,createdAt:Math.floor(localNow()/1000),updatedAt:Math.floor(localNow()/1000),messages:[{id:1,author:"player",message:String(payload.message||"LOCAL сообщение"),createdAt:Math.floor(localNow()/1000)}],attachments:[]};state.support.tickets.unshift(ticket);saveState(state);return supportPayload(); }
    if (path === "/api/support/reply") { const ticket=state.support.tickets.find(t=>Number(t.id)===Number(payload.ticketId));if(ticket){ticket.messages.push({id:ticket.messages.length+1,author:"player",message:String(payload.message||"LOCAL ответ"),createdAt:Math.floor(localNow()/1000)});ticket.updatedAt=Math.floor(localNow()/1000);}saveState(state);return supportPayload(); }
    if (path === "/api/support/read") { const ticket=state.support.tickets.find(t=>Number(t.id)===Number(payload.ticketId));if(ticket)ticket.unread=false;saveState(state);return supportPayload(); }
    if (path === "/api/news/read") return {ok:true,localBuild:true};
    if (path === "/api/polls/game/next") return {ok:true,localBuild:true,poll:null};
    if (path === "/api/polls/game/snooze" || path === "/api/polls/game/vote") return {ok:true,localBuild:true};
    if (path === "/api/shop/offers") return {ok:true,localBuild:true,offers:safeClone(state.offers.flash||[]),serverTime:localNow()};
    if (path === "/api/shop/offers/event") return {ok:true,localBuild:true};
    if (path === "/api/shop/offers/purchase") return {ok:true,localBuild:true,purchase:{repeated:false},profile:profileData(),cases:casePayload()};
    if (path === "/api/referrals/summary") return {ok:true,localBuild:true,pendingCount:(state.referrals.rewards||[]).filter(r=>r.status!=="delivered").length,boost:{active:false,multiplier:1}};
    if (path === "/api/referrals/state") return referralStatePayload();
    if (path === "/api/referrals/notifications/save") { state.referrals.notifications.enabled = Boolean(payload.enabled);saveState(state);return {ok:true,localBuild:true,state:referralStatePayload()}; }
    if (path === "/api/referrals/choice/select") return {ok:true,localBuild:true,state:referralStatePayload(),selected:{selectedRewardLabel:"LOCAL награда"}};
    if (path === "/api/referrals/gift/send") return {ok:true,localBuild:true,state:referralStatePayload(),gift:{rewardLabel:"100 зефира"}};
    if (path === "/api/referrals/claim") { const row=state.referrals.rewards.find(r=>String(r.id)===String(payload.rewardId));if(row)row.status="delivered";saveState(state);return {ok:true,localBuild:true,state:referralStatePayload(),reward:row?.reward||null}; }
    if (path === "/api/referrals/claim-all") { let delivered=0;for(const row of state.referrals.rewards||[]){if(row.status!=="delivered"){row.status="delivered";delivered++;}}saveState(state);return {ok:true,localBuild:true,state:referralStatePayload(),delivered}; }
    return null;
  }

  window.fetch = async (input, init = {}) => {
    const original = input instanceof Request ? input.url : String(input || "");
    let url;
    try { url = new URL(original, document.baseURI || location.href); }
    catch { recordBlocked("fetch-invalid", original); return errorResponse(`LOCAL TEST: invalid URL · ${original}`); }
    const sameOrigin = url.origin === location.origin || url.protocol === "about:" || location.protocol === "about:";
    if (url.pathname.startsWith("/api/")) {
      const method = String(init.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
      const payload = await requestPayload(input, init, method);
      const fault = faultFor(url.pathname, init.signal || (input instanceof Request ? input.signal : null));
      if (fault) {
        const result = await fault;
        if (result) return result;
      }
      const data = await routeApi(url.pathname, payload, url.searchParams);
      return data ? jsonResponse(data) : errorResponse(`LOCAL TEST: API route not implemented · ${url.pathname}`, 418, "LOCAL_API_NOT_IMPLEMENTED");
    }
    if (!sameOrigin) {
      recordBlocked("fetch-external", url.href);
      return errorResponse(`LOCAL TEST: external fetch blocked · ${url.origin}`, 451, "LOCAL_EXTERNAL_BLOCKED");
    }
    const staticAllowed = /^\/(?:assets|favicon|robots|manifest|local-test)/.test(url.pathname) || /\.(?:png|jpe?g|webp|gif|svg|mp3|m4a|wav|ogg|json|js|css|woff2?|ttf)(?:$|\?)/i.test(url.pathname);
    if (!staticAllowed) {
      recordBlocked("fetch-same-origin", url.pathname);
      return errorResponse(`LOCAL TEST: non-static fetch blocked · ${url.pathname}`, 451, "LOCAL_SAME_ORIGIN_BLOCKED");
    }
    if (!nativeFetch) return errorResponse("LOCAL TEST: native fetch unavailable", 500);
    return nativeFetch(input, init);
  };

  try {
    const Xhr = window.XMLHttpRequest;
    const nativeOpen = Xhr?.prototype?.open;
    if (nativeOpen) Xhr.prototype.open = function(method, url, ...rest) {
      const parsed = new URL(String(url || ""), location.href);
      recordBlocked("xhr", parsed.href);
      throw new Error(`LOCAL TEST: XMLHttpRequest blocked · ${parsed.pathname}`);
    };
  } catch {}
  try { navigator.sendBeacon = (url) => { recordBlocked("beacon", String(url || "")); return false; }; } catch {}
  try { if (window.WebSocket) window.WebSocket = function(url){ recordBlocked("websocket", String(url||"")); throw new Error("LOCAL TEST: WebSocket blocked"); }; } catch {}
  try { if (window.EventSource) window.EventSource = function(url){ recordBlocked("eventsource", String(url||"")); throw new Error("LOCAL TEST: EventSource blocked"); }; } catch {}
  try {
    const nativeOpenWindow = window.open?.bind(window);
    window.open = (url, target, features) => {
      const parsed = new URL(String(url || ""), location.href);
      if (parsed.origin !== location.origin) { recordBlocked("window.open", parsed.href); return null; }
      return nativeOpenWindow ? nativeOpenWindow(parsed.href, target, features) : null;
    };
  } catch {}
  document.addEventListener("click", event => {
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    try {
      const parsed = new URL(anchor.href, location.href);
      if (parsed.origin !== location.origin) { event.preventDefault(); recordBlocked("anchor", parsed.href); }
    } catch {}
  }, true);

  function applyPreset(name) {
    const next = defaultState();
    if (name === "fresh") {
      next.profile = {wallet:0,best:0,treats:0,coffee:0,profileXp:0,completedRuns:0};
      next.cases.inventory = {small:0,sweet:0,gold:0,mythic:0,legendary:0,alex:0};
      next.cases.boosters = {points:0,treats:0,coffee:0};
      next.pass.player = {xp:0,level:1,premiumTier:"none",elitePlusBonusGranted:false};
    } else if (name === "alex3") {
      next.cases.ownedSkins=["default","alex"];
      next.cases.ownedTrails=["alex_trail"];
      next.cases.ownedFrames=["alex_frame_1"];
      next.cases.ownedAvatars=[];
      next.cases.inventory.alex=25;
    } else if (name === "pass49") {
      next.pass.player={xp:48000,level:49,premiumTier:"elite_plus",elitePlusBonusGranted:true};
    } else if (name === "pass50") {
      next.pass.player={xp:53000,level:50,premiumTier:"elite_plus",elitePlusBonusGranted:true};
      next.pass.overflow={claimed:1,stepXp:1500};
    } else if (name === "cosmetics") {
      next.cases.ownedSkins=["default","barista","strawberry","bee","sailor","princess","angel","alex"];
      next.cases.ownedAvatars=["royal","champion","legendary_avatar_1","alex_avatar_1"];
      next.cases.ownedFrames=["heart","elite","princess","legendary_frame_1","alex_frame_1"];
      next.cases.ownedTrails=["marshmallow","gold","legendary_trail_1","alex_trail"];
      next.cases.ownedMusicTracks=["cafe_run","legendary_cafe_run"];
    }
    replaceState(next);
    clearClientCaches();
    location.reload();
  }

  function drawerMarkup() {
    const s = loadState(true), inv=s.cases.inventory, pass=s.pass.player, fault=s.faults, forced=s.forcedCase;
    const caseInputs = CASE_TYPES.map(type => `<label>${CASE_TITLES[type]}<input data-local-case="${type}" inputmode="numeric" value="${Math.floor(Number(inv[type]||0))}"></label>`).join("");
    return `<div class="zlocal-head"><div><strong>LOCAL BUILD 2.0</strong><span>1:1 UI · LocalGameServer · Anti-cheat OFF</span></div><button data-zlocal-close>×</button></div>
      <div class="zlocal-status"><b data-zlocal-network>NETWORK: ${Number(s.network.externalAttempts||0)} external</b><span>API локальный · Telegram fake · storage isolated</span></div>
      <div class="zlocal-presets"><button data-local-preset="fresh">Новый</button><button data-local-preset="rich">Богатый</button><button data-local-preset="alex3">Алекс 3/4</button><button data-local-preset="pass49">Pass 49</button><button data-local-preset="pass50">Pass 50+</button><button data-local-preset="cosmetics">Вся косметика</button></div>
      <fieldset><legend>Игрок</legend><div class="zlocal-grid"><label>Очки<input data-local-profile="wallet" inputmode="numeric" value="${Math.floor(Number(s.profile.wallet||0))}"></label><label>Зефир<input data-local-profile="treats" inputmode="numeric" value="${Math.floor(Number(s.profile.treats||0))}"></label><label>Кофе<input data-local-profile="coffee" inputmode="numeric" value="${Math.floor(Number(s.profile.coffee||0))}"></label><label>XP профиля<input data-local-profile="profileXp" inputmode="numeric" value="${Math.floor(Number(s.profile.profileXp||0))}"></label></div></fieldset>
      <fieldset><legend>Кейсы</legend><div class="zlocal-grid">${caseInputs}</div><div class="zlocal-grid"><label>Forced reward<select data-local-forced="reward"><option value="auto">auto</option><option value="points">очки</option><option value="treats">зефир</option><option value="coffee">кофе</option><option value="skin">скин</option><option value="avatar">аватар</option><option value="frame">рамка</option><option value="trail">след</option><option value="music">музыка</option><option value="physical">физ. награда</option><option value="alex_skin">Алекс · скин</option><option value="alex_trail">Алекс · след</option><option value="alex_frame">Алекс · рамка</option><option value="alex_avatar">Алекс · аватар</option></select></label><label class="zlocal-check"><input data-local-forced="duplicate" type="checkbox" ${forced.duplicate?"checked":""}>Дубликат</label><label class="zlocal-check"><input data-local-forced="guaranteed" type="checkbox" ${forced.guaranteed?"checked":""}>Гарант</label><label class="zlocal-check"><input data-local-forced="alexComplete" type="checkbox" ${forced.alexComplete?"checked":""}>Алекс 4/4</label></div></fieldset>
      <fieldset><legend>Season Pass / время</legend><div class="zlocal-grid"><label>Уровень<input data-local-pass="level" inputmode="numeric" value="${Math.floor(Number(pass.level||1))}"></label><label>Тариф<select data-local-pass="premiumTier"><option value="none">Free</option><option value="elite">Элитный</option><option value="elite_plus">Элитный+</option></select></label><label>Сдвиг дней<input data-local-clock inputmode="decimal" value="${(Number(s.clock.offsetMs||0)/86400000).toFixed(1)}"></label></div></fieldset>
      <fieldset><legend>Fault injection</legend><div class="zlocal-grid"><label>Режим<select data-local-fault="mode"><option value="none">норма</option><option value="500">HTTP 500</option><option value="offline">offline</option><option value="timeout">timeout</option><option value="delay">delay</option></select></label><label>Только path<input data-local-fault="path" value="${String(fault.path||"")}" placeholder="/api/cases"></label><label>Delay, ms<input data-local-fault="delayMs" inputmode="numeric" value="${Math.floor(Number(fault.delayMs||0))}"></label></div></fieldset>
      <div class="zlocal-actions"><button data-local-apply>Применить + reload</button><button data-local-snapshot>Снимок A</button><button data-local-restore>Вернуть A</button><button data-local-reset>Полный reset</button></div>
      <details><summary>Network log</summary><pre data-zlocal-log>${(s.network.blocked||[]).slice(-20).map(row=>`${new NATIVE_DATE(row.at).toLocaleTimeString("ru-RU")} · ${row.kind} · ${row.target}`).join("\n")||"Внешних попыток нет."}</pre></details>`;
  }

  let drawerRoot = null;
  function installDeveloperDrawer() {
    const path = String(location.pathname || "");
    const shouldShow = window.parent === window || /_(?:test)\.html$/i.test(path) || /(?:battle-pass|rating|referrals|legal)_test\.html$/i.test(path);
    if (!shouldShow || document.querySelector("[data-zlocal-launcher]")) return;
    const style = document.createElement("style");
    style.textContent = `.zlocal-launch{position:fixed;right:8px;bottom:8px;z-index:2147483647;border:1px solid #6bdca7;border-radius:999px;background:#10271d;color:#b9f7d7;padding:8px 11px;font:900 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 7px 24px rgba(0,0,0,.24)}.zlocal-drawer{position:fixed;right:8px;bottom:48px;z-index:2147483647;width:min(430px,calc(100vw - 16px));max-height:min(760px,calc(100vh - 64px));overflow:auto;border:1px solid #456c5b;border-radius:20px;background:#101714;color:#eef9f3;box-shadow:0 24px 70px rgba(0,0,0,.5);padding:12px;font:800 11px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.zlocal-drawer[hidden]{display:none!important}.zlocal-head{display:flex;gap:8px;align-items:flex-start}.zlocal-head>div{flex:1}.zlocal-head strong{display:block;font-size:14px}.zlocal-head span,.zlocal-status span{display:block;margin-top:3px;color:#a8c4b6;font-size:9px}.zlocal-head button{border:0;background:#20332a;color:#fff;border-radius:10px;width:30px;height:30px}.zlocal-status{margin:9px 0;padding:8px;border-radius:12px;background:#17251e}.zlocal-status b{color:#90efbd}.zlocal-status b.bad{color:#ffb0b9}.zlocal-presets,.zlocal-actions{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.zlocal-presets button,.zlocal-actions button{border:1px solid #426553;border-radius:10px;background:#1b2b23;color:#eafff4;padding:7px 8px;font:inherit}.zlocal-actions button:first-child{background:#287651;border-color:#3da26f}.zlocal-drawer fieldset{border:1px solid #304a3e;border-radius:13px;margin:8px 0;padding:8px}.zlocal-drawer legend{padding:0 5px;color:#bff2d3}.zlocal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.zlocal-grid label{display:grid;gap:3px;color:#b9d0c4;font-size:9px}.zlocal-grid input,.zlocal-grid select{width:100%;min-width:0;border:1px solid #385849;border-radius:9px;background:#0e1713;color:#fff;padding:7px;font:800 10px/1.2 inherit}.zlocal-grid .zlocal-check{display:flex;align-items:center;gap:5px;padding-top:16px}.zlocal-grid .zlocal-check input{width:auto}.zlocal-drawer details{margin-top:8px}.zlocal-drawer pre{white-space:pre-wrap;word-break:break-word;color:#a9c6b7;font:700 8px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}.zlocal-drawer summary{cursor:pointer;color:#c8e8d8}@media(max-width:480px){.zlocal-grid{grid-template-columns:1fr 1fr}.zlocal-drawer{max-height:calc(100vh - 70px)}}`;
    document.documentElement.append(style);
    const button = document.createElement("button"); button.type="button"; button.className="zlocal-launch"; button.dataset.zlocalLauncher="1"; button.textContent="LOCAL 2.0";
    drawerRoot = document.createElement("section"); drawerRoot.className="zlocal-drawer"; drawerRoot.hidden=true; drawerRoot.setAttribute("aria-label","LOCAL BUILD tools");
    document.body.append(button, drawerRoot);
    const render = () => {
      drawerRoot.innerHTML = drawerMarkup();
      drawerRoot.querySelector('[data-local-forced="reward"]').value = String(loadState(true).forcedCase.reward || "auto");
      drawerRoot.querySelector('[data-local-pass="premiumTier"]').value = String(loadState(true).pass.player.premiumTier || "none");
      drawerRoot.querySelector('[data-local-fault="mode"]').value = String(loadState(true).faults.mode || "none");
    };
    button.addEventListener("click",()=>{drawerRoot.hidden=!drawerRoot.hidden;if(!drawerRoot.hidden)render();});
    drawerRoot.addEventListener("click", event => {
      if (event.target.closest("[data-zlocal-close]")) { drawerRoot.hidden=true; return; }
      const preset=event.target.closest("[data-local-preset]")?.dataset.localPreset;if(preset){applyPreset(preset);return;}
      if (event.target.closest("[data-local-apply]")) {
        const s=loadState(true);
        drawerRoot.querySelectorAll("[data-local-profile]").forEach(input=>{s.profile[input.dataset.localProfile]=Math.floor(clampNumber(input.value));});
        drawerRoot.querySelectorAll("[data-local-case]").forEach(input=>{s.cases.inventory[input.dataset.localCase]=Math.floor(clampNumber(input.value,0,99999));});
        const levelInput=drawerRoot.querySelector('[data-local-pass="level"]');s.pass.player.level=Math.max(1,Math.min(50,Math.floor(Number(levelInput?.value||1))));s.pass.player.xp=Math.max(0,(s.pass.player.level-1)*1000);
        s.pass.player.premiumTier=String(drawerRoot.querySelector('[data-local-pass="premiumTier"]')?.value||"none");
        s.clock.offsetMs=Number(drawerRoot.querySelector("[data-local-clock]")?.value||0)*86400000;
        s.forcedCase.reward=String(drawerRoot.querySelector('[data-local-forced="reward"]')?.value||"auto");
        for(const key of ["duplicate","guaranteed","alexComplete"])s.forcedCase[key]=Boolean(drawerRoot.querySelector(`[data-local-forced="${key}"]`)?.checked);
        for(const key of ["mode","path","delayMs"]){const input=drawerRoot.querySelector(`[data-local-fault="${key}"]`);s.faults[key]=key==="delayMs"?Math.max(0,Number(input?.value||0)):String(input?.value||"");}
        saveState(s);clearClientCaches();location.reload();return;
      }
      if(event.target.closest("[data-local-snapshot]")){localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(loadState(true)));render();return;}
      if(event.target.closest("[data-local-restore]")){try{const snap=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||"null");if(snap){replaceState(snap);clearClientCaches();location.reload();}}catch{}return;}
      if(event.target.closest("[data-local-reset]")){replaceState(defaultState());clearClientCaches();location.reload();return;}
    });
  }

  function updateNetworkBadge() {
    if (!drawerRoot || drawerRoot.hidden) return;
    const badge=drawerRoot.querySelector("[data-zlocal-network]");if(!badge)return;const count=Number(loadState(true).network.externalAttempts||0);badge.textContent=`NETWORK: ${count} external`;badge.classList.toggle("bad",count>0);
    const log=drawerRoot.querySelector("[data-zlocal-log]");if(log)log.textContent=(loadState(true).network.blocked||[]).slice(-20).map(row=>`${new NATIVE_DATE(row.at).toLocaleTimeString("ru-RU")} · ${row.kind} · ${row.target}`).join("\n")||"Внешних попыток нет.";
  }

  document.addEventListener("DOMContentLoaded", installDeveloperDrawer, {once:true});
  if (document.readyState !== "loading") installDeveloperDrawer();

  window.__ZEFIROK_LOCAL_BUILD_V2__ = {
    active:true, version:LOCAL_VERSION, storagePrefix:STORAGE_PREFIX, apiLocal:true, externalNetworkBlocked:true, telegramFake:true, antiCheatExpectedDisabled:true,
    getState:()=>safeClone(loadState(true)), setState:(next)=>replaceState(next), reset:()=>replaceState(defaultState()), clearClientCaches,
    preset:applyPreset, routeApi, openCase, saveSnapshot:()=>localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(loadState(true))), restoreSnapshot:()=>{const raw=localStorage.getItem(SNAPSHOT_KEY);if(!raw)return false;replaceState(JSON.parse(raw));return true;}
  };
})();
