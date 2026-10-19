#!/usr/bin/env node
// Transactional, idempotent V1/V1.1 update for the current production source.
// Only small verified inline snippets change; never copy old HTML or Worker files.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=process.cwd();
const HERE=dirname(fileURLToPath(import.meta.url));
const FILES=['scripts/season-premiere/ui.js','index.html','battle-pass.html','rating.html','owner.html'];
const saved=new Map(await Promise.all(FILES.map(async name=>[name,await readFile(resolve(ROOT,name),'utf8')])));
const output=new Map(saved);
const nextUi=(await readFile(join(HERE,'season-premiere/ui-v1-2.js'),'utf8')).trim();
const previousUi=saved.get('scripts/season-premiere/ui.js').trim();
const tag='<script id="zsp-season-premiere-runtime-v1">';
const requireOnce=(body,needle,path)=>{
 const at=body.indexOf(needle);
 if(at<0||body.indexOf(needle,at+needle.length)>=0)throw new Error(`${path}: expected a single marker ${JSON.stringify(needle.slice(0,65))}`);
 return at;
};
for(const name of FILES.slice(1)){
 const html=saved.get(name), at=requireOnce(html,tag,name);
 const begin=at+tag.length,end=html.indexOf('</script>',begin);
 if(end<0)throw new Error(`${name}: inline premiere script has no closing tag`);
 const embedded=html.slice(begin,end).trim();
 // Do not silently revert a newer version of the UI from a concurrent patch.
 if(embedded!==previousUi&&embedded!==nextUi)throw new Error(`${name}: embedded runtime differs from scripts/season-premiere/ui.js; update aborted`);
 if(embedded!==nextUi)output.set(name,html.slice(0,begin)+'\n'+nextUi+'\n'+html.slice(end));
}
if(previousUi!==nextUi)output.set('scripts/season-premiere/ui.js',nextUi+'\n');

{
 const name='index.html';let page=output.get(name);
 const start=requireOnce(page,'  // Season Premiere V1: accept only the current game iframe',name);
 const finish=requireOnce(page,'  let seasonPassLayer = null;',name);
 if(finish<=start)throw new Error('index.html: premiere bridge is misplaced');
 let bridge=page.slice(start,finish);
 if(!bridge.includes('event.origin!==window.location.origin')||!bridge.includes('event.source!==frame()?.contentWindow'))
  throw new Error('index.html: secure source/origin filter missing');
 const oldAuth="const initData=String(window.SweetRunPlatform?.auth?.legacyInitData?.()||window.Telegram?.WebApp?.initData||'');";
 const secureAuth="const initData=String(window.SweetRunPlatform?.auth?.telegramInitData?.()||window.SweetRunPlatform?.auth?.legacyInitData?.()||window.Telegram?.WebApp?.initData||tpHostSessionGet('zefirok-telegram-init-data')||'');";
 if(bridge.includes(oldAuth))bridge=bridge.replace(oldAuth,secureAuth);
 else if(!bridge.includes(secureAuth))throw new Error('index.html: Telegram signed auth bridge changed');
 if(bridge.includes('delay:1150,blocked:()=>{'))bridge=bridge.replace('delay:1150,blocked:()=>{','delay:0,blocked:()=>{');
 else if(!bridge.includes('delay:0,blocked:()=>{'))throw new Error('index.html: startup premiere delay location changed');
 page=page.slice(0,start)+bridge+page.slice(finish);
 const earlyMarker='// Season Premiere V1.2: send validated season metadata before optional startup UI updates.';
 if(!page.includes(earlyMarker)){
  const anchor='          if (data.achievementShowcase &amp;&amp; typeof data.achievementShowcase === &quot;object&quot;) {';
  requireOnce(page,anchor,name);
  const early=`          ${earlyMarker}\n          if (data.seasonPassBonus?.premiere?.status === &quot;active&quot;) {\n            try { window.parent.postMessage({type:&quot;zefirok-season-premiere-state&quot;,premiere:data.seasonPassBonus.premiere,userId:String(telegramProfile?.id||&quot;&quot;)},window.parent.location.origin); } catch (error) {}\n          }\n`;
  page=page.replace(anchor,early+anchor);
 }
 output.set(name,page);
}

// Render the first welcome card quickly. The overlay itself is visible on the
// same tick as the validated season arrives, including before its art downloads.
{
 const name='scripts/season-premiere/ui.css';
 const css=await readFile(resolve(ROOT,name),'utf8');
 const marker='/* Season Premiere V1.2: fast entry without motion overload. */';
 const rule=`${marker}\n.zsp-card[data-surface="main"]{animation-duration:.16s}\n`;
 const amended=css.includes(marker)?css:css.trimEnd()+'\n'+rule;
 if(amended!==css)output.set(name,amended);
 const styleTag='<style id="zsp-season-premiere-style-v1">';
 for(const path of FILES.slice(1)){
  let html=output.get(path);
  const start=requireOnce(html,styleTag,path)+styleTag.length;
  const end=html.indexOf('</style>',start);
  if(end<0)throw new Error(`${path}: inline style missing closing tag`);
  const inner=html.slice(start,end);
  if(!inner.includes('.zsp-card{')||!inner.includes('.zsp-overlay{'))throw new Error(`${path}: unrecognized premiere styles`);
  if(!inner.includes(marker))html=html.slice(0,end)+'\n'+rule+html.slice(end);
  output.set(path,html);
 }
}

const changed=[...output].filter(([name,contents])=>contents!==saved.get(name));
// Confirm all inline runtime copies agree before touching any source file.
for(const name of FILES.slice(1)){
 const html=output.get(name);const start=requireOnce(html,tag,name)+tag.length;
 const end=html.indexOf('</script>',start);
 if(html.slice(start,end).trim()!==nextUi)throw new Error(`${name}: generated inline runtime mismatch`);
}
for(const [name,contents] of changed)await writeFile(resolve(ROOT,name),contents);
console.log(`Season Premiere instant V1.2: ${changed.length} updated file(s)${changed.length?': '+changed.map(x=>x[0]).join(', '):' (already installed)'}`);
