# Parco Capello

App personale per riconoscere e leggere gli alberi d'Italia (soprattutto del Nord), usabile offline su smartphone.
È una PWA: una pagina web che si installa sulla schermata Home e poi funziona senza connessione.

**Indirizzo dell'app:** https://mufogliash.github.io/parco-capello/

## Installarla sul telefono

1. Apri l'indirizzo sopra in Chrome sul telefono → menu ⋮ → **Installa app**.
2. Aprila una volta con la connessione: da quel momento funziona anche offline.
3. Gli aggiornamenti arrivano da soli alla prima apertura con rete (compare "App aggiornata").

Le note del Taccuino restano solo sul telefono: ogni tanto fai **Taccuino → Esporta backup**.

## Contenuto del repository

| Percorso | Cosa contiene |
|---|---|
| `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest` | l'app pubblicata |
| `dati/alberi-data.json` | tutti i dati dell'app, generati dalle schede |
| `img/`, `fonts/`, `icons/` | foto, caratteri e icone |
| `sorgenti/` | il progetto: codice (`src/`), schede (`dati/`), script (`strumenti/`) |
| `CHANGELOG.md` | registro delle versioni e lista delle cose da fare |
| `MANUTENZIONE.md` | come aggiungere specie e foto, correggere errori, pubblicare |

## Cartella di lavoro sul PC (`tree/app/`)

| Cartella / file | Cosa contiene |
|---|---|
| `dati/specie/` | una scheda JSON per specie (`<id>.json`, es. `quercus-robur.json`) |
| `dati/organi/`, `dati/paesaggio/`, `dati/curiosita.json` | teoria, segnali del paesaggio, "Lo sapevi che…" |
| `dati/elenco-specie.json`, `dati/vocabolari.json` | elenco delle specie previste e valori ammessi |
| `img/` | foto, già ridotte (max 1024 px) |
| `src/` | il codice dell'app |
| `strumenti/` | `componi_dati.py` (controlli), `build.py` (costruzione), `pubblica.py` (prepara il repository), `scarica-immagini.bat` (foto candidate) |
| `dist/` | **generato**: l'app pronta da pubblicare |
| `da_caricare/` | **generato**: `dist/` divisa in gruppi da max 100 file, per caricare a mano dal browser |
| `candidati/` | foto scaricate dallo script, da scegliere |

## Comandi (dalla cartella `app/`)

```
python3 strumenti/componi_dati.py        # unisce e controlla i dati
python3 strumenti/build.py               # controlla i dati e crea dist/
python3 strumenti/pubblica.py <repo>     # copia dist/ e sorgenti nella cartella del repository clonato
```

La pubblicazione (commit e invio su GitHub) la fa Claude con un token limitato a questo repository.
Dettagli e alternativa manuale in `MANUTENZIONE.md`, sezione 5.
