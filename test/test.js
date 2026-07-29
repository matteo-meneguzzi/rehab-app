const fs=require("fs"),path=require("path");
const DIR=__dirname;
require("./stub.js");
global.__store["recupero_v1"]=fs.readFileSync(process.env.FIXTURE,"utf8");
const backup=global.__store["recupero_v1"];
const src=fs.readFileSync(process.env.MODEL,"utf8")+`
module.exports={get S(){return S},set S(v){S=v},seed,load,migrate,migrateToItems,syncDayItems,
 ensureDay,itemsOf,sortItems,fronteDayStatus,dayMissing,levelAtDate,dayType,todayISO,save,
 itemFromCatalog,streak,day};`;
const f=path.join(DIR,"_model_gen.js");
fs.writeFileSync(f,src);
const M=require(f);

let fail=0;
const ok=(c,m)=>{console.log((c?"  ok  ":"  FAIL")+"  "+m);if(!c)fail++;};
const S=M.S;

console.log("\n— MIGRAZIONE v1 -> v2 dal backup reale —");
ok(S.version===2,"version portata a 2");
const d24=S.days["2026-07-24"], d25=S.days["2026-07-25"];
ok(Array.isArray(d24.items)&&d24.items.length>0,`2026-07-24 ha items (${d24.items.length})`);
ok(d24.ex===undefined,"il vecchio campo ex è stato rimosso");
ok(d24.levels&&d24.levels.avambraccio&&d24.levels.pettorale&&d24.levels.pubalgia,
  "livelli congelati nella giornata: "+JSON.stringify(d24.levels));
ok(d25.levels.pettorale==="L2","2026-07-25 pettorale = L2 (dal levelLog di quel giorno)");

const before=JSON.parse(backup);
// ogni status/nota del vecchio modello deve essere sopravvissuto
let persi=0;
for(const d of ["2026-07-24","2026-07-25"]){
  for(const [id,old] of Object.entries(before.days[d].ex||{})){
    if(!old.status&&!old.note)continue;
    const it=S.days[d].items.find(x=>x.exId===id);
    if(!it||it.status!==old.status||(it.note||"")!==(old.note||""))persi++;
  }
}
ok(persi===0,"nessun feedback perso nella migrazione (persi: "+persi+")");
const it0=d25.items.find(x=>x.exId==="e_wrist");
ok(it0&&it0.name&&it0.dose,"gli items portano nome e dose: "+(it0?`"${it0.name}" / "${it0.dose}"`:"—"));
ok(d24.items.every(x=>x.uid),"ogni item ha un uid");

console.log("\n— IL PASSATO NON SI RISCRIVE —");
const snapPrima=JSON.stringify(S.days["2026-07-25"].items);
// l'utente modifica il catalogo: sposta il wrist curl a L5 e lo rinomina
const cat=S.exercises.find(e=>e.id==="e_wrist");
cat.minLevel="L5"; cat.name="Wrist curl (nuovo nome)"; cat.dose="4×15";
ok(JSON.stringify(S.days["2026-07-25"].items)===snapPrima,
  "cambiare il catalogo non tocca la giornata registrata");
// e nemmeno cambiare il livello corrente
S.levels.pettorale="L4";
ok(JSON.stringify(S.days["2026-07-25"].items)===snapPrima,
  "cambiare il livello corrente non tocca la giornata registrata");
ok(S.days["2026-07-25"].items.find(x=>x.exId==="e_wrist").name==="Wrist curl eccentrico",
  "la giornata conserva il nome vecchio dell'esercizio");

console.log("\n— GIORNATA IN BOZZA: segue il catalogo —");
const oggi=M.todayISO();
const rec=M.ensureDay(oggi);
rec.type="train"; M.syncDayItems(rec,oggi);
ok(rec.items.every(x=>x.uid),"items creati con uid");
ok(!rec.items.some(x=>x.exId==="e_wrist"),"wrist curl (ora L5) NON è nella bozza: livello avambraccio L1");
ok(rec.items.some(x=>x.exId==="e_pushup")===false||S.levels.pettorale==="L4","push-up presente col pettorale a L4: "+rec.items.some(x=>x.exId==="e_pushup"));
const nAlt=M.itemsOf(rec,null,"alt").length;
rec.type="rest"; M.syncDayItems(rec,oggi);
ok(M.itemsOf(rec,null,"alt").length===0,`passando a riposo spariscono gli alt (erano ${nAlt})`);
rec.type="train"; M.syncDayItems(rec,oggi);
ok(M.itemsOf(rec,null,"alt").length===nAlt,"tornando ad allenamento riappaiono");

console.log("\n— LA SYNC NON CANCELLA CIÒ CHE HA DATI —");
const vittima=rec.items.find(x=>x.cad!=="daily");
vittima.status="lieve";
rec.type="rest"; M.syncDayItems(rec,oggi);
ok(rec.items.some(x=>x.uid===vittima.uid),"un esercizio con feedback sopravvive al passaggio a riposo");
const manuale={uid:"i_test",exId:null,fronte:"pubalgia",name:"Camminata",dose:"20 min",
  cad:"daily",status:null,note:"",load:null,manual:true};
rec.items.push(manuale); M.syncDayItems(rec,oggi);
ok(rec.items.some(x=>x.uid==="i_test"),"un esercizio aggiunto a mano sopravvive alla sync");

console.log("\n— CONTEGGI E STATO —");
const st=M.fronteDayStatus("2026-07-25","pettorale");
ok(["clean","lieve","dirty","rosso","missing"].includes(st),"fronteDayStatus legge dagli items: "+st);
for(const it of rec.items)it.status="ok";
for(const f of S.fronti)rec.morning[f.id]="ok";
ok(M.dayMissing(oggi)===0,"dayMissing = 0 quando tutto è compilato");
rec.items[0].status=null;
ok(M.dayMissing(oggi)===1,"dayMissing = 1 togliendo una selezione");

console.log(fail?`\n${fail} TEST FALLITI\n`:"\nTUTTI I TEST PASSATI\n");
process.exit(fail?1:0);
