# Registro delle versioni — Parco Capello

Formato: versione app · data · cosa è cambiato. Le voci più recenti in alto.
Versioni: terza cifra = correzioni; seconda = funzioni o lotti nuovi; prima = cambi di schema dati.

## Da fare

**Dati non accertati** (nell'app compaiono come "non accertato"; quando li verifichi sul campo, aggiorna la scheda):
- Ontano nero: ramificazione monopodiale o simpodiale.
- Cerro: ruolo nella successione (pioniera, di transizione, bosco maturo).
- Carpino nero e nocciolo: età massima.
- Età massima: olmo campestre, orniello, acero campestre, ippocastano, bagolaro, platano.
- Età solo stimate ("stima indicativa"): tigli, frassino maggiore, acero montano, acero riccio.
- Ruolo nel bosco: ippocastano e platano (specie coltivate).


- [ ] **Passaggio all'indirizzo corto:** esportare il backup del Taccuino, installare l'app da
      https://mufogliash.github.io/parco-capello/ e disinstallare la vecchia (quella con /dist/).
- [ ] Foto mancanti: portamento estivo dell'olmo campestre (c'è solo quello invernale); gemme di leccio e pino domestico.
- [ ] Foto fornite dall'utente (v0.4.1): indicare autore/fonte e licenza, soprattutto se il repository resta pubblico.
- [ ] Fase 2: lotti 3 → 6, poi le aggiunte proposte (lotto 7). Lotti 1 e 2 fatti.
- [ ] Fase 3: organi corteccia, rami, radici, gemme, portamento; altri 8-10 segnali del paesaggio; disegni del glossario.
- [ ] Da valutare dopo il test: modalità inverno nell'identificazione (gemme e sagome), confronto dalla sezione Organi.

---

## 0.5.0 · 2026-09-25 · Pubblicazione con git, foto in ordine

- **Nuovo indirizzo:** l'app è pubblicata nella radice del repository, https://mufogliash.github.io/parco-capello/.
  La vecchia cartella `dist/` sul repository è stata tolta.
- **Pubblicazione con git** fatta da Claude (token limitato al repository): niente più limite dei 100 file.
  Nuovo script `strumenti/pubblica.py`; nel repository ci sono anche README, CHANGELOG, MANUTENZIONE e i sorgenti
  (`sorgenti/`), che fanno da backup del progetto.
- **Galleria:** il portamento estivo è sempre la prima foto; ordine fisso portamento → foglia → fiore/frutto →
  corteccia → gemme → dettagli; i portamenti invernali (campo `stagione: "inverno"`) vanno in fondo e sono
  etichettati "Portamento in inverno". Le miniature dell'elenco restano con la foglia.
- **Aggiornamenti più affidabili:** il service worker scarica sempre i file nuovi dalla rete, senza riusare copie
  vecchie dalla memoria del browser.
- **Script foto riscritto:** foto principale delle pagine Wikipedia (it/en), sottocategorie tematiche di Commons,
  ricerca testuale solo di riserva; meno richieste; rilanciandolo completa senza duplicare. Nuovo formato di
  `immagini-ricerca.json` (basta l'id della specie).

## 0.4.1 · 2026-09-24 · Foto dell'utente

- 8 foto fornite dall'utente: portamento estivo di carpino bianco, acero campestre, acero montano, rovere, nocciolo;
  corteccia del frassino maggiore; fiori del tiglio selvatico; frutti del bagolaro.
- Crediti e visore foto: nessun link se la foto non ha un indirizzo di origine.

## 0.4.0 · 2026-09-24 · Lotto 2

- **11 nuove schede (bozza):** olmo campestre, tiglio selvatico, tiglio nostrano, frassino maggiore, orniello,
  acero campestre, acero montano, acero riccio, ippocastano, bagolaro, platano. Totale 24 specie.
  Prime specie a foglie opposte (aceri, frassini, ippocastano).
- **~55 foto nuove**; portamento estivo (albero intero con foglie) aggiunto per betulla, castagno, carpino nero e cerro.
  Scartate cultivar e foto dubbie (tiglio 'Laciniata', olmo 'Rueppelli', orniello innestato, foglia di frassino non identificata).
- **11 curiosità** in più (totale 50).
- Ippocastano con tossicità moderata; acero montano con avviso per i cavalli.

## 0.3.0 · 2026-09-24 · Lotto 1

- **8 nuove schede (bozza):** cerro, rovere, castagno, carpino bianco, carpino nero, nocciolo, betulla, ontano nero.
  Totale 13 specie.
- **39 foto nuove o sostituite** da Wikimedia Commons: faggio in estate al posto del faggio rosso; ghiande di roverella
  (illustrazione botanica EUFORGEN, perché le foto disponibili erano di ibridi).
- **7 curiosità** in più (totale 39).
- **Dati non accertati:** nuovi valori `non_accertata` (ramificazione) e `non_accertato` (ruolo ecologico); età
  massima lasciabile vuota. Elenco dei dati da verificare in cima a questo file.
- Vocabolario frutti: aggiunti nocciola e strobilo.
- Script immagini: identificativo con contatto (richiesto da Wikimedia), foto a 960 px, pausa di 5 s, arresto
  automatico dopo due rifiuti di fila, ricerche solo per le specie da fare.

## 0.2.0 · 2026-09-24 · Curiosità, pioniere, ramificazione

- **"Lo sapevi che…"** in Home: 32 curiosità (`dati/curiosita.json`), una diversa a ogni apertura, scelta in base
  alla stagione e mai uguale alla precedente; pulsante "Un'altra".
- **Schema 1.2:** nuovi campi `chiave.ramificazione` (monopodiale / simpodiale), `chiave.ruolo_ecologico`
  (pioniera, colonizzatrice, di transizione, bosco maturo), `chiave.luce` (eliofila / sciafila) e `ecologia.descrizione`;
  `rami_e_portamento.ramificazione` con la spiegazione per la specie. Aggiornate le 5 schede.
- **Organo "Rami"** con 11 concetti (monopodiale, simpodiale, gemma pseudoterminale, dominanza apicale, verticilli…).
- **Paesaggio:** nuovo segnale "Pioniere e colonizzatrici: chi arriva per primo", con parole chiave nel glossario.
- Scheda: ramificazione in "Portamento", ecologia in "Dove vive", etichetta Pioniera/Colonizzatrice in testata.
- Elenco specie: filtro "Pioniere e colonizzatrici".
- Il glossario ora include anche i termini del paesaggio, con link "Approfondisci".

## 0.1.0 · 2026-09-24 · Fase 1, prototipo

**Contenuti**
- Schema dati 1.1: campi a valori fissi per l'identificazione (`chiave`), `tratti_chiave`, `origine`,
  `commestibilita`, `tossicita`, `fonti`, `stato`, età come intervallo; vocabolari in `dati/vocabolari.json`;
  elenco di 64 specie in 7 lotti (`dati/elenco-specie.json`).
- 5 schede in bozza: farnia, roverella, faggio, leccio, pino domestico.
- Organo "Foglie" con 24 concetti di glossario.
- 2 segnali del paesaggio: alberi a bandiera; muschi e licheni.
- 24 foto da Wikimedia Commons con autore e licenza.
- Correzione rispetto alle istruzioni iniziali: "Rovere comune" non è un sinonimo della farnia
  (sostituito con "Quercia comune, Quercia peduncolata").

**App**
- PWA installabile e offline, stile "taccuino naturalistico", modalità giorno/notte/automatica.
- Home con "in questa stagione guarda", ricerca per nome comune, latino o sinonimo.
- Schede con galleria, sezioni, glossario toccabile, confronto tra due specie.
- Identificazione a filtri con conteggio delle specie rimaste e quota.
- Organi, Paesaggio, Ripasso (quiz su foto e caratteri).
- Taccuino: note con specie, data, luogo, testo e foto; specie viste; esporta/importa backup.

**Strumenti**
- `componi_dati.py` (unione e controlli), `build.py` (PWA + file unico), `scarica-immagini` (con ritentativi
  quando Wikimedia chiede di rallentare).
