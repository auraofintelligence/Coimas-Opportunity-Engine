import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");
const pages={
 "index.html":["home",["status","stats"]],
 "portfolio.html":["portfolio",["status","project-cards"]],
 "projects.html":["project",["status","direction","project","pathway","place","filter","display","purpose","weights","results","details","review-status","related-workspaces"]],
 "jurisdictions.html":["place",["status","direction","project","pathway","place","filter","display","purpose","weights","results","details","review-status","related-workspaces"]],
 "compare.html":["compare",["status","project","pathway","place","place-b","place-c","weights","compare-results","review-status"]],
 "budget.html":["budget",["status","project","pathway","place","budget-source-items","budget-manual","budget-add","budget-totals","budget-export","budget-status"]],
 "research.html":["research",["status","lead-cards"]],
 "methodology.html":["methodology",["status","withheld","versions"]],
 "site-map.html":["sitemap",["main"]]
};
const sitemap=await read("sitemap.xml");
const portfolio=JSON.parse(await read("data/portfolio.json"));
const dataset=JSON.parse(await read("generated/dataset.json"));
dataset.portfolio=portfolio;
assert.ok(portfolio.projects.some(p=>p.id==="gamify-democracy"&&p.website==="https://gamifydemocracy.com/"));
assert.ok(portfolio.projects.some(p=>p.id==="ready-set-co-op"&&p.website==="https://ready-setco.auraofintelligence.workers.dev/index.html"));

class MockNode {
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this._value="";this.textContent="";this.style={};this.dataset={};this.checked=false}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes];if(this.tagName==="select")this._value=""}
 get options(){return this.children.filter(x=>x?.tagName==="option")}
 get value(){if(this.tagName==="select"&&!this.options.some(x=>x.value===this._value))return this.options[0]?.value??"";return this._value}
 set value(v){this._value=String(v)}
 get valueAsNumber(){return Number(this.value)}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(){}
 click(){}
}
for(const [file,[mode,required]] of Object.entries(pages)){
 const html=await read(file);
 assert.ok(html.includes('data-page="'+mode+'"'),file+" page marker");
 assert.ok(!html.includes(String.fromCodePoint(8212)),file+" punctuation");
 assert.ok(sitemap.includes("Coimas-Opportunity-Engine/"+(file==="index.html"?"":file)),file+" sitemap");
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,file+" duplicate IDs");
 required.forEach(id=>assert.ok(ids.includes(id),file+" missing "+id));
 for(const href of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const path=href[1].split(/[?#]/)[0];
   if(path&&!/^(?:https?:|mailto:|tel:|data:)/.test(path))await access(new URL(path,root));
 }
 if(mode==="sitemap")continue;
 const nodes=new Map();
 for(const m of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)){
   const n=new MockNode(m[1].toLowerCase());const value=m[0].match(/\bvalue="([^"]*)"/);if(value)n.value=value[1];nodes.set(m[2],n)
 }
 for(const m of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)){
   for(const opt of m[2].matchAll(/<option\b[^>]*\bvalue="([^"]*)"[^>]*>/gi)){const n=new MockNode("option");n.value=opt[1];nodes.get(m[1]).append(n)}
 }
 globalThis.document={body:{dataset:{page:mode}},getElementById:id=>nodes.get(id)||null,createElement:tag=>new MockNode(tag)};
 globalThis.location={search:"?project=gamify-democracy&pathway=research&place=ee&place-b=nz",pathname:"/"+file};
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(dataset)});
 const originalError=console.error;const errors=[];console.error=(...args)=>errors.push(args);
 try{await import(new URL("app.mjs?test="+mode,root))}finally{console.error=originalError}
 assert.equal(errors.length,0,file+" runtime initialisation error: "+errors.map(String).join("; "));
 assert.ok(nodes.get("status").textContent.includes("source-backed research"),file+" failed to initialise");
 const expected={home:"stats",portfolio:"project-cards",project:"results",place:"results",compare:"compare-results",budget:"budget-totals",research:"lead-cards",methodology:"withheld"}[mode];
 assert.ok(nodes.get(expected).children.length>0,file+" did not populate "+expected);
 if(mode==="budget"){
   nodes.get("budget-add").onclick();
   const row=nodes.get("budget-manual").children[0];
   assert.ok(row,"Budget allowance row was not created");
   row.children[0].value="Travel estimate";row.children[0].oninput();
   row.children[1].value="500";row.children[1].oninput();
   assert.ok(nodes.get("budget-totals").children[0].children[0].textContent.includes("500"),"Budget calculation failed");
 }
 console.log("PASS "+file);
}
console.log("PASS: all nine pages, navigation, dataset initialisation and allowance calculation.");
