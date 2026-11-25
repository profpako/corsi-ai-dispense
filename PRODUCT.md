# PRODUCT.md — Banco Bar (simulatore di cocktail)

## Prodotto
App web statica, in italiano, che simula la preparazione di cocktail su un banco bar virtuale.
Commissionata da un docente di informatica per un corso sull'AI rivolto a docenti; utenti finali:
studenti di un istituto alberghiero (14–19 anni), in aula o a casa, anche in proiezione durante il corso.

## Fatti verificati (dal brief)
- Catalogo: almeno 30 ricette, di cui almeno 10 analcoliche; ricercabile e filtrabile per tipologia,
  tecnica e presenza di alcol; modalità "solo analcoliche".
- Ricette IBA dalle schede ufficiali International Bartenders Association (iba-world.com);
  le altre da fonti professionali, con link alla fonte in scheda e varianti attribuite.
- Dati ricetta: ingredienti + dosi + unità, tecnica, strumenti, bicchiere, ghiaccio, guarnizione,
  procedimento; gestire "colmare", "qualche goccia", "a piacere".
- Tre modalità: Dimostrazione (passo-passo con pausa/indietro/rivedi), Esercitazione guidata
  (dosatore virtuale, feedback specifico sugli errori), Sfida (ricetta nascosta, riepilogo finale).
- Ordine dei passaggi valutato solo quando incide sulla preparazione o è prescritto dalla ricetta.
- Banco bar riconoscibile: ingredienti, strumenti, area di preparazione; elementi usabili evidenziati.
- Animazioni fedeli alle azioni: liquido nel dosatore, ghiaccio nello shaker, miscelazione, filtrazione.
- Tutte le azioni con clic/tocco e tastiera; trascinamento opzionale con equivalente a comando.
- Modalità a movimento ridotto con equivalenti visivi e testuali.
- HTML/CSS/JS, hosting statico, nessun account/backend/chiave API.
- Archivio ricette separato dal codice UI, correggibile/ampliabile.
- README con avvio, file ricette, verifiche svolte.

## Assunzioni (inferite dal brief, non confermate dall'utente)
- Lingua unica: italiano. Nessuna localizzazione.
- Nessun salvataggio progressi richiesto: stato in memoria (localStorage solo per preferenze UI).
- Pubblico minorenne: contenuto didattico su tecniche, nessun invito al consumo; nota educativa.
- Valutazione sfida: riepilogo qualitativo con errori da correggere, non voto numerico obbligatorio
  (un punteggio sintetico è aggiunto come aiuto al docente).
- Stile visivo confermato dall'utente: banco bar scuro ed elegante (opzione 1); fallback opzione 3
  (moderno colorato) se non gradito.

## Vincoli tecnici
- Solo file statici; fetch di data/ricette.json (richiede serving HTTP, non file://).
- Nessuna dipendenza runtime obbligatoria; animazioni CSS + Web Animations API.
- Verifica pre-consegna nel browser: ricetta con shaker, ricetta build, analcolica; feedback
  ingrediente/dose sbagliati; riavvio; tastiera; layout piccolo.