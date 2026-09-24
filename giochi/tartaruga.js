/* Salva la tartaruga — indovina la parola prima che il sacchetto raggiunga la tartaruga. */
'use strict';
(() => {
  const G = window.Giochi, $ = G.$, esc = G.escapeHTML;
  const MAX_ERRORS = 6, MAX_HINTS = 2;
  const BEST_KEY = 'batnetmar-tartaruga-record';
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const plain = ch => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const isLetter = ch => /[A-Z]/.test(plain(ch));
  // Parole del Taboo abbastanza corte da stare su una riga del telefono.
  const WORDS = window.TABOO_CARDS.filter(card => card.w.replace(/[^A-ZÀ-Ý]/gi, '').length <= 16);

  let deck = [], state = null, streak = 0, best = Number(G.store.get(BEST_KEY, 0)) || 0;

  $('keyboard').innerHTML = ALPHABET.map(letter => `<button class="key" data-letter="${letter}" aria-label="Lettera ${letter}">${letter}</button>`).join('');

  function newWord() {
    if (!deck.length) deck = G.shuffle(WORDS);
    const card = deck.pop();
    state = { card, guessed: new Set(), errors: 0, hints: [], hintPool: G.shuffle(card.t), over: false };
    $('track').classList.remove('saved', 'caught');
    $('result').hidden = true; $('guessArea').hidden = false;
    for (const key of $('keyboard').children) { key.disabled = false; key.className = 'key'; }
    render();
  }

  const solved = () => [...state.card.w].every(ch => !isLetter(ch) || state.guessed.has(plain(ch)));

  function render(reveal = false) {
    const words = state.card.w.split(' ');
    $('word').innerHTML = words.map(word => `<span class="word-group">${[...word].map(ch => {
      if (!isLetter(ch)) return `<span class="slot symbol">${esc(ch)}</span>`;
      const known = state.guessed.has(plain(ch));
      if (known) return `<span class="slot revealed">${ch}</span>`;
      return reveal ? `<span class="slot missed">${ch}</span>` : '<span class="slot"></span>';
    }).join('')}</span>`).join('');
    const letters = [...state.card.w].filter(isLetter).length;
    $('word').setAttribute('aria-label', `Parola da indovinare: ${words.length > 1 ? `${words.length} parole, ` : ''}${letters} lettere. ${[...state.card.w].map(ch => !isLetter(ch) ? (ch === ' ' ? ', ' : ch) : state.guessed.has(plain(ch)) || reveal ? ch : 'vuoto').join(' ')}`);
    $('wordInfo').textContent = `${words.length > 1 ? `${words.length} parole · ` : ''}${letters} lettere`;
    $('hints').innerHTML = state.hints.length ? `<span class="muted" style="font-size:13px">Parole collegate:</span>${state.hints.map(h => `<span class="chip">${esc(h)}</span>`).join('')}` : '';
    $('lives').innerHTML = Array.from({ length: MAX_ERRORS }, (_, i) => `<i class="${i < MAX_ERRORS - state.errors ? '' : 'lost'}"></i>`).join('');
    $('livesText').textContent = `Vite rimaste: ${MAX_ERRORS - state.errors} su ${MAX_ERRORS}.`;
    $('trash').style.left = `${6 + (state.errors / MAX_ERRORS) * 62}%`;
    $('hintButton').disabled = state.over || state.hints.length >= MAX_HINTS || state.errors >= MAX_ERRORS - 1;
    $('streak').textContent = streak; $('best').textContent = best;
  }

  function guess(letter) {
    if (!state || state.over || state.guessed.has(letter)) return;
    state.guessed.add(letter);
    const key = $('keyboard').querySelector(`[data-letter="${letter}"]`);
    const hit = [...state.card.w].some(ch => isLetter(ch) && plain(ch) === letter);
    key.disabled = true; key.classList.add(hit ? 'hit' : 'miss');
    if (hit) G.tone(700, .08);
    else { state.errors++; G.sounds.bad(); G.vibrate(90); }
    render();
    if (solved()) win(); else if (state.errors >= MAX_ERRORS) lose();
  }

  function hint() {
    if (!state || state.over || state.hints.length >= MAX_HINTS || state.errors >= MAX_ERRORS - 1) return;
    state.hints.push(state.hintPool[state.hints.length]);
    state.errors++; G.tone(360, .12, 'triangle');
    render();
  }

  function showResult(kind, title, text) {
    state.over = true;
    $('guessArea').hidden = true;
    $('result').className = `hang-result ${kind}`; $('result').hidden = false;
    $('result').innerHTML = `<h2>${title}</h2><p>${text}</p><div class="hang-actions"><button class="btn btn-primary" id="nextWordButton">Nuova parola <svg><use href="#i-arrow"/></svg></button><a class="btn btn-ghost" href="./index.html">← Torna al menu</a></div>`;
    $('nextWordButton').addEventListener('click', newWord);
    $('nextWordButton').focus({ preventScroll: true });
  }

  function win() {
    streak++;
    if (streak > best) { best = streak; G.store.set(BEST_KEY, best); }
    render();
    $('track').classList.add('saved'); G.sounds.win();
    const word = state.card.w;
    showResult('win', 'Salvata! 🐢', `La tartaruga nuota libera: la parola era <strong>${esc(word)}</strong>. ${streak > 1 ? `Sono ${streak} di fila!` : ''}`);
  }

  function lose() {
    const lost = streak; streak = 0;
    render(true);
    $('track').classList.add('caught'); G.sounds.end();
    showResult('lose', 'Il sacchetto l’ha raggiunta!', `La parola era <strong>${esc(state.card.w)}</strong>. Per fortuna i soccorritori l’hanno liberata${lost > 1 ? `: la tua serie si ferma a ${lost}` : ''}. Riprova!`);
  }

  $('keyboard').addEventListener('click', event => {
    const key = event.target.closest('[data-letter]');
    if (key) guess(key.dataset.letter);
  });
  $('hintButton').addEventListener('click', hint);
  $('skipButton').addEventListener('click', () => {
    if (streak > 0 && !confirm(`Cambiando parola perdi la serie di ${streak}. Continuare?`)) return;
    streak = 0; newWord();
  });
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || $('rulesDialog').open) return;
    if (state?.over && event.key === 'Enter' && !event.target.closest('button')) { event.preventDefault(); newWord(); return; }
    const letter = plain(event.key);
    if (letter.length === 1 && ALPHABET.includes(letter)) { event.preventDefault(); guess(letter); }
  });

  newWord();
})();
