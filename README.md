# Banco Bar — Simulatore di cocktail

App web statica in italiano per imparare a preparare cocktail su un banco bar virtuale.
Pensata per studenti di istituto alberghiero e per la proiezione in aula durante un corso sull'AI.

Nessun account, nessun backend, nessuna chiave API: solo HTML, CSS, JavaScript e un archivio JSON.

## Avvio

Serve un server HTTP statico perché le ricette sono caricate con `fetch` (con `file://` il browser
blocca la richiesta).

```bash
cd cocktail-creator
python3 -m http.server 8000
```

Apri <http://localhost:8000>. In alternativa va bene qualunque hosting statico (GitHub Pages,
Netlify, un server della scuola): copia la cartella così com'è.

Requisiti: un browser recente con supporto a ES modules, `fetch` e Web Animations API
(Chrome, Edge, Firefox, Safari attuali).

## Cosa contiene

- **43 ricette**: 31 IBA e 12 tratte da fonti professionali, di cui 11 analcoliche e 1 con tracce
  d'alcol (Cinderella, 3 dash di Angostura).
- Ricerca per nome o ingrediente; filtri per tipologia, tecnica e presenza di alcol, incluso il
  filtro "Analcoliche" e la voce separata "Tracce d'alcol".
- **Dimostrazione**: passaggio per passaggio, con Avvia/Pausa, indietro, passaggio successivo,
  "Rivedi passaggio" e il perché di ogni gesto.
- **Esercitazione guidata**: dosatore virtuale, strumenti, ricetta consultabile, feedback
  specifico. Esempio: «Hai versato 30 ml di succo di lime. La ricetta ne prevede 20.»
- **Sfida**: solo il nome della ricetta; alla fine un riepilogo su ingredienti, dosi, tecnica,
  servizio e ordine dei passaggi, con punteggio indicativo per il docente.
- Banco con scaffale ingredienti, strumenti (bar spoon, strainer, muddler), contenitori
  (bicchiere, shaker, mixing glass, frullatore), dosatore e jigger animato.

## Struttura

```text
cocktail-creator/
├── index.html              # guscio UI: viste catalogo, scheda, banco
├── css/style.css           # sistema visivo scuro, layout responsive, accessibilità
├── js/app.js               # catalogo, filtri, modalità, dosatore, tastiera, preferenze
├── js/engine.js            # stato della simulazione, validazione guidata, punteggio sfida
├── js/scene.js             # banco SVG, bicchieri, liquidi, ghiaccio, animazioni
├── data/ricette.json       # archivio ricette + cataloghi di supporto
├── assets/fonts/           # Marcellus, self-hosted
├── PRODUCT.md              # fatti e assunzioni di prodotto
└── DESIGN.md               # sistema visivo e regole di estensione
```

### Archivio ricette

`data/ricette.json` è separato dal codice UI. Contiene:

- `ingredienti`, `bicchieri`, `strumenti`, `tecniche`: cataloghi con nome, colore e capienza;
- `ricette`: array di schede.

Campi principali di una ricetta:

```json
{
  "id": "negroni",
  "nome": "Negroni",
  "categoria": "IBA",
  "alcol": "si",
  "tipologia": "aperitivo",
  "tecnica": "build",
  "bicchiere": "old_fashioned",
  "ghiaccio": { "tipo": "cubetti", "dove": "bicchiere" },
  "strumenti": ["jigger", "bar_spoon"],
  "ingredienti": [{ "id": "gin", "q": 30, "unita": "ml" }],
  "guarnizione": { "testo": "Mezza fetta d'arancia", "elementi": ["arancia_fetta"] },
  "passi": [{ "tipo": "versa", "ing": "gin", "q": 30, "unita": "ml", "dove": "bicchiere", "testo": "Versa 30 ml di gin." }],
  "fonte": { "nome": "IBA — The Unforgettables", "url": "https://iba-world.com/iba-cocktail/negroni/", "editore": "International Bartenders Association" },
  "variante": null
}
```

Unità ammesse: `ml`, `g`, `gocce`, `spruzzo`, `cucchiaino`, `pezzi`, `rametti`, `foglie`, `tazza`,
`fetta`, `colmare`, `a_piacere`, `qb`. Per le unità qualitative `q` è `null`.

Per aggiungere una ricetta basta aggiungere un oggetto all'array e, se serve un nuovo ingrediente,
una voce al catalogo `ingredienti` con un `colore` valido. Non c'è codice da toccare.

## Fonti delle ricette

- Le ricette IBA seguono le schede ufficiali di
  [iba-world.com](https://iba-world.com/cocktails/all-cocktails/); ogni scheda riporta il link
  alla pagina usata.
- Le ricette non IBA citano in scheda la fonte professionale (es. whattodrink.com,
  cocktailline.de, diffordsguide.com) e, quando presente, la variante adottata.
- Dosi, unità, tecnica, bicchiere, ghiaccio e guarnizione sono stati confrontati con la fonte.
  Dove la fonte usa misure diverse (cl, oz, parti) la conversione è indicata nei dati.
- Cinderella è classificata `alcol: "tracce"` perché la ricetta prevede 3 dash di Angostura:
  non è analcolica in senso stretto e il filtro la tiene separata.

## Accessibilità e tastiera

- Tutte le azioni si fanno con clic/tocco e da tastiera: `Tab` per muoversi, `Invio`/`Spazio` per
  attivare. Il trascinamento non è richiesto.
- Skip link "Salta al contenuto"; focus visibile con outline ottone.
- `aria-live="polite"` sul registro: gli errori e i successi sono annunciati.
- La scena ha `role="img"` e un'etichetta aggiornata con liquidi e contenitori.
- Contrasto verificato; nessun testo sotto i 4.5:1 (3:1 per i testi grandi).
- **Movimento ridotto**: toggle in alto o preferenza di sistema. Le animazioni diventano stato
  finale immediato e il registro descrive l'azione. La scelta è salvata in `localStorage`.
- **Testo grande**: toggle che porta la base a 18 px; il layout regge a 390 px senza scroll
  orizzontale.

## Verifiche svolte

- Validazione dati: 43 ricette, 11 analcoliche, 1 con tracce; tutti i riferimenti a ingredienti,
  bicchieri, strumenti e tecniche risolvono.
- Motore, tutte le 43 ricette: flusso guidato completabile (`ALL 43 GUIDED FLOWS OK`).
- Motore, tutte le 43 ricette: sfida completata con punteggio 100/100 quando le azioni sono
  corrette (`ALL 43 CHALLENGE SCORES 100`).
- Browser (Chrome headless, 1440×1000):
  - catalogo 43 schede; ricerca "lime" → 12 risultati; filtri alcol e tecnica;
  - Daiquiri in esercitazione guidata: bicchiere sbagliato, dose sbagliata, ingrediente fuori
    ricetta, strumento sbagliato, ghiaccio sbagliato, completamento e riavvio;
  - Shirley Temple (analcolica) e Virgin Colada (blend) completate;
  - Daiquiri in sfida: riepilogo con 100%;
  - dimostrazione: avanzamento automatico, pausa, indietro, rivedi passaggio;
  - movimento ridotto e testo grande;
  - layout a 390 px: nessun overflow orizzontale; a 1440 px scena sticky.
- `impeccable detect` su `index.html`: nessun anti-pattern (contrasto e side-tab corretti).

## Skill usate e sostituzioni

- **impeccable** — usata per la direzione visiva, le regole di movimento/accessibilità e il
  detector. `DESIGN.md` documenta il sistema costruito. La versione installata non espone il
  comando `surface-brief`; il brief di direzione è stato tenuto come contratto di lavoro e le sue
  scelte sono riflesse in `DESIGN.md`.
- **HyperFrames** — installata ma **non compatibile** con questo progetto: è un renderer
  HTML→video con account e quota di utilizzo, mentre il brief richiede un'app statica senza
  account. Le animazioni sono quindi realizzate con CSS e Web Animations API, come previsto dalla
  guida `animate` di impeccable. Nessun beacon di utilizzo è stato inviato.
- **taste-skill / design-taste-frontend** — pensata per landing page; adattate le parti utili
  (controllo di coerenza, gerarchia, motion e accessibilità) a un'app interattiva. I checker di
  pagina intera non sono applicabili a un banco con stato.
- **find-skills** — usata per individuare e installare le skill mancanti.

## Limiti noti

- Lo stato della sessione è in memoria: ricaricando la pagina la preparazione riparte. Solo le
  preferenze UI (movimento, testo) sono persistite.
- La simulazione è didattica: non modella temperature, diluizione o scioglimento del ghiaccio.
- Le dosi "a piacere", "q.b." e "colma" non hanno una validazione numerica, coerentemente con la
  ricetta.
- Il font Marcellus proviene da Google Fonts ed è distribuito con licenza aperta; il file è
  self-hosted, nessuna richiesta a servizi esterni. Prima di una pubblicazione fuori dal contesto
  didattico, conserva il testo della licenza insieme al font.

## Licenza e uso didattico

Codice e dati sono forniti per uso didattico. Le ricette restano attribuite alle fonti citate.
Le ricette alcoliche sono presentate a scopo formativo; il consumo di alcol è vietato ai minori.
