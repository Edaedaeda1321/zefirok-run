import fs from 'node:fs';

const source = fs.readFileSync('index.html', 'utf8');
let checks = 0;
const assert = (condition, message) => {
  checks += 1;
  if (!condition) throw new Error(`Progress info stability check failed: ${message}`);
};

const start = source.indexOf('function renderProgressInfo(keepScroll=false)');
const end = source.indexOf('function queueProgressInfoRender()', start);
assert(start >= 0 && end > start, 'renderProgressInfo block is present');
const render = source.slice(start, end);

assert(source.includes('CLIENT_ANTI_CHEAT_GUARD_INTERVAL_MS = 1600'), 'periodic anti-cheat refresh remains enabled');
assert(source.includes('if (profileScreen &amp;&amp; !profileScreen.hidden) renderProfile();'), 'profile can still refresh while visible');
assert(source.includes("caseReturn:null, bodyMarkup:null, footerMarkup:null"), 'progress sheet keeps markup caches');
assert(render.includes('const bodyChanged=p.bodyMarkup!==content,footerChanged=p.footerMarkup!==footerMarkup;'), 'body/footer changes are detected before DOM replacement');
assert(render.includes('if(bodyChanged){body.innerHTML=content;p.bodyMarkup=content;}'), 'body DOM is replaced only when content changes');
assert(render.includes('if(footerChanged){footer.innerHTML=footerMarkup;p.footerMarkup=footerMarkup;}'), 'footer DOM is replaced only when content changes');
assert(!render.includes('\n body.innerHTML=content;'), 'unconditional body replacement is removed');
assert(!render.includes('\n footer.innerHTML='), 'unconditional footer replacement is removed');
assert(render.includes('if(!keepScroll)body.scrollTop=0;else if(bodyChanged)body.scrollTop=oldY;'), 'scroll is preserved without forcing a repaint');
assert(render.includes('if((bodyChanged||footerChanged)&amp;&amp;focusKey)'), 'focus is restored only after a real DOM replacement');
assert(source.includes('function queueProgressInfoRender(){'), 'existing state-driven refresh path remains intact');
assert(source.includes('progressInfo.frame=requestAnimationFrame'), 'refreshes stay coalesced through requestAnimationFrame');

console.log(`Progress info stability checks passed: ${checks} invariants.`);
