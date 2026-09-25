#!/usr/bin/env python3
"""Costruisce l'app pronta da pubblicare.

Uso:  python3 strumenti/build.py          (dalla cartella app/)

Produce:
  dist/                      la PWA da caricare sull'hosting (GitHub Pages o simili)
  dist-singolo/parco-capello.html   tutta l'app in un solo file (anteprima / riserva)

Passi: 1) unisce e controlla i dati (componi_dati.py)  2) copia src/, dati e immagini in dist/
       3) scrive in sw.js la lista dei file e una versione nuova (così il telefono si aggiorna)
       4) crea la versione a file unico con dati, immagini e caratteri incorporati.
"""
import base64, hashlib, json, re, shutil, subprocess, sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
SRC, DIST, SINGOLO = APP / "src", APP / "dist", APP / "dist-singolo"

# 1) dati
r = subprocess.run([sys.executable, str(APP / "strumenti" / "componi_dati.py")])
if r.returncode:
    sys.exit("Build interrotta: correggi prima gli errori nei dati.")
dati_path = APP / "dati" / "alberi-data.json"
dati = json.loads(dati_path.read_text(encoding="utf-8"))

# 2) dist/
if DIST.exists():
    try:
        shutil.rmtree(DIST)
    except PermissionError:
        sys.exit("Non riesco a svuotare dist/ (permesso di cancellazione negato). Cancella a mano la cartella dist e riprova.")
shutil.copytree(SRC, DIST)
(DIST / "dati").mkdir()
shutil.copy2(dati_path, DIST / "dati" / "alberi-data.json")
immagini = sorted({im["file"] for s in dati["species"] for im in s.get("immagini", [])} |
                  {im["file"] for l in dati["landscape_signals"] for im in l.get("immagini", [])})
for f in immagini:
    (DIST / f).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(APP / f, DIST / f)
(DIST / ".nojekyll").write_text("")  # GitHub Pages: pubblica i file così come sono

# 3) service worker con lista file e versione
files = sorted(p.relative_to(DIST).as_posix() for p in DIST.rglob("*")
               if p.is_file() and p.name not in ("sw.js", ".nojekyll") and not p.name.startswith("LICENSE"))
h = hashlib.sha256()
for f in files:
    h.update(f.encode()); h.update((DIST / f).read_bytes())
versione = h.hexdigest()[:10]
sw = (DIST / "sw.js").read_text(encoding="utf-8")
sw = sw.replace("__VERSIONE__", versione).replace("__FILE__", json.dumps(["./"] + files, indent=1))
(DIST / "sw.js").write_text(sw, encoding="utf-8")
peso = sum((DIST / f).stat().st_size for f in files) / 1e6
print(f"\ndist/ pronta: {len(files)} file, {peso:.1f} MB, versione {versione}")

# 3b) cartelle "da_caricare": GitHub via browser accetta max 100 file per volta
DC = APP / "da_caricare"
try:
    if DC.exists():
        shutil.rmtree(DC)
    imgs = sorted(p.name for p in (DIST / "img").iterdir())
    blocchi = [imgs[i:i + 90] for i in range(0, len(imgs), 90)]
    b1 = DC / "1_app"
    b1.mkdir(parents=True)
    for x in DIST.iterdir():
        if x.name in ("img", "sw.js"):
            continue
        (shutil.copytree if x.is_dir() else shutil.copy2)(x, b1 / x.name)
    for n, bl in enumerate(blocchi, start=2):
        d = DC / f"{n}_foto" / "img"
        d.mkdir(parents=True)
        for f in bl:
            shutil.copy2(DIST / "img" / f, d / f)
    ultimo = DC / f"{len(blocchi) + 2}_sw_per_ultimo"
    ultimo.mkdir()
    shutil.copy2(DIST / "sw.js", ultimo / "sw.js")
    print(f"da_caricare/: {len(blocchi) + 2} gruppi da caricare su GitHub, in ordine")
except PermissionError:
    print("Attenzione: non riesco a svuotare da_caricare/ (cancellala a mano).")

# 4) file unico
def data_uri(p, mime):
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
css = (SRC / "style.css").read_text(encoding="utf-8")
css = re.sub(r"url\((fonts/[^)]+\.woff2)\)", lambda m: f"url({data_uri(SRC / m.group(1), 'font/woff2')})", css)
img_map = {f: data_uri(APP / f, "image/jpeg") for f in immagini}
safe = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
html = (SRC / "index.html").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
html = re.sub(r'<link rel="(manifest|apple-touch-icon)"[^>]*>\n?', "", html)
html = html.replace('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">',
                    f'<link rel="icon" href="{data_uri(SRC / "icons" / "icon.svg", "image/svg+xml")}">')
html = html.replace("<!--DATI-->", f"<script>window.__DATA__={safe(dati)};window.__IMG__={safe(img_map)};</script>")
js = (SRC / "app.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
html = html.replace('<script src="app.js"></script>', f"<script>{js}</script>")
SINGOLO.mkdir(exist_ok=True)
out = SINGOLO / "parco-capello.html"
out.write_text(html, encoding="utf-8")
print(f"dist-singolo/parco-capello.html: {out.stat().st_size / 1e6:.1f} MB")
