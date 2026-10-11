#!/usr/bin/env python3
"""Safe, atomic source-level rebalancer for the existing Zeffi World repo.

Only touch matched snippets. Do not replace complete production modules with a
previous standalone version. --check checks applicability without writing.
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

# points, coffee, treats. Everyday buildings use points; premium art uses treats.
PRICES = {
    'bus-terminal': (27000, 0, 50),
    'bus-stop': (7500, 0, 0),
    'pond-park': (17500, 0, 30),
    'rose-garden': (16000, 0, 25),
    'botanical-garden': (32000, 0, 75),
    'sports-playground': (10800, 0, 0),
    'city-square': (12000, 0, 12),
    'cottage': (5500, 0, 0),
    'family-home': (10000, 0, 0),
    'villa': (17500, 0, 35),
    'coffee-kiosk': (5900, 0, 0),
    'coffee-house': (15000, 0, 25),
    'bakery': (10700, 0, 0),
    'flower-shop': (7400, 0, 0),
    'garden': (17800, 0, 30),
    'playground': (10800, 0, 0),
    'tree': (600, 0, 0),
    'flowerbed': (350, 0, 0),
    'lamp': (750, 0, 0),
    'bench': (850, 0, 0),
    'fountain': (7800, 0, 12),
    'monument': (18500, 0, 45),
    'plaza-city-square': (12500, 0, 12),
    'plaza-cozy-tiled': (6800, 0, 0),
    'plaza-flower-edge': (8500, 0, 0),
    'plaza-monument-base': (14800, 0, 25),
    'plaza-rest-zone': (8200, 0, 0),
    'plaza-playground-base': (9800, 0, 0),
    'plaza-bordered-shrubs': (9900, 0, 0),
    'plaza-prestige-podium': (16500, 0, 30),
    'extra-flowerbed': (650, 0, 0),
    'extra-bush': (420, 0, 0),
    'extra-tree': (700, 0, 0),
    'extra-lamp': (850, 0, 0),
    'extra-bench': (950, 0, 0),
    'extra-planter': (540, 0, 0),
    'extra-arch': (1650, 0, 0),
    'extra-fountain': (8200, 0, 15),
    'extra-sign': (500, 0, 0),
    'extra-sweet_object': (3800, 0, 0),
    'terrain_platform_plain_premium': (1200, 0, 0),
    'terrain_border_floral_premium': (1050, 0, 0),
    'terrain_edge_straight_a_premium': (900, 0, 0),
    'terrain_edge_straight_b_premium': (900, 0, 0),
    'terrain_corner_outer_premium': (950, 0, 0),
    'terrain_corner_inner_premium': (950, 0, 0),
    'terrain_stair_entry_premium': (1600, 0, 0),
    'terrain_podium_plaza_premium': (7500, 0, 10),
}
# Entries not listed start at level 1. Basic housing, a shop and a park must
# always be level-1 accessible, otherwise the city would soft-lock at level 1.
UNLOCK_LEVEL = {
    'bus-terminal': 4,
    'bus-stop': 2,
    'pond-park': 3,
    'rose-garden': 3,
    'botanical-garden': 5,
    'sports-playground': 2,
    'city-square': 2,
    'family-home': 2,
    'villa': 3,
    'coffee-house': 3,
    'bakery': 2,
    'garden': 3,
    'fountain': 2,
    'monument': 4,
    'plaza-city-square': 3,
    'plaza-flower-edge': 2,
    'plaza-monument-base': 4,
    'plaza-rest-zone': 2,
    'plaza-playground-base': 2,
    'plaza-bordered-shrubs': 2,
    'plaza-prestige-podium': 4,
    'extra-fountain': 3,
    'extra-sweet_object': 2,
    'terrain_podium_plaza_premium': 4,
}


def one(source: str, old: str, new: str, context: str) -> str:
    found = source.count(old)
    if found != 1:
        raise ValueError(f'{context}: expected exactly one anchor, found {found}: {old[:100]!r}')
    return source.replace(old, new, 1)


def transform_economy(source: str) -> str:
    patt = re.compile(
        r"(?m)^(\s*'(?P<id>[^']+)':\s*Object\.freeze\(\{\s*points:\s*)\d+"
        r"(,\s*coffee:\s*)\d+(,\s*treats:\s*)\d+(\s*\}\),?)$"
    )
    found = []
    def update(m: re.Match) -> str:
        kind = m.group('id')
        if kind not in PRICES:
            raise ValueError(f'Unrecognized price entry in main: {kind}')
        found.append(kind)
        points, coffee, treats = PRICES[kind]
        return f'{m.group(1)}{points}{m.group(3)}{coffee}{m.group(4)}{treats}{m.group(5)}'
    transformed = patt.sub(update, source)
    if set(found) != set(PRICES) or len(found) != len(PRICES):
        raise ValueError(f'Prices do not match expected 48-item catalog: missing={set(PRICES)-set(found)}, new={set(found)-set(PRICES)}')
    return transformed


def transform_catalog(source: str) -> str:
    assignments = '\n'.join(f"  '{key}': {value}," for key,value in UNLOCK_LEVEL.items())
    insert = ("// The one canonical unlock table used by the Worker and both city UIs.\n"
              "// Previously owned buildings can still be moved/restored.\n"
              "export const SHOP_UNLOCK_LEVELS = Object.freeze({\n" + assignments + '\n});\n')
    source = one(source, 'export const CATALOG_ITEMS = Object.freeze(VISIBLE_ITEMS.map(item => {',
                 insert + 'export const CATALOG_ITEMS = Object.freeze(VISIBLE_ITEMS.map(item => {', 'catalog unlock table')
    source = one(source, 'return Object.freeze({ ...item, price: OBJECT_PRICES[item.id] });',
                 'return Object.freeze({ ...item, minCityLevel: SHOP_UNLOCK_LEVELS[item.id] || 1, price: OBJECT_PRICES[item.id] });', 'catalog entries')
    return source


def transform_engine(source: str) -> str:
    # This guard is inside the shared engine. The Worker calls addObject using
    # the very same CATALOG, so a malicious client cannot bypass it.
    source = one(source,
                 '  const price = objectPrice(catalog, kind);\n  checkedPlacement(city, catalog, kind, x, y, rotation);',
                 "  const price = objectPrice(catalog, kind);\n"
                 "  const requiredLevel = Number(catalog[kind]?.minCityLevel || 1);\n"
                 "  // Use the highest achieved city level. A completed building may have\n"
                 "  // raised the level while the game was closed; moving/storing old\n"
                 "  // purchases is never subject to this purchase-only check.\n"
                 "  if(cityStats(city, catalog, now).cityLevel < requiredLevel)\n"
                 "    throw new BuildError('BUILDING_LEVEL_LOCKED');\n"
                 '  checkedPlacement(city, catalog, kind, x, y, rotation);', 'shared purchase guard')
    # Benefits are derived from the same authoritative tables; never make a
    # second hand-maintained set of UI-only bonus numbers.
    source = one(source,'const RESIDENTS_BY_KIND = Object.freeze({','export const RESIDENTS_BY_KIND = Object.freeze({','residents export')
    source = one(source,'const COMFORT_BY_KIND = Object.freeze({','export const COMFORT_BY_KIND = Object.freeze({','comfort export')
    # The city simulation and the catalog preview share the same bonus table.
    park_map = """export const PARK_RESIDENTS_BY_KIND = Object.freeze({
  'garden':2,'playground':1,'pond-park':2,'rose-garden':2,
  'botanical-garden':3,'sports-playground':1
});
export function buildingEffectPreview(def){
  if(!def)return {population:0,comfort:0,needsRoad:false};
  const park=def.category==='parks'||def.id==='sports-playground';
  return Object.freeze({
    population: park ? (PARK_RESIDENTS_BY_KIND[def.id]||0) : (RESIDENTS_BY_KIND[def.id]||0),
    comfort: COMFORT_BY_KIND[def.id]||(def.category==='plazas'?6:0),
    needsRoad:Boolean(def.needsRoad),
    limitedPopulation:park
  });
}
"""
    source = one(source,'export function comfortTierFor(score){',park_map+'export function comfortTierFor(score){','preview benefits')
    source = one(source,
                 """      if(count<=2)population+=({
        'garden':2,'playground':1,'pond-park':2,'rose-garden':2,
        'botanical-garden':3,'sports-playground':1
      })[item.kind]||0;""",
                 "      if(count<=2)population+=PARK_RESIDENTS_BY_KIND[item.kind]||0;",
                 'park residency single source')
    return source

# Catalog card order is stable while the sheet is open. Refresh when a new
# city level is earned, or when changing a category. It does not jump on each
# tick of a wallet update.
SHOP_FUNCTIONS = '''const SHOP_CATEGORY_PRIORITY = Object.freeze({homes:0,shops:1,parks:2,transport:3,plazas:4,decor:5,landscape:6});
function shopRequiredLevel(def){return Number(def.minCityLevel||1);}
function shopCurrentLevel(){return cityStats(state.city,CATALOG).cityLevel;}
function shopShortfall(price){
 const missing=[];
 for(const [key,label] of [['points','очков'],['treats','зефира'],['coffee','кофе']]){
  const n=Math.max(0,Number(price[key]||0)-Number(state.city.wallet[key]||0));
  if(n)missing.push(`${n.toLocaleString('ru-RU')} ${label}`);
 }
 return missing.length?`Не хватает ${missing.join(' и ')}`:'';
}
function shopSortedItems(){
 const level=shopCurrentLevel();
 const shown=CATALOG_ITEMS.filter(def=>state.category==='all'||def.category===state.category);
 return shown.sort((a,b)=>{
  const lockedA=shopRequiredLevel(a)>level,lockedB=shopRequiredLevel(b)>level;
  if(lockedA!==lockedB)return Number(lockedA)-Number(lockedB);
  if(lockedA&&lockedB){const diff=shopRequiredLevel(a)-shopRequiredLevel(b);if(diff)return diff;}
  const cat=(SHOP_CATEGORY_PRIORITY[a.category]??99)-(SHOP_CATEGORY_PRIORITY[b.category]??99);
  if(cat)return cat;
  return a.price.points-b.price.points||a.id.localeCompare(b.id);
 });
}
function shopLockedNotice(def){
 const need=shopRequiredLevel(def),actual=shopCurrentLevel();
 return `Постройка откроется на уровне города ${need}. Сейчас у тебя уровень ${actual}. Посмотри условия в «Город в цифрах».`;
}
'''

RENDER_CATALOG = '''function renderCatalog(){
 const el=$('catalogList');el.replaceChildren();
 for(const def of shopSortedItems()){
  const locked=shopRequiredLevel(def)>shopCurrentLevel();
  const price=objectPrice(CATALOG,def.id);
  const button=document.createElement('button');button.type='button';button.className='catalog-card';button.dataset.kind=def.id;
  button.classList.toggle('is-level-locked',locked);
  button.setAttribute('aria-label',`${nameOf(def.id)}. ${locked?`Откроется на уровне ${shopRequiredLevel(def)}`:'Открыто'}; ${priceLabel(price)}`);
  const fig=document.createElement('div');fig.className='catalog-figure';
  const thumb=document.createElement('canvas');thumb.className='building-thumbnail';thumb.setAttribute('aria-hidden','true');fig.append(thumb);drawCatalogThumbnail(thumb,def);
  if(locked){
   const levelTag=document.createElement('span');levelTag.className='catalog-level-lock';
   levelTag.textContent=`🔒 Ур. ${shopRequiredLevel(def)}`;fig.append(levelTag);
  }
  const copy=document.createElement('div');copy.className='catalog-copy';
  const title=document.createElement('strong');title.textContent=nameOf(def.id);
  const size=document.createElement('small');size.textContent=`${def.w} × ${def.h} | ${Number(def.buildMs||0)>0?formatRemaining(def.buildMs):tr('instant')}`;
  const benefits=buildingEffectPreview(def);const bonus=document.createElement('small');bonus.className='catalog-benefits';
  const hints=[];
  if(benefits.population)hints.push(`+${benefits.population} жителей${benefits.limitedPopulation?'*':''}`);
  if(benefits.comfort)hints.push(`+${benefits.comfort} уюта`);
  if(benefits.needsRoad)hints.push('Нужна дорога');
  bonus.textContent=hints.join(' · ');bonus.title=benefits.limitedPopulation?'Жители от первых двух таких парков':'Игровая польза объекта после завершения строительства';
  const cost=document.createElement('em');cost.className='catalog-price';addCatalogPrice(cost,price);
  const status=document.createElement('small');status.className='catalog-availability';status.setAttribute('aria-live','off');
  if(locked)status.textContent=`Доступно с уровня ${shopRequiredLevel(def)}`;
  copy.append(title,size);
  if(hints.length)copy.append(bonus);
  copy.append(cost,status);button.append(fig,copy);
  button.addEventListener('click',()=>{
   if(shopRequiredLevel(def)>shopCurrentLevel()){showToast(shopLockedNotice(def),true);return;}
   const short=shopShortfall(price);
   if(short){showToast(short,true);return;}
   startPlacement(def.id);
  });el.append(button);
 }
 renderCatalogSelection();
}
'''
RENDER_SELECTION = '''function renderCatalogSelection(){
 const selected=state.draft?.kind,level=shopCurrentLevel();
 $('catalogList').querySelectorAll('.catalog-card').forEach(btn=>{
  const def=CATALOG[btn.dataset.kind];if(!def)return;
  const locked=shopRequiredLevel(def)>level;
  const short=shopShortfall(def.price);
  btn.classList.toggle('is-active',Boolean(selected)&&selected===btn.dataset.kind);
  btn.classList.toggle('is-level-locked',locked);
  btn.classList.toggle('cannot-afford',!locked&&Boolean(short));
  const status=btn.querySelector('.catalog-availability');
  if(status)status.textContent=locked?`Доступно с уровня ${shopRequiredLevel(def)}`:(short||'Можно построить');
 });
}
'''


def transform_app(source: str) -> str:
    source = one(source, 'isObjectConnected, connectedRoads, isConstructing, constructionRemaining,',
                 'isObjectConnected, connectedRoads, buildingEffectPreview, isConstructing, constructionRemaining,', 'app engine imports') if 'import {' in source else source
    source = one(source,
                 " CITY_LEVEL_LOCKED:'cityLevelLocked', CITY_LEVEL_CLAIMED:'cityLevelClaimed'",
                 " CITY_LEVEL_LOCKED:'cityLevelLocked', CITY_LEVEL_CLAIMED:'cityLevelClaimed', BUILDING_LEVEL_LOCKED:'shopLevelRequired'", 'app errors')
    source = one(source,"function startPlacement(kind){\n if(!CATALOG[kind])return;",
                 "function startPlacement(kind){\n if(!CATALOG[kind])return;\n"
                 " if(shopCurrentLevel()<shopRequiredLevel(CATALOG[kind])){showToast(shopLockedNotice(CATALOG[kind]),true);return;}\n"
                 " const short=shopShortfall(objectPrice(CATALOG,kind));\n"
                 " if(short){showToast(short,true);return;}", 'client placement entry')
    patt = re.compile(r'function renderCatalog\(\)\{[\s\S]*?\n\}\nfunction renderCatalogSelection\(\)\{[\s\S]*?\n\}\n(?=function renderWarehouse\(\)\{)')
    match = patt.search(source)
    if not match or len(patt.findall(source)) != 1:
        raise ValueError('app: expected the single original renderCatalog + renderCatalogSelection')
    source = source[:match.start()] + SHOP_FUNCTIONS + RENDER_CATALOG + RENDER_SELECTION + source[match.end():]
    # Refresh on city-level advancement, rather than rebuilding every card
    # on each wallet status update (cards must not jump under the finger).
    source = one(source,'function updateUI(){\n const stats=cityStats(state.city,CATALOG);',
                 'function updateUI(){\n const stats=cityStats(state.city,CATALOG);\n'
                 ' if(state.shopRenderedLevel!==stats.cityLevel){state.shopRenderedLevel=stats.cityLevel;renderCatalog();}',
                 'catalog re-render on level')
    return source


def transform_ru(source: str) -> str:
    return one(source,"  cityLevelClaimed:'Награда за этот уровень уже получена.',",
               "  cityLevelClaimed:'Награда за этот уровень уже получена.',\n"
               "  shopLevelRequired:'Повышай уровень города, чтобы открыть эту постройку.',",
               'RU locked level translation')

STYLE = '''
/* v17: Shop progression; compact enough for the Telegram bottom sheet. */
.catalog-card.is-level-locked{border-color:#dfcbd3;background:linear-gradient(160deg,#fdf8f9,#f3eaed)}
.catalog-card.is-level-locked .building-thumbnail{opacity:.57;filter:grayscale(.44) saturate(.75)}
.catalog-card.is-level-locked .catalog-figure::after{opacity:.35}
.catalog-level-lock{position:absolute;z-index:3;top:6px;right:6px;padding:5px 7px;border-radius:9px;background:#fff9faed;color:#955778;box-shadow:0 1px 6px #8c486229;border:1px solid #eac4d4;font-size:10px;font-weight:900;white-space:nowrap}
.catalog-card .catalog-benefits{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:850;font-size:9px;color:#a56384}
.catalog-card .catalog-availability{display:block;white-space:normal;font-weight:850;font-size:9px;line-height:1.2;color:#4f976e;min-height:11px}
.catalog-card.is-level-locked .catalog-availability{color:#a56083}
.catalog-card.cannot-afford .catalog-availability{color:#a67a43}
.catalog-card.cannot-afford{opacity:1}
@media(max-width:700px){
 .catalog-card .catalog-benefits{font-size:9px}
 .catalog-card .catalog-availability{font-size:9px}
 .catalog-level-lock{font-size:9px;padding:4px 5px}
}
'''


def transform_css(source: str) -> str:
    if '/* v17: Shop progression;' in source:
        raise ValueError('CSS already has v17; apply only once')
    return source.rstrip()+'\n'+STYLE+'\n'

TRANSFORMS = {
    'world/economy.js': transform_economy,
    'world/catalog.js': transform_catalog,
    'world/engine.js': transform_engine,
    'world/app.js': transform_app,
    'world/ru.js': transform_ru,
    'world/premium-ui.css': transform_css,
}


# Test fixtures for pre-existing invariants. These tests intentionally exercise
# construction and movement on fully unlocked sandbox towns; new v17 tests
# independently assert that real level-1 users CANNOT purchase prestige.

def replace_test(source, old, new, context):
    return one(source,old,new,context)

def test_engine(source):
    return replace_test(source,"const fresh=()=>makeInitialCity();",
          "const fresh=()=>{const city=makeInitialCity();city.progress.bestLevel=5;return city;};",
          'engine fixtures')

def test_construction(source):
    return replace_test(source,"const fresh=()=>makeInitialCity();",
          "const fresh=()=>{const city=makeInitialCity();city.progress.bestLevel=5;return city;};",
          'construction fixtures')

def test_citizens(source):
    return replace_test(source,"const initial=()=>makeInitialCity();",
          "const initial=()=>{const city=makeInitialCity();city.progress.bestLevel=5;return city;};",
          'citizen fixtures')

def test_expansion(source):
    return replace_test(source,"const seed = () => makeInitialCity();",
          "const seed = () => {const city=makeInitialCity();city.progress.bestLevel=5;return city;};",
          'expansion fixtures')

def test_extra(source):
    return replace_test(source,
      "test('3D raised plazas no longer let houses, decor or roads float on their pillars',()=>{\n let city=makeInitialCity();",
      "test('3D raised plazas no longer let houses, decor or roads float on their pillars',()=>{\n let city=makeInitialCity();city.progress.bestLevel=5;",
      'extra pack prestige test')

def test_raised(source):
    source=replace_test(source,"function oldOverlappingCity({raisedFirst=true,includeRoad=false}={}){\n // v13 let a 2x2 building occupy part of a raised 3x3 plaza in either order.\n let city=makeInitialCity();",
      "function oldOverlappingCity({raisedFirst=true,includeRoad=false}={}){\n // v13 let a 2x2 building occupy part of a raised 3x3 plaza in either order.\n let city=makeInitialCity();city.progress.bestLevel=5;",
      'legacy raised plaza fixture')
    source=replace_test(source,"test('cannot build on a 3D plaza postament in either purchase order or add roads through its fixtures',()=>{\n let city=makeInitialCity();",
      "test('cannot build on a 3D plaza postament in either purchase order or add roads through its fixtures',()=>{\n let city=makeInitialCity();city.progress.bestLevel=5;",
      'raised plaza collision fixture')
    return source

def test_park_stages(source):
    return replace_test(source,
      "let city=makeInitialCity();city.wallet.points=100_000;city.wallet.treats=1_000;const now=1800000000000;",
      "let city=makeInitialCity();city.progress.bestLevel=5;city.wallet.points=100_000;city.wallet.treats=1_000;const now=1800000000000;",
      'park stage fixture')

def test_paid(source):
    source=replace_test(source,
      "test('each one of the three game currencies is charged correctly and only on a fresh purchase',()=>{",
      "test('new points/zeffir price model only charges on a fresh purchase',()=>{",
      'paid test name')
    source=replace_test(source,
      "  const initial=makeInitialCity();\n  const result=addObject(initial,CATALOG,kind,...pos,0,1800000000000);",
      "  const initial=makeInitialCity();initial.progress.bestLevel=5;\n  const result=addObject(initial,CATALOG,kind,...pos,0,1800000000000);",
      'paid purchase fixture')
    source=replace_test(source,
      "test('insufficient points or coffee or treats stops a purchase without changing the city',()=>{\n for(const [kind,short] of [['cottage','points'],['cottage','treats'],['coffee-kiosk','coffee']]){\n  const city=makeInitialCity();",
      "test('insufficient points or premium zeffir stops a purchase without changing the city',()=>{\n for(const [kind,short] of [['cottage','points'],['villa','treats'],['botanical-garden','treats']]){\n  const city=makeInitialCity();city.progress.bestLevel=5;",
      'paid insufficient fixture')
    source=replace_test(source,
      "test('exact money pays the price, but never creates a negative balance',()=>{\n const city=makeInitialCity();",
      "test('exact money pays the price, but never creates a negative balance',()=>{\n const city=makeInitialCity();city.progress.bestLevel=5;",
      'paid exact money fixture')
    return source

def test_new_city(source):
    for kind in ['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square']:
        points,coffee,treats=PRICES[kind]
        # Do not rewrite arbitrary tests or the actual production catalog;
        # only the fixed 7-row canonical spec from the v10 regression test.
        regex=re.compile(r"(?m)^( '\b"+re.escape(kind)+r"':\{w:\d+,h:\d+,category:'[^']+',points:)\d+(,coffee:)\d+(,treats:)\d+(.*)$")
        def set_price(m):return f'{m.group(1)}{points}{m.group(2)}{coffee}{m.group(3)}{treats}{m.group(4)}'
        source,n=regex.subn(set_price,source)
        if n!=1:raise ValueError(f'new city expected 1 price spec for {kind}, got {n}')
    source=replace_test(source,
      "let city=makeInitialCity();city.wallet={points:999999,coffee:99999,treats:99999};",
      "let city=makeInitialCity();city.progress.bestLevel=5;city.wallet={points:999999,coffee:99999,treats:99999};",
      'new city purchase test')
    source=replace_test(source,
      "let city=makeInitialCity();city.wallet.points=999999;city.wallet.treats=99999;",
      "let city=makeInitialCity();city.progress.bestLevel=5;city.wallet.points=999999;city.wallet.treats=99999;",
      'new city park test')
    return source

def test_city_currency(source):
    source=replace_test(source,
      " return addObject(c,CATALOG,'garden',16,16,0,now-130000);",
      " // Both are unlocked at city level 1 and together meet level-2 needs.\n"
      " const shop=addObject(c,CATALOG,'coffee-kiosk',11,11,0,now-301000);\n"
      " return addObject(shop,CATALOG,'playground',16,16,0,now-130000);",
      'city reward level2 achievable with starting items')
    return source

def test_city_new(source):
    source=replace_test(source,
      " city.wallet = {points: 5_000_000, treats: 10_000, coffee: 10_000};\n return city;",
      " city.wallet = {points: 5_000_000, treats: 10_000, coffee: 10_000};\n"
      " city.progress.bestLevel=3; // Previously earned tier, so the prestige-park construction suite remains valid.\n return city;",
      'v12 new city progression fixture')
    source=replace_test(source,
      "assert.equal(stats.cityLevel,2,'New City parks contribute to city level progression');",
      "assert.equal(stats.cityLevel,3,'Previously earned city level is permanent while new parks improve live stats');",
      'v12 tier expected')
    source=replace_test(source,
      "assert.equal(next.progress.bestLevel,2);",
      "assert.equal(next.progress.bestLevel,3);",
      'v12 permanent earned level after claim')
    source=replace_test(source,
      "assert.equal(cityStats(offMap,CATALOG,NOW).cityLevel,2);",
      "assert.equal(cityStats(offMap,CATALOG,NOW).cityLevel,3);",
      'v12 stored earned tier')
    return source

def test_server_integration(source):
    source=replace_test(source,
      ".run('123456789',100000,2000,1000);",
      ".run('123456789',500000,2000,1000);",
      'test-only profile funding')
    source=replace_test(source,
      "assert.equal(state.city.wallet.points,100000);",
      "assert.equal(state.city.wallet.points,500000);",
      'test-only wallet assertion')
    source=replace_test(source,
      "assert.equal(wallet().wallet,100000-price.points);",
      "assert.equal(wallet().wallet,500000-price.points);",
      'test-only first purchase assertion')
    source=replace_test(source,
      "const park={objectKind:'garden',x:17,y:3,rotation:0};\n const price={...CATALOG.garden.price};",
      "const park={objectKind:'playground',x:17,y:3,rotation:0};\n const price={...CATALOG.playground.price};",
      'server park acceleration now affordable at level1')
    checkpoint="// New City v10 — authoritative purchases must use new catalog quotes (no client trust)."
    injection="""// v17: test both the rejection path and the approved purchase path. The
// following seed modifies only this in-memory SQLite fixture, never the Worker.
await check('prestige purchase denied at city level 1 without a debit or receipt',async()=>{
 const before=await request('state'),money=wallet(),receipts=receiptCount();
 const kind='bus-terminal',expectedPrice={...CATALOG[kind].price};
 const rejected=await request('mutate',{requestId:'world-v17-locked-terminal-01',expectedRevision:before.revision,expectedPrice,
   action:{kind:'place',args:{objectKind:kind,x:1,y:1,rotation:0}}});
 assert.equal(rejected.status,400,JSON.stringify(rejected));
 assert.equal(rejected.code,'BUILDING_LEVEL_LOCKED');
 assert.deepEqual(wallet(),money);assert.equal(receiptCount(),receipts);
});
const savedWorldRow=db.prepare('SELECT state_json FROM zeffi_world_cities WHERE telegram_id=?').get('123456789');
const unlockedTestCity=JSON.parse(savedWorldRow.state_json);
unlockedTestCity.progress.bestLevel=5;
db.prepare('UPDATE zeffi_world_cities SET state_json=? WHERE telegram_id=?').run(JSON.stringify(unlockedTestCity),'123456789');
"""
    source=replace_test(source,checkpoint,injection+checkpoint,'server prestige tests')
    return source

TEST_TRANSFORMS = {
 'world/tests/engine.test.mjs': test_engine,
 'world/tests/construction.test.mjs': test_construction,
 'world/tests/citizens.test.mjs': test_citizens,
 'world/tests/expansion-and-skip.test.mjs': test_expansion,
 'world/tests/extra-pack.test.mjs': test_extra,
 'world/tests/raised-plaza-overlap-v14.test.mjs': test_raised,
 'world/tests/park-stages-and-bench.test.mjs': test_park_stages,
 'world/tests/paid-economy.test.mjs': test_paid,
 'world/tests/new-city-pack.test.mjs': test_new_city,
 'world/tests/city-level-currency.test.mjs': test_city_currency,
 'world/tests/city-level-new-city-v12.test.mjs': test_city_new,
 'scripts/check-zeffi-world-integration.mjs': test_server_integration,
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check',action='store_true',help='Check source compatibility; do not change anything')
    ap.add_argument('--root',type=Path,default=Path.cwd())
    args=ap.parse_args()
    staged={}
    for name,fn in {**TRANSFORMS,**TEST_TRANSFORMS}.items():
        file=args.root/name
        if not file.is_file():
            sys.exit(f'ERROR missing required file: {file}')
        before=file.read_text('utf-8')
        try:after=fn(before)
        except (ValueError,AssertionError) as exc:sys.exit(f'ERROR refusing to change files: {name}: {exc}')
        if before==after:sys.exit(f'ERROR no change for expected file: {name}')
        staged[file]=after
        print(f'{"CHECK" if args.check else "UPDATE"} {name}')
    if args.check:
        print('READY: all 18 files match compatible anchors; no files changed.')
        return
    # Preflight completed on every file before any write.
    import os,tempfile
    temps={}
    try:
        for file,content in staged.items():
            with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=file.parent,prefix='.zeffi-shop-v17-',delete=False) as temp:
                temp.write(content);temps[file]=Path(temp.name)
        for file,temp in temps.items():
            os.replace(temp,file)
    finally:
        for temp in temps.values():
            temp.unlink(missing_ok=True)
    print('DONE: shop prices, levels, UI, shared engine and existing test fixtures updated.')

if __name__ == '__main__':main()
