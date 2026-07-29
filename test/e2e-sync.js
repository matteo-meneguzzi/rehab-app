// Due dispositivi (due istanze dell'app con localStorage separati) contro un finto Gist.
// È il test che conta: verifica che nessuna seduta si perda per strada.
const fs=require("fs"),path=require("path");
require("./stub.js");

/* ---- finto GitHub: un Gist in memoria ---- */
const GIST={id:null,content:null};
let chiamate=0, tokenValido="tok_buono";
global.fetch=async(url,opts)=>{
  chiamate++;opts=opts||{};
  const auth=(opts.headers&&opts.headers.Authorization)||"";
  if(auth!=="Bearer "+tokenValido)return {ok:false,status:401,text:async()=>"bad token"};
  const body=opts.body?JSON.parse(opts.body):null;
  const j=o=>({ok:true,status:200,json:async()=>o,text:async()=>JSON.stringify(o)});
  if(url.endsWith("/gists?per_page=100"))
    return j(GIST.id?[{id:GIST.id,description:"recupero-app · diario riabilitazione (cifrato)",
      files:{"recupero.json":{}}}]:[]);
  if(/\/gists$/.test(url)&&opts.method==="POST"){
    GIST.id="gist_finto_1";GIST.content=body.files["recupero.json"].content;return j({id:GIST.id});}
  if(/\/gists\/[^/]+$/.test(url)&&opts.method==="PATCH"){
    GIST.content=body.files["recupero.json"].content;return j({id:GIST.id});}
  if(/\/gists\/[^/]+$/.test(url))
    return j({id:GIST.id,files:{"recupero.json":{content:GIST.content,truncated:false}}});
  return {ok:false,status:404,text:async()=>"?"};
};

/* ---- due dispositivi ---- */
const SRC=fs.readFileSync(process.env.MODEL,"utf8")+`
module.exports={get S(){return S},set S(v){S=v},get CFG(){return CFG},get SYNC(){return SYNC},
 syncNow,cloudConnect,ensureDay,save,day,todayISO,addDays,initSnap,markTrainOk};`;
const stores={};
function device(nome){
  const f=path.join(__dirname,"_dev_"+nome+".js");
  fs.writeFileSync(f,SRC);
  stores[nome]={};global.__store=stores[nome];
  const m=require(f);
  return {nome,m,use(){global.__store=stores[nome];}};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;
const ok=(c,m)=>{console.log((c?"  ok  ":"  FAIL")+"  "+m);if(!c)fail++;};

(async()=>{
const A=device("desktop"), B=device("telefono");

console.log("\n— PRIMO COLLEGAMENTO —");
A.use();
A.m.ensureDay("2026-07-27").morning.avambraccio="ok";
A.m.ensureDay("2026-07-27").committed=true;
A.m.save(true);
await A.m.cloudConnect("tok_buono","stessa passphrase");
ok(!!GIST.id,"il desktop crea il Gist al primo collegamento");
ok(GIST.content&&!GIST.content.includes("avambraccio"),"il Gist è cifrato (nessun campo leggibile)");

B.use();
await B.m.cloudConnect("tok_buono","stessa passphrase");
ok(B.m.CFG.gistId==="gist_finto_1","il telefono ritrova il Gist da solo, senza incollare l'ID");
ok(!!B.m.day("2026-07-27"),"il telefono riceve la giornata registrata sul desktop");

console.log("\n— UNA SEDUTA REGISTRATA IN PALESTRA —");
await sleep(5);
B.use();
const recB=B.m.ensureDay("2026-07-28");
recB.type="train";recB.morning.pubalgia="ok";recB.committed=true;
B.m.save(true);
await B.m.syncNow(true);
A.use();
await A.m.syncNow(true);
ok(!!A.m.day("2026-07-28"),"il desktop vede la seduta registrata sul telefono");

console.log("\n— MODIFICHE INCROCIATE, NESSUNO PERDE NIENTE —");
await sleep(5);
A.use();
const rA=A.m.ensureDay("2026-07-26");rA.committed=true;rA.morning.pettorale="lieve";A.m.save(true);
B.use();
const rB=B.m.ensureDay("2026-07-25");rB.committed=true;rB.morning.pettorale="ok";B.m.save(true);
// entrambi sincronizzano, il desktop per primo
A.use();await A.m.syncNow(true);
B.use();await B.m.syncNow(true);
A.use();await A.m.syncNow(true);
ok(!!A.m.day("2026-07-26")&&!!A.m.day("2026-07-25"),"il desktop ha entrambe le giornate");
B.use();
ok(!!B.m.day("2026-07-26")&&!!B.m.day("2026-07-25"),"il telefono ha entrambe le giornate");

console.log("\n— STESSA GIORNATA, VINCE LA PIÙ RECENTE —");
A.use();
A.m.ensureDay("2026-07-28").morning.avambraccio="lieve";A.m.save(true);
await A.m.syncNow(true);
await sleep(5);
B.use();
B.m.ensureDay("2026-07-28").morning.avambraccio="peggio";B.m.save(true);
await B.m.syncNow(true);
A.use();await A.m.syncNow(true);
ok(A.m.day("2026-07-28").morning.avambraccio==="peggio",
  "la correzione più recente (telefono) sovrascrive quella vecchia sul desktop");

console.log("\n— PASSPHRASE SBAGLIATA: NON DEVE DISTRUGGERE NIENTE —");
const prima=GIST.content;
const C=device("terzo");
C.use();
await C.m.cloudConnect("tok_buono","passphrase sbagliata");
ok(GIST.content===prima,"il Gist NON è stato toccato");
ok(C.m.SYNC.state==="err"&&/[Pp]assphrase/.test(C.m.SYNC.msg),"errore chiaro: "+C.m.SYNC.msg);
A.use();await A.m.syncNow(true);
ok(!!A.m.day("2026-07-28")&&!!A.m.day("2026-07-27"),"i dati del desktop sono intatti");

console.log("\n— TOKEN NON VALIDO —");
const D=device("quarto");
D.use();
await D.m.cloudConnect("tok_scaduto","stessa passphrase");
ok(D.m.SYNC.state==="err"&&/[Tt]oken/.test(D.m.SYNC.msg),"errore chiaro: "+D.m.SYNC.msg);

console.log("\n— CANCELLAZIONE PROPAGATA —");
await sleep(5);
A.use();
A.m.S.days["2026-07-26"]={deleted:true};A.m.save(true);
await A.m.syncNow(true);
B.use();await B.m.syncNow(true);
ok(B.m.day("2026-07-26")===null,"la giornata cancellata sul desktop sparisce anche dal telefono");
ok(!!B.m.day("2026-07-27"),"le altre giornate restano");

console.log(`\n(${chiamate} chiamate all'API in tutto lo scenario)`);
console.log(fail?`${fail} TEST FALLITI\n`:"TUTTI I TEST PASSATI\n");
process.exit(fail?1:0);
})().catch(e=>{console.error("ERRORE:",e);process.exit(1);});
