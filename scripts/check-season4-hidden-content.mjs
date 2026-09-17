#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root=process.cwd();
const worker=fs.readFileSync(path.join(root,'src/worker.js'),'utf8');
const items=[
['avatar','season4_avatar_common_1','common','/assets/cases/avatars/season4_avatar_common_1.webp'],
['avatar','season4_avatar_common_2','common','/assets/cases/avatars/season4_avatar_common_2.webp'],
['avatar','season4_avatar_epic','epic','/assets/cases/avatars/season4_avatar_epic.webp'],
['avatar','season4_avatar_legendary','legendary','/assets/cases/avatars/season4_avatar_legendary.webp'],
['frame','season4_frame_common','common','/assets/rating/frames/profile/season4_frame_common.webp'],
['frame','season4_frame_epic','epic','/assets/rating/frames/profile/season4_frame_epic.webp'],
['frame','season4_frame_mythic','mythic','/assets/rating/frames/profile/season4_frame_mythic.webp'],
['frame','season4_frame_legendary_1','legendary','/assets/rating/frames/profile/season4_frame_legendary_1.webp'],
['frame','season4_frame_legendary_2','legendary','/assets/rating/frames/profile/season4_frame_legendary_2.webp'],
['trail','season4_trail_common','common','/assets/cases/trails/season4_trail_common.webp'],
['trail','season4_trail_rare','rare','/assets/cases/trails/season4_trail_rare.webp'],
['trail','season4_trail_superrare','superrare','/assets/cases/trails/season4_trail_superrare.webp'],
['trail','season4_trail_mythic','mythic','/assets/cases/trails/season4_trail_mythic.webp'],
['trail','season4_trail_legendary','legendary','/assets/cases/trails/season4_trail_legendary.webp']];
let failed=0;function ok(name,v){console.log(`${v?'PASS':'FAIL'}  ${name}`);if(!v)failed++;}
for(const [,id,rarity,url] of items){
 ok(`${id} catalog`,worker.includes(`${id}: Object.freeze({ id:"${id}"`));
 ok(`${id} season4`,worker.includes(`id:"${id}", seasonKey:"season4"`));
 ok(`${id} rarity`,worker.includes(`rarity:"${rarity}", imageUrl:"${url}"`));
 const f=path.join(root,url.slice(1));ok(`${id} asset`,fs.existsSync(f)&&fs.statSync(f).size>1024);
}
ok('season4 label',worker.includes('const FUTURE_SEASON4_CONTENT_LABEL = "Сезон 4 · Белый Кролик";'));
ok('season4 registry binding',worker.includes('boundSeason4Id=String')&&worker.includes("season4-white-rabbit-story-v1-canonical"));
ok('season4 editor binding',worker.includes("else if(seasonKey==='season4')seasonId=String"));
for(const f of ['season-belkino-joined-v3.webp','season-belkino-complete-v3.webp','season-white-rabbit-joined-v3.webp','season-white-rabbit-complete-v3.webp','season-belkino-traces-5-v3.webp','season-belkino-traces-25-v3.webp','season-belkino-traces-50-v3.webp']){
 ok(`achievement ${f}`,worker.includes(`/assets/achievements/badges/${f}`)&&fs.existsSync(path.join(root,'assets','achievements','badges',f)));
}

ok('story-find resolves Belkino',worker.includes('hint.includes("story-find")')&&worker.includes('seasonGroup="belkino"'));
ok('old shared rabbit icon is not forced for story achievements',worker.includes('achievementStoryCollectibleArtUrl(definition)'));

if(failed){console.error(`\nSeason 4 hidden-content check failed: ${failed}`);process.exit(1);}
console.log('\nSeason 4 hidden-content + achievement art check PASS.');
