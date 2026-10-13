import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldTutorial} from '../tutorial.js';

// Browser-independent reproduction of an animated bottom sheet. In the first
// frame the homes tab is below the viewport; after the 240ms transition it is
// visible, but no resize/scroll event is emitted by CSS height transitions.
function createDom(){
 const listeners=new Map(),frameQueue=[],timerQueue=[];
 let homesTop=932,homeButton,button,tab,drawer;
 class ElementMock{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.style={cssText:''};this.dataset={};this.hidden=false;
   this.classList={add(){},remove(){}};this.offsetHeight=160;this.scrolls=0;this.listeners=new Map();}
  append(...elements){this.children.push(...elements);}
  setAttribute(){}
  addEventListener(name,listener){this.listeners.set(name,listener);}
  closest(selector){
   if(selector==='[data-category="homes"]')return this===homeButton?this:null;
   if(selector==='#openBuildCatalog')return this===button?this:null;
   if(selector.includes('.category-tabs'))return this===homeButton?tab:null;
   return null;
  }
  contains(node){return this===drawer&&node===homeButton;}
  scrollIntoView(){this.scrolls++;}
  getBoundingClientRect(){
   const top=this===homeButton?homesTop:this===button?770:0;
   return {left:80,top,right:180,bottom:top+36,width:100,height:36};
  }
 }
 drawer=new ElementMock();tab=new ElementMock();homeButton=new ElementMock('button');button=new ElementMock('button');
 const body=new ElementMock('body');
 const document={
  body,documentElement:new ElementMock('html'),
  createElement:tag=>new ElementMock(tag),
  querySelector(selector){if(selector==='[data-category="homes"]')return homeButton;if(selector==='#openBuildCatalog')return button;return null;},
  addEventListener(type,cb){listeners.set(type,cb);}
 };
 const window={innerWidth:390,innerHeight:844,addEventListener(){},Telegram:null};
 const original={document:globalThis.document,window:globalThis.window,Element:globalThis.Element,
  requestAnimationFrame:globalThis.requestAnimationFrame,setTimeout:globalThis.setTimeout};
 Object.assign(globalThis,{document,window,Element:ElementMock,requestAnimationFrame:fn=>{frameQueue.push(fn);return 1;},setTimeout:fn=>{timerQueue.push(fn);return 2;}});
 return {document,drawer,get homeButton(){return homeButton;},button,
  setTop(n){homesTop=n;},replaceHome(){homeButton=new ElementMock('button');},
  fire(type,event){assert.ok(listeners.has(type),`${type} listener exists`);listeners.get(type)(event);},
  flushFrame(){while(frameQueue.length)frameQueue.shift()();},
  flushFallback(){for(const fn of timerQueue.splice(0))fn();this.flushFrame();},
  restore(){Object.assign(globalThis,original);}
 };
}

function steps(){return [
 {title:'Строить',text:'Открой',target:'#openBuildCatalog',trigger:'click'},
 {title:'Жильё',text:'Выбери категорию',target:'[data-category="homes"]',trigger:'click',scrollCatalog:true}
];}

async function goToHousing(dom){
 const guide=createWorldTutorial({mode:'personal',steps:steps(),save:async()=>{}});
 assert.equal(guide.start(0),true);
 dom.flushFrame();
 dom.fire('click',{target:dom.button});
 await Promise.resolve(); // document click -> microtask to advance
 assert.equal(guide.currentStep(),1);
 dom.flushFrame();
 const halo=dom.document.body.children[0].children[1];
 assert.equal(halo.hidden,true,'category is initially below viewport during animation');
 return {guide,halo};
}

test('step 3 spotlight returns when the construction panel finishes expanding',async()=>{
 const dom=createDom();
 try{
  const {guide,halo}=await goToHousing(dom);
  dom.setTop(640);
  dom.fire('transitionend',{target:dom.drawer});
  dom.flushFrame();
  assert.equal(halo.hidden,false,'focus becomes visible after CSS transition');
  assert.match(halo.style.cssText,/top:635px/,'focus follows actual category position');
  assert.ok(dom.homeButton.scrolls>=1,'homes category is brought into view');
  dom.fire('click',{target:dom.homeButton});
  await Promise.resolve();
  assert.equal(guide.active(),false,'click on highlighted category completes the step');
 }finally{dom.restore();}
});

test('iOS fallback restores the focus when transitionend is skipped and target is re-rendered',async()=>{
 const dom=createDom();
 try{
  const {halo}=await goToHousing(dom);
  dom.replaceHome();
  dom.setTop(600);
  dom.flushFallback();
  assert.equal(halo.hidden,false,'one deferred layout recovers without an event');
  assert.match(halo.style.cssText,/top:595px/,'measurement resolves current, not detached, tab');
 }finally{dom.restore();}
});
