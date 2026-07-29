#!/bin/sh
# Estrae lo script da index.html ed esegue le due suite.
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
OUT=$(mktemp -d)
python3 - "$DIR/../index.html" "$OUT" <<'PY'
import sys
src=open(sys.argv[1],encoding='utf-8').read()
js=src.split('<script>',1)[1].rsplit('</script>',1)[0]
open(sys.argv[2]+'/full.js','w',encoding='utf-8').write(js)
open(sys.argv[2]+'/model.js','w',encoding='utf-8').write(js.split('/* ----- nav ----- */')[0])
PY
node --check "$OUT/full.js" && echo "sintassi ok"
cp "$DIR/test.js" "$DIR/smoke.js" "$DIR/sync.js" "$DIR/e2e-sync.js" "$DIR/stub.js" "$OUT/"
FIXTURE="$DIR/fixture-v1.json" MODEL="$OUT/model.js" node "$OUT/test.js"
FIXTURE="$DIR/fixture-v1.json" MODEL="$OUT/model.js" node "$OUT/smoke.js"
FIXTURE="$DIR/fixture-v1.json" MODEL="$OUT/model.js" node "$OUT/sync.js"
FIXTURE="$DIR/fixture-v1.json" MODEL="$OUT/model.js" node "$OUT/e2e-sync.js"
