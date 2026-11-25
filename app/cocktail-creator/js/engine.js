// Motore di simulazione: stato del banco, validazione guidata, valutazione sfida.
// Nessuna dipendenza dalla UI: riceve la ricetta e le azioni, restituisce esiti.

export const CONTENITORI = {
  bicchiere: "Bicchiere",
  shaker: "Shaker",
  mixing: "Mixing glass",
  blender: "Frullatore"
};

export const AZIONI = {
  versa: "Versa",
  galleggia: "Fai galleggiare",
  ghiaccio: "Aggiungi ghiaccio",
  mescola: "Mescola",
  shakera: "Shakera",
  muddle: "Pesta",
  frulla: "Frulla",
  roll: "Esegui il roll",
  filtra: "Filtra",
  travasa: "Travasa",
  guarnisci: "Guarnisci",
  scalda: "Scalda il bicchiere"
};

const UNITA_PLURALE = {
  ml: "ml",
  g: "g",
  gocce: "gocce",
  spruzzo: "spruzzi",
  cucchiaino: "cucchiaini",
  pezzi: "pezzi",
  rametti: "rametti",
  foglie: "foglie",
  tazza: "tazze",
  fetta: "fette",
  colmare: "colma",
  a_piacere: "a piacere",
  qb: "q.b."
};

const UNITA_SINGOLARE = {
  gocce: "goccia",
  spruzzo: "spruzzo",
  cucchiaino: "cucchiaino",
  pezzi: "pezzo",
  rametti: "rametto",
  foglie: "foglia",
  tazza: "tazza",
  fetta: "fetta"
};

export function formattaDose(q, unita) {
  if (unita === "colmare") return "colma";
  if (unita === "a_piacere") return "a piacere";
  if (unita === "qb") return "q.b.";
  if (q == null) return unita && UNITA_PLURALE[unita] ? UNITA_PLURALE[unita] : "";
  const n = Number.isInteger(q) ? String(q) : String(q).replace(".", ",");
  if (unita === "ml" || unita === "g") return `${n} ${unita}`;
  if (q === 1 && UNITA_SINGOLARE[unita]) return `${n} ${UNITA_SINGOLARE[unita]}`;
  return `${n} ${UNITA_PLURALE[unita] || unita}`;
}

export function formattaQuantita(q, unita) {
  if (unita === "colmare") return "colmare";
  if (unita === "a_piacere") return "a piacere";
  if (unita === "qb") return "q.b.";
  return formattaDose(q, unita);
}

function tolleranza(step) {
  if (step.q == null) return Infinity;
  if (step.unita === "ml" || step.unita === "g") return Math.max(2, Math.round(step.q * 0.05));
  if (step.unita === "cucchiaino") return 0.5;
  if (step.unita === "gocce") return 1;
  if (step.unita === "spruzzo") return 0.5;
  return 0;
}

function nomeIng(data, id) {
  return data.ingredienti[id]?.nome || id;
}

const IN_CONTENITORE = {
  bicchiere: "nel bicchiere",
  shaker: "nello shaker",
  mixing: "nel mixing glass",
  blender: "nel frullatore"
};
const DA_CONTENITORE = {
  bicchiere: "dal bicchiere",
  shaker: "dallo shaker",
  mixing: "dal mixing glass",
  blender: "dal frullatore"
};
const AL_CONTENITORE = {
  bicchiere: "al bicchiere",
  shaker: "allo shaker",
  mixing: "al mixing glass",
  blender: "al frullatore"
};
const inVaso = (d) => IN_CONTENITORE[d] || `nel ${d}`;
const daVaso = (d) => DA_CONTENITORE[d] || `dal ${d}`;
const aVaso = (d) => AL_CONTENITORE[d] || `al ${d}`;

function contenitorePerPasso(step) {
  if (step.tipo === "versa" || step.tipo === "galleggia" || step.tipo === "ghiaccio" || step.tipo === "mescola" ||
      step.tipo === "shakera" || step.tipo === "muddle" || step.tipo === "frulla" || step.tipo === "roll" || step.tipo === "scalda") {
    return step.dove || "bicchiere";
  }
  if (step.tipo === "filtra" || step.tipo === "travasa") return step.verso || "bicchiere";
  if (step.tipo === "guarnisci") return "bicchiere";
  return "bicchiere";
}

export class Simulazione {
  constructor(ricetta, data, modo = "guidata") {
    this.ricetta = ricetta;
    this.data = data;
    this.modo = modo;
    this.reset();
  }

  reset() {
    this.contenitori = {
      bicchiere: this.nuovoContenitore(3),
      shaker: this.nuovoContenitore(4),
      mixing: this.nuovoContenitore(2),
      blender: this.nuovoContenitore(5)
    };
    this.bicchiereScelto = null;
    this.bicchiereFuoriRicetta = false;
    this.completati = this.ricetta.passi.map(() => false);
    this.registro = [];
    this.errori = [];
    this.scaldato = false;
    this.finito = false;
    this.servito = false;
    this.azioni = [];
  }

  nuovoContenitore(z) {
    return { liquidi: [], ghiaccio: null, guarnizioni: [], z };
  }

  // ---------- letture ----------
  get passoCorrente() {
    const i = this.completati.findIndex((c) => !c);
    return i === -1 ? null : i;
  }

  get completata() {
    return this.completati.every(Boolean);
  }

  get progresso() {
    const fatti = this.completati.filter(Boolean).length;
    return { fatti, totali: this.completati.length };
  }

  liquidoTotale(dove) {
    return this.contenitori[dove].liquidi.reduce((s, l) => s + (l.q || 0), 0);
  }

  ingredientiVersati() {
    const mappa = new Map();
    for (const [dove, c] of Object.entries(this.contenitori)) {
      for (const l of c.liquidi) {
        const k = l.ing;
        const cur = mappa.get(k) || { ing: l.ing, q: 0, unita: l.unita, dove: [] };
        cur.q += l.q || 0;
        if (!cur.dove.includes(dove)) cur.dove.push(dove);
        mappa.set(k, cur);
      }
    }
    return [...mappa.values()];
  }

  // ---------- applicazione stato ----------
  aggiungiLiquido(dove, ing, q, unita, float = false) {
    const c = this.contenitori[dove];
    if (!c) return;
    const colore = this.data.ingredienti[ing]?.colore || "#c9a227";
    const qeff = q == null ? 25 : q; // per colmare/a piacere/qb: volume indicativo per il disegno
    if (float) {
      c.liquidi.push({ ing, q: qeff, qReale: q, unita, colore, float: true });
      return;
    }
    const ultimo = c.liquidi[c.liquidi.length - 1];
    if (ultimo && ultimo.ing === ing && !ultimo.float) {
      ultimo.q += qeff;
    } else {
      c.liquidi.push({ ing, q: qeff, qReale: q, unita, colore });
    }
  }

  aggiungiGhiaccio(dove, tipo) {
    const c = this.contenitori[dove];
    if (c) c.ghiaccio = tipo;
  }

  aggiungiGuarnizione(ing) {
    const c = this.contenitori.bicchiere;
    if (!c.guarnizioni.includes(ing)) c.guarnizioni.push(ing);
  }

  applicaPasso(indice) {
    const step = this.ricetta.passi[indice];
    if (!step) return;
    const dove = contenitorePerPasso(step);
    switch (step.tipo) {
      case "versa":
      case "galleggia":
        this.aggiungiLiquido(dove, step.ing, step.q, step.unita, step.tipo === "galleggia");
        break;
      case "ghiaccio":
        this.aggiungiGhiaccio(dove, step.tipo_ghiaccio);
        break;
      case "filtra":
      case "travasa": {
        const da = step.da;
        const verso = step.verso;
        const liquidi = this.contenitori[da].liquidi.splice(0);
        for (const l of liquidi) this.aggiungiLiquido(verso, l.ing, l.q, l.unita, l.float);
        break;
      }
      case "guarnisci":
        this.aggiungiGuarnizione(step.ing);
        break;
      case "scalda":
        this.scaldato = true;
        break;
      default:
        break;
    }
  }

  // ---------- validazione ----------
  scegliBicchiere(id, data) {
    const nome = this.data.bicchieri[id]?.nome || id;
    if (this.modo === "guidata" && id !== this.ricetta.bicchiere) {
      const atteso = this.data.bicchieri[this.ricetta.bicchiere]?.nome || this.ricetta.bicchiere;
      return this.errore(`Hai scelto ${nome}. La ricetta prevede ${atteso}.`);
    }
    this.bicchiereScelto = id;
    if (id !== this.ricetta.bicchiere) this.bicchiereFuoriRicetta = true;
    this.registra("info", `Bicchiere scelto: ${nome}.`);
    return { esito: "ok", messaggio: `Bicchiere scelto: ${nome}.` };
  }

  errore(messaggio) {
    const e = { esito: "err", messaggio };
    this.errori.push(messaggio);
    this.registra("err", messaggio);
    return e;
  }

  info(messaggio) {
    this.registra("info", messaggio);
    return { esito: "info", messaggio };
  }

  registra(esito, testo) {
    this.registro.push({ esito, testo, ora: Date.now() });
  }

  // Trova il passo pendente che corrisponde all'azione (solo guidata).
  trovaPasso(azione) {
    const passi = this.ricetta.passi;
    const pendenti = [];
    for (let i = 0; i < passi.length; i++) if (!this.completati[i]) pendenti.push(i);

    if (azione.tipo === "versa" || azione.tipo === "galleggia") {
      const tipoAtteso = azione.tipo;
      const candidati = pendenti.filter((i) => passi[i].tipo === tipoAtteso && passi[i].ing === azione.ing);
      if (candidati.length) return { indice: candidati[0], tipoTrovato: true };
      // ingrediente presente in ricetta ma con tecnica diversa (es. versare invece di far galleggiare)
      const altroTipo = pendenti.find((i) => (passi[i].tipo === "versa" || passi[i].tipo === "galleggia") && passi[i].ing === azione.ing);
      if (altroTipo != null) return { indice: altroTipo, tipoTrovato: false, tipoPasso: passi[altroTipo].tipo };
      return { indice: null };
    }

    if (azione.tipo === "filtra" || azione.tipo === "travasa") {
      const candidati = pendenti.filter((i) => passi[i].tipo === azione.tipo);
      if (candidati.length) return { indice: candidati[0], tipoTrovato: true };
      const altro = pendenti.find((i) => (passi[i].tipo === "filtra" || passi[i].tipo === "travasa") && passi[i].tipo !== azione.tipo);
      if (altro != null) return { indice: altro, tipoTrovato: false, tipoPasso: passi[altro].tipo };
      return { indice: null };
    }

    if (azione.tipo === "guarnisci") {
      const candidati = pendenti.filter((i) => passi[i].tipo === "guarnisci" && passi[i].ing === azione.ing);
      if (candidati.length) return { indice: candidati[0], tipoTrovato: true };
      return { indice: null };
    }

    const candidati = pendenti.filter((i) => passi[i].tipo === azione.tipo);
    if (candidati.length) return { indice: candidati[0], tipoTrovato: true };
    return { indice: null };
  }

  // Esegue un'azione. In guidata valida e blocca gli errori; in sfida applica tutto e registra.
  esegui(azione) {
    if (this.finito) return this.info("La preparazione è conclusa. Premi Ricomincia per rifarla.");
    const tipo = azione.tipo;

    if (!this.bicchiereScelto) {
      return this.errore("Prima scegli il bicchiere di servizio: trovi le opzioni sotto i contenitori.");
    }

    if (this.modo === "sfida") return this.eseguiSfida(azione);

    // ----- guidata -----
    if ((tipo === "mescola" || tipo === "muddle" || tipo === "filtra") && azione.strumento !== this.attrezzoRichiesto(tipo)) {
      return this.errore(this.messaggioStrumento(tipo, azione.strumento));
    }

    const trovato = this.trovaPasso(azione);
    if (trovato.indice == null) {
      return this.errore(this.messaggioPassoInesistente(azione));
    }
    const step = this.ricetta.passi[trovato.indice];

    if (trovato.tipoTrovato === false) {
      if (azione.tipo === "versa" && trovato.tipoPasso === "galleggia") {
        return this.errore(`Il ${nomeIng(this.data, azione.ing)} va fatto galleggiare, non versato: attiva "Fai galleggiare" nel dosatore.`);
      }
      if (azione.tipo === "galleggia" && trovato.tipoPasso === "versa") {
        return this.errore(`Il ${nomeIng(this.data, azione.ing)} va versato normalmente, non fatto galleggiare.`);
      }
      if (azione.tipo === "filtra") {
        return this.errore("La ricetta prevede di travasare senza strainer, non di filtrare.");
      }
      if (azione.tipo === "travasa") {
        return this.errore("La ricetta prevede di filtrare con lo strainer, non di travasare.");
      }
      return this.errore("Questo passaggio non è previsto dalla ricetta.");
    }

    // Ordine: in esercitazione guidata si segue la ricetta passo per passo.
    const primoPendente = this.passoCorrente;
    if (primoPendente != null && trovato.indice > primoPendente) {
      const p = this.ricetta.passi[primoPendente];
      return this.errore(`Prima devi completare il passaggio ${primoPendente + 1}: ${p.testo}`);
    }

    if (azione.dove && step.dove && azione.dove !== step.dove) {
      return this.errore(`Stai lavorando ${inVaso(azione.dove)}. La ricetta prevede ${inVaso(step.dove)}.`);
    }

    if (tipo === "ghiaccio" && azione.tipo_ghiaccio !== step.tipo_ghiaccio) {
      const atteso = step.tipo_ghiaccio === "tritato" ? "tritato" : "in cubetti";
      const usato = azione.tipo_ghiaccio === "tritato" ? "tritato" : "in cubetti";
      return this.errore(`Hai aggiunto ghiaccio ${usato}. La ricetta prevede ghiaccio ${atteso}.`);
    }

    if (tipo === "versa" || tipo === "galleggia") {
      const esitoDose = this.confrontaDose(step, azione);
      if (esitoDose) return this.errore(esitoDose);
    }

    if ((tipo === "filtra" || tipo === "travasa") && (azione.da !== step.da || azione.verso !== step.verso)) {
      return this.errore(`Il passaggio va fatto ${daVaso(step.da)} ${aVaso(step.verso)}. Contenitore attivo: ${CONTENITORI[azione.da] || "—"}.`);
    }

    // ok: applica
    this.completati[trovato.indice] = true;
    this.applicaPasso(trovato.indice);
    this.azioni.push({ ...azione, passo: trovato.indice });
    const msg = this.messaggioSuccesso(step);
    this.registra("ok", msg);
    if (this.completata) {
      this.finito = true;
      this.registra("ok", "Preparazione completata: tutti i passaggi sono stati eseguiti.");
      return { esito: "ok", messaggio: msg, completata: true, passo: trovato.indice };
    }
    return { esito: "ok", messaggio: msg, passo: trovato.indice };
  }

  eseguiSfida(azione) {
    const tipo = azione.tipo;
    if ((tipo === "mescola" || tipo === "muddle" || tipo === "filtra") && azione.strumento !== this.attrezzoRichiesto(tipo)) {
      return this.errore(this.messaggioStrumento(tipo, azione.strumento));
    }
    const dove = azione.tipo === "filtra" || azione.tipo === "travasa" ? azione.verso : azione.dove;
    switch (tipo) {
      case "versa":
      case "galleggia":
        this.aggiungiLiquido(azione.dove, azione.ing, azione.q, azione.unita, tipo === "galleggia");
        break;
      case "ghiaccio":
        this.aggiungiGhiaccio(azione.dove, azione.tipo_ghiaccio);
        break;
      case "filtra":
      case "travasa": {
        const liquidi = this.contenitori[azione.da].liquidi.splice(0);
        for (const l of liquidi) this.aggiungiLiquido(azione.verso, l.ing, l.q, l.unita, l.float);
        break;
      }
      case "guarnisci":
        this.aggiungiGuarnizione(azione.ing);
        break;
      case "scalda":
        this.scaldato = true;
        break;
      default:
        break;
    }
    const testo = this.descriviAzione(azione);
    this.azioni.push({ ...azione });
    this.registra("ok", testo);
    return { esito: "ok", messaggio: testo };
  }

  attrezzoRichiesto(tipo) {
    if (tipo === "mescola") return "bar_spoon";
    if (tipo === "muddle") return "muddler";
    if (tipo === "filtra") return "strainer";
    return null;
  }

  messaggioStrumento(tipo, strumento) {
    const azione = { mescola: "mescolare", muddle: "pestare", filtra: "filtrare" }[tipo] || "procedere";
    const richiesto = this.data.strumenti[this.attrezzoRichiesto(tipo)]?.nome || "lo strumento giusto";
    if (!strumento) return `Per ${azione} serve ${richiesto}: selezionalo prima dagli strumenti.`;
    const usato = this.data.strumenti[strumento]?.nome || strumento;
    return `Hai usato ${usato}. Per ${azione} serve ${richiesto}.`;
  }

  messaggioPassoInesistente(azione) {
    const ing = azione.ing ? nomeIng(this.data, azione.ing) : null;
    const inRicetta = ing && (this.ricetta.ingredienti.some((i) => i.id === azione.ing) ||
      this.ricetta.guarnizione.elementi.includes(azione.ing));
    if (ing && azione.tipo === "guarnisci" && inRicetta) {
      return `La guarnizione ${ing} non si aggiunge in questo momento: controlla l'ordine dei passaggi.`;
    }
    if (ing && azione.tipo === "guarnisci") {
      return `La guarnizione ${ing} non è prevista dalla ricetta.`;
    }
    if (ing && inRicetta) {
      const completato = this.ricetta.passi.some((p, i) => (p.tipo === "versa" || p.tipo === "galleggia") && p.ing === azione.ing && this.completati[i]);
      if (completato) return `Hai già versato il ${ing} per questa ricetta.`;
      const stepDiverso = this.ricetta.passi.find((p) => (p.tipo === "versa" || p.tipo === "galleggia") && p.ing === azione.ing);
      if (stepDiverso && stepDiverso.tipo === "galleggia") return `Il ${ing} va fatto galleggiare, non versato.`;
      return `Il ${ing} è previsto, ma non in questo passaggio.`;
    }
    if (ing) return `Il ${ing} non è previsto dalla ricetta.`;
    return "Questa operazione non è prevista dalla ricetta.";
  }

  confrontaDose(step, azione) {
    const nome = nomeIng(this.data, step.ing);
    const atteso = formattaDose(step.q, step.unita);
    const toll = tolleranza(step);
    const unitaOk = azione.unita === step.unita ||
      (step.unita === "ml" && azione.unita === "cucchiaino") ||
      (step.unita === "cucchiaino" && azione.unita === "ml");
    if (!unitaOk) {
      return `La dose del ${nome} si misura in ${UNITA_PLURALE[step.unita] || step.unita}: imposta l'unità corretta nel dosatore. La ricetta prevede ${atteso}.`;
    }
    if (step.unita === "colmare" || step.unita === "a_piacere" || step.unita === "qb" || step.q == null) {
      return null;
    }
    const q = Number(azione.q) || 0;
    const qConfronto = azione.unita !== step.unita && step.unita === "cucchiaino" ? q / 5 : q;
    const attesoNum = Number(step.q);
    if (!Number.isFinite(q) || q <= 0) {
      return `Dose mancante: la ricetta prevede ${atteso} di ${nome}.`;
    }
    const diff = qConfronto - attesoNum;
    if (Math.abs(diff) > toll) {
      return `Hai versato ${formattaDose(Number(q), azione.unita)} di ${nome}. La ricetta ne prevede ${atteso}. Versamento annullato: riprova.`;
    }
    return null;
  }

  messaggioSuccesso(step) {
    if (step.tipo === "versa" || step.tipo === "galleggia") {
      return `Aggiunto: ${formattaDose(step.q, step.unita)} di ${nomeIng(this.data, step.ing)}.`;
    }
    if (step.tipo === "ghiaccio") {
      const t = step.tipo_ghiaccio === "tritato" ? "ghiaccio tritato" : "cubetti";
      return `Ghiaccio aggiunto (${t}) ${inVaso(step.dove)}.`;
    }
    if (step.tipo === "guarnisci") return `Guarnizione: ${nomeIng(this.data, step.ing)}.`;
    if (step.tipo === "filtra") return `Filtrato ${daVaso(step.da)} ${aVaso(step.verso)}.`;
    if (step.tipo === "travasa") return `Travasato ${daVaso(step.da)} ${aVaso(step.verso)}.`;
    const esiti = {
      mescola: "Mescolato con il bar spoon.",
      shakera: "Shakerato con energia.",
      muddle: "Ingredienti pestati delicatamente con il muddler.",
      frulla: "Frullato fino a consistenza liscia.",
      roll: "Roll eseguito tra i due contenitori.",
      scalda: "Bicchiere scaldato con acqua calda."
    };
    return esiti[step.tipo] || `${AZIONI[step.tipo] || "Passaggio"} eseguito.`;
  }

  descriviAzione(azione) {
    if (azione.tipo === "versa" || azione.tipo === "galleggia") {
      return `${azione.tipo === "galleggia" ? "Fatto galleggiare" : "Versato"}: ${formattaDose(azione.q, azione.unita)} di ${nomeIng(this.data, azione.ing)} ${inVaso(azione.dove)}.`;
    }
    if (azione.tipo === "ghiaccio") return `Aggiunto ghiaccio (${azione.tipo_ghiaccio === "tritato" ? "tritato" : "cubetti"}) ${inVaso(azione.dove)}.`;
    if (azione.tipo === "guarnisci") return `Aggiunta guarnizione: ${nomeIng(this.data, azione.ing)}.`;
    if (azione.tipo === "filtra") return `Filtrato ${daVaso(azione.da)} ${aVaso(azione.verso)}.`;
    if (azione.tipo === "travasa") return `Travasato ${daVaso(azione.da)} ${aVaso(azione.verso)}.`;
    return `${AZIONI[azione.tipo] || azione.tipo}.`;
  }

  // ---------- valutazione sfida ----------
  valuta() {
    const r = this.ricetta;
    const sezioni = [];
    const add = (titolo, voci) => {
      const err = voci.some((v) => v.esito === "err");
      sezioni.push({ titolo, esito: err ? "err" : "ok", voci });
    };

    // Ingredienti e dosi (contenuto finale del bicchiere)
    const vociIng = [];
    const versati = new Map();
    for (const l of this.contenitori.bicchiere.liquidi) {
      const cur = versati.get(l.ing) || { q: 0, unita: l.unita };
      cur.q += l.qReale == null ? l.q : l.qReale;
      versati.set(l.ing, cur);
    }
    // ingredienti rimasti in shaker/mixing non filtrati: li segnaliamo a parte
    const fuori = new Map();
    for (const dove of ["shaker", "mixing", "blender"]) {
      for (const l of this.contenitori[dove].liquidi) {
        const lista = fuori.get(l.ing) || [];
        if (!lista.includes(dove)) lista.push(dove);
        fuori.set(l.ing, lista);
      }
    }
    for (const ing of r.ingredienti) {
      const nome = nomeIng(this.data, ing.id);
      const v = versati.get(ing.id);
      if (!v) {
        const dove = fuori.get(ing.id);
        if (dove) {
          vociIng.push({ esito: "err", testo: `${nome} è rimasto ${inVaso(dove[0])}: non è stato filtrato o travasato nel bicchiere.` });
        } else {
          vociIng.push({ esito: "err", testo: `Manca ${nome}: non è nel bicchiere.` });
        }
        continue;
      }
      if (ing.unita === "colmare" || ing.unita === "a_piacere" || ing.unita === "qb") {
        vociIng.push({ esito: "ok", testo: `${nome}: presente.` });
        continue;
      }
      const atteso = Number(ing.q);
      const toll = tolleranza({ q: ing.q, unita: ing.unita });
      if (Math.abs(v.q - atteso) <= toll) {
        vociIng.push({ esito: "ok", testo: `${nome}: ${formattaDose(v.q, ing.unita)} (corretto).` });
      } else {
        vociIng.push({ esito: "err", testo: `Hai versato ${formattaDose(v.q, ing.unita)} di ${nome}. La ricetta ne prevede ${formattaDose(atteso, ing.unita)}.` });
      }
    }
    for (const [ing, v] of versati) {
      if (!r.ingredienti.some((i) => i.id === ing)) {
        vociIng.push({ esito: "err", testo: `${nomeIng(this.data, ing)} non è previsto dalla ricetta (${formattaDose(v.q, v.unita)} versati).` });
      }
    }
    add("Ingredienti e dosi", vociIng);

    // Tecnica
    const vociTec = [];
    const tipiFatti = new Set(this.azioni.map((a) => a.tipo));
    const tecnicheRichieste = new Set();
    for (const p of r.passi) {
      if (["shakera", "mescola", "muddle", "frulla", "roll", "galleggia"].includes(p.tipo)) tecnicheRichieste.add(p.tipo);
    }
    const nomiTec = {
      shakera: "shakerato", mescola: "mescolato con il bar spoon", muddle: "pestato con il muddler",
      frulla: "frullato", roll: "eseguito il roll", galleggia: "fatto galleggiare un ingrediente"
    };
    if (tecnicheRichieste.size === 0) {
      vociTec.push({ esito: "ok", testo: "Nessuna operazione meccanica richiesta." });
    } else {
      for (const t of tecnicheRichieste) {
        if (tipiFatti.has(t)) vociTec.push({ esito: "ok", testo: `Hai ${nomiTec[t]}.` });
        else vociTec.push({ esito: "err", testo: `Manca: dovevi ${t === "galleggia" ? "far galleggiare un ingrediente" : t === "mescola" ? "mescolare con il bar spoon" : t === "muddle" ? "pestare con il muddler" : t === "frulla" ? "frullare" : t === "roll" ? "eseguire il roll" : "shakerare"}.` });
      }
    }
    const shakeraPasso = r.passi.find((p) => p.tipo === "shakera");
    if (shakeraPasso) {
      const fatto = this.azioni.find((a) => a.tipo === "shakera");
      if (fatto && fatto.dove !== shakeraPasso.dove) {
        vociTec.push({ esito: "err", testo: `Hai shakerato ${inVaso(fatto.dove)}: la ricetta prevede lo shaker.` });
      }
    }
    add("Tecnica", vociTec);

    // Bicchiere e ghiaccio
    const vociBic = [];
    const nomeBic = this.data.bicchieri[r.bicchiere]?.nome || r.bicchiere;
    if (!this.bicchiereScelto) vociBic.push({ esito: "err", testo: `Nessun bicchiere scelto: la ricetta prevede ${nomeBic}.` });
    else if (this.bicchiereScelto !== r.bicchiere) {
      vociBic.push({ esito: "err", testo: `Hai scelto ${this.data.bicchieri[this.bicchiereScelto]?.nome || this.bicchiereScelto}. La ricetta prevede ${nomeBic}.` });
    } else vociBic.push({ esito: "ok", testo: `Bicchiere corretto: ${nomeBic}.` });

    const passiGhiaccio = r.passi.filter((p) => p.tipo === "ghiaccio");
    if (!passiGhiaccio.length) {
      const conGhiaccio = ["bicchiere", "shaker", "mixing", "blender"].filter((d) => this.contenitori[d].ghiaccio);
      if (conGhiaccio.length) {
        vociBic.push({ esito: "err", testo: `Hai aggiunto ghiaccio ${inVaso(conGhiaccio[0])}, ma la ricetta non lo prevede.` });
      } else {
        vociBic.push({ esito: "ok", testo: "Nessun ghiaccio: corretto." });
      }
    } else {
      for (const p of passiGhiaccio) {
        const dove = p.dove || "bicchiere";
        const gh = this.contenitori[dove].ghiaccio;
        const atteso = p.tipo_ghiaccio === "tritato" ? "tritato" : "in cubetti";
        if (!gh) {
          vociBic.push({ esito: "err", testo: `Manca il ghiaccio ${inVaso(dove)}: la ricetta prevede ghiaccio ${atteso}.` });
        } else if (gh !== p.tipo_ghiaccio) {
          vociBic.push({ esito: "err", testo: `${inVaso(dove).charAt(0).toUpperCase() + inVaso(dove).slice(1)} hai usato ghiaccio ${gh === "tritato" ? "tritato" : "in cubetti"}. La ricetta prevede ghiaccio ${atteso}.` });
        } else {
          vociBic.push({ esito: "ok", testo: `Ghiaccio corretto ${inVaso(dove)} (${gh === "tritato" ? "tritato" : "cubetti"}).` });
        }
      }
      for (const dove of ["bicchiere", "shaker", "mixing", "blender"]) {
        const previsto = passiGhiaccio.some((p) => (p.dove || "bicchiere") === dove);
        if (!previsto && this.contenitori[dove].ghiaccio) {
          vociBic.push({ esito: "err", testo: `Hai aggiunto ghiaccio ${inVaso(dove)}, ma la ricetta non lo prevede lì.` });
        }
      }
    }
    add("Bicchiere e ghiaccio", vociBic);

    // Guarnizione
    const vociG = [];
    const attese = r.guarnizione.elementi;
    if (!attese.length) {
      vociG.push({ esito: "ok", testo: "La ricetta non prevede guarnizione." });
    } else {
      for (const g of attese) {
        if (this.contenitori.bicchiere.guarnizioni.includes(g)) vociG.push({ esito: "ok", testo: `${nomeIng(this.data, g)}: presente.` });
        else vociG.push({ esito: "err", testo: `Manca la guarnizione: ${nomeIng(this.data, g)}.` });
      }
      for (const g of this.contenitori.bicchiere.guarnizioni) {
        if (!attese.includes(g)) vociG.push({ esito: "err", testo: `Guarnizione non prevista: ${nomeIng(this.data, g)}.` });
      }
    }
    add("Guarnizione", vociG);

    // Ordine (solo passaggi rilevanti)
    const vociOrdine = [];
    const rilevanti = r.passi.map((p, i) => ({ p, i })).filter((x) => x.p.rilevante);
    if (!rilevanti.length) {
      vociOrdine.push({ esito: "ok", testo: "La ricetta non impone un ordine critico tra i passaggi." });
    } else {
      const sequenza = this.abbinaSequenza();
      const indiciRilevanti = sequenza.filter((i) => r.passi[i]?.rilevante);
      const attesiRilevanti = rilevanti.map((x) => x.i);
      const presentiAttesi = attesiRilevanti.filter((i) => indiciRilevanti.includes(i));
      const ordineOk = presentiAttesi.every((v, k) => k === 0 || v > presentiAttesi[k - 1]);
      if (!ordineOk) {
        vociOrdine.push({ esito: "err", testo: "L'ordine di alcuni passaggi critici non è corretto. Controlla la sequenza nella ricetta." });
      } else {
        vociOrdine.push({ esito: "ok", testo: "Ordine dei passaggi critici rispettato." });
      }
      for (const x of rilevanti) {
        if (!sequenza.includes(x.i)) vociOrdine.push({ esito: "err", testo: `Passaggio critico mancante: ${x.p.testo}` });
      }
    }
    add("Ordine dei passaggi", vociOrdine);

    const totale = sezioni.reduce((s, se) => s + se.voci.length, 0);
    const ok = sezioni.reduce((s, se) => s + se.voci.filter((v) => v.esito === "ok").length, 0);
    const punteggio = totale ? Math.round((ok / totale) * 100) : 0;
    this.servito = true;
    this.finito = true;
    return { punteggio, sezioni, totale, ok };
  }

  // Prova ad allineare le azioni registrate ai passi della ricetta, nell'ordine in cui sono avvenute.
  abbinaSequenza() {
    const sequenza = [];
    const usati = new Set();
    for (const a of this.azioni) {
      for (let i = 0; i < this.ricetta.passi.length; i++) {
        if (usati.has(i)) continue;
        const p = this.ricetta.passi[i];
        if (this.passoSostieneAzione(p, a)) {
          sequenza.push(i);
          usati.add(i);
          break;
        }
      }
    }
    return sequenza;
  }

  passoSostieneAzione(p, a) {
    if (a.tipo === "versa" || a.tipo === "galleggia") {
      return (p.tipo === "versa" || p.tipo === "galleggia") && p.ing === a.ing;
    }
    if (a.tipo === "ghiaccio") return p.tipo === "ghiaccio";
    if (a.tipo === "guarnisci") return p.tipo === "guarnisci" && p.ing === a.ing;
    if (a.tipo === "filtra" || a.tipo === "travasa") return p.tipo === a.tipo;
    return p.tipo === a.tipo;
  }
}

export function ingredientiRicetta(ricetta, data) {
  return ricetta.ingredienti.map((i) => ({
    ...i,
    nome: data.ingredienti[i.id]?.nome || i.id,
    colore: data.ingredienti[i.id]?.colore || "#c9a227"
  }));
}
