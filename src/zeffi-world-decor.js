// Server-owned stackable decor prizes, with immutable per-source grant receipts.
// Only migration 0123 creates these tables; NO player-request DDL.
import {WORLD_REWARD_DECOR_BY_ID,WORLD_REWARD_DECORS,worldRewardDecor,worldDecorGiftUsage} from '../world/decor-rewards.js';
import {cityChapterViews,CITY_CHAPTERS} from '../world/city-chapters.js';

const schemaError=(error)=>/no such table|no such column/i.test(String(error?.message||error));
export async function assertDecorSchema(db){
  try{await db.prepare('SELECT telegram_id FROM zeffi_world_decor_grants LIMIT 1').all();
      await db.prepare('SELECT telegram_id FROM zeffi_world_decor_owned LIMIT 1').all();}
  catch(e){if(schemaError(e))throw Object.assign(new Error('Не применена миграция 0123: коллекционный декор.'),{code:'WORLD_DECOR_SCHEMA_NOT_READY'});throw e;}
}
export function decorGrantStatements(db,{telegramId,decorId,amount,sourceKey,now,gateSql='1=1',gateBinds=[]}){
  if(!worldRewardDecor(decorId)||!Number.isInteger(amount)||amount<1||amount>20||!/^.{3,190}$/.test(String(sourceKey||'')))throw new Error('INVALID_DECOR_GRANT');
  // gateSql is code-owned, NEVER built from player input. The second statement
  // recomputes the materialized total from unique immutable receipts, so retries
  // and duplicate deliveries can never increase stock twice.
  return [
    db.prepare(`INSERT INTO zeffi_world_decor_grants(telegram_id,source_key,decor_id,amount,created_at) SELECT ?,?,?,?,? WHERE ${gateSql} ON CONFLICT(telegram_id,source_key) DO NOTHING`).bind(telegramId,sourceKey,decorId,amount,now,...gateBinds),
    db.prepare(`INSERT INTO zeffi_world_decor_owned(telegram_id,decor_id,total,updated_at)
      SELECT ?,?,COALESCE((SELECT SUM(amount) FROM zeffi_world_decor_grants WHERE telegram_id=? AND decor_id=?),0),?
      WHERE ${gateSql} ON CONFLICT(telegram_id,decor_id) DO UPDATE SET total=excluded.total,updated_at=excluded.updated_at`)
      .bind(telegramId,decorId,telegramId,decorId,now,...gateBinds)
  ];
}
async function passGardenState(db,telegramId,city){
 const inCity=(city.objects||[]).some(item=>item.kind==='meeting-garden-pass');
 try{
  const row=await db.prepare("SELECT garden_id FROM zeffi_world_pass_garden_ownership WHERE telegram_id=? AND source_lane='premium' LIMIT 1").bind(telegramId).first();
  return {enabled:true,owned:row?.garden_id==='meeting-garden-pass',available:row?.garden_id==='meeting-garden-pass'&&!inCity,placed:inCity,id:'meeting-garden-pass'};
 }catch(error){if(!schemaError(error))throw error;return {enabled:false,owned:false,available:false,placed:inCity,id:'meeting-garden-pass'};}
}
export async function readWorldExtras(db,telegramId,city,catalog){
  try{
    const [owned,claimed,passGarden]=await Promise.all([
      db.prepare('SELECT decor_id,total FROM zeffi_world_decor_owned WHERE telegram_id=? AND total>0 ORDER BY decor_id').bind(telegramId).all(),
      db.prepare("SELECT chapter_id FROM zeffi_world_chapter_claims WHERE telegram_id=? AND status='claimed'").bind(telegramId).all(),
      passGardenState(db,telegramId,city)
    ]);
    const items=(owned.results||[]).filter(r=>worldRewardDecor(r.decor_id)).map(r=>({id:r.decor_id,title:WORLD_REWARD_DECOR_BY_ID[r.decor_id].title,imageUrl:WORLD_REWARD_DECOR_BY_ID[r.decor_id].imageUrl,total:Number(r.total),used:worldDecorGiftUsage(city,r.decor_id),available:Math.max(0,Number(r.total)-worldDecorGiftUsage(city,r.decor_id))}));
    return {passGarden,decorInventory:{enabled:true,items},cityChapters:{enabled:true,items:cityChapterViews(city,catalog,(claimed.results||[]).map(x=>x.chapter_id))}};
  }catch(error){if(!schemaError(error))throw error;return {passGarden:await passGardenState(db,telegramId,city),decorInventory:{enabled:false,items:[]},cityChapters:{enabled:false,items:[]}};}
}
export async function claimCityChapter(db,telegramId,city,catalog,revision,chapterId){
  await assertDecorSchema(db);
  const chapter=CITY_CHAPTERS.find(x=>x.id===chapterId);
  if(!chapter)throw Object.assign(new Error('Неизвестная глава города.'),{status:400,code:'CITY_CHAPTER_INVALID'});
  const prior=await db.prepare('SELECT status FROM zeffi_world_chapter_claims WHERE telegram_id=? AND chapter_id=?').bind(telegramId,chapterId).first();
  if(prior?.status==='claimed')return {repeated:true,reward:chapter.rewardDecor};
  const claimed=(await db.prepare("SELECT chapter_id FROM zeffi_world_chapter_claims WHERE telegram_id=? AND status='claimed'").bind(telegramId).all()).results||[];
  const view=cityChapterViews(city,catalog,claimed.map(x=>x.chapter_id)).find(x=>x.id===chapterId);
  if(!view.canClaim)throw Object.assign(new Error('Глава ещё не завершена или предыдущая глава не получена.'),{status:409,code:'CITY_CHAPTER_INCOMPLETE'});
  const now=Math.floor(Date.now()/1000),gate='EXISTS(SELECT 1 FROM zeffi_world_chapter_claims WHERE telegram_id=? AND chapter_id=? AND status=\'pending\')';
  const statements=[
    db.prepare(`INSERT OR IGNORE INTO zeffi_world_chapter_claims(telegram_id,chapter_id,status,claimed_at)
      SELECT ?,?,'pending',? WHERE EXISTS(SELECT 1 FROM zeffi_world_cities WHERE telegram_id=? AND revision=?)`).bind(telegramId,chapterId,now,telegramId,revision),
    ...decorGrantStatements(db,{telegramId,decorId:chapter.rewardDecor,amount:1,sourceKey:`world-chapter:${chapterId}`,now,gateSql:gate,gateBinds:[telegramId,chapterId]}),
    db.prepare("UPDATE zeffi_world_chapter_claims SET status='claimed' WHERE telegram_id=? AND chapter_id=? AND status='pending'").bind(telegramId,chapterId)
  ];
  const batch=await db.batch(statements);
  const newClaim=Number(batch?.[0]?.meta?.changes||0)===1;
  const confirmed=await db.prepare('SELECT status FROM zeffi_world_chapter_claims WHERE telegram_id=? AND chapter_id=?').bind(telegramId,chapterId).first();
  if(confirmed?.status!=='claimed')throw Object.assign(new Error('Город изменился. Обновите данные и повторите.'),{status:409,code:'CITY_REVISION_CONFLICT'});
  return {repeated:!newClaim,reward:chapter.rewardDecor};
}

export {WORLD_REWARD_DECORS,worldRewardDecor,worldDecorGiftUsage};
