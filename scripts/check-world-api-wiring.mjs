import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
const worker=fs.readFileSync('src/worker.js','utf8');
const server=fs.readFileSync('src/zeffi-world-service.js','utf8');
const main=fs.readFileSync('index.html','utf8');
const world=fs.readFileSync('world.html','utf8');
const client=fs.readFileSync('world/app.js','utf8');
const storyPage=fs.readFileSync('story-world.html','utf8');
const storyBoot=fs.readFileSync('world/story/boot.js','utf8');
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
assert(!world.includes("get('world_tester')==='1'"), 'RC access cannot depend on URL flags');
assert(world.includes('async function isAuthorizedTester()'), 'hosted city must check server authorization');
assert(world.includes('personal.payload?.serverAuthoritative===true') && world.includes("request('/api/world/state')"), 'signed server-authoritative personal city remains guarded');
assert(!world.includes("request('/api/world/story-access')") && world.includes("request('/api/world/state')"), 'RC must never fall back from D1 to local sandbox');
assert(world.includes('const candidateAccess=await isAuthorizedTester();') && world.includes('if(candidateAccess?.server===true){launchCity(candidateAccess);return;}') && world.includes('window.ZeffiWorldServerRequired=access.server===true'), 'only server-authoritative RC can load city modules');
assert(world.includes('event.source!==window.parent||event.origin!==location.origin'), 'World auth messages must be same-origin parent');
// The personal-city iframe keeps its original guarded entry. An allowlisted
// tester now enters the guarded personal World first, with a signed,
// read-only story fallback when WORLD_ENABLED is off.
assert(main.includes("frame.src=view==='story'?'./story-world.html':(location.protocol==='file:'?'./world-preview.html':'./world.html')"), 'tester World overlay must choose guarded story page without bypassing personal city');
assert(main.includes("openWorld('personal');"), 'signed runner request must navigate directly to guarded personal city');
assert(main.includes("e?.data?.type!=='zefirok-world-switch'")&&main.includes("e.source!==target?.contentWindow||e.origin!==location.origin")&&main.includes("view!=='personal'&&view!=='story'"), 'World frame switching must verify source, same origin and exact destinations');
assert(main.includes("fetch('/api/world/state'"), 'runner must authorize server-authoritative city state');
assert(main.includes("data?.serverAuthoritative!==true")&&main.includes('!Number.isSafeInteger(data?.revision)'), 'runner must reject a fake city response');
assert(main.includes("if(token!==openToken||screen.hidden)return;"), 'stale or dismissed entry must not reopen story World');
assert(main.includes("credentials:'same-origin',cache:'no-store'"), 'tester entry auth fetch must remain uncached and same-origin');
assert(storyPage.includes('<base href="./world/"')&&storyPage.includes('./story/boot.js?v=rc-story1'), 'hosted story page must load the signed access loader');
assert(storyBoot.includes("fetch('/api/world/story-access'")&&storyBoot.includes("payload?.access!=='tester'")&&storyBoot.includes("payload?.mode!=='server-story'"), 'story modules must wait for repeat server authorization');
assert(storyBoot.indexOf("await import('./app.js?v=rc-story1')")>storyBoot.indexOf("payload?.access!=='tester'"), 'unauthorized players must never import story modules');
assert(storyBoot.includes("event.source!==window.parent||event.origin!==location.origin"), 'story auth bridge must trust only the same-origin parent frame');
assert(server.includes("if(!worldEnabled(env))failure(403,'WORLD_DISABLED'"), 'all World routes must be disabled without WORLD_ENABLED');
assert(server.indexOf('assertTester(env,telegramId);')<server.indexOf("pathname==='/api/world/story-access'"), 'only signed allowlisted testers may access read-only story');
const storyBegin=server.indexOf("pathname==='/api/world/story-access'");
const storyEnd=server.indexOf("// Zeffi shared fund v1: independent signed community endpoints",storyBegin);
assert(storyEnd>storyBegin, "story read-only access must return before fund wallet route");
const access=server.slice(storyBegin,storyEnd);
assert(access.includes("WORLD_STORY_ENABLED")&&access.includes("return reply({ok:true,access:'tester'"), 'story entry must keep emergency gate and explicit tester-only response');
assert(!/(?:db\.prepare|db\.batch|ensureCity\(|walletFromProfile\()/i.test(access), 'story access must not touch city state or wallet');
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
console.log('World API wiring: shared Worker + tester-only common story + guarded personal city PASS');


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
    assert.equal(init.method,'POST');
    assert.equal(init.credentials,'same-origin');
    assert.equal(init.cache,'no-store');
    assert.equal(JSON.parse(init.body).initData,signed);
    return {ok:allowed,json:async()=>allowed
      ?{ok:true,serverAuthoritative:true,revision:0}
      :{ok:false,code:'WORLD_NOT_AVAILABLE'}};
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
assert.equal(screen.hidden,false,'signed tester still needs the in-app teaser lifecycle to be active');
allowed=false;click();await flush();
assert.equal(messages.length,1,'server denial must not open the World overlay');
signed='';click();await flush();
assert.equal(messages.length,1,'unsigned player must not open the World overlay');
assert.equal(requests,2,'unsigned player must not send the authorization request');
signed='test-signed-telegram-init-data';allowed=true;
click();screen.hidden=true;await flush();
assert.equal(messages.length,1,'a dismissed World screen must not open when its authorization resolves late');
console.log('Zeffi World RC signed server-state and origin bridge PASS');
