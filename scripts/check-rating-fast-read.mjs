#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const worker = await readFile('src/worker.js', 'utf8');
const rating = await readFile('rating.html', 'utf8');
const fail = (message) => { throw new Error(`Rating fast-read check failed: ${message}`); };
const between = (text, start, end) => {
  const a = text.indexOf(start);
  if (a < 0) fail(`missing ${start}`);
  const b = text.indexOf(end, a + start.length);
  if (b < 0) fail(`missing end ${end}`);
  return text.slice(a, b);
};

const state = between(worker, 'async function leaderboardState', 'async function leaderboardRecentPublicAchievements');
if (state.includes('maybeRepairLeaderboardIntegrity(')) fail('public leaderboard state still blocks on integrity recovery');
if (!state.includes('buildLeaderboardPayload(')) fail('leaderboard state payload builder missing');
if (!rating.includes('void refresh("season", true);')) fail('season-first initial load missing');
if (rating.includes('Promise.all([refresh("season", true), refresh("all_time", true)])')) fail('rating still loads both modes during first paint');
if (!rating.includes('const REQUEST_TIMEOUT_MS = 12000;')) fail('expected bounded rating request timeout missing');

let checkedScripts = 0;
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
for (const match of rating.matchAll(scriptRe)) {
  const attrs = String(match[1] || '');
  const body = String(match[2] || '');
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']application\/(?:json|ld\+json)["']/i.test(attrs) || !body.trim()) continue;
  new vm.Script(body, { filename: `rating-inline-${checkedScripts + 1}.js` });
  checkedScripts += 1;
}
if (!checkedScripts) fail('no executable inline rating scripts were checked');

console.log(`Rating fast-read checks passed: public state is read-only, first paint loads only the season tab, ${checkedScripts} inline scripts parse.`);
