#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const rating=read('rating.html');
const worker=read('src/worker.js');
const gate=read('scripts/check-production-gate.mjs');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const prestigeCss=between(rating,'<style id="rating-player-collection-prestige-motion">','</style>');
const prestigeHelpers=between(rating,'function playerCollectionMotionReduced() {','function playerCollectionStatusMarkup');
const itemOpen=between(rating,'function openPlayerCollectionItem(item,trigger=null) {','function closePlayerCollectionItem(options={})');
const render=between(rating,'function renderPlayerCollection(data,activeTab=playerCollectionTab) {','async function loadPlayerCollection');
const prestigeSummary=between(rating,'function playerCollectionPrestigeMarkup(summary,items) {','function playerCollectionFiltersMarkup');
const close=between(rating,'function closePlayerCollection(options={}) {','function cancelPlayerProfileMotion');

check('stage 5 prestige stylesheet exists',prestigeCss.includes('Stage 5: rarity prestige motion'));
check('super rare receives its own motion treatment',prestigeCss.includes('data-rarity="superrare"')&&prestigeCss.includes('rating-player-collection-aura-soft'));
check('epic receives its own motion treatment',prestigeCss.includes('data-rarity="epic"')&&prestigeCss.includes('#ffe5f2'));
check('mythic has stronger aura and sparkles',prestigeCss.includes('data-rarity="mythic"')&&prestigeCss.includes('rating-player-collection-spark 4.8s'));
check('legendary is the maximum visual treatment',prestigeCss.includes('data-rarity="legendary"')&&prestigeCss.includes('rating-player-collection-aura-legendary')&&prestigeCss.includes('rating-player-collection-shine-legendary')&&prestigeCss.includes('rating-player-collection-spark-legendary'));
check('legendary detail has a dedicated hero reveal',prestigeCss.includes('rating-player-collection-detail-legendary-in')&&prestigeCss.includes('rating-player-collection-detail-flare')&&itemOpen.includes('rating-player-collection-legendary-flare'));
check('legendary detail is tagged from already loaded item rarity',itemOpen.includes('playerCollectionDetailCard.dataset.rarity=rarityId'));
check('legendary opening uses medium haptic only as presentation',itemOpen.includes('rarityId==="legendary"?"medium":"light"'));
check('mythic and legendary are the only particle-heavy grid tiers',prestigeHelpers.includes('key!=="mythic"&&key!=="legendary"'));
check('continuous rarity motion is viewport gated',prestigeHelpers.includes('new IntersectionObserver')&&prestigeHelpers.includes('entry.target.classList.toggle("is-rarity-active",entry.isIntersecting)'));
check('observer uses collection scroll body as root',prestigeHelpers.includes('root:playerCollectionBody'));
check('observer is disconnected before rerender and close',prestigeHelpers.includes('disconnectPlayerCollectionRarityMotion')&&close.includes('disconnectPlayerCollectionRarityMotion()'));
check('reduced-motion is respected in JS',prestigeHelpers.includes('(prefers-reduced-motion: reduce)')&&prestigeHelpers.includes('playerCollectionMotionReduced()'));
check('reduced-motion is respected in CSS',prestigeCss.includes('@media(prefers-reduced-motion:reduce)'));
check('grid arrival is staggered and bounded',prestigeHelpers.includes('Math.min(8')&&render.includes('playerCollectionItemMarkup(item,index)'));
check('legendary overview count receives prestige without extra data',render.includes('playerCollectionPrestigeMarkup(summary,items)')&&prestigeSummary.includes('is-legendary${legendary?" has-items":""}'));
check('stage 5 does not add a collection API request',!prestigeHelpers.includes('api(')&&!itemOpen.includes('api(')&&!itemOpen.includes('fetch('));
check('stage 5 does not change server collection authority',!worker.includes('rating-player-collection-prestige-motion'));
check('stage 4 discovery metadata is still present',rating.includes('playerCollectionHowToGetMarkup(item)')&&rating.includes('playerCollectionPopulationMarkup(item)'));
check('stage 5 check is wired into production gate',gate.includes("['player collection prestige motion', 'node', ['scripts/check-player-collection-stage5.mjs']]"));

if(failed){console.error(`Player collection stage 5 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 5 OK: rarity motion is progressive, legendary is the strongest tier, detail reveal stays local, and continuous effects are viewport-gated.');
