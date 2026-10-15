#!/usr/bin/env node
// UI-only contract for Release Candidate: no D1 access, no account writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG_ITEMS,CATALOG} from '../world/catalog.js';
const read=path=>readFileSync(path,'utf8');
const app=read('world/app.js');
const world=read('world.html');
const sandbox=read('world/index.html');
const ui=read('world/premium-ui.css');
const story=read('world/story/style.css');

assert.equal(CATALOG['white-rabbit-zephirok'].minCityLevel,10,'Белый Кролик должен открываться с 10 уровня');
assert.equal(CATALOG_ITEMS.length,51);
assert.ok(CATALOG_ITEMS.every(def=>Number.isSafeInteger(def.minCityLevel)&&def.minCityLevel>=1));
assert.match(app,/levelBadge\.textContent=`С ур\. \$\{shopRequiredLevel\(def\)\}`/,'каждая карточка показывает серверный уровень');
assert.match(app,/fig\.append\(levelBadge\)/,'плашка должна находиться на изображении, не под ценой');
assert.match(ui,/\.catalog-figure \.catalog-level-badge\{/,'в каталоге нужен видимый уровень');
assert.match(app,/className='catalog-lock-mark'/,'старый замок сохранён');
assert.match(app,/shopRequiredLevel\(def\)>shopCurrentLevel\(\)/,'ограничения покупок сохранены');
assert.match(app,/await serverRequest\('mutate'/,'серверная операция покупки не должна быть заменена локальной');
for(const [kind,html] of [['hosted',world],['offline',sandbox]]){
 assert.doesNotMatch(html,/class="panel-footer"/,`${kind}: footer должен быть убран из каталога`);
 assert.match(html,/<button[^>]*id="resetButton"[^>]*hidden/,`${kind}: скрытый DOM-хук для локальной разработки сохранён`);
}
assert.doesNotMatch(app,/querySelector\('\.panel-footer/, 'старая запись в удалённый footer не должна вызывать ошибку');
assert.match(world,/premium-ui\.css\?v=rc-construction-premium1/,'production CSS must refresh');
assert.match(world,/app\.js\?v=cc-p1-1/,'production catalog JS must refresh');
for(const css of [ui,story]){
 assert.match(css,/-webkit-user-select:none;user-select:none;/,'игровой текст нельзя выделять на iOS');
 assert.match(css,/input,textarea,\[contenteditable="true"\]\{-webkit-user-select:text;/,'поля ввода остаются пригодны для редактирования');
}
console.log('PASS: 51 строительная карточка, Белый Кролик ур. 10, видимые уровни, убран footer, закрытый RC и iOS no-select');
