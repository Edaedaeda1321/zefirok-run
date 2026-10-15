import {publishedWorldContent} from './zeffi-world-content.js';
// Closed Zeffi World RC: D1-backed story progress. No rewards, profile or wallet writes.
// The enclosing Worker authenticates Telegram initData and enforces WORLD_TESTER_IDS.
const HEADERS=Object.freeze({'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const PLACES=Object.freeze({
 square:0,cafe:0,belkino:0,friends:0,station:0,'community-garden':0,festival:1,rabbit:2,palace:0
});
const AREAS=Object.freeze({square:0,cafe:0,belkino:0,friends:0,station:0,festival:1,rabbit:2,'community-garden':0,palace:0,mystery:99});
const CHAPTERS=Object.freeze([
 Object.freeze({id:'welcome',title:'Первые прогулки',description:'Познакомься с сердцем города, кафе и парком Белкино.',visits:['square','cafe','belkino'],event:null,unlock:'festival'}),
 Object.freeze({id:'together',title:'Вместе строим город',description:'Исследуй квартал, станцию и Сад встреч. Когда общий сбор на сад завершится, откроется история Белого Кролика.',visits:['friends','station','community-garden'],event:'garden',unlock:'rabbit'}),
 Object.freeze({id:'festival',title:'Праздник Зеффи',description:'Исследуй Дом фестивалей и Белого Кролика. Завершите строительство вместе со всем городом.',visits:['festival','rabbit'],event:'festival',unlock:null})
]);
const EVENTS=Object.freeze({garden:Object.freeze({id:'garden',title:'Сад встреч'}),festival:Object.freeze({id:'festival',title:'Дом фестивалей Зеффи'})});
const natural=n=>Number.isSafeInteger(n)&&n>=0;
class StoryError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new StoryError(status,code,message);};
const secs=()=>Math.floor(Date.now()/1000);
async function load(db,id){
 if(!db)fail(503,'STORY_DB_UNAVAILABLE','Общий город не может подключиться к D1.');
 try{
  const [player,visits,events,funds,publication,palaceRow]=await Promise.all([
   db.prepare('SELECT chapter,revision,unlocked_mask FROM zeffi_story_players WHERE telegram_id=?').bind(id).first(),
   db.prepare('SELECT place_id FROM zeffi_story_visits WHERE telegram_id=? ORDER BY visited_at,place_id').bind(id).all(),
   db.prepare('SELECT event_id,project_id,enabled FROM zeffi_story_events ORDER BY event_id').all(),
   db.prepare('SELECT project_id,goal_points,total_points,stage FROM zeffi_community_projects ORDER BY project_id').all(),
   publishedWorldContent(db),
   db.prepare('SELECT stage,revision,contributions_enabled FROM zeffi_world_palace_state WHERE id=1').first()
  ]);
  const chapter=player==null?0:Number(player.chapter),revision=player==null?0:Number(player.revision),mask=player==null?0:Number(player.unlocked_mask);
  if(!Number.isInteger(chapter)||chapter<0||chapter>3||!natural(revision)||mask!==(chapter>=1?1:0)+(chapter>=2?2:0))throw new Error('invalid chapter/district state');
  const visited=new Set((visits?.results||[]).map(r=>String(r.place_id)));
  const ev=new Map((events?.results||[]).map(r=>[String(r.event_id),r]));
  const fund=new Map((funds?.results||[]).map(r=>[String(r.project_id),r]));
  if(ev.size!==2||fund.size!==2)throw new Error('missing global events or projects');
  const outputEvents={};
  for(const def of Object.values(EVENTS)){
   const row=ev.get(def.id),project=row&&fund.get(String(row.project_id));
   if(!row||String(row.project_id)!==def.id||!project)throw new Error('unknown project/event link');
   const total=Number(project.total_points),goal=Number(project.goal_points),enabled=Number(row.enabled)===1;
   if(!natural(total)||!natural(goal)||goal===0||total>goal||![0,1].includes(Number(row.enabled)))throw new Error('bad event totals');
   outputEvents[def.id]={id:def.id,title:def.title,enabled,total,goal,finished:total===goal,status:!enabled?'paused':total===goal?'completed':'active',visited:visited.has(def.id==='garden'?'community-garden':'festival')};
  }
  const palaceStage=Number(palaceRow?.stage),palaceRevision=Number(palaceRow?.revision);
  if(!Number.isInteger(palaceStage)||palaceStage<1||palaceStage>10||!natural(palaceRevision)||Number(palaceRow?.contributions_enabled)!==0)
   throw new Error('palace state invalid or contributions enabled');
  const content=publication.content;
  const current=CHAPTERS[chapter]||null;
  const goals=current?.visits.map(place=>({id:place,title:PLACE_TITLES[place],done:visited.has(place)}))||[];
  const event=current?.event?outputEvents[current.event]:null;
  const canAdvance=!!current&&goals.every(g=>g.done)&&(!event||(event.enabled&&event.finished));
  return {ok:true,version:'zeffi-story-rc1',chapter,revision,completed:chapter===3,
   currentChapter:current?{id:current.id,title:content.chapters[current.id].title,description:content.chapters[current.id].description,goals,eventId:current.event,nextUnlock:current.unlock}:null,
   chapters:CHAPTERS.map((c,index)=>({id:c.id,title:content.chapters[c.id].title,index,done:chapter>index,active:chapter===index})),
   unlockedDistricts:Object.entries(AREAS).filter(([,need])=>need===0||(need===1&&(mask&1)!==0)||(need===2&&(mask&2)!==0)).map(([place])=>place),
   visited:[...visited],events:outputEvents,canAdvance,contentRevision:publication.revision,
   palace:{stage:palaceStage,revision:palaceRevision,stageCount:10,contributionsEnabled:false}};
 }catch(error){
  if(error instanceof StoryError)throw error;
  console.error('Zeffi story read failed',error);
  fail(503,'STORY_SCHEMA_NOT_READY','Сюжетный прогресс временно недоступен. Проверьте миграции 0118 и 0124.');
 }
}
const PLACE_TITLES=Object.freeze({palace:'Дворец воспоминаний',square:'Центральная площадь',cafe:'Кафе «Зефирок»',belkino:'Парк Белкино',friends:'Квартал друзей',station:'Городская станция','community-garden':'Сад встреч',festival:'Дом фестивалей Зеффи',rabbit:'«Белый Кролик»'});
async function recordVisit(db,id,body){
 const placeId=body?.placeId;
 if(typeof placeId!=='string'||!Object.hasOwn(PLACES,placeId))fail(400,'STORY_PLACE_INVALID','Неизвестное место.');
 const current=await load(db,id);
 if(PLACES[placeId]>current.chapter)fail(409,'STORY_PLACE_LOCKED','Этот район откроется в следующей главе.');
 if(!current.visited.includes(placeId)){
  try{await db.prepare('INSERT OR IGNORE INTO zeffi_story_visits (telegram_id,place_id,visited_at) VALUES (?,?,?)').bind(id,placeId,secs()).run();}
  catch(error){console.error('Zeffi story visit failed',error);fail(503,'STORY_SAVE_FAILED','Не удалось сохранить посещение.');}
 }
 return {...await load(db,id),repeated:current.visited.includes(placeId)};
}
async function advance(db,id,body){
 const expectedChapter=body?.expectedChapter,expectedRevision=body?.expectedRevision;
 if(!Number.isInteger(expectedChapter)||expectedChapter<0||expectedChapter>=CHAPTERS.length||!natural(expectedRevision))
  fail(400,'STORY_CHAPTER_INVALID','Нужно указать текущую главу и версию.');
 let state=await load(db,id);
 // A repeat of the same completed step cannot advance another chapter.
 if(state.chapter>expectedChapter)return {...state,repeated:true};
 if(state.chapter!==expectedChapter||state.revision!==expectedRevision)fail(409,'STORY_REVISION_CONFLICT','История изменилась в другом окне. Обновите её.');
 if(!state.canAdvance)fail(409,'STORY_GOALS_INCOMPLETE','Сначала заверши задания главы и дождись общего события.');
 const now=secs();
 try{
  await db.prepare('INSERT OR IGNORE INTO zeffi_story_players(telegram_id,chapter,revision,updated_at) VALUES (?,0,0,?)').bind(id,now).run();
  // Repeat all prerequisites in the optimistic SQL update: if a server-side
  // event is paused while a player confirms, the unlock cannot slip through.
  const chapterDef=CHAPTERS[expectedChapter];
  const visitGuard=chapterDef.visits.map(()=>`EXISTS (SELECT 1 FROM zeffi_story_visits WHERE telegram_id=? AND place_id=?)`).join(' AND ');
  const eventGuard=chapterDef.event?` AND EXISTS (SELECT 1 FROM zeffi_story_events e
    JOIN zeffi_community_projects p ON p.project_id=e.project_id
    WHERE e.event_id=? AND e.enabled=1 AND p.total_points=p.goal_points)`:'';
  const sql=`UPDATE zeffi_story_players SET chapter=chapter+1,revision=revision+1,updated_at=?,
    unlocked_mask=CASE WHEN chapter=0 THEN unlocked_mask | 1 WHEN chapter=1 THEN unlocked_mask | 2 ELSE unlocked_mask END
    WHERE telegram_id=? AND chapter=? AND revision=? AND ${visitGuard}${eventGuard}`;
  const params=[now,id,expectedChapter,expectedRevision,...chapterDef.visits.flatMap(place=>[id,place]),...(chapterDef.event?[chapterDef.event]:[])];
  const result=await db.prepare(sql).bind(...params).run();
  if(Number(result?.meta?.changes??result?.changes??0)!==1){state=await load(db,id);if(state.chapter>expectedChapter)return {...state,repeated:true};fail(409,'STORY_REVISION_CONFLICT','Глава изменилась одновременно. Обновите историю.');}
 }catch(error){if(error instanceof StoryError)throw error;console.error('Zeffi story advance failed',error);fail(503,'STORY_SAVE_FAILED','Не удалось сохранить главу.');}
 return {...await load(db,id),advanced:true};
}
export async function handleZeffiStory({db,env,telegramId,body}){
 try{
  if(env?.WORLD_STORY_ENABLED!=null&&String(env.WORLD_STORY_ENABLED).toLowerCase()!=='true')fail(403,'STORY_DISABLED','Общий город временно закрыт.');
  const op=body?.op;
  if(op==='state')return reply(await load(db,telegramId));
  if(op==='visit')return reply(await recordVisit(db,telegramId,body));
  if(op==='advance')return reply(await advance(db,telegramId,body));
  fail(400,'STORY_ACTION_INVALID','Неизвестное действие с сюжетным прогрессом.');
 }catch(error){
  if(error instanceof StoryError)return reply({ok:false,code:error.code,error:error.message},error.status);
  console.error('Zeffi story operation failed',error);
  return reply({ok:false,code:'STORY_SERVER_ERROR',error:'Не удалось обработать сюжетный прогресс.'},500);
 }
}
