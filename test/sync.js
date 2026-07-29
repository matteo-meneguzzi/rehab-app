// Test della sincronizzazione: cifratura, merge per giornata, marcatempo, lapidi.
// Il livello di rete è simulato con un finto Gist in memoria.
const fs=require("fs"),path=require("path");
require("./stub.js"); // stub DOM condiviso

const src=fs.readFileSync(process.env.MODEL,"utf8")+`
module.exports={encryptState,decryptState,mergeStates,stampChanges,initSnap,dayFingerprint,
 ensureDay,save,syncNow,setSync,day,todayISO,addDays,loadCfg,saveCfg,cloudOn,
 get S(){return S},set S(v){S=v},get CFG(){return CFG},set CFG(v){CFG=v},get SYNC(){return SYNC}};`;
const f=path.join(__dirname,"_sync_gen.js");fs.writeFileSync(f,src);

let fail=0;
const ok=(c,m)=>{console.log((c?"  ok  ":"  FAIL")+"  "+m);if(!c)fail++;};

(async()=>{
const M=require(f);

console.log("\n— CIFRATURA —");
const segreto={version:2,days:{"2026-07-20":{note:"dolore inguine 4/10"}},metaUpdatedAt:"x"};
const blob=await M.encryptState(segreto,"passphrase giusta");
ok(!blob.includes("inguine")&&!blob.includes("dolore"),"il testo cifrato non contiene i dati in chiaro");
const p=JSON.parse(blob);
ok(p.enc==="v1"&&p.salt&&p.iv&&p.data,"header del blob: "+p.kdf+" x"+p.iter);
const round=await M.decryptState(blob,"passphrase giusta");
ok(JSON.stringify(round)===JSON.stringify(segreto),"round-trip: i dati tornano identici");
let caught=null;
try{await M.decryptState(blob,"passphrase SBAGLIATA");}catch(e){caught=e;}
ok(caught&&caught.badPass,"passphrase sbagliata → errore marcato badPass (blocca la scrittura)");
const blob2=await M.encryptState(segreto,"passphrase giusta");
ok(blob2!==blob,"due cifrature dello stesso dato sono diverse (salt/iv casuali)");
const chiaro=await M.decryptState(JSON.stringify({version:2,days:{}}),"qualsiasi");
ok(chiaro.version===2,"legge anche un Gist salvato in chiaro (compatibilità)");

console.log("\n— MERGE GIORNATA PER GIORNATA —");
const mk=(d,txt,t)=>({[d]:{committed:true,note:txt,updatedAt:t}});
const local={version:2,metaUpdatedAt:"2026-07-28T10:00:00Z",days:Object.assign({},
  mk("2026-07-25","desktop",  "2026-07-25T20:00:00Z"),
  mk("2026-07-26","solo qui", "2026-07-26T20:00:00Z"),
  mk("2026-07-27","vecchia",  "2026-07-27T08:00:00Z"))};
const remote={version:2,metaUpdatedAt:"2026-07-28T09:00:00Z",days:Object.assign({},
  mk("2026-07-25","desktop",  "2026-07-25T20:00:00Z"),
  mk("2026-07-24","dal telefono","2026-07-24T21:00:00Z"),
  mk("2026-07-27","più recente","2026-07-27T19:00:00Z"))};
const m=M.mergeStates(local,remote);
ok(m.out.days["2026-07-26"].note==="solo qui","una giornata presente solo in locale sopravvive");
ok(m.out.days["2026-07-24"].note==="dal telefono","una giornata presente solo sul cloud viene presa");
ok(m.out.days["2026-07-27"].note==="più recente","a parità di data vince il timestamp più recente");
ok(m.out.days["2026-07-25"].note==="desktop","le giornate identiche restano identiche");
ok(m.fromCloud===2,"conta 2 giornate arrivate dal cloud (ne segnala l'aggiornamento): "+m.fromCloud);
ok(m.out.metaUpdatedAt==="2026-07-28T10:00:00Z","catalogo/livelli: vince il meta più recente (locale)");

const m2=M.mergeStates({version:2,metaUpdatedAt:"2026-07-01T00:00:00Z",days:{},exercises:["vecchio"]},
                       {version:2,metaUpdatedAt:"2026-07-29T00:00:00Z",days:{},exercises:["nuovo"]});
ok(m2.out.exercises[0]==="nuovo","se il cloud ha il catalogo più recente, vince quello");

const tie=M.mergeStates({version:2,days:mk("2026-07-25","A","2026-07-25T20:00:00Z")},
                        {version:2,days:mk("2026-07-25","B","2026-07-25T20:00:00Z")});
ok(tie.out.days["2026-07-25"].note==="A"&&tie.tie===1,
  "stesso istante ma contenuto diverso: tiene il locale e lo segnala");
ok(M.mergeStates(local,null).out===local,"nessun dato remoto: lo stato locale passa intatto");

console.log("\n— MARCATEMPO —");
M.S={version:2,createdAt:"2026-07-01",days:{},fronti:[],exercises:[],levels:{}};
M.initSnap();
M.S.days["2026-07-20"]={committed:false,items:[]};
M.stampChanges();
const t1=M.S.days["2026-07-20"].updatedAt;
ok(!!t1,"una giornata nuova riceve updatedAt");
M.stampChanges();
ok(M.S.days["2026-07-20"].updatedAt===t1,"un save che non cambia nulla NON aggiorna updatedAt");
await new Promise(r=>setTimeout(r,5));
M.S.days["2026-07-20"].committed=true;
M.stampChanges();
ok(M.S.days["2026-07-20"].updatedAt>t1,"modificando la giornata updatedAt avanza");
const meta1=M.S.metaUpdatedAt;
M.S.exercises.push({id:"x"});
M.stampChanges();
ok(M.S.metaUpdatedAt!==meta1,"toccando il catalogo si aggiorna metaUpdatedAt");

console.log("\n— CANCELLAZIONI PROPAGATE —");
M.S.days["2026-07-21"]={deleted:true,updatedAt:"2026-07-29T10:00:00Z"};
ok(M.day("2026-07-21")===null,"una giornata cancellata è invisibile all'app");
const mDel=M.mergeStates(
  {version:2,days:{"2026-07-21":{deleted:true,updatedAt:"2026-07-29T10:00:00Z"}}},
  {version:2,days:{"2026-07-21":{committed:true,note:"vecchia",updatedAt:"2026-07-29T09:00:00Z"}}});
ok(mDel.out.days["2026-07-21"].deleted===true,
  "la cancellazione recente vince sul contenuto vecchio dell'altro dispositivo");
const rec=M.ensureDay("2026-07-21");
ok(!rec.deleted&&Array.isArray(rec.items),"ricompilare quel giorno lo resuscita pulito");

console.log(fail?`\n${fail} TEST FALLITI\n`:"\nTUTTI I TEST PASSATI\n");
process.exit(fail?1:0);
})().catch(e=>{console.error("ERRORE:",e);process.exit(1);});
