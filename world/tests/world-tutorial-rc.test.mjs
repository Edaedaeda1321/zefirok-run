import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';
import {createWorldTutorial} from '../tutorial.js';

function memoryD1(){
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync(new URL('../../migrations/0117_zeffi_world_tutorial.sql',import.meta.url),'utf8'));
 const wrapped={prepare(sql){return{bind(...args){const statement=db.prepare(sql);return{first:async()=>statement.get(...args),run:async()=>statement.run(...args)}}}}};
 return {db,wrapped};
}
const deps={
 resolvePlayerAuth:async(_req,body)=>body?.initData==='signed' ? {telegramId:body.asUser||'12345'} : null,
 ensureAuthoritativeProfileRow:()=>{throw Error('tutorial must not touch balance')},
 requirePlayerOperationAvailable:()=>{throw Error('tutorial must not touch economy')}
};
const envFor=DB=>({DB,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345,67890'});
async function request(env,body={},route='tutorial'){
 const response=await handleZeffiWorldApi(new Request(`https://zeffi.test/api/world/${route}`,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:'signed',...body})
 }),env,deps);
 return {status:response.status,...await response.json()};
}

test('signed tester sees independent server tutorial counters that survive another device',async()=>{
 const {db,wrapped}=memoryD1(),env=envFor(wrapped);
 assert.deepEqual((await request(env,{op:'read'})).tutorial,{personal:0,story:0});
 assert.deepEqual((await request(env,{op:'progress',mode:'personal',step:3})).tutorial,{personal:3,story:0});
 assert.deepEqual((await request(env,{op:'progress',mode:'story',step:2})).tutorial,{personal:3,story:2});
 assert.deepEqual((await request(env,{op:'progress',mode:'personal',step:1})).tutorial,{personal:3,story:2},'stale UI cannot rewind');
 assert.deepEqual((await request(env,{op:'progress',mode:'personal',step:6})).tutorial,{personal:6,story:2});
 assert.deepEqual((await request(env,{op:'read',asUser:'67890'})).tutorial,{personal:0,story:0},'player isolation');
 assert.deepEqual((await request(env,{op:'read'})).tutorial,{personal:6,story:2},'another device resumes');
 assert.equal(db.prepare('SELECT COUNT(*) as c FROM zeffi_world_tutorial').get().c,1);
 db.close();
});

test('invalid steps, modes and unsigned/nonallowlisted Telegram users never touch D1',async()=>{
 const {db,wrapped}=memoryD1(),env=envFor(wrapped);
 for(const bad of [
  {op:'progress',mode:'story',step:-1},{op:'progress',mode:'personal',step:7},
  {op:'progress',mode:'story',step:0.2},{op:'progress',mode:'ranking',step:2},
  {op:'progress',mode:'personal',step:'6'}
 ])assert.equal((await request(env,bad)).status,400);
 assert.equal((await request(env,{op:'read',initData:'forged'})).status,401);
 assert.equal((await request(env,{op:'read',asUser:'99999'})).status,403);
 assert.equal((await request({...env,WORLD_ENABLED:'false'},{op:'read'})).status,403);
 assert.equal((await request({...env,WORLD_TESTER_IDS:''},{op:'read'})).status,403);
 assert.equal(db.prepare('SELECT COUNT(*) as c FROM zeffi_world_tutorial').get().c,0);
 db.close();
});

test('progress API does not create city, grant rewards, debit currency or modify community fund',async()=>{
 const {db,wrapped}=memoryD1(),env=envFor(wrapped);
 assert.equal((await request(env,{op:'progress',mode:'story',step:6,points:999999,actions:[{kind:'place'}]})).status,200);
 assert.deepEqual(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(x=>x.name),['zeffi_world_tutorial']);
 db.close();
});

test('hosted pages have separate tutorials and never auto-confirm purchases or fund contributions',()=>{
 const root=new URL('../../',import.meta.url);
 const read=path=>readFileSync(new URL(path,root),'utf8');
 const personal=read('world/app.js'),story=read('world/story/app.js'),guide=read('world/tutorial.js'),html=read('world.html'),htmlStory=read('story-world.html');
 assert.match(personal,/setupPersonalTutorial\(result\.tutorial\.personal\)/);
 assert.match(personal,/worldTutorial\?\.signal\('map-picked'\)/);
 assert.match(html,/Пройти обучение заново/);
 assert.match(story,/configureStoryTutorial\(progress\?\.story\)/);
 assert.match(story,/if\(worldTutorial\?\.active\(\)\)panel\.show\(\)/);
 assert.match(htmlStory,/id="storyTutorialHelp"/);
 assert.match(html,/tutorial\.css\?v=rc-guide2/);
 assert.match(guide,/createWorldTutorial/);
 assert.match(guide,/e\.target\.closest\(selector\)/,'dynamic cards must be handled even after UI re-render');
 assert.doesNotMatch(guide,/fetch\(|\/api\/world\/mutate|contribute\(|wallet\s*=/);
 assert.doesNotMatch(guide,/\.click\(\)|dispatchEvent\(/,'tutorial never performs a purchase action for players');
});
