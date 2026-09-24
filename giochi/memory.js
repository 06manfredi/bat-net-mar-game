/* Memory degli scambi — abbina l'oggetto usa e getta alla sua alternativa riutilizzabile. */
'use strict';
(() => {
  const G = window.Giochi, $ = G.$, esc = G.escapeHTML;
  // [emoji usa e getta, nome, emoji alternativa, nome, perché]
  const PAIRS = [
    ['🛍️', 'Sacchetto di plastica', '🧺', 'Borsa riutilizzabile', 'Una borsa robusta si usa per anni: i sacchetti leggeri invece volano via facilmente e finiscono in mare.'],
    ['🥤', 'Bicchiere usa e getta', '☕', 'Tazza lavabile', 'Una tazza si lava e si riusa: niente bicchieri che diventano rifiuti dopo un solo sorso.'],
    ['🧴', 'Bottiglietta d’acqua', '🚰', 'Borraccia', 'Riempita con l’acqua del rubinetto, una borraccia evita tantissime bottigliette.'],
    ['🥡', 'Vaschetta da asporto', '🍱', 'Contenitore riutilizzabile', 'Molti locali accettano il tuo contenitore: meno vaschette usate per pochi minuti.'],
    ['🎈', 'Palloncini liberati in cielo', '🪁', 'Aquilone', 'I palloncini liberati ricadono in mare, dove gli animali possono ingerirli. L’aquilone torna a casa con te.'],
    ['🥪', 'Pellicola per alimenti', '🫙', 'Barattolo con coperchio', 'Un barattolo o un contenitore con coperchio conserva il cibo senza pellicola da buttare.'],
    ['🪥', 'Spazzolino di plastica', '🎋', 'Spazzolino in bambù', 'Esistono spazzolini con manico in bambù o con la sola testina da cambiare.'],
    ['🚿', 'Bagnoschiuma in flacone', '🧼', 'Saponetta solida', 'Una saponetta solida non ha bisogno di un flacone di plastica.'],
    ['🚬', 'Mozzicone a terra', '👝', 'Posacenere tascabile', 'Il filtro delle sigarette contiene plastica: in spiaggia serve un posacenere, non la sabbia.'],
    ['🍽️', 'Piatti e posate usa e getta', '🍴', 'Stoviglie lavabili', 'Dal 2021 piatti e posate di plastica monouso sono vietati nell’Unione Europea.'],
    ['🧻', 'Salviette umidificate', '🧽', 'Panno lavabile', 'Molte salviette contengono fibre sintetiche e, gettate nel WC, intasano gli scarichi.'],
    ['👕', 'Vestiti usa e getta', '🧵', 'Vestiti riparati o di seconda mano', 'I tessuti sintetici rilasciano microfibre nei lavaggi: comprare meno e riparare aiuta.']
  ];
  const BEST_KEY = 'batnetmar-memory-record';
  const editor = G.playerEditor($('memPlayers'), { min: 1, max: 4, count: 1 });

  let game = null, open = [], busy = false, clock = 0, toastTimer = 0;

  function toast(message, seconds = 3.2) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), seconds * 1000);
  }
  const elapsed = () => Math.round(((game.end || performance.now()) - game.start) / 1000);
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function start(names, pairCount) {
    const pairs = G.shuffle(PAIRS).slice(0, pairCount);
    const cards = G.shuffle(pairs.flatMap((_, id) => [{ id, side: 0 }, { id, side: 1 }])).map(c => ({ ...c, matched: false, owner: -1 }));
    game = { names, pairs, cards, scores: names.map(() => 0), current: 0, moves: 0, found: 0, start: performance.now(), end: 0, settings: { names, pairCount } };
    open = []; busy = false;
    renderGrid(); renderBar();
    clearInterval(clock); clock = setInterval(renderBar, 1000);
    G.showScreen('playScreen');
  }

  function cardFace(card) {
    const pair = game.pairs[card.id];
    const [emoji, label] = card.side === 0 ? [pair[0], pair[1]] : [pair[2], pair[3]];
    return { emoji, label, tag: card.side === 0 ? 'USA E GETTA' : 'RIUTILIZZABILE' };
  }

  function renderGrid() {
    const grid = $('grid');
    grid.dataset.pairs = game.pairs.length;
    grid.innerHTML = game.cards.map((card, i) => {
      const face = cardFace(card);
      return `<button class="mem-card" data-index="${i}" aria-label="Carta ${i + 1}, coperta"><span class="mem-face mem-back" aria-hidden="true"><svg><use href="#i-wave"/></svg></span><span class="mem-face mem-front" aria-hidden="true"><span class="mem-emoji">${face.emoji}</span><span class="mem-label">${esc(face.label)}</span><span class="mem-tag ${card.side === 0 ? 'mono' : 'reuse'}">${face.tag}</span></span></button>`;
    }).join('');
  }

  function renderBar() {
    if (!game) return;
    const solo = game.names.length === 1;
    $('memScores').innerHTML = game.names.map((name, i) =>
      `<span class="mem-player${!solo && i === game.current ? ' is-active' : ''}">${esc(name)} <strong>${game.scores[i]}</strong></span>`).join('');
    $('memStats').textContent = solo
      ? `${game.moves} ${game.moves === 1 ? 'mossa' : 'mosse'} · ${mmss(elapsed())} · ${game.found}/${game.pairs.length} coppie`
      : `Tocca a ${game.names[game.current]} · ${game.found}/${game.pairs.length} coppie`;
  }

  function updateCard(i) {
    const card = game.cards[i], button = $('grid').querySelector(`[data-index="${i}"]`);
    const shown = card.matched || open.includes(i);
    button.classList.toggle('flipped', shown);
    button.classList.toggle('matched', card.matched);
    const face = cardFace(card);
    button.setAttribute('aria-label', shown ? `${face.label}, ${face.tag.toLowerCase()}${card.matched ? ', coppia trovata' : ''}` : `Carta ${i + 1}, coperta`);
    button.setAttribute('aria-disabled', String(card.matched));
  }

  function flip(i) {
    const card = game.cards[i];
    if (busy || card.matched || open.includes(i)) return;
    open.push(i); updateCard(i); G.tone(480 + open.length * 80, .06);
    if (open.length < 2) return;
    game.moves++;
    const [a, b] = open.map(index => game.cards[index]);
    if (a.id === b.id) {
      a.matched = b.matched = true; a.owner = b.owner = game.current;
      game.scores[game.current]++; game.found++;
      const pair = game.pairs[a.id];
      open = []; updateCard(game.cards.indexOf(a)); updateCard(game.cards.indexOf(b));
      G.sounds.good();
      toast(`${pair[0]} ${pair[1]} → ${pair[2]} ${pair[3]}`);
      renderBar();
      if (game.found === game.pairs.length) setTimeout(finish, 900);
    } else {
      busy = true;
      for (const index of open) $('grid').querySelector(`[data-index="${index}"]`).classList.add('nope');
      setTimeout(() => {
        const closing = open; open = [];
        for (const index of closing) { $('grid').querySelector(`[data-index="${index}"]`).classList.remove('nope'); updateCard(index); }
        game.current = (game.current + 1) % game.names.length;
        busy = false; renderBar();
        if (game.names.length > 1) toast(`Tocca a ${game.names[game.current]}`, 1.6);
      }, 1100);
      renderBar();
    }
  }

  function finish() {
    game.end = performance.now(); clearInterval(clock);
    const seconds = elapsed(), solo = game.names.length === 1;
    const size = game.pairs.length;
    $('endRankingBox').hidden = solo;
    if (solo) {
      const records = G.store.get(BEST_KEY, {}) || {};
      const best = records[size];
      const isRecord = !best || game.moves < best.moves || (game.moves === best.moves && seconds < best.seconds);
      if (isRecord) { records[size] = { moves: game.moves, seconds }; G.store.set(BEST_KEY, records); }
      $('endTitle').textContent = isRecord ? 'Nuovo record!' : 'Tutte le coppie!';
      $('endText').textContent = `${game.moves} mosse in ${mmss(seconds)} con ${size} coppie.` + (!isRecord ? ` Il record è di ${best.moves} mosse in ${mmss(best.seconds)}.` : game.moves === size ? ' Una partita perfetta!' : '');
    } else {
      const ranking = G.ranked(game.names.map((name, i) => ({ name, score: game.scores[i] })), p => p.score);
      const winners = ranking.filter(r => r.position === 1).map(r => r.item);
      $('endTitle').textContent = winners.length > 1 ? 'Pari merito!' : `Vince ${winners[0].name}!`;
      $('endText').textContent = winners.length > 1 ? `${winners.map(w => w.name).join(' e ')} con ${winners[0].score} coppie a testa.` : `Con ${winners[0].score} ${winners[0].score === 1 ? 'coppia' : 'coppie'} su ${size}.`;
      $('endBoard').innerHTML = ranking.map(({ item, position }) => `<li class="${position === 1 ? 'is-first' : ''}"><span class="rank-pos">${position}°</span><span class="rank-name">${esc(item.name)}</span><span class="rank-points">${item.score}<small>${item.score === 1 ? 'coppia' : 'coppie'}</small></span></li>`).join('');
    }
    $('swapList').innerHTML = game.pairs.map(p => `<li><strong>${p[0]} ${esc(p[1])} → ${p[2]} ${esc(p[3])}</strong>${esc(p[4])}</li>`).join('');
    G.showScreen('endScreen'); G.sounds.win(); confetti();
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = $('confetti'); layer.replaceChildren();
    const symbols = ['🧺', '☕', '🚰', '🐢', '🌊', '⭐'];
    for (let i = 0; i < 24; i++) {
      const s = document.createElement('span');
      s.textContent = symbols[i % symbols.length];
      s.style.left = `${Math.random() * 100}%`; s.style.animationDelay = `${Math.random() * .9}s`;
      layer.append(s);
    }
    setTimeout(() => layer.replaceChildren(), 4000);
  }

  function showBest() {
    const records = G.store.get(BEST_KEY, {}) || {}, best = records[G.readChoice('pairs')];
    $('bestText').textContent = best
      ? `Record da soli con ${G.readChoice('pairs')} coppie: ${best.moves} mosse in ${mmss(best.seconds)}.`
      : 'Da soli si gioca contro il tempo e il numero di mosse: il record resta su questo dispositivo.';
  }

  $('grid').addEventListener('click', event => {
    const button = event.target.closest('.mem-card');
    if (button) flip(Number(button.dataset.index));
  });
  $('startButton').addEventListener('click', () => start(editor.names(), Number(G.readChoice('pairs'))));
  $('againButton').addEventListener('click', () => start(game.settings.names, game.settings.pairCount));
  $('restartButton').addEventListener('click', () => { if (game.found === 0 || confirm('Ricominciare con carte nuove?')) start(game.settings.names, game.settings.pairCount); });
  $('setupButton').addEventListener('click', () => { clearInterval(clock); showBest(); G.showScreen('setupScreen'); });
  document.querySelectorAll('input[name="pairs"]').forEach(input => input.addEventListener('change', showBest));
  showBest();
})();
