# Recupero — diario di riabilitazione

App a file singolo (`index.html`): nessuna build, nessuna dipendenza. Si apre in un browser
e funziona offline; i dati vivono in `localStorage` e, se colleghi la sincronizzazione,
anche in un Gist GitHub privato e cifrato.

## Rilascio

Basta pushare su `main`: il workflow `.github/workflows/pages.yml` pubblica su GitHub Pages
e **timbra la versione da solo** nella copia servita, come `r<numero di commit> · <commit> ·
<data>`. Nel repo il marcatore resta `dev`, così una copia aperta in locale si riconosce.

Niente da aggiornare a mano. In Impostazioni → Diagnostica trovi la versione in uso e il
pulsante "Controlla aggiornamenti", che scarica la pagina dal server saltando la cache e
confronta i due marcatori: è la risposta a "il telefono sta vedendo l'ultima versione?".

Perché serve un workflow e non basta il deploy da branch: la versione dev'essere quella del
commit *pubblicato*, e quel numero si conosce solo al momento del deploy.

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
      "name": "Wrist curl eccentrico", "dose": "3×12",
      "status": "ok", "note": "", "manual": false }
  ]
}
```

Le due sezioni (mattina e allenamento) si registrano separatamente: `done` dice quali hai
già chiuso. La giornata è `committed` (definitiva: conta per striscia, gate e grafici) solo
quando entrambe sono registrate.

Nella tab **Oggi** una sezione registrata si mostra come recap in sola lettura, con "✎ Modifica"
per riaprirla. Nello **Storico** le stesse due registrazioni ci sono ma la sezione resta sempre
modificabile: è il posto in cui si va apposta a correggere.

Da cui la regola che governa tutto:

- **bozze** → si riallineano da sole al catalogo quando cambi livello o tipo di giornata
  (la lista esercizi finché la sezione allenamento è aperta);
- **giornate registrate** → mai toccate in automatico, tranne quando cambi a mano il tipo
  della giornata; per il resto solo col pulsante "⟳ Riallinea";
- **giornate di riposo** → nessun esercizio. Ci si allena a giorni alterni e basta, quindi
  la vecchia distinzione fra cadenza `alt` e `daily` non esiste più: gli esercizi si fanno
  tutti negli stessi giorni e la lista è una sola, raggruppata per fronte. Il campo `cad`
  sopravvive solo dentro le giornate vecchie e nella migrazione da v1;
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
