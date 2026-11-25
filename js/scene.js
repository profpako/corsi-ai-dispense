// Scena del banco bar: SVG persistente, liquido animato, effetti delle operazioni.
// Le animazioni rispettano la modalità a movimento ridotto (nessun movimento, stato finale immediato).

const NS = "http://www.w3.org/2000/svg";
const VELOCITA = { effetto: 950, liquido: 620 };

function el(tag, attrs = {}, parent = null) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  if (parent) parent.appendChild(n);
  return n;
}

function poligono(topW, topY, botW, botY, cx) {
  return `M${cx - topW / 2},${topY} L${cx + topW / 2},${topY} L${cx + botW / 2},${botY} L${cx - botW / 2},${botY} Z`;
}

// Geometria dei bicchieri. baseY = piano del banco.
const BICCHIERI = {
  highball: { tipo: "tumbler", topY: 170, botY: 296, topW: 60, botW: 50, cap: 350 },
  tumbler_alto: { tipo: "tumbler", topY: 178, botY: 296, topW: 64, botW: 54, cap: 350 },
  old_fashioned: { tipo: "tumbler", topY: 220, botY: 296, topW: 70, botW: 58, cap: 300 },
  double_rocks: { tipo: "tumbler", topY: 208, botY: 296, topW: 66, botW: 56, cap: 350 },
  shot: { tipo: "tumbler", topY: 252, botY: 296, topW: 46, botW: 40, cap: 60 },
  coupe: { tipo: "bowl", topY: 188, botY: 250, topW: 86, botW: 24, cap: 200, stemTop: 250, footY: 294, footW: 54 },
  martini: { tipo: "bowl", topY: 186, botY: 252, topW: 94, botW: 12, cap: 200, stemTop: 252, footY: 294, footW: 58 },
  flute: { tipo: "bowl", topY: 152, botY: 246, topW: 42, botW: 18, cap: 180, stemTop: 246, footY: 294, footW: 46 },
  calice_vino: { tipo: "bowl", topY: 172, botY: 244, topW: 80, botW: 26, cap: 400, stemTop: 244, footY: 294, footW: 54 },
  hurricane: { tipo: "bowl", topY: 162, botY: 242, topW: 84, botW: 22, cap: 450, stemTop: 242, footY: 292, footW: 50 },
  mug: { tipo: "mug", topY: 196, botY: 296, topW: 66, botW: 60, cap: 350 },
  irish: { tipo: "bowl", topY: 178, botY: 242, topW: 60, botW: 40, cap: 250, stemTop: 242, footY: 292, footW: 50 }
};

const COLORE_OTTONE = "#c9a227";

function formaBicchiere(id) {
  return BICCHIERI[id] || BICCHIERI.highball;
}

function percorsoEsterno(id) {
  const g = formaBicchiere(id);
  if (g.tipo === "mug") {
    return poligono(g.topW, g.topY, g.botW, g.botY, 0);
  }
  return poligono(g.topW, g.topY, g.botW, g.botY, 0);
}

function interno(id) {
  const g = formaBicchiere(id);
  if (g.tipo === "tumbler" || g.tipo === "mug") {
    const inset = 5;
    return {
      x1: -g.topW / 2 + inset, x2: g.topW / 2 - inset,
      y1: g.topY + 6, y2: g.botY - 6,
      cap: g.cap
    };
  }
  const inset = 5;
  return {
    x1: -g.topW / 2 + inset, x2: g.topW / 2 - inset,
    y1: g.topY + 8, y2: g.botY - 4,
    cap: g.cap
  };
}

const VASI = {
  bicchiere: { x: 400, label: "Bicchiere" },
  shaker: { x: 178, label: "Shaker" },
  mixing: { x: 622, label: "Mixing glass" },
  blender: { x: 622, label: "Frullatore" }
};

export class Scena {
  constructor(svg, data) {
    this.svg = svg;
    this.data = data;
    this.ricetta = null;
    this.sim = null;
    this.motionRidotto = false;
    this.statoPrecedente = {};
    this.gruppi = {};
    this.glassId = "highball";
    this.visibili = { shaker: true, mixing: true, blender: false };
    this.costruisciBase();
  }

  setMotion(ridotto) { this.motionRidotto = !!ridotto; }

  costruisciBase() {
    this.svg.textContent = "";
    const defs = el("defs", {}, this.svg);
    const gradLegno = el("linearGradient", { id: "legnoGrad", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": "#3f2d1e" }, gradLegno);
    el("stop", { offset: "100%", "stop-color": "#2b1f15" }, gradLegno);
    const gradMetallo = el("linearGradient", { id: "metalloGrad", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el("stop", { offset: "0%", "stop-color": "#8b8f93" }, gradMetallo);
    el("stop", { offset: "35%", "stop-color": "#e8edf0" }, gradMetallo);
    el("stop", { offset: "60%", "stop-color": "#b6bcc0" }, gradMetallo);
    el("stop", { offset: "100%", "stop-color": "#7a7f83" }, gradMetallo);
    const gradVetro = el("linearGradient", { id: "vetroGrad", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el("stop", { offset: "0%", "stop-color": "rgba(230,240,245,0.16)" }, gradVetro);
    el("stop", { offset: "45%", "stop-color": "rgba(230,240,245,0.03)" }, gradVetro);
    el("stop", { offset: "100%", "stop-color": "rgba(230,240,245,0.14)" }, gradVetro);

    // Parete e retrobanco
    el("rect", { x: 0, y: 0, width: 800, height: 430, class: "scena-fondo" }, this.svg);
    el("rect", { x: 24, y: 18, width: 752, height: 190, rx: 8, fill: "#201710", stroke: "#33261b" }, this.svg);
    el("rect", { x: 36, y: 30, width: 728, height: 78, rx: 4, fill: "#1a120c", stroke: "#2e2318" }, this.svg);
    el("rect", { x: 36, y: 120, width: 728, height: 76, rx: 4, fill: "#1a120c", stroke: "#2e2318" }, this.svg);
    el("line", { x1: 36, y1: 112, x2: 764, y2: 112, stroke: "#4a3524", "stroke-width": 2 }, this.svg);
    el("line", { x1: 36, y1: 202, x2: 764, y2: 202, stroke: "#4a3524", "stroke-width": 2 }, this.svg);

    // Bottiglie decorative sul retrobanco
    const colori = ["#8a3a1a", "#3a5a2a", "#6a4a1a", "#3a4a6a", "#7a2a2a", "#4a5a3a", "#8a6a2a", "#5a3a2a", "#2a5a5a", "#6a2a4a"];
    for (let i = 0; i < 10; i++) {
      const x = 68 + i * 76;
      this.bottigliaDecorativa(x, 42, colori[i % colori.length]);
      if (i % 2 === 0) this.bottigliaDecorativa(x + 22, 132, colori[(i + 3) % colori.length], 0.8);
    }

    // Piano di lavoro
    el("rect", { x: 0, y: 210, width: 800, height: 20, fill: "#2a1e14" }, this.svg);
    el("rect", { x: 0, y: 228, width: 800, height: 74, fill: "url(#legnoGrad)" }, this.svg);
    el("line", { x1: 0, y1: 228, x2: 800, y2: 228, stroke: COLORE_OTTONE, "stroke-width": 2, opacity: 0.7 }, this.svg);
    el("rect", { x: 0, y: 302, width: 800, height: 128, fill: "#241a12" }, this.svg);
    el("line", { x1: 0, y1: 302, x2: 800, y2: 302, stroke: "#4a3524", "stroke-width": 3 }, this.svg);
    // ombre
    el("ellipse", { cx: 400, cy: 299, rx: 48, ry: 8, fill: "#120c08", opacity: 0.55 }, this.svg);
    el("ellipse", { cx: 178, cy: 299, rx: 36, ry: 7, fill: "#120c08", opacity: 0.55 }, this.svg);
    el("ellipse", { cx: 622, cy: 299, rx: 42, ry: 7, fill: "#120c08", opacity: 0.55 }, this.svg);

    this.layerVasi = el("g", { id: "layer-vasi" }, this.svg);
    this.layerOverlay = el("g", { id: "layer-overlay" }, this.svg);

    for (const dove of Object.keys(VASI)) {
      const g = el("g", { class: "gruppo-vaso", "data-vaso": dove }, this.layerVasi);
      const label = el("g", { class: "vaso-label" }, g);
      el("rect", { x: -44, y: 318, width: 88, height: 22, rx: 6, class: "vasi-etichetta-sfondo" }, label);
      el("text", { x: 0, y: 333, class: "etichetta-vaso", text: VASI[dove].label }, label);
      g.setAttribute("transform", `translate(${VASI[dove].x} 0)`);
      this.gruppi[dove] = { gruppo: g, label, contenuto: null };
    }
  }

  bottigliaDecorativa(x, y, colore, scala = 1) {
    const h = 58 * scala;
    const w = 18 * scala;
    const g = el("g", { opacity: 0.5 }, this.svg);
    el("rect", { x: x - w / 2, y: y + 16, width: w, height: h - 16, rx: 3, fill: colore }, g);
    el("rect", { x: x - w / 4, y: y, width: w / 2, height: 18, rx: 2, fill: colore }, g);
    el("rect", { x: x - w / 2 + 3, y: y + 30, width: w - 6, height: 16, fill: "#d8c8a0", opacity: 0.55 }, g);
    el("rect", { x: x - w / 2 + 3, y: y + 30, width: w - 6, height: 3, fill: "#8a6f24", opacity: 0.8 }, g);
  }

  setRicetta(ricetta, sim) {
    this.ricetta = ricetta;
    this.sim = sim;
    this.glassId = sim.bicchiereScelto || (sim.modo === "sfida" ? "highball" : ricetta.bicchiere);
    this.visibili = {
      bicchiere: true,
      shaker: true,
      mixing: ricetta.tecnica !== "blend",
      blender: ricetta.tecnica === "blend"
    };
    this.statoPrecedente = {};
    for (const dove of Object.keys(VASI)) {
      const info = this.gruppi[dove];
      info.gruppo.style.display = this.visibili[dove] ? "" : "none";
      info.contenuto?.remove();
      info.contenuto = null;
    }
    this.disegnaContenuto("bicchiere", this.glassId);
    this.disegnaContenuto("shaker", "shaker");
    if (this.visibili.mixing) this.disegnaContenuto("mixing", "mixing");
    if (this.visibili.blender) this.disegnaContenuto("blender", "blender");
    this.render(sim, { immediato: true });
  }

  disegnaContenuto(dove, tipo) {
    const info = this.gruppi[dove];
    const g = el("g", {}, info.gruppo);
    info.contenuto = g;

    if (dove === "bicchiere") {
      this.disegnaBicchiere(g, tipo);
    } else if (dove === "shaker") {
      // corpo + coperchio
      const corpo = poligono(56, 196, 46, 296, 0);
      el("path", { d: corpo, fill: "url(#metalloGrad)", stroke: "#6f7478", "stroke-width": 2 }, g);
      el("rect", { x: -30, y: 186, width: 60, height: 12, rx: 3, fill: "#c3c9cd", stroke: "#6f7478", "stroke-width": 1.5 }, g);
      el("ellipse", { cx: 0, cy: 186, rx: 30, ry: 5, fill: "#dde2e5", stroke: "#6f7478", "stroke-width": 1.2 }, g);
      const clip = el("clipPath", { id: "clip-shaker" }, g);
      el("path", { d: poligono(50, 202, 42, 292, 0), }, clip);
      info.clip = "url(#clip-shaker)";
      info.ghiaccio = el("g", {}, g);
      info.liquidi = el("g", { "clip-path": info.clip }, g);
      info.guarnizioni = el("g", {}, g);
      info.geo = { topY: 202, botY: 292, x1: -23, x2: 23, cap: 500 };
      el("rect", { x: -9, y: 250, width: 18, height: 2, rx: 1, fill: "#8a6f24", opacity: 0.7 }, g);
    } else if (dove === "mixing") {
      el("path", { d: poligono(56, 190, 44, 296, 0), fill: "url(#vetroGrad)", stroke: "rgba(230,240,245,0.4)", "stroke-width": 2 }, g);
      el("line", { x1: -26, y1: 198, x2: -18, y2: 288, stroke: "rgba(255,255,255,0.16)", "stroke-width": 3 }, g);
      const clip = el("clipPath", { id: "clip-mixing" }, g);
      el("path", { d: poligono(50, 196, 40, 290, 0) }, clip);
      info.clip = "url(#clip-mixing)";
      info.ghiaccio = el("g", {}, g);
      info.liquidi = el("g", { "clip-path": info.clip }, g);
      info.guarnizioni = el("g", {}, g);
      info.geo = { topY: 196, botY: 290, x1: -21, x2: 21, cap: 500 };
    } else if (dove === "blender") {
      el("rect", { x: -38, y: 272, width: 76, height: 26, rx: 5, fill: "#2f3336", stroke: "#565c60", "stroke-width": 1.5 }, g);
      el("circle", { cx: 0, cy: 285, r: 5, fill: COLORE_OTTONE }, g);
      el("path", { d: poligono(62, 164, 54, 272, 0), fill: "url(#vetroGrad)", stroke: "rgba(230,240,245,0.4)", "stroke-width": 2 }, g);
      el("rect", { x: -34, y: 156, width: 68, height: 10, rx: 3, fill: "#3a3f42", stroke: "#565c60", "stroke-width": 1.2 }, g);
      const clip = el("clipPath", { id: "clip-blender" }, g);
      el("path", { d: poligono(56, 168, 48, 268, 0) }, clip);
      info.clip = "url(#clip-blender)";
      info.ghiaccio = el("g", {}, g);
      info.liquidi = el("g", { "clip-path": info.clip }, g);
      info.guarnizioni = el("g", {}, g);
      info.geo = { topY: 168, botY: 268, x1: -25, x2: 25, cap: 700 };
    }
    info.tipo = tipo;
  }

  disegnaBicchiere(g, tipo) {
    const geo = formaBicchiere(tipo);
    const info = this.gruppi.bicchiere;
    const esterno = percorsoEsterno(tipo);
    if (geo.tipo === "bowl") {
      // stelo e piede
      const stemH = geo.footY - geo.stemTop;
      el("rect", { x: -3, y: geo.stemTop, width: 6, height: Math.max(6, stemH), rx: 2, fill: "rgba(220,235,240,0.28)" }, g);
      el("ellipse", { cx: 0, cy: geo.footY, rx: geo.footW / 2, ry: 5, fill: "rgba(220,235,240,0.22)", stroke: "rgba(230,240,245,0.35)", "stroke-width": 1.5 }, g);
    }
    el("path", { d: esterno, fill: "url(#vetroGrad)", stroke: "rgba(230,240,245,0.5)", "stroke-width": 2 }, g);
    if (geo.tipo === "mug") {
      el("path", { d: `M${geo.topW / 2 - 2},${geo.topY + 18} q22,10 0,46`, fill: "none", stroke: "#b06a30", "stroke-width": 7, "stroke-linecap": "round" }, g);
      el("path", { d: esterno, fill: "rgba(176,106,48,0.16)", stroke: "#b06a30", "stroke-width": 2 }, g);
    }
    if (tipo === "irish") {
      el("path", { d: `M${geo.topW / 2 - 2},${geo.topY + 16} q20,9 0,42`, fill: "none", stroke: "rgba(230,240,245,0.4)", "stroke-width": 5 }, g);
    }
    const intr = interno(tipo);
    const clip = el("clipPath", { id: "clip-bicchiere" }, g);
    el("path", { d: poligono(intr.x2 - intr.x1, intr.y1, Math.max(10, intr.x2 - intr.x1 - 8), intr.y2, 0) }, clip);
    info.clip = "url(#clip-bicchiere)";
    info.ghiaccio = el("g", {}, g);
    info.liquidi = el("g", { "clip-path": info.clip }, g);
    info.guarnizioni = el("g", {}, g);
    info.geo = { topY: intr.y1, botY: intr.y2, x1: intr.x1, x2: intr.x2, cap: intr.cap };
    info.rim = geo.topY;
  }

  // Ridisegna lo stato dei liquidi/ghiaccio/guarnizioni con animazione dei livelli.
  render(sim, opts = {}) {
    this.sim = sim;
    const immediato = opts.immediato || this.motionRidotto;
    if (sim.bicchiereScelto && sim.bicchiereScelto !== this.glassId) {
      this.glassId = sim.bicchiereScelto;
      this.gruppi.bicchiere.contenuto.remove();
      this.gruppi.bicchiere.contenuto = null;
      this.statoPrecedente.bicchiere = null;
      this.disegnaContenuto("bicchiere", this.glassId);
    }
    for (const dove of ["bicchiere", "shaker", "mixing", "blender"]) {
      const info = this.gruppi[dove];
      if (!info.contenuto) continue;
      this.aggiornaVaso(dove, sim.contenitori[dove], immediato);
      info.label.classList.toggle("attivo", opts.attivo === dove);
      info.gruppo.classList.toggle("inattivo", opts.attivo && opts.attivo !== dove);
    }
    this.aggiornaEtichetta(sim);
  }

  aggiornaEtichetta(sim) {
    const pezzi = [];
    for (const dove of ["bicchiere", "shaker", "mixing", "blender"]) {
      const c = sim.contenitori[dove];
      if (!c || (!c.liquidi.length && !c.ghiaccio && !c.guarnizioni.length)) continue;
      const nomi = c.liquidi.map((l) => this.data.ingredienti[l.ing]?.nome || l.ing);
      if (nomi.length) pezzi.push(`${dove}: ${nomi.join(", ")}`);
    }
    const testo = pezzi.length ? `Banco bar. ${pezzi.join(". ")}.` : "Banco bar pronto: contenitori vuoti.";
    this.svg.setAttribute("aria-label", testo);
  }

  aggiornaVaso(dove, contenitore, immediato) {
    const info = this.gruppi[dove];
    const geo = info.geo;
    if (!geo || !info.liquidi) return;
    const cap = dove === "bicchiere" ? (this.data.bicchieri[this.glassId]?.capacita || geo.cap) : geo.cap;
    const altezza = geo.botY - geo.topY;
    const totale = contenitore.liquidi.reduce((s, l) => s + (l.q || 0), 0);
    const frazione = Math.min(0.92, totale / cap) * (contenitore.ghiaccio ? 0.82 : 1);
    // Le dosi piccole restano leggibili: minimo visivo, non un dato di volume.
    const hTot = totale > 0 ? Math.max(10, Math.min(altezza * 0.9, altezza * frazione)) : 0;

    info.liquidi.textContent = "";
    let y = geo.botY - 3;
    const strati = contenitore.liquidi;
    // Il liquido galleggiante va in cima: disegniamo dal fondo, l'ultimo strato addossato alla superficie.
    const alture = [];
    if (totale > 0) {
      for (const l of strati) alture.push(Math.max(1.5, (l.q || 0) / totale * hTot));
    }
    for (let i = 0; i < strati.length; i++) {
      const l = strati[i];
      const h = alture[i];
      const yTop = y - h;
      const larghezza = geo.x2 - geo.x1;
      const attesa = this.statoPrecedente[dove]?.[i];
      const rect = el("rect", { x: geo.x1, y: yTop, width: larghezza, height: h, fill: l.colore, opacity: l.float ? 0.92 : 0.86 }, info.liquidi);
      if (!immediato && attesa != null) {
        this.tweenLivello(rect, attesa, yTop, h);
      }
      y = yTop;
    }
    this.statoPrecedente[dove] = alture;
    // Superficie del liquido: alone chiaro che stacca il livello dal vetro.
    if (totale > 0 && hTot > 8) {
      const cx = (geo.x1 + geo.x2) / 2;
      el("ellipse", { cx, cy: geo.botY - 3 - hTot + 1, rx: Math.max(6, (geo.x2 - geo.x1) / 2 - 2), ry: 3, fill: "#ffffff", opacity: 0.16 }, info.liquidi);
    }

    // ghiaccio
    info.ghiaccio.textContent = "";
    if (contenitore.ghiaccio) {
      const tritato = contenitore.ghiaccio === "tritato";
      const n = tritato ? 12 : 4;
      const superficie = geo.botY - 3 - hTot;
      for (let i = 0; i < n; i++) {
        const cx = geo.x1 + 6 + ((i * 37) % Math.max(10, geo.x2 - geo.x1 - 12));
        const cy = Math.max(geo.topY + 8, superficie + 4 + ((i * 13) % 18));
        if (tritato) {
          el("path", { d: `M${cx - 3},${cy} l3,-5 l3,5 l-3,4 z`, class: "ghiaccio", opacity: 0.62 }, info.ghiaccio);
        } else {
          el("rect", { x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 2.5, class: "ghiaccio", transform: `rotate(${(i * 17) % 40 - 20} ${cx} ${cy})` }, info.ghiaccio);
        }
      }
    }

    // guarnizioni sul bordo
    info.guarnizioni.textContent = "";
    for (const ing of contenitore.guarnizioni) {
      this.disegnaGuarnizione(info.guarnizioni, ing, geo.topY, dove);
    }
  }

  tweenLivello(rect, daH, targetY, targetH) {
    const inizio = performance.now();
    const startH = Math.max(0, Math.min(Number(daH) || 0, targetH));
    const anima = (ora) => {
      const t = Math.min(1, (ora - inizio) / VELOCITA.liquido);
      const e = 1 - Math.pow(1 - t, 3);
      const h = startH + (targetH - startH) * e;
      rect.setAttribute("y", targetY + (targetH - h));
      rect.setAttribute("height", h);
      if (t < 1) requestAnimationFrame(anima);
    };
    requestAnimationFrame(anima);
  }

  disegnaGuarnizione(parent, ing, rimY, dove) {
    const i = this.data.ingredienti[ing];
    const colore = i?.colore || COLORE_OTTONE;
    const g = el("g", { class: "guarnizione" }, parent);
    const x = dove === "bicchiere" ? 0 : 0;
    switch (ing) {
      case "arancia_fetta":
      case "limone_fetta":
      case "lime_fetta":
      case "arancia_spicchio":
      case "lime_spicchio": {
        const r = ing.includes("spicchio") ? 11 : 14;
        const cy = rimY - 2;
        el("path", { d: `M${x},${cy - r} A${r},${r} 0 0 1 ${x},${cy + r} Z`, fill: colore, stroke: "rgba(255,255,255,0.55)", "stroke-width": 1.2 }, g);
        el("path", { d: `M${x},${cy - r} A${r},${r} 0 0 0 ${x},${cy + r} Z`, fill: colore, opacity: 0.75 }, g);
        g.setAttribute("transform", `translate(26 ${-rimY + rimY}) rotate(14 0 ${cy})`);
        break;
      }
      case "arancia_zest":
      case "limone_zest":
      case "lime_zest": {
        el("path", { d: `M${x - 11},${rimY - 4} q6,-12 14,-4 q4,5 -2,8`, fill: "none", stroke: colore, "stroke-width": 3.4, "stroke-linecap": "round" }, g);
        g.setAttribute("transform", "translate(22 -6)");
        break;
      }
      case "ciliegia": {
        el("circle", { cx: x + 20, cy: rimY - 10, r: 6, fill: colore, stroke: "#5a1018", "stroke-width": 1 }, g);
        el("line", { x1: x + 20, y1: rimY - 16, x2: x + 24, y2: rimY - 26, stroke: "#8a6f24", "stroke-width": 1.6 }, g);
        g.setAttribute("transform", "translate(0 0)");
        break;
      }
      case "oliva": {
        el("ellipse", { cx: x + 22, cy: rimY - 6, rx: 7, ry: 5.5, fill: colore, stroke: "#5a6a1a", "stroke-width": 1 }, g);
        el("circle", { cx: x + 22, cy: rimY - 6, r: 2.4, fill: "#c8281e" }, g);
        el("line", { x1: x + 22, y1: rimY - 12, x2: x + 22, y2: rimY - 26, stroke: "#c9a227", "stroke-width": 2 }, g);
        break;
      }
      case "sedano": {
        el("rect", { x: x + 18, y: rimY - 54, width: 7, height: 60, rx: 3, fill: colore, stroke: "#6a8a3a", "stroke-width": 1 }, g);
        el("path", { d: `M${x + 18},${rimY - 44} q-8,4 -5,12`, fill: "none", stroke: colore, "stroke-width": 4, "stroke-linecap": "round" }, g);
        break;
      }
      case "menta_rametto": {
        for (let k = 0; k < 3; k++) {
          el("ellipse", { cx: x + 16 + k * 5, cy: rimY - 26 - k * 8, rx: 7, ry: 4, fill: colore, opacity: 0.9, transform: `rotate(${-30 + k * 25} ${x + 16 + k * 5} ${rimY - 26 - k * 8})` }, g);
        }
        el("line", { x1: x + 16, y1: rimY - 40, x2: x + 17, y2: rimY - 4, stroke: "#2a5a2a", "stroke-width": 2 }, g);
        break;
      }
      case "ananas_fetta": {
        el("path", { d: `M${x + 18},${rimY - 8} a13,13 0 1 0 26,0 z`, fill: colore, stroke: "#c9a227", "stroke-width": 1.5 }, g);
        el("path", { d: `M${x + 26},${rimY - 8} l5,-6 l3,6`, fill: "none", stroke: "#6a8a3a", "stroke-width": 2 }, g);
        break;
      }
      case "caffe_chicchi": {
        for (let k = 0; k < 3; k++) {
          el("ellipse", { cx: x - 8 + k * 8, cy: rimY + 6 + (k % 2) * 3, rx: 3.4, ry: 4.2, fill: "#3a2410", transform: `rotate(${k * 30 - 30} ${x - 8 + k * 8} ${rimY + 6})` }, g);
        }
        break;
      }
      case "sale": {
        for (let k = 0; k < 14; k++) {
          const xx = x - 28 + (k * 11) % 56;
          el("circle", { cx: xx, cy: rimY - 1, r: 1.2, fill: "#f5f5f5", opacity: 0.85 }, g);
        }
        break;
      }
      default: {
        el("circle", { cx: x + 20, cy: rimY - 5, r: 5, fill: colore }, g);
      }
    }
    if (this.motionRidotto) return;
    g.animate([{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: "cubic-bezier(0.16,1,0.3,1)" });
  }

  // ---------- effetti ----------
  async animaPasso(step, sim) {
    this.sim = sim;
    if (this.motionRidotto) return;
    const geoDove = step.dove || (step.da ? step.da : "bicchiere");
    const target = step.verso || geoDove;
    switch (step.tipo) {
      case "versa":
      case "galleggia":
        await this.effettoVersa(step.dove || "bicchiere", step.ing, step.tipo === "galleggia");
        break;
      case "ghiaccio":
        await this.effettoGhiaccio(step.dove || "bicchiere");
        break;
      case "mescola":
        await this.effettoMescola(step.dove || "bicchiere");
        break;
      case "shakera":
        await this.effettoShake(step.dove || "shaker");
        break;
      case "muddle":
        await this.effettoMuddle(step.dove || "bicchiere");
        break;
      case "frulla":
        await this.effettoFrulla(step.dove || "blender");
        break;
      case "roll":
        await this.effettoRoll(step.dove || "shaker");
        break;
      case "filtra":
      case "travasa":
        await this.effettoFiltra(step.da, step.verso, step.tipo === "filtra");
        break;
      case "guarnisci":
        await this.effettoGuarnisci(step.ing);
        break;
      case "scalda":
        await this.effettoVapore("bicchiere");
        break;
      default:
        break;
    }
  }

  posVaso(dove) {
    return VASI[dove] || VASI.bicchiere;
  }

  topYVaso(dove) {
    const info = this.gruppi[dove];
    if (dove === "bicchiere") return this.gruppi.bicchiere.rim ?? 180;
    return info.geo?.topY ?? 190;
  }

  effetto(id, frames, durata) {
    const g = el("g", { class: "effetto" }, this.layerOverlay);
    id(g);
    const anim = g.animate(frames, { duration: durata, easing: "ease-in-out", fill: "both" });
    return anim.finished.catch(() => {}).then(() => g.remove());
  }

  async effettoVersa(dove, ing, float) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    const colore = this.data.ingredienti[ing]?.colore || COLORE_OTTONE;
    await this.effetto((g) => {
      // Bottiglia inclinata: il collo punta verso il bicchiere e il getto parte dalla bocca.
      const ang = 52;
      const rad = (ang * Math.PI) / 180;
      const baseX = x - 74;
      const baseY = topY - 118;
      const boccaLocale = { x: 13, y: -22 };
      const bocca = {
        x: baseX + boccaLocale.x * Math.cos(rad) - boccaLocale.y * Math.sin(rad),
        y: baseY + boccaLocale.x * Math.sin(rad) + boccaLocale.y * Math.cos(rad)
      };
      const bottiglia = el("g", { transform: `translate(${baseX} ${baseY}) rotate(${ang})` }, g);
      el("rect", { x: 0, y: 0, width: 26, height: 62, rx: 4, fill: colore, stroke: "rgba(0,0,0,0.35)", "stroke-width": 1 }, bottiglia);
      el("rect", { x: 8, y: -22, width: 10, height: 24, rx: 1.5, fill: colore, stroke: "rgba(0,0,0,0.3)", "stroke-width": 1 }, bottiglia);
      el("rect", { x: 7, y: -26, width: 12, height: 6, rx: 1.5, fill: "#c9a227" }, bottiglia);
      el("rect", { x: 3, y: 24, width: 20, height: 16, rx: 1, fill: "#f3ead9", opacity: 0.4 }, bottiglia);
      el("rect", { x: 3, y: 2, width: 3, height: 56, rx: 1.5, fill: "#ffffff", opacity: 0.18 }, bottiglia);
      el("path", {
        d: `M${bocca.x},${bocca.y} Q${bocca.x + 18},${bocca.y + 34} ${x},${topY - 3}`,
        fill: "none", stroke: colore, "stroke-width": float ? 5 : 6, "stroke-linecap": "round", opacity: 0.9
      }, g);
    }, [
      { opacity: 0, transform: "translateY(-6px)" },
      { opacity: 1, transform: "translateY(0)", offset: 0.2 },
      { opacity: 1, transform: "translateY(0)", offset: 0.8 },
      { opacity: 0, transform: "translateY(4px)" }
    ], float ? 1200 : VELOCITA.effetto);
  }

  async effettoGhiaccio(dove) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    await this.effetto((g) => {
      for (let i = 0; i < 4; i++) {
        el("rect", { x: x - 20 + i * 11, y: topY - 70, width: 13, height: 13, rx: 2.5, class: "ghiaccio", opacity: 0.9, "data-i": i }, g);
      }
    }, [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0.9, transform: "translateY(78px)", offset: 0.75 },
      { opacity: 0, transform: "translateY(84px)" }
    ], 700);
  }

  async effettoMescola(dove) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    await this.effetto((g) => {
      el("line", { x1: x, y1: topY - 26, x2: x, y2: topY + 62, stroke: "#c9a227", "stroke-width": 3 }, g);
      el("ellipse", { cx: x, cy: topY - 26, rx: 7, ry: 3.5, fill: "#e3bd45" }, g);
      el("circle", { cx: x, cy: topY + 66, r: 3.5, fill: "#8a6f24" }, g);
      el("ellipse", { cx: x, cy: topY + 34, rx: 22, ry: 7, fill: "none", stroke: "rgba(255,255,255,0.35)", "stroke-width": 2 }, g);
    }, [
      { transform: "rotate(0deg)", transformOrigin: `${x}px ${topY - 26}px` },
      { transform: "rotate(12deg)", transformOrigin: `${x}px ${topY - 26}px`, offset: 0.25 },
      { transform: "rotate(-12deg)", transformOrigin: `${x}px ${topY - 26}px`, offset: 0.5 },
      { transform: "rotate(10deg)", transformOrigin: `${x}px ${topY - 26}px`, offset: 0.75 },
      { transform: "rotate(0deg)", transformOrigin: `${x}px ${topY - 26}px` }
    ], 1200);
  }

  async effettoShake(dove) {
    const g = this.gruppi[dove]?.gruppo;
    if (!g) return;
    if (this.motionRidotto) return;
    await g.animate([
      { transform: `translate(${this.posVaso(dove).x}px, 0) rotate(0deg)` },
      { transform: `translate(${this.posVaso(dove).x + 3}px, -4px) rotate(-4deg)` },
      { transform: `translate(${this.posVaso(dove).x - 3}px, 0) rotate(4deg)` },
      { transform: `translate(${this.posVaso(dove).x + 2}px, -2px) rotate(-2deg)` },
      { transform: `translate(${this.posVaso(dove).x}px, 0) rotate(0deg)` }
    ], { duration: 800, easing: "ease-in-out", iterations: 1 }).finished.catch(() => {});
  }

  async effettoMuddle(dove) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    const botY = this.gruppi[dove]?.geo?.botY || topY + 60;
    await this.effetto((g) => {
      el("rect", { x: x - 5, y: topY - 84, width: 10, height: 80, rx: 5, fill: "#7a5a34" }, g);
      el("rect", { x: x - 9, y: topY - 6, width: 18, height: 12, rx: 4, fill: "#5a3f22" }, g);
    }, [
      { transform: "translateY(0)" },
      { transform: `translateY(${Math.min(64, botY - topY)}px)`, offset: 0.35 },
      { transform: "translateY(0)", offset: 0.55 },
      { transform: `translateY(${Math.min(58, botY - topY)}px)`, offset: 0.75 },
      { transform: "translateY(0)" }
    ], 1000);
  }

  async effettoFrulla(dove) {
    const g = this.gruppi[dove]?.gruppo;
    if (!g || this.motionRidotto) return;
    const x = this.posVaso(dove).x;
    await g.animate([
      { transform: `translate(${x}px, 0)` },
      { transform: `translate(${x + 2}px, -1px)` },
      { transform: `translate(${x - 2}px, 0)` },
      { transform: `translate(${x + 2}px, -1px)` },
      { transform: `translate(${x}px, 0)` }
    ], { duration: 550, easing: "linear" }).finished.catch(() => {});
  }

  async effettoRoll(dove) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    await this.effetto((g) => {
      el("path", { d: `M${x - 20},${topY - 10} q-30,-20 0,-34 q30,20 0,34`, fill: "none", stroke: "#d8b45a", "stroke-width": 3, opacity: 0.8 }, g);
      el("path", { d: `M${x + 20},${topY + 10} q30,20 0,34`, fill: "none", stroke: "#d8b45a", "stroke-width": 3, opacity: 0.6 }, g);
    }, [
      { opacity: 0, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)", offset: 0.3 },
      { opacity: 1, transform: "translateY(0)", offset: 0.7 },
      { opacity: 0, transform: "translateY(-6px)" }
    ], 1100);
  }

  async effettoFiltra(da, verso, conStrainer) {
    const p1 = this.posVaso(da);
    const p2 = this.posVaso(verso);
    const y1 = this.topYVaso(da) + 18;
    const y2 = this.topYVaso(verso);
    const colore = "#d8b45a";
    await this.effetto((g) => {
      el("path", { d: `M${p1.x + 22},${y1} C${p1.x + 90},${y1 - 30} ${p2.x - 70},${y2 - 40} ${p2.x},${y2 - 2}`, fill: "none", stroke: colore, "stroke-width": 5, "stroke-linecap": "round", opacity: 0.9 }, g);
      if (conStrainer) {
        el("ellipse", { cx: p1.x + 24, cy: y1 - 2, rx: 16, ry: 6, fill: "none", stroke: "#cfd6da", "stroke-width": 2.5 }, g);
        el("line", { x1: p1.x + 24, y1: y1 - 2, x2: p1.x + 56, y2: y1 - 12, stroke: "#cfd6da", "stroke-width": 2.5 }, g);
      }
    }, [
      { opacity: 0, strokeDashoffset: 120 },
      { opacity: 1, strokeDashoffset: 0, offset: 0.35 },
      { opacity: 1, strokeDashoffset: 0, offset: 0.75 },
      { opacity: 0 }
    ], 1000);
  }

  async effettoGuarnisci(ing) {
    const topY = this.topYVaso("bicchiere");
    await this.effetto((g) => {
      el("circle", { cx: 420, cy: topY - 4, r: 4, fill: this.data.ingredienti[ing]?.colore || COLORE_OTTONE }, g);
    }, [
      { opacity: 0, transform: "translateY(-24px) scale(0.6)" },
      { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.6 },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], 600);
  }

  async effettoVapore(dove) {
    const { x } = this.posVaso(dove);
    const topY = this.topYVaso(dove);
    await this.effetto((g) => {
      for (let i = 0; i < 3; i++) {
        el("path", { d: `M${x - 12 + i * 12},${topY - 6} q-6,-14 0,-26 q6,-12 0,-24`, fill: "none", stroke: "rgba(240,235,220,0.5)", "stroke-width": 2, "stroke-linecap": "round" }, g);
      }
    }, [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(-4px)", offset: 0.4 },
      { opacity: 0, transform: "translateY(-18px)" }
    ], 1100);
  }
}
