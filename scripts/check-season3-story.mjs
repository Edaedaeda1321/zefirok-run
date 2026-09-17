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

must('season 3 story preset id', 'id: "season3-belkino-story-v1"');
must('season 3 story marker', 'marker: "system-season3-story-v1"');
must('season 3 story events function', 'function season3StoryPresetEvents(){');
must('season 3 story seed function', 'async function ensureSeason3StoryPreset(env){');
must('season 3 story schema hook', 'await ensureSeason3StoryPresetRuntime(env);');
must('season 3 story runtime retry helper', 'async function ensureSeason3StoryPresetRuntime(env) {');
must('season 3 story quick schema path seed', 'if (!markerReady) await markSeasonPassSchemaReady(env);\n      await ensureSeason3StoryPresetRuntime(env);\n      return;');
must('season 3 story ready-path retry', 'if (seasonPassSchemaReady) {\n    await ensureSeason3StoryPresetRuntime(env);\n    return;');
must('season 3 canonical title matcher', '/тайны\\s+белкино/i');
must('season 3 event ids', 'const eventId=`story_${safeSeason}_s3_${event.key}`');
must('season 3 owner edit preservation marker', 'INSERT OR IGNORE INTO season_pass_story_presets');

must('chapter 1 title', 'title:"ГЛАВА I — «За дверями кафе»"');
must('chapter 1 level', 'key:"chapter-1", sortOrder:10, unlockLevel:1');
must('chapter 2 title', 'title:"ГЛАВА II — «Следы среди цветов»"');
must('chapter 2 level', 'key:"chapter-2", sortOrder:20, unlockLevel:11');
must('chapter 3 title', 'title:"ГЛАВА III — «Карта Белкино»"');
must('chapter 3 level', 'key:"chapter-3", sortOrder:30, unlockLevel:21');
must('chapter 4 title', 'title:"ГЛАВА IV — «Секрет старой дорожки»"');
must('chapter 4 level', 'key:"chapter-4", sortOrder:40, unlockLevel:31');
must('chapter 5 title', 'title:"ГЛАВА V — «Следуй за Белым Кроликом»"');
must('chapter 5 level', 'key:"chapter-5", sortOrder:50, unlockLevel:41');
must('finale title', 'title:"ФИНАЛ — «Тайны Белкино раскрыты… почти»"');
must('finale level 50', 'key:"finale", sortOrder:60, unlockLevel:50');

must('season slogan', 'Иногда достаточно выйти на прогулку, чтобы началось новое приключение');
must('green leaf clue', 'На подоконнике лежит зелёный лист');
must('golden paw traces', 'золотые следы лапок');
must('bird ribbon clue', 'розовую ленточку с маленьким золотым символом сердца');
must('leaf bridge star clue', 'лист → мост → звезда');
must('white rabbit token', 'белый жетон в форме кролика');
must('white rabbit ending', 'кто такой Белый Кролик и почему он ждал именно Зеффи?');
must('continuation ending', 'Продолжение следует. 🐾🤍');

const eventCount = (worker.match(/key:"(?:chapter-[1-5]|finale)", sortOrder:/g) || []).length;
const eventCountOk = eventCount >= 11; // S2 has 5 existing events; S3 adds 6.
checks.push(['season 3 adds six story events without deleting season 2', eventCountOk]);
console.log(`${eventCountOk ? 'PASS' : 'FAIL'}  season 3 adds six story events without deleting season 2 (${eventCount} total matching story keys)`);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`\nSeason 3 story check failed: ${failed.length}/${checks.length}`);
  for (const [label] of failed) console.error(`- ${label}`);
  process.exit(1);
}
console.log(`\nSeason 3 story check PASS: ${checks.length} invariants.`);
