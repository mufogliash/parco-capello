# Manutenzione di Parco Capello

Guida per aggiornare l'app nel tempo: nuove piante, correzioni, nuove funzioni.
Vale sia se lavori da solo sia se chiedi a Claude (in fondo trovi le richieste già pronte).

Regola d'oro: **si modificano solo `dati/` (contenuti), `img/` (foto) e `src/` (software)**.
`dati/alberi-data.json`, `dist/` e `dist-singolo/` si rigenerano sempre con `build.py`.

---

## 1. Aggiungere una specie

1. **Controlla l'elenco.** In `dati/elenco-specie.json` la specie deve esserci. Se manca, aggiungi una riga:
   `{"id": "pinus-halepensis", "nome_comune": "Pino d'Aleppo", "nome_scientifico": "Pinus halepensis", "gruppo": "conifera", "lotto": 7, "stato": "proposta"}`.
   L'`id` è il nome scientifico in minuscolo con trattini (ibridi: `platanus-x-hispanica`).
2. **Crea la scheda.** Copia una scheda simile in `dati/specie/` (una conifera per una conifera) e rinominala `<id>.json`.
   Riscrivi tutti i campi. Regole:
   - testi originali, in italiano, frasi brevi e utili sul campo; nomi scientifici in latino;
   - valori incerti come intervalli con nota (es. "15-25 m, fino a 35 in condizioni ottimali"); se un dato non è sicuro
     scrivilo esplicitamente nel testo ("dato non accertato"); per i campi a scelta fissa usa `non_accertata` (ramificazione) o
     `non_accertato` (ruolo ecologico), per l'età massima `null` con una nota; aggiungi il dato all'elenco
     "Dati non accertati" in `CHANGELOG.md`, così quando lo scopri sai dove correggerlo;
   - i campi dentro `chiave` usano **solo** i valori di `dati/vocabolari.json` (servono all'identificazione);
     se serve un valore nuovo, aggiungilo prima al vocabolario con la sua etichetta;
   - `tratti_chiave`: 3-5 caratteri che bastano a riconoscerla;
   - `chiave.ramificazione`: guarda la punta del rametto (gemma terminale vera = monopodiale, apice morto = simpodiale)
     e spiega in `rami_e_portamento.ramificazione`; `chiave.ruolo_ecologico` e `chiave.luce` con `ecologia.descrizione`;
   - `specie_simili`: `id` presenti nell'elenco; se possibile aggiungi il riferimento anche nella scheda dell'altra specie;
   - `stato: "bozza"` finché non l'hai verificata sul campo, poi `"verificata"`;
   - `fonti`: le pagine usate per controllare i dati.
3. **Foto.** Vedi sezione 2.
4. **Controlla e costruisci:** `python3 strumenti/build.py`. Gli ERRORI bloccano la build, gli AVVISI no
   (per esempio una specie simile senza scheda compare come "in arrivo").
5. **Pubblica** (sezione 5) e annota la versione in `CHANGELOG.md`.

## 2. Aggiungere o cambiare foto

1. In `strumenti/immagini-ricerca.json` metti gli id delle specie in `specie` (per cercare solo alcuni tipi:
   `{"id": "ulmus-minor", "tipi": ["silhouette"]}`).
2. Doppio clic su `strumenti/scarica-immagini.bat`. Lo script:
   - prende la **foto principale della pagina Wikipedia** (italiana e inglese) di ogni specie;
   - cerca le **sottocategorie di Commons** della specie (foglie, corteccia, portamento/habitus, frutti, gemme) e
     solo se mancano fa una ricerca testuale di riserva;
   - tiene solo licenze libere (CC0, CC BY, CC BY-SA, pubblico dominio), scarica a 960 px, rallenta se Wikimedia
     lo chiede, si ferma dopo due rifiuti di fila; rilanciandolo completa, non duplica;
   - registra autore, licenza e origine in `candidati/candidati.json`.
3. Scegli le foto guardando anche il **titolo originale**: scarta ibridi, cultivar (es. faggio rosso "Purpurea"),
   collage, foto al microscopio o di specie diverse. Il portamento deve mostrare l'albero intero **con le foglie**.
4. Riduci la foto a max 1024 px (JPEG qualità ~70), salvala in `img/` come `<id>-<tipo>.jpg`
   (seconda foto dello stesso tipo: `<id>-<tipo>-2.jpg`) e aggiungi nella scheda:
   ```json
   {"tipo": "corteccia", "file": "img/pinus-pinea-corteccia.jpg", "fonte": "Wikimedia Commons",
    "autore": "…", "licenza": "CC BY-SA 4.0", "url_originale": "https://commons.wikimedia.org/wiki/File:…",
    "titolo_originale": "…"}
   ```
   Per un portamento spoglio aggiungi `"stagione": "inverno"`: finisce in fondo alla galleria. L'ordine nella
   galleria è automatico: portamento, foglia, fiore/frutto, corteccia, gemme, dettagli. Le miniature dell'elenco
   usano la foglia.
   Per le foto CC BY e CC BY-SA autore e licenza sono obbligatori: l'app li mostra sotto la foto e in Impostazioni.
5. **Foto trovate a mano:** il modo migliore è mandare a Claude il link della **pagina del file su Commons**
   (`https://commons.wikimedia.org/wiki/File:…`), così autore e licenza sono sicuri.

Peso indicativo: ~150 KB a foto. 64 specie × 5 foto ≈ 50 MB, che il Pixel gestisce senza problemi.

## 3. Organi e paesaggio

- **Organo** (`dati/organi/organ-<nome>.json`): `id`, `nome`, `descrizione_generale`, `ordine_osservazione`
  (cosa guardare in ordine), `concetti` (termine, definizione ed eventuali `alias`: le forme della parola che
  nel testo delle schede diventano tappabili), `campo_comparativo_riferimento` (il campo delle schede da mettere a
  confronto: `foglie`, `corteccia`, `rami_e_portamento`, `gemme`…). Gli id previsti sono in `ORGANI_PREVISTI` in `src/app.js`.
- **Segnale del paesaggio** (`dati/paesaggio/landscape-<nome>.json`): `categoria` tra `forma_e_crescita`,
  `indicatori_tronco_corteccia`, `eta_e_storia`, `orientamento_bussola`; poi `titolo`, `descrizione`,
  `come_riconoscerlo`, `immagini`.

- **Curiosità** (`dati/curiosita.json`): `id` univoco (c033, c034…), `testo` breve e verificabile, facoltativi
  `specie` (id dell'elenco) e `stagione`. Le frasi con stagione compaiono solo in quella stagione e più spesso.
- **Concetti nel paesaggio:** anche i segnali possono avere `concetti` (come gli organi): entrano nel glossario toccabile.

## 4. Modificare il software

Tutto il codice è in `src/`, senza librerie esterne e senza passaggi di compilazione.

| File | Contenuto |
|---|---|
| `index.html` | struttura della pagina e barra in basso |
| `style.css` | colori (variabili in cima: giorno in `:root`, notte nei due blocchi scuri), caratteri, componenti |
| `app.js` | tutta la logica, in sezioni: utilità → icone → dati e glossario → tema → taccuino (IndexedDB) → viste (`V.home`, `V.scheda`, `V.identifica`, …) → router (`ROTTE`) → eventi → avvio |
| `sw.js` | funzionamento offline (la lista dei file la scrive `build.py`) |
| `manifest.webmanifest` | nome, icone e colori dell'app installata |

**Aggiungere una schermata:** scrivi una funzione `V.nome = (parametri, query) => '…html…'`, aggiungi la riga in
`ROTTE` e, se ha pulsanti, collega gli eventi in `dopoRender`. Usa sempre `esc()` sui testi che vengono dai dati.

**Correggere un bug:**
1. annota in `CHANGELOG.md` (sezione "Da fare") cosa succede, dove e su quale schermata;
2. riproduci il problema in locale: dalla cartella `dist/` avvia `python3 -m http.server 8000`
   e apri `http://localhost:8000` nel browser (con gli strumenti per sviluppatori in modalità telefono);
3. correggi in `src/`, rifai `build.py` e riprova;
4. alza `APP_VERSION` in cima a `app.js` (es. 0.1.0 → 0.1.1) e registra la correzione nel changelog.

**Numeri di versione:** terza cifra = correzioni; seconda = nuove funzioni o nuovi lotti di specie;
prima = cambi di struttura dei dati (schema). Se cambi la struttura delle schede, alza anche `SCHEMA_VERSION`
in `componi_dati.py` e aggiorna il controllo corrispondente.

**Il taccuino** è nel database del telefono (`parco-capello`, archivio `note`). Se cambi il formato delle note,
mantieni la lettura del formato vecchio: non si devono perdere note.

## 5. Pubblicare un aggiornamento

L'app è pubblicata con GitHub Pages dal repository `mufogliash/parco-capello`, all'indirizzo
**https://mufogliash.github.io/parco-capello/**. Struttura del repository:

| Nel repository | Contenuto |
|---|---|
| radice (`index.html`, `app.js`, `img/`, `dati/alberi-data.json`, …) | l'app pubblicata, cioè il contenuto di `dist/` |
| `sorgenti/` | copia del progetto: `src/`, `dati/` (schede), `strumenti/` |
| `README.md`, `CHANGELOG.md`, `MANUTENZIONE.md` | documentazione |

Le foto non sono duplicate in `sorgenti/`: quelle in uso stanno in `img/` alla radice.

**Con Claude (consigliato):** Claude ha un token GitHub limitato a questo repository. Fa `build.py`, prepara la
cartella con `strumenti/pubblica.py <cartella-del-repository>`, e pubblica con un solo commit.
Il token scade (90 giorni dalla creazione, settembre 2026): per rinnovarlo, su GitHub *Settings → Developer settings →
Personal access tokens → Fine-grained tokens*, solo il repository `parco-capello`, permesso *Contents: Read and write*.

**A mano (riserva):** `python3 strumenti/build.py`, poi carica su GitHub, **nella radice** del repository, il
contenuto delle cartelle `da_caricare/` una alla volta e in ordine (max 100 file per volta; `sw.js` per ultimo).

**Prima di ogni pubblicazione** aggiorna `CHANGELOG.md`: una nuova voce con la versione e, nella lista "Da fare",
togli ciò che è stato fatto e aggiungi ciò che resta in sospeso.

Dopo la pubblicazione: apri l'app sul telefono con la rete; si aggiorna da sola e mostra "App aggiornata".
Prima di aggiornamenti grossi fai **Esporta backup** dal Taccuino.

## 6. Richieste pronte per Claude

Collega la cartella `tree` alla chat (o chiedi a Claude di clonare il repository) e scrivi, per esempio:

- *"Leggi `tree/app/MANUTENZIONE.md` e aggiungi le schede del lotto 2 seguendo le regole. Prepara le ricerche immagini
  e dimmi quando lanciare lo script."*
- *"Nell'app Parco Capello, [schermata]: quando faccio [azione] succede [problema]. Correggi seguendo MANUTENZIONE.md
  e aggiorna il changelog."*
- *"Aggiungi a Parco Capello questa funzione: […]. Prima proponimi come apparirà."*
- *"Rivedi la scheda del [nome]: sul campo ho notato che [osservazione]."*
