#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const source=await readFile(path.join(root,'index.html'),'utf8');
const marker='data-srcdoc="';
const startMarker=source.indexOf(marker);
const terminator='" title="Сладкий Забег"></iframe>';
const end=source.lastIndexOf(terminator);
const fail=message=>{console.error(`INDEX SRCDOC CHECK FAILED: ${message}`);process.exit(1)};

if(startMarker<0)fail('main game iframe data-srcdoc attribute was not found.');
if(end<0)fail('main game iframe closing marker was not found.');
const start=startMarker+marker.length;
if(end<=start)fail('main game iframe data-srcdoc boundaries are invalid.');
const firstLiteralQuote=source.indexOf('"',start);
if(firstLiteralQuote!==end){
  const context=source.slice(Math.max(start,firstLiteralQuote-90),Math.min(source.length,firstLiteralQuote+150)).replace(/\s+/g,' ');
  fail(`data-srcdoc closes early at byte ${firstLiteralQuote}; expected ${end}. Context: ${context}`);
}
const payload=source.slice(start,end);
for(const token of ['zefirok-maltipoo-runner','zefirok-profile-v2-safe','zefirok-achievements-profile-entry-v5']){
  if(!payload.includes(token))fail(`required embedded app token is outside data-srcdoc: ${token}.`);
}
if(!payload.includes('grid-template-areas:&quot;showcase-empty-icon showcase-empty-title&quot;')){
  fail('profile showcase grid template is not safely HTML-escaped inside data-srcdoc.');
}
const encodedOpen=(payload.match(/&lt;(?:style|script)\b/gi)||[]).length;
if(encodedOpen<40)fail(`embedded app payload looks truncated: only ${encodedOpen} encoded style/script openings found.`);
console.log(`Index srcdoc integrity OK: ${payload.length} encoded chars, ${encodedOpen} embedded style/script openings, closing quote at ${end}.`);
