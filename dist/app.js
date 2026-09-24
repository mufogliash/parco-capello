/* Parco Capello — app personale per leggere gli alberi.
   Nessuna libreria esterna. Dati in dati/alberi-data.json, taccuino in IndexedDB.
   Struttura: utilità → dati → tema → taccuino (DB) → viste → router → avvio. */
'use strict';

const APP_VERSION = '0.1.0';

/* ---------- utilità ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IMG = window.__IMG__ || null;               // solo nella versione a file unico
const imgSrc = (p) => (IMG && IMG[p]) ? IMG[p] : p;
const store = {
  get(k, d) { try { const v = localStorage.getItem('pc.' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pc.' + k, v); } catch (e) { /* anteprima senza storage */ } },
};
function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
const oggiISO = () => new Date().toISOString().slice(0, 10);
const fmtData = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
const stagioneDi = (m) => (m >= 2 && m <= 4) ? 'primavera' : (m >= 5 && m <= 7) ? 'estate' : (m >= 8 && m <= 10) ? 'autunno' : 'inverno';
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

/* ---------- icone (tratto, colore = currentColor) ---------- */
const I = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>',
  key: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M6 12h10"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  hills: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
  cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
  book: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  cmp: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
};
const ico = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${I[n]}</svg>`;
const LEAF_SVG = `<svg viewBox="0 0 100 160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path fill="var(--leaf)" d="M50 8 C58 10 62 18 57 27 C67 24 75 32 66 41 C78 41 82 53 70 59 C81 63 81 77 68 79 C77 87 72 99 61 97 C63 107 57 114 51 112 L51 150 L49 150 L49 112 C43 114 37 107 39 97 C28 99 23 87 32 79 C19 77 19 63 30 59 C18 53 22 41 34 41 C25 32 33 24 43 27 C38 18 42 10 50 8 Z"/><path d="M50 14 L50 140 M50 34 L58 29 M50 34 L42 29 M50 48 L63 42 M50 48 L37 42 M50 64 L66 60 M50 64 L34 60 M50 82 L64 80 M50 82 L36 80 M50 100 L59 97 M50 100 L41 97"/></svg>`;
const testata = (titolo, back = true, extra = '') =>
  `<header class="top">${back ? `<button class="icon-btn" data-back aria-label="Indietro">${ico('back')}</button>` : ''}<h2>${esc(titolo)}</h2>${extra}</header>`;

/* ---------- dati ---------- */
let D = null, SP = {}, ELENCO = {}, VOC = {}, GLOSS = [];
async function caricaDati() {
  if (window.__DATA__) return window.__DATA__;
  const r = await fetch('dati/alberi-data.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('dati non trovati');
  return r.json();
}
function preparaDati(d) {
  D = d; VOC = d.vocabolari || {};
  d.species.forEach((s) => { SP[s.id] = s; });
  (d.elenco_specie || []).forEach((s) => { ELENCO[s.id] = s; });
  // glossario: termini + alias da tutti gli organi, dal più lungo al più corto
  const g = [];
  d.organs.forEach((o) => (o.concetti || []).forEach((c) => {
    [c.termine].concat(c.alias || []).forEach((t) => g.push({ t: t.toLowerCase(), c }));
  }));
  GLOSS = g.sort((a, b) => b.t.length - a.t.length);
}
const voc = (cat, k) => (VOC[cat] && VOC[cat][k]) || k;
const primaImg = (s, tipi = ['foglia', 'silhouette', 'fiore_o_frutto', 'corteccia']) => {
  for (const t of tipi) { const im = (s.immagini || []).find((i) => i.tipo === t); if (im) return im; }
  return (s.immagini || [])[0] || null;
};
const nomeSpecie = (id) => (SP[id] && SP[id].nome_comune) || (ELENCO[id] && ELENCO[id].nome_comune) || id;

/* collega i termini del glossario nel testo (una volta per termine per blocco) */
function glossa(testo) {
  let html = esc(testo);
  if (!GLOSS.length || !testo) return html;
  const usati = new Set();
  for (const g of GLOSS) {
    if (usati.has(g.c.termine)) continue;
    const re = new RegExp(`(^|[^\\p{L}])(${g.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu');
    // non sostituire dentro tag già creati
    const parti = html.split(/(<[^>]+>[^<]*<\/button>)/);
    let fatto = false;
    for (let i = 0; i < parti.length && !fatto; i += 2) {
      if (re.test(parti[i])) {
        parti[i] = parti[i].replace(re, (m, pre, parola) => `${pre}<button type="button" class="gl" data-gl="${esc(g.c.termine)}">${parola}</button>`);
        fatto = true;
      }
    }
    if (fatto) { html = parti.join(''); usati.add(g.c.termine); }
  }
  return html;
}
function concetto(termine) {
  for (const o of D.organs) for (const c of o.concetti || []) if (c.termine === termine) return { c, o };
  return null;
}

/* ---------- tema giorno / notte ---------- */
function applicaTema() {
  const t = store.get('tema', 'auto');
  const root = document.documentElement;
  if (t === 'giorno') root.dataset.theme = 'light';
  else if (t === 'notte') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  const scuro = t === 'notte' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => m.remove());
  const m = document.createElement('meta'); m.name = 'theme-color'; m.content = scuro ? '#171A14' : '#F4EFE3';
  document.head.appendChild(m);
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applicaTema);

/* ---------- taccuino: IndexedDB ---------- */
const DB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      let req;
      try { req = indexedDB.open('parco-capello', 1); } catch (e) { rej(e); return; }
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('note')) db.createObjectStore('note', { keyPath: 'id' }); };
      req.onsuccess = () => { this._db = req.result; res(this._db); };
      req.onerror = () => rej(req.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('note', mode); const st = t.objectStore('note');
      const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
    });
  },
  all() { return this.tx('readonly', (s) => s.getAll()).then((r) => (r || []).sort((a, b) => (b.data + b.id).localeCompare(a.data + a.id))); },
  get(id) { return this.tx('readonly', (s) => s.get(id)); },
  put(n) { return this.tx('readwrite', (s) => s.put(n)); },
  del(id) { return this.tx('readwrite', (s) => s.delete(id)); },
};
async function ridimensionaFoto(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
}
const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const dataURLToBlob = async (u) => (await fetch(u)).blob();
let urlDaLiberare = [];
const blobURL = (b) => { const u = URL.createObjectURL(b); urlDaLiberare.push(u); return u; };

/* ---------- viste ---------- */
const V = {};

V.home = () => {
  const now = new Date(); const stag = stagioneDi(now.getMonth());
  const conTesto = D.species.filter((s) => s.stagionalita && s.stagionalita[stag]);
  const giorno = Math.floor(now / 864e5);
  const scelte = conTesto.length ? [0, 1, 2].map((i) => conTesto[(giorno + i) % conTesto.length]).filter((v, i, a) => a.indexOf(v) === i) : [];
  return `
  <div class="hero">
    <div class="stack" style="gap:6px">
      <div class="kicker">${MESI[now.getMonth()]} · ${stag}</div>
      <h1>Parco<br><em>Capello</em></h1>
    </div>
    <a class="icon-btn" href="#/info" aria-label="Impostazioni e informazioni">${ico('gear')}</a>
  </div>
  <div class="pad stack" style="gap:18px">
    <form class="stack" style="gap:6px" data-cerca>
      <label for="q" class="muted" style="font-size:14px">Cerca per nome comune, latino o locale</label>
      <div class="search">${ico('search')}<input id="q" type="search" autocomplete="off" placeholder="es. farnia, Quercus, elce…"></div>
    </form>
    <div class="tiles">
      <a class="tile" href="#/identifica">${ico('key')}<span>Identifica</span></a>
      <a class="tile" href="#/specie">${ico('leaf')}<span>Specie</span></a>
      <a class="tile" href="#/organi">${ico('layers')}<span>Organi</span></a>
      <a class="tile" href="#/paesaggio">${ico('hills')}<span>Paesaggio</span></a>
    </div>
    ${scelte.length ? `<section class="card" aria-labelledby="mese">
      <div class="kicker" id="mese">In ${stag} guarda</div>
      ${scelte.map((s) => `<div><a href="#/specie/${s.id}/stagioni" style="font-family:var(--serif);font-size:19px;font-weight:600;text-decoration:none">${esc(s.nome_comune)}</a>
        <p class="prose" style="font-size:15px">${esc(s.stagionalita[stag])}</p></div>`).join('')}
    </section>` : ''}
    <p class="muted" style="font-size:13px">${D.species.length} schede · ${Object.keys(ELENCO).length} specie previste</p>
    <div class="space"></div>
  </div>`;
};

function rigaSpecie(s) {
  const im = primaImg(s);
  const th = im ? `<img class="thumb" src="${esc(imgSrc(im.file))}" alt="" loading="lazy">` : `<span class="thumb" style="color:var(--ink)">${LEAF_SVG}</span>`;
  return `<a class="item" href="#/specie/${s.id}">${th}<span class="t"><b>${esc(s.nome_comune)}</b><i>${esc(s.nome_scientifico)}</i></span><span class="chev">›</span></a>`;
}
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function cercaSpecie(q) {
  q = norm(q).trim();
  if (!q) return D.species;
  return D.species.filter((s) => [s.nome_comune, s.nome_scientifico, s.famiglia].concat(s.sinonimi || [], s.nomi_locali || []).some((x) => norm(x).includes(q)));
}

V.specie = (p, query) => {
  const q = query.get('q') || '';
  const filtro = query.get('f') || 'tutte';
  const filtri = { tutte: 'Tutte', latifoglia: 'Latifoglie', conifera: 'Conifere', sempreverde: 'Sempreverdi' };
  let lista = cercaSpecie(q);
  if (filtro === 'latifoglia' || filtro === 'conifera') lista = lista.filter((s) => s.chiave.gruppo === filtro);
  if (filtro === 'sempreverde') lista = lista.filter((s) => s.chiave.persistenza === 'sempreverde');
  const inArrivo = (D.elenco_specie || []).filter((e) => !SP[e.id] && e.stato !== 'proposta' && (!q || norm(e.nome_comune + ' ' + e.nome_scientifico).includes(norm(q))));
  return `${testata('Specie', true)}
  <div class="pad stack">
    <form data-cerca-specie><label for="qs" class="sr">Cerca specie</label>
      <div class="search">${ico('search')}<input id="qs" type="search" value="${esc(q)}" autocomplete="off" placeholder="Cerca…"></div></form>
    <div class="chips" role="group" aria-label="Filtro">${Object.entries(filtri).map(([k, v]) =>
      `<a class="chip ${k === filtro ? 'on' : ''}" href="#/specie?f=${k}${q ? '&q=' + encodeURIComponent(q) : ''}" style="text-decoration:none">${v}</a>`).join('')}</div>
    <div class="list">${lista.map(rigaSpecie).join('') || '<p class="empty">Nessuna scheda trovata.</p>'}</div>
    ${inArrivo.length ? `<details><summary class="muted" style="cursor:pointer;padding:8px 0">In arrivo (${inArrivo.length})</summary>
      <div class="list">${inArrivo.map((e) => `<div class="item off"><span class="thumb" style="color:var(--muted)">${LEAF_SVG}</span><span class="t"><b>${esc(e.nome_comune)}</b><i>${esc(e.nome_scientifico)}</i></span></div>`).join('')}</div></details>` : ''}
    <div class="space"></div>
  </div>`;
};

const SEZIONI = [
  ['riconosci', 'Riconoscila'], ['foglie', 'Foglie'], ['corteccia', 'Corteccia'], ['portamento', 'Portamento'],
  ['gemme', 'Gemme'], ['frutti', 'Fiori e frutti'], ['habitat', 'Dove vive'], ['stagioni', 'Stagioni'],
  ['usi', 'Usi e cautele'], ['simili', 'Simili'],
];
function campi(obj, etichette) {
  const righe = etichette.filter(([k]) => obj && obj[k]).map(([k, l]) => `<div><dt>${l}</dt><dd>${glossa(obj[k])}</dd></div>`).join('');
  return righe ? `<dl class="facts" style="grid-template-columns:1fr">${righe}</dl>` : '';
}
function sezioneSpecie(s, sez) {
  const ch = s.chiave, dim = s.dimensioni || {};
  switch (sez) {
    case 'riconosci': return `
      <ol class="keytraits">${(s.tratti_chiave || []).map((t, i) => `<li><b>${i + 1}</b><span>${glossa(t)}</span></li>`).join('')}</ol>
      <dl class="facts">
        <div><dt>Foglie</dt><dd>${esc(voc('persistenza', ch.persistenza).split(' (')[0])}</dd></div>
        <div><dt>Altezza</dt><dd>${dim.altezza_tipica_m ? dim.altezza_tipica_m.join('–') + ' m' : '—'}</dd></div>
        <div><dt>Quota</dt><dd>${ch.altitudine_m ? ch.altitudine_m.join('–') + ' m' : '—'}</dd></div>
        <div><dt>Fioritura</dt><dd>${esc((s.fiori_e_frutti || {}).periodo_fioritura || '—')}</dd></div>
        <div><dt>Famiglia</dt><dd>${esc(s.famiglia)}</dd></div>
        <div><dt>Frutto</dt><dd>${esc(voc('frutto', ch.frutto))}</dd></div>
      </dl>
      ${(s.specie_simili || []).map((x) => `<div class="card dashed"><h3>${esc(s.nome_comune)} o ${esc(nomeSpecie(x.id_specie).toLowerCase())}?</h3>
        <p class="prose" style="font-size:15px">${glossa(x.come_distinguere)}</p>
        ${SP[x.id_specie] ? `<a href="#/confronta/${s.id}/${x.id_specie}">Confronta punto per punto →</a>` : '<span class="muted" style="font-size:14px">Scheda in arrivo</span>'}</div>`).slice(0, 1).join('')}`;
    case 'foglie': return campi(s.foglie, [['tipo', 'Tipo'], ['disposizione', 'Disposizione'], ['forma', 'Forma'], ['margine', 'Margine'], ['venatura', 'Venatura']]) +
      campi(s.foglie.colore_stagionale, [['primavera_estate', 'Colore in primavera-estate'], ['autunno', 'In autunno']]) +
      `<p class="prose">${glossa(s.foglie.descrizione)}</p>`;
    case 'corteccia': return campi(s.corteccia, [['colore', 'Colore'], ['texture', 'Superficie'], ['evoluzione_con_eta', 'Con l’età']]) + `<p class="prose">${glossa(s.corteccia.descrizione)}</p>`;
    case 'portamento': return campi(s.rami_e_portamento, [['forma_chioma', 'Chioma'], ['disposizione_rami', 'Rami'], ['angolo_di_crescita', 'Crescita'], ['silhouette_invernale', 'Sagoma in inverno']]) + `<p class="prose">${glossa(s.rami_e_portamento.descrizione)}</p>`;
    case 'gemme': return campi(s.gemme, [['forma', 'Forma'], ['colore', 'Colore'], ['disposizione', 'Disposizione']]) + `<p class="prose">${glossa(s.gemme.descrizione)}</p>`;
    case 'frutti': return campi(s.fiori_e_frutti, [['tipo_fiore', 'Fiori'], ['periodo_fioritura', 'Fioritura'], ['tipo_frutto', 'Frutto'], ['periodo_fruttificazione', 'Maturazione']]) + `<p class="prose">${glossa(s.fiori_e_frutti.descrizione)}</p>`;
    case 'habitat': { const h = s.habitat_e_distribuzione; return `
      <div class="chips">${ch.habitat.map((x) => `<span class="chip tag neutral">${esc(voc('habitat', x))}</span>`).join('')}</div>
      <dl class="facts" style="grid-template-columns:1fr">
        <div><dt>In Italia</dt><dd><ul style="margin:0;padding-left:18px">${h.regioni_italia.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></dd></div>
        <div><dt>Quota</dt><dd>${esc(h.altitudine)}</dd></div>
        <div><dt>Terreno</dt><dd>${glossa(h.terreno_preferito)}</dd></div>
        <div><dt>Dimensioni</dt><dd>${dim.altezza_tipica_m ? `alta in genere ${dim.altezza_tipica_m.join('–')} m${dim.altezza_max_m ? ', fino a ' + dim.altezza_max_m + ' m' : ''}` : ''}${dim.eta_massima_anni ? `; età massima ${[].concat(dim.eta_massima_anni).join('–')} anni` : ''}${dim.note ? '. ' + esc(dim.note) : ''}</dd></div>
        <div><dt>Origine</dt><dd>${esc(voc('origine', s.origine.stato))}${s.origine.note ? ' — ' + esc(s.origine.note) : ''}</dd></div>
      </dl><p class="prose">${glossa(h.descrizione)}</p>`; }
    case 'stagioni': return `<dl class="facts" style="grid-template-columns:1fr">${['primavera', 'estate', 'autunno', 'inverno'].map((k) =>
      `<div><dt>${k}</dt><dd>${glossa(s.stagionalita[k] || '—')}</dd></div>`).join('')}</dl>`;
    case 'usi': { const c = s.commestibilita, t = s.tossicita; return `
      ${c && c.parti ? `<div class="card plain"><div class="kicker">Commestibilità · ${esc(c.parti)}</div><p class="prose" style="font-size:15px">${glossa(c.note)}</p>${c.avvertenze ? `<p style="font-size:15px"><b>Attenzione:</b> ${esc(c.avvertenze)}</p>` : ''}</div>` : ''}
      <div class="card ${t.livello === 'moderata' || t.livello === 'alta' ? 'warn' : 'plain'}"><div class="kicker">Tossicità · ${esc(voc('tossicita_livello', t.livello))}</div>${t.parti ? `<p style="font-size:15px"><b>Parti:</b> ${esc(t.parti)}</p>` : ''}<p class="prose" style="font-size:15px">${esc(t.note)}</p></div>
      <p class="prose">${glossa(s.curiosita_e_usi)}</p>
      <p class="muted" style="font-size:13px">Le informazioni su commestibilità e tossicità sono generali: non sostituiscono il parere di un esperto.</p>
      ${(s.fonti || []).length ? `<div><div class="kicker">Per approfondire</div><ul style="padding-left:18px;margin:6px 0 0">${s.fonti.map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titolo)}</a></li>`).join('')}</ul></div>` : ''}`; }
    case 'simili': return (s.specie_simili || []).map((x) => `<div class="card dashed"><h3>${esc(nomeSpecie(x.id_specie))}</h3>
        <p class="prose" style="font-size:15px">${glossa(x.come_distinguere)}</p>
        ${SP[x.id_specie] ? `<div class="row" style="gap:16px"><a href="#/specie/${x.id_specie}">Apri scheda</a><a href="#/confronta/${s.id}/${x.id_specie}">Confronta →</a></div>` : '<span class="muted" style="font-size:14px">Scheda in arrivo</span>'}</div>`).join('') || '<p class="empty">Nessuna specie simile indicata.</p>';
  }
  return '';
}
V.scheda = ([id, sez = 'riconosci']) => {
  const s = SP[id];
  if (!s) return `${testata('Specie')}<p class="empty">Scheda non trovata${ELENCO[id] ? ': ' + esc(ELENCO[id].nome_comune) + ' è in arrivo' : ''}.</p>`;
  const ims = s.immagini || [];
  const gal = ims.length ? `<div class="gallery" data-gallery>${ims.map((im, i) => `<figure><img src="${esc(imgSrc(im.file))}" alt="${esc(s.nome_comune + ': ' + voc('tipo_immagine', im.tipo))}" data-view="${i}" ${i ? 'loading="lazy"' : ''}><figcaption>${esc(voc('tipo_immagine', im.tipo))} · ${esc(im.autore)} · ${esc(im.licenza)}</figcaption></figure>`).join('')}</div>
      ${ims.length > 1 ? `<div class="dots" aria-hidden="true">${ims.map(() => '<i></i>').join('')}</div>` : ''}`
    : `<div class="gallery"><div class="ph" style="flex:1;color:var(--ink)">${LEAF_SVG}</div></div>`;
  return `${testata(s.nome_comune)}
  ${gal}
  <div class="pad stack" style="padding-top:16px;gap:4px">
    <h1>${esc(s.nome_comune)}</h1>
    <div class="latin" style="font-size:18px;color:var(--ink2)">${esc(s.nome_scientifico)} · ${esc(s.famiglia)}</div>
    ${s.sinonimi && s.sinonimi.length ? `<div class="muted" style="font-size:14px">Anche: ${esc(s.sinonimi.join(', '))}</div>` : ''}
    <div class="chips" style="padding-top:8px">
      <span class="chip tag">${esc(voc('persistenza', s.chiave.persistenza).split(' (')[0])}</span>
      <span class="chip tag">${esc(voc('origine', s.origine.stato))}</span>
      ${s.tossicita.livello === 'moderata' || s.tossicita.livello === 'alta' ? `<span class="chip tag" style="border-color:var(--warn);color:var(--warn)">Tossica</span>` : ''}
    </div>
  </div>
  <nav class="tabs" aria-label="Sezioni" style="margin-top:14px">${SEZIONI.map(([k, l]) => `<a href="#/specie/${s.id}/${k}" class="${k === sez ? 'on' : ''}" ${k === sez ? 'aria-current="page"' : ''} data-replace>${l}</a>`).join('')}</nav>
  <div class="pad stack" style="padding-top:16px;gap:14px">
    ${sezioneSpecie(s, sez)}
    <a class="btn block" href="#/taccuino/nuova?specie=${s.id}" style="margin-top:8px">${ico('plus', 'width="20" height="20"')} Aggiungi al taccuino</a>
    <div class="space"></div>
  </div>`;
};

/* identificazione a filtri */
const DOMANDE = [
  { k: 'gruppo', t: 'Foglie larghe o aghi?', lab: { latifoglia: 'Foglie larghe', conifera: 'Aghi o squame' } },
  { k: 'persistenza', t: 'D’inverno com’è?', lab: { caduca: 'Spoglio', marcescente: 'Foglie secche sui rami', sempreverde: 'Verde' } },
  { k: 'foglia_tipo', t: 'Com’è la foglia?' },
  { k: 'foglia_disposizione', t: 'Come sono attaccate al rametto?' },
  { k: 'foglia_margine', t: 'Com’è il bordo?' },
  { k: 'frutto', t: 'Che frutto trovi?' },
  { k: 'corteccia_texture', t: 'Com’è la corteccia?' },
  { k: 'habitat', t: 'Dove ti trovi?' },
];
const VOCDI = { gruppo: 'gruppo', persistenza: 'persistenza', foglia_tipo: 'foglia_tipo', foglia_disposizione: 'foglia_disposizione', foglia_margine: 'foglia_margine', frutto: 'frutto', corteccia_texture: 'corteccia_texture', habitat: 'habitat' };
const combacia = (s, k, v) => { const x = s.chiave[k]; return Array.isArray(x) ? x.includes(v) : x === v; };
V.identifica = (p, query) => {
  const sel = {}; DOMANDE.forEach((d) => { if (query.get(d.k)) sel[d.k] = query.get(d.k); });
  const quota = parseInt(query.get('quota') || '', 10);
  const filtra = (escludi) => D.species.filter((s) => Object.entries(sel).every(([k, v]) => k === escludi || combacia(s, k, v)) &&
    (isNaN(quota) || (quota >= s.chiave.altitudine_m[0] - 200 && quota <= s.chiave.altitudine_m[1] + 200)));
  const risultato = filtra(null);
  const link = (k, v) => { const q = new URLSearchParams(query); if (v == null || q.get(k) === v) q.delete(k); else q.set(k, v); const str = q.toString(); return '#/identifica' + (str ? '?' + str : ''); };
  const blocchi = DOMANDE.map((d) => {
    const base = filtra(d.k);
    const valori = new Set(); D.species.forEach((s) => [].concat(s.chiave[d.k]).forEach((v) => valori.add(v)));
    const chips = Array.from(valori).map((v) => {
      const n = base.filter((s) => combacia(s, d.k, v)).length; const on = sel[d.k] === v;
      const et = (d.lab && d.lab[v]) || voc(VOCDI[d.k], v);
      return (n || on) ? `<a class="chip ${on ? 'on' : ''}" href="${link(d.k, v)}" data-replace style="text-decoration:none">${esc(et)} <span class="n">${n}</span></a>` : '';
    }).join('');
    return `<section class="stack" style="gap:8px"><h3>${d.t}</h3><div class="chips">${chips}</div></section>`;
  }).join('');
  const nSel = Object.keys(sel).length + (isNaN(quota) ? 0 : 1);
  return `${testata('Identifica')}
  <div class="pad stack" style="gap:18px">
    <p class="muted" style="font-size:15px">Scegli solo ciò che vedi con sicurezza: puoi saltare qualsiasi domanda. Il numero indica quante specie restano.</p>
    <div class="card plain" style="position:sticky;top:64px;z-index:3">
      <div class="row" style="justify-content:space-between"><b style="font-family:var(--serif);font-size:20px">${risultato.length} ${risultato.length === 1 ? 'specie' : 'specie'} compatibil${risultato.length === 1 ? 'e' : 'i'}</b>
      ${nSel ? `<a href="#/identifica" data-replace>Azzera</a>` : ''}</div>
      ${nSel ? `<div class="list">${risultato.slice(0, 6).map(rigaSpecie).join('') || '<p class="muted">Nessuna: togli un criterio.</p>'}</div>` : ''}
    </div>
    ${blocchi}
    <section class="stack" style="gap:8px"><h3>A che quota sei? (facoltativo)</h3>
      <form data-quota class="row"><label for="quota" class="sr">Quota in metri</label>
      <input id="quota" type="number" inputmode="numeric" min="0" max="4000" step="50" value="${isNaN(quota) ? '' : quota}" placeholder="metri" style="width:130px;height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;background:var(--surface)">
      <button class="btn small" type="submit">Applica</button></form></section>
    <div class="space"></div>
  </div>`;
};

/* organi */
const ORGANI_PREVISTI = [['organ-foglie', 'Foglie'], ['organ-corteccia', 'Corteccia'], ['organ-rami', 'Rami'], ['organ-radici', 'Radici'], ['organ-gemme', 'Gemme'], ['organ-portamento', 'Portamento']];
V.organi = () => `${testata('Organi')}
  <div class="pad stack"><p class="muted">Teoria e confronto tra specie, organo per organo.</p>
  <div class="list">${ORGANI_PREVISTI.map(([id, n]) => { const o = D.organs.find((x) => x.id === id);
    return o ? `<a class="item" href="#/organi/${id}"><span class="t"><b>${esc(o.nome)}</b><i>${(o.concetti || []).length} concetti</i></span><span class="chev">›</span></a>`
      : `<div class="item off"><span class="t"><b>${n}</b><i>in arrivo</i></span></div>`; }).join('')}</div></div>`;
const CAMPO_SINTESI = { foglie: (s) => `${s.foglie.forma}; margine ${s.foglie.margine}.`, corteccia: (s) => s.corteccia.texture, rami_e_portamento: (s) => s.rami_e_portamento.forma_chioma, gemme: (s) => s.gemme.forma };
V.organo = ([id]) => {
  const o = D.organs.find((x) => x.id === id); if (!o) return `${testata('Organi')}<p class="empty">Sezione in arrivo.</p>`;
  const campo = o.campo_comparativo_riferimento; const sint = CAMPO_SINTESI[campo];
  return `${testata(o.nome)}
  <div class="pad stack" style="gap:18px">
    <p class="prose">${esc(o.descrizione_generale)}</p>
    ${o.ordine_osservazione ? `<div class="card"><div class="kicker">Cosa guardare, in ordine</div><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${o.ordine_osservazione.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
    <section class="stack"><h2>Glossario</h2>
      <dl class="facts" style="grid-template-columns:1fr">${(o.concetti || []).map((c) => `<div id="t-${esc(c.termine.replace(/\s+/g, '-'))}"><dt>${esc(c.termine)}</dt><dd>${esc(c.definizione)}</dd></div>`).join('')}</dl></section>
    <section class="stack"><h2>Confronto tra le specie</h2>
      <div class="list">${D.species.map((s) => `<a class="item" href="#/specie/${s.id}/${campo === 'rami_e_portamento' ? 'portamento' : campo}"><span class="t"><b>${esc(s.nome_comune)}</b><span style="font-size:14px;color:var(--ink2)">${esc(sint ? sint(s) : (s[campo] || {}).descrizione || '')}</span></span><span class="chev">›</span></a>`).join('')}</div></section>
    <div class="space"></div>
  </div>`;
};

/* confronto tra due specie */
V.confronta = ([a, b]) => {
  const A = SP[a], B = SP[b]; if (!A) return `${testata('Confronta')}<p class="empty">Specie non trovata.</p>`;
  const altre = D.species.filter((s) => s.id !== a);
  if (!B) return `${testata('Confronta ' + A.nome_comune)}<div class="pad stack"><p class="muted">Con quale specie?</p><div class="list">${altre.map((s) => `<a class="item" href="#/confronta/${a}/${s.id}" data-replace><span class="t"><b>${esc(s.nome_comune)}</b><i>${esc(s.nome_scientifico)}</i></span><span class="chev">›</span></a>`).join('')}</div></div>`;
  const dist = (A.specie_simili || []).find((x) => x.id_specie === b) || (B.specie_simili || []).find((x) => x.id_specie === a);
  const righe = [
    ['Riconoscerla', (s) => (s.tratti_chiave || []).map((t) => '• ' + esc(t)).join('<br>')],
    ['Foglie', (s) => esc(voc('persistenza', s.chiave.persistenza).split(' (')[0]) + '. ' + esc(s.foglie.forma)],
    ['Margine e picciolo', (s) => esc(s.foglie.margine)],
    ['Pagina inferiore / colore', (s) => esc(s.foglie.colore_stagionale.primavera_estate)],
    ['Corteccia', (s) => esc(s.corteccia.texture)],
    ['Gemme', (s) => esc(s.gemme.forma + ', ' + s.gemme.colore)],
    ['Frutto', (s) => esc(s.fiori_e_frutti.tipo_frutto)],
    ['Chioma', (s) => esc(s.rami_e_portamento.forma_chioma)],
    ['Dove vive', (s) => esc(s.habitat_e_distribuzione.altitudine + '; ' + s.habitat_e_distribuzione.terreno_preferito)],
  ];
  return `${testata('Confronto')}
  <div class="pad stack" style="gap:16px">
    <div class="cmp"><div class="cols" style="font-size:16px"><a href="#/specie/${a}"><b style="font-size:20px">${esc(A.nome_comune)}</b></a><a href="#/specie/${b}"><b style="font-size:20px">${esc(B.nome_comune)}</b></a></div></div>
    ${dist ? `<div class="card dashed"><div class="kicker">La differenza chiave</div><p class="prose" style="font-size:15px">${glossa(dist.come_distinguere)}</p></div>` : ''}
    <div class="cmp">${righe.map(([t, f]) => `<div class="r"><h3>${t}</h3><div class="cols"><div>${f(A)}</div><div>${f(B)}</div></div></div>`).join('')}</div>
    <a href="#/confronta/${a}" data-replace>Confronta ${esc(A.nome_comune.toLowerCase())} con un’altra specie</a>
    <div class="space"></div>
  </div>`;
};

/* paesaggio */
V.paesaggio = () => `${testata('Leggere il paesaggio')}
  <div class="pad stack" style="gap:20px"><p class="muted">Cosa raccontano forma, tronco ed età degli alberi su vento, luce, acqua e storia del luogo.</p>
  ${Object.entries(VOC.categoria_paesaggio || {}).map(([k, n]) => { const voci = D.landscape_signals.filter((l) => l.categoria === k);
    return `<section class="stack" style="gap:4px"><div class="kicker">${esc(n)}</div><div class="list">${voci.length ? voci.map((l) => `<a class="item" href="#/paesaggio/${l.id}"><span class="t"><b>${esc(l.titolo)}</b></span><span class="chev">›</span></a>`).join('') : '<p class="muted" style="padding:8px 0">In arrivo</p>'}</div></section>`; }).join('')}
  <div class="space"></div></div>`;
V.segnale = ([id]) => {
  const l = D.landscape_signals.find((x) => x.id === id); if (!l) return `${testata('Paesaggio')}<p class="empty">Non trovato.</p>`;
  return `${testata(voc('categoria_paesaggio', l.categoria))}
  <div class="pad stack" style="gap:16px"><h1 style="font-size:28px">${esc(l.titolo)}</h1>
  <p class="prose">${glossa(l.descrizione)}</p>
  <div class="card"><div class="kicker">Come riconoscerlo</div><p class="prose" style="font-size:15px">${glossa(l.come_riconoscerlo)}</p></div>
  ${(l.immagini || []).map((im) => `<figure style="margin:0"><img src="${esc(imgSrc(im.file))}" alt="" style="width:100%;border-radius:12px"><figcaption class="muted" style="font-size:12px">${esc(im.autore)} · ${esc(im.licenza)}</figcaption></figure>`).join('')}
  <div class="space"></div></div>`;
};

/* ripasso (quiz) */
let QUIZ = { punti: 0, fatte: 0, dom: null };
function nuovaDomanda() {
  const pool = D.species; if (pool.length < 2) return null;
  const giusta = pool[Math.floor(Math.random() * pool.length)];
  const conFoto = (giusta.immagini || []).length && Math.random() < 0.6;
  const altre = pool.filter((s) => s.id !== giusta.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const opzioni = altre.concat([giusta]).sort(() => Math.random() - 0.5);
  if (conFoto) { const im = giusta.immagini[Math.floor(Math.random() * giusta.immagini.length)]; return { tipo: 'foto', giusta, opzioni, im }; }
  const t = giusta.tratti_chiave[Math.floor(Math.random() * giusta.tratti_chiave.length)];
  return { tipo: 'tratto', giusta, opzioni, t };
}
V.ripasso = () => {
  if (!QUIZ.dom) QUIZ.dom = nuovaDomanda();
  const q = QUIZ.dom; if (!q) return `${testata('Ripasso', false)}<p class="empty">Servono almeno due schede.</p>`;
  return `${testata('Ripasso', false, `<span class="muted" style="font-size:14px">${QUIZ.punti}/${QUIZ.fatte}</span>`)}
  <div class="pad stack" style="gap:14px">
    ${q.tipo === 'foto' ? `<img class="quiz-img" src="${esc(imgSrc(q.im.file))}" alt="Foto da riconoscere (${esc(voc('tipo_immagine', q.im.tipo))})"><p class="kicker">${esc(voc('tipo_immagine', q.im.tipo))}: di che albero è?</p>`
      : `<div class="card"><div class="kicker">Quale albero ha questo carattere?</div><p style="font-family:var(--serif);font-size:21px;line-height:1.25">${esc(q.t)}</p></div>`}
    <div class="stack" style="gap:10px" data-quiz>${q.opzioni.map((o) => `<button class="opt" data-risp="${o.id}">${esc(o.nome_comune)} <span class="latin muted" style="font-size:14px">${esc(o.nome_scientifico)}</span></button>`).join('')}</div>
    <div data-esito></div>
  </div>`;
};

/* taccuino */
V.taccuino = async () => {
  let note;
  try { note = await DB.all(); } catch (e) { return `${testata('Taccuino', false)}<div class="pad"><p class="card warn">Il taccuino non è disponibile qui (memoria del browser bloccata). Nell’app installata funziona normalmente.</p></div>`; }
  const viste = new Set(note.map((n) => n.specie_id).filter(Boolean));
  return `${testata('Taccuino', false, `<a class="icon-btn" href="#/taccuino/nuova" aria-label="Nuova nota">${ico('plus')}</a>`)}
  <div class="pad stack" style="gap:16px">
    <div class="card"><div class="kicker">Specie viste</div><b style="font-family:var(--serif);font-size:24px">${viste.size} <span class="muted" style="font-size:16px;font-weight:400">su ${Object.keys(ELENCO).length} previste</span></b>
      ${viste.size ? `<div class="chips">${Array.from(viste).map((id) => `<a class="chip" href="#/specie/${id}" style="text-decoration:none">${esc(nomeSpecie(id))}</a>`).join('')}</div>` : ''}</div>
    <div class="list">${note.map((n) => `<a class="item" href="#/taccuino/${n.id}">${n.foto && n.foto.length ? `<img class="thumb" src="${blobURL(n.foto[0])}" alt="">` : `<span class="thumb" style="color:var(--muted)">${ico('book', 'style="width:26px;height:26px"')}</span>`}
      <span class="t"><b>${esc(n.specie_id ? nomeSpecie(n.specie_id) : (n.titolo || 'Nota'))}</b><i style="font-family:var(--sans);font-style:normal">${esc(fmtData(n.data))}${n.luogo ? ' · ' + esc(n.luogo) : ''}</i></span><span class="chev">›</span></a>`).join('') || '<p class="empty">Nessuna nota. Tocca + per iniziare.</p>'}</div>
    <div class="row" style="flex-wrap:wrap"><button class="btn ghost small" data-esporta>Esporta backup</button><label class="btn ghost small" style="cursor:pointer">Importa backup<input type="file" accept="application/json,.json" data-importa class="sr"></label></div>
    <p class="muted" style="font-size:13px">Le note restano solo su questo telefono. Fai un backup ogni tanto: se cancelli i dati del browser o cambi telefono, lo reimporti da qui.</p>
    <div class="space"></div>
  </div>`;
};
let BOZZA = null; // nota in modifica (con foto come Blob)
V.nota = async ([id], query) => {
  if (id === 'nuova') {
    if (!BOZZA || BOZZA.id) BOZZA = { id: null, data: oggiISO(), specie_id: query.get('specie') || '', luogo: '', titolo: '', testo: '', foto: [] };
  } else {
    let n; try { n = await DB.get(id); } catch (e) { n = null; }
    if (!n) return `${testata('Nota')}<p class="empty">Nota non trovata.</p>`;
    if (!BOZZA || BOZZA.id !== id) BOZZA = Object.assign({}, n, { foto: (n.foto || []).slice() });
  }
  const b = BOZZA;
  const opts = D.species.map((s) => `<option value="${s.id}" ${s.id === b.specie_id ? 'selected' : ''}>${esc(s.nome_comune)}</option>`).join('');
  const altre = (D.elenco_specie || []).filter((e) => !SP[e.id]).map((e) => `<option value="${e.id}" ${e.id === b.specie_id ? 'selected' : ''}>${esc(e.nome_comune)}</option>`).join('');
  return `${testata(b.id ? 'Modifica nota' : 'Nuova nota')}
  <form class="pad stack form" style="gap:16px" data-nota>
    <div><label for="n-specie">Specie</label><select id="n-specie" name="specie_id"><option value="">— non so / nessuna —</option><optgroup label="Con scheda">${opts}</optgroup>${altre ? `<optgroup label="Altre">${altre}</optgroup>` : ''}</select></div>
    <div><label for="n-titolo">Titolo (facoltativo)</label><input id="n-titolo" name="titolo" type="text" value="${esc(b.titolo)}" placeholder="es. Grande quercia al bivio"></div>
    <div class="row" style="gap:12px"><div style="flex:1"><label for="n-data">Data</label><input id="n-data" name="data" type="date" value="${esc(b.data)}"></div>
      <div style="flex:1.4"><label for="n-luogo">Luogo</label><input id="n-luogo" name="luogo" type="text" value="${esc(b.luogo)}" placeholder="es. Parco del Ticino"></div></div>
    <div><label for="n-testo">Note</label><textarea id="n-testo" name="testo" placeholder="Cosa hai notato? Foglie, corteccia, forma, dubbi…">${esc(b.testo)}</textarea></div>
    <div><span style="font-size:14px;font-weight:700;display:block;margin-bottom:6px">Foto</span>
      <div class="photos">${b.foto.map((f, i) => `<div class="p"><img src="${blobURL(f)}" alt="Foto ${i + 1}"><button type="button" data-togli-foto="${i}" aria-label="Rimuovi foto ${i + 1}">✕</button></div>`).join('')}
      <label class="btn ghost" style="aspect-ratio:1;height:auto;flex-direction:column;cursor:pointer">${ico('plus', 'width="22" height="22"')}<span style="font-size:13px">Aggiungi</span><input type="file" accept="image/*" capture="environment" multiple data-foto class="sr"></label></div></div>
    <button class="btn block" type="submit">Salva</button>
    ${b.id ? `<button class="btn danger block" type="button" data-elimina>Elimina nota</button>` : ''}
    <div class="space"></div>
  </form>`;
};

/* info e impostazioni */
V.info = () => {
  const t = store.get('tema', 'auto');
  const crediti = D.species.flatMap((s) => (s.immagini || []).map((im) => ({ s, im })));
  return `${testata('Impostazioni')}
  <div class="pad stack" style="gap:22px">
    <section class="stack" style="gap:8px"><h3>Aspetto</h3>
      <div class="seg" role="group" aria-label="Tema">${[['auto', 'Automatico'], ['giorno', 'Giorno'], ['notte', 'Notte']].map(([k, l]) => `<button data-tema="${k}" class="${k === t ? 'on' : ''}" aria-pressed="${k === t}">${l}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px">Automatico segue l’impostazione del telefono.</p></section>
    <section class="stack" style="gap:8px"><h3>Memoria</h3><p class="muted" style="font-size:15px" data-memoria>Controllo…</p></section>
    <section class="stack" style="gap:8px"><h3>Versione</h3>
      <p style="font-size:15px">App ${APP_VERSION} · dati del ${esc(D.generato)} · schema ${esc(D.schema_version)}<br>${D.species.length} schede, ${D.organs.length} sezioni teoriche, ${D.landscape_signals.length} segnali del paesaggio</p></section>
    <section class="stack" style="gap:8px"><h3>Crediti delle immagini</h3>
      ${crediti.length ? `<ul style="margin:0;padding-left:18px;font-size:14px;display:flex;flex-direction:column;gap:6px">${crediti.map(({ s, im }) => `<li>${esc(s.nome_comune)} (${esc(voc('tipo_immagine', im.tipo))}): ${esc(im.autore)}, <a href="${esc(im.url_originale)}" target="_blank" rel="noopener">${esc(im.licenza)}</a>, ${esc(im.fonte)}</li>`).join('')}</ul>` : '<p class="muted">Nessuna immagine ancora.</p>'}
      <p class="muted" style="font-size:13px">Caratteri tipografici Fraunces e Karla, licenza SIL Open Font License 1.1.</p></section>
    <div class="space"></div>
  </div>`;
};

/* ---------- router ---------- */
const ROTTE = [
  [/^\/$/, V.home, 'home'],
  [/^\/specie$/, V.specie, 'specie'],
  [/^\/specie\/([a-z0-9-]+)(?:\/([a-z]+))?$/, V.scheda, 'specie'],
  [/^\/identifica$/, V.identifica, 'identifica'],
  [/^\/organi$/, V.organi, 'home'],
  [/^\/organi\/([a-z0-9-]+)$/, V.organo, 'home'],
  [/^\/paesaggio$/, V.paesaggio, 'home'],
  [/^\/paesaggio\/([a-z0-9-]+)$/, V.segnale, 'home'],
  [/^\/confronta\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/, V.confronta, 'specie'],
  [/^\/ripasso$/, V.ripasso, 'ripasso'],
  [/^\/taccuino$/, V.taccuino, 'taccuino'],
  [/^\/taccuino\/([a-z0-9-]+)$/, V.nota, 'taccuino'],
  [/^\/info$/, V.info, 'home'],
];
let ultimaRotta = '';
async function vai() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const query = new URLSearchParams(qs || '');
  urlDaLiberare.forEach((u) => URL.revokeObjectURL(u)); urlDaLiberare = [];
  let html = null, tab = 'home';
  for (const [re, fn, t] of ROTTE) {
    const m = path.match(re);
    if (m) { html = await fn(m.slice(1).filter((x) => x !== undefined), query); tab = t; break; }
  }
  if (html == null) html = `${testata('Pagina non trovata')}<p class="empty"><a href="#/">Torna alla home</a></p>`;
  const app = $('#app'); app.innerHTML = html;
  $$('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  const stessaPagina = ultimaRotta.split('?')[0].split('/').slice(0, 3).join('/') === path.split('/').slice(0, 3).join('/');
  if (!stessaPagina) window.scrollTo(0, 0);
  ultimaRotta = h;
  dopoRender(path, query);
}

/* ---------- eventi dopo ogni render ---------- */
function dopoRender(path, query) {
  const app = $('#app');
  const cerca = $('[data-cerca]', app);
  if (cerca) cerca.addEventListener('submit', (e) => { e.preventDefault(); location.hash = '#/specie?q=' + encodeURIComponent($('#q').value); });
  const cs = $('[data-cerca-specie]', app);
  if (cs) {
    const inp = $('#qs', cs); let tmr;
    inp.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { const q = new URLSearchParams(query); if (inp.value) q.set('q', inp.value); else q.delete('q'); history.replaceState(null, '', '#/specie?' + q); vai().then(() => { const i = $('#qs'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 250); });
    cs.addEventListener('submit', (e) => e.preventDefault());
  }
  const fq = $('[data-quota]', app);
  if (fq) fq.addEventListener('submit', (e) => { e.preventDefault(); const q = new URLSearchParams(query); const v = $('#quota').value; if (v) q.set('quota', v); else q.delete('quota'); location.replace('#/identifica?' + q); });
  const gal = $('[data-gallery]', app);
  if (gal) {
    const dots = $$('.dots i', app);
    const agg = () => { const i = Math.round(gal.scrollLeft / gal.clientWidth); dots.forEach((d, k) => { d.style.background = k === i ? 'var(--accent)' : ''; }); };
    gal.addEventListener('scroll', agg, { passive: true }); agg();
  }
  // quiz
  const qz = $('[data-quiz]', app);
  if (qz) qz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-risp]'); if (!b || qz.dataset.fatto) return;
    qz.dataset.fatto = '1'; const q = QUIZ.dom; const ok = b.dataset.risp === q.giusta.id;
    QUIZ.fatte++; if (ok) QUIZ.punti++;
    $$('[data-risp]', qz).forEach((x) => { if (x.dataset.risp === q.giusta.id) x.classList.add('good'); else if (x === b) x.classList.add('bad'); });
    $('[data-esito]', app).innerHTML = `<div class="card ${ok ? '' : 'plain'}"><b style="font-family:var(--serif);font-size:19px">${ok ? 'Giusto!' : 'Era ' + esc(q.giusta.nome_comune) + '.'}</b>
      <p class="prose" style="font-size:15px">${esc(q.giusta.tratti_chiave.join(' · '))}</p>
      <div class="row" style="gap:12px;flex-wrap:wrap"><button class="btn small" data-avanti>Avanti</button><a href="#/specie/${q.giusta.id}">Apri scheda</a></div></div>`;
    $('.top span', app).textContent = `${QUIZ.punti}/${QUIZ.fatte}`;
    $('[data-avanti]', app).addEventListener('click', () => { QUIZ.dom = nuovaDomanda(); vai(); });
  });
  // tema
  $$('[data-tema]', app).forEach((b) => b.addEventListener('click', () => { store.set('tema', b.dataset.tema); applicaTema(); vai(); }));
  const mem = $('[data-memoria]', app);
  if (mem) (async () => {
    try {
      const pers = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      mem.textContent = (pers ? 'Memoria protetta: il telefono non cancellerà il taccuino da solo.' : 'Memoria non ancora protetta: installa l’app sulla schermata Home e fai backup regolari.') +
        (est ? ` Spazio usato: ${(est.usage / 1048576).toFixed(1)} MB.` : '');
    } catch (e) { mem.textContent = 'Informazione non disponibile.'; }
  })();
  // taccuino: esporta / importa
  const ex = $('[data-esporta]', app);
  if (ex) ex.addEventListener('click', esportaTaccuino);
  const im = $('[data-importa]', app);
  if (im) im.addEventListener('change', () => im.files[0] && importaTaccuino(im.files[0]));
  // nota
  const fn = $('[data-nota]', app);
  if (fn) {
    const leggi = () => { const f = new FormData(fn); ['specie_id', 'titolo', 'data', 'luogo', 'testo'].forEach((k) => { BOZZA[k] = f.get(k) || ''; }); };
    fn.addEventListener('input', leggi);
    $('[data-foto]', fn).addEventListener('change', async (e) => {
      leggi(); const files = Array.from(e.target.files || []);
      for (const f of files) { try { BOZZA.foto.push(await ridimensionaFoto(f)); } catch (err) { toast('Foto non leggibile'); } }
      vai();
    });
    $$('[data-togli-foto]', fn).forEach((b) => b.addEventListener('click', () => { leggi(); BOZZA.foto.splice(+b.dataset.togliFoto, 1); vai(); }));
    fn.addEventListener('submit', async (e) => {
      e.preventDefault(); leggi();
      const n = Object.assign({}, BOZZA); if (!n.id) n.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      n.modificata = new Date().toISOString();
      try { await DB.put(n); BOZZA = null; toast('Nota salvata'); location.replace('#/taccuino'); } catch (err) { toast('Impossibile salvare: memoria non disponibile'); }
    });
    const del = $('[data-elimina]', fn);
    if (del) del.addEventListener('click', async () => {
      if (!del.dataset.conferma) { del.dataset.conferma = '1'; del.textContent = 'Tocca di nuovo per eliminare'; setTimeout(() => { if (del.isConnected) { delete del.dataset.conferma; del.textContent = 'Elimina nota'; } }, 4000); return; }
      await DB.del(BOZZA.id); BOZZA = null; toast('Nota eliminata'); location.replace('#/taccuino');
    });
  }
}

async function esportaTaccuino() {
  try {
    const note = await DB.all();
    const out = { app: 'parco-capello', formato: 1, esportato: new Date().toISOString(), note: [] };
    for (const n of note) out.note.push(Object.assign({}, n, { foto: await Promise.all((n.foto || []).map(blobToDataURL)) }));
    const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `parco-capello-taccuino-${oggiISO()}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Backup di ${note.length} note pronto`);
  } catch (e) { toast('Esportazione non riuscita'); }
}
async function importaTaccuino(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'parco-capello' || !Array.isArray(d.note)) throw new Error('formato');
    for (const n of d.note) { n.foto = await Promise.all((n.foto || []).map(dataURLToBlob)); await DB.put(n); }
    toast(`Importate ${d.note.length} note`); vai();
  } catch (e) { toast('File di backup non valido'); }
}

/* click globali: indietro, glossario, visore foto */
document.addEventListener('click', (e) => {
  const back = e.target.closest('[data-back]');
  if (back) { if (history.length > 1) history.back(); else location.hash = '#/'; return; }
  const rep = e.target.closest('a[data-replace]');
  if (rep) { e.preventDefault(); location.replace(rep.getAttribute('href')); return; }
  const gl = e.target.closest('[data-gl]');
  if (gl) { const r = concetto(gl.dataset.gl); if (r) apriFoglio(`<div class="kicker">${esc(r.o.nome)} · glossario</div><h2>${esc(r.c.termine)}</h2><p class="prose">${esc(r.c.definizione)}</p><button class="btn ghost small" data-chiudi>Chiudi</button>`); return; }
  const v = e.target.closest('[data-view]');
  if (v) { const s = SP[location.hash.split('/')[2]]; const im = s && s.immagini[+v.dataset.view]; if (im) apriVisore(im); return; }
});
function apriFoglio(html) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  const chiudi = () => { bg.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') chiudi(); };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-chiudi]')) chiudi(); });
  document.addEventListener('keydown', esc_);
  document.body.appendChild(bg); const b = $('[data-chiudi]', bg); if (b) b.focus();
}
function apriVisore(im) {
  const v = document.createElement('div'); v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = `<img src="${esc(imgSrc(im.file))}" alt=""><div class="cap">${esc(im.autore)} · ${esc(im.licenza)} · <a href="${esc(im.url_originale)}" target="_blank" rel="noopener">${esc(im.fonte)}</a></div><button class="icon-btn" aria-label="Chiudi">${ico('x')}</button>`;
  $('button', v).addEventListener('click', () => v.remove());
  document.body.appendChild(v); $('button', v).focus();
}

/* ---------- avvio ---------- */
async function avvio() {
  applicaTema();
  try { preparaDati(await caricaDati()); } catch (e) {
    $('#app').innerHTML = `<p class="empty">Impossibile caricare i dati (${esc(e.message)}).</p>`; return;
  }
  window.addEventListener('hashchange', vai);
  vai();
  if ('serviceWorker' in navigator && window.isSecureContext && !window.__DATA__) {
    const primaVolta = !navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!primaVolta) toast('App aggiornata alla nuova versione'); });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
avvio();
