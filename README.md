# Bat net mar — Missione Mare Vivo

Un gioco web in italiano su plastiche, biodiversità e salute umana, ispirato al progetto Bat net mar.

Una missione di 90 secondi: guida la barca, raccogli almeno 18 plastiche e mantieni la biodiversità almeno all’80%. Lo scanner AI simulato distingue i rifiuti dagli organismi marini. Al termine, il gioco collega la prevenzione dell’inquinamento alla salute del mare e delle persone.

## Avvio

Apri `index.html` in un browser moderno. Tutti i file necessari sono inclusi; non servono installazioni, un backend, un account o chiavi API. Per una normale anteprima HTTP, dalla cartella del gioco:

```sh
python3 -m http.server 4173
```

Visita `http://localhost:4173`.

## GitHub Pages

1. Crea un repository GitHub, ad esempio `bat-net-mar-game`.
2. Carica **il contenuto di questa cartella** nella radice del repository, mantenendo la cartella `assets`. `index.html` deve essere alla radice.
3. In **Settings → Pages**, scegli **Deploy from a branch**, il branch **main** e la cartella **/(root)**. Salva.
4. Attendi il completamento della pubblicazione: GitHub mostrerà l’indirizzo del gioco.

Tutti i percorsi sono relativi e funzionano anche sotto il percorso di un repository, come `https://nomeutente.github.io/bat-net-mar-game/`. Non serve un processo di build. Il file `.nojekyll` evita l’elaborazione con Jekyll.

Documentazione: [configurare la sorgente di GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Comandi

- **Mouse / touch:** clicca o tocca un oggetto; la barca lo raggiunge e lo raccoglie. Tocca l’acqua per spostarti senza raccogliere.
- **Frecce:** muovi la barca.
- **Spazio / pulsante Raccogli:** raccogli l’oggetto più vicino, se entro il raggio di raccolta.
- **A / Scanner AI:** mostra per 5 secondi cosa raccogliere e cosa proteggere; ricarica di 12 secondi dall’attivazione.
- **P / Esc:** pausa e ripresa.
- **Tab e Invio:** navigazione tra i pulsanti e selezione degli oggetti.
- **Suono:** facoltativo, attivabile dal pulsante altoparlante.

La partita va automaticamente in pausa quando la scheda perde il focus o viene nascosta. Le finestre informative mettono in pausa e riprendono la partita.

## Regole

- Ogni plastica: 100 punti, con bonus fino a 100 punti aggiuntivi nelle serie di raccolte corrette.
- Organismo raccolto per errore: −80 punti missione e −15 punti percentuali di biodiversità.
- Plastica portata via dalla corrente dopo 22 secondi: −20 punti e interruzione della serie.
- Obiettivo: 18 plastiche e biodiversità almeno all’80% allo scadere dei 90 secondi.
- La missione termina anche se la biodiversità scende a zero.

## Contenuti e limiti

Il riconoscimento è **simulato**: il gioco non analizza video e non si collega alla barca o a un modello AI. Tempi, coordinate, punti e percentuali sono elementi ludici, non misure ambientali o cliniche. Le icone sono rappresentazioni illustrative, non identificazioni scientifiche di specie. Non vengono raccolti dati personali, non ci sono analytics e lo stato della partita rimane nella pagina.

I contenuti evitano di quantificare benefici sanitari o microplastiche evitate. Gli effetti sulla salute umana sono un ambito di ricerca in evoluzione.

Fonti presenti anche nel gioco:

- [UNEP — From Pollution to Solution](https://www.unep.org/resources/pollution-solution-global-assessment-marine-litter-and-plastic-pollution)
- [OMS — Dietary and inhalation exposure to nano- and microplastic particles](https://www.who.int/publications/i/item/9789240054608)
- [OMS — Plastics and health initiative](https://www.who.int/initiatives/plastics-and-health-initiative)

## File

- `index.html`: interfaccia e struttura accessibile.
- `style.css`: grafica responsive e preferenza per movimento ridotto.
- `game.js`: logica, comandi, contenuti informativi, audio facoltativo.
- `assets/ocean.png`: sfondo originale generato per il gioco.
- `.nojekyll`: configurazione per l’hosting statico GitHub Pages.

Lo sfondo è un’illustrazione originale generata con ImageGen. Le icone degli oggetti usano le emoji del sistema operativo. Nessun carattere tipografico o script viene caricato da CDN.

Nei browser compatibili, una piccola interfaccia WebMCP facoltativa espone le stesse azioni dell’interfaccia: `read_mission`, `control_mission` e `navigate_to_object`. Negli altri browser viene ignorata.

Per cambiare durata e obiettivo modifica `DURATION` e `GOAL` in `game.js`, aggiornando anche i testi corrispondenti nell’HTML e nelle istruzioni.
