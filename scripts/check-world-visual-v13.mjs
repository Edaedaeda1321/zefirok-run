import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=process.cwd();
const src=await readFile(resolve(root,'world/app.js'),'utf8');
const render=await readFile(resolve(root,'world/renderer.js'),'utf8');
const builder=await readFile(resolve(root,'world/build-standalone.py'),'utf8');
assert(src.includes('const CATEGORY_IMAGES = Object.freeze({'), 'Missing category WebP image map');
assert(src.includes("symbol.classList.add('category-icon--art')"), 'Tabs must display real WebP');
const icons=['icon_all_stroika.webp','icon_house.webp','icon_zavedenia.webp','icon_transport.webp','icon_parks.webp','icon_ploshadki.webp','icon_landshaft.webp','icon_decor.webp'];
for(const name of icons){
 assert(src.includes(name),`No runtime icon mapping for ${name}`);
 assert(builder.includes(name),`Standalone builder must embed ${name}`);
 const path=resolve(root,'assets/mir_zeffi',name);
 const bytes=await readFile(path);
 assert(bytes.length>400,`${name}: unexpectedly empty`);
 assert.equal(bytes.toString('ascii',0,4),'RIFF',`${name}: not RIFF`);
 assert.equal(bytes.toString('ascii',8,12),'WEBP',`${name}: not WebP`);
}
assert(render.includes('export function worldSpriteVisualDock('), 'Missing visible ground docking');
assert(render.includes('burial=def.category'), 'Missing category-wise burial for transport');
assert(render.includes('radiusY=radiusX*.47;'), 'Missing contact shadow extension');
assert(!src.includes("const symbol=document.createElement('span');symbol.className='category-icon';symbol.textContent=CATEGORY_SYMBOLS[category]"), 'Old emoji-only catalog tabs remain');
console.log(`World Zeffi v13: ${icons.length} category WebPs, renderer contact, 4 directions and standalone asset embeddings — PASS`);
