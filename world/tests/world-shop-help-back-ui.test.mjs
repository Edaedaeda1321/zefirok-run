import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const personal=read('../app.js');
const css=read('../premium-ui.css');
const html=read('../../world.html');
const host=read('../../index.html');

function createHarness(initialVisible=false,available=true){
 const match=host.match(/<script id="zefirok-world-preview-entry-v1">([\s\S]*?)<\/script>/);
 assert.ok(match,'host World router must remain in main HTML');
 const listeners=new Map();
 const attached=new Set();
 const back={
  isVisible:initialVisible,showCalls:0,hideCalls:0,
  onClick(fn){attached.add(fn);},offClick(fn){attached.delete(fn);},
  show(){this.isVisible=true;this.showCalls++;},hide(){this.isVisible=false;this.hideCalls++;},
  press(){for(const fn of [...attached])fn();},
 };
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.contentWindow={id:Symbol(tag)};}
  append(...nodes){for(const node of nodes){node.owner=this;this.children.push(node);}}
  setAttribute(){} addEventListener(event,fn){listeners.set(`${this.tag}:${event}`,fn);}
  querySelector(tag){return this.children.find(item=>item.tag===tag)||null;}
  remove(){if(this.owner)this.owner.children=this.owner.children.filter(node=>node!==this);}
 }
 const body=new Element('body'),runner=new Element('runner');
 const handlers={};
 const doc={readyState:'loading',body,createElement:t=>new Element(t),addEventListener(){},querySelector:q=>q.includes('body > iframe[title=')?runner:null};
 const webapp=available?{BackButton:back}:undefined;
 const window={Telegram:webapp?{WebApp:webapp}:undefined,addEventListener(event,fn){(handlers[event]??=[]).push(fn);},dispatchEvent(){}};
 const origin='https://zefirok.test';
 runInNewContext(match[1],{window,document:doc,location:{origin,protocol:'https:'},Event:class{},console}, {timeout:4000});
 const emit=(data,source,eventOrigin=origin)=>{for(const fn of handlers.message||[])fn({data,source,origin:eventOrigin});};
 const frame=()=>body.children[0]?.querySelector('iframe');
 return {back,attached,emit,frame,body,runner,origin,window};
}

test('native Telegram Back closes personal World and removes only its listener',()=>{
 const h=createHarness();
 h.emit({type:'zeffi-world-tester-open'},h.runner.contentWindow);
 assert.equal(h.frame()?.src,'./world.html');
 assert.equal(h.back.isVisible,true);
 assert.equal(h.attached.size,1);
 h.back.press();
 assert.equal(h.body.children.length,0);
 assert.equal(h.attached.size,0);
 assert.equal(h.back.isVisible,false);
 assert.equal(h.back.hideCalls,1);
});

test('switch between personal and common city rebinds back; stale frame cannot close new city',()=>{
 const h=createHarness(true);
 h.emit({type:'zeffi-world-tester-open'},h.runner.contentWindow);
 const personalFrame=h.frame();
 h.emit({type:'zefirok-world-switch',view:'story'},personalFrame.contentWindow);
 const storyFrame=h.frame();
 assert.equal(storyFrame.src,'./story-world.html');
 assert.equal(h.attached.size,1);
 h.emit({type:'zefirok-world-close'},personalFrame.contentWindow);
 assert.equal(h.frame(),storyFrame,'old frame cannot close World');
 h.back.press();
 assert.equal(h.frame(),undefined);
 assert.equal(h.back.isVisible,true,'prior visible state restored');
 assert.equal(h.attached.size,0);
 assert.equal(h.back.hideCalls,0);
});

test('closing via the in-game back message unbinds Telegram BackButton',()=>{
 const h=createHarness();
 h.emit({type:'zeffi-world-tester-open'},h.runner.contentWindow);
 h.emit({type:'zefirok-world-close'},h.frame().contentWindow);
 assert.equal(h.frame(),undefined);
 assert.equal(h.attached.size,0);
 assert.equal(h.back.isVisible,false);
});

test('outside Telegram: World opens and closes normally without a native back object',()=>{
 const h=createHarness(false,false);
 h.emit({type:'zeffi-world-tester-open'},h.runner.contentWindow);
 assert.equal(h.frame()?.src,'./world.html');
 h.emit({type:'zefirok-world-close'},h.frame().contentWindow);
 assert.equal(h.frame(),undefined);
});

test('bus road item loads original WebP as a full-size thumbnail and keeps its free and paid price guards',()=>{
 assert.match(personal,/new URL\('\.\.\/assets\/mir_zeffi\/icon_shop_road_bus\.webp',import\.meta\.url\)/);
 assert.match(personal,/art\.loading='eager'/);
 assert.match(personal,/art\.addEventListener\('error'/);
 assert.match(personal,/symbol\.hidden=true/);
 assert.match(personal,/if\(mode==='bus-road'\)addCatalogPrice\(cost,ROAD_TILE_PRICE\)/);
 assert.match(personal,/SERVER_MODE&&!state\.serverPurchasesEnabled/);
 assert.ok(existsSync(new URL('../../assets/mir_zeffi/icon_shop_road_bus.webp',import.meta.url)));
 assert.match(css,/\.world-bus-road-figure \.world-bus-road-shop-art\{[^}]*object-fit:contain/);
});

test('bus road copy wraps in its own card; help confirm is centered; hosted CSS and JS use fresh versions',()=>{
 assert.match(css,/\.catalog-card\.world-bus-road-tool\{overflow:hidden/);
 assert.match(css,/\.world-bus-road-tool \.catalog-copy small\{[^}]*white-space:normal/);
 assert.match(css,/#helpModal \.modal-card>#helpClose\{[^}]*margin:17px auto/);
 assert.match(html,/premium-ui\.css\?v=world-ui-fix2/);
 assert.match(html,/app\.js\?v=world-ui-fix2/);
});
