from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, got {count}")
    return text.replace(old, new, 1)


# ---------------- Worker ----------------
worker_path = Path('src/worker.js')
worker = worker_path.read_text(encoding='utf-8')

featured_code = r'''
const DEFAULT_SHOP_FEATURED = Object.freeze({
  case: Object.freeze({ itemId: "case-alex", badgeText: "Рекомендуем · Особый · Алекс" }),
  skin: Object.freeze({ itemId: "alex", badgeText: "Рекомендуем · Легендарный" })
});
let shopFeaturedSchemaPromise = null;

function defaultShopFeatured() {
  return {
    case: { ...DEFAULT_SHOP_FEATURED.case },
    skin: { ...DEFAULT_SHOP_FEATURED.skin }
  };
}

async function ensureShopFeaturedSchema(env) {
  if (!shopFeaturedSchemaPromise) {
    const now = Math.floor(Date.now() / 1000);
    shopFeaturedSchemaPromise = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS shop_featured_slots (slot_key TEXT PRIMARY KEY, item_id TEXT NOT NULL DEFAULT '', badge_text TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL DEFAULT 0, updated_by TEXT NOT NULL DEFAULT '')`),
      env.DB.prepare(`INSERT OR IGNORE INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES('case',?,?,?,'runtime')`).bind(DEFAULT_SHOP_FEATURED.case.itemId, DEFAULT_SHOP_FEATURED.case.badgeText, now),
      env.DB.prepare(`INSERT OR IGNORE INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES('skin',?,?,?,'runtime')`).bind(DEFAULT_SHOP_FEATURED.skin.itemId, DEFAULT_SHOP_FEATURED.skin.badgeText, now)
    ]).catch((error) => { shopFeaturedSchemaPromise = null; throw error; });
  }
  await shopFeaturedSchemaPromise;
}

function normalizeShopFeaturedSlot(slotKey, row) {
  const fallback = DEFAULT_SHOP_FEATURED[slotKey] || { itemId: "", badgeText: "" };
  return {
    itemId: row ? String(row.item_id || "") : String(fallback.itemId || ""),
    badgeText: row ? String(row.badge_text || "") : String(fallback.badgeText || "")
  };
}

async function readShopFeatured(env) {
  await ensureShopFeaturedSchema(env);
  const result = await env.DB.prepare(`SELECT slot_key,item_id,badge_text FROM shop_featured_slots WHERE slot_key IN ('case','skin')`).all();
  const rows = new Map((result.results || []).map((row) => [String(row.slot_key || ""), row]));
  return {
    case: normalizeShopFeaturedSlot("case", rows.get("case")),
    skin: normalizeShopFeaturedSlot("skin", rows.get("skin"))
  };
}

function validateShopFeaturedItem(slotKey, itemId) {
  if (!itemId) return true;
  if (slotKey === "case") return String(itemId).startsWith("case-") && Object.prototype.hasOwnProperty.call(SHOP_ASSORTMENT_PRODUCTS, itemId);
  if (slotKey === "skin") return Object.prototype.hasOwnProperty.call(SKINS, itemId);
  return false;
}

async function ownerPanelSaveShopFeatured(env, ctx) {
  await ensureShopFeaturedSchema(env);
  const featured = ctx.body?.featured && typeof ctx.body.featured === "object" ? ctx.body.featured : {};
  const caseItemId = String(featured.case?.itemId || "").trim();
  const skinItemId = String(featured.skin?.itemId || "").trim();
  if (!validateShopFeaturedItem("case", caseItemId)) throw new ApiError(400, "Неизвестный кейс для блока «Лучшее».");
  if (!validateShopFeaturedItem("skin", skinItemId)) throw new ApiError(400, "Неизвестный скин для блока «Лучшее».");
  const caseBadgeText = String(featured.case?.badgeText || "").trim().slice(0, 80);
  const skinBadgeText = String(featured.skin?.badgeText || "").trim().slice(0, 80);
  const before = await readShopFeatured(env);
  const now = Math.floor(Date.now() / 1000), actor = String(ctx.user.id);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES('case',?,?,?,?) ON CONFLICT(slot_key) DO UPDATE SET item_id=excluded.item_id,badge_text=excluded.badge_text,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(caseItemId, caseBadgeText, now, actor),
    env.DB.prepare(`INSERT INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES('skin',?,?,?,?) ON CONFLICT(slot_key) DO UPDATE SET item_id=excluded.item_id,badge_text=excluded.badge_text,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(skinItemId, skinBadgeText, now, actor)
  ]);
  invalidateGamePublicConfigCache();
  const after = await readShopFeatured(env);
  await logStaffAction(env, ctx.user, ctx.access, "owner_panel_shop_featured_update", null, "shop_featured", null, null, { before, after });
  return { ok: true, featured: after };
}

'''
worker_anchor = 'async function ownerPanelShop(env, ctx) {'
if worker.count(worker_anchor) != 1:
    raise SystemExit(f'worker insert anchor count={worker.count(worker_anchor)}')
worker = worker.replace(worker_anchor, featured_code + worker_anchor, 1)

old_owner_shop = '''async function ownerPanelShop(env, ctx) {
  await ensureShopAssortmentSchema(env);await ensureSkinPriceSchema(env);await ensureShopStockSchema(env);const [assortment,skins,stockRows]=await Promise.all([readShopAssortment(env),readSkinPrices(env),readShopStockRows(env)]);
  const products=Object.keys(SHOP_ASSORTMENT_PRODUCTS).map(id=>{const value=assortment[id];const stock=shopStockAvailabilityFromRows(stockRows,"prize",id);return {kind:"product",id,title:botShopProductTitle(id),imageUrl:ownerPanelShopProductAsset(id),enabled:Boolean(value.enabled),points:Number(value.points||0),treats:Number(value.treats||0),coffee:Number(value.coffee||0),stock};});
  const skinItems=Object.keys(DEFAULT_SKIN_PRICES).map(id=>{const value=skins[id];const stock=shopStockAvailabilityFromRows(stockRows,"skins",id);return {kind:"skin",id,title:SKINS[id]?.title||id,imageUrl:ownerPanelSkinAsset(id),enabled:true,points:Number(value.points||0),treats:Number(value.treats||0),coffee:Number(value.coffee||0),stock};});
  return {ok:true,products,skins:skinItems};
}'''
new_owner_shop = '''async function ownerPanelShop(env, ctx) {
  await ensureShopAssortmentSchema(env);await ensureSkinPriceSchema(env);await ensureShopStockSchema(env);await ensureShopFeaturedSchema(env);const [assortment,skins,stockRows,featured]=await Promise.all([readShopAssortment(env),readSkinPrices(env),readShopStockRows(env),readShopFeatured(env)]);
  const products=Object.keys(SHOP_ASSORTMENT_PRODUCTS).map(id=>{const value=assortment[id];const stock=shopStockAvailabilityFromRows(stockRows,"prize",id);return {kind:"product",id,title:botShopProductTitle(id),imageUrl:ownerPanelShopProductAsset(id),enabled:Boolean(value.enabled),points:Number(value.points||0),treats:Number(value.treats||0),coffee:Number(value.coffee||0),stock};});
  const skinItems=Object.keys(DEFAULT_SKIN_PRICES).map(id=>{const value=skins[id];const stock=shopStockAvailabilityFromRows(stockRows,"skins",id);return {kind:"skin",id,title:SKINS[id]?.title||id,imageUrl:ownerPanelSkinAsset(id),enabled:true,points:Number(value.points||0),treats:Number(value.treats||0),coffee:Number(value.coffee||0),stock};});
  return {ok:true,products,skins:skinItems,featured};
}'''
worker = replace_once(worker, old_owner_shop, new_owner_shop, 'ownerPanelShop')

old_get_shop = '''async function getShopConfig(env) {
  try {
    const config = await readGamePublicConfig(env);
    return jsonResponse({ ok: true, ...config.shop });
  } catch (error) {
    console.error("getShopConfig failed", error);
    return jsonResponse({ ok: true, ...fallbackGamePublicConfig().shop });
  }
}'''
new_get_shop = '''async function getShopConfig(env) {
  try {
    const [config, featured] = await Promise.all([readGamePublicConfig(env), readShopFeatured(env)]);
    return jsonResponse({ ok: true, ...config.shop, featured });
  } catch (error) {
    console.error("getShopConfig failed", error);
    return jsonResponse({ ok: true, ...fallbackGamePublicConfig().shop, featured: defaultShopFeatured() });
  }
}'''
worker = replace_once(worker, old_get_shop, new_get_shop, 'getShopConfig')

route_old = 'if (path === "/api/owner/shop/save") return jsonResponse(await ownerPanelSaveShopItem(env, ctx));'
route_new = route_old + '\n    if (path === "/api/owner/shop/featured/save") return jsonResponse(await ownerPanelSaveShopFeatured(env, ctx));'
worker = replace_once(worker, route_old, route_new, 'owner featured route')
worker_path.write_text(worker, encoding='utf-8')


# ---------------- Game frontend (nested encoded HTML/JS) ----------------
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

globals_old = '''      let remoteShopPrices = {};
      let remoteShopAssortment = {};
      let remoteLiveContentShop = [];
'''
globals_new = '''      let remoteShopPrices = {};
      let remoteShopAssortment = {};
      let remoteLiveContentShop = [];
      let remoteShopFeatured = {
        case: { itemId: &quot;case-alex&quot;, badgeText: &quot;Рекомендуем · Особый · Алекс&quot; },
        skin: { itemId: &quot;alex&quot;, badgeText: &quot;Рекомендуем · Легендарный&quot; }
      };
'''
index = replace_once(index, globals_old, globals_new, 'index featured globals')

config_old = '''        remoteLiveContentShop = Array.isArray(data.liveContent) ? data.liveContent : [];
        applyRemoteShopPrices();
        applyShopAssortment();
        renderLiveContentShop();'''
config_new = '''        remoteLiveContentShop = Array.isArray(data.liveContent) ? data.liveContent : [];
        const featured = data.featured &amp;&amp; typeof data.featured === &quot;object&quot; ? data.featured : {};
        remoteShopFeatured = {
          case: {
            itemId: String(featured.case?.itemId ?? &quot;case-alex&quot;),
            badgeText: String(featured.case?.badgeText ?? &quot;Рекомендуем · Особый · Алекс&quot;)
          },
          skin: {
            itemId: String(featured.skin?.itemId ?? &quot;alex&quot;),
            badgeText: String(featured.skin?.badgeText ?? &quot;Рекомендуем · Легендарный&quot;)
          }
        };
        rewardsV2RenderSignature = &quot;&quot;;
        skinsRenderSignature = &quot;&quot;;
        applyRemoteShopPrices();
        applyShopAssortment();
        renderLiveContentShop();'''
index = replace_once(index, config_old, config_new, 'applyRemoteShopConfig')

preferred_old = '        const preferred = [&quot;case-alex&quot;,&quot;case-legendary&quot;,&quot;case-mythic&quot;,&quot;case-gold&quot;].find((id) =&gt; shopProducts[id]?.enabled !== false &amp;&amp; shopProducts[id]);'
preferred_new = '        const configuredFeaturedCaseId = String(remoteShopFeatured?.case?.itemId ?? &quot;case-alex&quot;);\n        const preferred = configuredFeaturedCaseId &amp;&amp; shopProducts[configuredFeaturedCaseId]?.enabled !== false &amp;&amp; shopProducts[configuredFeaturedCaseId]?.caseType ? configuredFeaturedCaseId : &quot;&quot;;'
index = replace_once(index, preferred_old, preferred_new, 'featured case selection')

case_badge_old = '        rewardsV2FeaturedEl.innerHTML = `&lt;div class=&quot;rewards-v2-featured-art&quot;&gt;&lt;img src=&quot;${escapePurchaseText(image)}&quot; alt=&quot;${escapePurchaseText(product.title)}&quot;&gt;&lt;/div&gt;&lt;div class=&quot;rewards-v2-featured-copy&quot;&gt;&lt;span class=&quot;rewards-v2-featured-badge&quot;&gt;Рекомендуем · ${escapePurchaseText(meta.label)}&lt;/span&gt;&lt;h3&gt;${escapePurchaseText(product.title)}&lt;/h3&gt;'
case_badge_new = '        const featuredBadgeText = String(remoteShopFeatured?.case?.badgeText || &quot;&quot;).trim();\n        const featuredBadgeMarkup = featuredBadgeText ? `&lt;span class=&quot;rewards-v2-featured-badge&quot;&gt;${escapePurchaseText(featuredBadgeText)}&lt;/span&gt;` : &quot;&quot;;\n        rewardsV2FeaturedEl.innerHTML = `&lt;div class=&quot;rewards-v2-featured-art&quot;&gt;&lt;img src=&quot;${escapePurchaseText(image)}&quot; alt=&quot;${escapePurchaseText(product.title)}&quot;&gt;&lt;/div&gt;&lt;div class=&quot;rewards-v2-featured-copy&quot;&gt;${featuredBadgeMarkup}&lt;h3&gt;${escapePurchaseText(product.title)}&lt;/h3&gt;'
index = replace_once(index, case_badge_old, case_badge_new, 'featured case badge')

copy_old = '          : (owned &gt; 0 ? `У тебя уже есть: ${formatter.format(owned)}. Можно открыть со склада или купить ещё.` : &quot;Самый премиальный постоянный кейс магазина. После покупки сразу попадёт на склад.&quot;);'
copy_new = '          : (owned &gt; 0 ? `У тебя уже есть: ${formatter.format(owned)}. Можно открыть со склада или купить ещё.` : &quot;Выбранный кейс из рекомендаций магазина. После покупки сразу попадёт на склад.&quot;);'
index = replace_once(index, copy_old, copy_new, 'featured generic case copy')

skin_select_old = '        const skin = SKIN_CATALOG.alex;\n        if (!skin || skin.enabled === false) return &quot;&quot;;'
skin_select_new = '        const featuredSkinId = String(remoteShopFeatured?.skin?.itemId ?? &quot;alex&quot;);\n        if (!featuredSkinId) return &quot;&quot;;\n        const skin = SKIN_CATALOG[featuredSkinId];\n        if (!skin || skin.enabled === false) return &quot;&quot;;'
index = replace_once(index, skin_select_old, skin_select_new, 'featured skin selection')

skin_badge_old = '        return `&lt;div class=&quot;skins-v2-featured-art&quot; style=&quot;--featured-bg:url(\'${skin.background || &quot;&quot;}\')&quot;&gt;&lt;img src=&quot;${skin.image}&quot; alt=&quot;Скин ${skin.title}&quot; loading=&quot;eager&quot;&gt;&lt;/div&gt;&lt;div class=&quot;skins-v2-featured-copy&quot;&gt;&lt;span class=&quot;skins-v2-featured-kicker&quot;&gt;Рекомендуем · ${escapePurchaseText(rarity.label)}&lt;/span&gt;&lt;h3&gt;'
skin_badge_new = '        const featuredKickerText = String(remoteShopFeatured?.skin?.badgeText || &quot;&quot;).trim();\n        const featuredKicker = featuredKickerText ? `&lt;span class=&quot;skins-v2-featured-kicker&quot;&gt;${escapePurchaseText(featuredKickerText)}&lt;/span&gt;` : &quot;&quot;;\n        return `&lt;div class=&quot;skins-v2-featured-art&quot; style=&quot;--featured-bg:url(\'${skin.background || &quot;&quot;}\')&quot;&gt;&lt;img src=&quot;${skin.image}&quot; alt=&quot;Скин ${skin.title}&quot; loading=&quot;eager&quot;&gt;&lt;/div&gt;&lt;div class=&quot;skins-v2-featured-copy&quot;&gt;${featuredKicker}&lt;h3&gt;'
index = replace_once(index, skin_badge_old, skin_badge_new, 'featured skin badge')
index_path.write_text(index, encoding='utf-8')


# ---------------- Owner Control Center ----------------
owner_path = Path('owner.html')
owner = owner_path.read_text(encoding='utf-8')

shop_section_old = '''<section class="view" id="view-shop"><div class="stack">
  <div class="card"><div class="section-head"><div><h2>Магазин</h2><p>Цены, видимость товаров и остатки без команд в боте</p></div><button class="btn small" id="shopReload">Обновить</button></div><div class="subnav" id="shopSubnav"><button data-shop-view="products" class="active">Награды и кейсы</button><button data-shop-view="skins">Скины</button></div><div class="shop-grid" id="shopGrid"></div></div>
</div></section>'''
shop_section_new = '''<section class="view" id="view-shop"><div class="stack">
  <div class="card"><div class="section-head"><div><h2>Лучшее в магазине</h2><p>Два независимых слота витрины: кейс и скин. Выбери «Ничего», чтобы полностью скрыть соответствующую рекомендацию.</p></div></div><div class="form-grid two"><div class="field"><label>Рекомендуемый кейс</label><select id="shopFeaturedCase"></select></div><div class="field"><label>Подпись кейса</label><input id="shopFeaturedCaseBadge" list="shopFeaturedBadgePresets" maxlength="80" placeholder="Например: НОВОЕ · ЛУЧШЕЕ"></div><div class="field"><label>Рекомендуемый скин</label><select id="shopFeaturedSkin"></select></div><div class="field"><label>Подпись скина</label><input id="shopFeaturedSkinBadge" list="shopFeaturedBadgePresets" maxlength="80" placeholder="Например: ОСОБЫЙ"></div></div><datalist id="shopFeaturedBadgePresets"><option value="Рекомендуем"><option value="Лучшее"><option value="Новое"><option value="Особый"><option value="Рекомендуем · Особый"><option value="Рекомендуем · Легендарный"></datalist><div class="info gold" style="margin-top:10px">Пустой выбор скрывает весь блок. Подпись свободная: можно написать «Новое», «Лучшее», «Особый» или свой текст.</div><div class="actions" style="margin-top:10px"><button class="btn gold" id="shopFeaturedSave">Сохранить витрину</button></div></div>
  <div class="card"><div class="section-head"><div><h2>Магазин</h2><p>Цены, видимость товаров и остатки без команд в боте</p></div><button class="btn small" id="shopReload">Обновить</button></div><div class="subnav" id="shopSubnav"><button data-shop-view="products" class="active">Награды и кейсы</button><button data-shop-view="skins">Скины</button></div><div class="shop-grid" id="shopGrid"></div></div>
</div></section>'''
owner = replace_once(owner, shop_section_old, shop_section_new, 'owner shop section')

load_shop_old = "async function loadShop(){const d=await api('/api/owner/shop');state.shop=d;renderShop();}"
load_shop_new = "async function loadShop(){const d=await api('/api/owner/shop');state.shop=d;renderShopFeatured();renderShop();}"
owner = replace_once(owner, load_shop_old, load_shop_new, 'owner loadShop')

shop_js_anchor = "$('shopSubnav').addEventListener('click',e=>{const b=e.target.closest('[data-shop-view]');if(!b)return;state.shopView=b.dataset.shopView;document.querySelectorAll('#shopSubnav button').forEach(x=>x.classList.toggle('active',x===b));renderShop();});$('shopReload').onclick=()=>loadShop().catch(e=>toast(e.message,true));"
shop_js_insert = r'''function renderShopFeatured(){
  const featured=state.shop?.featured||{},caseFeatured=featured.case||{},skinFeatured=featured.skin||{};
  const caseItems=(state.shop?.products||[]).filter(item=>String(item.id||'').startsWith('case-'));
  const skinItems=state.shop?.skins||[];
  $('shopFeaturedCase').innerHTML=`<option value="">— Ничего —</option>`+caseItems.map(item=>`<option value="${esc(item.id)}" ${String(caseFeatured.itemId||'')===String(item.id)?'selected':''}>${esc(item.title)}${item.enabled?'':' · скрыт'}</option>`).join('');
  $('shopFeaturedSkin').innerHTML=`<option value="">— Ничего —</option>`+skinItems.map(item=>`<option value="${esc(item.id)}" ${String(skinFeatured.itemId||'')===String(item.id)?'selected':''}>${esc(item.title)}</option>`).join('');
  $('shopFeaturedCaseBadge').value=String(caseFeatured.badgeText||'');
  $('shopFeaturedSkinBadge').value=String(skinFeatured.badgeText||'');
}
$('shopFeaturedSave').onclick=async()=>{const btn=$('shopFeaturedSave');setBusy(btn,true);try{const result=await api('/api/owner/shop/featured/save',{featured:{case:{itemId:$('shopFeaturedCase').value,badgeText:$('shopFeaturedCaseBadge').value},skin:{itemId:$('shopFeaturedSkin').value,badgeText:$('shopFeaturedSkinBadge').value}}});toast('Витрина магазина сохранена');if(result?.featured)state.shop.featured=result.featured;renderShopFeatured();}catch(e){toast(e.message,true);}finally{setBusy(btn,false);}};
'''
owner = replace_once(owner, shop_js_anchor, shop_js_insert + shop_js_anchor, 'owner featured JS')
owner_path.write_text(owner, encoding='utf-8')


# ---------------- Migration ----------------
Path('migrations/0068_shop_featured.sql').write_text("""CREATE TABLE IF NOT EXISTS shop_featured_slots (\n  slot_key TEXT PRIMARY KEY CHECK(slot_key IN ('case','skin')),\n  item_id TEXT NOT NULL DEFAULT '',\n  badge_text TEXT NOT NULL DEFAULT '',\n  updated_at INTEGER NOT NULL DEFAULT 0,\n  updated_by TEXT NOT NULL DEFAULT ''\n);\n\nINSERT OR IGNORE INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES\n  ('case','case-alex','Рекомендуем · Особый · Алекс',unixepoch(),'migration'),\n  ('skin','alex','Рекомендуем · Легендарный',unixepoch(),'migration');\n""", encoding='utf-8')

for temp in [
    '.github/workflows/apply-storefront-featured.yml',
    '.github/patch_storefront_featured.py',
    '.github/patch_storefront_featured_v2.py',
    '.github/fix_patch_storefront.py'
]:
    Path(temp).unlink(missing_ok=True)
