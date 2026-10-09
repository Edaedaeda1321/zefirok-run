import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
const worker=fs.readFileSync('src/worker.js','utf8');
const server=fs.readFileSync('src/zeffi-world-service.js','utf8');
const main=fs.readFileSync('index.html','utf8');
const world=fs.readFileSync('world.html','utf8');
const client=fs.readFileSync('world/app.js','utf8');
const wrangler=fs.readFileSync('wrangler.jsonc','utf8');
assert(worker.includes("import { handleZeffiWorldApi } from './zeffi-world-service.js'"));
assert(worker.includes('if (url.pathname.startsWith("/api/world/"))'));
assert(server.includes("from '../world/engine.js'"));
assert(server.includes("from '../world/catalog.js'"));
assert(server.includes("return {" ) || server.includes('return reply('));
assert(server.includes('admin_profile_state') && server.includes('db.batch(statements)'));
assert(server.includes('WORLD_ENABLED') && server.includes('WORLD_TESTER_IDS') && server.includes('WORLD_PURCHASES_ENABLED'));
assert(!/db\.prepare\(\s*`CREATE\s+TABLE/i.test(server));
assert(main.includes('zeffi-world-request-init-data') && main.includes('e.source!==target?.contentWindow'));
assert(world.includes('window.ZeffiWorldServerRequired=!local'));
assert(client.includes("const SERVER_MODE = window.ZeffiWorldServerRequired === true"));
assert(client.includes('requestId:`world-${crypto.randomUUID()}`'));
assert(client.includes("if(SERVER_MODE)return;"));
assert(wrangler.includes('"database_name": "zefirok-rewards"'));
assert(!wrangler.includes('zeffi-world-db'));
// Public navigation is now a locked teaser; World API remains behind its own flags.
assert(main.includes('data-screen=&quot;world-locked&quot;'));
assert((main.match(/data-world-open type=&quot;button&quot;/g)||[]).length === 1, 'one World button in the runner');
assert(main.includes('data-game-home-shortcuts'));
assert(main.includes('data-tasks-open'));
assert(main.includes('icon_world_zeffi.webp'));
assert(main.includes('icon_blocked_stranicha.webp'));
assert(main.includes('world: () =&gt; switchScreen(&quot;world-locked&quot;)'));
assert(main.includes('const fn=host().world'));
assert(main.includes('const fn=host().back'));
assert(main.includes('world-locked-back'));
assert(main.includes('Мир Зеффи ещё строится!'));
assert(world.includes('const enabled=local;'), 'normal hosted /world.html stays locked');
assert(world.includes("get('world_tester')==='1'"), 'tester route explicitly requested');
assert(world.includes('async function isAuthorizedTester()'), 'hosted city must check server authorization');
assert(world.includes('payload?.ok===true&&payload?.serverAuthoritative===true'), 'server authorization required before city modules');
assert(world.includes('if(testerRequest&&await isAuthorizedTester()){launchCity();return;}'), 'no city before server approval');
assert(world.includes('event.source!==window.parent||event.origin!==location.origin'), 'World auth messages must be same-origin parent');
assert(main.includes("frame.src=location.protocol==='file:'?'./world-preview.html':'./world.html?world_tester=1'"), 'World overlay must request guarded tester route');
assert(main.includes("if(e?.data?.type!=='zeffi-world-tester-open')return;"), 'World opens only from runner request');
assert(main.includes('if(e.source!==runner?.contentWindow||e.origin!==location.origin)return;'), 'World open messages must come from runner iframe');
assert(main.includes('void openForTester(token);'), 'home button must probe the server before opening the city');
assert(main.includes('window.parent.location.origin'), 'the srcdoc tester message must use the parent origin, never about:srcdoc location.origin');
assert(!main.includes("window.parent.postMessage({type:'zeffi-world-tester-open'},location.origin)"), 'legacy broken target origin is forbidden');
assert(main.includes('runner?.contentWindow?.zefirokTaskHost?.auth?.()'), 'World overlay must forward verified runner initData');
assert(main.includes('if(!local)return;'), 'hosted game must not inject a second World button');
// Tester IDs are deployment secrets, never literals in client source.
for(const id of ['1075203342','1150340018','5454011700']){
  assert(!main.includes(id)&&!world.includes(id)&&!server.includes(id),'tester ID leaked into client/repository');
}
assert(world.includes('ПОКА НЕДОСТУПНО'));
assert(!world.includes('const enabled=true;'));
assert(fs.existsSync('assets/ui/icon_world_zeffi.webp'));
assert(fs.existsSync('assets/ui/icon_blocked_stranicha.webp'));
console.log('World API wiring: shared Worker + shared DB + authenticated iframe + guarded client PASS');


// Runtime regression: the runner is embedded through iframe.srcdoc. On some
// browsers about:srcdoc exposes location.origin="null", even when the hosting
// document's origin is usable by the same-origin bridge. A successful server
// authorization must still reach the verified parent and open the city.
const runtimeEscaped=main.match(/&lt;script id=&quot;zefirok-world-locked-inline-runtime-v1&quot;&gt;([\s\S]*?)&lt;\/script&gt;/)?.[1];
assert(runtimeEscaped,'missing world-locked runtime');
const runtime=runtimeEscaped.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&');
const messages=[];
let clickHandler=null;
let signed='test-signed-telegram-init-data';
let allowed=true;
let requests=0;
const screen={hidden:true,innerHTML:'',addEventListener(){},querySelector(){return {focus(){}}}};
const game={hidden:false};
const entry={addEventListener(type,fn){if(type==='click')clickHandler=fn;}};
const root={querySelector(selector){if(selector.includes('world-locked'))return screen;if(selector.includes('world-open'))return entry;if(selector.includes('game'))return game;return null;},querySelectorAll(){return [game,screen];}};
const parentOrigin='https://zefirok-run.test';
const parent={location:{origin:parentOrigin},postMessage(data,targetOrigin){
  assert.equal(targetOrigin,parentOrigin,'tester open message must target the real parent origin');
  messages.push(data);
}};
const host={auth:()=>signed,running:()=>false,world:()=>{screen.hidden=false;game.hidden=true;},back:()=>{screen.hidden=true;game.hidden=false;}};
const windowMock={parent,zefirokTaskHost:host,requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout:()=>{}};
const context={
  window:windowMock,document:{querySelector:()=>root},location:{origin:'null'},
  AbortController,fetch:async(path,init)=>{
    requests++;
    assert.equal(path,'/api/world/state');
    assert.equal(JSON.parse(init.body).initData,signed);
    return {ok:allowed,json:async()=>({ok:allowed,serverAuthoritative:allowed})};
  },
};
runInNewContext(runtime,context,{timeout:2000});
assert.equal(typeof clickHandler,'function');
const click=()=>clickHandler({preventDefault(){}});
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
click();await flush();
assert.equal(requests,1,'server authorization required before opening the World overlay');
assert.equal(messages.length,1,'successful tester must receive parent open message');
assert.equal(messages[0].type,'zeffi-world-tester-open');
allowed=false;click();await flush();
assert.equal(messages.length,1,'server denial must not open the World overlay');
signed='';click();await flush();
assert.equal(messages.length,1,'unsigned player must not open the World overlay');
console.log('Zeffi World tester srcdoc parent message bridge PASS');
