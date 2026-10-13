#!/usr/bin/env node
// Story World v1: local simulation, server-authorized tester entrance, no economy writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {requiredStorySpriteIds} from '../world/story/view.js';
import {spriteMetadata} from '../world/sprite-assets.js';
import {buildStoryMap,validateStoryMap} from '../world/story/map.js';
import {createDemoState} from '../world/story/model.js';
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');let checks=0;
function check(label,test){assert.ok(test,label);checks++;console.log('OK '+label);}
const html=read('story-world.html'),boot=read('world/story/boot.js'),app=read('world/story/app.js'),model=read('world/story/model.js'),entry=read('world/story/entry.js'),world=read('world.html'),service=read('src/zeffi-world-service.js'),gate=read('scripts/check-production-gate.mjs'),runner=read('index.html'),worker=read('src/worker.js');
const once=(text,needle)=>text.split(needle).length===2;
check('separate hosted page with production auth loader',once(html,'./story/boot.js?v=rc-guide1')&&html.includes('<base href="./world/"'));

check('candidate game button requires signed authoritative personal state',runner.includes("fetch('/api/world/state'")&&runner.includes("data?.serverAuthoritative!==true")&&!runner.includes("fetch('/api/world/story-access'"));
check('tester navigation opens personal city first, with guarded common story switch',runner.includes("openWorld('personal');")&&runner.includes("frame.src=view==='story'?'./story-world.html'")&&runner.includes("e?.data?.type!=='zefirok-world-switch'")&&runner.includes("button.addEventListener('click',()=>openWorld())"));
check('release switch and allowlist gate story and personal city',service.includes("if(!worldEnabled(env))failure(403,'WORLD_DISABLED'")&&service.indexOf('assertTester(env,telegramId);')<service.indexOf("if(new URL(request.url).pathname==='/api/world/story-access'){"));
check('existing schema contract still protects story authentication',worker.includes('if (shouldEnforceRuntimeSchemaContract(url.pathname))')&&!worker.includes("if (path==='/api/world/story-access') return false;"));
check('story iframe returns to the main game rather than locked personal city',app.includes("window.parent.postMessage({type:'zefirok-world-close'},location.origin)")&&html.includes('href="../">Вернуться в Сладкий Забег'));
check('single common-world navigation hook',once(world,"import('./story/entry.js?v=3')")&&entry.includes('stopImmediatePropagation()')&&entry.includes('dataset.storyV1'));
check('signed same-origin Telegram auth bridge',boot.includes('event.source!==window.parent||event.origin!==location.origin')&&boot.includes('zeffi-world-request-init-data')&&boot.includes('initData'));
check('URL flags and localhost do not authorize hosted entry',!/(?:location\.(?:hostname|protocol)|URLSearchParams|localStorage|initDataUnsafe\s*[.\[])/.test(boot.replace(/^\/\/.*$/gm,'')));
check('one bounded access API, no cache',once(boot,"fetch('/api/world/story-access'")&&boot.includes('AbortController')&&boot.includes("cache:'no-store'")&&boot.includes("credentials:'same-origin'"));
check('app imported only after server access response',boot.indexOf("await import('./app.js?v=rc-guide1')")>boot.indexOf("payload?.access!=='tester'")&&boot.includes("payload?.mode!=='local-demo'"));
check('existing signed tester assertion precedes new API branch',service.indexOf('assertTester(env,telegramId);')<service.indexOf("pathname==='/api/world/story-access'"));
const begin=service.indexOf("pathname==='/api/world/story-access'"),end=service.indexOf("// Zeffi shared fund v1: independent signed community endpoints",begin),branch=service.slice(begin,end);
check('read-only access gate exits before D1/schema/player writes',begin>0&&end>begin&&branch.includes("return reply({ok:true,access:'tester'")&&!/(?:ensureCity|profileReader|opGate|\.prepare\(|\.batch\(|walletFromProfile)/.test(branch));
check('optional emergency switch and explicit simulation contract',branch.includes('WORLD_STORY_ENABLED')&&branch.includes('globalSync:false,walletWrites:false'));
check('local simulation has no API, personal save or reward calls',![model,read('world/story/map.js')].some(s=>/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\/api\/|ensureCity|claimCityLevelReward|applyWorldAction|saveCity|sanitizeCity/.test(s.replace(/^\/\/.*$/gm,'')))&&!/\/api\/world\/(?:mutate|state)/.test(app));
check('isolated versioned demo storage; no bulk deletion',model.includes('zefirok-story-world-demo-v1')&&!/localStorage\.clear\(|storage\.clear\(/.test(model));
check('original renderer, residents, buses and sprite loader reused',app.includes("from '../renderer.js'")&&app.includes("from '../citizens.js'")&&app.includes("from '../traffic.js'")&&app.includes('preloadSpriteSet'));
check('visibility, motion and bounded rendering lifecycle',app.includes('visibilitychange')&&app.includes('cancelAnimationFrame')&&app.includes('prefers-reduced-motion')&&app.includes('dispose()')&&app.includes('ResizeObserver'));
check('release gate includes both wiring and behavior tests',once(gate,"['scripts/check-world-story-v1.mjs']")&&once(gate,"['--test','world/tests/story-world-v1.test.mjs','world/tests/story-access-v1.test.mjs','world/tests/festival-hall-stages-v1.test.mjs']"));
for(const name of ['.assetsignore','.gitignore'])check(name+' excludes local artifacts and backups',['.world-story-v1-backup/','.story-standalone-output/','START_STORY_WORLD.html'].every(s=>read(name).split('\n').includes(s)));
check('offline compiler strips hosted boot and embeds exact assets',read('scripts/build-world-story-v1.py').includes('ZeffiEmbeddedSprites')&&read('scripts/build-world-story-v1.py').includes('boot\\.js'));
for(let chapter=0;chapter<3;chapter++)check('authored map valid in chapter '+chapter,validateStoryMap(buildStoryMap({...createDemoState(),chapter})).length===0);
let bytes=0;const ids=requiredStorySpriteIds();for(const id of ids){const meta=spriteMetadata(id);assert.ok(meta,id);const p=path.join(root,'world',meta.fileWebp);assert.ok(fs.existsSync(p),'missing '+p);bytes+=fs.statSync(p).size;}
check('bounded existing WebP payload',ids.length>20&&ids.length<90&&bytes<8*1024*1024);
for(const file of ['world/story/model.js','world/story/map.js','world/story/view.js','world/story/app.js','world/story/boot.js','world/story/entry.js','src/zeffi-world-service.js']){const r=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);checks++;}
console.log(`Story World v1: ${checks} checks passed; ${ids.length} existing sprites, ${bytes} bytes. Signed server fund is separately tested.`);