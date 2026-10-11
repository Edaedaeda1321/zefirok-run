import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('world/app.js','utf8');
const css=readFileSync('world/premium-ui.css','utf8');
const base=readFileSync('world/world.css','utf8');
const builder=readFileSync('world/build-standalone.py','utf8');
const pass=readFileSync('battle-pass.html','utf8');
const icon=readFileSync('assets/ui/icon_closed.webp');
const checks=[
 ['season pass uses the existing lock WebP',()=>assert.match(pass,/reward-lock-icon[^\n]*icon_closed\.webp/)],
 ['WebP magic bytes valid',()=>{assert.equal(icon.toString('ascii',0,4),'RIFF');assert.equal(icon.toString('ascii',8,12),'WEBP');}],
 ['world shop uses the same lock art',()=>assert.match(app,/icon\.src='\.\.\/assets\/ui\/icon_closed\.webp'/)],
 ['lock is a DIV instead of a legacy oversized SPAN',()=>{assert.match(app,/createElement\('div'\);mark\.className='catalog-lock-mark'/);assert.doesNotMatch(app,/levelTag\.textContent=`🔒 Ур\./);}],
 ['explicit ARIA-hidden decorative artwork',()=>{assert.match(app,/mark\.setAttribute\('aria-hidden','true'\)/);assert.match(app,/icon\.alt=''/);}],
 ['no huge lock banner from v17',()=>assert.doesNotMatch(css,/\.catalog-level-lock\s*\{/) ],
 ['season-pass-like overlay sizing',()=>{assert.match(css,/\.catalog-figure \.catalog-lock-icon\{[^}]*width:34px;height:34px/);assert.match(css,/\.catalog-figure \.catalog-lock-mark\{[^}]*place-items:center/);}],
 ['mobile sizing independent of legacy SPAN',()=>assert.match(css,/\.catalog-figure \.catalog-lock-icon\{width:29px;height:29px/)],
 ['legacy figure SPAN selector detected; DIV avoids it',()=>assert.match(base,/\.catalog-figure span\{/)],
 ['standalone builder includes the existing WebP as data URL',()=>{assert.match(builder,/assets\/ui\/icon_closed\.webp/);assert.match(builder,/lock_token/);assert.match(builder,/base64\.b64encode\(lock_path\.read_bytes\(\)\)/);}],
 ['all unlock levels still come from catalog',()=>assert.match(app,/shopRequiredLevel\(def\)>shopCurrentLevel\(\)/)],
 ['level notice still appears beneath cost',()=>assert.match(app,/status\.textContent=`Доступно с уровня \$\{shopRequiredLevel\(def\)\}`/)]
];
for(const [name,check] of checks){check();console.log('PASS',name)}
console.log(`World shop lock v18: ${checks.length} guards PASS`);
