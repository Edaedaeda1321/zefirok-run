import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {mountCityChapters} from '../city-chapters-ui.js';

// Tiny DOM stand-in: regression tests use built-in Node only (no browser,
// network, signed Telegram token, payment route or Cloudflare D1).
class Element {
 constructor(tag){
  this.tag=tag;this.children=[];this.attributes={};this.listeners={};
  this.dataset={};this.style={};this.className='';this.textContent='';this.hidden=false;
 }
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 addEventListener(type,cb){this.listeners[type]=cb;}
 focus(){}
 scrollIntoView(){}
 querySelectorAll(selector){
  const result=[];
  const check=child=>{
   if(!(child instanceof Element))return;
   if(selector.startsWith('.') && child.className.split(' ').includes(selector.slice(1)))result.push(child);
   for(const descendant of child.children)check(descendant);
  };
  for(const child of this.children)check(child);
  return result;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const parent=new Element('div');
const head=new Element('head');
const oldDocument=globalThis.document;
const oldWindow=globalThis.window;
globalThis.document={
 head,
 createElement:tag=>new Element(tag),
 querySelectorAll:selector=>selector==='link[rel="stylesheet"]'
  ?head.children.filter(node=>node.rel==='stylesheet')
  :[]
};
globalThis.window={matchMedia:()=>({matches:false})};
function goal(metric,value,target){return {id:metric,metric,title:`Цель: ${metric}`,value,target,complete:value>=target};}
function chapter(id,opts={}){
 return {id,title:`Глава ${id}`,description:'Развивай город',unlocked:false,claimed:false,canClaim:false,
  reward:{kind:'world_decor',id:'extra-bench',title:'Скамья цветная',amount:1},
  steps:[goal('residents',4,8),goal('roads',8,8)],...opts};
}
function dataset(items){return {enabled:true,items};}
function find(cardList,id){return cardList.find(card=>card.dataset.chapterId===id);}
function texts(node){return [node.textContent,...node.children.map(texts)].join(' ');}
test('five chapter cards, one expanded; only project WebP icons and safe reward art',()=>{
  const ui=mountCityChapters(parent,{onClaim:()=>{}});
  const items=[chapter('warm-welcome',{unlocked:true}),chapter('coffee-capital'),chapter('legendary-city'),
   chapter('flower-neighborhood'),chapter('city-of-dreams')];
  ui.update(dataset(items));
  let cards=ui.element.querySelectorAll('.world-chapter');
  assert.equal(cards.length,5);
  assert.equal(cards.filter(card=>card.dataset.expanded==='true').length,1);
  assert.equal(find(cards,'warm-welcome').dataset.expanded,'true');
  assert.equal(ui.element.querySelectorAll('.world-chapter__step').length,2);
  assert.equal(ui.element.querySelectorAll('.world-chapter__claim').length,0);
  assert.equal(head.children.filter(node=>node.rel==='stylesheet').length,1);
  assert.match(head.children[0].href,/city-chapters\.css\?v=world-chapters-v2/);
  assert.doesNotMatch(texts(ui.element),/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.equal(ui.element.querySelectorAll('.world-chapter__step-icon').length,2);
  const css=readFileSync(fileURLToPath(new URL('../city-chapters.css',import.meta.url)),'utf8');
  assert.match(css,/\.world-chapter__step-track/);
  assert.match(css,/\.world-chapter__collapsed/);
  // A future chapter can be inspected without unlocking or claiming it.
  find(cards,'coffee-capital').querySelector('.world-chapter__toggle').listeners.click();
  cards=ui.element.querySelectorAll('.world-chapter');
  assert.equal(find(cards,'coffee-capital').dataset.expanded,'true');
  assert.equal(ui.element.querySelectorAll('.world-chapter__claim').length,0);
  // Existing manual selection is preserved when a city-stat counter changes.
  items[0]={...items[0],steps:[goal('residents',5,8),goal('roads',8,8)]};
  ui.update(dataset(items));
  assert.equal(find(ui.element.querySelectorAll('.world-chapter'),'coffee-capital').dataset.expanded,'true');
 });
 test('ready reward calls original onClaim once, busy state blocks payment button, next chapter opens on claim',()=>{
  let claims=[];
  const fresh=new Element('div');
  const ui=mountCityChapters(fresh,{onClaim:id=>claims.push(id)});
  const items=[chapter('warm-welcome',{unlocked:true,canClaim:true,steps:[goal('roads',8,8)]}),chapter('coffee-capital')];
  ui.update(dataset(items));
  let button=ui.element.querySelectorAll('.world-chapter__claim')[0];
  assert.ok(button);
  button.listeners.click();button.listeners.click();
  assert.deepEqual(claims,['warm-welcome']);
  items[0]={...items[0],claimed:true,canClaim:false};
  items[1]={...items[1],unlocked:true};
  ui.update(dataset(items));
  assert.equal(find(ui.element.querySelectorAll('.world-chapter'),'coffee-capital').dataset.expanded,'true');
  assert.equal(ui.element.querySelectorAll('.world-chapter__claim').length,0);
  const locked=dataset([chapter('warm-welcome',{unlocked:true,canClaim:true})]);
  ui.update(locked,true);
  button=ui.element.querySelectorAll('.world-chapter__claim')[0];
  assert.ok(button.disabled);
 });
 test('missing or disabled snapshots never render unauthorized rewards',()=>{
  const ui=mountCityChapters(new Element('div'),{onClaim:()=>{throw Error('not authorized');}});
  ui.update(null);
  assert.equal(ui.element.hidden,true);
  assert.equal(ui.element.querySelectorAll('.world-chapter__claim').length,0);
 });
