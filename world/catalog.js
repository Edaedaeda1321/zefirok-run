import { OBJECT_PRICES } from './economy.js';

// Additional objects come from the isolated Extra Asset Pack v1.
const EXTRA_CATALOG_ITEMS = Object.freeze([
  { id: "path-straight", category: "paths", titleKey: "pathStraight", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-turn", category: "paths", titleKey: "pathTurn", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-t-junction", category: "paths", titleKey: "pathTJunction", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-crossroad", category: "paths", titleKey: "pathCrossroad", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-dead-end", category: "paths", titleKey: "pathDeadEnd", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-single-tile", category: "paths", titleKey: "pathSingleTile", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-diagonal", category: "paths", titleKey: "pathDiagonal", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-bordered", category: "paths", titleKey: "pathBordered", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "path-flower-edge", category: "paths", titleKey: "pathFlowerEdge", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:1, h:1, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-city-square", category: "plazas", titleKey: "plazaCitySquare", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-cozy-tiled", category: "plazas", titleKey: "plazaCozyTiled", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-flower-edge", category: "plazas", titleKey: "plazaFlowerEdge", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-monument-base", category: "plazas", titleKey: "plazaMonumentBase", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-rest-zone", category: "plazas", titleKey: "plazaRestZone", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-playground-base", category: "plazas", titleKey: "plazaPlaygroundBase", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-bordered-shrubs", category: "plazas", titleKey: "plazaBorderedShrubs", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "plaza-prestige-podium", category: "plazas", titleKey: "plazaPrestigePodium", descriptionKey:'decorativeOnlyDescription', icon: "star", w:3, h:3, needsRoad:false, style:'rose', height:0, layer:'surface', rotatable:false },
  { id: "extra-flowerbed", category: "decor", titleKey: "extraFlowerbed", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-bush", category: "decor", titleKey: "extraBush", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-tree", category: "decor", titleKey: "extraTree", descriptionKey:'decorativeOnlyDescription', icon: "tree", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-lamp", category: "decor", titleKey: "extraLamp", descriptionKey:'decorativeOnlyDescription', icon: "lamp", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-bench", category: "decor", titleKey: "extraBench", descriptionKey:'decorativeOnlyDescription', icon: "bench", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-planter", category: "decor", titleKey: "extraPlanter", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-arch", category: "decor", titleKey: "extraArch", descriptionKey:'decorativeOnlyDescription', icon: "flower", w:2, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-fountain", buildMs: 90000, category: "decor", titleKey: "extraFountain", descriptionKey:'decorativeOnlyDescription', icon: "fountain", w:2, h:2, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-sign", category: "decor", titleKey: "extraSign", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false },
  { id: "extra-sweet_object", category: "decor", titleKey: "extraSweet", descriptionKey:'decorativeOnlyDescription', icon: "star", w:1, h:1, needsRoad:false, style:'rose', height:0, rotatable:false }
]);

const RETIRED_LANDSCAPE_ITEMS = Object.freeze([
  { id: 'terrain_platform_basic', category: 'landscape', titleKey: 'terrainPlatformBasic', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_platform_topiary_fountain', category: 'landscape', titleKey: 'terrainPlatformTopiaryFountain', descriptionKey:'landscapeDescription', icon: 'fountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_border_straight_a', category: 'landscape', titleKey: 'terrainBorderStraightA', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_border_straight_b', category: 'landscape', titleKey: 'terrainBorderStraightB', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_corner_square', category: 'landscape', titleKey: 'terrainCornerSquare', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_corner_wall', category: 'landscape', titleKey: 'terrainCornerWall', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_inner_corner', category: 'landscape', titleKey: 'terrainInnerCorner', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_corner_planters', category: 'landscape', titleKey: 'terrainCornerPlanters', descriptionKey:'landscapeDescription', icon: 'flower', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_ramp_plaza', category: 'landscape', titleKey: 'terrainRampPlaza', descriptionKey:'landscapeDescription', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_stairs_plaza', category: 'landscape', titleKey: 'terrainStairsPlaza', descriptionKey:'landscapeDescription', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_podium_floral', category: 'landscape', titleKey: 'terrainPodiumFloral', descriptionKey:'landscapeDescription', icon: 'flower', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_cliff_garden', buildMs: 90000, category: 'landscape', titleKey: 'terrainCliffGarden', descriptionKey:'landscapeDescription', icon: 'mountain', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false }
].map(item => Object.freeze({...item, retired:true})));

// Decorative 1x1 terrain modules. These are not logical height levels.
const NO_ROUND_TERRAIN_ITEMS = Object.freeze([
  { id: 'terrain_platform_plain_premium', category: 'landscape', titleKey: 'terrainPlatformPlain', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_border_floral_premium', category: 'landscape', titleKey: 'terrainBorderFloral', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_edge_straight_a_premium', category: 'landscape', titleKey: 'terrainEdgeStraightA', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_edge_straight_b_premium', category: 'landscape', titleKey: 'terrainEdgeStraightB', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_corner_outer_premium', category: 'landscape', titleKey: 'terrainCornerOuter', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_corner_inner_premium', category: 'landscape', titleKey: 'terrainCornerInner', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_stair_entry_premium', category: 'landscape', titleKey: 'terrainStairEntry', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
  { id: 'terrain_podium_plaza_premium', category: 'landscape', titleKey: 'terrainPodiumPlaza', descriptionKey: 'terrainDecorativeOnly', icon: 'star', w:1, h:1, needsRoad:false, style:'park', height:0, rotatable:false },
]);

const VISIBLE_ITEMS = [
  { id: 'bus-terminal', category: 'transport', titleKey: 'busTerminal', descriptionKey: 'busTerminalDescription', icon: 'bus', w: 4, h: 3, needsRoad: true, style: 'rose', height: 105, buildMs: 480000 },
  { id: 'bus-stop', category: 'transport', titleKey: 'busStop', descriptionKey: 'busStopDescription', icon: 'bus', w: 2, h: 1, needsRoad: true, style: 'rose', height: 38, buildMs: 120000 },
  { id: 'pond-park', category: 'parks', titleKey: 'pondPark', descriptionKey: 'pondParkDescription', icon: 'fountain', w: 3, h: 3, needsRoad: false, style: 'park', height: 0, buildMs: 180000 },
  { id: 'rose-garden', category: 'parks', titleKey: 'roseGarden', descriptionKey: 'roseGardenDescription', icon: 'flower', w: 3, h: 3, needsRoad: false, style: 'rose', height: 0, buildMs: 180000 },
  { id: 'botanical-garden', category: 'parks', titleKey: 'botanicalGarden', descriptionKey: 'botanicalGardenDescription', icon: 'flower', w: 4, h: 4, needsRoad: false, style: 'park', height: 0, buildMs: 300000 },
  { id: 'sports-playground', category: 'plazas', titleKey: 'sportsPlayground', descriptionKey: 'sportsPlaygroundDescription', icon: 'sun', w: 3, h: 2, needsRoad: false, style: 'mint', height: 0, buildMs: 180000 },
  { id: 'city-square', category: 'plazas', titleKey: 'newCitySquare', descriptionKey: 'newCitySquareDescription', icon: 'star', w: 3, h: 3, needsRoad: false, style: 'gold', height: 0, buildMs: 180000 },
  // RC7: new 7x7 single-angle landmark. Legacy 3x3 city-square saves are untouched.
  { id: 'central-park-zeffi', category: 'parks', titleKey: 'centralParkZeffi', descriptionKey: 'centralParkZeffiDescription', icon: 'flower', w: 6, h: 6, needsRoad: false, style: 'park', height: 0, buildMs: 360000, rotatable: true },
  { id: 'zeffi-central-square', category: 'plazas', titleKey: 'zeffiCentralSquare', descriptionKey: 'zeffiCentralSquareDescription', icon: 'star', w: 7, h: 7, needsRoad: false, style: 'gold', height: 0, buildMs: 720000, rotatable: false },
  { id: 'cottage', buildMs: 300000, category: 'homes', titleKey: 'cottage', descriptionKey: 'cottageDescription', icon: 'house', w: 2, h: 2, needsRoad: true, style: 'rose', height: 52 },
  { id: 'family-home', buildMs: 300000, category: 'homes', titleKey: 'familyHome', descriptionKey: 'familyHomeDescription', icon: 'house', w: 3, h: 2, needsRoad: true, style: 'butter', height: 61 },
  { id: 'villa', buildMs: 300000, category: 'homes', titleKey: 'villa', descriptionKey: 'villaDescription', icon: 'house', w: 3, h: 3, needsRoad: true, style: 'lilac', height: 72 },
  { id: 'coffee-kiosk', buildMs: 300000, category: 'shops', titleKey: 'coffeeKiosk', descriptionKey: 'coffeeKioskDescription', icon: 'coffee', w: 2, h: 2, needsRoad: true, style: 'coffee', height: 44 },
  { id: 'coffee-house', buildMs: 300000, category: 'shops', titleKey: 'coffeeHouse', descriptionKey: 'coffeeHouseDescription', icon: 'coffee', w: 3, h: 3, needsRoad: true, style: 'rose', height: 63 },
  // One iconic building houses both White Rabbit and Cafe Zephirok.
  { id: 'palace-of-memories', buildMs: 24*60*60*1000, category: 'plazas', titleKey: 'palaceMemories', descriptionKey: 'palaceMemoriesDescription', icon: 'star', w: 6, h: 6, needsRoad: false, style: 'gold', height: 155, rotatable: false, blockingSurface: true },
  { id: 'white-rabbit-zephirok', buildMs: 900000, category: 'shops', titleKey: 'whiteRabbitZephirok', descriptionKey: 'whiteRabbitZephirokDescription', icon: 'coffee', w: 4, h: 4, needsRoad: true, style: 'rose', height: 115 },
  { id: 'bakery', buildMs: 300000, category: 'shops', titleKey: 'bakery', descriptionKey: 'bakeryDescription', icon: 'cake', w: 3, h: 2, needsRoad: true, style: 'butter', height: 56 },
  { id: 'flower-shop', buildMs: 300000, category: 'shops', titleKey: 'flowerShop', descriptionKey: 'flowerShopDescription', icon: 'flower', w: 2, h: 2, needsRoad: true, style: 'mint', height: 45 },
  { id: 'garden', buildMs: 120000, category: 'parks', titleKey: 'garden', descriptionKey: 'gardenDescription', icon: 'flower', w: 3, h: 3, needsRoad: false, style: 'park', height: 0 },
  { id: 'playground', buildMs: 120000, category: 'parks', titleKey: 'playground', descriptionKey: 'playgroundDescription', icon: 'sun', w: 3, h: 2, needsRoad: false, style: 'park', height: 0 },
  { id: 'tree', category: 'decor', titleKey: 'tree', descriptionKey: 'treeDescription', icon: 'tree', w: 1, h: 1, needsRoad: false, style: 'mint', height: 0 },
  { id: 'flowerbed', category: 'decor', titleKey: 'flowerbed', descriptionKey: 'flowerbedDescription', icon: 'flower', w: 1, h: 1, needsRoad: false, style: 'rose', height: 0 },
  { id: 'lamp', category: 'decor', titleKey: 'lamp', descriptionKey: 'lampDescription', icon: 'lamp', w: 1, h: 1, needsRoad: false, style: 'gold', height: 0 },
  { id: 'bench', category: 'decor', titleKey: 'bench', descriptionKey: 'benchDescription', icon: 'bench', w:1, h:1, needsRoad: false, style: 'coffee', height: 0 },
  { id: 'fountain', buildMs: 90000, category: 'decor', titleKey: 'fountain', descriptionKey: 'fountainDescription', icon: 'fountain', w: 2, h: 2, needsRoad: false, style: 'water', height: 0 },
  { id: 'monument', buildMs: 120000, category: 'decor', titleKey: 'monument', descriptionKey: 'monumentDescription', icon: 'star', w: 2, h: 2, needsRoad: false, style: 'gold', height: 0 },
  ...NO_ROUND_TERRAIN_ITEMS,
  // All eight legacy plaza WebPs contain raised fixtures (lamps, benches, a
  // column, plinth, fences or playground). They are not flat paving, and a
  // building may NOT stand on top of them. Keep the original 'surface' layer
  // for old save compatibility; blockingSurfaces controls new placement and Z-order.
  ...EXTRA_CATALOG_ITEMS.filter(item => item.category !== 'paths').map(item =>
   item.category === 'plazas' ? {...item,blockingSurface:true} : item)
];

// The nine old decorative path IDs remain readable for old local saves. They
// are retired: never shown in the build catalog and cannot be purchased again.
export const RETIRED_PATH_ITEMS = Object.freeze(EXTRA_CATALOG_ITEMS
  .filter(item => item.category === 'paths')
  .map(item => Object.freeze({ ...item, retired: true })));
// The one canonical unlock table used by the Worker and both city UIs.
// Previously owned buildings can still be moved/restored.
// RC-6: 49 existing purchasable objects spread across all 10 city tiers.
// Already owned objects are never restricted when moved or restored.
export const SHOP_UNLOCK_LEVELS = Object.freeze({
  // Level 1
  'cottage': 1,
  'coffee-kiosk': 1,
  'flower-shop': 1,
  'playground': 1,
  'tree': 1,
  'flowerbed': 1,
  'lamp': 1,
  'bench': 1,
  'terrain_platform_plain_premium': 1,
  'terrain_border_floral_premium': 1,
  'terrain_edge_straight_a_premium': 1,
  'terrain_edge_straight_b_premium': 1,
  'terrain_corner_outer_premium': 1,
  'terrain_corner_inner_premium': 1,
  'terrain_stair_entry_premium': 1,
  'plaza-cozy-tiled': 1,
  'extra-bush': 1,
  'extra-planter': 1,
  'extra-sign': 1,
  // Level 2
  'family-home': 2,
  'bus-stop': 2,
  'bakery': 2,
  'sports-playground': 2,
  'fountain': 2,
  'plaza-flower-edge': 2,
  'plaza-rest-zone': 2,
  'extra-flowerbed': 2,
  'extra-lamp': 2,
  // Level 3
  'pond-park': 3,
  'rose-garden': 3,
  'villa': 3,
  'extra-bench': 3,
  // Level 4
  'coffee-house': 4,
  'plaza-bordered-shrubs': 4,
  'extra-tree': 4,
  // Level 5
  'garden': 5,
  'plaza-city-square': 5,
  'extra-arch': 5,
  'extra-sweet_object': 5,
  // Level 6
  'city-square': 6,
  'zeffi-central-square': 8,
  'central-park-zeffi': 8,
  'extra-fountain': 6,
  // Level 7
  'bus-terminal': 7,
  'terrain_podium_plaza_premium': 7,
  // Level 8
  'botanical-garden': 8,
  'plaza-playground-base': 8,
  // Level 9
  'monument': 9,
  'plaza-monument-base': 9,
  // Level 10
  'white-rabbit-zephirok': 10,
  'palace-of-memories': 10,
  'plaza-prestige-podium': 10,
});
export const CATALOG_ITEMS = Object.freeze(VISIBLE_ITEMS.map(item => {
  if (!OBJECT_PRICES[item.id]) throw new Error(`PRICE_MISSING: ${item.id}`);
  return Object.freeze({ ...item, minCityLevel: SHOP_UNLOCK_LEVELS[item.id] || 1, price: OBJECT_PRICES[item.id] });
}));
// Entitlement-only: NOT a shop item, NOT world_decor, NOT part of editable P1 prices.
export const MEETING_GARDEN_PASS_ID='meeting-garden-pass';
export const MEETING_GARDEN_PASS=Object.freeze({
 id:MEETING_GARDEN_PASS_ID,category:'parks',titleKey:'meetingGarden',descriptionKey:'meetingGardenDescription',
 icon:'flower',w:6,h:6,needsRoad:false,style:'rose',height:70,buildMs:6*60*60*1000,
 rotatable:false,blockingSurface:true,passOnly:true,minCityLevel:1,
 price:Object.freeze({points:0,treats:0,coffee:0})
});
export const CATALOG = Object.freeze(Object.fromEntries(
  [...CATALOG_ITEMS, MEETING_GARDEN_PASS, ...RETIRED_PATH_ITEMS, ...RETIRED_LANDSCAPE_ITEMS].map(item => [item.id, item])
));
export const CATEGORIES = Object.freeze(['all', 'homes', 'shops', 'transport', 'parks', 'plazas', 'landscape', 'decor']);
