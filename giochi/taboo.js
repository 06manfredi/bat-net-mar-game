/* Taboo del Mare — due squadre, turni a tempo, classifica dei giocatori. */
'use strict';
(() => {
  const G = window.Giochi, $ = G.$, esc = G.escapeHTML;
  const CARDS = window.TABOO_CARDS;
  const SAVE_KEY = 'batnetmar-taboo';
  const OUTCOMES = {
    ok: { label: 'Indovinata', icon: '✓', points: 1 },
    taboo: { label: 'Taboo', icon: '✗', points: -1 },
    pass: { label: 'Passata', icon: '↷', points: 0 }
  };
  const NEXT_OUTCOME = { ok: 'taboo', taboo: 'pass', pass: 'ok' };
  const DEFAULT_TEAMS = ['Onde', 'Correnti'];
  const TEAM_CLASS = ['team-a', 'team-b'];

  const teamInputs = [$('teamAName'), $('teamBName')];
  const teamName = i => teamInputs[i].value.trim().replace(/\s+/g, ' ') || DEFAULT_TEAMS[i];
  const editors = [$('teamAPlayers'), $('teamBPlayers')].map((container, i) =>
    G.playerEditor(container, { min: 2, max: 8, count: 2, fallback: n => `${teamName(i)} ${n + 1}` }));
  teamInputs.forEach((input, i) => input.addEventListener('input', () => { editors[i].refresh(); updateSetupSummary(); }));

  let game = null; // Stato della partita, salvato a ogni turno confermato.
  let turn = null; // Turno in corso, mai salvato: se la pagina si chiude, il turno si rigioca.
  let frame = 0, toastTimer = 0;

  const save = () => G.store.set(SAVE_KEY, game);
  const newDeck = () => G.shuffle(CARDS.map((_, i) => i));
  const points = n => `${G.signed(n)} ${Math.abs(n) === 1 ? 'punto' : 'punti'}`;

  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2600);
  }

  /* ---------- Preparazione ---------- */
  function updateSetupSummary() {
    const sizes = editors.map(editor => editor.names().length);
    const turns = 2 * Number(G.readChoice('rounds')) * Math.max(...sizes);
    const minutes = Math.round(turns * (Number(G.readChoice('duration')) + 25) / 60);
    $('setupSummary').textContent = `${turns} turni in tutto · circa ${minutes} minuti`;
  }
  document.querySelectorAll('.options input').forEach(input => input.addEventListener('change', updateSetupSummary));
  document.querySelectorAll('#teamAPlayers, #teamBPlayers').forEach(el => el.addEventListener('click', () => setTimeout(updateSetupSummary)));

  function prefill(saved) {
    saved.teams.forEach((team, i) => {
      teamInputs[i].value = team.name === DEFAULT_TEAMS[i] ? '' : team.name;
      editors[i].set(team.players.map(p => p.name.startsWith(`${team.name} `) ? '' : p.name));
    });
    G.setChoice('duration', saved.seconds); G.setChoice('rounds', saved.rounds); G.setChoice('passes', saved.passes);
  }

  function showSetup() {
    const saved = G.store.get(SAVE_KEY);
    const resumable = saved && !saved.finished && Array.isArray(saved.teams) && saved.teams.length === 2;
    $('resumeBox').hidden = !resumable;
    if (resumable) {
      const [a, b] = saved.teams;
      $('resumeText').innerHTML = `C’è una partita in corso: <strong>${esc(a.name)} ${a.score} – ${b.score} ${esc(b.name)}</strong>, turno ${saved.turn + 1} di ${saved.totalTurns}.`;
    }
    updateSetupSummary();
    G.showScreen('setupScreen');
  }

  function createGame(teams, settings) {
    const perTeam = settings.rounds * Math.max(teams[0].players.length, teams[1].players.length);
    game = { ...settings, teams, totalTurns: perTeam * 2, turn: 0, deck: newDeck(), pos: 0, finished: false };
    save(); showReady();
  }

  function startFromSetup() {
    const names = [teamName(0), teamName(1)];
    if (names[0].toLowerCase() === names[1].toLowerCase()) names[1] += ' 2';
    const teams = names.map((name, i) => ({ name, score: 0, next: 0,
      players: editors[i].names().map(player => ({ name: player, points: 0, ok: 0, taboo: 0 })) }));
    createGame(teams, { seconds: Number(G.readChoice('duration')), rounds: Number(G.readChoice('rounds')), passes: Number(G.readChoice('passes')) });
  }

  function rematch() {
    const teams = game.teams.map(team => ({ name: team.name, score: 0, next: 0,
      players: team.players.map(p => ({ name: p.name, points: 0, ok: 0, taboo: 0 })) }));
    createGame(teams, { seconds: game.seconds, rounds: game.rounds, passes: game.passes });
  }

  /* ---------- Classifica ---------- */
  function current() {
    const t = game.turn % 2, team = game.teams[t];
    return { t, team, other: game.teams[1 - t], player: team.players[team.next % team.players.length] };
  }

  function renderBoard(container, highlight = -1, highlightLabel = 'di turno') {
    const players = game.teams.flatMap((team, t) => team.players.map(player => ({ ...player, t })));
    const rows = G.ranked(players, p => p.points).map(({ item: p, position }) => {
      return `<li class="${TEAM_CLASS[p.t]}${position === 1 && p.points > 0 ? ' is-first' : ''}"><span class="rank-pos">${position}°</span><span class="rank-name"><span class="dot"></span>${esc(p.name)}</span><span class="rank-points">${G.signed(p.points)}<small>${p.ok} ✓ · ${p.taboo} ✗</small></span></li>`;
    }).join('');
    container.innerHTML = `<div class="team-scores">${game.teams.map((team, t) => `<div class="team-score ${TEAM_CLASS[t]}${t === highlight ? ' is-active' : ''}"><span>${esc(team.name)}</span><strong>${team.score}</strong>${t === highlight ? `<em>${highlightLabel}</em>` : ''}</div>`).join('')}</div><div><span class="field-label">Classifica giocatori</span><ol class="rank-list">${rows}</ol></div>`;
  }

  /* ---------- Chi tocca ---------- */
  function showReady() {
    const { t, team, other, player } = current();
    $('readyTurn').textContent = `TURNO ${game.turn + 1} DI ${game.totalTurns} · TOCCA A`;
    $('readyName').textContent = player.name;
    $('readyTeam').textContent = `Squadra ${team.name}`;
    $('readyTeam').className = `team-chip ${TEAM_CLASS[t]}`;
    $('readyHint').innerHTML = `Dai il dispositivo a <strong>${esc(player.name)}</strong>: descrive le parole alla squadra <strong>${esc(team.name)}</strong>. La squadra <strong>${esc(other.name)}</strong> guarda la carta e controlla le parole vietate.`;
    $('beginLabel').textContent = `Via! ${game.seconds} secondi`;
    renderBoard($('readyBoard'), t);
    G.showScreen('readyScreen');
  }

  /* ---------- Turno ---------- */
  function beginTurn() {
    const { t, team, player } = current();
    turn = { results: [], passesLeft: game.passes, remaining: game.seconds, last: 0, second: game.seconds, paused: false };
    $('playTeam').textContent = `${team.name} · ${player.name}`;
    $('playTeam').className = `team-chip ${TEAM_CLASS[t]}`;
    $('card').className = `taboo-card ${TEAM_CLASS[t]}`;
    $('pauseLayer').hidden = true;
    drawCard(); updateTurn(); renderTime();
    G.showScreen('playScreen');
    $('playScreen').closest('.panel').scrollIntoView({ block: 'start' }); // Sul telefono la carta deve stare tutta sullo schermo.
    G.keepAwake(true); G.sounds.start();
    turn.last = performance.now(); frame = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!turn || turn.paused) return;
    turn.remaining -= (now - turn.last) / 1000; turn.last = now;
    const second = Math.max(0, Math.ceil(turn.remaining));
    if (second !== turn.second) { turn.second = second; if (second > 0 && second <= 5) G.sounds.tick(); }
    renderTime();
    if (turn.remaining <= 0) { endTurn(); return; }
    frame = requestAnimationFrame(loop);
  }

  function renderTime() {
    const remaining = Math.max(0, turn.remaining);
    $('timeLeft').textContent = Math.ceil(remaining);
    $('timeBar').style.transform = `scaleX(${remaining / game.seconds})`;
    $('playScreen').classList.toggle('is-urgent', remaining <= 10);
  }

  function drawCard() {
    // The deck grows instead of restarting, so "undo" can always step back one card.
    if (game.pos >= game.deck.length) game.deck = game.deck.concat(newDeck());
    game.pos++; renderCard();
  }

  function renderCard() {
    const card = CARDS[game.deck[game.pos - 1]];
    $('cardWord').textContent = card.w;
    $('cardTaboo').replaceChildren(...card.t.map(word => Object.assign(document.createElement('li'), { textContent: word })));
    const el = $('card'); el.classList.remove('anim-in'); void el.offsetWidth; el.classList.add('anim-in');
  }

  function flash(text, kind) {
    const el = $('flash'); el.textContent = text; el.className = `flash ${kind}`;
    void el.offsetWidth; el.classList.add('show');
  }

  function updateTurn() {
    const total = turn.results.reduce((sum, r) => sum + OUTCOMES[r.outcome].points, 0);
    $('turnPoints').textContent = G.signed(total);
    $('passLeft').textContent = turn.passesLeft === -1 ? 'illimitate' : `${turn.passesLeft} ${turn.passesLeft === 1 ? 'rimasta' : 'rimaste'}`;
    $('passButton').disabled = turn.passesLeft === 0;
    $('undoButton').disabled = !turn.results.length;
  }

  const playing = () => turn && !turn.paused && turn.remaining > 0 && !$('playScreen').hidden;

  function mark(outcome) {
    if (!playing()) return;
    if (outcome === 'pass' && turn.passesLeft === 0) { toast('Non puoi più passare in questo turno.'); return; }
    turn.results.push({ card: game.deck[game.pos - 1], outcome });
    if (outcome === 'pass' && turn.passesLeft > 0) turn.passesLeft--;
    if (outcome === 'ok') { G.sounds.good(); flash('+1', 'good'); }
    else if (outcome === 'taboo') { G.sounds.bad(); G.vibrate(150); flash('TABOO! −1', 'bad'); }
    else { G.sounds.skip(); flash('Passata', 'neutral'); }
    drawCard(); updateTurn();
  }

  function undo() {
    if (!playing() || !turn.results.length) return;
    const last = turn.results.pop();
    if (last.outcome === 'pass' && turn.passesLeft !== -1) turn.passesLeft++;
    game.pos--; renderCard(); updateTurn();
    flash('Annullata', 'neutral');
  }

  function pauseTurn() {
    if (!turn || turn.paused || turn.remaining <= 0 || $('playScreen').hidden) return;
    turn.paused = true; cancelAnimationFrame(frame);
    $('pauseLayer').hidden = false; G.keepAwake(false);
    $('resumeTurnButton').focus({ preventScroll: true });
  }

  function resumeTurn() {
    if (!turn || !turn.paused || $('rulesDialog').open) return;
    turn.paused = false; $('pauseLayer').hidden = true;
    turn.last = performance.now(); G.keepAwake(true);
    frame = requestAnimationFrame(loop);
  }

  function endTurn() {
    cancelAnimationFrame(frame);
    turn.remaining = 0; renderTime();
    G.keepAwake(false); G.sounds.end(); G.vibrate([80, 60, 80]);
    renderSummary();
    G.showScreen('summaryScreen');
  }

  /* ---------- Riepilogo ---------- */
  function renderSummary() {
    const { team, player } = current();
    const total = turn.results.reduce((sum, r) => sum + OUTCOMES[r.outcome].points, 0);
    $('summaryTitle').textContent = `Fine del turno di ${player.name}`;
    $('summaryPoints').textContent = G.signed(total);
    $('summaryPoints').classList.toggle('negative', total < 0);
    const ok = turn.results.filter(r => r.outcome === 'ok').length;
    $('summaryText').textContent = turn.results.length
      ? `alla squadra ${team.name} · ${ok} ${ok === 1 ? 'parola indovinata' : 'parole indovinate'}`
      : 'Nessuna carta giocata in questo turno.';
    $('summaryHelp').hidden = !turn.results.length;
    $('resultList').innerHTML = turn.results.map((r, i) => {
      const o = OUTCOMES[r.outcome];
      return `<li><button type="button" class="result-item ${r.outcome}" data-index="${i}" aria-label="${esc(CARDS[r.card].w)}: ${o.label}. Tocca per cambiare."><span class="result-word">${esc(CARDS[r.card].w)}</span><span class="result-badge">${o.icon} ${o.label} ${G.signed(o.points)}</span></button></li>`;
    }).join('');
  }

  $('resultList').addEventListener('click', event => {
    const button = event.target.closest('[data-index]');
    if (!button || !turn) return;
    const index = Number(button.dataset.index), result = turn.results[index];
    result.outcome = NEXT_OUTCOME[result.outcome];
    renderSummary();
    $('resultList').querySelector(`[data-index="${index}"]`).focus();
  });

  function confirmTurn() {
    if (!turn) return;
    const { team, player } = current();
    for (const r of turn.results) {
      const value = OUTCOMES[r.outcome].points;
      team.score += value; player.points += value;
      if (r.outcome === 'ok') player.ok++;
      if (r.outcome === 'taboo') player.taboo++;
    }
    team.next = (team.next + 1) % team.players.length;
    game.turn++;
    game.deck = game.deck.slice(game.pos); game.pos = 0;
    turn = null;
    if (game.turn >= game.totalTurns) finishGame();
    else { save(); showReady(); }
  }

  /* ---------- Fine partita ---------- */
  function finishGame() {
    game.finished = true; save();
    const [a, b] = game.teams;
    const winner = a.score === b.score ? -1 : a.score > b.score ? 0 : 1;
    $('endTitle').textContent = winner < 0 ? 'Pareggio!' : `Vince la squadra ${game.teams[winner].name}!`;
    const best = G.ranked(game.teams.flatMap(team => team.players), p => p.points).filter(r => r.position === 1).map(r => r.item);
    const mvp = best.length && best[0].points > 0
      ? ` Miglior spiegatore: ${best.map(p => p.name).join(', ')} con ${points(best[0].points)}.` : '';
    $('endText').textContent = `${a.name} ${a.score} – ${b.score} ${b.name}.${mvp}`;
    renderBoard($('endBoard'), winner, 'vincitrice');
    G.showScreen('endScreen');
    G.sounds.win(); confetti();
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = $('confetti'); layer.replaceChildren();
    const symbols = ['🐟', '🐢', '🌊', '⭐', '🐚', '🪸'];
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.textContent = symbols[i % symbols.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * .9}s`;
      layer.append(s);
    }
    setTimeout(() => layer.replaceChildren(), 4000);
  }

  function stopEarly() {
    if (!game) return;
    if (!confirm('Terminare la partita adesso? Vince chi è in vantaggio.')) return;
    finishGame();
  }

  /* ---------- Comandi ---------- */
  $('startButton').addEventListener('click', startFromSetup);
  $('resumeButton').addEventListener('click', () => { game = G.store.get(SAVE_KEY); showReady(); });
  $('discardButton').addEventListener('click', () => {
    const saved = G.store.get(SAVE_KEY);
    if (saved) G.store.set(SAVE_KEY, { ...saved, finished: true });
    $('resumeBox').hidden = true;
  });
  $('beginButton').addEventListener('click', beginTurn);
  $('stopButton').addEventListener('click', stopEarly);
  $('okButton').addEventListener('click', () => mark('ok'));
  $('tabooButton').addEventListener('click', () => mark('taboo'));
  $('passButton').addEventListener('click', () => mark('pass'));
  $('undoButton').addEventListener('click', undo);
  $('pauseButton').addEventListener('click', pauseTurn);
  $('resumeTurnButton').addEventListener('click', resumeTurn);
  $('confirmButton').addEventListener('click', confirmTurn);
  $('rematchButton').addEventListener('click', rematch);
  $('newTeamsButton').addEventListener('click', () => { prefill(game); showSetup(); });
  $('rulesButton').addEventListener('click', pauseTurn);

  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || $('rulesDialog').open) return;
    if (event.target.closest('input')) return;
    if ($('playScreen').hidden) return;
    const key = event.key.toLowerCase();
    if (key === 'p' || key === 'escape') { event.preventDefault(); turn?.paused ? resumeTurn() : pauseTurn(); return; }
    if (event.repeat) return;
    if (key === 'arrowright' || key === 'g') { event.preventDefault(); mark('ok'); }
    else if (key === 't' || key === 'arrowleft') { event.preventDefault(); mark('taboo'); }
    else if (key === 's' || key === 'arrowdown') { event.preventDefault(); mark('pass'); }
    else if (key === 'z') { event.preventDefault(); undo(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseTurn(); });

  // Avvio: ripropone i nomi dell'ultima partita e l'eventuale partita da riprendere.
  const saved = G.store.get(SAVE_KEY);
  if (saved?.teams?.length === 2) prefill(saved);
  showSetup();
})();
