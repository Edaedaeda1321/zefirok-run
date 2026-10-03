#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js');
const rating=read('rating.html');
const gate=read('scripts/check-production-gate.mjs');
let failed=0;
function check(name,condition){console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;}
function between(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';}

const endpoint=between(worker,'async function leaderboardPlayerCollection(request, env) {','async function leaderboardPlayerProfile(request, env) {');
const publicItem=between(worker,'function playerCollectionPublicItem(state, kind, rawItemId, releaseRules = null) {','async function playerPublicCollection(env, state');
const acquisition=between(worker,'function playerCollectionAcquisitionView(item, acquisition) {','function playerCollectionPublicSource(kind, itemId, definition, future) {');
const acquisitionFallback=between(worker,'function albumAcquisitionBaselineSources(){','function withAlbumAcquisitionTimeout(promise, timeoutMs = ALBUM_ACQUISITION_TIMEOUT_MS) {');
const rarity=between(worker,'function playerCollectionRarityFallback() {','function playerCollectionAcquisitionView(item, acquisition) {');
const itemOpen=between(rating,'function openPlayerCollectionItem(item,trigger=null) {','function closePlayerCollectionItem(options={})');
const howTo=between(rating,'function playerCollectionHowToGetMarkup(item) {','function playerCollectionHistoryMarkup(item) {');
const history=between(rating,'function playerCollectionHistoryMarkup(item) {','function playerCollectionPopulationMarkup(item) {');
const population=between(rating,'function playerCollectionPopulationMarkup(item) {','function openPlayerCollectionItem(item,trigger=null) {');

check('stage 4 uses existing acquisition metadata instead of client guesses',endpoint.includes('withAlbumAcquisitionTimeout(albumAcquisitionSources(env))'));
check('acquisition metadata is bounded and fail-soft',worker.includes('const ALBUM_ACQUISITION_TIMEOUT_MS = 1200;')&&endpoint.includes('withAlbumAcquisitionTimeout('));
check('cold acquisition fallback keeps canonical case provenance',acquisitionFallback.includes('albumCaseAcquisitionSources(null)')&&acquisitionFallback.includes('availability:"unknown"'));
check('cold acquisition fallback keeps built-in skin shop provenance',acquisitionFallback.includes('Object.keys(SKINS)')&&acquisitionFallback.includes('type:"shop"')&&acquisitionFallback.includes('availability:"conditional"'));
check('acquisition fallback is not an empty map',acquisitionFallback.includes('albumAcquisitionFallback(){return {map:albumAcquisitionBaselineSources(),complete:false};}'));
check('season origin is server-authored',publicItem.includes('season:future?{key:seasonKey,label:seasonLabel}:null'));
check('season 3 label is normalized for public history',worker.includes('return `Сезон 3 · ${label}`'));
check('never-released hidden seasonal content remains private',publicItem.includes('if (!rule?.released && !rule?.everReleased) return null;'));
check('archived seasonal state comes from release history',acquisition.includes('release.everReleased===true&&release.released===false')&&acquisition.includes('status="archived"'));
check('how-to-get sources are public and capped',acquisition.includes('rawSources.slice(0,4)')&&acquisition.includes('text:String(source?.text||"").slice(0,360)'));
check('endpoint returns availability and how-to-get metadata',endpoint.includes('availability,')&&endpoint.includes('howToGet:availability.sources'));
check('endpoint returns aggregate player rarity only',endpoint.includes('playerRarity:itemId?playerCollectionRarityView')&&!endpoint.includes('rarityOwners'));
check('rarity aggregate is cached for ten minutes',worker.includes('const PLAYER_COLLECTION_RARITY_CACHE_TTL_MS = 10 * 60 * 1000;')&&worker.includes('const playerCollectionRarityCache = new WeakMap();'));
check('rarity aggregate is bounded and fail-soft',worker.includes('const PLAYER_COLLECTION_RARITY_TIMEOUT_MS = 1100;')&&endpoint.includes('withPlayerCollectionRarityTimeout(playerCollectionRaritySnapshot(env))'));
check('rarity query counts distinct owners',rarity.includes('COUNT(DISTINCT telegram_id) AS owner_count'));
check('stage 4 metadata reads run in parallel',endpoint.includes('Promise.all([\n      withAlbumAcquisitionTimeout')&&endpoint.includes('withPlayerCollectionRarityTimeout'));
check('self-view still avoids the second cosmetic D1 read',endpoint.includes('let viewerState=targetState;')&&endpoint.includes('if(!isSelf){'));
check('summary exposes only aggregate available/archive counts',endpoint.includes('availableCount:items.filter')&&endpoint.includes('archivedCount:items.filter'));
check('public endpoint does not expose economy or prices',!endpoint.includes('wallet')&&!endpoint.includes('zefir')&&!endpoint.includes('coffee_balance')&&!endpoint.includes('price'));
check('grid marks archived items without hiding ownership',rating.includes('rating-player-collection-archive')&&rating.includes('data-availability='));
check('detail card renders how-to-get section',howTo.includes('Как получить')&&itemOpen.includes('playerCollectionHowToGetMarkup(item)'));
check('grid and detail prefer discovered source summary',rating.includes('item?.availability?.sourceSummary||item?.season?.label')&&itemOpen.includes('sourceHeading=source.includes(" · ")?"Источники":"Источник"'));
check('detail card renders seasonal history',history.includes('История предмета')&&history.includes('item?.season'));
check('detail card renders aggregate rarity among players',population.includes('Редкость среди игроков')&&population.includes('ownerCount')&&population.includes('playerCount'));
check('optional rarity failure does not break collection UI',population.includes('Статистика временно недоступна'));
check('detail remains local to already loaded payload',!itemOpen.includes('api(')&&!itemOpen.includes('fetch('));
check('stage 4 does not add wishlist market or exchange writes',!endpoint.includes('wishlist')&&!endpoint.includes('market')&&!endpoint.includes('exchange'));
check('stage 4 check is wired into production gate',gate.includes("['player collection discovery metadata', 'node', ['scripts/check-player-collection-stage4.mjs']]"));

try{
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE case_player_state(
    telegram_id TEXT PRIMARY KEY,
    owned_avatars_json TEXT,owned_frames_json TEXT,owned_trails_json TEXT,owned_skins_json TEXT,owned_music_json TEXT
  );`);
  const insert=db.prepare('INSERT INTO case_player_state VALUES(?,?,?,?,?,?)');
  insert.run('1','["royal"]','["mint"]','["gold"]','["bee"]','["legendary_cafe_run"]');
  insert.run('2','["royal"]','["lovers"]','[]','["bee"]','[]');
  insert.run('3','[]','["gold"]','[]','[]','[]');
  const rows=db.prepare(`WITH ownership(kind,item_id,telegram_id) AS (
    SELECT 'avatar',CAST(j.value AS TEXT),c.telegram_id FROM case_player_state c,json_each(CASE WHEN json_valid(c.owned_avatars_json) THEN c.owned_avatars_json ELSE '[]' END) j
    UNION ALL
    SELECT 'frame',CASE CAST(j.value AS TEXT) WHEN 'mint' THEN 'lovers' WHEN 'flower' THEN 'lovers' WHEN 'gold' THEN 'princess' ELSE CAST(j.value AS TEXT) END,c.telegram_id FROM case_player_state c,json_each(CASE WHEN json_valid(c.owned_frames_json) THEN c.owned_frames_json ELSE '[]' END) j
    UNION ALL
    SELECT 'trail',CAST(j.value AS TEXT),c.telegram_id FROM case_player_state c,json_each(CASE WHEN json_valid(c.owned_trails_json) THEN c.owned_trails_json ELSE '[]' END) j
    UNION ALL
    SELECT 'skin',CAST(j.value AS TEXT),c.telegram_id FROM case_player_state c,json_each(CASE WHEN json_valid(c.owned_skins_json) THEN c.owned_skins_json ELSE '[]' END) j
    UNION ALL
    SELECT 'music',CAST(j.value AS TEXT),c.telegram_id FROM case_player_state c,json_each(CASE WHEN json_valid(c.owned_music_json) THEN c.owned_music_json ELSE '[]' END) j
  )
  SELECT kind,item_id,COUNT(DISTINCT telegram_id) AS owner_count,(SELECT COUNT(*) FROM case_player_state) AS player_count
  FROM ownership WHERE item_id<>'' GROUP BY kind,item_id`).all();
  const map=new Map(rows.map(row=>[`${row.kind}:${row.item_id}`,row]));
  check('rarity SQL works in SQLite JSON1',map.get('avatar:royal')?.owner_count===2&&map.get('avatar:royal')?.player_count===3);
  check('rarity SQL normalizes legacy frame aliases before counting',map.get('frame:lovers')?.owner_count===2&&map.get('frame:princess')?.owner_count===1);
  db.close();
}catch(error){console.error(error);check('rarity SQL works in SQLite JSON1',false);check('rarity SQL normalizes legacy frame aliases before counting',false);}

if(failed){console.error(`Player collection stage 4 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 4 OK: acquisition, seasonal history, archive state and aggregate ownership rarity are server-derived and fail-soft.');
