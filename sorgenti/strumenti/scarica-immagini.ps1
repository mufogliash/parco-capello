# Scarica foto CANDIDATE da Wikipedia / Wikimedia Commons per le specie elencate in immagini-ricerca.json.
#
# Metodo (versione 2, meno richieste e risultati migliori):
#   1. la foto principale della pagina Wikipedia (italiana e inglese) di ogni specie: una sola richiesta per tutte;
#   2. le sottocategorie tematiche di Commons (es. "Category:Quercus robur - leaves", "... habitus", "... bark");
#   3. solo se per un tipo non esiste una sottocategoria: una ricerca testuale di riserva.
# Tiene solo licenze libere (CC0, CC BY, CC BY-SA, pubblico dominio) e registra autore e licenza.
# Scarica foto larghe 960 px (misura standard di Wikimedia), con pausa tra un download e l'altro.
# Se Wikimedia rifiuta due download di fila si ferma: al giro successivo riparte senza riscaricare nulla.
#
# Uso: doppio clic su scarica-immagini.bat
# Opzioni: -Solo populus-alba,salix-alba   (solo alcune specie)
#          -PerTipo 3                       (candidate per tipo di foto)

param(
  [string[]]$Solo = @(),
  [int]$PerTipo = 3,
  [int]$Larghezza = 960,
  [int]$PausaSecondi = 4
)

$ErrorActionPreference = 'Stop'
$script:interrotto = $false
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$UA = 'ParcoCapello/0.5 (https://mufogliash.github.io/parco-capello/; personal non-commercial field guide) PowerShell'

$COMMONS = 'https://commons.wikimedia.org/w/api.php'
if ($env:PC_API_COMMONS) { $COMMONS = $env:PC_API_COMMONS }
$WIKI = @{ 'it' = 'https://it.wikipedia.org/w/api.php'; 'en' = 'https://en.wikipedia.org/w/api.php' }
if ($env:PC_API_WIKI_IT) { $WIKI['it'] = $env:PC_API_WIKI_IT }
if ($env:PC_API_WIKI_EN) { $WIKI['en'] = $env:PC_API_WIKI_EN }

$strumenti = $PSScriptRoot
$root      = Split-Path $strumenti -Parent
$outDir    = Join-Path $root 'candidati'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# --- configurazione e nomi scientifici ---------------------------------------------------------
$cfg    = Get-Content -Raw -Encoding UTF8 (Join-Path $strumenti 'immagini-ricerca.json') | ConvertFrom-Json
$elenco = Get-Content -Raw -Encoding UTF8 (Join-Path (Join-Path $root 'dati') 'elenco-specie.json') | ConvertFrom-Json
$latino = @{}
foreach ($e in $elenco.specie) { $latino[$e.id] = ($e.nome_scientifico -replace '\s+', ' ').Trim() }

# tipi da cercare: di default tutti, oppure quelli indicati per la singola specie
$TUTTI = @('silhouette', 'foglia', 'corteccia', 'fiore_o_frutto', 'gemme')
$lista = @()
foreach ($voce in $cfg.specie) {
  if ($voce -is [string]) { $lista += [pscustomobject]@{ id = $voce; tipi = $TUTTI } }
  else {
    $t = $TUTTI
    if ($voce.tipi) { $t = @($voce.tipi) }
    $lista += [pscustomobject]@{ id = $voce.id; tipi = $t }
  }
}
if ($Solo.Count -gt 0) { $lista = @($lista | Where-Object { $Solo -contains $_.id }) }
$lista = @($lista | Where-Object {
  if (-not $latino.ContainsKey($_.id)) { Write-Warning ("{0}: non trovata in dati\elenco-specie.json, salto" -f $_.id); $false } else { $true }
})
if ($lista.Count -eq 0) { Write-Host 'Nessuna specie da cercare in immagini-ricerca.json.'; exit 0 }

# --- parole chiave per riconoscere le sottocategorie di Commons ---------------------------------
$PAROLE = [ordered]@{
  'gemme'          = @('bud', 'twig')
  'fiore_o_frutto' = @('fruit', 'acorn', 'cone', 'seed', 'flower', 'inflorescence', 'catkin', 'samara', 'nut', 'berries', 'berry')
  'corteccia'      = @('bark', 'trunk')
  'foglia'         = @('leaves', 'leaf', 'foliage')
  'silhouette'     = @('habit', 'habitus', 'whole tree', 'trees', 'specimen', 'solitary')
}
$ESCLUDI = @('cultivar', "'", 'herbar', 'illustration', 'drawing', ' art', 'wood', 'timber', 'microscop', 'gall', 'disease',
             'pest', 'insect', 'fung', 'section', 'stamp', 'logo', 'map', 'distribution', 'dead', 'stump', 'hybrid', 'in winter',
             'autumn', 'bonsai', 'forest', 'in culture', 'by country', 'in italy', 'in germany', 'in france', 'in spain')
$CONTENITORI = @('morpholog', 'by part', 'organs', 'plant parts', 'identification')

$licenzaOk = '^(CC0|CC[ -]BY|Public domain|PD|Pubblico dominio)'
$licenzaNo = '(NC|ND)'

# --- utilita -----------------------------------------------------------------------------------
function ConRitentativi([scriptblock]$azione) {
  $attesa = 60
  for ($i = 1; $i -le 3; $i++) {
    try { return & $azione }
    catch {
      $msg = $_.Exception.Message
      if ($msg -match '429|Too Many Requests|503') {
        Write-Host ("  Wikimedia chiede di rallentare: attendo {0} s (tentativo {1}/3)" -f $attesa, $i)
        Start-Sleep -Seconds $attesa; $attesa = $attesa * 2
      } else { throw }
    }
  }
  throw 'troppi tentativi falliti'
}

function Api([string]$base, [hashtable]$par) {
  $q = @('format=json', 'formatversion=2')
  foreach ($k in $par.Keys) { $q += ('{0}={1}' -f $k, [uri]::EscapeDataString([string]$par[$k])) }
  $url = $base + '?' + ($q -join '&')
  $r = ConRitentativi { Invoke-RestMethod -Uri $url -UserAgent $UA -TimeoutSec 60 }
  Start-Sleep -Milliseconds 700
  return $r
}

function Pulisci([string]$html) {
  if (-not $html) { return '' }
  $t = $html -replace '<[^>]+>', ' '
  $t = [System.Net.WebUtility]::HtmlDecode($t)
  return ($t -replace '\s+', ' ').Trim()
}

function TipoDaCategoria([string]$nome) {
  $n = $nome.ToLowerInvariant()
  foreach ($x in $ESCLUDI) { if ($n.Contains($x)) { return $null } }
  foreach ($tipo in $PAROLE.Keys) {
    foreach ($p in $PAROLE[$tipo]) { if ($n.Contains($p)) { return $tipo } }
  }
  return $null
}

function Sottocategorie([string]$cat) {
  $r = Api $COMMONS @{ action = 'query'; list = 'categorymembers'; cmtitle = $cat; cmtype = 'subcat'; cmlimit = '200' }
  if ($r.query -and $r.query.categorymembers) { return @($r.query.categorymembers | ForEach-Object { $_.title }) }
  return @()
}

function FileInCategoria([string]$cat, [int]$max) {
  $r = Api $COMMONS @{ action = 'query'; list = 'categorymembers'; cmtitle = $cat; cmtype = 'file'; cmlimit = [string]$max }
  if ($r.query -and $r.query.categorymembers) { return @($r.query.categorymembers | ForEach-Object { $_.title }) }
  return @()
}

function CercaFile([string]$testo, [int]$max) {
  $r = Api $COMMONS @{ action = 'query'; list = 'search'; srnamespace = '6'; srlimit = [string]$max; srsearch = ($testo + ' filetype:bitmap') }
  if ($r.query -and $r.query.search) { return @($r.query.search | ForEach-Object { $_.title }) }
  return @()
}

function InfoFile([string[]]$titoli) {
  # restituisce le info di licenza e l'indirizzo della miniatura per un massimo di 50 file per richiesta
  $out = @{}
  for ($i = 0; $i -lt $titoli.Count; $i += 50) {
    $blocco = $titoli[$i..([Math]::Min($i + 49, $titoli.Count - 1))]
    $r = Api $COMMONS @{ action = 'query'; prop = 'imageinfo'; iiprop = 'url|extmetadata|mime|size'; iiurlwidth = [string]$Larghezza;
                         iiextmetadatafilter = 'Artist|LicenseShortName|LicenseUrl|ImageDescription'; titles = ($blocco -join '|') }
    if ($r.query -and $r.query.pages) {
      foreach ($pg in $r.query.pages) { if ($pg.imageinfo) { $out[$pg.title] = $pg } }
    }
  }
  return $out
}

# --- registro dei candidati --------------------------------------------------------------------
$registro = New-Object System.Collections.ArrayList
$fileRegistro = Join-Path $outDir 'candidati.json'
if (Test-Path $fileRegistro) {
  $vecchi = Get-Content -Raw -Encoding UTF8 $fileRegistro | ConvertFrom-Json
  foreach ($v in $vecchi) { [void]$registro.Add($v) }
}
$falliti = 0

function Scarica($sp, [string]$tipo, $pg, [string]$origine) {
  $ii = $pg.imageinfo[0]
  if ($ii.mime -ne 'image/jpeg' -and $ii.mime -ne 'image/png') { return $false }
  if ($ii.width -lt 600 -or $ii.height -lt 450) { return $false }
  $em = $ii.extmetadata
  $lic = ''; if ($em.LicenseShortName) { $lic = Pulisci $em.LicenseShortName.value }
  if (-not ($lic -match $licenzaOk) -or ($lic -match $licenzaNo)) { return $false }
  $dirSp = Join-Path $outDir $sp.id
  New-Item -ItemType Directory -Force -Path $dirSp | Out-Null
  $nome = '{0}-{1}.jpg' -f $tipo, $pg.pageid
  $dest = Join-Path $dirSp $nome
  if (-not (Test-Path $dest)) {
    $src = $ii.thumburl; if (-not $src) { $src = $ii.url }
    try {
      ConRitentativi { Invoke-WebRequest -Uri $src -UserAgent $UA -OutFile $dest -UseBasicParsing -TimeoutSec 120 } | Out-Null
      $script:falliti = 0
    } catch {
      Write-Warning ("  download fallito: {0}" -f $_.Exception.Message)
      if (Test-Path $dest) { Remove-Item $dest -ErrorAction SilentlyContinue }
      $script:falliti++
      if ($script:falliti -ge 2) { $script:interrotto = $true }
      return $false
    }
    Start-Sleep -Seconds $PausaSecondi
  }
  $autore = ''; if ($em.Artist) { $autore = Pulisci $em.Artist.value }
  $licUrl = ''; if ($em.LicenseUrl) { $licUrl = $em.LicenseUrl.value }
  $desc = ''; if ($em.ImageDescription) { $desc = Pulisci $em.ImageDescription.value }
  if ($desc.Length -gt 300) { $desc = $desc.Substring(0, 300) }
  [void]$script:registro.Add([pscustomobject]@{
    id_specie = $sp.id; tipo = $tipo; origine = $origine
    file = ('candidati/{0}/{1}' -f $sp.id, $nome)
    titolo = $pg.title; url_originale = $ii.descriptionurl
    autore = $autore; licenza = $lic; licenza_url = $licUrl; descrizione = $desc
    larghezza_originale = $ii.width; altezza_originale = $ii.height
  })
  Write-Host ("  + {0,-15} {1}  ({2})" -f $tipo, $nome, $origine)
  return $true
}

# --- 1. foto principale delle pagine Wikipedia (una richiesta per lingua, per tutte le specie) --
$principali = @{}
foreach ($lang in @('it', 'en')) {
  $nomi = @($lista | ForEach-Object { $latino[$_.id] })
  for ($i = 0; $i -lt $nomi.Count; $i += 50) {
    $blocco = $nomi[$i..([Math]::Min($i + 49, $nomi.Count - 1))]
    try {
      $r = Api $WIKI[$lang] @{ action = 'query'; prop = 'pageimages'; piprop = 'name'; redirects = '1'; titles = ($blocco -join '|') }
    } catch { Write-Warning ("Wikipedia {0}: {1}" -f $lang, $_.Exception.Message); continue }
    # mappa titolo richiesto -> titolo finale (redirect/normalizzazione)
    $alias = @{}
    foreach ($x in @($r.query.normalized) + @($r.query.redirects)) { if ($x) { $alias[$x.to] = $x.from } }
    foreach ($pg in @($r.query.pages)) {
      if (-not $pg.pageimage) { continue }
      $t = $pg.title
      while ($alias.ContainsKey($t)) { $t = $alias[$t] }
      if (-not $principali.ContainsKey($t)) { $principali[$t] = @() }
      $principali[$t] += [pscustomobject]@{ file = ('File:' + $pg.pageimage); origine = ('wikipedia-' + $lang) }
    }
  }
}

# --- 2-3. per ogni specie: sottocategorie di Commons, poi ricerca di riserva ------------------
foreach ($sp in $lista) {
  if ($script:interrotto) { break }
  $L = $latino[$sp.id]
  Write-Host ''
  Write-Host ("[{0}] {1}" -f $sp.id, $L)
  $gia = @{}
  foreach ($v in $registro) { if ($v.id_specie -eq $sp.id) { $gia[$v.titolo] = $true } }

  $candidati = New-Object System.Collections.ArrayList   # oggetti: titolo, tipo, origine

  foreach ($p in @($principali[$L])) {
    if ($p -and ($sp.tipi -contains 'silhouette')) { [void]$candidati.Add([pscustomobject]@{ titolo = $p.file; tipo = 'silhouette'; origine = $p.origine }) }
  }

  $catPerTipo = @{}
  try {
    $sub = Sottocategorie ('Category:' + $L)
    $extra = @()
    foreach ($c in $sub) {
      $n = $c.ToLowerInvariant()
      foreach ($k in $CONTENITORI) { if ($n.Contains($k)) { $extra += Sottocategorie $c; break } }
    }
    foreach ($c in @($sub) + @($extra)) {
      $t = TipoDaCategoria $c
      if ($t -and ($sp.tipi -contains $t)) {
        if (-not $catPerTipo.ContainsKey($t)) { $catPerTipo[$t] = @() }
        if ($catPerTipo[$t].Count -lt 2) { $catPerTipo[$t] += $c }
      }
    }
  } catch { Write-Warning ("  categorie non disponibili: {0}" -f $_.Exception.Message) }

  foreach ($tipo in $sp.tipi) {
    $titoli = @()
    if ($catPerTipo.ContainsKey($tipo)) {
      foreach ($c in $catPerTipo[$tipo]) {
        Write-Host ("  {0}: categoria '{1}'" -f $tipo, $c.Substring(9))
        $titoli += FileInCategoria $c ($PerTipo * 4)
      }
    } else {
      $parola = @{ silhouette = 'tree habit'; foglia = 'leaves'; corteccia = 'bark'; fiore_o_frutto = 'fruit'; gemme = 'buds' }[$tipo]
      Write-Host ("  {0}: nessuna categoria, ricerca '{1} {2}'" -f $tipo, $L, $parola)
      $titoli += CercaFile ('"' + $L + '" ' + $parola) ($PerTipo * 4)
    }
    foreach ($t in $titoli) { [void]$candidati.Add([pscustomobject]@{ titolo = $t; tipo = $tipo; origine = 'commons' }) }
  }

  $daVerificare = @($candidati | Where-Object { -not $gia.ContainsKey($_.titolo) } | ForEach-Object { $_.titolo } | Select-Object -Unique)
  if ($daVerificare.Count -eq 0) { Write-Host '  niente di nuovo'; continue }
  $info = InfoFile $daVerificare

  # quante candidate ci sono gia per tipo: rilanciando lo script si completa, non si aggiunge
  $presi = @{}
  foreach ($v in $registro) {
    if ($v.id_specie -ne $sp.id) { continue }
    $conta = $v.tipo; if ($v.origine -like 'wikipedia-*') { $conta = 'wikipedia' }
    if (-not $presi.ContainsKey($conta)) { $presi[$conta] = 0 }
    $presi[$conta]++
  }
  foreach ($c in $candidati) {
    if ($script:interrotto) { break }
    if ($gia.ContainsKey($c.titolo) -or -not $info.ContainsKey($c.titolo)) { continue }
    $conta = $c.tipo; if ($c.origine -like 'wikipedia-*') { $conta = 'wikipedia' }   # le foto principali di Wikipedia non tolgono posto
    if (-not $presi.ContainsKey($conta)) { $presi[$conta] = 0 }
    if ($presi[$conta] -ge $PerTipo) { continue }
    if (Scarica $sp $c.tipo $info[$c.titolo] $c.origine) { $presi[$conta]++; $gia[$c.titolo] = $true }
  }
}

# --- salvataggio -------------------------------------------------------------------------------
$unici = $registro | Group-Object file | ForEach-Object { $_.Group[-1] }
$json = ConvertTo-Json -InputObject @($unici) -Depth 5
[IO.File]::WriteAllText($fileRegistro, $json, (New-Object System.Text.UTF8Encoding $false))

if ($script:interrotto) {
  Write-Host ''
  Write-Warning 'Wikimedia continua a rifiutare i download: mi fermo qui. Riprova tra un''ora; le foto gia scaricate restano.'
}
$zip = Join-Path $root 'candidati.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $outDir '*') -DestinationPath $zip
Write-Host ''
Write-Host ("Fatto. {0} foto candidate in totale in {1}" -f @($unici).Count, $outDir)
