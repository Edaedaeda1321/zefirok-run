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
const asset=(file)=>checks.push({name:`asset ${file}`,ok:fs.existsSync(path.join(root,'assets/optimized/v0.79.5',file)),detail:file});

must('runner builder config v4',worker,'RUNNER_BUILDER_CONFIG_VERSION = 4');
must('season 3 seed',worker,'function runnerBuilderSeason3Seed()');
must('season 3 group',worker,'title:"Парк Белкино · сезон 3"');
must('season 3 road',worker,'roadAssetKey:"road_park_day_s3"');
must('season 3 scene template stays disabled',worker,'{ id:"park-belkino-s3", title:"Парк Белкино · сезон 3", enabled:false, backgroundId:"park-belkino-s3"');
must('birdhouse medium',worker,'id:"birdhouse-s3", title:"Скворечник"');
must('birdhouse with bird low',worker,'id:"birdhouse-bird-s3", title:"Скворечник с птичкой", enabled:true, assetKey:"game_barricade_park_birdhouse_bird_s3", assetPath:"", width:68, height:48');
must('scooter medium',worker,'id:"scooter-s3", title:"Самокат"');
must('stone low',worker,'id:"stone-s3", title:"Камень"');
must('flower box medium',worker,'id:"flowerbox-s3", title:"Ящик с цветами"');
must('log wide low',worker,'id:"log-s3", title:"Бревно"');
must('picnic basket low',worker,'id:"picnic-basket-s3", title:"Корзинка для пикника"');
must('bike large',worker,'id:"bike-s3", title:"Велосипед"');
must('flowerbed medium',worker,'id:"flowerbed-s3", title:"Клумба"');
must('season 3 auto road repair',worker,'background.roadAssetKey="road_park_day_s3"');
must('public season 3 road',worker,'if(season3Scene)publicRoadKey="road_park_day_s3";');
must('client season 3 IDs',index,'const RUNNER_SEASON3_OBSTACLE_IDS = new Set');
must('client season 3 road repair',index,'if (season3Scene) roadAssetKey = &quot;road_park_day_s3&quot;;');
must('park road renderer variant',index,'const parkDayRoad = roadIdentity.includes(&quot;road_park_day_s3&quot;);');
must('park road shares seasonal dimensions',index,'const seasonalRoad = nightCafeRoad || parkDayRoad;');
must('owner park road preview',owner,"road_park_day_s3:'/assets/optimized/v0.79.5/road_park_day_s3.webp?v=0.79.5'");
must('owner birdhouse preview',owner,"game_barricade_park_birdhouse_s3:'/assets/optimized/v0.79.5/game_barricade_park_birdhouse_s3.webp?v=0.79.5'");
must('owner birdhouse bird preview',owner,"game_barricade_park_birdhouse_bird_s3:'/assets/optimized/v0.79.5/game_barricade_park_birdhouse_bird_s3.webp?v=0.79.5'");

for(const file of [
  'game_barricade_park_birdhouse_s3.webp',
  'game_barricade_park_scooter_s3.webp',
  'game_barricade_park_stone_s3.webp',
  'game_barricade_park_flowebed_s3.webp',
  'game_barricade_park_birdhouse_bird_s3.webp',
  'game_barricade_park_log_s3.webp',
  'game_barricade_park_picknik_basket_s3.webp',
  'game_barricade_park_bike_s3.webp',
  'barricade_game_park_flowers_s3.webp',
  'road_park_day_s3.webp'
]) asset(file);

const failed=checks.filter(x=>!x.ok);
if(failed.length){
  for(const item of failed) console.error(`FAIL ${item.name}: ${item.detail}`);
  console.error(`Season 3 runner checks failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`Season 3 runner checks passed: ${checks.length}`);
