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

const styleStart = source.indexOf('<style id="zefirok-player-level-prestige-plate-v1">');
const styleEnd = styleStart >= 0 ? source.indexOf('</style>', styleStart) : -1;
assert(styleStart >= 0 && styleEnd > styleStart, 'prestige plate style block is missing');
const style = styleStart >= 0 && styleEnd > styleStart ? source.slice(styleStart, styleEnd) : '';

assert(source.includes('function playerLevelMeta(value)'), 'level metadata helper is missing');
assert(source.includes('level >= 10 ? "10" : "1"'), '10-19 level tier is missing');
for (const tier of ['1','10','20','30','40','50']) {
  assert(style.includes(`data-level-tier="${tier}"`), `tier ${tier} style is missing`);
}
assert(source.includes('function playerLevelPlateMarkup('), 'shared level plate renderer is missing');
assert(source.includes('player-level-plate__frame'), 'frame layer is missing');
assert(source.includes('player-level-plate__crest'), 'progressive crest/crown layer is missing');
assert(source.includes('player-level-plate__face'), 'face layer is missing');
assert(!/player-level-plate[^\n{]*::(?:before|after)/.test(style), 'prestige plate must not use pseudo-element overlays');
assert(!/url\(/i.test(style), 'prestige plate must remain image-free');
assert(style.includes('@keyframes playerLevelPlateSweep'), 'specular sweep animation is missing');
assert(style.includes('@keyframes playerLevelPlateSpark'), 'spark animation is missing');
assert(style.includes('@keyframes playerLevelPlateCrestGlow'), 'crest/crown glow animation is missing');
assert(style.includes('animation-play-state:paused'), 'offscreen motion pause is missing');
assert(style.includes('.is-level-motion-active'), 'visible-only motion activation is missing');
assert(source.includes('new IntersectionObserver'), 'IntersectionObserver motion guard is missing');
assert(source.includes('(prefers-reduced-motion: reduce)'), 'reduced-motion fallback is missing');
assert(source.includes('playerLevelPlateMarkup(level, "podium"'), 'podium does not use prestige plate');
assert(source.includes('playerLevelPlateMarkup(level, "row"'), 'rating rows do not use prestige plate');
assert(source.includes('playerLevelPlateMarkup(entry?.level || 1, "avatar"'), 'mini-profile/avatar does not use prestige plate');
assert(source.includes('showLevelBadge ? playerLevelBadgeMarkup(entry) : ""'), 'ranking avatars still render a hidden duplicate level plate');
assert(source.includes('avatarMarkup(entry, false, true, false)'), 'podium avatar still renders a duplicate level plate');
assert(source.includes('avatarMarkup(entry, true, false, false)'), 'rating row avatar still renders a duplicate level plate');
assert(source.includes('refreshPlayerLevelMotion();\n    maybeAutoShowRatingFinale();'), 'rating render does not activate level motion');
assert(source.includes('refreshPlayerLevelMotion();\n    requestAnimationFrame(()=>playerProfileContent?.classList.add("is-loaded"));'), 'mini-profile render does not activate level motion');
assert(!source.includes('.rating-player-profile-avatar .leaderboard-level-badge::before{content:"Ур. ";'), 'legacy mini-profile pill prefix still exists');
assert(!source.includes('#zefirok-maltipoo-runner .leaderboard-level-badge{position:absolute;right:-5px;bottom:-4px'), 'legacy circular badge style still exists');

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

console.log(`Rating level prestige check PASS: ${checks} invariants, ${parsedScripts} inline script(s) parsed.`);
