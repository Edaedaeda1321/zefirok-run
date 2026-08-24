(() => {
  'use strict';
  const cfg = window.__ZEFIROK_PROFILE_V2_CANDIDATE__ || {};
  const VERSION = String(cfg.version || 'V5.0.2');
  const MODE = String(cfg.mode || 'CANDIDATE').toUpperCase();
  const STYLE_URL = '/candidates/V5/source/profile-v2-candidate.css';
  const installed = new WeakSet();
  let cssText = '';
  let autoOpened = false;
  let badge = null;

  function ensureBadge() {
    if (badge?.isConnected) return badge;
    badge = document.createElement('div');
    badge.dataset.profileV2CandidateBadge = '1';
    badge.textContent = `🧪 ${VERSION} · PROFILE 2.0 · ${MODE}`;
    Object.assign(badge.style, {
      position:'fixed', right:'8px', top:'max(8px, env(safe-area-inset-top))', zIndex:'2147483647',
      padding:'6px 9px', border:'1px solid rgba(181,112,144,.34)', borderRadius:'999px',
      background:'rgba(75,46,65,.92)', color:'#fff', font:'900 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      letterSpacing:'.02em', pointerEvents:'none', boxShadow:'0 6px 18px rgba(62,36,50,.18)'
    });
    document.body.appendChild(badge);
    return badge;
  }

  function setBadgeState(state, message = '') {
    const el = ensureBadge();
    if (state === 'ready') {
      el.textContent = `✓ ${VERSION} · PROFILE 2.0 · ${MODE}`;
      el.style.background = 'rgba(61,112,80,.94)';
      el.title = 'Profile 2.0 Candidate активен';
      return;
    }
    if (state === 'error') {
      el.textContent = `⚠ ${VERSION} · PROFILE 2.0`;
      el.style.background = 'rgba(151,63,85,.95)';
      el.title = message || 'Candidate не установлен';
      return;
    }
    el.title = message || '';
  }

  function safeDocument(win) {
    try { return win && win.document ? win.document : null; } catch { return null; }
  }

  function proxyClick(doc, selector) {
    const target = doc.querySelector(selector);
    if (target && typeof target.click === 'function') target.click();
  }

  function ensureStyle(doc) {
    if (!cssText || doc.getElementById('zefirok-profile-v2-candidate-style')) return;
    const style = doc.createElement('style');
    style.id = 'zefirok-profile-v2-candidate-style';
    style.textContent = cssText;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function createQuickButton(doc, action, icon, label, meta) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'profile-v2-quick';
    btn.dataset.profileV2Action = action;
    btn.innerHTML = `<span class="profile-v2-quick-icon" aria-hidden="true">${icon}</span><strong>${label}</strong><small data-profile-v2-meta>${meta}</small>`;
    return btn;
  }

  function ensureQuickbar(doc, shell, hero) {
    let bar = shell.querySelector(':scope > .profile-v2-quickbar');
    if (bar) return bar;
    bar = doc.createElement('div');
    bar.className = 'profile-v2-quickbar';
    bar.setAttribute('aria-label', 'Быстрый доступ');
    bar.append(
      createQuickButton(doc, 'rating', '🏆', 'Рейтинг', 'Сезон'),
      createQuickButton(doc, 'season', '🎟️', 'Сезон', 'Пропуск'),
      createQuickButton(doc, 'album', '📖', 'Альбом', 'Коллекции'),
      createQuickButton(doc, 'friends', '🐾', 'Друзья', 'Вместе')
    );
    if (hero.nextSibling) shell.insertBefore(bar, hero.nextSibling); else shell.appendChild(bar);
    bar.addEventListener('click', event => {
      const btn = event.target.closest('[data-profile-v2-action]');
      if (!btn) return;
      const action = btn.dataset.profileV2Action;
      if (action === 'rating') proxyClick(doc, '.profile-section--leaderboard [data-leaderboard-open]');
      if (action === 'season') proxyClick(doc, '.profile-section--battle-pass [data-battle-pass-open]');
      if (action === 'album') proxyClick(doc, '.profile-section--cases [data-album-open]');
      if (action === 'friends') proxyClick(doc, '.profile-section--referrals [data-referrals-open]');
    });
    return bar;
  }

  function ensureStatsToggle(doc, progress) {
    if (!progress) return;
    const stats = progress.querySelector('.profile-stats');
    if (!stats || progress.querySelector('[data-profile-v2-stats-toggle]')) return;
    const count = stats.querySelectorAll('.profile-stat').length;
    if (count <= 4) return;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'profile-v2-text-button';
    button.dataset.profileV2StatsToggle = '1';
    button.textContent = `Ещё ${count - 4} показателя`;
    stats.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      const open = progress.classList.toggle('profile-v2-stats-expanded');
      button.textContent = open ? 'Скрыть подробности' : `Ещё ${count - 4} показателя`;
    });
  }

  function ensureCosmeticsToggle(doc, cases) {
    if (!cases || cases.querySelector('[data-profile-v2-cosmetics-toggle]')) return;
    const subsection = cases.querySelector('.case-subsection');
    if (!subsection) return;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'profile-v2-cosmetics-toggle';
    button.dataset.profileV2CosmeticsToggle = '1';
    button.innerHTML = '<span>Изменить оформление профиля</span><b aria-hidden="true">⌄</b>';
    subsection.insertAdjacentElement('beforebegin', button);
    button.addEventListener('click', () => {
      const open = cases.classList.toggle('profile-v2-cosmetics-open');
      button.querySelector('span').textContent = open ? 'Скрыть оформление профиля' : 'Изменить оформление профиля';
      button.querySelector('b').textContent = open ? '⌃' : '⌄';
    });
  }

  function accountRow(doc, action, icon, title, subtitle) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'profile-v2-account-row';
    btn.dataset.profileV2Account = action;
    btn.innerHTML = `<span class="profile-v2-account-row-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><small>${subtitle}</small></span><b aria-hidden="true">›</b>`;
    return btn;
  }

  function ensureAccountHub(doc, shell, cases) {
    let hub = shell.querySelector(':scope > .profile-v2-account-hub');
    if (hub) return hub;
    hub = doc.createElement('section');
    hub.className = 'profile-v2-account-hub';
    hub.setAttribute('aria-label', 'Аккаунт и помощь');
    const title = doc.createElement('div');
    title.className = 'profile-v2-account-title';
    title.textContent = 'Аккаунт и помощь';
    hub.append(
      title,
      accountRow(doc, 'settings', '⚙️', 'Настройки', 'Звук, музыка и обучение'),
      accountRow(doc, 'support', '🛟', 'Поддержка', 'Вопросы, проблемы и ответы команды'),
      accountRow(doc, 'legal', '📜', 'Документы', 'Соглашение, данные и конфиденциальность'),
      accountRow(doc, 'about', '💡', 'О профиле', 'Что здесь находится и как это работает')
    );
    if (cases && cases.nextSibling) shell.insertBefore(hub, cases.nextSibling); else shell.appendChild(hub);
    hub.addEventListener('click', event => {
      const btn = event.target.closest('[data-profile-v2-account]');
      if (!btn) return;
      const action = btn.dataset.profileV2Account;
      const settings = shell.querySelector('.profile-section--settings');
      const help = shell.querySelector('.profile-section--help');
      if (action === 'settings' && settings) {
        const open = settings.classList.toggle('profile-v2-panel-open');
        if (open) settings.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (action === 'about' && help) {
        const open = help.classList.toggle('profile-v2-panel-open');
        if (open) help.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (action === 'support') proxyClick(doc, '[data-profile-support-open]');
      if (action === 'legal') proxyClick(doc, '[data-profile-legal-open="hub"]');
    });
    return hub;
  }

  function textOf(el, fallback = '') {
    const text = String(el?.textContent || '').trim();
    return text || fallback;
  }


  function ensureNewcomerPreview(doc) {
    const section = doc.querySelector('[data-newcomer-section]');
    const list = doc.querySelector('[data-newcomer-list]');
    const subtitle = doc.querySelector('[data-newcomer-subtitle]');
    if (!section || !list) return;

    const preview = list.querySelector('[data-profile-v2-newcomer-preview]');
    const hasRealContent = !section.hidden && list.children.length > 0 && !preview;
    if (hasRealContent) {
      delete section.dataset.profileV2Preview;
      return;
    }
    if (!section.hidden && list.children.length > 0 && preview) return;
    if (!section.hidden && list.children.length > 0) return;

    section.hidden = false;
    section.dataset.profileV2Preview = '1';
    if (subtitle) subtitle.textContent = 'Три коротких шага, чтобы освоиться в кафе.';
    list.innerHTML = `
      <div class="newcomer-step is-ready" data-profile-v2-newcomer-preview="1">
        <div class="newcomer-step-day">D1</div>
        <div class="newcomer-step-copy"><strong>Первый сладкий забег</strong><span>Заверши первый полноценный забег и познакомься с Зеффи. · 🎁 500 очков</span></div>
        <span class="newcomer-step-state">1 забег</span>
      </div>
      <div class="newcomer-step">
        <div class="newcomer-step-day">D2</div>
        <div class="newcomer-step-copy"><strong>Загляни в коллекцию</strong><span>Вернись на второй день, сделай ещё один забег и открой Альбом. · 🎁 20 зефира</span></div>
        <span class="newcomer-step-state">День 2</span>
      </div>
      <div class="newcomer-step">
        <div class="newcomer-step-day">D3</div>
        <div class="newcomer-step-copy"><strong>Играть вместе веселее</strong><span>На третий день сделай ещё один забег и загляни в «Друзья кафе». · 🎁 Обычный кейс</span></div>
        <span class="newcomer-step-state">День 3</span>
      </div>`;
  }

  function sync(doc, quickbar, accountHub) {
    ensureNewcomerPreview(doc);
    const q = action => quickbar?.querySelector(`[data-profile-v2-action="${action}"]`);
    const qMeta = action => q(action)?.querySelector('[data-profile-v2-meta]');
    const place = textOf(doc.querySelector('[data-leaderboard-summary-place]'), '—');
    if (qMeta('rating')) qMeta('rating').textContent = place === '—' ? 'Сезон' : `Место ${place}`;

    const seasonBadge = doc.querySelector('[data-season-pass-attention]');
    const seasonCount = Math.max(0, Number(textOf(seasonBadge, '0')) || 0);
    if (qMeta('season')) qMeta('season').textContent = seasonCount > 0 ? `${seasonCount} ждёт` : 'Пропуск';
    q('season')?.classList.toggle('has-attention', !seasonBadge?.hidden && seasonCount > 0);

    const referralBadge = doc.querySelector('[data-referrals-badge]');
    const friendMeta = textOf(referralBadge, 'Вместе');
    if (qMeta('friends')) qMeta('friends').textContent = (!referralBadge || referralBadge.hidden) ? 'Вместе' : friendMeta;
    q('friends')?.classList.toggle('has-attention', Boolean(referralBadge && !referralBadge.hidden));

    const albumCounts = [...doc.querySelectorAll('[data-case-collection-count]')].map(el => textOf(el)).filter(Boolean);
    if (qMeta('album')) qMeta('album').textContent = albumCounts.length ? albumCounts[0] : 'Коллекции';

    const coop = doc.querySelector('[data-friend-coop-profile]');
    const referrals = doc.querySelector('.profile-section--referrals');
    referrals?.classList.toggle('profile-v2-has-coop', Boolean(coop && !coop.hidden));

    const supportBadge = doc.querySelector('[data-profile-support-badge]');
    const supportRow = accountHub?.querySelector('[data-profile-v2-account="support"]');
    let v2Badge = supportRow?.querySelector('.profile-v2-account-badge');
    if (supportRow && supportBadge && !supportBadge.hidden) {
      if (!v2Badge) {
        v2Badge = doc.createElement('span');
        v2Badge.className = 'profile-v2-account-badge';
        supportRow.querySelector(':scope > b')?.insertAdjacentElement('beforebegin', v2Badge);
      }
      v2Badge.hidden = false;
      v2Badge.textContent = textOf(supportBadge, '1');
    } else if (v2Badge) {
      v2Badge.hidden = true;
    }
  }

  function maybeOpenProfile(doc) {
    if (autoOpened || cfg.autoOpenProfile === false) return;
    const tab = doc.querySelector('[data-tab="profile"]');
    const profile = doc.querySelector('[data-screen="profile"]');
    if (!tab || !profile) return;
    autoOpened = true;
    window.setTimeout(() => {
      try {
        if (profile.hidden || tab.getAttribute('aria-selected') !== 'true') tab.click();
      } catch {}
    }, 250);
  }

  function install(doc) {
    const runner = doc.getElementById('zefirok-maltipoo-runner');
    const profile = runner?.querySelector('[data-screen="profile"]');
    const shell = profile?.querySelector('.profile-shell');
    const hero = shell?.querySelector(':scope > .profile-hero');
    if (!runner || !profile || !shell || !hero) return false;
    ensureStyle(doc);
    runner.classList.add('profile-v2-candidate');
    profile.dataset.profileV2Candidate = VERSION;

    const progress = shell.querySelector('.profile-section--progress');
    const progressTitle = progress?.querySelector('#profile-progress-title');
    if (progressTitle && !progressTitle.dataset.profileV2Original) {
      progressTitle.dataset.profileV2Original = progressTitle.textContent || '';
      progressTitle.textContent = 'Мой прогресс';
    }

    const quickbar = ensureQuickbar(doc, shell, hero);
    ensureStatsToggle(doc, progress);
    const cases = shell.querySelector('.profile-section--cases');
    ensureCosmeticsToggle(doc, cases);
    const accountHub = ensureAccountHub(doc, shell, cases);
    sync(doc, quickbar, accountHub);
    maybeOpenProfile(doc);

    if (!installed.has(doc)) {
      installed.add(doc);
      const Observer = doc.defaultView?.MutationObserver || MutationObserver;
      const observer = new Observer(() => sync(doc, quickbar, accountHub));
      observer.observe(profile, { subtree:true, childList:true, attributes:true, characterData:true, attributeFilter:['hidden','class'] });
      doc.addEventListener('click', () => setTimeout(() => sync(doc, quickbar, accountHub), 50), true);
    }
    setBadgeState('ready');
    return true;
  }

  function walk(win, depth = 0) {
    if (!win || depth > 3) return false;
    const doc = safeDocument(win);
    if (!doc) return false;
    let found = install(doc);
    for (const child of doc.querySelectorAll('iframe')) {
      try { if (child.contentWindow) found = walk(child.contentWindow, depth + 1) || found; } catch {}
    }
    return found;
  }

  async function start() {
    ensureBadge();
    try {
      cssText = await fetch(`${STYLE_URL}?v=${encodeURIComponent(VERSION)}`, { cache:'no-store', credentials:'same-origin' }).then(r => {
        if (!r.ok) throw new Error(`CSS ${r.status}`);
        return r.text();
      });
    } catch (error) {
      console.error('Profile 2.0 Candidate CSS load failed', error);
      setBadgeState('error', `CSS: ${error.message}`);
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      let found = false;
      try {
        const gameFrame = document.querySelector('body > iframe');
        if (gameFrame?.contentWindow) found = walk(gameFrame.contentWindow);
      } catch (error) {
        if (attempts % 20 === 0) console.warn('Profile 2.0 Candidate wait', error);
      }
      if (found && attempts > 6) window.clearInterval(timer);
      if (!found && attempts === 120) setBadgeState('error', 'Игра загрузилась, но профиль не найден.');
      if (attempts > 240) window.clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
