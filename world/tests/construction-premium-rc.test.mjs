import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {constructionSkipPrice} from '../engine.js';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../../world.html');
const sandbox = read('../index.html');
const app = read('../app.js');
const renderer = read('../renderer.js');
const css = read('../premium-ui.css');
const icon = '../assets/mir_zeffi/iconCoffee.webp';

test('premium skip and selection UI use canonical coffee WebP, not emoji',()=>{
 for(const page of [html,sandbox]){
  assert.ok(page.includes(`src="${icon}"`));
  for(const id of ['finishBuildTestCost','selectionBuildPercent','selectionBuildFill','selectionBuildTrack','skipModalCost','skipModalWallet','skipModalRemaining','skipAcceptCost','skipModalDiscount']){
   assert.match(page,new RegExp(`id="${id}"`));
  }
  assert.ok(!page.includes('Ускорить · 70 ☕'));
 }
 assert.match(app,/\$\('finishBuildTestCost'\)\.textContent=cost\.coffee\.toLocaleString/);
 assert.match(app,/\$\('skipAcceptCost'\)\.textContent=cost\.coffee\.toLocaleString/);
 assert.doesNotMatch(app,/\$\('finishBuildTest'\)\.textContent=[^\n]*☕/);
 assert.doesNotMatch(app,/\$\('skipAccept'\)\.textContent=[^\n]*☕/);
});

test('progress is derived from persisted construction timestamps only',()=>{
 assert.match(app,/Number\(item\.buildReadyAt\|\|now\)-Number\(item\.buildStartedAt\|\|now\)/);
 assert.match(app,/constructionRemaining\(item,now\)/);
 assert.match(app,/setAttribute\('aria-valuenow',String\(progress\)\)/);
 assert.match(renderer,/ctx\.scale\(1\/zoom,1\/zoom\)/);
 assert.match(renderer,/drawConstructionSite\(ctx,item,def,now,null,cam\.zoom\)/);
 assert.match(renderer,/fillW=barW\*Math\.max\(0,Math\.min\(1,progress\)\)/);
});

test('server-confirmed skip quote and discount remain untouched by visual design',()=>{
 const now=1800000000000;
 const item={kind:'cottage',buildStartedAt:now,buildReadyAt:now+300000};
 assert.equal(constructionSkipPrice(item,now).coffee,70);
 assert.equal(constructionSkipPrice(item,now+60000).coffee,45);
 assert.equal(constructionSkipPrice(item,now+120000).coffee,20);
 assert.match(app,/SERVER_MODE\?\{city:null\}:skipConstruction/);
 assert.match(app,/await performServerAction\('skip',\{uid\}\)/);
 assert.match(app,/\$\('skipAccept'\)\.disabled=state\.skipPreparingUid/);
});

test('style remains scoped to construction panels; nav and catalog stay intact',()=>{
 assert.ok(css.includes('/* Zeffi World RC — construction premium HUD.'));
 assert.match(css,/\.map-zone \.selection-panel\{/);
 assert.match(css,/\.skip-premium-card\{/);
 assert.match(css,/\.construction-progress__track/);
 assert.ok(html.includes('zeffi-bus-image-v3'));
 assert.ok(!app.includes('localStorage.setItem(\'zeffi-world-timer\''));
});
