(() => {
  "use strict";

  const LOCAL_KEY = "zefirok-runner-progress-v2";
  const CLOUD_KEY = "zefirok_runner_progress_v2";
  const SYNC_PATH = "/api/admin/profile/sync";
  const RATING_PATH = "/api/admin/leaderboard/set";
  const MAX_CLOUD_BYTES = 4096;

  let attachedDocument = null;
  let writeTimer = 0;
  let syncInFlight = false;

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
  if (document.readyState !== "loading") initialize();

  async function initialize() {
    await waitForTelegram();
    await syncProfileFromServer();
    attachToGameFrame();
    window.setInterval(attachToGameFrame, 1000);
  }

  async function waitForTelegram() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (window.Telegram?.WebApp?.initData) return;
      await delay(100);
    }
  }

  async function syncProfileFromServer() {
    if (syncInFlight) return;
    const initData = String(window.Telegram?.WebApp?.initData || "");
    if (!initData) return;
    syncInFlight = true;
    try {
      const progress = readProgress();
      const payload = await postJson(SYNC_PATH, {
        initData,
        mode: "read",
        current: snapshotProgress(progress)
      });
      if (!payload?.ok || !payload.profile) return;
      const changed = applyServerProfile(progress, payload.profile);
      if (!changed) return;
      progress.updatedAt = Date.now();
      await persistProgress(progress);
      window.location.reload();
    } catch (error) {
      if (Number(error?.status || 0) !== 403) console.warn("Global admin profile sync failed", error);
    } finally {
      syncInFlight = false;
    }
  }

  function attachToGameFrame() {
    const frame = document.querySelector("iframe");
    const gameDocument = frame?.contentDocument;
    if (!gameDocument?.documentElement) return;
    ensureLeaderboardControls(gameDocument);
    if (attachedDocument === gameDocument) return;
    attachedDocument = gameDocument;
    gameDocument.addEventListener("click", handleGameClick, true);
    const observer = new MutationObserver(() => ensureLeaderboardControls(gameDocument));
    observer.observe(gameDocument.documentElement, { childList: true, subtree: true });
  }

  function handleGameClick(event) {
    const leaderboardButton = event.target?.closest?.("[data-admin-global-rating-save]");
    if (leaderboardButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveLeaderboardScore(attachedDocument);
      return;
    }

    const progressButton = event.target?.closest?.(
      "[data-admin-value-action], [data-admin-profile-action], [data-admin-zero-all]"
    );
    if (!progressButton) return;
    window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(pushLocalProgressToServer, 500);
  }

  async function pushLocalProgressToServer() {
    const initData = String(window.Telegram?.WebApp?.initData || "");
    if (!initData) return;
    try {
      const progress = readProgress();
      await postJson(SYNC_PATH, {
        initData,
        mode: "write",
        current: snapshotProgress(progress),
        next: snapshotProgress(progress)
      });
      setAdminMessage(attachedDocument, "Значения сохранены глобально для вашего Telegram-профиля.");
    } catch (error) {
      setAdminMessage(attachedDocument, error?.message || "Не удалось сохранить глобальные значения.", true);
    }
  }

  function ensureLeaderboardControls(gameDocument) {
    const dashboard = gameDocument.querySelector(".admin-dashboard");
    if (!dashboard || dashboard.querySelector("[data-admin-global-rating-section]")) return;
    const message = dashboard.querySelector("[data-admin-message]");
    const section = gameDocument.createElement("section");
    section.className = "admin-section";
    section.dataset.adminGlobalRatingSection = "";
    section.innerHTML = `
      <h3>Серверный рейтинг</h3>
      <div class="admin-global-note"><strong>Глобально.</strong> Значение сразу меняет ваш результат в текущем сезоне и во вкладке «За всё время».</div>
      <div class="admin-value-row">
        <span>Очки рейтинга</span>
        <input class="admin-input" data-admin-global-rating-value inputmode="numeric" min="0" step="1" type="number" value="0">
        <button class="admin-button admin-button--primary" data-admin-global-rating-save type="button">Задать рейтинг</button>
      </div>`;
    if (message) dashboard.insertBefore(section, message);
    else dashboard.append(section);
  }

  async function saveLeaderboardScore(gameDocument) {
    const input = gameDocument?.querySelector("[data-admin-global-rating-value]");
    const score = sanitizeNumber(input?.value);
    const initData = String(window.Telegram?.WebApp?.initData || "");
    if (!initData) {
      setAdminMessage(gameDocument, "Откройте игру внутри Telegram.", true);
      return;
    }
    const button = gameDocument.querySelector("[data-admin-global-rating-save]");
    if (button) button.disabled = true;
    setAdminMessage(gameDocument, "Сохраняем серверный рейтинг…");
    try {
      const progress = readProgress();
      const level = profileLevelFromXp(progress.profileXp);
      const payload = await postJson(RATING_PATH, { initData, score, level });
      setAdminMessage(gameDocument, `Серверный рейтинг установлен: ${formatNumber(payload.score)} очков.`);
    } catch (error) {
      setAdminMessage(gameDocument, error?.message || "Не удалось изменить серверный рейтинг.", true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function readProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function snapshotProgress(progress) {
    return {
      wallet: sanitizeNumber(progress.wallet),
      best: sanitizeNumber(progress.best),
      treats: sanitizeNumber(progress.treats),
      coffee: sanitizeNumber(progress.coffee),
      profileXp: sanitizeNumber(progress.profileXp)
    };
  }

  function applyServerProfile(progress, profile) {
    let changed = false;
    for (const field of ["wallet", "best", "treats", "coffee", "profileXp"]) {
      const next = sanitizeNumber(profile[field]);
      if (sanitizeNumber(progress[field]) === next) continue;
      progress[field] = next;
      changed = true;
    }
    return changed;
  }

  async function persistProgress(progress) {
    const serialized = JSON.stringify(progress);
    localStorage.setItem(LOCAL_KEY, serialized);
    const cloud = window.Telegram?.WebApp?.CloudStorage;
    if (!cloud || new TextEncoder().encode(serialized).length > MAX_CLOUD_BYTES) return;
    await new Promise((resolve) => cloud.setItem(CLOUD_KEY, serialized, () => resolve()));
  }

  async function postJson(path, body) {
    const response = await fetch(path, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function profileLevelFromXp(value) {
    const xp = sanitizeNumber(value);
    let level = 1;
    let required = 20;
    let remaining = xp;
    while (level < 50 && remaining >= required) {
      remaining -= required;
      level += 1;
      required += 10;
    }
    return level;
  }

  function sanitizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(999999999, Math.floor(number))) : 0;
  }

  function setAdminMessage(gameDocument, message, isError = false) {
    const element = gameDocument?.querySelector("[data-admin-message]");
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#a23636" : "";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
})();
