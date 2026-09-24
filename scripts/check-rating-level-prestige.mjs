#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2] || 'rating.html';
const source = fs.readFileSync(file, 'utf8');
let checks = 0;
const assert = (condition, message) => {
  checks += 1;
  if (!condition) throw new Error(`Rating level prestige check failed: ${message}`);
};

const styleStart = source.indexOf('<style id="zefirok-player-level-prestige-plate-v4">');
const styleEnd = styleStart >= 0 ? source.indexOf('</style>', styleStart) : -1;
assert(styleStart >= 0 && styleEnd > styleStart, 'Prestige Plate V4 style block is missing');
const style = styleStart >= 0 && styleEnd > styleStart ? source.slice(styleStart, styleEnd) : '';

assert(source.includes('function playerLevelMeta(value)'), 'level metadata helper is missing');
assert(source.includes('level >= 10 ? "10" : "1"'), '10-19 level tier is missing');
for (const tier of ['1','10','20','30','40','50']) {
  assert(style.includes(`data-level-tier="${tier}"`), `tier ${tier} style is missing`);
}
assert(source.includes('function playerLevelPlateMarkup('), 'shared level plate renderer is missing');
assert(source.includes('>${meta.level}</strong>'), 'plate does not render the real runtime level');
assert(source.includes('player-level-plate__frame'), 'frame layer is missing');
assert(source.includes('player-level-plate__face'), 'face layer is missing');
assert(source.includes('player-level-plate__bracket--left'), 'Rose Brackets left bracket is missing');
assert(source.includes('player-level-plate__bracket--right'), 'Rose Brackets right bracket is missing');
assert(style.includes('data-level-tier="30"] .player-level-plate__bracket'), 'Rose Brackets tier styling is missing');
assert(source.includes('player-level-plate__aura'), 'Inferno aura layer is missing');
assert(source.includes('player-level-plate__flame-sheet'), 'Inferno flame field is missing');
assert(source.includes('player-level-plate__halo'), 'Inferno halo is missing');
assert(source.includes('player-level-plate__wing--left'), 'Inferno left wing is missing');
assert(source.includes('player-level-plate__wing--right'), 'Inferno right wing is missing');
assert(source.includes('player-level-plate__stud--left'), 'Inferno stud detail is missing');
assert(style.includes('data-level-tier="50"] .player-level-plate__flame'), 'Inferno flame styling is missing');
assert(style.includes('@keyframes playerLevelAuraPulse'), 'Inferno aura animation is missing');
assert(style.includes('@keyframes playerLevelFireSheet'), 'Inferno flame field animation is missing');
assert(style.includes('@keyframes playerLevelHaloGlow'), 'Inferno halo animation is missing');
assert(!/url\(/i.test(style), 'Prestige Plate must remain image-free');
assert(style.includes('animation-play-state:paused'), 'offscreen motion pause is missing');
assert(style.includes('.is-level-motion-active'), 'visible-only motion activation is missing');
assert(source.includes('new IntersectionObserver'), 'IntersectionObserver motion guard is missing');
assert(source.includes('(prefers-reduced-motion: reduce)'), 'reduced-motion fallback is missing');

assert(source.includes('playerLevelPlateMarkup(level, "podium"'), 'podium does not use prestige plate');
assert(source.includes('playerLevelPlateMarkup(level, "row"'), 'rating rows do not use prestige plate');
assert(source.includes('return playerLevelPlateMarkup(entry?.level || 1, "avatar", true'), 'mini-profile/avatar does not use prestige plate');
assert(source.includes('showLevelBadge ? playerLevelBadgeMarkup(entry) : ""'), 'avatar renderer does not support suppressing duplicate plates');
assert(source.includes('avatarMarkup(entry, false, true, false)'), 'podium avatar still renders a duplicate level plate');
assert(source.includes('avatarMarkup(entry, true, false, false)'), 'rating row avatar still renders a duplicate level plate');
assert(source.includes('refreshPlayerLevelMotion();\n    maybeAutoShowRatingFinale();'), 'rating render does not activate level motion');
assert(source.includes('refreshPlayerLevelMotion();\n    requestAnimationFrame(()=>playerProfileContent?.classList.add("is-loaded"));'), 'mini-profile render does not activate level motion');

assert(!source.includes('.rating-player-profile-avatar .leaderboard-level-badge::before{content:"Ур. ";'), 'legacy mini-profile pill prefix still exists');
assert(!source.includes('#zefirok-maltipoo-runner .leaderboard-level-badge{position:absolute;right:-5px;bottom:-4px'), 'legacy circular badge CSS still exists');
assert(!source.includes('<style id="mini-profile-level-badge-hotfix">'), 'obsolete after-HTML mini-profile hotfix still exists');
assert(!source.includes('<style id="zefirok-player-level-badge-v4">'), 'broken interim badge system still exists');

let parsedScripts = 0;
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
for (const match of source.matchAll(scriptRe)) {
  const attrs = String(match[1] || '');
  const body = String(match[2] || '');
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']application\/(?:json|ld\+json)["']/i.test(attrs) || !body.trim()) continue;
  new vm.Script(body, { filename: `rating-inline-${parsedScripts + 1}.js` });
  parsedScripts += 1;
}
assert(parsedScripts > 0, 'no executable inline scripts were parsed');

console.log(`Rating level prestige V4 check PASS: ${checks} invariants, ${parsedScripts} inline script(s) parsed.`);
