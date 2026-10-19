#!/usr/bin/env node
// Tiny, idempotent installation step for existing World pages. Do not copy an
// older full HTML/JS file over main: change only three verified asset references.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const patches=[
 {
  file:'world.html',
  old:'  <link rel="stylesheet" href="./city-guide.css?v=rc-city-goals2" />',
  replacement:'  <link rel="stylesheet" href="./city-guide.css?v=rc-city-goals2" />\n  <link rel="stylesheet" href="./city-chapters.css?v=world-chapters-v2" />',
  already:'<link rel="stylesheet" href="./city-chapters.css?v=world-chapters-v2" />'
 },
 {
  file:'world/index.html',
  old:'<link rel="stylesheet" href="./city-chapters.css?v=cc-decor1" />',
  replacement:'<link rel="stylesheet" href="./city-chapters.css?v=world-chapters-v2" />',
  already:'<link rel="stylesheet" href="./city-chapters.css?v=world-chapters-v2" />'
 },
 {
  file:'world/app.js',
  old:"from './city-chapters-ui.js?v=cc-decor1';",
  replacement:"from './city-chapters-ui.js?v=world-chapters-v2';",
  already:"from './city-chapters-ui.js?v=world-chapters-v2';"
 }
];
const staged=[];
for(const item of patches){
 const file=resolve(root,item.file);
 const source=readFileSync(file,'utf8');
 if(source.includes(item.already)){
  staged.push({file:item.file,absolute:file,source,next:source,already:true});
  continue;
 }
 const first=source.indexOf(item.old);
 if(first<0||source.indexOf(item.old,first+item.old.length)>=0)
  throw new Error(`Остановлено: ${item.file} изменился. Требуется ручная проверка безопасной точки подключения.`);
 staged.push({file:item.file,absolute:file,source,next:source.replace(item.old,item.replacement),already:false});
}
// Only write after all three source guards have passed; no half-applied patch.
for(const item of staged){
 if(item.source!==item.next)writeFileSync(item.absolute,item.next,'utf8');
 console.log(`${item.source===item.next?'OK':'UPDATED'} ${item.file}`);
}
console.log('World city chapters V2: CSS + module cache version connected.');
