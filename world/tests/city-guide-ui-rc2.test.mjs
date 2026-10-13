import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountCityGuide} from '../city-guide-ui.js';

function fakeDOM(){
 const create=tag=>({tagName:tag.toUpperCase(),children:[],attributes:{},dataset:{},className:'',textContent:'',hidden:false,disabled:false,
  setAttribute(k,v){this.attributes[k]=String(v);},
  append(...xs){this.children.push(...xs);},
  replaceChildren(...xs){this.children=[...xs];},
  querySelector(){return null;},
  addEventListener(type,cb){this.listeners??={};this.listeners[type]=cb;},
  insertBefore(child){this.children.push(child);}
 });
 return {create,document:{createElement:create}};
}

test('RC2 UI uses trusted text nodes and real currency images; click dispatches only the advice action',()=>{
 const prev=globalThis.document;const fake=fakeDOM();globalThis.document=fake.document;
 try{
  const host=fake.create('div');let commands=[];
  const guide=mountCityGuide(host,{nameOf:id=>id==='playground'?'Детская площадка':id,onAction:advice=>commands.push(advice)});
  const advice={type:'build',itemId:'playground',title:'Следующий шаг',detail:'Нужен парк.',button:'Показать в каталоге',price:{points:10800,coffee:0,treats:0}};
  guide.update(advice);
  assert.equal(host.children.length,1);
  const [head,detail,price,button]=guide.element.children;
  assert.match(head.children[1].children[1].textContent,/Детская площадка/);
  assert.equal(detail.textContent,'Нужен парк.');
  assert.equal(price.children.length,1);
  assert.match(price.children[0].children[0].src,/iconScore\.webp/);
  assert.equal(button.disabled,false);
  button.listeners.click();
  assert.deepEqual(commands,[advice]);
  guide.update({...advice,type:'paused',button:'Покупки закрыты'});
  assert.equal(button.disabled,true);
  assert.match(head.children[0].src,/skins\/shop\/default\.webp/);
  assert.equal(head.children[0].loading,'lazy');
 }finally{globalThis.document=prev;}
});

test('RC2 hooks only read cityStats and reuse existing catalog, roads and reward handlers',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf-8');
 const html=readFileSync(new URL('../../world.html',import.meta.url),'utf-8');
 assert.match(app,/nextCityGoal\(\{city:state\.city,stats,catalog:CATALOG/);
 assert.match(app,/cityGuideUI\.update\(/);
 assert.match(app,/cityGuideAction\(advice\)/);
 assert.match(app,/\$\('claimCityReward'\)\.click\(\)/);
 assert.match(app,/state\.category=def\.category/);
 assert.match(app,/checkPlacement\(state\.city,CATALOG,def\.id,spot\.x,spot\.y,0\)/);
 assert.match(app,/button\.classList\.add\('is-guide-target'\)|target\.classList\.add\('is-guide-target'\)/);
 assert.match(html,/city-guide\.css\?v=rc-city-goals2/);
 const adviceHandler=app.slice(app.indexOf('function cityGuideAction(advice)'),app.indexOf('function updateCityGuide(stats)'));
 assert.doesNotMatch(adviceHandler,/await\s+performServerAction\(/);
});
