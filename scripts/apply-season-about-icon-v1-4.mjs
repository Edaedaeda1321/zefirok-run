#!/usr/bin/env node
/**
 * Season Premiere icon v1.4 — surgical, validated and repeatable patch.
 * Apply AFTER Premiere V1.3 from the root of the existing zefirok-run repo.
 * Preserves current page logic, CC control, reward and ratings endpoints.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd();
const iconPath='/assets/ui/icon_o_sezone.webp';
const iconRelative='assets/ui/icon_o_sezone.webp';
const OLD=Object.freeze([
 '/assets/ui/icon_battlepass.webp',
 '/assets/season-pass/season.webp',
 '/assets/ui/icon_itog_reiting_season.webp'
]);
const oldRow=`  main:'${OLD[0]}',pass:'${OLD[1]}',rating:'${OLD[2]}'`;
const newRow=`  main:'${iconPath}',pass:'${iconPath}',rating:'${iconPath}'`;
const legacySet=` const PREVIOUS_BUTTON_ICONS=new Set(${JSON.stringify(OLD)});`;
const oldManual='manualIcon:imgSafe(raw.iconUrl,ICONS[surface]),';
const newManual=`manualIcon:imgSafe(PREVIOUS_BUTTON_ICONS.has(String(raw.iconUrl||'').trim())?'':raw.iconUrl,ICONS[surface]),`;
const oldFallback=` const fallback=page==='Main'?'${OLD[0]}':page==='Rating'?'${OLD[2]}':'${OLD[1]}';`;
const newFallback=` const fallback='${iconPath}';`;
const ccSet=`const zspCcLegacyButtonIcons=new Set(${JSON.stringify(OLD)});\n`;
const ccNormalize=" const iconInput=val('IconUrl');if(iconInput&&zspCcLegacyButtonIcons.has(iconInput.value))iconInput.value='';\n";
const files=[
 'index.html','battle-pass.html','rating.html','owner.html',
 'scripts/season-premiere/ui.js','scripts/season-premiere/cc-editor.js',
 'scripts/season-premiere-v1-3/ui.js','scripts/season-premiere-v1-3/cc-editor.js',
 'assets/images-manifest.json'
];
const fileData=new Map();
for(const filename of files){
 try{fileData.set(filename,await readFile(resolve(root,filename),'utf8'))}
 catch(e){throw Error(`Missing ${filename}; first install Premiere V1.3, then apply the icon patch. ${e.message}`)}
}
const changes=new Map(fileData);
const assert=(ok,msg)=>{if(!ok)throw Error('Season About Icon V1.4: '+msg+'; no files were changed')};
const frequency=(s,part)=>s.split(part).length-1;
function updateOnce(s,oldPart,newPart,reason){
 if(s.includes(newPart)){
  assert(frequency(s,newPart)===1,`${reason}: duplicated updated snippet`);
  return s;
 }
 assert(frequency(s,oldPart)===1,`${reason}: source changed (expected exactly one old snippet)`);
 return s.replace(oldPart,newPart);
}
function updateUI(s,reason){
 assert(s.includes("const ICONS=Object.freeze({")&&s.includes('function ensureManual('),`${reason}: Premiere V1.3 runtime not found`);
 s=updateOnce(s,oldRow,newRow,reason+' / ICONS');
 s=updateOnce(s,' const FEATURE_ICONS=Object.freeze({',legacySet+'\n const FEATURE_ICONS=Object.freeze({',reason+' / original icons');
 s=updateOnce(s,oldManual,newManual,reason+' / CC legacy icon migration');
 return s;
}
function updateCC(s,reason){
 assert(s.includes('function zspCcRenderIcon(page)')&&s.includes('function zspCcFill(page,raw)'),`${reason}: CC visual editor not found`);
 s=updateOnce(s,'function zspCcFields(page){',ccSet+'function zspCcFields(page){',reason+' / CC legacy set');
 s=updateOnce(s,oldFallback,newFallback,reason+' / CC default icon');
 s=updateOnce(s,' zspCcRenderImage(page);zspCcRenderIcon(page);',ccNormalize+' zspCcRenderImage(page);zspCcRenderIcon(page);',reason+' / CC preview');
 return s;
}
function transformElement(s,opening,closing,transform,label){
 const start=s.indexOf(opening);
 assert(start!==-1&&s.indexOf(opening,start+1)===-1,`${label}: expected exactly one ${opening}`);
 const a=start+opening.length,b=s.indexOf(closing,a);
 assert(b>a,`${label}: missing closing element`);
 const body=s.slice(a,b);
 return s.slice(0,a)+transform(body,label)+s.slice(b);
}
const uiNames=['scripts/season-premiere/ui.js','scripts/season-premiere-v1-3/ui.js'];
for(const p of uiNames)changes.set(p,updateUI(changes.get(p),p));
const ccNames=['scripts/season-premiere/cc-editor.js','scripts/season-premiere-v1-3/cc-editor.js'];
for(const p of ccNames)changes.set(p,updateCC(changes.get(p),p));
for(const p of ['index.html','battle-pass.html','rating.html','owner.html']){
 const updated=transformElement(changes.get(p),'<script id="zsp-season-premiere-runtime-v1">','</script>',updateUI,p+' premiere runtime');
 changes.set(p,updated);
}
// CC is embedded into the large admin HTML. Do not overwrite the rest of CC.
let owner=changes.get('owner.html');
owner=transformElement(owner,'function zspCcFields(page){','function renderPassVisuals(){',
 (body,label)=>{
  // Keep the leading function declaration, which is the opening tag.
  const full='function zspCcFields(page){'+body;
  const result=updateCC(full,label);
  assert(result.includes('function zspCcFields(page){'),`${label}: CC helper lost`);
  // The icon-set declaration must precede the function declaration in the page.
  return result.slice(result.indexOf('function zspCcFields(page){')+'function zspCcFields(page){'.length);
 },'owner.html inline CC');
// Add the CC legacy set once before the real function (not inside the function).
if(!owner.includes(ccSet)){
 assert(frequency(owner,'function zspCcFields(page){')===1,'owner CC helper count changed');
 owner=owner.replace('function zspCcFields(page){',ccSet+'function zspCcFields(page){');
}
// Existing CC static thumbnail should also use the new file immediately.
for(const page of ['Main','Pass','Rating']){
 const regex=new RegExp(`(<img\\b(?=[^>]*\\bid="zspCc${page}IconPreview")[^>]*\\bsrc=")[^"]+("[^>]*>)`,'g');
 let count=0;
 owner=owner.replace(regex,(_all,a,b)=>{count++;return a+iconPath+b});
 assert(count===1,`owner.html: ${page} icon preview image changed`);
}
changes.set('owner.html',owner);

// Content-addressed image manifest. Update ONLY the new icon entry and catalogHash.
const asset=await readFile(resolve(root,iconRelative));
assert(asset.length>1024&&asset.length<120000,'optimized WebP missing or too heavy');
assert(asset.toString('ascii',0,4)==='RIFF'&&asset.toString('ascii',8,12)==='WEBP','invalid WebP file');
const iconHash=createHash('sha256').update(asset).digest('hex').slice(0,12);
const manifest=JSON.parse(fileData.get('assets/images-manifest.json'));
assert(manifest.version===2&&Array.isArray(manifest.images),'images-manifest.json is not version 2');
const expected={fileName:'ui/icon_o_sezone.webp',label:'Icon o sezone',folder:'ui',path:iconPath,hash:iconHash,size:asset.length};
const prior=manifest.images.find(i=>i.path===iconPath);
if(prior)Object.assign(prior,expected);
else manifest.images.push(expected);
const collate=(a,b)=>{
 const l=a.fileName.normalize('NFC'),r=b.fileName.normalize('NFC');
 return l.localeCompare(r,'ru')||(l<r?-1:l>r?1:0);
};
manifest.images.sort(collate);
manifest.count=manifest.images.length;
manifest.catalogHash=createHash('sha256').update(manifest.images.map(x=>`${x.path}:${x.hash}`).join('\n')).digest('hex').slice(0,16);
const newManifest=JSON.stringify(manifest,null,2)+'\n';
changes.set('assets/images-manifest.json',newManifest);

// Transactional preflight: ensure all four embedded runtimes match updated canonical source.
const canonicalUI=changes.get('scripts/season-premiere/ui.js').trim();
const canonicalCC=changes.get('scripts/season-premiere/cc-editor.js').trim();
for(const p of ['index.html','battle-pass.html','rating.html','owner.html']){
 const html=changes.get(p);
 const a=html.indexOf('<script id="zsp-season-premiere-runtime-v1">');
 const b=html.indexOf('</script>',a);
 assert(a!==-1&&b>a,`${p}: missing runtime`);
 assert(html.slice(a+'<script id="zsp-season-premiere-runtime-v1">'.length,b).trim()===canonicalUI,`${p}: embedded UI differs from canonical; manual update needed`);
}
const x=changes.get('owner.html');
assert(x.includes("const zspCcLegacyButtonIcons=new Set(")&&x.includes(" const fallback='/assets/ui/icon_o_sezone.webp'"),'owner CC icon wiring absent');
assert(canonicalCC.includes("zspCcLegacyButtonIcons")&&canonicalUI.includes(newRow),'canonical icon wiring absent');
assert(changes.get('battle-pass.html').includes('SEASON_PREMIERE_V1_3_PASS_MANUAL'),'manual Pass entry must remain available');
assert(changes.get('rating.html').includes('rating-v6-season-line'),'rating compact season button must remain');

const changed=[...changes.entries()].filter(([p,c])=>c!==fileData.get(p));
for(const [p,content] of changed)await writeFile(resolve(root,p),content,'utf8');
console.log(changed.length?`Season About Icon V1.4 applied (${changed.length} files):\n`+changed.map(([p])=>'  '+p).join('\n'):'Season About Icon V1.4 already applied; no changes.');
console.log(`Icon: ${iconPath}; ${asset.length} bytes; manifest catalog ${manifest.catalogHash}. No new D1 query/migration.`);
