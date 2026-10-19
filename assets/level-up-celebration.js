// Sweet Run: purely presentational level celebration. Server ownership/claims stay unchanged.
(() => {
  'use strict';
  if (window.ZeffiLevelUp) return;
  const CATALOG = Object.freeze({
    small: { title: 'Обычный кейс', image: '/assets/cases/standart_closed.webp', rarity: 0 },
    sweet: { title: 'Серебряный кейс', image: '/assets/cases/Bronze_close.webp', rarity: 1 },
    gold: { title: 'Золотой кейс', image: '/assets/cases/gold_closed.webp', rarity: 2 },
    mythic: { title: 'Мифический кейс', image: '/assets/cases/Mifik_case_closed.webp', rarity: 3 },
    legendary: { title: 'Легендарный кейс', image: '/assets/cases/legendary_closed.webp', rarity: 4 }
  });
  const seen = new Set();
  const fmt = number => Math.max(0, Math.floor(Number(number) || 0)).toLocaleString('ru-RU');
  const clamp = n => Math.min(100, Math.max(0, Number(n) || 0));
  const reduced = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  let layer = null;
  let lastFocus = null;
  let timers = [];
  let onRewards = null;
  function schedule(fn, ms) { const id = window.setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { for (const id of timers) window.clearTimeout(id); timers = []; }
  function safeRewards(raw) {
    return (Array.isArray(raw) ? raw : []).slice(0, 49).flatMap(value => {
      const kind = String(value?.caseType || '');
      const def = CATALOG[kind];
      const level = Number(value?.level);
      if (!def || !Number.isInteger(level) || level < 2 || level > 50) return [];
      return [{...def, kind, level, count: Math.min(2, Math.max(1, Math.floor(Number(value?.count) || 1)))}];
    }).sort((a,b) => a.level - b.level);
  }
  function close() {
    clearTimers();
    if (!layer) return;
    layer.removeEventListener('keydown', keyHandler);
    layer.remove();
    layer = null;
    onRewards = null;
    if (lastFocus?.isConnected) {
      try { lastFocus.focus({preventScroll: true}); } catch { lastFocus.focus(); }
    }
    lastFocus = null;
  }
  function keyHandler(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab' || !layer) return;
    const buttons = [...layer.querySelectorAll('button:not([disabled])')];
    if (!buttons.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function show(input = {}) {
    const fromLevel = Math.floor(Number(input.fromLevel) || 0);
    const toLevel = Math.floor(Number(input.toLevel) || 0);
    const rewards = safeRewards(input.rewards).filter(row => row.level > fromLevel && row.level <= toLevel);
    if (fromLevel < 1 || toLevel <= fromLevel || toLevel > 50 || !rewards.length) return false;
    const key = String(input.eventKey || '');
    if (key && seen.has(key)) return false;
    close();
    lastFocus = document.activeElement;
    onRewards = typeof input.onViewRewards === 'function' ? input.onViewRewards : null;
    const best = [...rewards].sort((a,b) => b.rarity - a.rarity || b.level - a.level)[0];
    const maxTier = best.kind;
    const count = rewards.reduce((total,row) => total + row.count, 0);
    const plural = rewards.length > 1;
    const special = [10,20,30,40,45,50].some(level => level > fromLevel && level <= toLevel);
    const xp = Math.max(0, Math.floor(Number(input.xpEarned) || 0));
    const fromPct = clamp(input.fromPercent), toPct = clamp(input.toPercent);
    const isMax = Boolean(input.isMax) || toLevel === 50;
    const chips = rewards.length > 1 ? `<div class="zlu-items" aria-label="Все новые награды">${rewards.slice(0,5).map(row => `<div class="zlu-item"><img src="${row.image}" alt="" width="34" height="34"><span>${row.level} ур.</span>${row.count > 1 ? '<b>×2</b>' : ''}</div>`).join('')}${rewards.length > 5 ? `<span class="zlu-more">+${rewards.length-5}</span>` : ''}</div>` : '';
    const subtitle = plural ? `Новые награды: ${fmt(rewards.length)} ур. · ${fmt(count)} кейсов` : `Награда за ${fmt(best.level)} уровень`;
    layer = document.createElement('div');
    layer.className = 'zlu-cover';
    layer.innerHTML = `
      <section class="zlu-card zlu-${maxTier}${special ? ' zlu-special' : ''}" role="dialog" aria-modal="true" aria-labelledby="zlu-title" aria-describedby="zlu-desc" tabindex="-1">
        <button type="button" class="zlu-x" data-zlu-close aria-label="Закрыть окно">×</button>
        <div class="zlu-kicker">СЛАДКИЙ ЗАБЕГ <span>✦</span> ПРОГРЕСС</div>
        <div class="zlu-ribbon" id="zlu-title">НОВЫЙ УРОВЕНЬ!</div>
        <div class="zlu-level-stage">
          <div class="zlu-level-orbit"></div><span class="zlu-level-old">${fmt(fromLevel)}</span><span class="zlu-level-arrow">➜</span>
          <strong class="zlu-level-new">${fmt(toLevel)}</strong>
          <img class="zlu-dog" src="/assets/skins/gameplay/default/stand.webp" alt="Зеффи радуется вашему успеху" width="115" height="120" decoding="async">
        </div>
        <div class="zlu-xp-box">
          <div class="zlu-xp-line"><strong>${xp ? `+${fmt(xp)} XP` : 'Уровень повышен'}</strong><span>${isMax ? '50-й уровень достигнут!' : `Уровень ${fmt(toLevel + 1)} впереди`}</span></div>
          <div class="zlu-track" role="progressbar" aria-label="Опыт к следующему уровню" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(toPct)}"><span class="zlu-fill" style="width:${fromPct}%"></span></div>
          <div class="zlu-xp-caption">${isMax ? 'Высшая ступень прогрессии' : `${fmt(input.currentXp)} / ${fmt(input.needed)} XP до следующего уровня`}</div>
        </div>
        <div class="zlu-reward-label"><span class="zlu-reward-spark">✧</span> НОВАЯ НАГРАДА <span class="zlu-reward-spark">✧</span></div>
        <div class="zlu-reward-showcase">
          <div class="zlu-case-aura"></div>
          <img class="zlu-case" src="${best.image}" alt="${best.title}" width="160" height="144" decoding="async">
          ${best.count > 1 ? `<span class="zlu-count">×${best.count}</span>` : ''}
          <div class="zlu-reward-name">${best.title}</div>
          <div class="zlu-reward-sub" id="zlu-desc">${subtitle}</div>
        </div>
        ${chips}
        <p class="zlu-note">${plural ? 'Все кейсы доступны в разделе «Мои покупки».' : 'Кейс доступен к открытию в «Моих покупках».'}</p>
        <button type="button" class="zlu-primary" data-zlu-rewards>К моим кейсам <span>➜</span></button>
        <button type="button" class="zlu-later" data-zlu-close>Позже</button>
      </section>`;
    document.body.append(layer);
    // CSS can be rejected independently by the game's srcdoc CSP. Do not
    // acknowledge or de-duplicate an unstyled off-screen dialog.
    if (window.getComputedStyle(layer).position !== 'fixed') {
      close();
      return false;
    }
    if (key) seen.add(key);
    layer.addEventListener('keydown', keyHandler);
    layer.querySelectorAll('[data-zlu-close]').forEach(button => button.addEventListener('click', close));
    layer.querySelector('[data-zlu-rewards]')?.addEventListener('click', () => {
      const action = onRewards;
      close();
      try { action?.(); } catch (error) { console.warn('Level-up reward navigation unavailable', error); }
    });
    const modal = layer.querySelector('.zlu-card');
    modal?.focus({preventScroll:true});
    const fill = layer.querySelector('.zlu-fill');
    if (fill) {
      if (reduced()) fill.style.width = `${toPct}%`;
      else {
        schedule(() => { if (layer) fill.style.width = '100%'; }, 130);
        schedule(() => { if (!layer) return; fill.classList.add('zlu-reset'); fill.style.width = '0%'; }, 950);
        schedule(() => { if (!layer) return; fill.classList.remove('zlu-reset'); void fill.offsetWidth; fill.style.width = `${toPct}%`; }, 1040);
      }
    }
    return true;
  }
  window.ZeffiLevelUp = Object.freeze({show, close});
})();
