#!/usr/bin/env node
// Checks module packaging and test-only entry. This does not open the D1 database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(v,message)=>{if(!v)throw new Error('WORLD INTEGRATION CHECK FAILED: '+message)};
const entry=read('index.html');
const world=read('world.html');
const sandbox=read('world/index.html');
const ignore=read('.assetsignore');
const modules=['app.js','engine.js','renderer.js','catalog.js','economy.js','ru.js','sprite-assets.js','sprite-manifest.js','world.css'];
for(const f of modules) assert(fs.existsSync(path.join(root,'world',f)),`missing runtime ${f}`);
assert(entry.includes('data-srcdoc="'),'runner iframe missing');
assert(entry.includes('" title="Сладкий Забег"></iframe>'),'runner iframe boundary missing');
assert((entry.match(/id="zefirok-world-preview-entry-v1"/g)||[]).length===1,'entry script duplicated or missing');
assert(entry.includes('const enabled=local;'),'hosted preview must remain closed');
assert(entry.includes('iframe[title="Сладкий Забег"]'),'entry frame selector changed');
assert(world.includes('<base href="./world/" />'),'world.html must resolve module assets within world/');
assert(world.includes('const enabled=local;'),'hosted city must remain unavailable');
assert(world.includes('id="zeffiReturnGame"'),'back-to-main control missing');
assert(!world.includes('http-equiv="refresh"'),'world.html must not redirect to runner');
assert(sandbox.includes('src="./app.js"'),'world module sandbox source changed');
assert(ignore.includes('world/index.html')&&ignore.includes('world/tests/')&&ignore.includes('world-preview.html'),'public asset ignore list incomplete');
assert(fs.existsSync(path.join(root,'world-preview.html')),'offline preview not generated');
const text=read('world/sprite-manifest.js');
const match=text.match(/export const SPRITE_MANIFEST\s*=\s*(\{[\s\S]+\});?\s*$/);
assert(!!match,'sprite manifest not found');
const manifest=JSON.parse(match[1]);
const ids=new Set();const roads=new Set();
for(const asset of manifest.assets){
 assert(!ids.has(asset.id),'duplicate sprite id '+asset.id);ids.add(asset.id);
 assert(asset.fileWebp?.endsWith('.webp'),'non-webp sprite '+asset.id);
 const local=path.resolve(root,'world',asset.fileWebp);
 assert(local.startsWith(path.join(root,'world',path.sep)),'asset outside world directory: '+asset.fileWebp);
 assert(fs.existsSync(local),'missing WebP '+asset.fileWebp);
 if(asset.roadMask!==null&&asset.roadMask!==undefined)roads.add(Number(asset.roadMask));
}
assert(manifest.assets.length===249,`expected all 249 supplied WebP entries, got ${manifest.assets.length}`);
for(let i=0;i<16;i++)assert(roads.has(i),'Road connection mask '+i+' is missing');
const app=read('world/app.js');const engine=read('world/engine.js');
assert(app.includes('zefirok-world-v01-sandbox-local'),'sandbox wallet must remain local');
assert(engine.includes('skipConstruction'),'construction timings unexpectedly removed');
assert(!world.includes('api/world/purchase'),'no real wallet API allowed in stage 1');
console.log('World integration OK: 249 WebP, 16 Road masks, modules, locked hosted entry, isolated local wallet.');
