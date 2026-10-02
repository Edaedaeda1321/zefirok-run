#!/usr/bin/env node
// Offline, read-only regression checks for daily prestige materials.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
let count=0;
const ok=(v,s)=>{assert.ok(v,s);count++};
const eq=(a,b,s)=>{assert.deepEqual(a,b,s);count++};
const index=fs.readFileSync('index.html','utf8'),rating=fs.readFileSync('rating.html','utf8');
const js=index.match(/<script id="zefirok-daily-loyalty-v1-client">([\s\S]*?)<\/script>/)?.[1];
const css=index.match(/<style id="zefirok-daily-loyalty-v1-style">([\s\S]*?)<\/style>/)?.[1];
ok(js&&css,'Daily source exists');new vm.Script(js);
function part(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return s.slice(i,j)}
function fn(s,n){return s.match(new RegExp('function '+n+'\\([^\\n]*\\)\\{[\\s\\S]*?\\n\\}'))?.[0]}
const whole=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
const box={whole,model:null,view:{type:'home'},fmt:n=>String(whole(n)),plural:()=>'-day',icon:()=>'<svg></svg>',image:()=>'<img>',SHIELD:'shield',esc:s=>String(s??'').replace(/[<>"&]/g,'_'),rewardVisual:()=>'<img data-server-reward>',rewardText:r=>r.label};
vm.runInNewContext(part(js,'function streakTone(','let streakEffectObserver')+';this.api={tone:streakTone,hero:streakHeroContent,styles:streakStylesContent,crest:streakCrest,ornament:streakOrnaments};',box);
const api=box.api,themes=['rose','crystal','royal','celestial','platinum'],titles=[];
for(let i=0;i<5;i++){
 const day=60+i*10,t=api.tone(day);titles.push(t.title);
 eq(t.theme,themes[i],'Theme '+day);eq(t.rank,i+6,'Rank '+day);eq(t.milestone,true,'Milestone '+day);eq(t.next,day+10,'Next '+day);
 for(const n of [day+1,day+9]){eq(api.tone(n).theme,themes[i],'Style persists '+n);eq(api.tone(n).milestone,false,'No false milestone '+n)}
 ok(css.includes(`[data-streak-theme="${themes[i]}"]`),'Own material CSS');
 ok(api.crest(themes[i]).includes(`data-crest="${themes[i]}"`),'Own crest');
 box.model={state:{streak:day,bestStreak:day,progressDays:day+5,nextStreakMilestone:null},insurance:{enabled:true,balance:2,max:3}};
 const before=JSON.stringify(box.model),html=api.hero();
 ok(html.includes(`data-streak-days="${day}"`),'Real count');ok(html.includes(`data-streak-theme="${themes[i]}"`),'Real style');
 ok(html.includes(`aria-valuemin="${day}" aria-valuemax="${day+10}" aria-valuenow="${day}"`),'Decade progress bounds');
 ok(html.includes('style="width:0%"'),'New decade starts at zero');ok(!html.includes('zdl-prestige-reward'),'No invented reward');
 eq(JSON.stringify(box.model),before,'Render does not mutate state');
 const photo=api.hero({portrait:true});ok(photo.includes('is-portrait'),'Screenshot view');ok(!photo.includes('data-zdl-view'),'Screenshot has no buttons');
 ok(!photo.includes('zdl-lux-facts')&&!photo.includes('zdl-prestige-goal'),'Screenshot hides utility details');
}
eq(new Set(titles).size,5,'Five titles');eq(new Set(themes.map(api.crest)).size,5,'Five crests');eq(new Set(themes.map(api.ornament)).size,5,'Five corner motifs');
for(const n of [0,1,9,10,19,20,30,40,49,50,59]){
 eq(api.tone(n).rank,Math.floor(n/10),'Existing tier '+n);
 box.model={state:{streak:n,bestStreak:100},insurance:{enabled:true,balance:3,max:3}};
 ok(!api.hero().includes('zdl-lux '),'Historical 100 never upgrades current '+n);
}
for(const n of [100,101,109,110,120,1000]){
 eq(api.tone(n).theme,'platinum','Platinum continues '+n);eq(api.tone(n).next,(Math.floor(n/10)+1)*10,'No cap '+n);eq(api.tone(n).milestone,n%10===0,'Anniversary '+n);
}
for(const [day,pct] of [[61,10],[65,50],[69,90],[99,90],[101,10]]){
 box.model={state:{streak:day,bestStreak:day},insurance:{enabled:false}};ok(api.hero().includes(`style="width:${pct}%"`),'Progress '+day);
}
box.model={state:{streak:70,bestStreak:82,nextStreakMilestone:{streakThreshold:85,label:'SERVER_ONLY_317'}},insurance:{enabled:true,balance:1,max:3}};
let html=api.hero();ok(html.includes('SERVER_ONLY_317'),'Server reward preserved');ok(html.includes('85')&&html.includes('aria-valuemax="80"'),'Reward/visual targets separated');
box.model.state.nextStreakMilestone.streakThreshold=30;ok(!api.hero().includes('SERVER_ONLY_317'),'Past reward not upcoming');
box.view={type:'streak-styles',styleDay:100};const snapshot=JSON.stringify(box.model);html=api.styles();
ok(html.includes('data-streak-preview="true"'),'Gallery is explicitly a sample');ok(!html.includes('SERVER_ONLY_317')&&!html.includes('zdl-lux-facts'),'Preview has no private grants');eq(JSON.stringify(box.model),snapshot,'Preview leaves state untouched');
for(const n of ['streakTone','streakFlame','streakLaurel'])eq(fn(index,n),fn(rating,n),'Public parity '+n);
for(const rank of [6,7,8,9,10])ok(rating.includes(`.rating-streak-surface[data-streak-tier="${rank}"]`),'Public palette '+rank);
const rendering=part(js,'function streakTone(','let streakEffectObserver');
for(const token of ['fetch(','claim(','saveProgress(','postMessage(','localStorage'])ok(!rendering.includes(token),'No '+token+' in render');
ok(js.includes("case 'streak-styles':html=streakStylesContent();break;"),'Gallery route exists');
ok(js.includes('view.styleDay=day;safeRender(true);'),'Tabs reuse view/back stack');
ok(css.includes('.zdl-layer *::before,.zdl-layer *::after'),'Reduced motion covers ornaments');
ok(css.includes('.zdl-lux[data-motion="off"] *'),'Offscreen effects pause');
// Execute the production effect lifecycle, including stale observer callbacks.
function effects({days=100,preview=false,reduced=false,enabled=true,complete=true}={}){
 const classes=new Set(),store=new Map(),timers=new Map();let seq=0,calls=0,observer;
 const node={isConnected:true,dataset:{streakPreview:String(preview)},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 const env={whole,console,model:{state:{streak:days},season:{id:'daily'},serverDayKey:'2026-10-02'},view:{type:preview?'streak-styles':'home'},isOpen:()=>true,completedToday:()=>complete,
 document:{hidden:false,querySelector:()=>node,querySelectorAll:()=>[node]},setTimeout:(f,delay)=>{const id=++seq;timers.set(id,{f,delay});return id},clearTimeout:id=>timers.delete(id),localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
 matchMedia:()=>({matches:reduced}),ZefirokMediaPrefs:{get:()=>({vibrationEnabled:enabled})},Telegram:{WebApp:{initDataUnsafe:{user:{id:7}},HapticFeedback:{notificationOccurred(){calls++}}}},
 IntersectionObserver:class{constructor(cb){this.cb=cb;observer=this}disconnect(){}observe(){}}};
 env.window=env;
 vm.runInNewContext(part(js,'let streakEffectObserver','function homeContent(')+';this.api={bind:bindStreakEffects,stop:stopStreakEffects};',env);
 env.api.bind();
 return {env,node,classes,store,timers,show:()=>observer.cb([{isIntersecting:true}]),hide:()=>observer.cb([{isIntersecting:false}]),calls:()=>calls};
}
let e=effects();e.show();eq(e.node.dataset.motion,'on','Visible material animates');ok(e.classes.has('is-celebrating'),'100 celebrates');eq(e.calls(),1,'Single haptic');ok([...e.timers.values()].some(t=>t.delay===3400),'Longer platinum reveal');
e.env.api.bind();e.show();eq(e.calls(),1,'Re-render cannot replay haptic');eq(e.store.size,1,'Only presentation-seen key is written');
e.hide();eq(e.node.dataset.motion,'off','Offscreen pause');ok(!e.classes.has('is-celebrating'),'Invisible celebration cancelled');
e=effects({preview:true});e.show();eq(e.calls(),0,'Preview never vibrates');eq(e.store.size,0,'Preview cannot consume milestone celebration');ok(!e.classes.has('is-celebrating'),'Preview never celebrates');
e=effects({reduced:true});e.show();eq(e.node.dataset.motion,'off','Reduced motion is still');eq(e.calls(),0,'Reduced-motion celebration stays quiet');
e=effects({enabled:false});e.show();eq(e.calls(),0,'Haptic mute respected');ok(e.classes.has('is-celebrating'),'Visual still shown with haptics muted');
e=effects({complete:false});e.show();eq(e.calls(),0,'Unconfirmed day never celebrates');
e=effects({days:101});e.show();eq(e.calls(),0,'101 is not an anniversary');
e=effects({days:110});e.show();eq(e.calls(),1,'110 remains an anniversary');
e=effects();const old=e.show;e.env.api.stop();old();eq(e.node.dataset.motion,'off','Stale observer cannot restart closed effects');
console.log(`Daily prestige V31 PASS: ${count} checks; five materials, 60-100+ boundaries, server reward separation, title parity, preview isolation and effect lifecycle.`);
