/* Sweet Run static asset cache.
 * Dynamic /api data is deliberately never cached here.
 */
const CACHE_VERSION = "20260910-1";
const CORE_CACHE = `zefirok-core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `zefirok-assets-${CACHE_VERSION}`;
const CACHE_PREFIXES = ["zefirok-core-", "zefirok-assets-"];

const CORE_ASSETS = Object.freeze([
  "/index.html",
  "/battle-pass.html",
  "/rating.html",
  "/assets/optimized/v0.79.5/iconScore.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/iconRecord.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/iconCoffee.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/shopMarshmallowAssortment.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/shopMascot.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/pillowObstacle.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/vaseObstacle.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/coffeePickup.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/skinDefaultPortrait.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/skinDefaultAvatar.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/navGameButtonSelected.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/navGameButtonUnselected.webp?v=0.79.5",
  "/assets/optimized/v0.79.5/background_season2.webp?v=1.2.1",
  "/assets/ui/icon_game_button.webp",
  "/assets/ui/icon_profile_button.webp",
  "/assets/ui/icon_shop_buttom.webp",
  "/assets/ui/icone_cases.webp",
  "/assets/ui/icon_battlepass.webp",
  "/assets/ui/icon_reiting.webp",
  "/assets/ui/icon_pause_button.webp",
  "/assets/ui/icon_play_start_button.webp",
  "/assets/ui/icon_zanovo_button.webp",
  "/assets/skins/gameplay/default/stand.webp",
  "/assets/skins/gameplay/default/run1.webp",
  "/assets/skins/gameplay/default/run2.webp",
  "/assets/skins/gameplay/default/run3.webp",
  "/assets/skins/gameplay/default/run4.webp",
  "/assets/skins/gameplay/default/jump.webp"
]);

const NEVER_CACHE_PATHS = Object.freeze([
  "/api/",
  "/telegram/",
  "/media/"
]);
const NEVER_CACHE_PAGES = new Set([
  "/owner.html",
  "/legal.html",
  "/staff-qr.html",
  "/test-project.html",
  "/referrals.html",
  "/album.html"
]);
const SHELL_PATHS = new Set(["/", "/index.html", "/battle-pass.html", "/rating.html"]);
const STATIC_ASSET_RE = /\.(?:webp|png|jpe?g|gif|avif|svg|ico|woff2?|ttf|otf|css|js)$/i;

function sameOriginUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url : null;
  } catch {
    return null;
  }
}

function shouldNeverCache(url) {
  if (!url || url.origin !== self.location.origin) return true;
  if (NEVER_CACHE_PAGES.has(url.pathname)) return true;
  return NEVER_CACHE_PATHS.some(prefix => url.pathname.startsWith(prefix));
}

function isCacheableResponse(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const control = String(response.headers.get("Cache-Control") || "").toLowerCase();
  return !control.includes("no-store") && !control.includes("private");
}

async function putIfCacheable(cache, request, response) {
  if (!isCacheableResponse(response)) return response;
  try { await cache.put(request, response.clone()); } catch {}
  return response;
}

async function warmUrls(values) {
  const cache = await caches.open(CORE_CACHE);
  const urls = [...new Set((Array.isArray(values) ? values : []).map(value => sameOriginUrl(value)?.href || "").filter(Boolean))].slice(0, 80);
  await Promise.allSettled(urls.map(async href => {
    const url = new URL(href);
    if (shouldNeverCache(url)) return;
    const request = new Request(url.href, { method: "GET", credentials: "same-origin", cache: "reload" });
    const existing = await cache.match(request);
    if (existing) return;
    const response = await fetch(request);
    await putIfCacheable(cache, request, response);
  }));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    await warmUrls(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(name => {
      const managed = CACHE_PREFIXES.some(prefix => name.startsWith(prefix));
      return managed && name !== CORE_CACHE && name !== RUNTIME_CACHE ? caches.delete(name) : Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  const data = event.data && typeof event.data === "object" ? event.data : {};
  if (data.type !== "zefirok-warm-assets") return;
  event.waitUntil(warmUrls(data.urls));
});

async function networkFirstShell(request) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const response = await fetch(request);
    await putIfCacheable(cache, request, response);
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: false }) || await cache.match(new URL(request.url).pathname);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidateAsset(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  const networkPromise = fetch(request).then(response => putIfCacheable(cache, request, response));
  if (cached) {
    // Do not make the UI wait for revalidation.
    networkPromise.catch(() => {});
    return cached;
  }
  return networkPromise;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = sameOriginUrl(request.url);
  if (!url || shouldNeverCache(url)) return;

  if (SHELL_PATHS.has(url.pathname)) {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (url.pathname.startsWith("/assets/") && STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidateAsset(request));
  }
});
