// Mir Zeffi P1: one published balance snapshot for Worker and client.
// Reading the absent migration is compatible with old RC code; malformed
// published data fails closed instead of silently using different prices.
import {defaultWorldBalance,validateWorldBalance,createWorldBalanceRuntime} from '../world/world-balance.js';
export const BALANCE_TABLE='zeffi_world_balance_config';
const missing=e=>/no such table:\s*zeffi_world_balance_config\b/i.test(String(e?.message||e));
export async function readWorldBalanceRecord(db,{allowMissing=true}={}){
 if(!db||typeof db.prepare!=='function')throw Object.assign(new Error('WORLD_BALANCE_DB_UNAVAILABLE'),{status:503});
 try {
  const row=await db.prepare('SELECT * FROM zeffi_world_balance_config WHERE id=1').first();
  if(!row)throw new Error('missing balance row');
  const draftRevision=Number(row.draft_revision),publishedRevision=Number(row.published_revision);
  if(!Number.isSafeInteger(draftRevision)||draftRevision<0||!Number.isSafeInteger(publishedRevision)||publishedRevision<0)
   throw new Error('invalid balance revision');
  return {...row,draft_revision:draftRevision,published_revision:publishedRevision,schemaReady:true};
 }catch(e){
  if(allowMissing&&missing(e))return {schemaReady:false,draft_revision:0,published_revision:0,draft_json:null,published_json:null};
  throw Object.assign(new Error('WORLD_BALANCE_STATE_UNAVAILABLE'),{status:503});
 }
}
export async function publishedWorldEconomy(db){
 const row=await readWorldBalanceRecord(db);
 let spec;
 try {spec=row.published_json?validateWorldBalance(JSON.parse(row.published_json),{reachability:false}):defaultWorldBalance();}
 catch{throw Object.assign(new Error('WORLD_BALANCE_INVALID_PUBLISHED'),{status:503});}
 return {catalog:createWorldBalanceRuntime(spec).catalog,schemaReady:row.schemaReady,config:{revision:row.published_revision,...spec}};
}
