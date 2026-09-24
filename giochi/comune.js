/* Bat net mar — funzioni condivise dai mini giochi. Vanilla JavaScript, nessuna dipendenza. */
'use strict';
window.Giochi = (() => {
  const $ = id => document.getElementById(id);

  // localStorage can be missing or blocked (private mode, previews): games must work without it.
  const store = {
    get(key, fallback = null) {
      try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value); } catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Salvataggio facoltativo. */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* Salvataggio facoltativo. */ } }
  };

  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
  const readChoice = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
  const setChoice = (name, value) => {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  };

  // Suono facoltativo, condiviso tra i giochi: la scelta viene ricordata.
  const SOUND_KEY = 'batnetmar-suono';
  let soundEnabled = store.get(SOUND_KEY, false) === true, audio;
  function tone(frequency, duration = .12, type = 'sine', delay = 0, volume = .05) {
    if (!soundEnabled) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') void audio.resume();
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.start(start); oscillator.stop(start + duration + .02);
    } catch { /* L'audio non è mai necessario per giocare. */ }
  }
  const sounds = {
    good: () => { tone(660, .1); tone(880, .16, 'sine', .08); },
    bad: () => tone(150, .35, 'sawtooth', 0, .035),
    skip: () => tone(420, .08, 'triangle'),
    tick: () => tone(1000, .05, 'square', 0, .02),
    start: () => { tone(523, .1); tone(784, .16, 'sine', .1); },
    end: () => { tone(523, .15); tone(392, .15, 'sine', .15); tone(262, .35, 'sine', .3); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'sine', i * .12)),
    suspense: () => { tone(220, .5, 'triangle', 0, .03); tone(233, .5, 'triangle', .5, .03); }
  };
  function bindSoundButton(button) {
    if (!button) return;
    const sync = () => {
      button.classList.toggle('is-muted', !soundEnabled);
      button.setAttribute('aria-pressed', String(soundEnabled));
      button.setAttribute('aria-label', soundEnabled ? 'Disattiva i suoni' : 'Attiva i suoni');
    };
    sync();
    button.addEventListener('click', () => { soundEnabled = !soundEnabled; store.set(SOUND_KEY, soundEnabled); sync(); tone(600); });
  }

  // Keep the screen on during a timed turn, where the browser supports it.
  let wakeLock = null, wantAwake = false;
  async function keepAwake(on) {
    wantAwake = on;
    try {
      if (on && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wantAwake) keepAwake(true); });

  function vibrate(ms) { try { navigator.vibrate?.(ms); } catch { /* Facoltativo. */ } }

  // Mostra una sola schermata del pannello e porta il focus sul suo titolo.
  function showScreen(id) {
    const target = $(id);
    for (const screen of target.parentElement.querySelectorAll(':scope > .screen')) screen.hidden = screen !== target;
    const heading = target.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    const panel = target.closest('.panel');
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  }

  // Elenco di giocatori modificabile: righe con nome, rimozione e aggiunta.
  function playerEditor(container, { min = 1, max = 8, count = min, fallback = i => `Giocatore ${i + 1}`, label = 'Nome del giocatore' } = {}) {
    const rows = document.createElement('div'); rows.className = 'player-rows';
    const add = document.createElement('button'); add.type = 'button'; add.className = 'add-player'; add.textContent = '+ Aggiungi giocatore';
    container.append(rows, add);
    function refresh() {
      [...rows.children].forEach((row, i) => {
        const input = row.querySelector('input');
        input.placeholder = fallback(i);
        input.setAttribute('aria-label', `${label} ${i + 1}`);
        row.querySelector('button').disabled = rows.children.length <= min;
      });
      add.hidden = rows.children.length >= max;
    }
    function addRow(value = '') {
      const row = document.createElement('div'); row.className = 'player-row';
      const input = document.createElement('input');
      Object.assign(input, { type: 'text', className: 'text-input', maxLength: 18, value, autocomplete: 'off', spellcheck: false });
      input.setAttribute('enterkeyhint', 'next');
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-player'; remove.textContent = '×';
      remove.setAttribute('aria-label', 'Rimuovi giocatore');
      remove.addEventListener('click', () => {
        row.remove(); refresh();
        (rows.lastElementChild?.querySelector('input') || add).focus();
      });
      row.append(input, remove); rows.append(row); refresh();
      return input;
    }
    add.addEventListener('click', () => addRow().focus());
    for (let i = 0; i < count; i++) addRow();
    return {
      names() {
        const seen = new Map();
        return [...rows.querySelectorAll('input')].map((input, i) => {
          const name = input.value.trim().replace(/\s+/g, ' ') || fallback(i);
          const n = (seen.get(name.toLowerCase()) || 0) + 1;
          seen.set(name.toLowerCase(), n);
          return n > 1 ? `${name} (${n})` : name;
        });
      },
      set(names) {
        rows.replaceChildren();
        const list = names.length >= min ? names : [...names, ...Array(min - names.length).fill('')];
        list.slice(0, max).forEach(name => addRow(name));
        refresh();
      },
      refresh
    };
  }

  // Classifica con pari merito: stessa posizione a parità di punteggio.
  function ranked(list, score) {
    const sorted = [...list].sort((a, b) => score(b) - score(a));
    let position = 0;
    return sorted.map((item, i) => {
      if (i === 0 || score(item) !== score(sorted[i - 1])) position = i + 1;
      return { item, position };
    });
  }

  // Finestre di regole: [data-open="id"] apre, [data-close] chiude, clic fuori chiude.
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) { const dialog = $(opener.dataset.open); if (dialog && !dialog.open) dialog.showModal(); }
    const closer = event.target.closest('[data-close]');
    if (closer) closer.closest('dialog')?.close();
  });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  }
  bindSoundButton($('soundButton'));

  return { $, store, shuffle, escapeHTML, signed, readChoice, setChoice, tone, sounds, keepAwake, vibrate, showScreen, playerEditor, ranked };
})();
