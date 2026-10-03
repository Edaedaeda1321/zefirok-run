#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js'),rating=read('rating.html'),gate=read('scripts/check-production-gate.mjs');
let failed=0;const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const seasonalCatalog=between(worker,'function playerCollectionPublicSeasonCatalog(releaseSnapshot) {','function playerCollectionSeasonAlbums(items) {');
const albums=between(worker,'function playerCollectionSeasonAlbums(items) {','function playerCollectionCollectorAchievementMetrics');
const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const render=between(rating,'function renderPlayerCollection(data,activeTab=playerCollectionTab) {','function beginPlayerCollectionShowcaseEdit');
const click=between(rating,'playerCollectionLayer?.addEventListener("click",event=>{','playerCollectionLayer?.addEventListener("change",event=>{');

check('Stage 12 builds albums from the existing seasonal catalog',seasonalCatalog.includes('futureSeasonContentCatalog(kind)')&&seasonalCatalog.includes('seasonPassAnyCosmeticCatalog(kind)'));
check('never-released Live Content stays hidden from seasonal albums',seasonalCatalog.includes('if(!rule?.released&&!rule?.everReleased)continue'));
check('released and archived seasonal items retain server release state',seasonalCatalog.includes('released:Boolean(rule?.released)')&&seasonalCatalog.includes('everReleased:Boolean(rule?.everReleased)'));
check('season album grouping is server-side',albums.includes('groups=new Map()')&&albums.includes('seasonKey'));
check('season completion is calculated from public catalog ownership',albums.includes('ownedCount===totalItems')&&albums.includes('completionPercent'));
check('season album exposes legendary and archive progress',albums.includes('legendaryOwned')&&albums.includes('legendaryTotal')&&albums.includes('archivedOwned')&&albums.includes('archivedTotal'));
check('rarest owned seasonal collectible reuses Stage 4 player rarity',albums.includes('playerRarity?.known===true')&&albums.includes('ownershipPercent'));
check('full collection endpoint returns seasonal albums in the existing lazy payload',endpoint.includes('seasonAlbums:{known:releaseSnapshot.complete===true,items:seasonAlbums}'));
check('season metadata is computed without a new client endpoint',!worker.includes('/api/leaderboard/player-collection/season')&&!rating.includes('PLAYER_COLLECTION_SEASON_PATH'));
check('client renders seasonal album rail',rating.includes('function playerCollectionSeasonAlbumsMarkup')&&rating.includes('Сезонные альбомы'));
check('client renders an album detail summary',rating.includes('function playerCollectionSeasonDetailMarkup')&&rating.includes('Коллекция сезона завершена'));
check('album mode includes missing public items instead of only owned inventory',rating.includes('rating-player-collection-missing')&&rating.includes('Не собрано'));
check('album selection is local over the already loaded payload',click.includes('data-rating-player-collection-season')&&!between(click,'const season=target.closest','const compareMode').includes('api('));
check('album mode can return to the full collection',click.includes('data-rating-player-collection-season-close')&&click.includes('playerCollectionSeasonKey=""'));
check('collection open and close reset album state',rating.includes('playerCollectionCompareMode="all";playerCollectionSeasonKey="";playerCollectionShowcaseEditing=false'));
check('Stage 12 check is wired into production gate',gate.includes("['player collection seasonal albums', 'node', ['scripts/check-player-collection-stage12.mjs']]"));

if(failed){console.error(`Player collection stage 12 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 12 OK: public seasonal albums are release-gated, lazy and catalog-backed.');
