#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js');
const rating=read('rating.html');
const gate=read('scripts/check-production-gate.mjs');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const profileEndpoint=between(worker,'async function leaderboardPlayerProfile(request, env) {','async function leaderboardSeasonPassTierMap');
const catalog=between(worker,'function playerCollectionReleaseRulesFallback() {','function playerCollectionRarityFallback() {');
const prestige=between(rating,'function playerCollectionPrestigeMarkup(summary,items) {','function playerCollectionFiltersMarkup');
const css=between(rating,'<style id="rating-player-collection-stage6-7">','</style>');

check('stage 6 catalog metadata is bounded and fail-soft',worker.includes('const PLAYER_COLLECTION_CATALOG_TIMEOUT_MS = 1000;')&&catalog.includes('startupBounded("player collection catalog"')&&catalog.includes('playerCollectionReleaseRulesFallback()'));
check('catalog total is built from the existing cosmetic catalog',catalog.includes('seasonPassAnyCosmeticCatalog(kind)'));
check('default-owned cosmetics are excluded from completion denominator',catalog.includes('canonicalDefinition?.defaultOwned===true'));
check('catalog denominator de-duplicates normalized legacy aliases',catalog.includes('seen=new Set()')&&catalog.includes('seen.has(key)'));
check('never-released future cosmetics do not leak into completion',catalog.includes('if(!rule?.released&&!rule?.everReleased)continue'));
check('historically released archived cosmetics remain in completion denominator',catalog.includes('rule?.everReleased'));
check('full collection endpoint returns catalog total and completion',endpoint.includes('catalogKnown')&&endpoint.includes('catalogTotal:catalogSummary.totalItems')&&endpoint.includes('completionPercent'));
check('catalog categories are aggregate-only public metadata',endpoint.includes('catalogCategories:catalogSummary.categories'));
check('stage 6 catalog read is lazy and not added to mini-profile endpoint',endpoint.includes('playerCollectionReleaseRulesSnapshot(env)')&&!profileEndpoint.includes('playerCollectionReleaseRulesSnapshot(env)'));
check('existing mini-profile summary still uses lightweight public collection summary',profileEndpoint.includes('publicCollection=await playerPublicCollection(env,collectionState)'));
check('prestige header shows completion and total public catalog',prestige.includes('Статус коллекции')&&prestige.includes('catalogTotal')&&prestige.includes('публичных предметов'));
check('prestige header shows total archived and legendary counts',prestige.includes('архивных')&&prestige.includes('легендарных')&&prestige.includes('rating-player-collection-overview-card'));
check('rarest item is selected from already loaded aggregate player rarity',rating.includes('function playerCollectionRarestItem(items)')&&rating.includes('item?.playerRarity?.known===true')&&prestige.includes('playerCollectionRarestItem(items)'));
check('rarest item opens through the existing detail-card trigger',prestige.includes('data-rating-player-collection-item')&&prestige.includes('Самый редкий предмет'));
check('prestige header adds no item-detail API request',!prestige.includes('api(')&&!prestige.includes('fetch('));
check('completion ring has reduced-motion fallback',css.includes('rating-player-collection-completion')&&css.includes('@media(prefers-reduced-motion:reduce)'));
check('stage 6 check is wired into production gate',gate.includes("['player collection prestige header', 'node', ['scripts/check-player-collection-stage6.mjs']]"));

if(failed){console.error(`Player collection stage 6 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 6 OK: prestige summary is server-grounded, unreleased content stays private, and the mini-profile remains lightweight.');
