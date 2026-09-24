#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const path = process.argv[2] || 'rating.html';
const html = fs.readFileSync(path, 'utf8');
const checks = [];
const assert = (name, cond) => { if (!cond) throw new Error(`FAIL ${name}`); checks.push(name); };

assert('prestige v2 style exists', html.includes('id="rating-level-rework-20260924-v2"'));
assert('old prestige style removed', !html.includes('id="rating-level-rework-20260924"'));
for (const band of ['1','10','20','30','40','50']) {
  assert(`band ${band} css`, html.includes(`[data-level-band="${band}"]`));
}
assert('10+ band resolver exists', html.includes('level >= 10 ? "10" : "1"'));
assert('badge uses explicit prefix/value/mark', html.includes('leaderboard-level-badge-prefix') && html.includes('leaderboard-level-badge-value') && html.includes('leaderboard-level-badge-mark'));
assert('inline chip uses explicit prefix/value/mark', html.includes('rating-level-chip-prefix') && html.includes('rating-level-chip-value') && html.includes('rating-level-chip-mark'));
assert('mini-profile receives level band', html.includes('rating-player-profile-head" data-level-band="${escapeHtml(levelMeta.band)}"'));
assert('mini-profile avatar has tier styling', html.includes('.rating-player-profile-head[data-level-band="50"] .leaderboard-avatar-frame'));
assert('mini-profile full header has tier styling', html.includes('.rating-player-profile-head[data-level-band="20"]') && html.includes('.rating-player-profile-head[data-level-band="40"]'));
assert('bad mini-profile pseudo shimmer is disabled', html.includes('.rating-player-profile-avatar .leaderboard-level-badge::after{content:none!important;display:none!important}'));
assert('clean animation uses background-position', html.includes('@keyframes ratingLevelSweep'));
assert('reduced motion safety exists', html.includes('@media(prefers-reduced-motion:reduce)'));

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, parsed = 0;
while ((m = scriptRe.exec(html))) {
  const attrs = m[1] || '';
  const code = m[2] || '';
  if (/type\s*=\s*["']application\/json["']/i.test(attrs)) continue;
  if (/\bsrc\s*=/i.test(attrs)) continue;
  if (!code.trim()) continue;
  if (/type\s*=\s*["']module["']/i.test(attrs)) {
    new vm.SourceTextModule(code);
  } else {
    new vm.Script(code);
  }
  parsed += 1;
}
assert('inline scripts parse', parsed > 0);
console.log(`Rating level prestige V2 PASS: ${checks.length} invariants, ${parsed} inline script(s) parsed.`);
