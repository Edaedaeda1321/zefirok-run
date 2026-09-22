#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const worker=fs.readFileSync(path.join(root,'src/worker.js'),'utf8');
const owner=fs.readFileSync(path.join(root,'owner.html'),'utf8');
const migrationName='0094_season_achievement_art_and_belkino_traces.sql';
const migration=fs.readFileSync(path.join(root,'migrations',migrationName),'utf8');
const d1Snapshot=fs.readFileSync(path.join(root,'scripts','fixtures','d1_pre_0087_snapshot.sql'),'utf8');
const lock=JSON.parse(fs.readFileSync(path.join(root,'scripts/migration-history.lock.json'),'utf8'));
const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail});}
function must(name,source,token){check(name,source.includes(token),`missing token: ${token}`);}

must('season art map',worker,'const ACHIEVEMENT_SEASON_ART = Object.freeze({');
must('season 1 joined art',worker,'season-cafe-joined.webp');
must('season 1 complete art',worker,'season-cafe-complete.webp');
must('season 2 joined art',worker,'season-night-joined.webp');
must('season 2 complete art',worker,'season-night-complete.webp');
must('season 3 joined art',worker,'season-belkino-joined-v3.webp');
must('season 3 complete art',worker,'season-belkino-complete-v3.webp');
must('season 4 joined art',worker,'season-white-rabbit-joined-v3.webp');
must('season 4 complete art',worker,'season-white-rabbit-complete-v3.webp');
must('season 3 joined title',worker,'joinedTitle:"Гость Белкино"');
must('season 3 complete title',worker,'completeTitle:"Тайны Белкино раскрыты"');
must('season 4 joined title',worker,'joinedTitle:"Дверь по соседству"');
must('season 4 complete title',worker,'completeTitle:"Две двери — одна история"');
must('Belkino trace art map',worker,'const ACHIEVEMENT_STORY_COLLECTIBLE_ART = Object.freeze({');
must('5 trace art',worker,'season-belkino-traces-5-v3.webp');
must('25 trace art',worker,'season-belkino-traces-25-v3.webp');
must('50 trace art',worker,'season-belkino-traces-50-v3.webp');
must('story collectible uses per-step art',worker,'achievementStoryCollectibleArtUrl(definition)');
must('season art resolves title/asset/id',worker,'achievementSeasonArtGroup(definition = {})');
must('season definitions carry asset key',worker,'seasonAssetKey=String(row.asset_key||"")');
must('future seasonal achievements hidden before start',worker,'String(state?.status||"")==="upcoming"');
check('old Belkino hard-hide removed',!worker.includes('if (achievementIsBelkinoSeason(definition)) return false;'),'legacy hard-hide still present');
must('catalog publication receives availability',worker,'achievementCatalogPublished(base,artReady,availability)');

for(const token of [
  'passStoryCollectibleStep1Achievement',
  'passStoryCollectibleStep2Achievement',
  'passStoryCollectibleStep3Achievement',
  'passStoryAchievementOptions'
]) must(`owner achievement binding ${token}`,owner,token);

must('migration enables collectible',migration,"'$.battlePass.storyCollectible.enabled', 1");
must('migration series enabled',migration,"'$.battlePass.storyCollectible.achievementSeries.enabled', 1");
must('migration 5 traces',migration,'{"target":5,"title":"По следу"}');
must('migration 25 traces',migration,'{"target":25,"title":"Всё ближе"}');
must('migration 50 traces',migration,'{"target":50,"title":"Белый Кролик был здесь"}');
must('migration follows canonical season 3 story',migration,"'season3-belkino-story-v1'");
check('migration lock updated',typeof lock?.files?.[migrationName]==='string'&&/^[a-f0-9]{64}$/.test(lock.files[migrationName]),'migration missing from lock');

must('D1 pre-0087 snapshot includes season pass seasons',d1Snapshot,'CREATE TABLE season_pass_seasons(');
must('D1 pre-0087 snapshot includes story preset bindings',d1Snapshot,'CREATE TABLE season_pass_story_presets(');
must('D1 pre-0087 season table exposes visuals json',d1Snapshot,"visuals_json TEXT NOT NULL DEFAULT '{}'");

const badgeFiles=[
  'season-cafe-joined.webp','season-cafe-complete.webp',
  'season-night-joined.webp','season-night-complete.webp',
  'season-belkino-joined-v3.webp','season-belkino-complete-v3.webp',
  'season-white-rabbit-joined-v3.webp','season-white-rabbit-complete-v3.webp',
  'season-belkino-traces-5-v3.webp','season-belkino-traces-25-v3.webp','season-belkino-traces-50-v3.webp'
];
for(const file of badgeFiles){
  const rel=path.join('assets','achievements','badges',file),abs=path.join(root,rel);
  const exists=fs.existsSync(abs);
  check(`${file} exists`,exists,rel);
  if(!exists)continue;
  const stat=fs.statSync(abs),head=fs.readFileSync(abs).subarray(0,12);
  check(`${file} is non-empty`,stat.size>1024,`size=${stat.size}`);
  check(`${file} is WebP`,head.toString('ascii',0,4)==='RIFF'&&head.toString('ascii',8,12)==='WEBP',head.toString('hex'));
}

for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'}  ${item.name}${item.ok||!item.detail?'':` — ${item.detail}`}`);
const failed=checks.filter(item=>!item.ok);
if(failed.length){
  console.error(`\nSeason achievement check failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nSeason achievement check PASS: ${checks.length} invariants.`);
