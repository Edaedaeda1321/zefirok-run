// Only the visual layer depends on this module. The engine never reads image state.
// Failed WebP decodes or an intentionally disabled art mode fall back to
// procedural Canvas drawing without changing city state. No PNG dependency.
import { SPRITE_MANIFEST } from './sprite-manifest.js';

const manifestById = new Map(SPRITE_MANIFEST.assets.map(asset => [asset.id, asset]));
const buildingNames = new Map(SPRITE_MANIFEST.buildingCompatibility.map(item => [item.catalogId, item.buildingId]));
const extraDirectional = new Map(SPRITE_MANIFEST.assets.filter(a=>a.packId==='extra-v1'&&a.facing).map(a=>[`${a.catalogId}:${a.facing}`,a.id]));
const flowerDirectional = new Map(SPRITE_MANIFEST.assets.filter(a=>a.packId==='flower-style-v1'&&a.facing).map(a=>[`${a.catalogId}:${a.facing}`,a.id]));
// Extra-v1 catalog variants represent the SAME city items as the four
// Flower Style replacements, and must never select the retired Extra images.
const flowerAliases = Object.freeze({
  'extra-tree':'tree',
  'extra-lamp':'lamp',
  'extra-bench':'bench',
  'extra-fountain':'fountain'
});
const canonicalFlowerId = kind => flowerAliases[kind] || kind;
const extraSingle = new Map(SPRITE_MANIFEST.assets.filter(a=>a.packId==='extra-v1'&&!a.facing).map(a=>[a.catalogId,a.id]));
const landscapeSprites = new Map(SPRITE_MANIFEST.assets.filter(a=>a.category==='landscape'&&a.catalogId).map(a=>[a.catalogId,a.id]));
const FACINGS = ['n', 'e', 's', 'w'];
const PARK_STAGE_KINDS = Object.freeze({
 'garden':'garden', 'playground':'playground',
 'fountain':'fountain', 'extra-fountain':'fountain', 'monument':'monument'
});
export function parkConstructionAssetId(kind, rotation=0, state='build_01') {
 if(!/^build_0[1-3]$/.test(state)) return null;
 const base=PARK_STAGE_KINDS[kind];
 if(!base)return null;
 const facing=FACINGS[((rotation % 4) + 4) % 4];
 const id=`park_${base}_${state}_${facing}`;
 return manifestById.has(id)?id:null;
}
// Pin the initially visible world art and the complete rotation set. Loading
// later construction stages must not evict these directional sprites.
const MAX_CACHE = 190;
const pinnedScene = new Set();
const cache = new Map();
let enabled = true;
let onUpdate = () => {};

export const spriteManifest = SPRITE_MANIFEST;
export function spriteMetadata(id) { return manifestById.get(id) || null; }
export function isSpriteModeEnabled() { return enabled; }
export function setSpriteMode(value) {
 enabled = Boolean(value);
 onUpdate();
}
export function onSpriteUpdate(callback) { onUpdate = typeof callback === 'function' ? callback : () => {}; }

export function buildingAssetId(catalogId, rotation = 0, state = 'complete') {
 const building = buildingNames.get(catalogId);
 if(!building)return null;
 const direction = FACINGS[((rotation % 4) + 4) % 4];
 const id = `world_${building}_${state === 'complete' ? '' : state + '_'}${direction}`;
 return manifestById.has(id) ? id : null;
}
export function decorAssetId(catalogId, rotation = 0, variation = 0) {
 const direction=FACINGS[((rotation%4)+4)%4];
 const flower=flowerDirectional.get(`${canonicalFlowerId(catalogId)}:${direction}`);
 if(flower)return flower;
 // These two flowerbeds do not yet have a Flower Style replacement.
 if(catalogId==='flowerbed') {
  const id=`world_decor_flowerbed_${variation%2?'b':'a'}`;
  return manifestById.has(id)?id:null;
 }
 return null;
}
// For items without a Flower Style replacement, try the live Extra assets
// and the original 3-stage Core construction set. The procedural renderer
// handles missing/undecoded WebP art; removed legacy sprites are not fetched.
export function fallbackSpriteId(kind, rotation=0, state='complete', variation=0) {
 if(state==='complete'){
  const direction=FACINGS[((rotation%4)+4)%4];
  const extra=extraDirectional.get(`${kind}:${direction}`);
  if(extra)return extra;
  const single=extraSingle.get(kind);
  if(single)return single;
  const landscape=landscapeSprites.get(kind);
  if(landscape)return landscape;
 }
 return (state==='complete'?decorAssetId(kind,rotation,variation):(parkConstructionAssetId(kind,rotation,state)||buildingAssetId(kind,rotation,state)));
}
export function catalogSpriteId(kind, rotation=0, state='complete', variation=0) {
 if(state==='complete'){
  const direction=FACINGS[((rotation%4)+4)%4];
  const flower=flowerDirectional.get(`${canonicalFlowerId(kind)}:${direction}`);
  if(flower)return flower;
 }
 return fallbackSpriteId(kind,rotation,state,variation);
}
export function roadMaskId(roadSet,x,y) {
 const mask=(roadSet.has(`${x},${y-1}`)?1:0) |
 (roadSet.has(`${x+1},${y}`)?2:0) |
 (roadSet.has(`${x},${y+1}`)?4:0) |
 (roadSet.has(`${x-1},${y}`)?8:0);
 return `world_road_mask_${String(mask).padStart(2,'0')}`;
}
function notify(){try{onUpdate();}catch(error){console.warn('Sprite paint callback:',error);}}
function cleanupLRU(){
 if(cache.size<=MAX_CACHE)return;
 for(const [id,entry] of cache){
  if(entry.status==='loading'||pinnedScene.has(id))continue;
  cache.delete(id);
  if(cache.size<=MAX_CACHE)return;
 }
}
function spriteUrl(meta) {
 // An offline standalone HTML preview embeds precisely the same WebP assets.
 const embedded = typeof window!=='undefined' && window.ZeffiEmbeddedSprites;
 return embedded?.[meta.id] || `./${meta.fileWebp}`;
}
function load(meta){
 if(typeof Image==='undefined')return null;
 let entry=cache.get(meta.id);
 if(entry){
  cache.delete(meta.id);cache.set(meta.id,entry);
  return entry.status==='ready'?entry.image:null;
 }
 entry={status:'loading',image:new Image()};
 cache.set(meta.id,entry);cleanupLRU();
 const image=entry.image;
 image.decoding='async';
 image.onload=()=>{entry.status='ready';notify();cleanupLRU();};
 image.onerror=()=>{entry.status='failed';notify();cleanupLRU();};
 image.src=spriteUrl(meta);
 return null;
}
export function drawSprite(ctx,id,point){
 if(!enabled)return false;
 const meta=manifestById.get(id);if(!meta)return false;
 const image=load(meta);
 if(!image || !image.complete || image.naturalWidth===0)return false;
 const scale=meta.assetScale||SPRITE_MANIFEST.projection.spriteScale||3;
 try{
  ctx.drawImage(image, point.x-meta.anchorX/scale, point.y-meta.anchorY/scale, meta.width/scale, meta.height/scale);
  return true;
 }catch(error){console.warn('Sprite draw failed',id,error);return false;}
}
export function drawCatalogSprite(ctx,id,canvasWidth,canvasHeight){
 if(!enabled)return false;
 const meta=manifestById.get(id);if(!meta)return false;
 const image=load(meta);
 if(!image || !image.complete || !image.naturalWidth)return false;
 const margin=5;
 const ratio=Math.min((canvasWidth-margin*2)/meta.width,(canvasHeight-margin*2)/meta.height);
 const w=meta.width*ratio,h=meta.height*ratio;
 try{ctx.drawImage(image,(canvasWidth-w)/2,(canvasHeight-h)/2,w,h);return true;}
 catch(error){console.warn('Sprite thumbnail failed',id,error);return false;}
}
// Decode the art before exposing the city, never paint a procedural house
// because its directional WebP is merely pending. A bounded concurrent queue
// prevents hundreds of parallel image decodes in Telegram on iOS.
async function preloadOne(id){
 const meta=manifestById.get(id);
 if(!meta||typeof Image==='undefined')return false;
 if(cache.get(id)?.status==='failed')cache.delete(id); // Retry after network failure.
 const ready=load(meta);
 const picture=ready||cache.get(id)?.image;
 if(!picture)return false;
 try{
  if(typeof picture.decode==='function')await picture.decode();
  else if(!picture.complete){
   await new Promise(resolve=>{
    picture.addEventListener('load',resolve,{once:true});
    picture.addEventListener('error',resolve,{once:true});
    if(picture.complete)resolve();
   });
  }
 }catch{return false;}
 if(!picture.complete||!picture.naturalWidth)return false;
 const entry=cache.get(id);
 if(entry?.image===picture)entry.status='ready';
 return true;
}
export async function preloadSpriteSet(ids,{pin=false,onProgress=()=>{}}={}){
 const selected=[...new Set(ids)].filter(id=>manifestById.has(id));
 if(pin)for(const id of selected)pinnedScene.add(id);
 const outcome={total:selected.length,done:0,loaded:0,failed:0};
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(8,selected.length)},async()=>{
  while(cursor<selected.length){
   const id=selected[cursor++];
   if(await preloadOne(id))outcome.loaded++;
   else outcome.failed++;
   outcome.done++;
   onProgress({...outcome});
  }
 }));
 cleanupLRU();
 return outcome;
}
// Warm construction stages before server purchase, including acceleration FX.
export function preloadBuildFrames(kind,rotation=0){
 const ids=['build_01','build_02','build_03'].map(stage=>
   parkConstructionAssetId(kind,rotation,stage)||buildingAssetId(kind,rotation,stage)
 );
 ids.push(catalogSpriteId(kind,rotation,'complete'));
 return preloadSpriteSet(ids.filter(Boolean));
}
export function spriteStatus(){
 const values=[...cache.values()];
 return {enabled,available:manifestById.size,loaded:values.filter(e=>e.status==='ready').length,failed:values.filter(e=>e.status==='failed').length,loading:values.filter(e=>e.status.startsWith('loading')).length};
}
