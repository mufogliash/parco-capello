#!/usr/bin/env python3
"""Unisce le schede in dati/ nel file unico dati/alberi-data.json e controlla che tutto sia coerente.

Uso:  python3 strumenti/componi_dati.py          (dalla cartella app/)
Esce con codice 1 se trova ERRORI; gli AVVISI non bloccano.

Cosa controlla:
- campi obbligatori e tipi di base di ogni scheda
- valori dei campi "chiave" presenti in dati/vocabolari.json
- id = nome del file, in minuscolo con trattini, presente in dati/elenco-specie.json
- specie_simili: l'id deve esistere nell'elenco (avviso se la scheda non è ancora compilata)
- immagini: file esistente in img/, con autore, licenza e url
- organi: campo_comparativo_riferimento esistente nelle schede
- paesaggio: categoria valida
"""
import json, re, sys, datetime
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
DATI = APP / "dati"
SCHEMA_VERSION = "1.2"

errori, avvisi = [], []
def err(m): errori.append(m)
def avv(m): avvisi.append(m)

def carica(p):
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except Exception as e:
        err(f"{p.relative_to(APP)}: JSON non valido ({e})")
        return None

voc = carica(DATI / "vocabolari.json")
elenco = carica(DATI / "elenco-specie.json")
ids_elenco = {s["id"]: s for s in elenco["specie"]}

SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
OBBLIGATORI = ["id", "nome_comune", "nome_scientifico", "famiglia", "genere", "chiave", "tratti_chiave",
               "origine", "foglie", "corteccia", "rami_e_portamento", "gemme", "fiori_e_frutti", "dimensioni",
               "habitat_e_distribuzione", "ecologia", "stagionalita", "specie_simili", "commestibilita", "tossicita",
               "curiosita_e_usi", "immagini", "fonti"]
CHIAVE_SINGOLI = {"gruppo": "gruppo", "persistenza": "persistenza", "foglia_tipo": "foglia_tipo",
                  "foglia_disposizione": "foglia_disposizione", "frutto": "frutto",
                  "ramificazione": "ramificazione", "luce": "luce"}
CHIAVE_LISTE = {"foglia_margine": "foglia_margine", "foglia_forma": "foglia_forma",
                "corteccia_texture": "corteccia_texture", "habitat": "habitat",
                "ruolo_ecologico": "ruolo_ecologico"}

species = []
for p in sorted((DATI / "specie").glob("*.json")):
    s = carica(p)
    if s is None:
        continue
    nome = p.stem
    for k in OBBLIGATORI:
        if k not in s:
            err(f"{nome}: manca il campo '{k}'")
    if s.get("id") != nome:
        err(f"{nome}: l'id '{s.get('id')}' non coincide con il nome del file")
    if not SLUG.match(s.get("id", "")):
        err(f"{nome}: id non valido (solo minuscole, cifre e trattini)")
    if s.get("id") not in ids_elenco:
        err(f"{nome}: id assente da dati/elenco-specie.json")
    ch = s.get("chiave", {})
    for campo, vocab in CHIAVE_SINGOLI.items():
        v = ch.get(campo)
        if v not in voc[vocab]:
            err(f"{nome}: chiave.{campo} = '{v}' non è in vocabolari.{vocab}")
    for campo, vocab in CHIAVE_LISTE.items():
        v = ch.get(campo, [])
        if not isinstance(v, list) or not v:
            err(f"{nome}: chiave.{campo} deve essere una lista non vuota")
            continue
        for x in v:
            if x not in voc[vocab]:
                err(f"{nome}: chiave.{campo} contiene '{x}' non presente in vocabolari.{vocab}")
    alt = ch.get("altitudine_m")
    if not (isinstance(alt, list) and len(alt) == 2 and alt[0] <= alt[1]):
        err(f"{nome}: chiave.altitudine_m deve essere [min, max]")
    if s.get("origine", {}).get("stato") not in voc["origine"]:
        err(f"{nome}: origine.stato non valido")
    if s.get("tossicita", {}).get("livello") not in voc["tossicita_livello"]:
        err(f"{nome}: tossicita.livello non valido")
    dim = s.get("dimensioni", {})
    a = dim.get("altezza_tipica_m")
    if not (isinstance(a, list) and len(a) == 2 and a[0] <= a[1]):
        err(f"{nome}: dimensioni.altezza_tipica_m deve essere [min, max]")
    if not (3 <= len(s.get("tratti_chiave", [])) <= 5):
        avv(f"{nome}: tratti_chiave dovrebbe avere 3-5 voci")
    for sim in s.get("specie_simili", []):
        sid = sim.get("id_specie")
        if sid == nome:
            err(f"{nome}: una specie non può essere simile a sé stessa")
        elif sid not in ids_elenco:
            err(f"{nome}: specie_simili '{sid}' non esiste nell'elenco")
        elif not (DATI / "specie" / f"{sid}.json").exists():
            avv(f"{nome}: specie_simili '{sid}' non ha ancora una scheda (nell'app appare come 'in arrivo')")
        if not sim.get("come_distinguere"):
            err(f"{nome}: specie_simili '{sid}' senza testo 'come_distinguere'")
    tipi = set()
    for im in s.get("immagini", []):
        if im.get("tipo") not in voc["tipo_immagine"]:
            err(f"{nome}: immagine con tipo '{im.get('tipo')}' non valido")
        tipi.add(im.get("tipo"))
        f = APP / im.get("file", "")
        if not f.is_file():
            err(f"{nome}: immagine '{im.get('file')}' non trovata")
        for k in ("autore", "licenza", "url_originale", "fonte"):
            if k == "url_originale" and im.get("fonte", "").startswith("Foto fornita"):
                continue
            if not im.get(k):
                err(f"{nome}: immagine '{im.get('file')}' senza '{k}'")
        if re.search(r"\b(NC|ND)\b", im.get("licenza", "")):
            err(f"{nome}: immagine '{im.get('file')}' con licenza non libera ({im.get('licenza')})")
    for im in s.get("immagini", []):
        if im.get("stagione") and im["stagione"] not in ("primavera", "estate", "autunno", "inverno"):
            err(f"{nome}: immagine '{im.get('file')}' con stagione '{im['stagione']}' non valida")
    # ordine fisso nella galleria: portamento (non invernale) per primo
    ORDINE = {"silhouette": 0, "foglia": 1, "fiore_o_frutto": 2, "corteccia": 3, "gemme": 4, "dettaglio": 5}
    s["immagini"] = sorted(s.get("immagini", []), key=lambda im: 9 if (im["tipo"] == "silhouette" and im.get("stagione") == "inverno") else ORDINE.get(im["tipo"], 6))
    if len(s.get("immagini", [])) < 2:
        avv(f"{nome}: meno di 2 immagini")
    species.append(s)

# reciprocità delle specie simili (solo avviso)
per_id = {s["id"]: s for s in species}
for s in species:
    for sim in s.get("specie_simili", []):
        altra = per_id.get(sim["id_specie"])
        if altra and s["id"] not in [x["id_specie"] for x in altra.get("specie_simili", [])]:
            avv(f"{altra['id']}: non cita '{s['id']}' tra le specie simili (reciprocità)")

organs = []
for p in sorted((DATI / "organi").glob("*.json")):
    o = carica(p)
    if o is None:
        continue
    if o.get("campo_comparativo_riferimento") not in OBBLIGATORI:
        err(f"{p.stem}: campo_comparativo_riferimento '{o.get('campo_comparativo_riferimento')}' non è un campo delle schede")
    for c in o.get("concetti", []):
        if not c.get("termine") or not c.get("definizione"):
            err(f"{p.stem}: concetto incompleto {c}")
    organs.append(o)

landscape = []
for p in sorted((DATI / "paesaggio").glob("*.json")):
    l = carica(p)
    if l is None:
        continue
    if l.get("categoria") not in voc["categoria_paesaggio"]:
        err(f"{p.stem}: categoria '{l.get('categoria')}' non valida")
    for c in l.get("concetti", []):
        if not c.get("termine") or not c.get("definizione"):
            err(f"{p.stem}: concetto incompleto {c}")
    for k in ("id", "titolo", "descrizione", "come_riconoscerlo"):
        if not l.get(k):
            err(f"{p.stem}: manca '{k}'")
    landscape.append(l)

curiosita = []
fc = DATI / "curiosita.json"
if fc.exists():
    cd = carica(fc) or {}
    visti = set()
    for c in cd.get("curiosita", []):
        if not c.get("id") or not c.get("testo"):
            err(f"curiosita: voce incompleta {c}")
            continue
        if c["id"] in visti:
            err(f"curiosita: id ripetuto '{c['id']}'")
        visti.add(c["id"])
        if c.get("stagione") and c["stagione"] not in ("primavera", "estate", "autunno", "inverno"):
            err(f"curiosita {c['id']}: stagione '{c['stagione']}' non valida")
        for sid in c.get("specie", []):
            if sid not in ids_elenco:
                err(f"curiosita {c['id']}: specie '{sid}' non esiste nell'elenco")
        curiosita.append(c)

# aggiorna lo stato nell'elenco (compilata / non)
for s in elenco["specie"]:
    compilata = s["id"] in per_id
    if compilata:
        s["stato"] = "compilata"
    elif s["stato"] == "compilata":
        s["stato"] = "pianificata"

species.sort(key=lambda s: s["nome_comune"].lower())
out = {
    "schema_version": SCHEMA_VERSION,
    "generato": datetime.date.today().isoformat(),
    "species": species,
    "organs": organs,
    "landscape_signals": landscape,
    "curiosita": curiosita,
    "elenco_specie": elenco["specie"],
    "vocabolari": {k: v for k, v in voc.items() if not k.startswith("_")},
    "notebook": [],
}

for a in avvisi:
    print("AVVISO:", a)
for e in errori:
    print("ERRORE:", e)
print(f"\nSpecie: {len(species)} · Organi: {len(organs)} · Paesaggio: {len(landscape)} · "
      f"Errori: {len(errori)} · Avvisi: {len(avvisi)}")
if errori:
    print("File NON scritto: correggi gli errori.")
    sys.exit(1)
(DATI / "alberi-data.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("Scritto dati/alberi-data.json")
