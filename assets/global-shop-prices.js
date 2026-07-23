(() => {
  "use strict";

  const CONFIG_PATH = "/api/shop/config";
  const ADMIN_SAVE_PATH = "/api/admin/shop/prices";
  const DEFAULT_PRODUCTS = Object.freeze({
    zefir: Object.freeze({ points: 40000, treats: 350, coffee: 0 }),
    americano: Object.freeze({ points: 65000, treats: 0, coffee: 350 }),
    cappuccino: Object.freeze({ points: 75000, treats: 0, coffee: 450 })
  });

  let currentProducts = cloneProducts(DEFAULT_PRODUCTS);
  let attachedDocument = null;

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
  if (document.readyState !== "loading") initialize();

  async function initialize() {
    currentProducts = await loadProducts();
    attachToGameFrame();
    window.setInterval(attachToGameFrame, 1000);
  }

  async function loadProducts() {
    try {
      const response = await fetch(CONFIG_PATH, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return normalizeProducts(payload?.products, DEFAULT_PRODUCTS);
    } catch (error) {
      console.warn("Global shop prices: fallback to embedded prices", error);
      return cloneProducts(DEFAULT_PRODUCTS);
    }
  }

  function attachToGameFrame() {
    const frame = document.querySelector("iframe");
    const gameDocument = frame?.contentDocument;
    if (!gameDocument?.documentElement) return;

    applyProducts(gameDocument, currentProducts);
    if (attachedDocument === gameDocument) return;
    attachedDocument = gameDocument;

    gameDocument.addEventListener("click", handleAdminClick, true);
    const observer = new MutationObserver(() => applyProducts(gameDocument, currentProducts));
    observer.observe(gameDocument.documentElement, { childList: true, subtree: true });
  }

  async function handleAdminClick(event) {
    const button = event.target?.closest?.("[data-admin-save-prices], [data-admin-reset-prices]");
    if (!button || !attachedDocument) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const reset = button.hasAttribute("data-admin-reset-prices");
    const products = reset ? cloneProducts(DEFAULT_PRODUCTS) : collectAdminProducts(attachedDocument);
    setAdminMessage(attachedDocument, "Сохраняем глобальные цены для всех игроков…");
    setAdminButtonsDisabled(attachedDocument, true);

    try {
      const initData = String(window.Telegram?.WebApp?.initData || "");
      const response = await fetch(ADMIN_SAVE_PATH, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, products })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${response.status}`);

      currentProducts = normalizeProducts(payload.products, DEFAULT_PRODUCTS);
      applyProducts(attachedDocument, currentProducts);
      fillAdminInputs(attachedDocument, currentProducts);
      setAdminMessage(attachedDocument, reset
        ? "Стандартные цены сохранены глобально для всех игроков."
        : "Глобальные цены сохранены для всех игроков.");
    } catch (error) {
      setAdminMessage(attachedDocument, error?.message || "Не удалось сохранить глобальные цены.", true);
    } finally {
      setAdminButtonsDisabled(attachedDocument, false);
    }
  }

  function collectAdminProducts(gameDocument) {
    const products = {};
    for (const productId of Object.keys(DEFAULT_PRODUCTS)) {
      const card = gameDocument.querySelector(`[data-admin-price-card="${productId}"]`);
      if (!card) throw new Error(`Не найдена карточка цены ${productId}.`);
      products[productId] = {
        points: readAdminValue(card, "points"),
        treats: readAdminValue(card, "treats"),
        coffee: readAdminValue(card, "coffee")
      };
    }
    return products;
  }

  function readAdminValue(card, field) {
    const input = card.querySelector(`[data-admin-price-field="${field}"]`);
    const value = Number(input?.value || 0);
    if (!Number.isFinite(value) || value < 0 || value > 999999999) {
      throw new Error("Цена должна быть целым числом от 0 до 999 999 999.");
    }
    return Math.floor(value);
  }

  function applyProducts(gameDocument, products) {
    for (const [productId, price] of Object.entries(products)) {
      const buyButton = gameDocument.querySelector(`[data-buy="${productId}"]`);
      if (buyButton) {
        setDatasetValue(buyButton, "cost", price.points);
        if (productId === "zefir") {
          setDatasetValue(buyButton, "treatCost", price.treats);
          if ("coffeeCost" in buyButton.dataset) delete buyButton.dataset.coffeeCost;
        } else {
          setDatasetValue(buyButton, "coffeeCost", price.coffee);
          if ("treatCost" in buyButton.dataset) delete buyButton.dataset.treatCost;
        }
      }

      const card = gameDocument.querySelector(`[data-shop-card="${productId}"]`);
      const pills = card?.querySelectorAll(".shop-price .price-pill");
      if (pills?.[0]) setPillText(pills[0], `${formatNumber(price.points)} очков`);
      if (pills?.[1]) {
        const alternative = productId === "zefir"
          ? `${formatNumber(price.treats)} зефира`
          : `${formatNumber(price.coffee)} чашек кофе`;
        setPillText(pills[1], alternative);
      }
    }
    fillAdminInputs(gameDocument, products);
  }

  function setDatasetValue(element, key, value) {
    const next = String(value);
    if (element.dataset[key] !== next) element.dataset[key] = next;
  }

  function setPillText(pill, text) {
    const current = [...pill.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || "")
      .join("")
      .trim();
    if (current === text) return;
    const image = pill.querySelector("img");
    for (const node of [...pill.childNodes]) {
      if (node !== image) node.remove();
    }
    pill.append(pill.ownerDocument.createTextNode(text));
  }

  function fillAdminInputs(gameDocument, products) {
    for (const [productId, price] of Object.entries(products)) {
      const card = gameDocument.querySelector(`[data-admin-price-card="${productId}"]`);
      if (!card) continue;
      for (const field of ["points", "treats", "coffee"]) {
        const input = card.querySelector(`[data-admin-price-field="${field}"]`);
        const next = String(price[field] || 0);
        if (input && gameDocument.activeElement !== input && input.value !== next) input.value = next;
      }
    }
  }

  function setAdminButtonsDisabled(gameDocument, disabled) {
    for (const button of gameDocument.querySelectorAll("[data-admin-save-prices], [data-admin-reset-prices]")) {
      button.disabled = disabled;
    }
  }

  function setAdminMessage(gameDocument, message, isError = false) {
    const element = gameDocument.querySelector("[data-admin-message]");
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#a23636" : "";
  }

  function normalizeProducts(input, fallback) {
    const normalized = cloneProducts(fallback);
    if (!input || typeof input !== "object") return normalized;
    for (const productId of Object.keys(normalized)) {
      const price = input[productId];
      if (!price || typeof price !== "object") continue;
      normalized[productId] = {
        points: sanitizePrice(price.points, normalized[productId].points),
        treats: sanitizePrice(price.treats, normalized[productId].treats),
        coffee: sanitizePrice(price.coffee, normalized[productId].coffee)
      };
    }
    return normalized;
  }

  function sanitizePrice(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 999999999
      ? Math.floor(number)
      : fallback;
  }

  function cloneProducts(products) {
    return Object.fromEntries(Object.entries(products).map(([id, price]) => [id, { ...price }]));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
  }
})();
