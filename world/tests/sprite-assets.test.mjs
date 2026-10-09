import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { buildingAssetId, decorAssetId, catalogSpriteId, roadMaskId, spriteMetadata, spriteStatus, setSpriteMode, drawSprite, isSpriteModeEnabled } from '../sprite-assets.js';
import { groundTileSpriteId, TILE_W, TILE_H } from '../renderer.js';
import { CATALOG } from '../catalog.js';
const root=dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const byId=new Map(SPRITE_MANIFEST.assets.map(asset=>[asset.id,asset]));

test('Clean Core + Extra + Flower Style contains exactly 249 unique WebP-only sprites',()=>{
 assert.equal(SPRITE_MANIFEST.assets.length,249);
 assert.equal(byId.size,249);
 for(const a of SPRITE_MANIFEST.assets){
  assert.equal(Object.hasOwn(a,'filePng'),false,a.id);
  assert.ok(a.fileWebp.endsWith('.webp'),a.id);
  assert.ok(existsSync(join(root,a.fileWebp)),a.fileWebp);
  assert.ok(a.width>0&&a.height>0&&a.anchorX>=0&&a.anchorY>=0&&a.assetScale>0);
  assert.deepEqual(spriteMetadata(a.id),a);
 }
});
test('tile projection remains 72 x 36',()=>{
 assert.equal(TILE_W,72);assert.equal(TILE_H,36);
 assert.equal(SPRITE_MANIFEST.projection.tileWidth,72);
 assert.equal(SPRITE_MANIFEST.projection.tileHeight,36);
});
test('6 buildings use Flower Style completed sprites and keep 3 Core construction stages in 4 facings',()=>{
 for(const item of SPRITE_MANIFEST.buildingCompatibility){
  const def=CATALOG[item.catalogId];assert.ok(def,item.catalogId);
  assert.deepEqual([def.w,def.h],item.footprint);
  for(const state of ['complete','build_01','build_02','build_03']){
   const faces=new Set();
   for(let r=0;r<4;r++){
    const id=catalogSpriteId(item.catalogId,r,state);
    assert.ok(id,`${item.catalogId} ${r} ${state}`);
    assert.equal(byId.get(id).catalogId,item.catalogId);
    assert.equal(byId.get(id).state,state);
    if(state==='complete')assert.ok(id.startsWith('flower_v1_'));
    else assert.equal(id,buildingAssetId(item.catalogId,r,state));
    faces.add(id);
   }
   assert.equal(faces.size,4);
  }
 }
 assert.equal(buildingAssetId('flower-shop',0),null);
});
test('road-mask bit geometry N=1 E=2 S=4 W=8 matches all 16 sprites',()=>{
 for(let mask=0;mask<16;mask++){
  const points=[];
  if(mask&1)points.push('0,-1');
  if(mask&2)points.push('1,0');
  if(mask&4)points.push('0,1');
  if(mask&8)points.push('-1,0');
  const id=roadMaskId(new Set(points),0,0);
  assert.equal(id,`world_road_mask_${String(mask).padStart(2,'0')}`);
  assert.equal(spriteMetadata(id).roadMask,mask);
 }
 assert.ok(spriteMetadata('world_road_entry_special'));
 assert.equal(spriteMetadata('world_road_preview_build'),null);
 assert.equal(spriteMetadata('world_road_preview_remove'),null);
});
test('new terrain uses no-round surface art and new highlight overlays',()=>{
 const alwaysOwned=()=>true;
 const variants=new Set();
 for(let x=0;x<40;x++)for(let y=0;y<40;y++){
  const id=groundTileSpriteId(x,y,alwaysOwned,false);
  assert.ok(id.startsWith('terrain_')&&id.endsWith('_premium'));
  assert.ok(byId.has(id),id);
  variants.add(id);
  assert.equal(groundTileSpriteId(x,y,alwaysOwned,true),'terrain_grass_clean_premium');
 }
 assert.equal(variants.size,9);
 assert.ok(byId.has('terrain_overlay_selected_blue_premium'));
 assert.ok(byId.has('terrain_overlay_expansion_gold_premium'));
 assert.ok(!byId.has('world_ground_base'));
});
test('Flower Style replaces original and Extra tree, lamp, bench and fountain in all four facings',()=>{
 for(const [main,extra] of Object.entries({tree:'extra-tree',lamp:'extra-lamp',bench:'extra-bench',fountain:'extra-fountain'})){
  const orientations=new Set();
  for(let rotation=0;rotation<4;rotation++){
   const canonical=catalogSpriteId(main,rotation);
   const alias=catalogSpriteId(extra,rotation);
   assert.equal(canonical,alias,`${main}/${extra}:${rotation}`);
   assert.ok(canonical.startsWith('flower_v1_'));
   assert.equal(spriteMetadata(canonical)?.facing,'nesw'[rotation]);
   orientations.add(canonical);
  }
  assert.equal(orientations.size,4);
 }
 assert.notEqual(decorAssetId('flowerbed',0,0),decorAssetId('flowerbed',0,1));
 for(const kind of ['garden','monument','playground','flower-shop'])assert.ok(catalogSpriteId(kind,0)?.startsWith('extra_'));
});
test('art can be switched off and falls back without changing the city model',()=>{
 const previous=isSpriteModeEnabled();
 setSpriteMode(false);
 assert.equal(spriteStatus().enabled,false);
 assert.equal(drawSprite({},'terrain_grass_clean_premium',{x:0,y:0}),false);
 setSpriteMode(previous);
});
