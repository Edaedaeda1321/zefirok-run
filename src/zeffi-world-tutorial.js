// World tutorial progress only. Strictly no economy, inventory, city or fund writes.
export const TUTORIAL_MAX_STEP=Object.freeze({personal:6,story:6});
export const DEFAULT_WORLD_TUTORIAL=Object.freeze({personal:0,story:0});
export async function readWorldTutorial(db,telegramId){
 const row=await db.prepare('SELECT personal_step,story_step FROM zeffi_world_tutorial WHERE telegram_id=?').bind(String(telegramId)).first();
 return {personal:Number(row?.personal_step||0),story:Number(row?.story_step||0)};
}
export async function writeWorldTutorial(db,telegramId,mode,step){
 if(!Object.hasOwn(TUTORIAL_MAX_STEP,mode)||!Number.isInteger(step)||step<0||step>TUTORIAL_MAX_STEP[mode]){
  const error=new Error('Некорректный этап обучения.');error.status=400;throw error;
 }
 const now=Math.floor(Date.now()/1000);
 // The server never trusts a client reset: steps can advance or stay the same.
 const p=mode==='personal'?step:0,s=mode==='story'?step:0;
 await db.prepare(`INSERT INTO zeffi_world_tutorial(telegram_id,personal_step,story_step,updated_at) VALUES (?,?,?,?)
  ON CONFLICT(telegram_id) DO UPDATE SET personal_step=MAX(personal_step,excluded.personal_step),
  story_step=MAX(story_step,excluded.story_step),updated_at=excluded.updated_at`)
  .bind(String(telegramId),p,s,now).run();
 return readWorldTutorial(db,telegramId);
}
