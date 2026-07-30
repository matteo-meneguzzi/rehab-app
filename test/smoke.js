const fs=require("fs"),path=require("path");
require("./stub.js");
global.__store["recupero_v1"]=fs.readFileSync(process.env.FIXTURE,"utf8");
const src=fs.readFileSync(process.env.MODEL,"utf8")+`
module.exports={viewOggi,viewProgressi,viewStorico,viewSetup,openDaySheet,openLevelSheet,
 openExerciseSheet,openLevelsEditor,exportSpecialist,markAllOk,markTrainOk,clearTrain,clearAll,askRegister,
 updateStickybar,setHeader,drawExPain,drawPain,todayISO,addDays,openLevelsEditor,
 ensureDay,setSecDone,registerSec,reopenSec,get S(){return S}};`;
const f=path.join(__dirname,"_smoke_gen.js");fs.writeFileSync(f,src);
const M=require(f);

let fail=0;
const run=(name,fn)=>{try{fn();console.log("  ok    "+name);}catch(e){fail++;console.log("  FAIL  "+name+"  →  "+e.message);}};

console.log("\n— COSTRUZIONE DELLE VISTE —");
run("viewOggi",()=>M.viewOggi());
run("viewProgressi",()=>M.viewProgressi());
run("viewStorico",()=>M.viewStorico());
run("viewSetup",()=>M.viewSetup());
run("setHeader",()=>M.setHeader());

console.log("\n— AZIONI RAPIDE —");
run("markTrainOk",()=>M.markTrainOk());
run("markAllOk",()=>M.markAllOk());
run("clearTrain",()=>M.clearTrain());
run("clearAll",()=>M.clearAll());
run("exportSpecialist (CSV)",()=>M.exportSpecialist());

console.log("\n— GRAFICI —");
run("drawPain",()=>M.drawPain(fakeEl("canvas")));
run("drawExPain",()=>M.drawExPain(fakeEl("canvas"),fakeEl("div")));

console.log("\n— SEZIONI REGISTRATE: RECAP E DOCK —");
const recOggi=M.ensureDay(M.todayISO());
M.markAllOk();
run("mattina registrata: recap + dock",()=>{
  M.setSecDone(recOggi,"morning",true);
  M.viewOggi();M.updateStickybar();});
run("allenamento registrato: recap + dock",()=>{
  M.setSecDone(recOggi,"train",true);
  M.viewOggi();M.updateStickybar();});
run("registerSec/reopenSec",()=>{
  M.reopenSec("train");M.viewOggi();
  M.registerSec("train");M.viewOggi();});
run("esercizio senza fronte nel recap",()=>{
  recOggi.items.push({uid:"i_orfano",exId:"e_x",fronte:null,name:"Orfano",dose:"",cad:"daily",
    status:"lieve",note:"nota",load:null,manual:true});
  M.viewOggi();
  recOggi.items.pop();});
run("torno in bozza per i test successivi",()=>{
  M.setSecDone(recOggi,"morning",false);M.setSecDone(recOggi,"train",false);M.viewOggi();});

console.log("\n— SHEET (editor giornata) —");
run("openDaySheet oggi",()=>M.openDaySheet(M.todayISO()));
run("openDaySheet giorno registrato",()=>M.openDaySheet("2026-07-25"));
run("openDaySheet giorno con orfani",()=>M.openDaySheet("2026-07-24"));
run("openLevelSheet",()=>M.openLevelSheet("pettorale"));
run("openExerciseSheet (nuovo)",()=>M.openExerciseSheet(null));
run("openExerciseSheet (modifica)",()=>M.openExerciseSheet("e_wrist"));
for(const f of M.S.fronti)run("openExerciseSheet (+ da "+f.id+")",()=>M.openExerciseSheet(null,{fronte:f.id}));
for(const f of M.S.fronti)run("openLevelsEditor "+f.id,()=>M.openLevelsEditor(f.id));

console.log(fail?`\n${fail} FALLITI\n`:"\nNESSUN ERRORE A RUNTIME\n");
process.exit(fail?1:0);
