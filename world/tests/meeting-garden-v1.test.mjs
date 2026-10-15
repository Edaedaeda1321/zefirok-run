import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {CATALOG,CATALOG_ITEMS,MEETING_GARDEN_PASS_ID} from '../catalog.js';
import {WORLD_REWARD_DECORS} from '../decor-rewards.js';
import {addObject,addGiftDecor,addPassGarden,makeInitialCity,moveObject,storeObject,restoreObject,skipConstruction,sanitizeCity} from '../engine.js';
import {buildStoryMap,validateStoryMap,STORY_MEETING_GARDEN_KINDS,MEETING_GARDEN_PLOT,placeById} from '../story/map.js';
import {createDemoState} from '../story/model.js';
import {mapStateWithFund} from '../story/shared-fund.js';
import {spriteMetadata,buildingAssetId,catalogSpriteId,meetingGardenSprite} from '../sprite-assets.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {readWorldExtras} from '../../src/zeffi-world-decor.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFileSync(join(root,p),'utf8');
const now=1_800_000_000_000;

test('10 distinct supplied WebPs are wired to the shared map and personal 6x6 Garden',()=>{
 const assets=SPRITE_MANIFEST.assets.filter(a=>a.packId==='meeting-garden-v1');
 assert.equal(assets.length,10);
 assert.deepEqual(STORY_MEETING_GARDEN_KINDS.length,10);
 for(let n=1;n<=10;n++){
  const id=meetingGardenSprite(n),sprite=buildingAssetId(STORY_MEETING_GARDEN_KINDS[n-1]);
  assert.equal(id,`meeting_garden_${String(n).padStart(2,'0')}`);
  assert.equal(sprite,id);assert.equal(catalogSpriteId(STORY_MEETING_GARDEN_KINDS[n-1]),id);
  const meta=spriteMetadata(id);assert.ok(meta,`missing sprite ${id}`);
  assert.deepEqual(meta.footprint,[6,6]);assert.equal(meta.facing,'n');assert.equal(meta.directionVerified,false);
  assert.ok(Array.isArray(meta.groundAlphaBounds)&&meta.groundAlphaBounds.length===4);
  assert.ok(meta.groundAlphaBounds[2]>meta.groundAlphaBounds[0]);
  const file=join(root,'world',meta.fileWebp);assert.ok(existsSync(file),file);
  const webp=readFileSync(file);assert.equal(webp.toString('ascii',0,4),'RIFF');assert.equal(webp.toString('ascii',8,12),'WEBP');
 }
 assert.equal(buildingAssetId(MEETING_GARDEN_PASS_ID,0,'complete'),meetingGardenSprite(10));
 for(const p of [0,.16,.53,.79,.999])assert.match(buildingAssetId(MEETING_GARDEN_PASS_ID,0,'build_01',p),/^meeting_garden_0[1-9]$/);
 assert.equal(CATALOG[MEETING_GARDEN_PASS_ID].w,6);assert.equal(CATALOG[MEETING_GARDEN_PASS_ID].h,6);
});

test('new Garden has continuous circular footpaths, never overlaps shared buildings/roads',()=>{
 assert.deepEqual(MEETING_GARDEN_PLOT,[11,40,6,6]);
 assert.deepEqual(placeById('community-garden').bounds,MEETING_GARDEN_PLOT);
 for(const chapter of [0,1,2,3])for(const n of [1,2,5,7,9,10]){
  const map=buildStoryMap({...createDemoState(),chapter,meetingGardenStage:n},now);
  assert.deepEqual(validateStoryMap(map),[],`chapter ${chapter} stage ${n}`);
  const garden=map.objects.filter(o=>o.uid==='story-community-garden');assert.equal(garden.length,1);
  assert.equal(garden[0].kind,STORY_MEETING_GARDEN_KINDS[n-1]);
  assert.deepEqual([garden[0].x,garden[0].y,garden[0].rotation],[11,40,0]);
  const roads=new Set(map.roads);
  for(let y=39;y<=46;y++){assert.ok(roads.has(`10,${y}`),`left path ${y}`);assert.ok(roads.has(`17,${y}`),`right path ${y}`);}
  for(let x=10;x<=17;x++)assert.ok(roads.has(`${x},46`),`front promenade ${x}`);
  for(let x=11;x<=16;x++)for(let y=40;y<=45;y++)assert.ok(!roads.has(`${x},${y}`),'road under park');
 }
});

test('community project keeps server-authenticated donation history and only advances visual stages',()=>{
 const local=createDemoState();const shared=(total,finished=false)=>({projects:{garden:{total,goal:1_000_000,finished},festival:{total:0}}});
 assert.equal(mapStateWithFund(local,shared(0)).meetingGardenStage,1);
 assert.equal(mapStateWithFund(local,shared(500_000)).meetingGardenStage,5);
 assert.equal(mapStateWithFund(local,shared(999_999)).meetingGardenStage,9);
 assert.equal(mapStateWithFund(local,shared(1_000_000,true)).meetingGardenStage,10);
 assert.equal(local.project.personal,0,'community contribution state not mutated');
});

test('park cannot be bought, granted as decor, rotated, duplicated or coffee-skipped',()=>{
 assert.equal(CATALOG[MEETING_GARDEN_PASS_ID].passOnly,true);
 assert.ok(!CATALOG_ITEMS.some(item=>item.id===MEETING_GARDEN_PASS_ID));
 assert.ok(!WORLD_REWARD_DECORS.some(item=>item.id===MEETING_GARDEN_PASS_ID));
 const c=makeInitialCity(),wall={...c.wallet};
 assert.throws(()=>addObject(c,CATALOG,MEETING_GARDEN_PASS_ID,16,16,0,now),e=>e.code==='PASS_GARDEN_ONLY');
 assert.throws(()=>addGiftDecor(c,CATALOG,MEETING_GARDEN_PASS_ID,16,16,0,now),e=>e.code==='GIFT_DECOR_ONLY');
 assert.throws(()=>addPassGarden(c,CATALOG,MEETING_GARDEN_PASS_ID,16,16,1,now),e=>e.code==='ROTATION_UNAVAILABLE');
 const bought=addPassGarden(c,CATALOG,MEETING_GARDEN_PASS_ID,16,16,0,now);
 assert.deepEqual(bought.wallet,wall,'no fake purchase or credit');
 const obj=bought.objects.at(-1);assert.equal(obj.passGarden,true);
 assert.equal(obj.buildReadyAt-obj.buildStartedAt,6*60*60*1000);
 assert.throws(()=>skipConstruction(bought,obj.uid,now+300_000),e=>e.code==='SKIP_UNAVAILABLE');
 assert.throws(()=>addPassGarden(bought,CATALOG,MEETING_GARDEN_PASS_ID,18,18,0,now),e=>e.code==='ALREADY_OWNED');
 assert.throws(()=>moveObject(bought,CATALOG,obj.uid,16,16,1),e=>e.code==='INVALID_POSITION');
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(bought)),CATALOG),bought);
 const stored=storeObject(bought,obj.uid);
 assert.throws(()=>addPassGarden(stored,CATALOG,MEETING_GARDEN_PASS_ID,16,16,0,now),e=>e.code==='ALREADY_OWNED');
 assert.throws(()=>restoreObject(stored,CATALOG,obj.uid,16,16,1),e=>e.code==='INVALID_POSITION');
 const restored=restoreObject(stored,CATALOG,obj.uid,16,16,0);
 assert.equal(restored.objects.at(-1).passGarden,true);
});

test('database permanent ownership is idempotent and insists on premium source',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(read('migrations/0123_zeffi_world_decor_and_chapters.sql'));
 db.exec(read('migrations/0125_zeffi_meeting_garden_pass.sql'));
 const telegramId='123456789';
 function bind(sql){const st=db.prepare(sql);return {bind(...args){return {first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})}},all:async()=>({results:st.all()})};}
 const adapter={prepare:bind},city=makeInitialCity();
 assert.equal((await readWorldExtras(adapter,telegramId,city,CATALOG)).passGarden.owned,false);
 assert.throws(()=>db.prepare('INSERT INTO zeffi_world_pass_garden_ownership VALUES (?,?,?,?,?,?)').run('wrong','meeting-garden-pass','season',1,'free',123),/CHECK/);
 db.prepare('INSERT INTO zeffi_world_pass_garden_ownership VALUES (?,?,?,?,?,?)').run(telegramId,MEETING_GARDEN_PASS_ID,'season1',25,'premium',123);
 db.prepare('INSERT OR IGNORE INTO zeffi_world_pass_garden_ownership VALUES (?,?,?,?,?,?)').run(telegramId,MEETING_GARDEN_PASS_ID,'season2',2,'premium',456);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM zeffi_world_pass_garden_ownership').get().n,1);
 const available=await readWorldExtras(adapter,telegramId,city,CATALOG);
 assert.deepEqual([available.passGarden.enabled,available.passGarden.owned,available.passGarden.available],[true,true,true]);
 const placed=addPassGarden(city,CATALOG,MEETING_GARDEN_PASS_ID,16,16,0,now);
 assert.equal((await readWorldExtras(adapter,telegramId,placed,CATALOG)).passGarden.available,false);
 db.close();
});

test('CC, Worker and client have a dedicated Elite-only claim path guarded in the D1 transaction',()=>{
 const worker=read('src/worker.js'),server=read('src/zeffi-world-service.js'),owner=read('owner.html'),client=read('world/app.js');
 const batch=worker.slice(worker.indexOf('async function grantSeasonPassReward('),worker.indexOf('async function claimSeasonPassReward('));
 assert.ok(batch.includes('SEASON_PASS_GARDEN_ID')&&batch.includes('assertMeetingGardenSchema'));
 assert.ok(batch.includes('INSERT OR IGNORE INTO zeffi_world_pass_garden_ownership'));
 assert.ok(batch.includes("status='pending'"));assert.ok(batch.includes("lane)!=='premium'"));
 assert.ok(server.includes("passGarden?' AND EXISTS")||server.includes('const gardenGuard=passGarden?'));
 assert.ok(server.includes('source_lane=\'premium\'')&&server.includes('${gardenGuard}'));
 assert.ok(server.includes("case 'place-pass-garden':return addPassGarden"));
 assert.ok(owner.includes('<option value="world_park">')&&owner.includes('world_park:\'Парк · Элита\''));
 assert.ok(worker.includes("lane!=='premium')throw new ApiError(400,'Парк"));
 assert.ok(client.includes('startPassGardenPlacement')&&client.includes('place-pass-garden')&&client.includes('passGarden:payload.passGarden')===false);
});
