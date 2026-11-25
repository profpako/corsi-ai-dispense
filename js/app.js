// Controller dell'app: catalogo, scheda, banco di lavoro, modalità, preferenze, accessibilità.
import { Simulazione, formattaDose, CONTENITORI, formattaQuantita } from "./engine.js";
import { Scena } from "./scene.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let DATA = null;
let RICETTA = null;
let SIM = null;
let SCENA = null;
let MODO = null;

let ingSelezionato = null;
let unitaSelezionata = "ml";
let dose = 30;
let doveAttivo = "bicchiere";
let strumentoAttivo = null;
let galleggiaScelto = false;

let demo = { step: 0, playing: false, animando: false, timer: null, log: [] };

const ridottoIniziale = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionRidotto = localStorage.getItem("banco-motion") != null ? localStorage.getItem("banco-motion") === "1" : ridottoIniziale;
let testoGrande = localStorage.getItem("banco-testo") === "1";

const INGREDIENTI_DISTRATTORI = ["gin", "vodka", "rum_bianco", "limone_succo", "arancia_succo", "soda", "zucchero_sciroppo", "granatina", "mirtillo_succo", "ginger_ale"];

// ---------- utilità ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function nomeIng(id) { return DATA?.ingredienti[id]?.nome || id; }
function nomeBicchiere(id) { return DATA?.bicchieri[id]?.nome || id; }
function nomeTecnica(id) { return DATA?.tecniche[id]?.nome || id; }

function badgeAlcol(r) {
  if (r.alcol === "si") return '<span class="badge badge-alcol">Alcolico</span>';
  if (r.alcol === "tracce") return '<span class="badge badge-tracce">Tracce d\'alcol</span>';
  return '<span class="badge badge-analcolico">Analcolico</span>';
}

function etichettaTipologia(t) {
  return t === "long drink" ? "Long drink" : t.charAt(0).toUpperCase() + t.slice(1);
}

function iconaBicchiere(id, classe = "card-bicchiere") {
  const bowl = ["coupe", "martini", "flute", "calice_vino", "hurricane"].includes(id);
  if (bowl) {
    return `<svg class="${classe}" viewBox="0 0 34 40" aria-hidden="true"><path d="M5 4h24l-12 15z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 19v13M10 34h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (id === "mug") {
    return `<svg class="${classe}" viewBox="0 0 34 40" aria-hidden="true"><path d="M7 8h17v25H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 14h4v10h-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  if (id === "irish") {
    return `<svg class="${classe}" viewBox="0 0 34 40" aria-hidden="true"><path d="M9 6h16l-2 24H11z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25 14h4v9h-4M12 34h10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  return `<svg class="${classe}" viewBox="0 0 34 40" aria-hidden="true"><path d="M9 5h16l-2 30H11z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

function bottigliaMini(colore) {
  return `<svg viewBox="0 0 30 58" aria-hidden="true"><rect x="11" y="2" width="8" height="12" rx="2" fill="${colore}" opacity="0.9"/><path d="M8 16h14l2 30a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="${colore}" opacity="0.82" stroke="rgba(243,234,217,0.35)" stroke-width="1"/><rect x="8" y="28" width="14" height="14" fill="#f3ead9" opacity="0.35"/><rect x="8" y="28" width="14" height="3" fill="#c9a227" opacity="0.8"/></svg>`;
}

function feedback(testo, tipo = "info") {
  const live = $("#feedback-live");
  const div = document.createElement("div");
  div.className = `feedback feedback-${tipo === "ok" ? "ok" : tipo === "err" ? "err" : "info"}`;
  div.innerHTML = esc(testo);
  live.prepend(div);
  while (live.children.length > 2) live.lastElementChild.remove();
}

function aggiungiRegistro(esito, testo) {
  const ol = $("#registro");
  const li = document.createElement("li");
  const icona = esito === "ok" ? "✓" : esito === "err" ? "✕" : "•";
  li.innerHTML = `<span class="icona ${esito}">${icona}</span><span>${esc(testo)}</span>`;
  ol.prepend(li);
  while (ol.children.length > 40) ol.lastElementChild.remove();
}

// ---------- preferenze ----------
function applicaPreferenze() {
  document.documentElement.dataset.motion = motionRidotto ? "ridotto" : "normale";
  document.documentElement.dataset.testo = testoGrande ? "grande" : "normale";
  $("#toggle-movimento").checked = motionRidotto;
  $("#toggle-testo").checked = testoGrande;
  SCENA?.setMotion(motionRidotto);
}
$("#toggle-movimento").addEventListener("change", (e) => {
  motionRidotto = e.target.checked;
  localStorage.setItem("banco-motion", motionRidotto ? "1" : "0");
  applicaPreferenze();
});
$("#toggle-testo").addEventListener("change", (e) => {
  testoGrande = e.target.checked;
  localStorage.setItem("banco-testo", testoGrande ? "1" : "0");
  applicaPreferenze();
});

// ---------- viste ----------
function mostra(vista) {
  for (const v of ["catalogo", "ricetta", "banco"]) {
    $(`#vista-${v}`).hidden = v !== vista;
  }
  if (vista === "catalogo") {
    $("#vista-catalogo").querySelector("h1")?.focus?.();
  }
  window.scrollTo({ top: 0, behavior: motionRidotto ? "auto" : "smooth" });
}

// ---------- catalogo ----------
function popolaFiltri() {
  const tipologie = [...new Set(DATA.ricette.map((r) => r.tipologia))].sort();
  const tecniche = [...new Set(DATA.ricette.map((r) => r.tecnica))].sort();
  $("#filtro-tipologia").innerHTML = '<option value="">Tutte</option>' + tipologie.map((t) => `<option value="${esc(t)}">${esc(etichettaTipologia(t))}</option>`).join("");
  $("#filtro-tecnica").innerHTML = '<option value="">Tutte</option>' + tecniche.map((t) => `<option value="${esc(t)}">${esc(nomeTecnica(t))}</option>`).join("");
}

function filtraRicette() {
  const q = $("#cerca").value.trim().toLowerCase();
  const tip = $("#filtro-tipologia").value;
  const tec = $("#filtro-tecnica").value;
  const alcol = document.querySelector('input[name="alcol"]:checked')?.value || "";
  return DATA.ricette.filter((r) => {
    if (tip && r.tipologia !== tip) return false;
    if (tec && r.tecnica !== tec) return false;
    if (alcol === "no" && r.alcol !== "no") return false;
    if (alcol === "tracce" && r.alcol !== "tracce") return false;
    if (alcol === "si" && r.alcol !== "si") return false;
    if (q) {
      const testi = [r.nome, r.tipologia, nomeTecnica(r.tecnica), ...r.ingredienti.map((i) => nomeIng(i.id))].join(" ").toLowerCase();
      if (!testi.includes(q)) return false;
    }
    return true;
  });
}

function renderCatalogo() {
  const lista = filtraRicette();
  $("#griglia-ricette").innerHTML = lista.map((r) => `
    <li>
      <button class="card-ricetta" type="button" data-id="${esc(r.id)}" aria-label="Apri la ricetta ${esc(r.nome)}: ${esc(nomeTecnica(r.tecnica))}, ${esc(nomeBicchiere(r.bicchiere))}">
        <span class="card-top">
          <span class="card-nome">${esc(r.nome)}</span>
          ${iconaBicchiere(r.bicchiere)}
        </span>
        <span class="card-meta">
          ${r.categoria === "IBA" ? '<span class="badge badge-iba">IBA</span>' : '<span class="badge">Fonte professionale</span>'}
          ${badgeAlcol(r)}
          <span class="badge">${esc(etichettaTipologia(r.tipologia))}</span>
          <span class="badge">${esc(nomeTecnica(r.tecnica).split(" (")[0])}</span>
        </span>
        <span class="card-ingredienti">${r.ingredienti.slice(0, 3).map((i) => esc(nomeIng(i.id))).join(" · ")}${r.ingredienti.length > 3 ? " …" : ""}</span>
      </button>
    </li>`).join("");
  $("#catalogo-vuoto").hidden = lista.length > 0;
  const na = DATA.ricette.filter((r) => r.alcol === "no").length;
  const tr = DATA.ricette.filter((r) => r.alcol === "tracce").length;
  $("#risultato-info").textContent = `${lista.length} ${lista.length === 1 ? "ricetta" : "ricette"} trovate · ${na} analcoliche${tr ? ` e ${tr} con tracce d'alcol` : ""} nel catalogo`;
  $("#conteggio-ricette").textContent = `${DATA.ricette.length} ricette verificate, di cui ${na} analcoliche${tr ? ` e ${tr} con sole tracce d'alcol` : ""}.`;
  $$("#griglia-ricette .card-ricetta").forEach((b) => b.addEventListener("click", () => apriRicetta(b.dataset.id)));
}

function aggiornaFiltri() { renderCatalogo(); }

$("#cerca").addEventListener("input", aggiornaFiltri);
$("#filtro-tipologia").addEventListener("change", aggiornaFiltri);
$("#filtro-tecnica").addEventListener("change", aggiornaFiltri);
$$('input[name="alcol"]').forEach((r) => r.addEventListener("change", () => {
  $("#solo-analcoliche").checked = r.value === "no";
  aggiornaFiltri();
}));
$("#solo-analcoliche").addEventListener("change", (e) => {
  if (e.target.checked) {
    document.querySelector('input[name="alcol"][value="no"]').checked = true;
  } else {
    document.querySelector('input[name="alcol"][value=""]').checked = true;
  }
  aggiornaFiltri();
});

// ---------- scheda ricetta ----------
function apriRicetta(id) {
  RICETTA = DATA.ricette.find((r) => r.id === id);
  if (!RICETTA) return;
  $("#titolo-ricetta").textContent = RICETTA.nome;
  $("#scheda-badge").innerHTML = `
    ${RICETTA.categoria === "IBA" ? '<span class="badge badge-iba">Ricetta IBA</span>' : '<span class="badge">Ricetta professionale</span>'}
    ${badgeAlcol(RICETTA)}
    <span class="badge">${esc(etichettaTipologia(RICETTA.tipologia))}</span>
    <span class="badge">${esc(RICETTA.tecnica)}</span>`;
  const fonteNome = RICETTA.fonte.nome;
  $("#scheda-fonte").innerHTML = `Fonte: <a href="${esc(RICETTA.fonte.url)}" target="_blank" rel="noopener">${esc(fonteNome)}</a> <span class="fonte-nota">· dosi e passaggi verificati sulla scheda</span>`;
  renderDettagli();
  mostra("ricetta");
}

function renderDettagli() {
  const r = RICETTA;
  const ing = r.ingredienti.map((i) => `
    <tr>
      <td>${esc(nomeIng(i.id))}${i.nota ? `<div class="nota">${esc(i.nota)}</div>` : ""}</td>
      <td class="dose">${esc(formattaDose(i.q, i.unita))}</td>
    </tr>`).join("");
  const passi = r.passi.map((p) => `<li>${esc(p.testo)}${p.perche ? `<div class="nota">${esc(p.perche)}</div>` : ""}</li>`).join("");
  const strumenti = r.strumenti.map((s) => esc(DATA.strumenti[s]?.nome || s)).join(", ") || "Nessuno strumento particolare";
  const guarnizione = r.guarnizione.elementi.length ? esc(r.guarnizione.testo) : "Nessuna";
  const note = [r.variante ? `<p class="variante"><strong>Variante:</strong> ${esc(r.variante)}</p>` : "", r.note ? `<p class="note-ricetta">${esc(r.note)}</p>` : ""].join("");

  $("#scheda-dettagli").innerHTML = `
    <div class="blocco">
      <h2>Ingredienti e dosi</h2>
      <table class="tabella-ing">
        <thead><tr><th scope="col">Ingrediente</th><th scope="col">Dose</th></tr></thead>
        <tbody>${ing}</tbody>
      </table>
    </div>
    <div class="blocco">
      <h2>Tecnica e servizio</h2>
      <div class="meta-riga"><span><strong>Tecnica:</strong> ${esc(nomeTecnica(r.tecnica))}</span></div>
      <div class="meta-riga"><span><strong>Bicchiere:</strong> ${esc(nomeBicchiere(r.bicchiere))}</span></div>
      <div class="meta-riga"><span><strong>Ghiaccio:</strong> ${esc(r.ghiaccio.tipo === "nessuno" ? "nessuno" : r.ghiaccio.tipo)}${r.ghiaccio.nota ? ` — ${esc(r.ghiaccio.nota)}` : ""}</span></div>
      <div class="meta-riga"><span><strong>Strumenti:</strong> ${strumenti}</span></div>
      <div class="meta-riga"><span><strong>Guarnizione:</strong> ${guarnizione}</span></div>
      <p class="note-ricetta">${esc(DATA.tecniche[r.tecnica]?.descrizione || "")}</p>
    </div>
    <div class="blocco">
      <h2>Procedimento</h2>
      <ol class="procedimento">${passi}</ol>
    </div>
    <div class="blocco">
      <h2>Note e fonte</h2>
      ${note || '<p class="note-ricetta">Nessuna nota aggiuntiva.</p>'}
      <p class="note-ricetta">Fonte consultata: <a href="${esc(r.fonte.url)}" target="_blank" rel="noopener">${esc(r.fonte.nome)}</a> (${esc(r.fonte.editore)}).</p>
    </div>`;
}

$("#back-catalogo").addEventListener("click", () => mostra("catalogo"));
$("#back-scheda").addEventListener("click", () => { fermaDemo(); apriRicetta(RICETTA.id); });

// ---------- avvio modalità ----------
$("#avvia-demo").addEventListener("click", () => avvia("demo"));
$("#avvia-guidata").addEventListener("click", () => avvia("guidata"));
$("#avvia-sfida").addEventListener("click", () => avvia("sfida"));

function avvia(modo) {
  MODO = modo;
  fermaDemo();
  SIM = new Simulazione(RICETTA, DATA, modo);
  ingSelezionato = null;
  strumentoAttivo = null;
  const primoPasso = RICETTA.passi[0];
  doveAttivo = primoPasso?.dove || (primoPasso?.da === "blender" ? "blender" : "bicchiere");
  if (doveAttivo === "mixing" && RICETTA.tecnica === "blend") doveAttivo = "blender";
  galleggiaScelto = false;
  demo = { step: 0, playing: false, animando: false, timer: null, log: [] };

  if (modo === "demo") {
    SIM.bicchiereScelto = RICETTA.bicchiere;
    SIM.bicchiereFuoriRicetta = false;
  }
  if (!SCENA) SCENA = new Scena($("#scena"), DATA);
  SCENA.setMotion(motionRidotto);
  SCENA.setRicetta(RICETTA, SIM);
  $("#titolo-banco").textContent = (modo === "sfida" ? "Sfida: " : "") + RICETTA.nome;
  $("#modo-etichetta").textContent = modo === "demo" ? "Dimostrazione" : modo === "guidata" ? "Esercitazione guidata" : "Sfida";
  $("#pannello-demo").hidden = modo !== "demo";
  $("#pannello-guidata").hidden = modo !== "guidata";
  $("#pannello-sfida").hidden = modo !== "sfida";
  $("#riepilogo").hidden = true;
  $("#feedback-live").innerHTML = "";
  $("#registro").innerHTML = "";
  aggiungiRegistro("info", modo === "demo" ? "Premi Pausa/Avvia o usa le frecce per muoverti tra i passaggi." : "Seleziona un ingrediente, imposta la dose e versa.");

  renderTabs();
  renderStrumenti();
  renderScaffale();
  renderOperazioni();
  renderDosatore();
  aggiornaPannelli();
  if (modo === "demo") {
    preparaDemo(0);
    demo.playing = true;
    aggiornaControlliDemo();
    programmaDemo(400);
  } else {
    SCENA.render(SIM, { attivo: doveAttivo });
  }
  mostra("banco");
}

// ---------- contenitori ----------
function contenitoriDisponibili() {
  const lista = ["bicchiere", "shaker"];
  if (RICETTA.tecnica === "blend") lista.push("blender");
  else lista.push("mixing");
  return lista;
}

function renderTabs() {
  const tabs = $("#contenitore-tabs");
  tabs.innerHTML = contenitoriDisponibili().map((d) => `<button class="tab-cont" type="button" data-dove="${d}" aria-pressed="${d === doveAttivo}">${CONTENITORI[d]}</button>`).join("");
  $$("#contenitore-tabs .tab-cont").forEach((b) => b.addEventListener("click", () => {
    doveAttivo = b.dataset.dove;
    renderTabs();
    SCENA.render(SIM, { attivo: doveAttivo });
    aggiornaObiettivo();
  }));
  if (!SIM.bicchiereScelto && MODO !== "demo") renderSelettoreBicchiere();
}

function renderSelettoreBicchiere() {
  const tabs = $("#contenitore-tabs");
  if (tabs.querySelector(".selettore-bicchiere")) return;
  const wrap = document.createElement("div");
  wrap.className = "selettore-bicchiere";
  const ids = Object.keys(DATA.bicchieri);
  wrap.innerHTML = `<label for="selettore-bicchiere-select">Bicchiere di servizio</label>
    <select id="selettore-bicchiere-select">
      <option value="">Scegli il bicchiere…</option>
      ${ids.map((id) => `<option value="${id}">${esc(nomeBicchiere(id))}</option>`).join("")}
    </select>`;
  const select = wrap.querySelector("#selettore-bicchiere-select");
  select.addEventListener("change", () => {
    if (!select.value) return;
    const esito = SIM.scegliBicchiere(select.value, DATA);
    feedback(esito.messaggio, esito.esito === "ok" ? "ok" : "err");
    aggiungiRegistro(esito.esito, esito.messaggio);
    if (esito.esito === "ok") {
      wrap.remove();
      SCENA.render(SIM, { attivo: "bicchiere" });
      renderTabs();
      aggiornaObiettivo();
    } else {
      select.value = "";
    }
  });
  tabs.appendChild(wrap);
}

// ---------- strumenti ----------
function renderStrumenti() {
  const strumenti = ["bar_spoon", "strainer", "muddler"];
  $("#banco-strumenti").innerHTML = strumenti.map((s) => `
    <button type="button" class="btn-strumento" data-strumento="${s}" aria-pressed="${strumentoAttivo === s}" title="${esc(DATA.strumenti[s].nome)}">
      ${iconaStrumento(s)}<span>${esc(DATA.strumenti[s].nome.split(" (")[0])}</span>
    </button>`).join("");
  $$("#banco-strumenti .btn-strumento").forEach((b) => b.addEventListener("click", () => {
    strumentoAttivo = strumentoAttivo === b.dataset.strumento ? null : b.dataset.strumento;
    renderStrumenti();
  }));
}

function iconaStrumento(id) {
  if (id === "bar_spoon") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v17M12 19c0 2-3 2-3 0s3-2 3 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="4" r="2" fill="currentColor"/></svg>';
  if (id === "strainer") return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v6M8 9h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7" y="2" width="10" height="4" rx="2" fill="currentColor"/></svg>';
}

// ---------- scaffale ----------
function ingredientiScaffale() {
  const ids = new Set(RICETTA.ingredienti.map((i) => i.id));
  for (const g of RICETTA.guarnizione.elementi) ids.add(g);
  if (MODO === "guidata" || MODO === "sfida") {
    const extra = MODO === "sfida" ? 6 : 4;
    let aggiunti = 0;
    for (const d of INGREDIENTI_DISTRATTORI) {
      if (aggiunti >= extra) break;
      if (ids.has(d) || !DATA.ingredienti[d]) continue;
      ids.add(d);
      aggiunti++;
    }
  }
  return [...ids];
}

function renderScaffale() {
  const ids = ingredientiScaffale();
  $("#scaffale").innerHTML = ids.map((id) => {
    const ing = DATA.ingredienti[id];
    return `<button type="button" class="bottiglia" data-ing="${id}" aria-pressed="${ingSelezionato === id}" title="${esc(ing.nome)}">
      ${bottigliaMini(ing.colore)}<span class="bottiglia-nome">${esc(ing.nome)}</span>
    </button>`;
  }).join("");
  $$("#scaffale .bottiglia").forEach((b) => b.addEventListener("click", () => selezionaIngrediente(b.dataset.ing)));
  if (ingSelezionato) {
    const el = $(`#scaffale .bottiglia[data-ing="${ingSelezionato}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function selezionaIngrediente(id) {
  ingSelezionato = id;
  const stepPrevisto = prossimoPassoPerIngrediente(id);
  const tipoIng = DATA.ingredienti[id]?.tipo;
  const soloGuarnizione = tipoIng === "guarnizione" || (stepPrevisto && stepPrevisto.tipo === "guarnisci");
  unitaSelezionata = soloGuarnizione ? "pezzi" : unitaPerIngrediente(id);
  dose = dosePerIngrediente(id, unitaSelezionata);
  galleggiaScelto = false;
  renderScaffale();
  renderDosatore();
}

function prossimoPassoPerIngrediente(id) {
  if (!SIM) return null;
  const passi = RICETTA.passi;
  for (let k = 0; k < passi.length; k++) {
    if (!SIM.completati[k] && passi[k].ing === id) return passi[k];
  }
  return passi.find((p) => p.ing === id) || null;
}

function unitaPerIngrediente(id) {
  const step = prossimoPassoPerIngrediente(id);
  if (!step) return "ml";
  if (step.tipo === "guarnisci") return "pezzi";
  return step.unita;
}

function dosePerIngrediente(id, unita) {
  const step = prossimoPassoPerIngrediente(id);
  if (step && step.tipo !== "guarnisci" && step.unita === unita && step.q != null) return Number(step.q);
  return doseDefault(unita);
}

function doseDefault(unita) {
  return { ml: 30, gocce: 3, spruzzo: 1, cucchiaino: 1, pezzi: 1, rametti: 6, foglie: 10, tazza: 1, fetta: 1, colmare: 0, a_piacere: 0, qb: 0 }[unita] ?? 30;
}

const CONFIG_UNITA = {
  ml: { max: 300, step: 2.5, presets: [10, 15, 20, 30, 45, 60], etichetta: "ml" },
  gocce: { max: 20, step: 1, presets: [1, 2, 3, 4, 8], etichetta: "gocce" },
  spruzzo: { max: 6, step: 1, presets: [1, 2, 3, 4], etichetta: "spruzzi (dash)" },
  cucchiaino: { max: 8, step: 0.5, presets: [0.5, 1, 2, 4], etichetta: "cucchiaini" },
  pezzi: { max: 10, step: 1, presets: [1, 2, 4], etichetta: "pezzi" },
  rametti: { max: 20, step: 1, presets: [], etichetta: "rametti" },
  foglie: { max: 20, step: 1, presets: [7, 10, 15], etichetta: "foglie" },
  tazza: { max: 3, step: 1, presets: [1], etichetta: "tazze" },
  fetta: { max: 4, step: 1, presets: [1], etichetta: "fette" },
  colmare: { max: 1, step: 1, presets: [], etichetta: "colma" },
  a_piacere: { max: 1, step: 1, presets: [], etichetta: "a piacere" },
  qb: { max: 1, step: 1, presets: [], etichetta: "q.b." }
};

function renderDosatore() {
  const corpo = $("#dosatore-corpo");
  if (!ingSelezionato) {
    $("#dosatore-ing").textContent = "Seleziona un ingrediente dallo scaffale";
    $("#dosatore-valore").textContent = "";
    corpo.hidden = true;
    return;
  }
  corpo.hidden = false;
  const ing = DATA.ingredienti[ingSelezionato];
  const step = prossimoPassoPerIngrediente(ingSelezionato);
  const guarnisci = ing.tipo === "guarnizione" || (step && step.tipo === "guarnisci");
  $("#dosatore-ing").textContent = ing.nome;
  $("#dosatore-unita").innerHTML = opzioniUnita(step, guarnisci).map((u) => `<option value="${u}" ${u === unitaSelezionata ? "selected" : ""}>${CONFIG_UNITA[u]?.etichetta || u}</option>`).join("");
  $("#dosatore-unita").hidden = guarnisci;

  const cfg = CONFIG_UNITA[unitaSelezionata] || CONFIG_UNITA.ml;
  const senzaDose = ["colmare", "a_piacere", "qb"].includes(unitaSelezionata);
  $("#dosatore-slider-riga").hidden = senzaDose || guarnisci;
  $("#dosatore-slider").max = cfg.max;
  $("#dosatore-slider").step = cfg.step;
  $("#dosatore-numero").max = cfg.max;
  $("#dosatore-numero").step = cfg.step;
  $("#dosatore-slider").setAttribute("aria-label", `Dose in ${cfg.etichetta}`);
  $("#dosatore-numero").setAttribute("aria-label", `Dose numerica in ${cfg.etichetta}`);

  if (guarnisci) {
    dose = 1;
    $("#dosatore-valore").textContent = "guarnizione";
  } else if (senzaDose) {
    dose = 0;
    $("#dosatore-valore").textContent = unitaSelezionata === "colmare" ? "riempi il bicchiere" : unitaSelezionata === "a_piacere" ? "a piacere" : "quanto basta";
  } else {
    dose = Math.min(Math.max(dose, 0), cfg.max);
    $("#dosatore-slider").value = dose;
    $("#dosatore-numero").value = dose;
    $("#dosatore-valore").textContent = formattaDose(dose, unitaSelezionata);
  }

  const presets = guarnisci || senzaDose ? [] : cfg.presets;
  $("#preset-riga").innerHTML = presets.map((p) => `<button type="button" class="preset" data-dose="${p}">${formattaDose(p, unitaSelezionata)}</button>`).join("") +
    (senzaDose ? `<span style="font-size:.78rem;color:var(--muted)">${unitaSelezionata === "colmare" ? "La ricetta indica di colmare il bicchiere." : "La ricetta lascia la dose a piacere."}</span>` : "");
  $$("#preset-riga [data-dose]").forEach((b) => b.addEventListener("click", () => {
    dose = Number(b.dataset.dose);
    renderDosatore();
    aggiornaJigger();
  }));

  const galleggiaWrap = $("#galleggia-wrap");
  const galleggiaPossibile = !guarnisci && (MODO === "sfida" || (step && step.tipo === "galleggia") || RICETTA.passi.some((p) => p.tipo === "galleggia" && p.ing === ingSelezionato));
  galleggiaWrap.hidden = !galleggiaPossibile;
  $("#dosatore-galleggia").checked = galleggiaScelto;
  if (galleggiaPossibile && step?.tipo === "galleggia") galleggiaScelto = true;
  $("#btn-versa").textContent = guarnisci ? "Guarnisci" : unitaSelezionata === "colmare" ? "Colma" : galleggiaScelto ? "Fai galleggiare" : "Versa";
  aggiornaJigger();
}

function opzioniUnita(step, guarnisci) {
  if (guarnisci) return ["pezzi"];
  const base = step ? step.unita : "ml";
  if (base === "ml") return ["ml", "cucchiaino"];
  if (base === "cucchiaino") return ["cucchiaino", "ml"];
  return [base];
}

function aggiornaJigger() {
  const cfg = CONFIG_UNITA[unitaSelezionata] || CONFIG_UNITA.ml;
  const h = Math.max(0, Math.min(70, (dose / cfg.max) * 70));
  const rect = $("#jigger-liquido");
  rect.setAttribute("y", 78 - h);
  rect.setAttribute("height", h);
}

$("#dosatore-slider").addEventListener("input", (e) => {
  dose = Number(e.target.value);
  $("#dosatore-numero").value = dose;
  $("#dosatore-valore").textContent = formattaDose(dose, unitaSelezionata);
  aggiornaJigger();
});
$("#dosatore-numero").addEventListener("input", (e) => {
  dose = Number(e.target.value);
  $("#dosatore-slider").value = dose;
  $("#dosatore-valore").textContent = formattaDose(dose, unitaSelezionata);
  aggiornaJigger();
});
$("#dosatore-unita").addEventListener("change", (e) => {
  unitaSelezionata = e.target.value;
  dose = doseDefault(unitaSelezionata);
  renderDosatore();
});
$("#dosatore-galleggia").addEventListener("change", (e) => {
  galleggiaScelto = e.target.checked;
  renderDosatore();
});

$("#btn-versa").addEventListener("click", () => {
  if (!ingSelezionato) return;
  const ing = DATA.ingredienti[ingSelezionato];
  const step = prossimoPassoPerIngrediente(ingSelezionato);
  const guarnisci = ing.tipo === "guarnizione" || (step && step.tipo === "guarnisci");
  if (guarnisci) {
    eseguiAzione({ tipo: "guarnisci", ing: ingSelezionato });
    return;
  }
  const senzaDose = ["colmare", "a_piacere", "qb"].includes(unitaSelezionata);
  eseguiAzione({
    tipo: galleggiaScelto ? "galleggia" : "versa",
    ing: ingSelezionato,
    q: senzaDose ? null : dose,
    unita: unitaSelezionata,
    dove: doveAttivo
  });
});

// ---------- operazioni ----------
const OPERAZIONI = [
  { tipo: "mescola", etichetta: "Mescola", icona: "spoon" },
  { tipo: "shakera", etichetta: "Shakera", icona: "shaker" },
  { tipo: "muddle", etichetta: "Pesta", icona: "muddler" },
  { tipo: "frulla", etichetta: "Frulla", icona: "blender" },
  { tipo: "roll", etichetta: "Roll", icona: "roll" },
  { tipo: "filtra", etichetta: "Filtra", icona: "strainer" },
  { tipo: "travasa", etichetta: "Travasa", icona: "travasa" },
  { tipo: "ghiaccio", ghiaccio: "cubetti", etichetta: "Ghiaccio cubetti", icona: "ice" },
  { tipo: "ghiaccio", ghiaccio: "tritato", etichetta: "Ghiaccio tritato", icona: "ice" },
  { tipo: "scalda", etichetta: "Scalda il bicchiere", icona: "heat" }
];

function iconaOperazione(tipo) {
  const s = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"';
  switch (tipo) {
    case "spoon": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v16" ${s}/><circle cx="12" cy="5" r="2" fill="currentColor"/></svg>`;
    case "shaker": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 5H9zM7 9h10l-1 11H8z" ${s}/></svg>`;
    case "muddler": return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="10" y="2" width="4" height="15" rx="2" ${s}/><rect x="8" y="17" width="8" height="4" rx="2" fill="currentColor"/></svg>`;
    case "blender": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10l-1 13H8z" ${s}/><rect x="6" y="15" width="12" height="6" rx="2" ${s}/></svg>`;
    case "roll": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9c4-4 12-4 16 0M20 15c-4 4-12 4-16 0" ${s}/></svg>`;
    case "strainer": return iconaStrumento("strainer");
    case "travasa": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h8l-3-3M19 18h-8l3 3" ${s}/><path d="M13 6v6a3 3 0 0 1-3 3H5" ${s}/></svg>`;
    case "ice": return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3" ${s}/><path d="M9 9h6v6H9z" ${s}/></svg>`;
    case "heat": return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20c-3-4 2-5 0-9M14 20c-3-4 2-5 0-9M20 20c-2-3 1-4 0-7" ${s}/></svg>`;
    default: return "";
  }
}

function renderOperazioni() {
  const demoAttivo = MODO === "demo";
  $("#operazioni").innerHTML = OPERAZIONI.map((o, i) => `
    <button type="button" class="btn-operazione" data-op="${i}" ${demoAttivo ? "disabled" : ""} title="${esc(o.etichetta)}">
      ${iconaOperazione(o.icona)}<span>${esc(o.etichetta)}</span>
    </button>`).join("");
  $$("#operazioni .btn-operazione").forEach((b) => b.addEventListener("click", () => {
    const o = OPERAZIONI[Number(b.dataset.op)];
    const azione = { tipo: o.tipo, dove: doveAttivo };
    if (o.tipo === "mescola" || o.tipo === "muddle") azione.strumento = strumentoAttivo;
    if (o.tipo === "filtra" || o.tipo === "travasa") {
      if (MODO === "guidata") {
        const i = RICETTA.passi.findIndex((p, k) => !SIM.completati[k] && p.tipo === o.tipo);
        if (i !== -1) {
          azione.da = RICETTA.passi[i].da;
          azione.verso = RICETTA.passi[i].verso;
        }
      }
      if (!azione.da) {
        azione.da = doveAttivo !== "bicchiere"
          ? doveAttivo
          : ["blender", "shaker", "mixing"].find((d) => SIM.contenitori[d].liquidi.length) || "shaker";
        azione.verso = "bicchiere";
      }
      if (o.tipo === "filtra") azione.strumento = strumentoAttivo;
    }
    if (o.tipo === "shakera") azione.dove = "shaker";
    if (o.tipo === "frulla") azione.dove = "blender";
    if (o.tipo === "roll") azione.dove = "shaker";
    if (o.tipo === "ghiaccio") azione.tipo_ghiaccio = o.ghiaccio;
    if (o.tipo === "scalda") azione.dove = "bicchiere";
    eseguiAzione(azione);
  }));
}

// ---------- esecuzione azione ----------
function eseguiAzione(azione) {
  if (!SIM || MODO === "demo") return;
  const esito = SIM.esegui(azione);
  if (esito.esito === "ok") {
    feedback(esito.messaggio, "ok");
    aggiungiRegistro("ok", esito.messaggio);
    const step = esito.passo != null ? RICETTA.passi[esito.passo] : azione;
    SCENA.render(SIM, { attivo: azione.dove || azione.verso });
    SCENA.animaPasso(step, SIM);
    if (MODO === "guidata" && esito.passo != null && !esito.completata) {
      const prossimo = SIM.passoCorrente;
      const p = prossimo != null ? RICETTA.passi[prossimo] : null;
      const prossimoDove = p?.dove || p?.verso || (p?.da === "blender" ? "blender" : null);
      if (prossimoDove && prossimoDove !== doveAttivo) {
        doveAttivo = prossimoDove;
        renderTabs();
        SCENA.render(SIM, { attivo: doveAttivo });
      }
    }
    if (esito.completata) {
      feedback("Preparazione completata: tutti i passaggi sono stati eseguiti.", "ok");
      if (MODO === "guidata") aggiornaObiettivo();
    }
    // prepara la dose successiva per lo stesso ingrediente
    if (ingSelezionato) {
      const next = prossimoPassoPerIngrediente(ingSelezionato);
      if (next && next.tipo !== "guarnisci") {
        unitaSelezionata = next.unita;
        dose = next.q != null ? Number(next.q) : doseDefault(next.unita);
      }
      renderDosatore();
    }
  } else {
    feedback(esito.messaggio, esito.esito === "err" ? "err" : "info");
    if (esito.esito === "err") aggiungiRegistro("err", esito.messaggio);
    else aggiungiRegistro("info", esito.messaggio);
    const live = $("#dosatore");
    if (!motionRidotto && esito.esito === "err") {
      live.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 220, easing: "ease-in-out" });
    }
  }
  aggiornaPannelli();
}

// ---------- pannelli ----------
function aggiornaPannelli() {
  if (!SIM) return;
  if (MODO === "guidata") {
    renderRicettaConsultabile();
    aggiornaObiettivo();
  }
  if (MODO === "demo") renderListaDemo();
  if (MODO === "sfida") $("#btn-servi").disabled = false;
}

function renderRicettaConsultabile() {
  const r = RICETTA;
  $("#ricetta-consultabile").innerHTML = `
    <h3>Ingredienti</h3>
    <ul>${r.ingredienti.map((i) => `<li>${esc(nomeIng(i.id))} <span class="dose">${esc(formattaDose(i.q, i.unita))}</span>${i.nota ? ` <span class="nota">(${esc(i.nota)})</span>` : ""}</li>`).join("")}</ul>
    <h3>Tecnica e servizio</h3>
    <ul>
      <li>${esc(nomeTecnica(r.tecnica))}</li>
      <li>Bicchiere: ${esc(nomeBicchiere(r.bicchiere))}</li>
      <li>Ghiaccio: ${esc(r.ghiaccio.tipo === "nessuno" ? "nessuno" : r.ghiaccio.tipo)}</li>
      <li>Strumenti: ${r.strumenti.map((s) => esc(DATA.strumenti[s]?.nome || s)).join(", ") || "—"}</li>
      <li>Guarnizione: ${esc(r.guarnizione.testo)}</li>
    </ul>
    <h3>Passaggi</h3>
    <ol>${r.passi.map((p) => `<li>${esc(p.testo)}</li>`).join("")}</ol>
    <p class="fonte-piccola">Fonte: ${esc(r.fonte.nome)}</p>`;
}

function aggiornaObiettivo() {
  if (MODO !== "guidata" || !SIM) return;
  const box = $("#obiettivo");
  if (!SIM.bicchiereScelto) {
    box.innerHTML = `<div class="obiettivo-titolo">Obiettivo</div><div class="obiettivo-testo"><strong>Scegli il bicchiere</strong> nella riga dei contenitori.</div>`;
    return;
  }
  if (SIM.finito) {
    box.innerHTML = `<div class="obiettivo-titolo">Preparazione completata</div><div class="obiettivo-testo">Hai eseguito tutti i passaggi. Puoi ricominciare con <strong>Ricomincia</strong> oppure tornare alla scheda e provare la sfida.</div>`;
    return;
  }
  const i = SIM.passoCorrente;
  const p = RICETTA.passi[i];
  const prog = SIM.progresso;
  box.innerHTML = `<div class="obiettivo-titolo">Prossimo passaggio · ${prog.fatti + 1} di ${prog.totali}</div>
    <div class="obiettivo-testo"><strong>${esc(p.testo)}</strong>${p.perche ? `<div class="nota" style="color:var(--muted);font-size:.82rem;margin-top:.3rem">${esc(p.perche)}</div>` : ""}</div>`;
}

// ---------- demo ----------
function preparaDemo(indice) {
  SIM.reset();
  SIM.bicchiereScelto = RICETTA.bicchiere;
  for (let i = 0; i < indice; i++) {
    SIM.completati[i] = true;
    SIM.applicaPasso(i);
  }
  demo.step = indice;
  SCENA.render(SIM, { attivo: "bicchiere", immediato: true });
  renderListaDemo();
  aggiornaPannelloDemo();
}

function aggiornaPannelloDemo() {
  const box = $("#demo-passo-corrente");
  if (demo.step >= RICETTA.passi.length) {
    box.innerHTML = `<div class="demo-passo-num">Fine</div><p class="demo-passo-testo">Preparazione completata: ${RICETTA.passi.length} passaggi.</p>`;
    return;
  }
  const p = RICETTA.passi[demo.step];
  box.innerHTML = `
    <div class="demo-passo-num">Passaggio ${demo.step + 1} di ${RICETTA.passi.length}</div>
    <p class="demo-passo-testo">${esc(p.testo)}</p>
    ${p.perche ? `<div class="demo-passo-perche"><strong>Perché:</strong> ${esc(p.perche)}</div>` : ""}`;
}

function renderListaDemo() {
  $("#demo-lista").innerHTML = RICETTA.passi.map((p, i) => `
    <li class="${i < demo.step ? "fatto" : ""}" ${i === demo.step ? 'aria-current="step"' : ""}>
      <button type="button" class="demo-passo-btn" data-passo="${i}">
        <span class="num">${i < demo.step ? "✓" : i + 1}</span><span>${esc(p.testo)}</span>
      </button>
    </li>`).join("");
  $$("#demo-lista .demo-passo-btn").forEach((b) => b.addEventListener("click", () => {
    fermaDemo();
    preparaDemo(Number(b.dataset.passo));
    aggiornaControlliDemo();
  }));
}

function aggiornaControlliDemo() {
  $("#demo-play").textContent = demo.playing ? "Pausa" : demo.step >= RICETTA.passi.length ? "Riavvia" : "Avvia";
  $("#demo-prev").disabled = demo.step <= 0;
  $("#demo-next").disabled = demo.step >= RICETTA.passi.length;
}

function programmaDemo(ms = 1150) {
  clearTimeout(demo.timer);
  if (!demo.playing) return;
  demo.timer = setTimeout(eseguiDemo, ms);
}

async function eseguiDemo() {
  if (!SIM || MODO !== "demo" || demo.animando) return;
  if (!demo.playing) return;
  if (demo.step >= RICETTA.passi.length) {
    demo.playing = false;
    aggiornaControlliDemo();
    return;
  }
  demo.animando = true;
  const i = demo.step;
  const p = RICETTA.passi[i];
  SIM.completati[i] = true;
  SIM.applicaPasso(i);
  SCENA.render(SIM, { attivo: p.dove || p.verso || p.da || "bicchiere" });
  aggiornaPannelloDemo();
  aggiornaControlliDemo();
  await SCENA.animaPasso(p, SIM);
  demo.step = i + 1;
  aggiornaPannelloDemo();
  renderListaDemo();
  aggiornaControlliDemo();
  demo.animando = false;
  if (demo.step >= RICETTA.passi.length) {
    demo.playing = false;
    aggiornaControlliDemo();
    feedback("Dimostrazione completata. Puoi rivedere un passaggio o provare tu con l'esercitazione guidata.", "ok");
    return;
  }
  if (demo.playing) programmaDemo(1000);
}

$("#demo-play").addEventListener("click", () => {
  if (demo.step >= RICETTA.passi.length) {
    preparaDemo(0);
    demo.playing = true;
    aggiornaControlliDemo();
    eseguiDemo();
    return;
  }
  demo.playing = !demo.playing;
  aggiornaControlliDemo();
  if (demo.playing) eseguiDemo();
  else clearTimeout(demo.timer);
});
$("#demo-prev").addEventListener("click", () => {
  fermaDemo();
  preparaDemo(Math.max(0, demo.step - 1));
  aggiornaControlliDemo();
});
$("#demo-next").addEventListener("click", () => {
  fermaDemo();
  preparaDemo(Math.min(RICETTA.passi.length, demo.step + 1));
  aggiornaControlliDemo();
});
$("#demo-ripeti").addEventListener("click", () => {
  fermaDemo();
  const i = Math.max(0, demo.step - 1);
  preparaDemo(i);
  demo.playing = true;
  aggiornaControlliDemo();
  eseguiDemo();
});

function fermaDemo() {
  demo.playing = false;
  demo.animando = false;
  clearTimeout(demo.timer);
  demo.timer = null;
  if (MODO === "demo" && $("#demo-play")) aggiornaControlliDemo();
}

// ---------- ricomincia ----------
$("#btn-riavvia").addEventListener("click", () => {
  fermaDemo();
  const modo = MODO;
  avvia(modo);
  feedback("Preparazione riavviata da zero.", "info");
});

// ---------- sfida: servizio e riepilogo ----------
$("#btn-servi").addEventListener("click", () => {
  if (!SIM || MODO !== "sfida") return;
  const esito = SIM.valuta();
  $("#riepilogo").hidden = false;
  $("#riepilogo-punteggio").innerHTML = `<span class="punteggio-num">${esito.punteggio}%</span><span class="punteggio-label">${esito.ok} controlli superati su ${esito.totale}. Leggi le correzioni qui sotto e riprova.</span>`;
  $("#riepilogo-sezioni").innerHTML = esito.sezioni.map((s) => `
    <div class="sezione-esito ${s.esito}">
      <h3>${esc(s.titolo)} · ${s.esito === "ok" ? "corretto" : "da correggere"}</h3>
      <ul>${s.voci.map((v) => `<li>${v.esito === "ok" ? "✓" : "✕"} ${esc(v.testo)}</li>`).join("")}</ul>
    </div>`).join("");
  $("#riepilogo").scrollIntoView({ behavior: motionRidotto ? "auto" : "smooth", block: "start" });
  feedback(`Sfida valutata: ${esito.punteggio}%. ${esito.ok} controlli superati su ${esito.totale}.`, esito.punteggio >= 70 ? "ok" : "err");
});
$("#riepilogo-riprova").addEventListener("click", () => avvia("sfida"));
$("#riepilogo-ricetta").addEventListener("click", () => { fermaDemo(); apriRicetta(RICETTA.id); });

// ---------- tastiera ----------
document.addEventListener("keydown", (e) => {
  if ($("#vista-banco").hidden || MODO !== "demo") return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
  if (e.code === "Space") {
    e.preventDefault();
    $("#demo-play").click();
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    $("#demo-prev").click();
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    $("#demo-next").click();
  }
});

// ---------- avvio ----------
async function init() {
  applicaPreferenze();
  try {
    const res = await fetch("data/ricette.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    $("#vista-catalogo").innerHTML = `<div class="blocco"><h1>Archivio ricette non caricato</h1>
      <p>Il file <code>data/ricette.json</code> non è raggiungibile (${esc(err.message)}). Se hai aperto il file con doppio clic, avvia un server locale: <code>python3 -m http.server 8000</code> e visita <code>http://localhost:8000</code>.</p></div>`;
    return;
  }
  popolaFiltri();
  renderCatalogo();
}

init();
