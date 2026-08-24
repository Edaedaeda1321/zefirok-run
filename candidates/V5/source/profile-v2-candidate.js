(() => {
  'use strict';
  const cfg = window.__ZEFIROK_PROFILE_V2_CANDIDATE__ || {};
  const VERSION = String(cfg.version || 'V5.0.0');
  const MODE = String(cfg.mode || 'LOCAL').toUpperCase();
  const STYLE_URL = '/candidates/V5/source/profile-v2-candidate.css';
  const ROOT_URL = `/index.html?test_project=1&candidate_profile_v2=${encodeURIComponent(VERSION)}&candidate_surface=${encodeURIComponent(MODE.toLowerCase())}`;
  const frame = document.getElementById('candidate-root');
  const status = document.getElementById('candidate-status');
  const installed = new WeakSet();
  let cssText = '';

  function setStatus(text, bad = false) {
    if (!status) return;
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle('is-error', Boolean(bad));
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

  function sync(doc, runner, quickbar, accountHub) {
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
    sync(doc, runner, quickbar, accountHub);

    if (!installed.has(doc)) {
      installed.add(doc);
      const Observer = doc.defaultView?.MutationObserver || MutationObserver;
      const observer = new Observer(() => sync(doc, runner, quickbar, accountHub));
      observer.observe(profile, { subtree:true, childList:true, attributes:true, characterData:true, attributeFilter:['hidden','class'] });
      doc.addEventListener('click', () => setTimeout(() => sync(doc, runner, quickbar, accountHub), 50), true);
    }
    setStatus('');
    return true;
  }

  function walk(win, depth = 0) {
    if (!win || depth > 4) return false;
    const doc = safeDocument(win);
    if (!doc) return false;
    let found = install(doc);
    for (const child of doc.querySelectorAll('iframe')) {
      try { if (child.contentWindow) found = walk(child.contentWindow, depth + 1) || found; } catch {}
    }
    return found;
  }

  async function start() {
    try {
      cssText = await fetch(`${STYLE_URL}?v=${encodeURIComponent(VERSION)}`, { cache:'no-store' }).then(r => {
        if (!r.ok) throw new Error(`CSS ${r.status}`);
        return r.text();
      });
    } catch (error) {
      setStatus(`Не удалось загрузить стили Profile 2.0: ${error.message}`, true);
      return;
    }
    if (!frame) {
      setStatus('Candidate iframe не найден.', true);
      return;
    }
    frame.src = ROOT_URL;
    setStatus('Загружаю текущую игру в безопасной песочнице…');
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      let found = false;
      try { found = walk(frame.contentWindow); } catch {}
      if (!found && attempts === 20) setStatus('Игра загружена, жду экран профиля…');
      if (attempts > 900) clearInterval(timer);
    }, 350);
  }

  start();
})();
