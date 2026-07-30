# Recupero — diario di riabilitazione

App a file singolo (`index.html`): nessuna build, nessuna dipendenza. Si apre in un browser
e funziona offline; i dati vivono in `localStorage` e, se colleghi la sincronizzazione,
anche in un Gist GitHub privato e cifrato.

## Modello dati (v2)

Ogni giornata è **autosufficiente**: si porta dentro il livello di ogni fronte e la lista
degli esercizi *com'erano quel giorno*, feedback compreso.

```json
"2026-07-25": {
  "type": "train", "committed": true, "done": { "morning": true, "train": true },
  "updatedAt": "2026-07-25T19:12:03.114Z",
  "levels":  { "avambraccio": "L1", "pettorale": "L2", "pubalgia": "L0" },
  "morning": { "avambraccio": "ok" },
  "items": [
    { "uid": "i_ab12cd34", "exId": "e_wrist", "fronte": "avambraccio",
      "name": "Wrist curl eccentrico", "dose": "3×12", "cad": "alt",
      "status": "ok", "note": "", "manual": false }
  ]
}
```

Nella tab **Oggi** le due sezioni (mattina e allenamento) si registrano separatamente: `done`
dice quali hai già chiuso — una sezione chiusa si mostra come recap in sola lettura, con un
"✎ Modifica" per riaprirla. La giornata è `committed` (definitiva: conta per striscia, gate e
grafici) solo quando entrambe sono registrate.

Da cui la regola che governa tutto:

- **bozze** → si riallineano da sole al catalogo quando cambi livello o tipo di giornata
  (la lista esercizi finché la sezione allenamento è aperta);
- **giornate registrate** → mai toccate in automatico, tranne quando cambi a mano il tipo
  della giornata; per il resto solo col pulsante "⟳ Riallinea";
- **giornate di riposo** → nessun esercizio, nemmeno quelli a cadenza `daily`: si allena a
  giorni alterni e basta. La cadenza serve solo a raggruppare dentro una giornata di allenamento;
- la sync col catalogo non rimuove mai un item con feedback o con `manual: true`;
- tutto resta correggibile a posteriori dallo Storico, livello del giorno incluso.

Il catalogo (`S.exercises`, con `minLevel`) è solo il **template** da cui si compone una
giornata nuova. Modificarlo non riscrive il passato.

## Sincronizzazione

`localStorage` è la copia di lavoro, il Gist è il punto d'incontro fra i dispositivi.

- **Cifratura**: AES-GCM 256, chiave derivata dalla passphrase con PBKDF2-SHA256 (210k
  iterazioni), salt e IV casuali a ogni scrittura. Chi arrivasse all'URL del Gist non legge nulla.
- **Merge per giornata**: per ogni data vince la versione con `updatedAt` più recente, non
  l'intero file. Una seduta registrata sul telefono non viene cancellata dal desktop rimasto
  indietro. Catalogo, livelli e soglie sono un blocco unico e seguono `metaUpdatedAt`.
- **Cancellazioni**: una giornata eliminata resta come lapide (`{deleted:true}`) per
  propagarsi agli altri dispositivi.
- **Se la passphrase è sbagliata la sync si ferma prima di scrivere**: meglio non
  sincronizzare che sovrascrivere dati buoni con quelli di un dispositivo che non li capisce.
- Le credenziali stanno in una chiave `localStorage` separata: non finiscono nel Gist
  né nei backup JSON.

Per collegare un secondo dispositivo bastano **lo stesso token e la stessa passphrase**:
il Gist viene ritrovato da solo dalla sua descrizione.

## Test

```sh
./test/run.sh
```

Non c'è build: i test estraggono lo `<script>` da `index.html` e lo eseguono in node con
uno stub DOM. Quattro suite: modello dati e migrazione, smoke test delle viste, primitive
di sync, e uno scenario end-to-end con due dispositivi contro un finto Gist.

## Privacy

`.gitignore` tiene fuori dal repo il diario (`*.json`) e le note cliniche. Attenzione però:
`index.html` contiene i tre fronti e i relativi segnali rossi, quindi **chiunque apra il
sito pubblicato vede di che infortuni si tratta** (senza nomi). Le pagine hanno `noindex`,
ma non è un segreto: è un URL non pubblicizzato.
