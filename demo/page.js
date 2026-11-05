// The controls stay interactive while Swarm builds the rest of the page.
(function () {
  'use strict';
  const SETTINGS_KEY = 'top-swarm-settings-v1';
  const THEME_KEY = 'top-swarm-theme';
  const PLAYED_KEY = 'top-swarm-played';
  const defaults = { agents: 24, speed: 1.5, tour: true, once: false };
  const presets = {
    calm: { agents: 12, speed: 0.5 },
    balanced: { agents: 24, speed: 1.5 },
    energetic: { agents: 40, speed: 4 },
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const speeds = [0.5, 1, 1.5, 2, 4];
  let settings = { ...defaults };
  let codeType = 'html';
  let hadRun = false;
  let finished = false;
  let lastStatus = '';
  let lastTotal = 0;
  let runSequence = 0;
  let toastTimer;

  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (saved && typeof saved === 'object') {
      settings = {
        agents: Number.isInteger(saved.agents) && saved.agents >= 4 && saved.agents <= 48 ? saved.agents : defaults.agents,
        speed: speeds.includes(saved.speed) ? saved.speed : defaults.speed,
        tour: typeof saved.tour === 'boolean' ? saved.tour : defaults.tour,
        once: typeof saved.once === 'boolean' ? saved.once : defaults.once,
      };
    }
  } catch (_) { /* Private browsing and corrupt preferences use defaults. */ }

  function persist() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* Storage is optional. */ }
  }

  function announce(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
  }

  function generatedCode() {
    if (codeType === 'js') {
      const onceGuard = settings.once ? `  try {\n    if (localStorage.getItem('swarm-played')) return;\n  } catch (_) {}\n` : '';
      return `function startSwarm() {\n${onceGuard}  const play = () => Swarm.run({\n    agents: ${settings.agents},\n    mobileAgents: ${Math.min(settings.agents, 10)},\n    speed: ${settings.speed},\n    tour: ${settings.tour},\n    once: ${settings.once},\n    locale: 'ug',\n    replayButton: true,\n  });\n  if (window.Swarm) play();\n  else {\n    const script = document.createElement('script');\n    script.src = 'swarm.js';\n    script.onload = play;\n    document.head.appendChild(script);\n  }\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded',\n    startSwarm, { once: true });\n} else startSwarm();`;
    }
    return `<script\n  src="swarm.js"\n  data-auto\n  data-agents="${settings.agents}"\n  data-mobile-agents="${Math.min(settings.agents, 10)}"\n  data-speed="${settings.speed}"\n  data-tour="${settings.tour}"\n  data-locale="ug"${settings.once ? '\n  data-once' : ''}\n  data-replay\n><\/script>`;
  }

  function updateCode() {
    $('generated-code').textContent = generatedCode();
    $('code-instruction').textContent = codeType === 'html' ? 'بېتىڭىزنىڭ head قىسمىغا قوشۇڭ' : 'بەت تەييار بولغاندا ھۆججەتنى يۈكلەيدۇ';
    $('copy-status').textContent = '';
  }

  function updateControls() {
    $('agent-count').value = settings.agents;
    $('agent-output').value = settings.agents;
    $('speed').value = settings.speed;
    $('tour').checked = settings.tour;
    $('once').checked = settings.once;
    document.querySelectorAll('[data-preset]').forEach((button) => {
      const preset = presets[button.dataset.preset];
      button.setAttribute('aria-pressed', String(preset.agents === settings.agents && preset.speed === settings.speed));
    });
    updateCode();
  }

  function updateSetting(key, value) {
    settings[key] = value;
    persist();
    updateControls();
    if (key === 'speed') window.Swarm?.setSpeed(value);
    if (key === 'tour') window.Swarm?.setTour(value);
  }

  $('agent-count').addEventListener('input', (event) => updateSetting('agents', Number(event.target.value)));
  $('speed').addEventListener('change', (event) => updateSetting('speed', Number(event.target.value)));
  $('tour').addEventListener('change', (event) => updateSetting('tour', event.target.checked));
  $('once').addEventListener('change', (event) => {
    updateSetting('once', event.target.checked);
    try {
      // Enabling once counts the current visit, including when the toggle is
      // changed after the animation has already completed.
      if (event.target.checked) localStorage.setItem(PLAYED_KEY, '1');
      else localStorage.removeItem(PLAYED_KEY);
    } catch (_) { /* Storage is optional. */ }
  });

  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      settings = { ...settings, ...presets[button.dataset.preset] };
      window.Swarm?.setSpeed(settings.speed);
      persist();
      updateControls();
    });
  });

  $('reset-settings').addEventListener('click', () => {
    settings = { ...defaults };
    try { localStorage.removeItem(PLAYED_KEY); } catch (_) { /* Storage is optional. */ }
    persist();
    updateControls();
    window.Swarm?.setSpeed(settings.speed);
    window.Swarm?.setTour(settings.tour);
    announce('تەڭشەكلەر ئەسلىگە قايتۇرۇلدى.');
  });

  function setStatus(status, hint) {
    if (lastStatus !== status) {
      $('run-status').textContent = status;
      lastStatus = status;
    }
    if ($('run-hint').textContent !== hint) $('run-hint').textContent = hint;
  }

  function refreshMonitor() {
    const state = window.Swarm?.state();
    $('pause-animation').disabled = !state || state.ending;
    $('skip-animation').disabled = !state;
    if (!state) {
      if (hadRun && !finished) {
        finished = true;
        setStatus('قۇرۇش تاماملاندى', 'بېتىڭىز تەييار. خالىغان ۋاقىتتا قايتا سىناڭ.');
        $('progress-fill').style.width = '100%';
        $('build-progress').setAttribute('aria-valuenow', '100');
        $('progress-percent').textContent = '100%';
        $('layer-count').textContent = `${lastTotal} / ${lastTotal} قەۋەت`;
      }
      return;
    }
    hadRun = true;
    finished = false;
    lastTotal = state.total;
    const percent = Math.round(state.total ? state.done / state.total * 100 : 0);
    $('progress-fill').style.width = percent + '%';
    $('build-progress').setAttribute('aria-valuenow', String(percent));
    $('progress-percent').textContent = percent + '%';
    $('layer-count').textContent = `${state.done} / ${state.total} قەۋەت`;
    $('pause-animation').innerHTML = state.paused ? 'داۋاملاشتۇرۇش <span aria-hidden="true">▷</span>' : 'ۋاقىتلىق توختىتىش <span aria-hidden="true">Ⅱ</span>';
    setStatus(state.paused ? 'ۋاقىتلىق توختىتىلدى' : state.ending ? 'ئاخىرقى قەدەملەر…' : 'بېتىڭىز قۇرۇلۇۋاتىدۇ', state.paused ? 'تەييار بولغاندا داۋاملاشتۇرۇڭ.' : `${state.agents} كۆرسەتكۈچ بىرلىكتە ئىشلەۋاتىدۇ.`);
    // Keep the settings and exported code in sync with the floating toolbar.
    if ((speeds.includes(state.speed) && settings.speed !== state.speed) || settings.tour !== state.tour) {
      if (speeds.includes(state.speed)) settings.speed = state.speed;
      settings.tour = state.tour;
      persist();
      updateControls();
    }
  }

  function runAnimation(automatic = false) {
    runSequence++;
    if (!window.Swarm) {
      setStatus('ھۆججەت يۈكلەنمىدى', 'بەتنى يېڭىلاپ قايتا سىناڭ.');
      return;
    }
    if (reducedMotion.matches) {
      window.Swarm.skip();
      setStatus('مەزمۇن بىۋاسىتە كۆرسىتىلدى', 'سىستېمىڭىزنىڭ ھەرىكەتنى ئازايتىش تەڭشىكىگە ئەمەل قىلىندى.');
      if (!automatic) announce('ھەرىكەتنى ئازايتىش تەڭشىكى ئېچىلغان.');
      return;
    }
    window.Swarm.skip();
    window.scrollTo({ top: 0, behavior: 'instant' });
    hadRun = true;
    finished = false;
    window.Swarm.run({
      ...settings,
      mobileAgents: Math.min(settings.agents, 10),
      locale: 'ug',
      returnToTop: true,
      replayButton: true,
      targetSeconds: 15,
      storageKey: PLAYED_KEY,
    });
    refreshMonitor();
  }

  $('settings-form').addEventListener('submit', (event) => { event.preventDefault(); runAnimation(); });
  $('hero-replay').addEventListener('click', () => runAnimation());
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.sw-replay')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runAnimation();
  }, true);
  $('pause-animation').addEventListener('click', () => {
    if (window.Swarm?.state()?.paused) window.Swarm.resume();
    else window.Swarm?.pause();
    refreshMonitor();
  });
  $('skip-animation').addEventListener('click', () => { window.Swarm?.skip(); refreshMonitor(); });

  const codeTabs = [...document.querySelectorAll('[data-code]')];
  function selectCodeTab(button) {
    codeType = button.dataset.code;
    codeTabs.forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    });
    $('code-preview').setAttribute('aria-labelledby', button.id);
    updateCode();
  }
  codeTabs.forEach((button, index) => {
    button.addEventListener('click', () => selectCodeTab(button));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? codeTabs[0] : event.key === 'End' ? codeTabs.at(-1) : codeTabs[(index + 1) % codeTabs.length];
      selectCodeTab(next);
      next.focus();
    });
  });

  $('copy-code').addEventListener('click', async () => {
    const value = generatedCode();
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(value); copied = true; } catch (_) { /* Try the local fallback. */ }
    }
    if (!copied) {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand('copy');
      input.remove();
      $('copy-code').focus({ preventScroll: true });
    }
    $('copy-status').textContent = copied ? 'كود كۆچۈرۈلدى. بېتىڭىزگە چاپلىسىڭىز بولىدۇ.' : 'ئاپتوماتىك كۆچۈرگىلى بولمىدى. كودنى تاللاپ كۆچۈرۈڭ.';
    announce(copied ? 'كود كۆچۈرۈلدى ✓' : 'كودنى قولدا تاللاپ كۆچۈرۈڭ.');
  });

  $('download-code').addEventListener('click', () => {
    const blob = new Blob([generatedCode() + '\n'], { type: codeType === 'html' ? 'text/html;charset=utf-8' : 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = codeType === 'html' ? 'swarm-embed.html' : 'swarm-config.js';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('كود ھۆججىتى چۈشۈرۈلدى.');
  });

  let theme = 'dark';
  try { if (localStorage.getItem(THEME_KEY) === 'light') theme = 'light'; } catch (_) { /* Storage is optional. */ }
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101110' : '#f5f3eb';
    const label = theme === 'dark' ? 'يورۇق كۆرۈنۈشكە ئالماشتۇرۇش' : 'قاراڭغۇ كۆرۈنۈشكە ئالماشتۇرۇش';
    $('theme-toggle').setAttribute('aria-label', label);
    $('theme-toggle').title = label;
    $('theme-toggle').setAttribute('aria-pressed', String(theme === 'light'));
  }
  $('theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* Storage is optional. */ }
  });
  applyTheme();

  function closeMenu() {
    $('navigation').classList.remove('is-open');
    $('menu-toggle').setAttribute('aria-expanded', 'false');
    $('menu-toggle').setAttribute('aria-label', 'تىزىملىكنى ئېچىش');
  }
  $('menu-toggle').addEventListener('click', () => {
    const open = $('navigation').classList.toggle('is-open');
    $('menu-toggle').setAttribute('aria-expanded', String(open));
    $('menu-toggle').setAttribute('aria-label', open ? 'تىزىملىكنى تاقاش' : 'تىزىملىكنى ئېچىش');
  });
  $('navigation').addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', (event) => { if (!event.target.closest('.nav')) closeMenu(); });

  function updateMotionPreference() {
    $('reduced-note').hidden = !reducedMotion.matches;
    if (reducedMotion.matches) {
      window.Swarm?.skip();
      setStatus('مەزمۇن بىۋاسىتە كۆرسىتىلدى', 'سىستېمىڭىزنىڭ ھەرىكەتنى ئازايتىش تەڭشىكىگە ئەمەل قىلىندى.');
      finished = true;
    }
  }
  reducedMotion.addEventListener('change', updateMotionPreference);
  updateControls();
  updateMotionPreference();
  setInterval(() => { if (!document.hidden) refreshMonitor(); }, 150);

  async function start() {
    let played = false;
    try { played = settings.once && localStorage.getItem(PLAYED_KEY) === '1'; } catch (_) { /* Storage is optional. */ }
    if (played || reducedMotion.matches) return;
    const initialRunSequence = runSequence;
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (runSequence === initialRunSequence) runAnimation(true);
  }
  start();
})();
