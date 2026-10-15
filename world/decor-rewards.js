// Single allowlist shared by CC rewards, cases and the authoritative World server.
// Strictly existing, non-retired category=decor objects: no homes, parks or roads.
import {CATALOG_ITEMS, CATALOG} from './catalog.js';
import {RU} from './ru.js';

export const WORLD_DECOR_KIND = 'world_decor';
export const WORLD_DECOR_PASS_PREFIX = 'world_decor:';
export const WORLD_DECOR_MAX_GRANT = 20;

// User-supplied decoration illustrations; remaining variants reuse their live World sprites.
const DECOR_IMAGES = Object.freeze({
  "tree": "/assets/mir_zeffi/decor-reward-thumbs/tree.webp",
  "flowerbed": "/assets/mir_zeffi/decor-reward-thumbs/flowerbed.webp",
  "lamp": "/assets/mir_zeffi/decor-reward-thumbs/lamp.webp",
  "bench": "/assets/mir_zeffi/decor-reward-thumbs/bench.webp",
  "fountain": "/assets/mir_zeffi/decor-reward-thumbs/fountain.webp",
  "monument": "/assets/mir_zeffi/decor-reward-thumbs/monument.webp",
  "extra-flowerbed": "/assets/mir_zeffi/decor-reward-thumbs/extra-flowerbed.webp",
  "extra-bush": "/assets/mir_zeffi/decor-reward-thumbs/extra-bush.webp",
  "extra-tree": "/assets/mir_zeffi/decor-reward-thumbs/extra-tree.webp",
  "extra-lamp": "/assets/mir_zeffi/decor-reward-thumbs/extra-lamp.webp",
  "extra-bench": "/world/assets/flower-style-v1/webp/decor/bench_n.webp",
  "extra-planter": "/world/assets/extra/webp/decor/decor_planter.webp",
  "extra-arch": "/world/assets/extra/webp/decor/decor_arch.webp",
  "extra-fountain": "/world/assets/flower-style-v1/webp/decor/fountain_n.webp",
  "extra-sign": "/world/assets/extra/webp/decor/decor_sign.webp",
  "extra-sweet_object": "/world/assets/extra/webp/decor/decor_sweet_object.webp"
});

export const WORLD_REWARD_DECORS = Object.freeze(CATALOG_ITEMS
  .filter(item => item.category === 'decor' && !item.retired && !item.giftOnly)
  .map(item => Object.freeze({
    id:item.id, title:String(RU[item.titleKey]||item.id),
    width:item.w,height:item.h,category:'decor',
    imageUrl:DECOR_IMAGES[item.id]||'/assets/ui/icon_prize.webp'
  })));

export const WORLD_REWARD_DECOR_BY_ID = Object.freeze(Object.fromEntries(WORLD_REWARD_DECORS.map(item=>[item.id,item])));
export function worldRewardDecor(id){
  const name=String(id||'');
  return CATALOG[name]?.category==='decor'&&!CATALOG[name]?.retired?WORLD_REWARD_DECOR_BY_ID[name]||null:null;
}
export function worldDecorGiftUsage(city,id){
  return (city?.objects||[]).reduce((n,item)=>n+(item.kind===id&&item.giftDecor===true?1:0),0);
}
