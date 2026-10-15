import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {CATALOG} from '../catalog.js';
import {WORLD_REWARD_DECORS,worldRewardDecor,worldDecorGiftUsage} from '../decor-rewards.js';
import {CITY_CHAPTERS,cityChapterViews} from '../city-chapters.js';
import {makeInitialCity,addGiftDecor,sanitizeCity,cityStats,BuildError} from '../engine.js';
import {decorGrantStatements,claimCityChapter,readWorldExtras} from '../../src/zeffi-world-decor.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const migration=fs.readFileSync(resolve(root,'migrations/0123_zeffi_world_decor_and_chapters.sql'),'utf8');
const player='1234567890';

function sqliteD1(){
 const sql=new DatabaseSync(':memory:');sql.exec(migration);
 sql.exec(`CREATE TABLE zeffi_world_cities (telegram_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, state_json TEXT NOT NULL);
 CREATE TABLE season_pass_claims (season_id TEXT,telegram_id TEXT,level INTEGER,lane TEXT,status TEXT,PRIMARY KEY(season_id,telegram_id,level,lane));
 CREATE TABLE season_pass_case_grants (grant_id TEXT PRIMARY KEY,telegram_id TEXT,status TEXT,opening_token TEXT,open_request_id TEXT);`);
 const adapter={
  prepare(query){const statement=sql.prepare(query);return {
    bind(...values){return {
      run:async()=>{const result=statement.run(...values);return{meta:{changes:Number(result.changes)}};},
      first:async()=>statement.get(...values)||null,
      all:async()=>({results:statement.all(...values)}),
      statement,values
    }} ,
    all:async()=>({results:statement.all()}),
    first:async()=>statement.get()||null
   }},
  async batch(stmts){sql.exec('BEGIN IMMEDIATE');try{const out=[];for(const q of stmts){const result=q.statement.run(...q.values);out.push({meta:{changes:Number(result.changes)}})}sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}
 };
 return {adapter,sql};
}

function buildFakeGiftCity(){return makeInitialCity();}

test('only existing decor is eligible, never buildings, parks, roads or retired objects',()=>{
 assert.equal(WORLD_REWARD_DECORS.length>10,true);
 for(const item of WORLD_REWARD_DECORS){assert.equal(CATALOG[item.id].category,'decor');assert.equal(Boolean(CATALOG[item.id].retired),false);assert.ok(worldRewardDecor(item.id));}
 for(const bad of ['cottage','garden','path-straight','coffee-house','terrain_platform_basic','__proto__'])assert.equal(worldRewardDecor(bad),null);
 for(const chapter of CITY_CHAPTERS)assert.ok(worldRewardDecor(chapter.rewardDecor));
});

test('gift placement does not charge wallet; sanitization preserves ownership provenance, warehouse reuse consumes same copy',()=>{
 const city=buildFakeGiftCity();const wallet=structuredClone(city.wallet);
 // A 1x1 decor fits anywhere inside the initial plot that has no street.
 const gifted=addGiftDecor(city,CATALOG,'extra-bench',3,3,0,Date.now());
 assert.deepEqual(gifted.wallet,wallet);
 assert.equal(gifted.objects.at(-1).giftDecor,true);
 assert.equal(worldDecorGiftUsage(gifted,'extra-bench'),1);
 const stored=structuredClone(gifted);stored.objects.at(-1).stored=true;stored.objects.at(-1).x=null;stored.objects.at(-1).y=null;
 assert.equal(worldDecorGiftUsage(stored,'extra-bench'),1);
 const roundTrip=sanitizeCity(JSON.parse(JSON.stringify(stored)),CATALOG);
 assert.equal(roundTrip.objects.at(-1).giftDecor,true);
 assert.equal(worldDecorGiftUsage(roundTrip,'extra-bench'),1);
 assert.throws(()=>addGiftDecor(city,CATALOG,'cottage',3,3),err=>err instanceof BuildError&&err.code==='GIFT_DECOR_ONLY');
});

test('city chapters are long-lived ordered achievements, progress is based on real server-compatible stats',()=>{
 const city=buildFakeGiftCity();
 const chapters=cityChapterViews(city,CATALOG,[]);
 assert.deepEqual(chapters.map(c=>c.id),CITY_CHAPTERS.map(c=>c.id));
 assert.equal(chapters[0].claimed,false);
 assert.equal(chapters[1].unlocked,false);
 assert.equal(chapters[0].canClaim,false);
 assert.equal(chapters[0].steps.find(s=>s.id==='roads').value,cityStats(city,CATALOG).roads);
 assert.equal(chapters.length,5);
 assert.deepEqual(chapters.slice(3).map(c=>c.unlocked),[false,false]);
});

test('SQL migration and identical grant receipts are idempotent even across retries',async()=>{
 const {adapter:db,sql}=sqliteD1();const args={telegramId:player,decorId:'extra-bench',amount:3,sourceKey:'season-pass:demo:3:free',now:10000};
 await db.batch(decorGrantStatements(db,args));
 await db.batch(decorGrantStatements(db,{...args,now:10001}));
 let owned=sql.prepare('SELECT total FROM zeffi_world_decor_owned WHERE telegram_id=? AND decor_id=?').get(player,'extra-bench');
 assert.equal(owned.total,3);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM zeffi_world_decor_grants').get().n,1);
 await db.batch(decorGrantStatements(db,{...args,sourceKey:'seasonal-case:grant-1:0',amount:2,now:10002}));
 owned=sql.prepare('SELECT total FROM zeffi_world_decor_owned WHERE telegram_id=? AND decor_id=?').get(player,'extra-bench');
 assert.equal(owned.total,5);
 assert.throws(()=>decorGrantStatements(db,{...args,decorId:'garden'}),/INVALID_DECOR_GRANT/);
 sql.close();
});

test('SQL gate blocks unclaimed season pass reward and accepts exactly a pending claim',async()=>{
 const {adapter:db,sql}=sqliteD1();const gate="EXISTS(SELECT 1 FROM season_pass_claims WHERE season_id=? AND telegram_id=? AND level=? AND lane=? AND status='pending')";
 const args={telegramId:player,decorId:'extra-tree',amount:2,sourceKey:'season-pass:s1:12:premium',now:10000,gateSql:gate,gateBinds:['s1',player,12,'premium']};
 await db.batch(decorGrantStatements(db,args));
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM zeffi_world_decor_grants').get().n,0);
 sql.prepare("INSERT INTO season_pass_claims VALUES(?,?,?,?,?)").run('s1',player,12,'premium','pending');
 await db.batch(decorGrantStatements(db,args));
 sql.prepare("UPDATE season_pass_claims SET status='claimed'").run();
 await db.batch(decorGrantStatements(db,args));
 assert.equal(sql.prepare('SELECT SUM(amount) AS n FROM zeffi_world_decor_grants').get().n,2);
 assert.equal(sql.prepare('SELECT total FROM zeffi_world_decor_owned').get().total,2);
 sql.close();
});

test('server chapter rejects incomplete city; missing migration never grants compensation',async()=>{
 const {adapter:db,sql}=sqliteD1();const city=buildFakeGiftCity();
 sql.prepare('INSERT INTO zeffi_world_cities VALUES(?,?,?)').run(player,0,JSON.stringify(city));
 await assert.rejects(()=>claimCityChapter(db,player,city,CATALOG,0,'warm-welcome'),{code:'CITY_CHAPTER_INCOMPLETE'});
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM zeffi_world_decor_grants').get().n,0);
 const extras=await readWorldExtras(db,player,city,CATALOG);
 assert.equal(extras.decorInventory.enabled,true);
 assert.equal(extras.cityChapters.items.length,5);
 sql.close();
});

test('completed city chapter pays once and stays claimed after goal values change',async()=>{
 const {adapter:db,sql}=sqliteD1();const city=makeInitialCity();
 const rows=[['family-home',8,11],['family-home',12,11],['garden',1,1],['monument',2,6],['fountain',5,5]];
 for(const [kind,x,y] of rows){city.objects.push({uid:`obj-${city.nextId++}`,kind,x,y,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});}
 const snap=cityStats(city,CATALOG);
 assert.ok(snap.population>=8,JSON.stringify(snap));
 assert.ok(snap.comfort>=60,JSON.stringify(snap));
 assert.ok(snap.parks>=1,JSON.stringify(snap));
 assert.equal(cityChapterViews(city,CATALOG,[])[0].canClaim,true);
 sql.prepare('INSERT INTO zeffi_world_cities VALUES(?,?,?)').run(player,0,JSON.stringify(city));
 const first=await claimCityChapter(db,player,city,CATALOG,0,'warm-welcome');
 assert.equal(first.repeated,false);
 const second=await claimCityChapter(db,player,city,CATALOG,0,'warm-welcome');
 assert.equal(second.repeated,true);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM zeffi_world_decor_grants').get().n,1);
 assert.equal(sql.prepare('SELECT total FROM zeffi_world_decor_owned').get().total,1);
 const extras=await readWorldExtras(db,player,city,CATALOG);
 assert.equal(extras.cityChapters.items[0].claimed,true);
 assert.equal(extras.decorInventory.items[0].id,'extra-bench');
 sql.close();
});
