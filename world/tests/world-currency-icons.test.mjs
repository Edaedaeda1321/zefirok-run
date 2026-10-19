import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const file = name => readFileSync(new URL(name,import.meta.url),'utf8');
const app=file('../app.js');
const ui=file('../premium-ui.css');
const story=file('../story/app.js');
const storyCss=file('../story/style.css');
const personalHtml=file('../../world.html');
const storyHtml=file('../../story-world.html');

function sourceFunction(name){
 const start=app.indexOf(`function ${name}(`);
 assert.ok(start>=0,`${name} is present`);
 // Top-level declarations close with a solitary brace at column zero.
 const end=app.indexOf('\n}\n',start);
 assert.ok(end>start,`${name} closes`);
 return app.slice(start,end+3);
}
function fakeNode(tag){
 return {tag,children:[],attributes:{},append(...nodes){this.children.push(...nodes)},
  setAttribute(k,v){this.attributes[k]=v},textContent:'',src:'',title:''};
}

test('the accessible fallback says the actual currency, never star or sparkles',()=>{
 const source=sourceFunction('priceLabel');
 assert.doesNotMatch(source,/★|✨|☕/);
 const context={PRICE_FIELDS:['points','coffee','treats'],PRICE_NAMES:{points:'очков',coffee:'кофе',treats:'зефира'},tr:()=> 'Бесплатно',Number};
 runInNewContext(`${source}\nthis.priceLabel=priceLabel`,context);
 assert.equal(context.priceLabel({points:50,coffee:0,treats:0}),'50 очков');
 assert.equal(context.priceLabel({points:50,coffee:70,treats:3}),'50 очков + 70 кофе + 3 зефира');
 assert.equal(context.priceLabel({points:0,coffee:0,treats:0}),'Бесплатно');
});

test('inline payments use the canonical World WebP for all three currencies',()=>{
 const source=[sourceFunction('priceLabel'),sourceFunction('appendWorldPrice')].join('\n');
 const PRICE_IMAGES={points:'../assets/mir_zeffi/iconScore.webp',coffee:'../assets/mir_zeffi/iconCoffee.webp',treats:'../assets/mir_zeffi/zefir_currency.webp'};
 const ctx={document:{createElement:fakeNode},PRICE_IMAGES,PRICE_FIELDS:['points','coffee','treats'],PRICE_NAMES:{points:'очков',coffee:'кофе',treats:'зефира'},tr:()=> 'Бесплатно',Number};
 runInNewContext(`${source}\nthis.appendWorldPrice=appendWorldPrice`,ctx);
 const parent=fakeNode('div'),row=ctx.appendWorldPrice(parent,{points:75,coffee:20,treats:3});
 assert.equal(parent.children.length,1);
 assert.equal(row.children.length,3);
 for(const [i,key] of ['points','coffee','treats'].entries()){
  assert.equal(row.children[i].children[0].src,PRICE_IMAGES[key]);
  assert.ok(row.children[i].children[1].textContent);
 }
 const free=ctx.appendWorldPrice(fakeNode('div'),{points:0,coffee:0,treats:0});
 assert.equal(free.children[0].textContent,'Бесплатно');
});

test('road, bus road, construction and parcel previews all render images, including zero-cost road tiles',()=>{
 assert.match(app,/summaryCost=price;/,'parcel and building prices use DOM icons');
 assert.match(app,/summaryCost=cost;/,'roads reuse live per-stroke server-side prices');
 assert.match(app,/setEditSummary\(summary,summaryCost\);/);
 assert.match(app,/function setEditSummary\(label,cost=null\)/);
 assert.match(app,/if\(!count\)\{const free=.*tr\('free'\)/);
 assert.match(app,/function showToast\(message, isError = false, cost = null\)/);
 assert.match(app,/showToast\(tr\(msg\).*false,paid\)/);
 assert.match(app,/if\(mode==='bus-road'\)addCatalogPrice\(cost,ROAD_TILE_PRICE\)/,'transport shop displays score icon on 50-point tile price');
 assert.match(app,/world-bus-road-shop-art/,'the existing uploaded bus-road illustration is used');
 assert.doesNotMatch(app,/priceLabel\(paid\)|priceLabel\(cost\):/,'payment toasts must not revert to unicode stars');
});

test('all displayed financial symbols reference existing transparent WebP assets',()=>{
 for(const image of ['iconScore.webp','iconCoffee.webp','zefir_currency.webp','icon_shop_road_bus.webp']){
  const path=new URL(`../../assets/mir_zeffi/${image}`,import.meta.url);
  assert.ok(existsSync(path),`image exists: ${image}`);
  const bytes=readFileSync(path);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF',image);
  assert.equal(bytes.subarray(8,12).toString(),'WEBP',image);
 }
 assert.match(app,/const PRICE_IMAGES = CITY_REWARD_IMAGES;/);
 assert.match(app,/assets\/mir_zeffi\/iconScore\.webp/);
 assert.match(app,/assets\/mir_zeffi\/iconCoffee\.webp/);
 assert.match(app,/assets\/mir_zeffi\/zefir_currency\.webp/);
 assert.match(ui,/\.world-inline-price__piece img\{/);
 assert.match(ui,/\.world-bus-road-figure \.world-bus-road-shop-art\{/);
});

test('shared city fund amounts show the same score artwork, while test credits stay distinct',()=>{
 assert.match(story,/const realPoints=n=>/);
 assert.match(story,/realPoints\(p\.expectedDebitPoints\)/);
 assert.match(story,/realPoints\(sharedSnapshot\.walletPoints\)/);
 assert.match(story,/choices\.map\(n=>`<button[^\n]+realPoints\(n\)/);
 assert.match(story,/realPoints\(p\.next-p\.total\)/);
 assert.match(story,/realPoints\(e\.total\)\} \/ \$\{realPoints\(e\.goal\)/);
 assert.match(story,/test credits remain explicitly labeled/i);
 assert.match(storyCss,/\.zeffi-real-points img\{/);
 const value=7800;
 const markup=`<span class="zeffi-real-points" aria-label="${value.toLocaleString('ru-RU')} очков"><img src="../assets/mir_zeffi/iconScore.webp" width="18" height="18" alt="" decoding="async"><b>${value.toLocaleString('ru-RU')}</b></span>`;
 assert.match(markup,/iconScore\.webp/);
 assert.doesNotMatch(markup,/★|✨/);
});

test('hosted personal and common World load the new UI without stale asset versions',()=>{
 assert.match(personalHtml,/premium-ui\.css\?v=world-ui-fix2/);
 assert.match(personalHtml,/app\.js\?v=world-ui-fix2/);
 assert.match(storyHtml,/story\/style\.css\?v=currency-icons1/);
 assert.match(storyHtml,/story\/boot\.js\?v=currency-icons1/);
 assert.match(file('../story/boot.js'),/await import\('\.\/app\.js\?v=currency-icons1'\)/);
});
