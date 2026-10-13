#!/usr/bin/env node
// Fail closed if a future refactor restores local/demo authority in hosted story.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const api=read('src/zeffi-world-service.js'),logic=read('src/zeffi-story-progress.js');
const hosted=read('world/story/app.js'),boot=read('world/story/boot.js'),fund=read('world/story/shared-fund.js'),migration=read('migrations/0118_zeffi_story_progression.sql');
assert(api.indexOf('assertTester(env,telegramId);')<api.indexOf("pathname==='/api/world/story/progress'"));
assert(api.includes("if(!worldEnabled(env))failure(403,'WORLD_DISABLED'"));
assert(logic.includes('WORLD_STORY_ENABLED')&&logic.includes('zeffi_story_players'));
assert(logic.includes('zeffi_story_visits')&&logic.includes('zeffi_story_events'));
assert(logic.includes('zeffi_community_projects')&&logic.includes('p.total_points=p.goal_points'));
assert(!/(?:admin_profile_state|grant_case|UPDATE\s+wallet|INSERT\s+INTO\s+granted)/i.test(logic));
assert(hosted.includes('signedStoryClient?signedStoryClient.read()'));
assert(hosted.includes('storySnapshot')&&hosted.includes('data-action="story-advance"'));
assert(hosted.includes("if(liveMode)return;state=next;persistent=saveDemo"));
assert(fund.includes('chapter:local.chapter')&&!fund.includes('Math.max(local.chapter,1)'));
assert(boot.includes("payload?.mode!=='server-story'"));
assert(migration.includes('zeffi_story_events')&&migration.includes('zeffi_story_visits'));
assert(!/WORLD_TESTER_IDS|WORLD_ENABLED/.test(migration));
assert(read('scripts/check-production-gate.mjs').includes('world/tests/story-progression-rc.test.mjs'));
console.log('World story RC: signed Telegram, D1 chapters/events/areas, closed allowlist, and no wallet side effects PASS');
