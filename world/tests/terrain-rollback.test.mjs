import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_ITEMS, CATEGORIES } from '../catalog.js';
import { groundTileSpriteId } from '../renderer.js';
import { catalogSpriteId, spriteMetadata } from '../sprite-assets.js';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { makeInitialCity, sanitizeCity, addObject, storeObject, BuildError, applyRoadStroke, buyParcel, expansionPrice } from '../engine.js';

const SURFACES = ['terrain_grass_clean_premium','terrain_grass_floral_sparse_premium',
 'terrain_grass_stone_accent_premium','terrain_grass_meadow_premium',
 'terrain_garden_soil_premium','terrain_plaza_round_inlay_premium',
 'terrain_path_sand_premium','terrain_flower_edge_premium','terrain_shrub_edge_premium'];
const MODULES = ['terrain_edge_straight_a_premium','terrain_edge_straight_b_premium',
 'terrain_corner_outer_premium','terrain_corner_inner_premium','terrain_platform_plain_premium',
 'terrain_border_floral_premium','terrain_stair_entry_premium','terrain_podium_plaza_premium'];

test('new no-round ground has 9 deterministic variants; occupied cells always become clean grass',()=>{
 const picked=new Set();
 for(let x=-22;x<42;x++)for(let y=-13;y<39;y++){
  const a=groundTileSpriteId(x,y,()=>true,false);
  assert.ok(SURFACES.includes(a),a);
  assert.equal(groundTileSpriteId(x,y,()=>true,false),a);
  assert.equal(groundTileSpriteId(x,y,()=>true,true),'terrain_grass_clean_premium');
  picked.add(a);
 }
 assert.equal(picked.size,9);
});
test('all new runtime ground surfaces are projected as top-only 72x36 tiles; no old ground assets remain',()=>{
 const byId=new Map(SPRITE_MANIFEST.assets.map(a=>[a.id,a]));
 for(const id of SURFACES){
  const a=byId.get(id);assert.ok(a,id);
  assert.equal(a.width/a.assetScale,72);
  assert.equal(a.height/a.assetScale,36);
  assert.deepEqual(a.footprint,[1,1]);
 }
 for(const id of ['world_ground_base','world_ground_edge_e','world_ground_corner_outer_nw'])assert.ok(!byId.has(id));
 for(const id of ['terrain_overlay_selected_blue_premium','terrain_overlay_expansion_gold_premium'])assert.ok(byId.has(id));
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='no-round-terrain-v1').length,19);
});
test('8 new landscape objects are purchasable single-cell decor; old 0.1.7 objects remain retired',()=>{
 assert.ok(CATEGORIES.includes('landscape'));
 assert.equal(CATALOG_ITEMS.filter(x=>x.category==='landscape').length,8);
 const base=makeInitialCity();
 let used=base;
 for(const [i,id] of MODULES.entries()){
  assert.deepEqual([CATALOG[id].w,CATALOG[id].h],[1,1]);
  assert.equal(CATALOG[id].retired,undefined);
  assert.equal(catalogSpriteId(id),id);
  assert.ok(spriteMetadata(id).fileWebp.endsWith('.webp'));
  used=addObject(used,CATALOG,id,15+i,21);
 }
 assert.equal(used.objects.length,base.objects.length+8);
 assert.equal(CATALOG.terrain_cliff_garden.retired,true);
 assert.throws(()=>addObject(makeInitialCity(),CATALOG,'terrain_cliff_garden',19,19),e=>e instanceof BuildError&&e.code==='NOT_AVAILABLE');
});
test('previous saves keep their elevation objects, footprint, ownership and wallet; no Road changes',()=>{
 const city=makeInitialCity();
 city.objects.push({uid:'obj-5',kind:'terrain_cliff_garden',x:19,y:19,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
 city.nextId=6;
 const loaded=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(loaded.objects.find(x=>x.uid==='obj-5').kind,'terrain_cliff_garden');
 assert.equal(catalogSpriteId('terrain_cliff_garden'),'terrain_cliff_garden');
 assert.deepEqual(loaded.wallet,city.wallet);
 const withRoad=applyRoadStroke(loaded,CATALOG,[{x:15,y:13}]);
 assert.equal(withRoad.roads.length,loaded.roads.length);
 assert.equal(expansionPrice(loaded).points,1200);
 const expanded=buyParcel(loaded,6,2);
 assert.equal(expansionPrice(expanded).points,2400);
});
