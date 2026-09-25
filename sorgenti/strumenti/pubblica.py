#!/usr/bin/env python3
"""Prepara la cartella del repository GitHub con la nuova versione dell'app.

Uso:  python3 strumenti/pubblica.py <cartella-del-repository-clonato>
      (dalla cartella app/, dopo python3 strumenti/build.py)

Cosa fa:
- svuota la cartella del repository (tranne .git);
- copia nella radice il contenuto di dist/ (l'app pubblicata da GitHub Pages);
- copia README.md, CHANGELOG.md, MANUTENZIONE.md;
- copia in sorgenti/ il progetto (src/, dati/ senza il file generato, strumenti/), senza le foto,
  che sono gia in img/ alla radice.
Non fa commit ne push: quelli si fanno dopo con git, con le credenziali.
"""
import shutil, sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
if len(sys.argv) != 2:
    sys.exit(__doc__)
REPO = Path(sys.argv[1]).resolve()
if not (REPO / ".git").is_dir():
    sys.exit(f"{REPO} non e un repository git")
DIST = APP / "dist"
if not (DIST / "index.html").exists():
    sys.exit("dist/ manca: esegui prima python3 strumenti/build.py")

for x in REPO.iterdir():
    if x.name == ".git":
        continue
    shutil.rmtree(x) if x.is_dir() else x.unlink()

for x in DIST.iterdir():
    (shutil.copytree if x.is_dir() else shutil.copy2)(x, REPO / x.name)
for doc in ("README.md", "CHANGELOG.md", "MANUTENZIONE.md"):
    shutil.copy2(APP / doc, REPO / doc)

SORG = REPO / "sorgenti"
ignora = shutil.ignore_patterns("__pycache__", "*.pyc", "alberi-data.json")
for d in ("src", "dati", "strumenti"):
    shutil.copytree(APP / d, SORG / d, ignore=ignora)
(SORG / "LEGGIMI.txt").write_text(
    "Copia del progetto Parco Capello (vedi MANUTENZIONE.md nella radice).\n"
    "Per ricostruire la cartella di lavoro: copia src/, dati/, strumenti/ in una cartella app/,\n"
    "aggiungi img/ prendendola dalla radice del repository, poi esegui python3 strumenti/build.py.\n",
    encoding="utf-8")

n = sum(1 for p in REPO.rglob("*") if p.is_file() and ".git" not in p.parts)
print(f"Repository pronto: {n} file in {REPO}")
