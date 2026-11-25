# DESIGN.md — Banco Bar

Sistema visivo dell'app, ricavato dal costruito. Non è una guida astratta: descrive ciò che è in
`css/style.css` e come va esteso senza rompere il carattere del prodotto.

## Direzione

**Banco bar scuro, elegante.** Legno bruno, ottone caldo, vetro freddo. L'interfaccia deve sembrare
un bancone vero visto di sera, non una dashboard. Il contrasto alto serve alla proiezione in aula:
testo chiaro su fondo scuro, un solo accento caldo (ottone) per ciò che è attivo o importante.

Scelte da non tradire:

- Niente gradienti decorativi, glassmorphism o viola da SaaS. Il gradiente esiste solo dentro il
  vetro e il metallo della scena.
- Niente icone colorate: le icone sono tratti `currentColor`, l'ottone dà il calore.
- La scena è il centro visivo. I pannelli sono strumenti, non protagonisti.
- Un solo momento espressivo per schermata: l'animazione del gesto (versare, shakerare, filtrare).

## Palette

| Ruolo | Token | Valore |
|---|---|---|
| Fondo pagina | `--bg` | `#17120e` |
| Pannello | `--bg-2` | `#1e1712` |
| Campo / controllo | `--bg-3` | `#251c15` |
| Testo principale | `--cream` | `#f3ead9` |
| Testo secondario | `--cream-dim` | `#cdbca2` |
| Testo attenuato | `--muted` | `#a8957b` |
| Ottone (accento) | `--brass` | `#c9a227` |
| Ottone chiaro (link, focus) | `--brass-bright` | `#e3bd45` |
| Ottone scuro (bordi) | `--brass-dim` | `#8a6f24` |
| Linea | `--line` | `rgba(243, 234, 217, 0.14)` |
| Linea forte | `--line-strong` | `rgba(243, 234, 217, 0.26)` |
| Legno scena | `--wood` / `--wood-2` | `#3a2a1c` / `#2c2016` |
| Bordo legno | `--wood-edge` | `#4a3524` |
| Errore | `--danger` | `#ff9d94` |
| Successo | `--ok` | `#9ed8a2` |

Regole: l'ottone è un accento, mai un fondo per testo chiaro. Su fondo ottone il testo è
`#1a1408`. I colori degli ingredienti arrivano dai dati (`colore` in `data/ricette.json`) e non
sono token di interfaccia.

## Tipografia

- Display: **Marcellus** (self-hosted, `assets/fonts/marcellus-400-latin.woff2`), solo per titoli,
  nome ricetta e numeri di passo. Mai per testo corrente.
- Testo: stack di sistema (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, sans-serif`). Nessun font di testo scaricato.
- Scala: titolo pagina `clamp(1.7rem, 3.2vw, 2.5rem)`; titolo pannello `1.3rem`; corpo `0.95–1rem`;
  etichette maiuscole `0.7–0.72rem` con `letter-spacing: 0.1em`.
- Modalità **Testo grande** (`data-testo="grande"`): porta la base a `112.5%` e allarga i controlli.
  Deve restare senza overflow orizzontale a 390 px.
- Numeri e dosi sempre con unità: `30 ml`, non `30`.

## Spazio e forma

- Raggio: `--radius` 12 px per controlli, `--radius-lg` 16 px per pannelli e scena.
- Gap di griglia: 1 rem; padding pannello 0.9–1 rem.
- Bersagli touch: minimo 44 px in altezza per input, select e pulsanti principali; 32 px per i
  controlli secondari.
- Ombra: una sola, morbida e scura (`--shadow`). Niente ombre colorate.

## Layout

- Catalogo: testata con ricerca e filtri, griglia di card. La card è un unico bersaglio
  cliccabile (button) con nome, categoria, tecnica e badge alcol.
- Banco: due colonne sopra 1081 px — scena + contenitori + scaffale a sinistra, pannello di
  ricetta/registro a destra. Sotto 1081 px la colonna destra scende e la scena non è sticky.
- La scena mantiene `aspect-ratio: 800 / 430`; su viewport bassi è limitata da `max-height`
  (46vh / 40vh / 34vh) per non rubare spazio ai controlli.
- Su desktop la scena è sticky sotto la topbar: l'animazione resta visibile mentre si usa il
  dosatore in fondo.
- Niente scroll orizzontale di pagina a 390 px. Lo scaffale può scorrere in orizzontale al suo
  interno, con scrollbar sottile.

## Componenti

- **Topbar**: brand a sinistra, due switch a destra (Movimento ridotto, Testo grande). Sticky,
  fondo semi-opaco, bordo inferiore.
- **Card ricetta**: fondo pannello, bordo linea, hover con bordo ottone e sollevamento di 2 px.
  Badge IBA in ottone; badge alcol in tre varianti (sì / no / tracce).
- **Pannello**: titolo maiuscolo attenuato, contenuto a lista. Il registro è `aria-live="polite"`.
- **Tabs contenitore** (Bicchiere / Shaker / Mixing glass): segmented control, attivo con fondo
  ottone trasparente e bordo ottone.
- **Scaffale**: bottiglie SVG con etichetta sotto, nome su due righe massime. L'ingrediente
  selezionato ha alone ottone e `aria-pressed="true"`.
- **Dosatore**: ingrediente, dose numerica o preset (10/15/20/30/45/60 ml), unità, pulsante
  principale "Versa" (o "Colma", "Fai galleggiare", "Guarnisci"). Il jigger si riempie in
  proporzione alla dose.
- **Strumenti**: bar spoon, strainer, muddler; selezione persistente, attrezzo attivo evidenziato.
- **Feedback**: riga nel registro con tono ok/errore/info. L'errore è specifico e nomina la dose
  versata e quella attesa.

## Movimento

- Durate: liquido 620 ms, gesto 950–1200 ms, guarnizione 320–600 ms. Easing standard
  `cubic-bezier(0.16, 1, 0.3, 1)` per entrata, `ease-in-out` per i gesti.
- Le animazioni raccontano l'azione: bottiglia inclinata con getto dalla bocca, cubetti che
  cadono, bar spoon che ruota, strainer con flusso verso il bicchiere, jigger che si riempie.
- **Movimento ridotto** (`data-motion="ridotto"` o preferenza di sistema): nessun movimento;
  lo stato finale è immediato e il registro testuale dice cosa è successo. Il toggle è persistito
  in `localStorage` (`banco-motion`).
- Mai animazioni in loop, parallasse o auto-play infinito.

## Accessibilità

- Ogni azione ha equivalente da tastiera: Tab per navigare, Enter/Spazio per attivare. Il
  trascinamento non è richiesto.
- `:focus-visible` con outline ottone chiaro 3 px e offset 2 px.
- Contrasto: testo corrente ≥ 4.5:1; testi grandi ≥ 3:1. Il detector Impeccable è pulito su
  `index.html`.
- La scena ha `role="img"` e `aria-label` aggiornato con i contenitori e i liquidi presenti.
- Il registro è annunciato con `aria-live="polite"`; gli errori non spostano il focus.
- `prefers-reduced-motion` è rispettato anche senza toggle.
- Lingua `it`, titoli di sezione reali, skip link "Salta al contenuto".

## Voce

Italiano professionale, diretto, da docente di sala bar. Frasi brevi all'imperativo
("Versa 30 ml di gin."). Il "perché" spiega la tecnica, non ripete il passaggio. Gli errori
correggono senza colpevolizzare: dicono cosa è successo, cosa prevede la ricetta, come rimediare.
