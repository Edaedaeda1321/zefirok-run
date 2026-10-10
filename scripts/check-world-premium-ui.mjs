#!/usr/bin/env node
// UI-only gate: the two world entrypoints must have identical interactive controls.
// No Telegram credentials, worker requests, schema changes, or mutations occur here.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const entries = ['world.html', 'world/index.html'];
const assets = [
 'assets/optimized/v0.79.5/iconScore.webp',
 'assets/optimized/v0.79.5/iconCoffee.webp',
 'assets/season-pass/zefir_currency.webp'
];
for(const file of assets)assert(existsSync(file),`Currency asset missing: ${file}`);
const mandatoryIds = [
 'zeffiReturnGame','helpButton','walletPoints','walletCoffee','walletTreats',
 'openBuildCatalog','catalogToggle','bottomPanel','metricsToggle','cityMetrics',
 'categoryTabs','catalogList','warehouseList','warehouseButton',
 'toolSelect','toolRoad','toolErase','toolExpand',
 'rotateButton','confirmEdit','cancelEdit','selectionPanel',
 'zoomIn','zoomOut','centerCamera','worldCanvas','saveStatus'
];
for(const file of entries){
 const html=read(file);
 assert(html.includes('href="./premium-ui.css"'),`${file}: premium stylesheet not loaded`);
 for(const id of mandatoryIds){
  const count=(html.match(new RegExp(`id="${id}"`,'g'))||[]).length;
  assert.equal(count,1,`${file}: ${id} must occur exactly once`);
 }
 for(const filePath of assets)assert(html.includes(`src="../${filePath}"`),`${file}: original ${filePath} not used`);
}
const world=read('world.html'),app=read('world/app.js'),css=read('world/premium-ui.css');
assert(world.includes('if(testerRequest&&await isAuthorizedTester()){launchCity();return;}'),'Tester authorization accidentally changed');
assert(world.includes('window.ZeffiWorldServerRequired=!local'),'Server mode guard lost');
assert(app.includes("return await")===false || app.includes("serverRequest('mutate'") , 'unexpected mutation call changed');
assert(app.includes("await serverRequest('mutate'"),'Authoritative city mutations not wired');
assert(app.includes('state.catalogOpen'),'UI drawer state missing');
assert(app.includes('setCatalogOpen(false)'),'Placement fails to close drawer');
assert(css.includes('.bottom-panel.is-collapsed'),'Collapsed sheet style missing');
assert(css.includes('prefers-reduced-motion'),'Reduced motion support missing');
console.log('World premium UI OK: entrypoints, controls, local currency assets and guarded server flow.');
