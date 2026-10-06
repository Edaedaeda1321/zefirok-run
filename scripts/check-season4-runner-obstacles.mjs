#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const worker=fs.readFileSync(path.join(root,'src/worker.js'),'utf8');
const owner=fs.readFileSync(path.join(root,'owner.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const checks=[];
const must=(name,haystack,needle)=>checks.push({name,ok:haystack.includes(needle),detail:needle});
const asset=(file)=>{const full=path.join(root,'assets/optimized/v0.79.5',file),exists=fs.existsSync(full);checks.push({name:`asset ${file}`,ok:exists,detail:file});if(exists&&file.startsWith('obstacle_'))checks.push({name:`optimized ${file}`,ok:fs.statSync(full).size<450000,detail:`${fs.statSync(full).size} bytes`});};

must('runner builder schema v10',worker,'RUNNER_BUILDER_CONFIG_VERSION = 10');
must('season 4 seed',worker,'function runnerBuilderSeason4Seed()');
must('season 4 upgrade',worker,'seed4=runnerBuilderSeason4Seed()');
must('season 4 one-time library upgrade',worker,'if(currentVersion<10)');
must('season 4 background stays disabled',worker,'id:"white-rabbit-s4", title:"Белый Кролик · сезон 4", enabled:false');
must('season 4 road prepared',worker,'roadAssetKey:"road_season4", roadAssetPath:""');
must('season 4 legacy road repair',worker,'background.roadAssetKey="road_season4"');
must('season 4 has no auto group',worker,'groups:[]');
must('season 4 has no auto scene',worker,'scenes:[]');
must('owner custom obstacle preview preserves aspect',owner,"fit=custom?'xMidYMax meet':'none'");
must('runtime custom obstacle preserves aspect',index,'if (assetPath) drawn = drawContain(image, renderX, renderY, item.w, item.h, 1, &quot;bottom&quot;);');
must('season 4 road client asset',index,'road_season4: &quot;/assets/optimized/v0.79.5/road_season4.webp?v=0.79.5&quot;');
must('season 4 road renderer variant',index,'const season4Road = roadIdentity.includes(&quot;road_season4&quot;) || roadIdentity.includes(&quot;road_white_rabbit&quot;);');
must('season 4 road uses seasonal height',index,'const seasonalRoad = nightCafeRoad || parkDayRoad || season4Road;');
must('season 4 road crop keeps full art',index,'season4Road ? 0.24 : 0;');

const obstacleChecks=[
  ['padded stool low','id:"padded-stool-s4"','width:64, height:46'],
  ['brush box medium wide','id:"box-of-brushes-s4"','width:82, height:65'],
  ['gift mountain high','id:"mountain-of-gifts-s4"','width:82, height:102'],
  ['child chair low','id:"child-chair-s4"','width:72, height:41'],
  ['armchair medium','id:"armchair-s4"','width:76, height:70'],
  ['stand medium','id:"stand-s4"','width:42, height:80'],
  ['pillow low','id:"pillow-s4"','width:72, height:38'],
  ['plant medium','id:"plant-s4"','width:66, height:75'],
  ['medical trolley high','id:"medical-trolley-s4"','width:98, height:95'],
  ['caution matches existing sign scale','id:"caution-floor-sign-s4"','width:56, height:82'],
  ['toy basket low','id:"toy-basket-s4"','width:70, height:46'],
  ['shoe box medium','id:"shoe-box-s4"','width:98, height:55']
];
for(const [name,id,size] of obstacleChecks){must(`${name} id`,worker,id);must(`${name} size`,worker,size);}

const disabledIds=[
  'padded-stool-s4','box-of-brushes-s4','mountain-of-gifts-s4','child-chair-s4','armchair-s4','stand-s4',
  'pillow-s4','plant-s4','medical-trolley-s4','caution-floor-sign-s4','toy-basket-s4','shoe-box-s4'
];
for(const id of disabledIds){
  const pattern=new RegExp(`id:\\"${id}\\"[^\\n]+enabled:false`);
  checks.push({name:`${id} disabled`,ok:pattern.test(worker),detail:'must seed as enabled:false'});
}

for(const file of [
  'road_season4.webp',
  'obstacle_padded_stool.webp','obstacle_box_of_brushes.webp','obstacle_mountain_of_gifts.webp','obstacle_childs_chair.webp',
  'obstacle_armchair.webp','obstacle_the_stand.webp','obstacle_pillow.webp','obstacle_plant_s4.webp','obstacle_medical_trolley.webp',
  'obstacle_white_rabbit_caution_floor_sign.webp','obstacle_low_basket_with_toys.webp','obstacle_shoe_box.webp'
]) asset(file);

const failed=checks.filter(x=>!x.ok);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}`);
if(failed.length){
  console.error(`\nSeason 4 runner obstacle check failed: ${failed.length}/${checks.length}`);
  for(const item of failed)console.error(`- ${item.name}: ${item.detail}`);
  process.exit(1);
}
console.log(`\nSeason 4 runner obstacle check PASS: ${checks.length} invariants.`);
