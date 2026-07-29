// Stub DOM minimale: quel tanto che serve a far girare lo script di index.html sotto node.
function fakeEl(tag){
  return {tagName:tag,style:{setProperty(){},getPropertyValue:()=>""},dataset:{},childNodes:[],
    nodeType:1,className:"",value:"",disabled:false,textContent:"",innerHTML:"",
    clientWidth:400,offsetHeight:60,
    classList:{add(){},remove(){},contains:()=>false},
    setAttribute(){},getAttribute:()=>null,removeAttribute(){},
    append(...c){for(const x of c)if(x&&x.nodeType)this.childNodes.push(x);},
    appendChild(c){this.childNodes.push(c);return c;},
    addEventListener(){},removeEventListener(){},focus(){},select(){},remove(){},click(){},
    querySelector:()=>fakeEl("div"),querySelectorAll:()=>[],closest:()=>null,
    getContext:()=>({scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},
      fillText(){},measureText:()=>({width:10}),set fillStyle(v){},set strokeStyle(v){},
      set lineWidth(v){},set font(v){}})};
}
global.fakeEl=fakeEl;
global.document={createElement:fakeEl,createDocumentFragment:()=>fakeEl("frag"),
  createTextNode:t=>({nodeType:3,text:t}),
  querySelector:()=>fakeEl("div"),querySelectorAll:()=>[],getElementById:()=>fakeEl("div"),
  documentElement:fakeEl("html"),head:fakeEl("head"),body:fakeEl("body"),
  visibilityState:"visible",addEventListener(){}};
global.window={matchMedia:()=>({matches:false}),addEventListener(){},devicePixelRatio:1,scrollTo(){}};
global.window.self=global.window;global.window.top=global.window;
global.navigator={};
global.requestAnimationFrame=fn=>fn();
global.getComputedStyle=()=>({getPropertyValue:()=>""});
global.URL={createObjectURL:()=>"blob:x",revokeObjectURL(){}};
global.Blob=function(){};global.FileReader=function(){};
global.btoa=s=>Buffer.from(s,"binary").toString("base64");
global.atob=s=>Buffer.from(s,"base64").toString("binary");
global.__store={};
global.localStorage={getItem:k=>(k in global.__store?global.__store[k]:null),
  setItem:(k,v)=>{global.__store[k]=v},removeItem:k=>{delete global.__store[k]}};
