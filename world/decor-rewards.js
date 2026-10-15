// Single allowlist shared by CC rewards, cases and the authoritative World server.
// Strictly existing, non-retired category=decor objects: no homes, parks or roads.
import {CATALOG_ITEMS, CATALOG} from './catalog.js';
import {RU} from './ru.js';

export const WORLD_DECOR_KIND = 'world_decor';
export const WORLD_DECOR_PASS_PREFIX = 'world_decor:';
export const WORLD_DECOR_MAX_GRANT = 20;

export const WORLD_REWARD_DECORS = Object.freeze(CATALOG_ITEMS
  .filter(item => item.category === 'decor' && !item.retired && !item.giftOnly)
  .map(item => Object.freeze({
    id:item.id, title:String(RU[item.titleKey]||item.id),
    width:item.w,height:item.h,category:'decor',
    // Until prize art is approved, CC uses a neutral existing prize icon.
    imageUrl:'/assets/ui/icon_prize.webp'
  })));

export const WORLD_REWARD_DECOR_BY_ID = Object.freeze(Object.fromEntries(WORLD_REWARD_DECORS.map(item=>[item.id,item])));
export function worldRewardDecor(id){
  const name=String(id||'');
  return CATALOG[name]?.category==='decor'&&!CATALOG[name]?.retired?WORLD_REWARD_DECOR_BY_ID[name]||null:null;
}
export function worldDecorGiftUsage(city,id){
  return (city?.objects||[]).reduce((n,item)=>n+(item.kind===id&&item.giftDecor===true?1:0),0);
}
