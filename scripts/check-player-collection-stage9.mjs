#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const worker=read('src/worker.js'),rating=read('rating.html'),gate=read('scripts/check-production-gate.mjs'),migrationName='0113_player_collection_showcase.sql',migration=read(`migrations/${migrationName}`),lock=JSON.parse(read('scripts/migration-history.lock.json'));
let failed=0; const check=(name,condition)=>{console.log(`${condition?'PASS':'FAIL'}  ${name}`);if(!condition)failed+=1;};
const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);return a>=0&&b>a?source.slice(a,b):'';};
const saveEndpoint=between(worker,'async function saveLeaderboardPlayerCollectionShowcase(request, env) {','async function leaderboardPlayerCollection(request, env) {');
const profileEndpoint=between(worker,'async function leaderboardPlayerProfile(request, env) {','const FAST_RUN_SETTLEMENT_VERSION');
const render=between(rating,'function renderPlayerCollection(data,activeTab=playerCollectionTab) {','async function loadPlayerCollection');
const saveClient=between(rating,'async function savePlayerCollectionShowcase() {','async function loadPlayerCollection');

check('Stage 9 migration creates a dedicated showcase table',migration.includes('CREATE TABLE IF NOT EXISTS player_collection_showcase'));
check('showcase schema caps slot numbers at five',migration.includes('CHECK(slot BETWEEN 1 AND 5)'));
check('showcase schema restricts cosmetic kinds',migration.includes("CHECK(kind IN ('skin','avatar','frame','trail','music'))"));
check('showcase schema prevents duplicate item selection per player',migration.includes('UNIQUE (telegram_id, kind, item_id)'));
check('migration history lock contains Stage 9 migration',typeof lock?.files?.[migrationName]==='string'&&/^[a-f0-9]{64}$/.test(lock.files[migrationName]));
check('server exposes authenticated showcase write route',worker.includes('url.pathname === "/api/leaderboard/player-collection/showcase"')&&worker.includes('saveLeaderboardPlayerCollectionShowcase(request, env)'));
check('showcase write identity comes only from Telegram auth user',saveEndpoint.includes('validateTelegramInitData')&&saveEndpoint.includes('telegramId=String(auth.user.id)')&&!saveEndpoint.includes('targetTelegramId'));
check('server enforces a maximum of five items',worker.includes('const PLAYER_COLLECTION_SHOWCASE_LIMIT = 5')&&saveEndpoint.includes('rawItems.length>PLAYER_COLLECTION_SHOWCASE_LIMIT'));
check('server rejects duplicate showcase items',saveEndpoint.includes('seen.has(key)')&&saveEndpoint.includes('Один предмет нельзя добавить в витрину дважды'));
check('server validates showcase selection against current public owned collection',saveEndpoint.includes('playerPublicCollection(env,state')&&saveEndpoint.includes('publicByKey')&&saveEndpoint.includes('В витрину можно добавить только предмет из своей публичной коллекции'));
check('showcase persistence replaces slots atomically through D1 batch',saveEndpoint.includes('DELETE FROM player_collection_showcase')&&saveEndpoint.includes('INSERT INTO player_collection_showcase')&&saveEndpoint.includes('env.DB.batch(statements)'));
check('public showcase read drops stale unowned or hidden items',worker.includes('function playerCollectionShowcaseFromEnriched')&&worker.includes('if(!key||seen.has(key)||!byKey.has(key))continue'));
check('full collection payload exposes showcase with owner-only edit capability',worker.includes('showcase:{...showcase,editable:isSelf}'));
check('mini-profile response includes collection showcase',profileEndpoint.includes('collectionShowcase')&&profileEndpoint.includes('playerCollectionShowcaseFromEnriched'));
check('mini-profile renders a five-slot collection showcase',rating.includes('function playerProfileCollectionShowcaseMarkup')&&rating.includes('Array.from({length:PLAYER_COLLECTION_SHOWCASE_LIMIT}')&&rating.includes('Витрина коллекции'));
check('collection screen renders owner showcase and edit action',rating.includes('function playerCollectionShowcaseMarkup')&&rating.includes('data-rating-player-collection-showcase-edit'));
check('editor toggles only owned target items',rating.includes('function togglePlayerCollectionShowcaseItem')&&rating.includes('item?.owned===false')&&rating.includes('PLAYER_COLLECTION_SHOWCASE_LIMIT'));
check('client save sends only selected kind and item id',saveClient.includes('PLAYER_COLLECTION_SHOWCASE_PATH')&&saveClient.includes('items:payload')&&saveClient.includes('kind:String(item?.kind')&&saveClient.includes('itemId:String(item?.itemId'));
check('successful save refreshes collection cache and mini-profile cache',saveClient.includes('playerCollectionCache.set')&&saveClient.includes('playerProfileCache.set')&&saveClient.includes('collectionShowcase'));
check('Stage 9 does not use localStorage as persistence',!saveClient.includes('localStorage')&&!saveEndpoint.includes('localStorage'));
check('Stage 9 editor adds no background polling or recurring network request',!render.includes('setInterval')&&!saveClient.includes('setInterval'));
check('stage 9 check is wired into production gate',gate.includes("['player collection showcase', 'node', ['scripts/check-player-collection-stage9.mjs']]"));

try {
  const db=new DatabaseSync(':memory:');
  db.exec(migration);
  db.prepare(`INSERT INTO player_collection_showcase(telegram_id,slot,kind,item_id,updated_at) VALUES(?,?,?,?,?)`).run('1001',1,'skin','alex',1);
  let duplicateRejected=false;try{db.prepare(`INSERT INTO player_collection_showcase(telegram_id,slot,kind,item_id,updated_at) VALUES(?,?,?,?,?)`).run('1001',2,'skin','alex',2);}catch{duplicateRejected=true;}
  let slotRejected=false;try{db.prepare(`INSERT INTO player_collection_showcase(telegram_id,slot,kind,item_id,updated_at) VALUES(?,?,?,?,?)`).run('1001',6,'frame','heart',2);}catch{slotRejected=true;}
  check('migration constraints reject duplicate item rows in real SQLite',duplicateRejected);
  check('migration constraints reject slot six in real SQLite',slotRejected);
  db.close();
} catch(error) {
  console.error('SQLite Stage 9 migration fixture failed:',error?.message||error);failed+=1;
}

if(failed){console.error(`Player collection stage 9 failed: ${failed} check(s).`);process.exit(1);}
console.log('Player collection stage 9 OK: showcase is server-authoritative, ownership-validated and migration-backed.');
