import { catalogSpriteId, spriteMetadata, parkConstructionAssetId } from '../sprite-assets.js';
import { PROJECT_FOCUS, isoToScreen } from '../renderer.js';
import { PLACES, buildStoryMap } from './map.js';
import { createDemoState } from './model.js';
const SHAPES={
 home:'M3 11 12 3l9 8v10H3z M9 21v-8h6v8',
 coffee:'M5 7h12v8a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z M17 8h2a3 3 0 0 1 0 6h-2 M8 3v1 M13 3v1',
 leaf:'M20 3C7 1 2 8 5 16c8 5 16-1 15-13z M4 21 15 10',
 bus:'M5 3h14v15H5z M5 10h14 M8 6h8 M8 14h.01 M16 14h.01 M7 18v3 M17 18v3',
 heart:'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 6 8 16 8 16S25 11 20 5z',
 spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
 star:'m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
 flag:'M5 22V3 M5 3h14l-3 5 3 5H5',
 lock:'M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z M12 14v3',
 map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16',
 settings:'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
 target:'M12 2v4 M12 18v4 M2 12h4 M18 12h4 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M12 12h.01',
 back:'m14 5-7 7 7 7',close:'m6 6 12 12 M6 18 18 6',plus:'M12 5v14 M5 12h14',minus:'M5 12h14',check:'m4 12 5 5L20 6',pause:'M8 5v14 M16 5v14',play:'m7 4 13 8-13 8z'
};
export function icon(name, extra='') {return `<svg class="i ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${SHAPES[name]||SHAPES.spark}"/></svg>`;}
export function escapeText(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function artUrl(kind,rotation=0,state='complete') {
 const id=state==='complete'?catalogSpriteId(kind,rotation,'complete',0):parkConstructionAssetId(kind,rotation,state);
 const meta=spriteMetadata(id);
 return (typeof window!=='undefined'&&window.ZeffiEmbeddedSprites?.[id])||(meta?`./${meta.fileWebp}`:'');
}
export function requiredStorySpriteIds(){
 const ids=new Set(['terrain_grass_clean_premium','terrain_grass_floral_sparse_premium','terrain_grass_stone_accent_premium','terrain_grass_meadow_premium','terrain_shrub_edge_premium','terrain_flower_edge_premium','terrain_path_sand_premium','terrain_garden_soil_premium','terrain_plaza_round_inlay_premium']);
 for(let chapter=0;chapter<3;chapter++){
  const state={...createDemoState(),chapter};const city=buildStoryMap(state);
  for(const object of city.objects)for(const variation of [0,1,2,3])ids.add(catalogSpriteId(object.kind,object.rotation,'complete',variation));
 }
 for(const place of PLACES)ids.add(catalogSpriteId(place.kind,0,'complete',0));
 for(const stage of ['build_01','build_02','build_03'])ids.add(parkConstructionAssetId('garden',0,stage));
 return [...ids].filter(id=>id&&spriteMetadata(id));
}
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function worldAt(sx,sy,size,cam){
 const dx=(sx-size.width/2-cam.x)/cam.zoom+(PROJECT_FOCUS.x-PROJECT_FOCUS.y)*36;
 const dy=(sy-size.height/2-cam.y)/cam.zoom+(PROJECT_FOCUS.x+PROJECT_FOCUS.y)*18;
 return {x:(dx/36+dy/18)/2,y:(dy/18-dx/36)/2};
}
export function centerCamera(x,y,zoom=.85){
 return {x:-((x-y)-(PROJECT_FOCUS.x-PROJECT_FOCUS.y))*36*zoom,y:-((x+y)-(PROJECT_FOCUS.x+PROJECT_FOCUS.y))*18*zoom,zoom};
}
export function clampCamera(cam,size){
 const p=worldAt(size.width/2,size.height/2,size,cam);
 const bounded=centerCamera(clamp(p.x,1,47),clamp(p.y,1,47),clamp(cam.zoom,.28,1.7));
 return bounded;
}
export function zoomCamera(cam,size,x,y,zoom){
 const target=worldAt(x,y,size,cam),next={...cam,zoom:clamp(zoom,.28,1.7)};
 const screen=isoToScreen(target.x,target.y,size,next);
 next.x+=x-screen.x;next.y+=y-screen.y;
 return clampCamera(next,size);
}
