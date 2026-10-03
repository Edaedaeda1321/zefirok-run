#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const rating=fs.readFileSync(path.join(root,'rating.html'),'utf8');
const gate=fs.readFileSync(path.join(root,'scripts/check-production-gate.mjs'),'utf8');
let failed=0;const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const fx=between(rating,'function playerCollectionLegendaryKindFxMarkup','function playerCollectionMusicPreviewSafeUrl');
const item=between(rating,'function playerCollectionItemMarkup','function playerCollectionStatusMarkup');
const detail=between(rating,'function openPlayerCollectionItem','function closePlayerCollectionItem');

for(const kind of ['skin','avatar','frame','trail','music']){
  check(`legendary ${kind} has a distinct type effect`,rating.includes(`is-${kind}`)&&rating.includes(`data-item-kind="${kind}"`)||rating.includes(`[data-kind="${kind}"]`));
  check(`type FX helper supports ${kind}`,fx.includes(`${kind}:`));
}
check('type-specific effects are only emitted for legendary rarity',fx.includes('!=="legendary"')&&fx.includes('return ""'));
check('grid cards reuse existing kind without backend requests',item.includes('playerCollectionLegendaryKindFxMarkup(kind,rarity)')&&!item.includes('api('));
check('detail reveal reuses loaded item kind',detail.includes('playerCollectionLegendaryKindFxMarkup(kind,rarityId)')&&detail.includes('dataset.kind=kind'));
check('detail cleanup removes type state',rating.includes('delete playerCollectionDetailCard.dataset.kind'));
check('legendary music visualizer reacts to preview playback',rating.includes('is-music-preview-playing[data-rarity="legendary"][data-kind="music"]'));
check('reduced motion disables Stage 14 animation',rating.includes('@media(prefers-reduced-motion:reduce)')&&rating.includes('rating-player-collection-legendary-kind-fx'));
check('Stage 14 adds no client endpoint',!rating.includes('PLAYER_COLLECTION_PRESTIGE_EFFECT_PATH'));
check('Stage 14 check is wired into production gate',gate.includes("['player collection legendary type effects', 'node', ['scripts/check-player-collection-stage14.mjs']]"));

if(failed){console.error(`Player collection stage 14 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 14 OK: legendary cosmetics have distinct type-specific motion without changing rarity or ownership logic.');
