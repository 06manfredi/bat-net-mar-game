/* Chi vuol essere Custode del Mare? — quiz a scalata per 1–8 giocatori, a turno. */
'use strict';
(() => {
  const G = window.Giochi, $ = G.$, esc = G.escapeHTML;
  const BANK = window.QUIZ_DOMANDE;
  const LADDER = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 250000, 1000000];
  const SAFE = [3, 7]; // Indici dei traguardi sicuri: 1.000 e 20.000 punti.
  const LETTERS = ['A', 'B', 'C', 'D'];
  const SAVE_KEY = 'batnetmar-quiz';
  const STATUS = { playing: 'in gara', retired: 'ritirato', out: 'eliminato', done: 'piramide completata' };
  const tierOf = level => (level < 4 ? 'facile' : level < 8 ? 'media' : 'difficile');
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 1.000 come 20.000 (it-IT non separa le 4 cifre).
  const safePoints = level => SAFE.reduce((points, index) => (level > index ? LADDER[index] : points), 0);
  const editor = G.playerEditor($('quizPlayers'), { min: 1, max: 8, count: 2 });

  let game = null; // Salvato dopo ogni risposta.
  let q = null;    // Domanda in corso.
  let toastTimer = 0;

  const save = () => G.store.set(SAVE_KEY, game);
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
  }

  /* ---------- Piramide e classifica ---------- */
  function renderLadder(list, player, currentLevel = -1) {
    list.innerHTML = LADDER.map((value, i) => {
      const classes = [SAFE.includes(i) && 'safe', player && i < player.level && 'done', i === currentLevel && 'current'].filter(Boolean).join(' ');
      return `<li class="${classes}"${i === currentLevel ? ' aria-current="step"' : ''}><b>${i + 1}</b><span>${SAFE.includes(i) ? '<i aria-label="traguardo sicuro">★</i> ' : ''}${fmt(value)}</span></li>`;
    }).join('');
  }

  function renderRanking(list, highlightTop = false) {
    list.innerHTML = G.ranked(game.players, p => p.points).map(({ item: p, position }) =>
      `<li class="${highlightTop && position === 1 && p.points > 0 ? 'is-first' : ''}"><span class="rank-pos">${position}°</span><span class="rank-name">${esc(p.name)}<span class="status ${p.status}">${STATUS[p.status]}</span></span><span class="rank-points">${fmt(p.points)}<small>gradino ${p.level}/12</small></span></li>`
    ).join('');
  }

  /* ---------- Partita ---------- */
  function startGame(names) {
    game = {
      players: names.map(name => ({ name, level: 0, points: 0, status: 'playing', lifelines: { fifty: true, audience: true, swap: true } })),
      level: 0, pools: { facile: [], media: [], difficile: [] }, finished: false
    };
    save(); nextTurn();
  }

  function nextPlayerIndex() {
    while (game.level < LADDER.length) {
      const index = game.players.findIndex(p => p.status === 'playing' && p.level === game.level);
      if (index >= 0) return index;
      if (!game.players.some(p => p.status === 'playing')) return -1;
      game.level++;
    }
    return -1;
  }

  function draw(tier, avoid) {
    if (!game.pools[tier].length) game.pools[tier] = G.shuffle(BANK[tier].map((_, i) => i).filter(i => i !== avoid));
    return game.pools[tier].pop();
  }

  function loadQuestion() {
    q.id = draw(tierOf(q.level), q.id);
    q.order = G.shuffle([0, 1, 2, 3]); // Posizione → indice nella lista risposte (0 = giusta).
    q.removed = []; q.poll = null; q.selected = -1; q.locked = false;
  }

  function nextTurn() {
    const index = nextPlayerIndex();
    if (index < 0) { finishGame(); return; }
    q = { player: index, level: game.level, id: null };
    loadQuestion(); save();
    if (game.players.length > 1) showHandoff(); else showQuestion();
  }

  /* ---------- Passaggio di turno ---------- */
  function showHandoff() {
    const player = game.players[q.player];
    const available = Object.values(player.lifelines).filter(Boolean).length;
    $('handoffEyebrow').textContent = `DOMANDA ${q.level + 1} DI 12 · ${tierOf(q.level).toUpperCase()} · TOCCA A`;
    $('handoffName').textContent = player.name;
    $('handoffPrize').textContent = fmt(LADDER[q.level]);
    $('handoffPoints').textContent = fmt(player.points);
    $('handoffLifelines').textContent = `${available} / 3`;
    const safe = safePoints(player.level);
    $('handoffHint').textContent = safe
      ? `Anche sbagliando, ${player.name} esce con almeno ${fmt(safe)} punti garantiti.`
      : q.level < 3 ? 'Nessun punto garantito finché non si supera il traguardo sicuro dei 1.000 punti.' : 'Occhio: se sbagli adesso, esci con 0 punti. Rispondi alla domanda per raggiungere il traguardo sicuro dei 1.000 punti!';
    renderRanking($('handoffBoard'));
    G.showScreen('handoffScreen');
    $('readyButton').focus({ preventScroll: true });
  }

  /* ---------- Domanda ---------- */
  function showQuestion() {
    const player = game.players[q.player], question = BANK[tierOf(q.level)][q.id];
    $('qPlayer').textContent = player.name;
    $('qMeta').innerHTML = `Domanda ${q.level + 1} di 12 · in palio <strong>${fmt(LADDER[q.level])}</strong> punti`;
    $('qText').textContent = question.q;
    $('answers').innerHTML = q.order.map((answerIndex, position) =>
      `<button class="answer" data-position="${position}"><span class="letter">${LETTERS[position]}</span><span class="answer-text">${esc(question.a[answerIndex])}</span></button>`
    ).join('');
    $('confirmBar').hidden = true; $('reveal').hidden = true; $('lifelines').hidden = false;
    renderLifelines(); renderAnswers();
    renderLadder($('ladder'), player, q.level);
    G.showScreen('questionScreen');
  }

  function renderLifelines() {
    const { lifelines, level, points } = game.players[q.player];
    for (const [key, id] of [['fifty', 'fiftyButton'], ['audience', 'audienceButton'], ['swap', 'swapButton']]) {
      $(id).disabled = !lifelines[key] || q.locked;
      $(id).classList.toggle('used', !lifelines[key]);
    }
    $('retireButton').disabled = q.locked || level === 0;
    $('retireButton').textContent = level ? `Mi ritiro con ${fmt(points)} punti` : 'Mi ritiro';
  }

  function renderAnswers() {
    for (const button of $('answers').children) {
      const position = Number(button.dataset.position);
      button.classList.toggle('removed', q.removed.includes(position));
      button.classList.toggle('selected', position === q.selected);
      button.disabled = q.locked || q.removed.includes(position);
      button.querySelector('.poll')?.remove(); button.querySelector('.poll-value')?.remove();
      if (q.poll && q.poll[position] != null) {
        const bar = document.createElement('span'); bar.className = 'poll'; bar.style.width = `${q.poll[position]}%`;
        const value = document.createElement('span'); value.className = 'poll-value'; value.textContent = `${q.poll[position]}%`;
        button.append(value, bar);
      }
      button.setAttribute('aria-pressed', String(position === q.selected));
    }
  }

  function select(position) {
    if (!q || q.locked || q.removed.includes(position) || $('questionScreen').hidden) return;
    q.selected = position; renderAnswers();
    $('confirmBar').hidden = false;
    G.tone(520, .06);
  }

  function cancelSelection() {
    q.selected = -1; renderAnswers(); $('confirmBar').hidden = true;
  }

  function confirmAnswer() {
    if (!q || q.locked || q.selected < 0) return;
    q.locked = true; $('confirmBar').hidden = true;
    renderAnswers(); renderLifelines();
    const chosen = $('answers').querySelector(`[data-position="${q.selected}"]`);
    chosen.classList.add('pending'); G.sounds.suspense();
    setTimeout(reveal, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1600);
  }

  function markCorrectAnswer(dimOthers = true) {
    const correct = q.order.indexOf(0);
    for (const button of $('answers').children) {
      const position = Number(button.dataset.position);
      button.classList.remove('pending');
      if (position === correct) button.classList.add('correct');
      else if (position === q.selected) button.classList.add('wrong');
      else if (dimOthers) button.classList.add('dim');
    }
    return correct;
  }

  function reveal() {
    const player = game.players[q.player], question = BANK[tierOf(q.level)][q.id];
    const correct = markCorrectAnswer();
    const right = q.selected === correct;
    let title, text, kind;
    if (right) {
      player.level++; player.points = LADDER[player.level - 1];
      kind = 'good'; G.sounds.good();
      if (player.level === LADDER.length) {
        player.status = 'done';
        title = `🏆 ${player.name} ha completato la piramide!`;
        text = `${fmt(player.points)} punti: sei ufficialmente Custode del Mare.`;
        G.sounds.win();
      } else {
        title = 'Risposta esatta!';
        text = SAFE.includes(player.level - 1)
          ? `${player.name} sale a ${fmt(player.points)} punti e raggiunge un traguardo sicuro ★.`
          : `${player.name} sale a ${fmt(player.points)} punti.`;
      }
    } else {
      player.status = 'out'; player.points = safePoints(player.level);
      kind = 'bad'; G.sounds.bad(); G.vibrate(150);
      title = 'Risposta sbagliata';
      text = `La risposta giusta era ${LETTERS[correct]}: ${question.a[0]}. ${player.name} esce con ${fmt(player.points)} punti.`;
    }
    save();
    showReveal(kind, title, text, question.e);
  }

  function showReveal(kind, title, text, fact) {
    $('lifelines').hidden = true;
    const el = $('reveal');
    el.className = `reveal ${kind}`; el.hidden = false;
    const last = !game.players.some((p, i) => p.status === 'playing' && (i !== q.player || p.level < LADDER.length));
    el.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><p class="fact"><span aria-hidden="true">💡</span><span><strong>Lo sapevi?</strong> ${esc(fact)}</span></p><button class="btn btn-primary" id="nextButton">${last ? 'Vedi la classifica' : 'Avanti'} <svg><use href="#i-arrow"/></svg></button>`;
    renderLadder($('ladder'), game.players[q.player], game.players[q.player].status === 'playing' ? game.players[q.player].level : -1);
    $('nextButton').addEventListener('click', nextTurn);
    $('nextButton').focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function retire() {
    const player = game.players[q.player];
    if (!q || q.locked || player.level === 0) return;
    if (!confirm(`${player.name}, vuoi ritirarti con ${fmt(player.points)} punti?`)) return;
    q.locked = true; q.selected = -1;
    player.status = 'retired'; save();
    renderAnswers(); renderLifelines(); markCorrectAnswer(false);
    $('confirmBar').hidden = true;
    const question = BANK[tierOf(q.level)][q.id];
    showReveal('info', `${player.name} si ritira con ${fmt(player.points)} punti`, `La risposta giusta era ${LETTERS[q.order.indexOf(0)]}: ${question.a[0]}.`, question.e);
  }

  /* ---------- Aiuti ---------- */
  function useLifeline(key) {
    const player = game.players[q.player];
    if (!q || q.locked || !player.lifelines[key]) return;
    player.lifelines[key] = false;
    if (key === 'fifty') {
      const wrong = G.shuffle([0, 1, 2, 3].filter(p => q.order[p] !== 0 && !q.removed.includes(p)));
      q.removed.push(...wrong.slice(0, 2));
      if (q.removed.includes(q.selected)) cancelSelection();
      if (q.poll) q.poll = poll();
      toast('50:50 — restano due risposte.');
    } else if (key === 'audience') {
      q.poll = poll();
      toast('Il pubblico ha votato. Ma ha sempre ragione?');
    } else {
      loadQuestion(); save();
      toast('Ecco una nuova domanda dello stesso livello.');
      showQuestion(); return;
    }
    save(); renderLifelines(); renderAnswers(); G.tone(760, .12);
  }

  // Sondaggio simulato: più la domanda è difficile, meno il pubblico è sicuro.
  function poll() {
    const options = [0, 1, 2, 3].filter(p => !q.removed.includes(p));
    const correct = q.order.indexOf(0);
    const base = { facile: 66, media: 50, difficile: 36 }[tierOf(q.level)] + (options.length === 2 ? 18 : 0);
    const share = Math.max(20, Math.min(92, base + Math.round((Math.random() - .45) * 30)));
    const others = options.filter(p => p !== correct);
    const weights = others.map(() => Math.random() + .25), total = weights.reduce((a, b) => a + b, 0);
    const result = { [correct]: share };
    others.forEach((p, i) => { result[p] = Math.round((100 - share) * weights[i] / total); });
    result[correct] += 100 - Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }

  /* ---------- Fine ---------- */
  function finishGame() {
    q = null;
    game.players.forEach(p => { if (p.status === 'playing') p.status = 'done'; });
    game.finished = true; save();
    const ranking = G.ranked(game.players, p => p.points);
    const winners = ranking.filter(r => r.position === 1).map(r => r.item);
    if (game.players.length === 1) {
      $('endTitle').textContent = `${fmt(winners[0].points)} punti!`;
      $('endText').textContent = winners[0].level === LADDER.length ? 'Piramide completata: sei Custode del Mare!' : `Sei arrivato al gradino ${winners[0].level} di 12. Riprova per salire più in alto!`;
    } else if (winners[0].points === 0) {
      $('endTitle').textContent = 'Nessun punto questa volta!';
      $('endText').textContent = 'Il mare ha i suoi segreti: la prossima partita andrà meglio.';
    } else if (winners.length > 1) {
      $('endTitle').textContent = 'Pari merito!';
      $('endText').textContent = `${winners.map(w => w.name).join(' e ')} chiudono con ${fmt(winners[0].points)} punti.`;
    } else {
      $('endTitle').textContent = `Vince ${winners[0].name}!`;
      $('endText').textContent = `Con ${fmt(winners[0].points)} punti è il nuovo Custode del Mare.`;
    }
    renderRanking($('endBoard'), true);
    G.showScreen('endScreen');
    G.sounds.win(); confetti();
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = $('confetti'); layer.replaceChildren();
    const symbols = ['⭐', '🐚', '💎', '🌊', '🐢', '🏆'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.textContent = symbols[i % symbols.length];
      s.style.left = `${Math.random() * 100}%`; s.style.animationDelay = `${Math.random() * .9}s`;
      layer.append(s);
    }
    setTimeout(() => layer.replaceChildren(), 4000);
  }

  function stopEarly() {
    if (confirm('Terminare il quiz adesso? Ognuno tiene i punti già conquistati.')) {
      game.players.forEach(p => { if (p.status === 'playing') p.status = 'retired'; });
      finishGame();
    }
  }

  /* ---------- Preparazione ---------- */
  function showSetup() {
    const saved = G.store.get(SAVE_KEY);
    const resumable = saved && !saved.finished && Array.isArray(saved.players) && saved.players.some(p => p.status === 'playing');
    $('resumeBox').hidden = !resumable;
    if (resumable) {
      const leader = G.ranked(saved.players, p => p.points)[0].item;
      $('resumeText').innerHTML = `C’è un quiz in corso con ${saved.players.length} ${saved.players.length === 1 ? 'giocatore' : 'giocatori'}, alla domanda ${saved.level + 1}. In testa: <strong>${esc(leader.name)}</strong> con ${fmt(leader.points)} punti.`;
    }
    renderLadder($('setupLadder'));
    G.showScreen('setupScreen');
  }

  $('startButton').addEventListener('click', () => startGame(editor.names()));
  $('resumeButton').addEventListener('click', () => { game = G.store.get(SAVE_KEY); nextTurn(); });
  $('discardButton').addEventListener('click', () => {
    const saved = G.store.get(SAVE_KEY);
    if (saved) G.store.set(SAVE_KEY, { ...saved, finished: true });
    $('resumeBox').hidden = true;
  });
  $('readyButton').addEventListener('click', showQuestion);
  $('stopButton').addEventListener('click', stopEarly);
  $('answers').addEventListener('click', event => {
    const button = event.target.closest('.answer');
    if (button) select(Number(button.dataset.position));
  });
  $('changeButton').addEventListener('click', cancelSelection);
  $('finalButton').addEventListener('click', confirmAnswer);
  $('fiftyButton').addEventListener('click', () => useLifeline('fifty'));
  $('audienceButton').addEventListener('click', () => useLifeline('audience'));
  $('swapButton').addEventListener('click', () => useLifeline('swap'));
  $('retireButton').addEventListener('click', retire);
  $('againButton').addEventListener('click', () => startGame(game.players.map(p => p.name)));
  $('changePlayersButton').addEventListener('click', () => { editor.set(game.players.map(p => p.name)); showSetup(); });

  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || $('rulesDialog').open || event.target.closest('input')) return;
    if ($('questionScreen').hidden || !q || q.locked) return;
    const position = LETTERS.indexOf(event.key.toUpperCase());
    if (position >= 0) { event.preventDefault(); select(position); }
  });

  const saved = G.store.get(SAVE_KEY);
  if (saved?.players?.length) editor.set(saved.players.map(p => p.name));
  showSetup();
})();
