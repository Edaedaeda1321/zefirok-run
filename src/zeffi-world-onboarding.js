// Server-authoritative first-house tutorial for NEW city records only.
// Existing cities (created before migration 0126) are not re-onboarded.
const EMPTY = Object.freeze({required:false,homeUid:'',freeSkipUsed:false});
const missingOptional = error => /no such table:\s*(?:zeffi_world_tutorial_v2_activation|zeffi_world_tutorial_v2|zeffi_world_cities)\b/i.test(String(error?.message||error));
export async function readWorldOnboarding(db,telegramId,cityRow=null){
 try{
  const row=cityRow||await db.prepare('SELECT created_at,state_json FROM zeffi_world_cities WHERE telegram_id=?').bind(String(telegramId)).first();
  if(!row)return {...EMPTY};
  const activation=await db.prepare('SELECT activated_at FROM zeffi_world_tutorial_v2_activation WHERE id=1').first();
  // City timestamps are milliseconds, while migration 0126 uses Unix seconds.
  if(!activation||!Number.isSafeInteger(Number(row.created_at))||Math.floor(Number(row.created_at)/1000)<Number(activation.activated_at))return {...EMPTY};
  const now=Math.floor(Date.now()/1000);
  await db.prepare('INSERT OR IGNORE INTO zeffi_world_tutorial_v2(telegram_id,updated_at) VALUES(?,?)').bind(String(telegramId),now).run();
  const state=await db.prepare('SELECT home_uid,free_skip_used FROM zeffi_world_tutorial_v2 WHERE telegram_id=?').bind(String(telegramId)).first();
  if(!state)throw Error('WORLD_ONBOARDING_UNAVAILABLE');
  return {required:true,homeUid:String(state.home_uid||''),freeSkipUsed:Number(state.free_skip_used)===1};
 }catch(error){if(missingOptional(error))return {...EMPTY};throw error;}
}

function blocked(message){const e=new Error(message);e.status=409;throw e;}
export async function assertWorldOnboardingProgress(db,telegramId,nextStep,onboarding,previousStep){
 if(!onboarding?.required)return;
 if(nextStep>Number(previousStep)+1)blocked('Пройди шаги обучения по порядку.');
 if(nextStep>=5&&!onboarding.homeUid)blocked('Сначала построй новый домик в своём районе.');
 if(nextStep!==6||onboarding.freeSkipUsed)return;
 const row=await db.prepare('SELECT state_json FROM zeffi_world_cities WHERE telegram_id=?').bind(String(telegramId)).first();
 let item;
 try{item=JSON.parse(row?.state_json||'{}').objects?.find(v=>v.uid===onboarding.homeUid);}catch{}
 // If the timer elapsed naturally, the lesson is still completable without a fake charge.
 if(!item||item.stored||item.kind!=='cottage'||Number(item.buildReadyAt||0)>Date.now())
  blocked('Дождись завершения первого домика или ускорь его бесплатно.');
}
