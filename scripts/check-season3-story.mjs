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
const battlePassPath = path.join(root, 'battle-pass.html');
if (!fs.existsSync(battlePassPath)) {
  console.error('FAIL  battle-pass.html missing');
  process.exit(1);
}
const battlePass = fs.readFileSync(battlePassPath, 'utf8');
const checks = [];
function must(label, needle) {
  const ok = worker.includes(needle);
  checks.push([label, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
function mustClient(label, needle) {
  const ok = battlePass.includes(needle);
  checks.push([label, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}

must('season 3 story preset id', 'id: "season3-belkino-story-v1"');
must('season 3 story marker', 'marker: "system-season3-story-v1"');
must('season 3 story events function', 'function season3StoryPresetEvents(){');
must('season 3 story seed function', 'async function ensureSeason3StoryPreset(env){');
must('season 3 story schema hook', 'await ensureSeason3StoryPresetRuntime(env);');
must('season 3 story runtime retry helper', 'async function ensureSeason3StoryPresetRuntime(env) {');
must('season 3 canonical repair id', 'canonicalRepairId: "season3-belkino-story-v2-canonical"');
must('season 3 canonical repair marker', 'canonicalRepairMarker: "system-season3-story-v2-canonical"');
must('season 3 canonical repair function', 'async function ensureSeason3StoryCanonicalV2(env){');
must('season 3 repair follows original seeded season', 'SELECT season_id FROM season_pass_story_presets WHERE preset_id=? LIMIT 1');
must('season 3 canonical upsert', 'ON CONFLICT(event_id) DO UPDATE SET season_id=excluded.season_id');
must('season 3 duplicate cleanup', 'DELETE FROM season_pass_story_events WHERE event_id=? AND season_id=?');
must('season 3 progressed duplicate archive', '[АРХИВ] ${title}');
must('season 3 runtime invokes canonical repair', 'const repairResult=await ensureSeason3StoryCanonicalV2(env);');
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

mustClient('story music reads shared player music setting', 'const SEASON_STORY_PROGRESS_KEYS=["zefirok-runner-progress-v2","zefirok-runner-progress-v2-secure-backup-v1"]');
mustClient('story music respects musicEnabled', 'function seasonStoryMusicEnabled(){');
mustClient('story music keeps blocked autoplay for gesture retry', 'seasonStoryAudioRetryUrl=next;bindSeasonStoryMusicUnlock();');
mustClient('story music retries on pointer gesture', 'document.addEventListener("pointerdown",retry,{capture:true,passive:true})');
mustClient('story music retries on touch gesture', 'document.addEventListener("touchend",retry,{capture:true,passive:true})');
mustClient('story music uses inline playback', 'audio.setAttribute("playsinline","")');
mustClient('story first page primes music before async open', 'function openPendingSeasonStoryFromGesture(){const pending=seasonStoryData()?.pending;if(pending)primeSeasonStoryMusic(pending);void showPendingSeasonStory();}');
mustClient('story card opens through user gesture music path', 'el("seasonStoryOpen").addEventListener("click",()=>{passImpactHaptic("medium");openPendingSeasonStoryFromGesture();});');
mustClient('season path opens through user gesture music path', 'if(status==="available"){openPendingSeasonStoryFromGesture();return;}');

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
