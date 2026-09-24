# Parco Capello

App personale per riconoscere e leggere gli alberi d'Italia (soprattutto del Nord), usabile offline su smartphone.
È una PWA: una pagina web che si installa sulla schermata Home e poi funziona senza connessione.

## Cartelle

| Cartella / file | Cosa contiene |
|---|---|
| `dati/specie/` | una scheda JSON per specie (`<id>.json`, es. `quercus-robur.json`) |
| `dati/organi/` | sezioni teoriche per organo (foglie, corteccia, …) con glossario |
| `dati/paesaggio/` | segnali per leggere il paesaggio |
| `dati/elenco-specie.json` | tutte le specie previste, con lotto e stato |
| `dati/vocabolari.json` | valori ammessi per i campi a scelta fissa (filtri, identificazione) |
| `dati/alberi-data.json` | **generato**: tutti i dati uniti (non modificarlo a mano) |
| `img/` | foto finali, già ridotte (max 1024 px) |
| `src/` | il codice dell'app: `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, icone, caratteri |
| `strumenti/` | script: `componi_dati.py`, `build.py`, `scarica-immagini.bat/.ps1`, `immagini-ricerca.json` |
| `dist/` | **generato**: l'app pronta da pubblicare |
| `dist-singolo/parco-capello.html` | **generato**: tutta l'app in un solo file (anteprima o riserva) |
| `candidati/` | foto scaricate da scegliere (si può svuotare dopo la scelta) |
| `MANUTENZIONE.md` | come aggiornare dati e software |
| `CHANGELOG.md` | registro delle versioni |

## Comandi (dalla cartella `app/`)

```
python3 strumenti/componi_dati.py   # unisce e controlla i dati
python3 strumenti/build.py          # controlla i dati e crea dist/ e dist-singolo/
```

## Metterla sul telefono (una volta sola)

L'app ha bisogno di essere servita da un indirizzo https per potersi installare e funzionare offline.
La via gratuita consigliata è GitHub Pages:

1. Crea un account su github.com (se non l'hai) e un repository nuovo, per esempio `parco-capello`.
   Deve essere **pubblico** per usare Pages gratis: contiene solo l'app e le schede, mai le tue note
   (quelle restano sul telefono).
2. Nel repository: *Add file → Upload files*, trascina **il contenuto** della cartella `dist/`
   (non la cartella stessa), poi *Commit changes*.
3. *Settings → Pages → Branch: main, cartella / (root) → Save*. Dopo 1-2 minuti l'indirizzo è
   `https://<tuo-utente>.github.io/parco-capello/`.
4. Sul Pixel apri l'indirizzo in Chrome → menu ⋮ → **Installa app** (o *Aggiungi a schermata Home*).
5. Apri l'app una volta con la connessione: da quel momento funziona anche offline.

Per aggiornare: rifai `build.py` e ricarica i file di `dist/` nel repository (sostituendo i vecchi).
Il telefono scarica la nuova versione alla prima apertura con rete e mostra "App aggiornata".

