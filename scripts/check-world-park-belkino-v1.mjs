#!/usr/bin/env node
// Production story-landmark safety gate: isolated story catalog and 9x9 geometry.
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDemoState} from '../world/story/model.js';
import {buildStoryMap,validateStoryMap,STORY_CATALOG,STORY_PARK_BELKINO_KIND} from '../world/story/map.js';
import {CATALOG} from '../world/catalog.js';
const story=buildStoryMap(createDemoState());
assert.deepEqual(validateStoryMap(story),[]);
assert.equal(story.objects.filter(o=>o.kind===STORY_PARK_BELKINO_KIND).length,1);
assert.ok(!Object.hasOwn(CATALOG,STORY_PARK_BELKINO_KIND));
assert.deepEqual([STORY_CATALOG[STORY_PARK_BELKINO_KIND].w,STORY_CATALOG[STORY_PARK_BELKINO_KIND].h],[9,9]);
const app=fs.readFileSync(new URL('../world/story/app.js',import.meta.url),'utf8');
assert.match(app,/STORY_CATALOG as CATALOG/);
const check=spawnSync(process.execPath,['--test','world/tests/park-belkino-story-v1.test.mjs'],{cwd:new URL('../',import.meta.url).pathname,encoding:'utf8'});
process.stdout.write(check.stdout);process.stderr.write(check.stderr);
if(check.status!==0)process.exit(check.status??1);
console.log('Belkino story landmark: fixed 9x9 sprite, isolated catalog, map and scenes PASS');
