#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js'),rating=read('rating.html'),gate=read('scripts/check-production-gate.mjs');
let failed=0;const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const definitions=between(worker,'const PLAYER_COLLECTION_COLLECTOR_ACHIEVEMENTS','const playerCollectionRarityCache');
const collector=between(worker,'function playerCollectionCollectorAchievementMetrics','function playerCollectionRarityFallback');
const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const profileEndpoint=between(worker,'async function leaderboardPlayerProfile(request, env) {','const FAST_RUN_SETTLEMENT_VERSION');

for(const id of ['collector-skins-10','collector-items-50','collector-legendary-5','collector-archive-5','collector-season-complete','collector-legendary-under-1'])check(`collector definition ${id} exists`,definitions.includes(`id:"${id}"`));
check('collector milestones are status-only with no reward grant',collector.includes('statusOnly:true')&&collector.includes('reward:null'));
check('10 skins milestone uses authoritative owned skin count',collector.includes('skins:Math.max(0,Number(summary?.categories?.skin||0))'));
check('50 items milestone uses public collection total',collector.includes('totalItems:Math.max(0,Number(summary?.totalItems||0))'));
check('5 legendary milestone uses public legendary count',collector.includes('legendaryCount:Math.max(0,Number(summary?.legendaryCount||0))'));
check('archive milestone uses server release-derived archive count',collector.includes('archivedCount:Math.max(0,Number(summary?.archivedCount||0))'));
check('season completion milestone consumes Stage 12 album completion',collector.includes('completedSeasons:seasonalAlbums.filter((album)=>album?.complete===true).length'));
check('ultra-rare social milestone requires a legendary at or below one percent',collector.includes('String(item?.rarity||"")==="legendary"')&&collector.includes('Number(item.playerRarity.ownershipPercent)<=1'));
check('full collection payload exposes collector achievements',endpoint.includes('collectorAchievements=playerCollectionCollectorAchievements')&&endpoint.includes('collectorAchievements,'));
check('mini-profile gets only lightweight earned collector preview',profileEndpoint.includes('playerCollectionCollectorAchievementPreview(collectionSummary,publicCollection.items)')&&profileEndpoint.includes('collectionAchievements,'));
check('mini-profile collector preview does not add the heavy rarity aggregate',!profileEndpoint.includes('playerCollectionRaritySnapshot(env)'));
check('client renders collector achievements in full collection',rating.includes('function playerCollectionCollectorAchievementsMarkup')&&rating.includes('Статус коллекционера'));
check('mini-profile renders earned collector badges',rating.includes('function playerProfileCollectorAchievementsMarkup')&&rating.includes('Статусные отметки за коллекцию'));
check('Stage 13 does not add a client write endpoint or local persistence',!rating.includes('PLAYER_COLLECTION_ACHIEVEMENT_PATH')&&!collector.includes('localStorage'));
check('Stage 13 check is wired into production gate',gate.includes("['player collection collector achievements', 'node', ['scripts/check-player-collection-stage13.mjs']]"));

if(failed){console.error(`Player collection stage 13 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 13 OK: collector achievements are server-derived status milestones with a lightweight profile preview.');
