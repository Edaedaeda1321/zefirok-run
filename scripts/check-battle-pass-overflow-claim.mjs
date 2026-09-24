import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'battle-pass.html');
const source = fs.readFileSync(file, 'utf8');

const checks = [
  ['overflow action exists', /data-overflow-inline/],
  ['overflow action is wired to authoritative claim', /void\s+claimOverflowRewards\(overflowInlineButton\)/],
  ['authoritative overflow claim endpoint is used', /CLAIM_OVERFLOW_PATH\s*=\s*["']\/api\/battle-pass\/overflow\/claim["']/],
  ['tap does not enter drag mode on touchstart', /touchstart[\s\S]{0,1400}classList\.remove\(["']is-touching["']\)/],
  ['drag mode starts only after horizontal axis is detected', /rewardTouchPan\.axis===["']x["']\)rewardScroll\.classList\.add\(["']is-touching["']\)/],
  ['horizontal drag suppresses synthetic click', /suppressClickUntil\s*=\s*performance\.now\(\)\+420/],
  ['suppressed click is blocked before document handler', /rewardScroll\.addEventListener\(["']click["'][\s\S]{0,500}event\.stopPropagation\(\)[\s\S]{0,80}true\)/],
];

let failed = 0;
for (const [label, pattern] of checks) {
  const ok = pattern.test(source);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}

const touchStart = source.match(/rewardScroll\.addEventListener\(["']touchstart["'][\s\S]*?\},\{passive:true\}\);/i)?.[0] || '';
if (/classList\.add\(["']is-touching["']\)/.test(touchStart)) {
  console.log('FAIL touchstart must not disable reward-column pointer events');
  failed++;
} else {
  console.log('PASS touchstart keeps reward buttons pointer-enabled');
}

if (failed) {
  console.error(`\n${failed} battle-pass overflow interaction check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length + 1}/${checks.length + 1} overflow interaction checks passed.`);
