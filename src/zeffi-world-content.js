// P2 published World editorial configuration. Optional migration falls back to
// hard-coded RC content. A malformed published row fails closed (HTTP 503).
import {defaultWorldContent,validateWorldContent} from '../world/world-content.js';
const missing=e=>/no such table:\s*zeffi_world_content_config\b/i.test(String(e?.message||e));
export async function readWorldContentRecord(db,{allowMissing=true}={}){
 if(!db?.prepare)throw Object.assign(Error('WORLD_CONTENT_DB_UNAVAILABLE'),{status:503});
 try{
  const row=await db.prepare('SELECT * FROM zeffi_world_content_config WHERE id=1').bind().first();
  if(!row||!Number.isSafeInteger(Number(row.draft_revision))||!Number.isSafeInteger(Number(row.published_revision)))throw Error('missing or invalid config');
  return {...row,schemaReady:true,draft_revision:Number(row.draft_revision),published_revision:Number(row.published_revision)};
 }catch(e){if(allowMissing&&missing(e))return {schemaReady:false,draft_revision:0,published_revision:0,draft_json:null,published_json:null};throw Object.assign(Error('WORLD_CONTENT_STATE_UNAVAILABLE'),{status:503});}
}
export async function publishedWorldContent(db){
 const row=await readWorldContentRecord(db);
 try{return {revision:row.published_revision,content:row.published_json?validateWorldContent(JSON.parse(row.published_json)):defaultWorldContent(),schemaReady:row.schemaReady};}
 catch{throw Object.assign(Error('WORLD_CONTENT_INVALID_PUBLISHED'),{status:503});}
}
