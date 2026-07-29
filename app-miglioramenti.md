# App "Recupero" — Punti da migliorare (backlog)

> Revisione critica dell'app (`index.html`) al **2026-07-25**. Quasi tutti i punti sono
> **verificati** leggendo il codice; dove è deduzione è segnalato con confidenza.
> Nessuna di queste modifiche è ancora stata fatta: è una lista di lavoro da riprendere.

---

## 🔴 Da sistemare (logica / correttezza)

### 1. La pubalgia non rispetta la tolleranza 0
- **Cosa:** `isCleanDay(s)` considera *pulito* sia `ok` sia `lieve`, per **tutti** i fronti.
- **Perché è un problema:** il piano dice che la **pubalgia è a tolleranza 0** (solo `ok` è pulito).
  Così l'app è più permissiva del piano proprio sul fronte più fragile.
- **Fix proposto:** rendere la soglia di "pulito" **per-fronte**. Pubalgia = solo `ok`;
  avambraccio/pettorale = `ok`|`lieve` (regola del semaforo ≤3/10).
- **Dove:** `isCleanDay` / `streak` / `cleanWeeks` in `index.html`.

### 2. Un giorno non compilato azzera la striscia
- **Cosa:** `streak(fid)` si interrompe appena incontra un giorno `missing` (non registrato).
- **Perché è un problema:** dimenticare di **loggare** ≠ aver **saltato** l'allenamento.
  Un giorno scordato resetta settimane di progresso verso il gate → punitivo, scoraggia.
- **Fix proposto:** distinguere "non loggato" (non conta ma **non spezza** la striscia)
  da "loggato peggiorato" (spezza). Eventualmente tollerare 1 buco.
- **Dove:** `streak` / `fronteDayStatus`.

### 3. Grafici e gate non sono d'accordo
- **Cosa:** i due grafici (`drawPain`, `drawExPain`) disegnano anche i giorni **in bozza**
  (non `committed`), mentre striscia/gate contano **solo** i giorni registrati
  (`fronteDayStatus` richiede `rec.committed`).
- **Perché è un problema:** un giorno può muovere il grafico ma non la striscia → incoerente.
- **Fix proposto:** i grafici mostrano di default solo i **registrati**
  (eventuale toggle "includi bozze").

### 4. ✅ RISOLTO (2026-07-29) — Il livello del giorno non veniva "congelato"
- **Era:** il livello di un giorno passato veniva **dedotto** da `levelLog` (`levelAtDate`).
  Peggio: anche la **lista esercizi** era ricalcolata dal catalogo corrente, quindi cambiare
  `minLevel` di un esercizio riscriveva retroattivamente lo storico.
- **Fatto:** modello **v2**. Ogni giornata è autosufficiente e contiene
  `levels:{fronte:levelId}` e `items:[{uid,exId,fronte,name,dose,cad,status,note,manual}]`,
  cioè gli esercizi **com'erano quel giorno**, nome e dose inclusi. Il vecchio `ex` è rimosso.
- **Regole:** le giornate **in bozza** si riallineano da sole al catalogo (`syncDayItems`);
  quelle **registrate** mai — solo col pulsante "⟳ Riallinea" nell'editor. La sync non tocca
  mai un item con feedback o aggiunto a mano (`manual`).
- **Tutto correggibile a posteriori** dallo Storico: livello del giorno, nome, dose, feedback,
  aggiunta/rimozione di esercizi (dal catalogo o scritti a mano).
- **Migrazione:** `migrateToItems()`, testata sul backup reale del 25/07. Recupera anche
  4+1 esercizi (`e_isopett`, `e_knee`, `e_add`, `e_fly`) che risultavano fatti ma erano
  spariti dal catalogo: finiscono in "Non assegnati" nell'editor, da assegnare o cancellare.

---

## 🧹 Pulizia / cruft

### 5. Campi morti nel modello — *parzialmente fatto*
- **Fatto (2026-07-29):** `pain`, `sessNote`, `sessStatus` non vengono più creati da
  `ensureDay` e l'export per lo specialista non li cita più (ora esporta livello del giorno
  e note del risveglio). Rimosse `activeExercises` / `dayLevelId` / `exercisesForLevel`,
  morte col nuovo modello.
- **Resta da fare:** i vecchi campi restano nei giorni già salvati finché non li si ripulisce
  in `migrateToItems`; `load` è ancora nel modello ma non ha UI; sono morte da prima anche
  `markAllOk`, `clearAll`, `markMorningFronteOk`, `dayComplete`; CSS `.painin` inutilizzato.

---

## 🟡 Flusso / UX

### 6. Attrito quotidiano nella registrazione
- **Cosa:** per **registrare** servono **tutti** gli esercizi mostrati **e** tutti gli stati
  mattina (`dayMissing`). I bottoni "Ok" aiutano ma non c'è un "tutto ok e registra" unico.
- **Fix proposto:** azione unica "tutto ok + registra", oppure trattare gli esercizi non
  marcati come "non fatto" così non bloccano la registrazione.

### 7. Due editor per lo stesso giorno — *parzialmente fatto*
- **Fatto (2026-07-29):** i due editor leggono e scrivono ora gli **stessi** `items` della
  giornata, quindi non mostrano più cose diverse. "Oggi" resta la vista snella (stato + nota),
  lo Storico è quello completo (livelli, dose, aggiungi/rimuovi).
- **Resta da fare:** valutare se portare "+ Esercizio" anche in "Oggi", o se il rimando
  allo Storico basta.

### 8. Grafico esercizi affollato
- **Cosa:** con molti esercizi la legenda è lunga e le linee si accavallano sullo "0".
- **Fix proposto:** raggruppare per fronte (il **peggiore** del giorno), oppure filtrare gli
  esercizi con almeno un valore > 0.

---

---

## ✅ Sincronizzazione fra dispositivi (2026-07-29)

Il problema vero non era l'editor ma il fatto che `localStorage` è per-dispositivo.
Fatto: sync via **Gist GitHub privato e cifrato** (AES-GCM + PBKDF2), **merge per giornata**
su `updatedAt`, cancellazioni propagate con lapidi, credenziali in una chiave localStorage
separata. Dettagli in `README.md`. Test: `./test/run.sh`.

**Resta da fare:** pubblicare su GitHub Pages (repo ancora da creare) e collegare il telefono.

---

## Ordine consigliato di attacco

1. **#1** pubalgia strict (per-fronte)
2. **#2** giorno mancante non azzera la striscia
3. **#5** pulizia campi morti + export
4. poi #3, #4, e infine l'UX (#6/#7/#8)

> Le prime tre toccano la **correttezza** di ciò che l'app comunica; le altre sono comodità.
