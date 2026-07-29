# Test del modello dati

Non c'è build: i test estraggono lo `<script>` da `index.html` e lo eseguono in node
con uno stub DOM minimale.

```sh
./test/run.sh
```

- `test.js` — modello dati: migrazione v1→v2 sul backup reale, immutabilità dello storico,
  riallineamento delle bozze, conteggi.
- `smoke.js` — costruisce davvero tutte le viste e apre gli sheet, per stanare errori a runtime.
