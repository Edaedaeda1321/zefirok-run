#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const workerPath = path.join(root, 'src/worker.js');
if (!fs.existsSync(workerPath)) {
  console.error('FAIL  src/worker.js missing');
  process.exit(1);
}
const worker = fs.readFileSync(workerPath, 'utf8');
const checks = [];
function must(label, needle) {
  const ok = worker.includes(needle);
  checks.push([label, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
function mustAsset(label, relativePath) {
  const ok = fs.existsSync(path.join(root, relativePath));
  checks.push([label, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}

must('season 4 canonical preset id', 'id: "season4-white-rabbit-story-v1-canonical"');
must('season 4 canonical marker', 'marker: "system-season4-story-v1-canonical"');
must('season 4 story events function', 'function season4StoryPresetEvents(){');
must('season 4 canonical seed function', 'async function ensureSeason4StoryPreset(env){');
must('season 4 runtime retry helper', 'async function ensureSeason4StoryPresetRuntime(env) {');
must('season 4 ready-path hook', 'await ensureSeason3StoryPresetRuntime(env);\n    await ensureSeason4StoryPresetRuntime(env);');
must('season 4 quick-path hook', 'await ensureSeason3StoryPresetRuntime(env);\n      await ensureSeason4StoryPresetRuntime(env);');
must('season 4 full-schema hook', 'Seed the authored Season 4 White Rabbit story once when the next season exists.');
must('season 4 runtime is fail-soft', "console.error('season4 story preset runtime failed',error)");
must('season 4 title matcher', "key.includes('белый кролик')");
must('season 4 numbered title matcher', '/(?:сезон|season)\\s*0*4(?:\\D|$)/i');
must('season 4 asset-key matcher', "key==='s4'||key==='season4'");
must('season 4 follows season 3 when title is custom', "reason:'next-after-season3'");
must('season 4 stale preset marker can recover', 'DELETE FROM season_pass_story_presets WHERE preset_id=?');
must('season 4 canonical event ids', 'const eventId=`story_${safeSeason}_s4_${event.key}`');
must('season 4 canonical upsert', 'ON CONFLICT(event_id) DO UPDATE SET season_id=excluded.season_id');
must('season 4 duplicate cleanup', 'DELETE FROM season_pass_story_events WHERE event_id=? AND season_id=?');
must('season 4 progressed duplicate archive', '[АРХИВ] ${title}');
must('season 4 canonical marker upsert', 'ON CONFLICT(preset_id) DO UPDATE SET season_id=excluded.season_id');

must('chapter 1 title', 'title:"ГЛАВА I — «Дверь по соседству»"');
must('chapter 1 level', 'key:"chapter-1", sortOrder:10, unlockLevel:1');
must('chapter 2 title', 'title:"ГЛАВА II — «Необычный сосед»"');
must('chapter 2 level', 'key:"chapter-2", sortOrder:20, unlockLevel:11');
must('chapter 3 title', 'title:"ГЛАВА III — «Секрет улыбки»"');
must('chapter 3 level', 'key:"chapter-3", sortOrder:30, unlockLevel:21');
must('chapter 4 title', 'title:"ГЛАВА IV — «Два места — одна история»"');
must('chapter 4 level', 'key:"chapter-4", sortOrder:40, unlockLevel:31');
must('chapter 5 title', 'title:"ГЛАВА V — «Улыбка Зеффи»"');
must('chapter 5 level', 'key:"chapter-5", sortOrder:50, unlockLevel:41');
must('final letter title', 'title:"ФИНАЛЬНОЕ ПИСЬМО — «Две двери — одна история»"');
must('final letter level 50', 'key:"finale", sortOrder:60, unlockLevel:50');

must('chapter 1 core text', 'главная загадка только начинается.');
must('chapter 2 dentistry reveal', 'Это стоматология.');
must('chapter 2 seasonal marshmallow line', 'обычный зефир → сезонный зефир Белого Кролика.');
must('chapter 3 care line', 'Любишь сладкое — не забывай заботиться об улыбке.');
must('chapter 4 sweet mood line', '«Зефирок» дарит сладкое настроение.');
must('chapter 4 smile care line', '«Белый Кролик» помогает заботиться об улыбке.');
must('chapter 5 self-care line', 'Можно любить сладости, радоваться маленьким удовольствиям и одновременно заботиться о себе.');
must('final teaser', 'Кажется, впереди уже ждёт новое приключение…');
must('final invitation', 'Готова отправиться немного дальше?');
must('final continuation', 'История Зеффи продолжится… 🐾');

const assets = [
  'assets/letter/pick/season4_pick_g1.webp',
  'assets/letter/pick/season4_pick_g2.webp',
  'assets/letter/pick/season4_pick_g3.webp',
  'assets/letter/pick/season4_pick_g4.webp',
  'assets/letter/pick/season4_pick_g5.webp',
  'assets/letter/pick/season4_pick_paper.webp'
];
assets.forEach((asset, index)=>mustAsset(`season 4 story asset ${index + 1}`, asset));
assets.forEach((asset)=>must(`worker references ${path.basename(asset)}`, `asset("${path.basename(asset)}")`));

const season4Block = worker.slice(worker.indexOf('const SEASON4_STORY_PRESET'), worker.indexOf('const CASE_PHYSICAL_TOTAL_CHANCE'));
const eventCount = (season4Block.match(/key:"(?:chapter-[1-5]|finale)", sortOrder:/g) || []).length;
const eventCountOk = eventCount === 6;
checks.push(['season 4 has exactly six authored story events', eventCountOk]);
console.log(`${eventCountOk ? 'PASS' : 'FAIL'}  season 4 has exactly six authored story events (${eventCount})`);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`\nSeason 4 story check failed: ${failed.length}/${checks.length}`);
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}
console.log(`\nSeason 4 story check PASS: ${checks.length} invariants.`);
