import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { CATALOG, CATALOG_ITEMS, RETIRED_PATH_ITEMS } from '../catalog.js';
import { catalogSpriteId, spriteMetadata } from '../sprite-assets.js';
import { makeInitialCity, sanitizeCity } from '../engine.js';
const root=dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const ids=new Set(SPRITE_MANIFEST.assets.map(a=>a.id));
const spritePaths=new Set(SPRITE_MANIFEST.assets.map(a=>a.fileWebp));
function visit(path,output=[]){ for(const entry of readdirSync(path,{withFileTypes:true})){
 const full=join(path,entry.name);if(entry.isDirectory())visit(full,output);else output.push(relative(root,full).replaceAll('\\','/'));
}return output; }

test('only active WebP files are packaged (no PNG, GLB or unreferenced sprites)',()=>{
 const actual=visit(join(root,'assets')).filter(p=>p.endsWith('.webp'));
 assert.deepEqual(new Set(actual),spritePaths);
 assert.equal(actual.length,249);
 assert.ok(!visit(root).some(p=>/\.(png|glb|jpg|jpeg)$/i.test(p)));
 assert.ok(!SPRITE_MANIFEST.assets.some(a=>Object.hasOwn(a,'filePng')||Object.hasOwn(a,'sourceGlb')));
 const code=readFileSync(join(root,'sprite-assets.js'),'utf-8');
 assert.ok(!code.includes('loading-png'));
 assert.ok(!code.includes('meta.filePng'));
});

test('all purchasable and retired catalog objects resolve to retained WebP artwork',()=>{
 for(const def of [...CATALOG_ITEMS,...RETIRED_PATH_ITEMS]){
  for(let rotation=0;rotation<4;rotation++){
   const id=catalogSpriteId(def.id,rotation);
   assert.ok(id,`${def.id}/${rotation}`);
   assert.ok(ids.has(id),id);
   assert.ok(existsSync(join(root,spriteMetadata(id).fileWebp)));
  }
 }
});

test('all aliases display Flower Style without changing saved item kind or footprint',()=>{
 const aliases={tree:'extra-tree',lamp:'extra-lamp',bench:'extra-bench',fountain:'extra-fountain'};
 for(const [base,extra] of Object.entries(aliases)){
  for(let r=0;r<4;r++)assert.equal(catalogSpriteId(extra,r),catalogSpriteId(base,r));
  assert.deepEqual([CATALOG[extra].w,CATALOG[extra].h],[CATALOG[base].w,CATALOG[base].h]);
 }
 const city=makeInitialCity();
 city.objects.push({uid:'obj-50',kind:'extra-tree',x:19,y:18,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
 city.nextId=51;
 const saved=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.ok(saved.objects.some(o=>o.kind==='extra-tree'));
 assert.deepEqual(saved.wallet,city.wallet);
});

test('obsolete artwork is absent; functional Road, base ground and build stages remain',()=>{
 for(const id of ['world_house_small_n','world_coffee_kiosk_n','world_decor_tree_a','world_decor_lamp','world_decor_bench_n','world_decor_fountain','extra_decor_tree','extra_decor_lamp','extra_decor_bench','extra_decor_fountain','world_road_preview_build','world_ground_overlay_allowed','world_ground_base','world_ground_overlay_selected'])assert.ok(!ids.has(id),id);
 for(const id of ['terrain_grass_clean_premium','world_road_mask_00','world_road_mask_15','world_road_entry_special','world_house_small_build_01_n','world_house_small_build_03_w','world_decor_flowerbed_a'])assert.ok(ids.has(id),id);
 for(const retired of RETIRED_PATH_ITEMS)assert.ok(ids.has(catalogSpriteId(retired.id)));
});
