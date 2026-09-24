/* Bat net mar — Missione Mare Vivo. Vanilla JavaScript, nessuna dipendenza. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const ocean = $('ocean');
  const TYPES = [
    { name: 'Flacone di plastica', short: 'FLACONE', emoji: '🧴', kind: 'plastic' },
    { name: 'Sacchetto di plastica', short: 'SACCHETTO', emoji: '🛍️', kind: 'plastic' },
    { name: 'Bicchiere di plastica', short: 'BICCHIERE', emoji: '🥤', kind: 'plastic' },
    { name: 'Tartaruga', short: 'TARTARUGA', emoji: '🐢', kind: 'life' },
    { name: 'Pesce', short: 'PESCE', emoji: '🐟', kind: 'life' },
    { name: 'Medusa', short: 'MEDUSA', emoji: '🪼', kind: 'life' },
    { name: 'Posidonia', short: 'POSIDONIA', emoji: '🌿', kind: 'life' }
  ];
  const DURATION = 90, GOAL = 18;
  const state = { phase: 'ready', time: DURATION, score: 0, collected: 0, biodiversity: 100,
    missed: 0, mistakes: 0, combo: 0, items: [], nextId: 1, boat: { x: .71, y: .38 },
    target: null, spawnIn: 0, scanTime: 0, scanCooldown: 0, toastTime: 0, elapsed: 0 };
  const keys = new Set();
  let dimensions = { width: ocean.clientWidth, height: ocean.clientHeight };
  let lastFrame = 0, soundEnabled = false, audioContext, dialogPausedGame = false;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const distance = (a, b) => Math.hypot((a.x - b.x) * dimensions.width, (a.y - b.y) * dimensions.height);
  const put = (el, point) => { el.style.left = `${point.x * 100}%`; el.style.top = `${point.y * 100}%`; };
  const random = (min, max) => min + Math.random() * (max - min);

  new ResizeObserver(() => {
    dimensions = { width: ocean.clientWidth, height: ocean.clientHeight };
  }).observe(ocean);
  // The original background is bundled locally: the game works without a network connection.
  const art = new Image();
  art.onload = () => ocean.classList.add('has-art');
  art.src = './assets/ocean.png';

  function tone(frequency, duration = .12, type = 'sine') {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch { /* Sound is optional; gameplay never depends on audio support. */ }
  }

  function toast(message, seconds = 3) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    state.toastTime = seconds;
  }

  function floatText(message, point, bad = false) {
    const element = document.createElement('span');
    element.className = `floating-text${bad ? ' bad' : ''}`;
    element.textContent = message; put(element, point);
    $('effectsLayer').append(element);
    setTimeout(() => element.remove(), 1150);
  }

  function updateHUD() {
    const seconds = Math.ceil(state.time);
    $('timeValue').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('scoreValue').textContent = String(state.score).padStart(4, '0');
    $('plasticValue').textContent = state.collected;
    $('bioValue').innerHTML = `${state.biodiversity}<span>%</span>`;
    $('bioMeter').style.width = `${state.biodiversity}%`;
    $('bioMeter').style.background = state.biodiversity < 80 ? '#ffb898' : 'var(--lime)';
    const active = state.phase === 'playing';
    $('pauseButton').disabled = !active;
    $('collectButton').disabled = !active;
    $('scanButton').disabled = !active || state.scanCooldown > 0;
    $('scanButtonLabel').textContent = state.scanTime > 0 ? `AI attiva · ${Math.ceil(state.scanTime)}s` : state.scanCooldown > 0 ? `Ricarica · ${Math.ceil(state.scanCooldown)}s` : 'Scanner AI';
    ocean.classList.toggle('scanning', state.scanTime > 0);
    $('scanStatus').hidden = state.scanTime <= 0;
    document.querySelector('.timer-wrap').classList.toggle('urgent', state.time <= 15);
    if (active) $('gameHint').textContent = `${state.collected} / ${GOAL} PLASTICHE · ${state.combo > 1 ? `SERIE ×${state.combo}` : 'BIODIVERSITÀ ALMENO ALL’80%'}`;
    // Prevent invisible or paused objects from being keyboard targets.
    for (const item of state.items) item.el.disabled = !active;
    put($('boat'), state.boat);
  }

  function spawn(typeIndex, position) {
    const maxItems = dimensions.width < 600 ? 7 : 10;
    if (state.items.length >= maxItems && !position) return;
    const chosen = typeIndex ?? (Math.random() < .67 ? Math.floor(random(0, 3)) : Math.floor(random(3, 7)));
    const type = TYPES[chosen];
    let point = position;
    if (!point) {
      const margin = Math.max(.08, 37 / dimensions.width);
      for (let attempt = 0; attempt < 35; attempt++) {
        const candidate = { x: random(margin, 1 - margin), y: random(.18, .83) };
        if (state.items.every(item => distance(item, candidate) > 76) && distance(state.boat, candidate) > 60) {
          point = candidate; break;
        }
      }
      if (!point) return;
    }
    const element = document.createElement('button');
    element.className = `sea-item ${type.kind}`;
    element.setAttribute('aria-label', `${type.name}, seleziona per raccogliere`);
    element.style.setProperty('--tilt', `${random(-22, 22)}deg`);
    element.style.setProperty('--delay', `${random(-3, 0)}s`);
    const symbol = document.createElement('span'); symbol.className = 'item-symbol'; symbol.textContent = type.emoji; symbol.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'item-label'; label.textContent = `${type.short} · ${type.kind === 'plastic' ? 'RACCOGLI' : 'VITA'}`; label.setAttribute('aria-hidden', 'true');
    element.append(symbol, label);
    const item = { ...type, ...point, id: state.nextId++, age: 0, ttl: type.kind === 'plastic' ? 22 : 28, el: element };
    element.dataset.itemId = item.id;
    element.addEventListener('click', event => { event.stopPropagation(); selectItem(item.id); });
    element.disabled = state.phase !== 'playing';
    put(element, item); $('itemsLayer').append(element); state.items.push(item);
  }

  function selectItem(id) {
    if (state.phase !== 'playing') throw new Error('Avvia o riprendi la missione prima di scegliere un oggetto.');
    const item = state.items.find(item => item.id === id);
    if (!item) throw new Error('Questo oggetto non è più presente.');
    state.target = { id };
    put($('targetMarker'), item); $('targetMarker').hidden = false;
    ocean.focus({ preventScroll: true });
  }

  function clearTarget() { state.target = null; $('targetMarker').hidden = true; }
  function removeItem(item) {
    item.el.remove(); state.items = state.items.filter(other => other.id !== item.id);
    if (state.target?.id === item.id) clearTarget();
  }

  function collect(item) {
    if (state.phase !== 'playing' || !item) return;
    if (item.kind === 'plastic') {
      state.collected++; state.combo++;
      const points = 100 + Math.min(100, Math.floor((state.combo - 1) / 3) * 25);
      state.score += points;
      floatText(`+${points}`, item); tone(540 + Math.min(state.combo, 8) * 45);
      if (state.collected === 1) toast('Plastica a bordo! La vita marina, invece, va lasciata libera.');
      else if (state.collected === 6) toast('Meno rifiuti, meno occasioni di ingestione o intrappolamento.', 4);
      else if (state.collected === 12) toast('La plastica può frammentarsi: raccoglierla è un gesto di prevenzione.', 4);
      else if (state.collected === GOAL) toast('18 plastiche a bordo! Continua e proteggi la biodiversità.', 4);
      else if (state.combo % 5 === 0) toast(`Serie di ${state.combo}! Ottimo riconoscimento.`, 2);
    } else {
      state.mistakes++; state.combo = 0;
      state.score = Math.max(0, state.score - 80);
      state.biodiversity = Math.max(0, state.biodiversity - 15);
      floatText('−15% vita', item, true); tone(160, .2, 'triangle');
      toast(item.name === 'Posidonia' ? 'La posidonia è una pianta marina: lasciala al suo habitat. Usa lo scanner!' : `${item.name}: è vita, non un rifiuto. Usa lo scanner prima di raccogliere!`, 4);
    }
    removeItem(item); updateHUD();
    if (state.biodiversity === 0) finish();
  }

  function collectNearby() {
    if (state.phase !== 'playing') return;
    const nearest = [...state.items].sort((a, b) => distance(a, state.boat) - distance(b, state.boat))[0];
    if (nearest && distance(nearest, state.boat) < 65) collect(nearest);
    else toast('Avvicinati a un oggetto, oppure cliccalo per raggiungerlo.', 2);
  }

  function scan() {
    if (state.phase !== 'playing') throw new Error('Lo scanner funziona durante la missione.');
    if (state.scanCooldown > 0) throw new Error('Lo scanner è in ricarica.');
    state.scanTime = 5; state.scanCooldown = 12;
    tone(880, .22); updateHUD();
    toast('Verde: plastica da raccogliere. Azzurro: vita da proteggere.', 3);
  }

  function start() {
    if (state.phase === 'playing' || state.phase === 'paused') throw new Error('Una missione è già in corso.');
    $('itemsLayer').replaceChildren(); $('effectsLayer').replaceChildren();
    Object.assign(state, { phase: 'playing', time: DURATION, score: 0, collected: 0, biodiversity: 100,
      missed: 0, mistakes: 0, combo: 0, items: [], nextId: 1, boat: { x: .5, y: .58 },
      target: null, spawnIn: 1.8, scanTime: 0, scanCooldown: 0, toastTime: 0, elapsed: 0 });
    keys.clear(); clearTarget();
    $('startScreen').hidden = true; $('resultScreen').hidden = true; $('pauseScreen').hidden = true;
    $('toast').classList.remove('visible');
    $('zoneLabel').textContent = 'MEDITERRANEO · MISSIONE IN CORSO';
    [0, 1, 2, 0, 3, 4, 6].forEach(index => spawn(index));
    toast('Clicca la plastica. La barca la raggiunge e la raccoglie.', 4);
    updateHUD(); ocean.focus({ preventScroll: true }); tone(660, .18);
  }

  function pause(showOverlay = true) {
    if (state.phase !== 'playing') return;
    state.phase = 'paused'; keys.clear();
    $('pauseScreen').hidden = !showOverlay; updateHUD();
    if (showOverlay) $('resumeButton').focus({ preventScroll: true });
  }

  function resume() {
    if (state.phase !== 'paused' || $('infoDialog').open) return;
    state.phase = 'playing'; $('pauseScreen').hidden = true;
    keys.clear(); lastFrame = 0; updateHUD(); ocean.focus({ preventScroll: true });
  }

  function finish() {
    state.phase = 'ended'; clearTarget(); keys.clear();
    state.scanTime = 0; $('toast').classList.remove('visible');
    const success = state.collected >= GOAL && state.biodiversity >= 80;
    $('resultTitle').textContent = success ? 'Hai lasciato il mare più vivo.' : state.biodiversity < 80 ? 'Riconoscere è proteggere.' : 'Ogni gesto conta.';
    $('resultSubtitle').textContent = success ? 'Obiettivo raggiunto: plastica a bordo e biodiversità protetta.' : state.biodiversity < 80 ? 'Hai raccolto anche esseri viventi. Nella prossima missione, fatti aiutare dallo scanner.' : `Hai raccolto ${state.collected} plastiche. Torna in mare e prova a raggiungere quota ${GOAL}!`;
    $('resultPlastic').textContent = state.collected;
    $('resultBio').textContent = `${state.biodiversity}%`;
    $('resultScore').textContent = state.score;
    $('resultScreen').hidden = false;
    $('zoneLabel').textContent = 'MEDITERRANEO · RIENTRO ALLA BASE';
    $('gameHint').textContent = 'IL MARE FINISCE QUI. IL TUO IMPATTO CONTINUA.';
    updateHUD(); $('restartButton').focus({ preventScroll: true });
    tone(success ? 880 : 440, .4);
  }

  function tick(dt) {
    state.time = Math.max(0, state.time - dt); state.elapsed += dt;
    state.scanTime = Math.max(0, state.scanTime - dt);
    state.scanCooldown = Math.max(0, state.scanCooldown - dt);
    state.toastTime = Math.max(0, state.toastTime - dt);
    if (!state.toastTime) $('toast').classList.remove('visible');
    if (!state.time) { finish(); return; }
    let dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    let dy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);
    if (dx || dy) {
      clearTarget(); const norm = Math.hypot(dx, dy);
      state.boat.x += dx / norm * 270 * dt / dimensions.width;
      state.boat.y += dy / norm * 270 * dt / dimensions.height;
    } else if (state.target) {
      const destination = state.target.id ? state.items.find(item => item.id === state.target.id) : state.target;
      if (!destination) clearTarget();
      else {
        const remaining = distance(state.boat, destination), step = 360 * dt;
        if (remaining < (destination.id ? 24 : step + 2)) {
          if (destination.id) collect(destination); else clearTarget();
        } else {
          const ratio = Math.min(1, step / remaining);
          state.boat.x += (destination.x - state.boat.x) * ratio;
          state.boat.y += (destination.y - state.boat.y) * ratio;
        }
      }
    }
    if (state.phase !== 'playing') return;
    const margin = Math.max(.045, 25 / dimensions.width);
    state.boat.x = clamp(state.boat.x, margin, 1 - margin); state.boat.y = clamp(state.boat.y, .14, .86);
    for (const item of [...state.items]) {
      item.age += dt;
      item.el.classList.toggle('expiring', item.kind === 'plastic' && item.age > item.ttl - 5);
      if (item.age >= item.ttl) {
        if (item.kind === 'plastic') { state.missed++; state.combo = 0; state.score = Math.max(0, state.score - 20); floatText('−20', item, true); }
        removeItem(item);
      }
    }
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) { spawn(); state.spawnIn = 1.55; }
    updateHUD();
  }

  function frame(now) {
    if (!lastFrame) lastFrame = now;
    const dt = Math.min((now - lastFrame) / 1000, .15); lastFrame = now;
    if (state.phase === 'playing') tick(dt);
    requestAnimationFrame(frame);
  }

  const dialogs = {
    help: `<span class="eyebrow">PRIMA DI SALPARE</span><h2 id="dialogTitle">Pochi comandi. Un grande impatto.</h2><div class="help-steps"><div class="help-step"><span>↖</span><p><strong>Clicca o tocca un oggetto.</strong><br>La barca lo raggiunge e lo raccoglie. Cliccare sull’acqua muove soltanto la barca.</p></div><div class="help-step"><span>🧴</span><p><strong>Raccogli le plastiche.</strong><br>Flaconi, sacchetti e bicchieri: +100 punti. Le raccolte consecutive danno un bonus. La corrente porta via i rifiuti ignorati dopo 22 secondi: −20 punti.</p></div><div class="help-step"><span>🐢</span><p><strong>Lascia libera la vita marina.</strong><br>Pesci, tartarughe, meduse e posidonia non sono rifiuti! Raccoglierli costa 15 punti di biodiversità e 80 punti missione.</p></div><div class="help-step"><span>⌖</span><p><strong>Nel dubbio, usa lo scanner AI.</strong><br>Riconosce gli oggetti per 5 secondi. Si può riattivare dopo 12 secondi. Il riconoscimento è simulato.</p></div></div><p class="dialog-note"><strong>Obiettivo:</strong> 18 plastiche e almeno 80% di biodiversità in 90 secondi.<br><strong>Tastiera:</strong> frecce per navigare, spazio per raccogliere vicino alla barca, A per lo scanner, P o Esc per la pausa. Puoi anche scegliere gli oggetti con Tab e Invio.</p>`,
    about: `<span class="eyebrow">TECNOLOGIA AL SERVIZIO DEL MARE</span><h2 id="dialogTitle">Una barca. Uno sguardo in più.</h2><p>Bat net mar è un progetto che usa una barca e l’intelligenza artificiale per riconoscere flora, fauna e rifiuti nei video del mare e raccogliere i rifiuti individuati.</p><p>Questo gioco traduce l’idea in una piccola missione: osservare, distinguere e raccogliere con attenzione. La tecnologia aiuta, ma la scelta di proteggere il mare è nostra.</p><h3>Un mare, una salute</h3><p>Plastiche, biodiversità e salute umana sono collegate. Prevenire l’inquinamento e proteggere gli ecosistemi contribuisce a prenderci cura dell’ambiente da cui dipendiamo.</p><p class="dialog-note">Prototipo educativo ispirato alla descrizione del progetto. Lo scanner è una simulazione: non analizza video e non usa un modello AI reale. Tempi, punti, coordinate e simboli sono elementi di gioco, non dati del progetto.</p>`,
    science: `<span class="eyebrow">LA SCIENZA DIETRO IL GIOCO</span><h2 id="dialogTitle">Il mare ci riguarda.</h2><h3>Plastiche e biodiversità</h3><p>Gli animali possono ingerire rifiuti o rimanervi intrappolati. La plastica può danneggiare gli habitat e, col tempo, frammentarsi in particelle più piccole. <a href="https://www.unep.org/resources/pollution-solution-global-assessment-marine-litter-and-plastic-pollution" target="_blank" rel="noopener noreferrer">Approfondisci con UNEP ↗</a></p><h3>Microplastiche e salute umana</h3><p>L’esposizione umana può avvenire attraverso aria, acqua e alimenti. Le conoscenze sui possibili effetti sulla salute sono in evoluzione e restano incertezze da studiare. <a href="https://www.who.int/publications/i/item/9789240054608" target="_blank" rel="noopener noreferrer">Leggi la valutazione OMS ↗</a></p><h3>La prevenzione viene prima</h3><p>Raccogliere i rifiuti aiuta, ma ridurre la plastica non necessaria e impedirne l’ingresso nell’ambiente è essenziale. <a href="https://www.who.int/initiatives/plastics-and-health-initiative" target="_blank" rel="noopener noreferrer">Plastica e salute: l’iniziativa OMS ↗</a></p><p class="dialog-note">La biodiversità percentuale e i punti sono indicatori simbolici. Il gioco non stima microplastiche evitate, esposizione umana o benefici clinici. Le icone rappresentano categorie, non identificazioni scientifiche di specie.</p>`,
    action: `<span class="eyebrow">LA PROSSIMA MISSIONE È FUORI DALLO SCHERMO</span><h2 id="dialogTitle">Porta a terra quello che hai imparato.</h2><h3>01 · Previeni</h3><p>Quando puoi, scegli oggetti riutilizzabili e riduci gli imballaggi superflui. Il rifiuto migliore è quello che non arriva al mare.</p><h3>02 · Raccogli con attenzione</h3><p>Partecipa a iniziative di pulizia organizzate. Segui le indicazioni locali per la raccolta e il corretto conferimento dei rifiuti.</p><h3>03 · Lascia vivere</h3><p>Non raccogliere organismi marini e non strappare piante. In mare, distinguere è importante quanto intervenire.</p><p class="dialog-note">Una missione riuscita comincia con una scelta piccola, ripetuta ogni giorno.</p>`
  };

  function openInfo(kind) {
    dialogPausedGame = state.phase === 'playing';
    if (dialogPausedGame) pause(false);
    $('dialogContent').innerHTML = dialogs[kind];
    $('infoDialog').showModal();
  }
  $('helpButton').addEventListener('click', () => openInfo('help'));
  $('aboutButton').addEventListener('click', () => openInfo('about'));
  $('sourcesButton').addEventListener('click', () => openInfo('science'));
  $('learnButton').addEventListener('click', () => openInfo('action'));
  $('closeDialog').addEventListener('click', () => $('infoDialog').close());
  $('infoDialog').addEventListener('close', () => { if (dialogPausedGame) resume(); dialogPausedGame = false; });
  $('infoDialog').addEventListener('click', event => { if (event.target === $('infoDialog')) {
    const rect = $('infoDialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('infoDialog').close();
  } });
  $('startButton').addEventListener('click', start);
  $('restartButton').addEventListener('click', start);
  $('pauseButton').addEventListener('click', () => pause());
  $('resumeButton').addEventListener('click', resume);
  $('scanButton').addEventListener('click', scan);
  $('collectButton').addEventListener('click', collectNearby);
  $('soundButton').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    $('soundButton').classList.toggle('is-muted', !soundEnabled);
    $('soundButton').setAttribute('aria-pressed', String(soundEnabled));
    $('soundButton').setAttribute('aria-label', soundEnabled ? 'Disattiva i suoni' : 'Attiva i suoni');
    tone(600);
  });
  ocean.addEventListener('click', event => {
    if (state.phase !== 'playing' || event.target.closest('button')) return;
    const rect = ocean.getBoundingClientRect();
    state.target = { x: clamp((event.clientX - rect.left) / rect.width, .06, .94), y: clamp((event.clientY - rect.top) / rect.height, .14, .86) };
    put($('targetMarker'), state.target); $('targetMarker').hidden = false; ocean.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if ($('infoDialog').open || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') {
      if (state.phase === 'playing') { event.preventDefault(); pause(); }
      else if (state.phase === 'paused') { event.preventDefault(); resume(); }
      return;
    }
    if (state.phase !== 'playing') return;
    if (event.key.startsWith('Arrow')) { event.preventDefault(); keys.add(event.key); }
    if (event.code === 'Space' && !event.target.closest('button,a')) { event.preventDefault(); if (!event.repeat) collectNearby(); }
    if (event.key.toLowerCase() === 'a' && !event.repeat && state.scanCooldown <= 0) { event.preventDefault(); scan(); }
  });
  document.addEventListener('keyup', event => keys.delete(event.key));
  window.addEventListener('blur', () => { keys.clear(); if (state.phase === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase === 'playing') pause(); });

  // Small, optional WebMCP interface. All actions share the visible game's handlers.
  function snapshot() {
    return { phase: state.phase, remainingSeconds: Math.ceil(state.time), score: state.score,
      plasticCollected: state.collected, biodiversity: state.biodiversity, goal: GOAL,
      scanCooldownSeconds: Math.ceil(state.scanCooldown),
      objects: state.items.map(({ id, name, kind }) => ({ id, name, kind })) };
  }
  const registry = document.modelContext;
  if (registry?.registerTool) {
    const lifecycle = new AbortController();
    const register = tool => {
      try { Promise.resolve(registry.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional API. */ }
    };
    register({ name: 'read_mission', title: 'Leggi la missione', description: 'Legge stato, punteggi e oggetti presenti nella missione Bat net mar.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: snapshot });
    register({ name: 'control_mission', title: 'Controlla la missione', description: 'Avvia, mette in pausa, riprende la partita o attiva lo scanner AI simulato.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'pause', 'resume', 'scan'] } }, required: ['action'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Object.keys(input).some(key => key !== 'action') || !['start','pause','resume','scan'].includes(input.action)) throw new Error('Azione non valida.');
      if ($('infoDialog').open) throw new Error('Chiudi prima il pannello informativo.');
      if (input.action === 'pause' && state.phase !== 'playing') throw new Error('Nessuna missione in corso da mettere in pausa.');
      if (input.action === 'resume' && state.phase !== 'paused') throw new Error('Nessuna missione in pausa.');
      ({ start, pause, resume, scan })[input.action](); return snapshot();
    } });
    register({ name: 'navigate_to_object', title: 'Raggiungi un oggetto', description: 'Invia la barca verso un oggetto e avvia la raccolta automatica al suo arrivo. Scegliere un organismo marino penalizza la biodiversità.', inputSchema: { type: 'object', properties: { objectId: { type: 'integer', minimum: 1 } }, required: ['objectId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || Object.keys(input).some(key => key !== 'objectId') || !Number.isInteger(input.objectId) || input.objectId < 1) throw new Error('Identificativo oggetto non valido.');
      selectItem(input.objectId); return { navigatingTo: input.objectId, collection: 'pending_arrival' };
    } });
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  }

  // A few inert objects make the first view a recognizable game, without starting the clock.
  spawn(3, { x: .87, y: .24 }); spawn(0, { x: .59, y: .32 }); spawn(4, { x: .83, y: .77 });
  updateHUD(); requestAnimationFrame(frame);
})();
