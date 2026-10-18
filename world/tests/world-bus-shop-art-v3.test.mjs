import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const root = new URL('../../',import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');
const app=read('world/app.js');
const css=read('world/premium-ui.css');
const hosted=read('world.html');
const art=readFileSync(new URL('assets/mir_zeffi/icon_shop_road_bus.webp',root));
const V='zeffi-bus-image-v3';

test('the shipped picture is the user-provided original transparent WebP',()=>{
 assert.equal(art.subarray(0,4).toString(),'RIFF');
 assert.equal(art.subarray(8,12).toString(),'WEBP');
 assert.equal(createHash('sha256').update(art).digest('hex'),'500e04fd1014aeb92139bd1a362628b7bff6ef2e1ff44945f6ed40710e21448b');
 const manifest=read('assets/images-manifest.json');
 assert.match(manifest,/mir_zeffi\/icon_shop_road_bus\.webp/);
 assert.match(manifest,/500e04fd1014/);
});

test('a real transport catalog render inserts a full bus WebP image instead of an emoji',()=>{
 const from=app.indexOf('function renderCatalog(){');
 const to=app.indexOf('function renderCatalogSelection(){',from);
 assert.ok(from>=0&&to>from,'catalog function found');
 const nodes=[];
 function createElement(tag){
  const el={tag,children:[],dataset:{},hidden:false,attributes:{},
    append(...children){this.children.push(...children)},
    replaceChildren(...children){this.children=[...children]},
    setAttribute(key,val){this.attributes[key]=val},
    addEventListener(){},
  };
  nodes.push(el);return el;
 }
 const list=createElement('div');
 const fakeDocument={createElement};
 const source=app.slice(from,to).replaceAll('import.meta.url',"'https://example.test/world/app.js'");
 runInNewContext(source+'\nrenderCatalog();',{
  document:fakeDocument,$:()=>list,state:{category:'transport'},
  shopSortedItems:()=>[],renderCatalogSelection:()=>{},SERVER_MODE:false,URL,console,
 });
 assert.equal(list.children.length,2,'two transport cards');
 const [bus,erase]=list.children;
 assert.equal(bus.dataset.busRoadTool,'bus-road');
 assert.equal(erase.dataset.busRoadTool,'erase-bus-road');
 const figure=bus.children[0];
 const imgs=figure.children.filter(node=>node.tag==='img');
 assert.equal(imgs.length,1,'original bus illustration is an actual img');
 assert.equal(imgs[0].src,'https://example.test/assets/mir_zeffi/icon_shop_road_bus.webp');
 assert.equal(imgs[0].loading,'eager');
 assert.equal(imgs[0].width,1254);
 assert.equal(figure.children.filter(node=>node.tag==='span').length,0,'no emoji bus fallback');
 assert.equal(bus.children[1].children[0].textContent,'Автобусная дорога');
 assert.equal(erase.children[0].children[0].textContent,'↶','erase action keeps its symbol');
});

test('catalog CSS makes the image fill its card and avoids clipped special-card titles',()=>{
 assert.match(css,/ZEFFI_BUS_SHOP_IMAGE_V3/);
 assert.match(css,/\.world-bus-road-shop-art\{/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/\.world-bus-road-tool \.catalog-copy small\{/);
 assert.match(css,/-webkit-line-clamp:3/);
 assert.match(css,/\.world-bus-road-shop-art\[hidden\]\{display:none!important\}/);
});

test('Telegram reloads versioned bus-card CSS and app.js instead of stale versions',()=>{
 assert.ok(hosted.includes('./premium-ui.css?v='+V));
 assert.ok(hosted.includes("script.src='./app.js?v="+V+"'"));
 assert.match(read('scripts/check-world-dual-v1.mjs'),new RegExp('app\\.js\\?v='+V));
 assert.ok(read('scripts/check-world-catalog-rc-ui.mjs').includes(String.raw`premium-ui\.css\?v=${V}`));
});

test('fix is presentation-only and the previous World D1 protections remain test-gated',()=>{
 assert.match(app,/switchMode\(mode\)/);
 assert.match(app,/SERVER_MODE&&!state\.serverPurchasesEnabled/);
 assert.match(read('scripts/check-production-gate.mjs'),/world-bus-shop-art-v3\.test\.mjs/);
 assert.match(read('scripts/check-production-gate.mjs'),/bus-roads-d1\.test\.mjs/);
});
