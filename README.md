# Missione Mare Pulito: plastica, biodiversità e salute… mettiamoci in gioco!

Indirizzo pubblico: <https://06manfredi.github.io/bat-net-mar-game/>

Una piccola sala giochi web in italiano su plastiche, biodiversità e salute umana, ispirata al progetto Bat net mar. La pagina iniziale (`index.html`) è il menu dei giochi:

| Gioco | Pagina | Giocatori |
|---|---|---|
| Missione Mare Vivo | `mare-vivo.html` | 1, 90 secondi |
| Taboo del Mare | `taboo.html` | 2 squadre, almeno 2 giocatori per squadra |
| Chi vuol essere Custode del Mare? | `quiz.html` | 1–8, a turno |
| Memory degli scambi | `memory.html` | 1–4 |
| Salva la tartaruga | `tartaruga.html` | da soli o in gruppo |

## Mini giochi

**Taboo del Mare.** Due squadre si alternano; dentro ogni squadra i giocatori si danno il cambio. Chi è chiamato ha un turno a tempo (45/60/90 s) per far indovinare le parole alla propria squadra: *Indovinata* +1, *Taboo* −1 (parola vietata detta), *Passa* 0 (passaggi limitati). Si può annullare l’ultima azione, mettere in pausa (la carta si nasconde) e, a fine turno, correggere l’esito di ogni carta prima di confermare. Classifica delle squadre e dei singoli giocatori; la partita si salva a ogni turno. Le 112 carte sono in `giochi/dati/carte-taboo.js`.

**Chi vuol essere Custode del Mare?** Piramide di 12 domande (4 facili, 4 medie, 4 difficili) da 100 a 1.000.000 di punti, con traguardi sicuri a 1.000 e 20.000. Tutti salgono insieme un gradino alla volta; a ogni domanda: «risposta definitiva?», poi la spiegazione. Aiuti per giocatore: 50:50, pubblico (simulato), cambio domanda. Ci si può ritirare tenendo i punti; chi sbaglia esce con l’ultimo traguardo sicuro. Vince chi ha più punti. Domande in `giochi/dati/domande-quiz.js` (la prima risposta è quella giusta, l’ordine viene mescolato).

**Memory degli scambi.** Coppie oggetto usa e getta → alternativa riutilizzabile (6, 8 o 10 coppie). Da soli contano mosse e tempo (record salvato), in più giocatori chi trova una coppia gioca ancora.

**Salva la tartaruga.** Impiccato a tema: ogni errore avvicina un sacchetto alla tartaruga (6 vite). L’indizio mostra una parola vietata della carta Taboo e costa una vita. Conta le parole salvate di fila.

Ogni pagina ha «← Torna al menu» in alto, in fondo e nelle schermate dei risultati; i link puntano a `./index.html`, quindi funzionano sia su GitHub Pages sia aprendo i file dal computer.

Punteggi, nomi e record restano solo nel `localStorage` del dispositivo; i giochi funzionano anche se è bloccato.

## Missione Mare Vivo

Una missione di 90 secondi: guida la barca, raccogli almeno 18 plastiche e mantieni la biodiversità almeno all’80%. Lo scanner AI simulato distingue i rifiuti dagli organismi marini. Al termine, il gioco collega la prevenzione dell’inquinamento alla salute del mare e delle persone.

## Avvio

Apri `index.html` in un browser moderno per il menu dei giochi. Tutti i file necessari sono inclusi; non servono installazioni, un backend, un account o chiavi API. Per una normale anteprima HTTP, dalla cartella del gioco:

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

- `index.html`: menu dei giochi.
- `mare-vivo.html`, `style.css`, `game.js`: Missione Mare Vivo (interfaccia, grafica, logica).
- `taboo.html`, `quiz.html`, `memory.html`, `tartaruga.html`: i mini giochi.
- `giochi/giochi.css`: grafica condivisa di menu e mini giochi.
- `giochi/comune.js`: funzioni condivise (suono facoltativo, salvataggi, elenco giocatori, classifiche).
- `giochi/taboo.js`, `giochi/quiz.js`, `giochi/memory.js`, `giochi/tartaruga.js`: logica dei mini giochi.
- `giochi/dati/`: carte del Taboo e domande del quiz, modificabili a mano.
- `locandina/`: locandina A4 da stampare (`locandina-missione-mare-pulito.pdf`) con QR code verso il sito, il suo sorgente `locandina.html`, lo sfondo e il QR code in SVG/PNG. Per rigenerare il PDF: apri `locandina.html` in Chrome e stampa in A4 senza margini, con «Grafica di sfondo» attiva.
- `assets/ocean.png`: sfondo originale generato per il gioco.
- `.nojekyll`: configurazione per l’hosting statico GitHub Pages.

Lo sfondo è un’illustrazione originale generata con ImageGen. Le icone degli oggetti usano le emoji del sistema operativo. Nessun carattere tipografico o script viene caricato da CDN.

Nei browser compatibili, una piccola interfaccia WebMCP facoltativa espone le stesse azioni dell’interfaccia: `read_mission`, `control_mission` e `navigate_to_object`. Negli altri browser viene ignorata.

Per cambiare durata e obiettivo della Missione modifica `DURATION` e `GOAL` in `game.js`, aggiornando anche i testi corrispondenti in `mare-vivo.html` e nelle istruzioni. Per aggiungere carte o domande basta seguire il formato dei file in `giochi/dati/`.
