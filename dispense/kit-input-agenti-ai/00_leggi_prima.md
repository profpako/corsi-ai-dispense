# Kit di input per progetti AI didattici

Tutti i contenuti sono esempi fittizi, pronti per una demo senza dati personali.

| Progetto da far realizzare | File da usare | Risultato da chiedere all agente |
|---|---|---|
| Doc2Forms | 01_materiale_storia.docx, 03_materiale_storia.pdf, 05_materiale_storia_timeline.txt, 06_rilevazioni_meteo_immagine.png | Anteprima JSON modificabile e Google Modulo dopo conferma |
| Generatore di quiz | 01_materiale_storia.docx o 03_materiale_storia.pdf | Quiz con risposte e motivazioni |
| Flashcard | 05_materiale_storia_timeline.txt | Flashcard domanda risposta e mazzo CSV |
| Timeline | 05_materiale_storia_timeline.txt | Timeline con eventi, date e conseguenze |
| Rubriche e feedback | 02_consegna_podcast_rubrica.docx | Rubrica a quattro livelli ed esempio di feedback |
| Immagine in Excel | 06_rilevazioni_meteo_immagine.png | Tabella CSV/XLSX con celle incerte evidenziate |
| Excel in visual | 07_dati_meteo.xlsx | Grafico, lettura dei dati e infografica |
| Sito di unita didattica | 08_brief_sito_unita_didattica.md | Sito a una pagina responsive |
| Wiki personale delle lezioni | 09_lezione_storia.md, 10_lezione_scienze.md, 11_lezione_italiano.md | Archivio locale con ricerca, filtri e schede modificabili |
| Progettazione di unita didattica | 01_materiale_storia.docx, 09_lezione_storia.md | Sequenza di lezioni con obiettivi, attivita e verifica |
| Materiali per livelli diversi | 01_materiale_storia.docx | Due versioni del testo con stessi concetti essenziali e un glossario |
| Laboratorio guidato sui dati | 07_dati_meteo.xlsx | Attivita di scienze con grafico, domande e controllo dei valori |
| Controllo di coerenza didattica | 09_lezione_storia.md, 02_consegna_podcast_rubrica.docx | Matrice obiettivi, attivita, prove e punti da rivedere |
| Archivio di attivita riusabili | 01_materiale_storia.docx, 05_materiale_storia_timeline.txt | Quiz, flashcard e timeline indicizzati per obiettivo |

## Prompt di avvio per un agente

Costruisci una piccola app locale per docenti. Deve accettare il file allegato, estrarre i dati, mostrare un anteprima modificabile e non eseguire azioni esterne senza un pulsante di conferma. Usa solo dati di esempio e aggiungi istruzioni per eseguire il progetto.

Per Doc2Forms aggiungi: restituisci una bozza JSON validata prima di creare il Google Modulo. Le domande devono basarsi solo sul contenuto del file e segnalare le informazioni insufficienti.

Per il wiki usa le tre lezioni Markdown come archivio iniziale. Chiedi un'importazione ripetibile: importare lo stesso file due volte deve aggiornare la scheda esistente, senza crearne una copia. Il docente deve poter controllare titolo, classe, obiettivi, materiali e fonti prima di salvare.
