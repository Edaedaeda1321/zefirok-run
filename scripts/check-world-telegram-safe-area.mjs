#!/usr/bin/env node
// Regression guard for Mir Zeffi under the iOS/Android Telegram host iframe.
// No server, credentials, network, or database access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(file,'utf8');
const host=read('index.html');
const world=read('world.html');
const sandbox=read('world/index.html');
const css=read('world/premium-ui.css');
const app=read('world/app.js');
assert(host.includes('padding:var(--zefirok-content-safe-top,env(safe-area-inset-top,0px)) 0 var(--zefirok-content-safe-bottom,env(safe-area-inset-bottom,0px))'), 'parent must use Telegram content-safe-area snapshot');
assert(host.includes('max-height:var(--zefirok-app-height,100dvh)'), 'parent must clamp to Telegram viewport height');
assert(host.includes("e?.data?.type!=='zefirok-world-ui-ready'"), 'missing embedded-ready listener');
assert(host.includes('e.source!==target?.contentWindow||e.origin!==location.origin'), 'iframe messages must be same-origin and source-verified');
assert(host.includes("header.style.display='none'"), 'duplicate parent navigation must collapse on auth');
assert(host.includes("if(e?.data?.type!=='zefirok-world-close'"), 'host back/close must remain functional');
for(const [filename,html] of [['world.html',world],['world/index.html',sandbox]]){
 assert(html.includes("window.frameElement?.parentElement?.id === 'zeffi-world-preview-layer'"), `${filename}: host nesting detection missing`);
 assert(html.includes("document.documentElement.classList.add('zeffi-world-framed')"), `${filename}: safe-area double count must be prevented`);
 for(const id of ['walletPoints','walletCoffee','walletTreats','bottomPanel','catalogToggle','zeffiReturnGame'])assert(html.includes(`id="${id}"`),`${filename}: missing ${id}`);
}
assert(world.includes("if(testerRequest&&await isAuthorizedTester()){launchCity();return;}"),'tester must remain server-authenticated');
assert(world.includes("window.parent.postMessage({type:'zefirok-world-ui-ready'},location.origin)"), 'auth success must notify host');
assert(world.indexOf('window.parent.postMessage({type:\'zefirok-world-ui-ready\'}')>world.indexOf('function launchCity(){'), 'ready signal must occur only within launchCity');
assert(css.includes(':root.zeffi-world-framed{--zeffi-safe-top:0px;--zeffi-safe-bottom:0px}'), 'nested world must consume no additional inset');
assert(css.includes('var(--zeffi-safe-bottom)'), 'mobile bottom sheet must use safe inset');
assert(css.includes('.app-shell.catalog-expanded .world-tools'), 'expanded catalog needs a non-overlapping tool rail');
assert(css.includes('@media (max-width:700px) and (max-height:670px)'), 'compact price layout must remain');
assert(app.includes("$('app').classList.toggle('catalog-expanded',state.catalogOpen)"), 'catalog state must drive tool rail');
assert(app.includes('setCatalogOpen(window.innerWidth>700||window.innerHeight>=570)'), 'short Telegram viewports must default to an unobstructed city');
console.log('World Telegram safe-area and compact-layout contract PASS');
