import {evaluate,ordered,inScope,safeUrl,age} from "./engine.mjs";
const $=id=>document.getElementById(id);
const page=document.body.dataset.page||"home";
const params=new URLSearchParams(location.search);
const explorer=page==="project"||page==="place";
const el=(tag,t,cls)=>{const x=document.createElement(tag);if(t!==undefined)x.textContent=t;if(cls)x.className=cls;return x};
const link=(url,t)=>{const a=el(safeUrl(url)?"a":"span",t||url);if(safeUrl(url)){a.href=url;a.rel="noopener noreferrer";a.target="_blank"}return a};
const option=(s,v,t)=>{const o=el("option",t);o.value=v;s.append(o)};
const pct=v=>Math.round(v*100)+"%";
const today=new Date(Date.now()+36000000).toISOString().slice(0,10);
let data,portfolio,projects,places,observations=[],weights={};
const currentProject=()=>projects.find(p=>p.id===$("project").value);
const currentPlace=()=>places.find(p=>p.id===$("place").value);
const currentPath=()=>currentProject()?.pathways.find(p=>p.id===$("pathway").value);
const label=id=>portfolio.pathwayLabels[id]||id;
function setPaths(preferred){const s=$("pathway");s.replaceChildren();const p=currentProject();p.pathways.forEach(q=>option(s,q.id,label(q.id)));if(p.pathways.some(q=>q.id===preferred))s.value=preferred;resetWeights()}
function resetWeights(){weights={};const box=$("weights");if(!box)return;box.replaceChildren();for(const c of currentPath().criteria){const field=el("label",c.question+(c.gate?" · required gate":""));const inp=el("input");inp.type="range";inp.min=c.gate?"1":"0";inp.max="10";inp.value=c.weight;const value=el("small","Weight "+c.weight);inp.oninput=()=>{weights[c.id]=Number(inp.value);value.textContent="Weight "+inp.value;render()};field.append(inp,value);box.append(field)}}
function workspace(file,p,path,j,more={}){const query=new URLSearchParams({project:p.id,pathway:path.id,...(j?{place:j.id}:{}),...more});return file+"?"+query.toString()}
function choose(p,path,j){location.href=workspace("projects.html",p,path||p.pathways[0],j)}
function evaluateOne(p,path,j){return evaluate(p,path,j,portfolio.scopes,observations,p.id===$("project").value&&path.id===$("pathway").value?weights:{},today)}
function hasLead(p,path,j){return portfolio.researchLeads.some(l=>l.projectId===p.id&&l.pathway===path.id&&l.placeId===j.id)}
function render(){
 if(!data)return;
 if(page==="compare"){renderCompare();return}
 if(page==="budget"){renderBudget();return}
 if(!explorer)return;const p=currentProject(),j=currentPlace(),path=currentPath(),reverse=$("direction").value==="place",query=$("filter").value.toLowerCase().trim(),mode=$("display").value;
 renderPurpose(p,path,j);
 $("results-heading").textContent=reverse?"Applicable initiatives in "+j.name:"Candidate jurisdictions for "+p.title;
 let rows=reverse?projects.flatMap(pr=>pr.pathways.filter(q=>inScope(q,j,portfolio.scopes)).map(q=>({p:pr,j,path:q,label:pr.title+" · "+label(q.id),result:evaluateOne(pr,q,j),lead:hasLead(pr,q,j)}))):places.filter(place=>inScope(path,place,portfolio.scopes)).map(place=>({p,j:place,path,label:place.name,result:evaluateOne(p,path,place),lead:hasLead(p,path,place)}));
 rows=ordered(rows.filter(r=>(r.label+" "+(r.j.region||"")).toLowerCase().includes(query)&&(mode==="all"||mode==="leads"&&r.lead||mode==="ranked"&&r.result.rankable||mode==="gaps"&&r.result.reviewCoverage<1)));
 $("result-note").textContent=rows.length+" applicable candidates · "+rows.filter(x=>x.result.rankable).length+" eligible for reviewed ranking. Unreviewed leads are not ranked opportunities.";
 const tbody=$("results");tbody.replaceChildren();
 for(const row of rows){const tr=el("tr"),td=el("td"),b=el("button",row.label);b.type="button";b.onclick=()=>{if(reverse){$("project").value=row.p.id;setPaths(row.path.id)}else $("place").value=row.j.id;render()};td.append(b);if(row.lead)td.append(el("small"," · research lead"));tr.append(td,el("td",pct(row.result.researchCoverage)),el("td",row.result.fit===null?"Not reviewed":Math.round(row.result.fit)+"%"+(row.result.rankable?"":" · provisional")),el("td",row.result.gateState));tbody.append(tr)}
 renderDetails(p,path,j,evaluateOne(p,path,j));
 $("review-status").textContent=observations.length+" in-memory observations. Export before closing.";
}
function renderDetails(p,path,j,result){
 $("detail-title").textContent=p.title+" · "+j.name;const box=$("details");box.replaceChildren(el("p",label(path.id)+" · "+path.objective));
 if(result.scope==="outside"){box.append(el("p","This jurisdiction is outside the defined geographic scope of this engagement pathway.","warning"));return}
 box.append(el("p","Research-source coverage "+pct(result.researchCoverage)+" · Reviewed coverage "+pct(result.reviewCoverage)+" · Gates "+result.gateState));
 box.append(el("p",result.rankable?"Reviewed suitability "+Math.round(result.fit)+"%. Confirm current permissions before action.":"Not eligible for ranking. Direct evidence for the exact requirements is still needed.","muted"));
 const lead=portfolio.researchLeads.find(l=>l.projectId===p.id&&l.pathway===path.id&&l.placeId===j.id);
 if(lead)box.append(el("p","Research hypothesis: "+lead.question,"warning"));
 for(const row of result.rows){
  const c=row.criterion,r=row.record,sec=el("details",undefined,"record");sec.open=false;sec.append(el("summary",c.question+(c.gate?" · Required gate":"")),el("small",label(c.pattern)+" · "+r.status+" · "+r.confidence+" · checked "+(r.checked||"unknown")));
  if(row.conflict)sec.append(el("p","Conflicting reviewed evidence; resolve before ranking.","warning"));
  if(r.status==="none-found")sec.append(el("p","No programme was found in this research pass. That is not a legal finding that none exists.","warning"));
  if(row.stale)sec.append(el("p","Source record missing or stale; check the current official rule.","warning"));
  if(r.confidence!=="read directly")sec.append(el("p","Treat as a starting lead; verify the official source directly.","muted"));
  sec.append(el("p",r.summary));if(r.agency){const a=el("p","Official starting point: ");a.append(link(r.agency.url,r.agency.name||r.agency.url));sec.append(a)}
  if(r.facts.length){const list=el("ul");for(const f of r.facts){const li=el("li",f.label+": "+f.text);if(f.source)li.append(" ",link(f.source,"Source"));list.append(li)}sec.append(list)}
  if(r.notes)sec.append(el("p",r.notes,"muted"));
  if(r.sources.length){const list=el("ul");for(const s of r.sources){const li=el("li");li.append(link(s.url,s.title),el("small",s.checked?" · "+s.checked:""));list.append(li)}sec.append(list)}
  if(row.reviewed){const reviewed=el("p","Reviewed: "+row.reviewed.result+" · "+row.reviewed.checked+" · ");reviewed.append(link(row.reviewed.source,"Evidence"));sec.append(reviewed,el("p",row.reviewed.note,"muted"))}
  const review=el("details");review.append(el("summary","Record reviewed evidence"));const form=el("form"),outcome=el("select");option(outcome,"","Choose outcome");[["met","Requirement met"],["partial","Partly met / conditional"],["not-met","Requirement not met"]].forEach(([v,t])=>option(outcome,v,t));outcome.required=true;
  const source=el("input");source.type="url";source.required=true;source.placeholder="https://official-source...";
  const checked=el("input");checked.type="date";checked.value=today;checked.max=today;checked.required=true;
  const note=el("textarea");note.required=true;note.rows=2;note.placeholder="Why does the direct evidence satisfy this exact requirement?";
  for(const [t,n] of [["Reviewed outcome",outcome],["Direct source URL",source],["Review date",checked],["Evidence explanation",note]]){const field=el("label",t);field.append(n);form.append(field)}
  const btn=el("button","Record reviewed evidence");btn.type="submit";form.append(btn);
  form.onsubmit=e=>{e.preventDefault();if(!outcome.value||!safeUrl(source.value)||age(checked.value,today)===null||!note.value.trim()){alert("Supply a direct HTTPS source, date, outcome and explanation.");return}const key={projectId:p.id,pathway:path.id,placeId:j.id,requirementId:c.id};observations=observations.filter(o=>!Object.keys(key).every(k=>o[k]===key[k]));observations.push({...key,reviewed:true,result:outcome.value,source:source.value,checked:checked.value,note:note.value.trim()});render()};
  review.append(form);sec.append(review);box.append(sec)
 }
 const fees=el("section",undefined,"record");fees.append(el("h3","Published cost items"));
 const items=[...new Map(result.rows.flatMap(r=>r.record.costs).map(c=>[JSON.stringify([c.item,c.amount,c.currency,c.source,c.checked]),c])).values()];
 if(!items.length)fees.append(el("p","No quantified costs in these upstream records. Unknown is not zero.","warning"));
 const chosen=new Map(),total=el("p","No AUD cost items selected.");
 items.forEach((c,i)=>{const line=el("div",undefined,"cost"),check=el("input");check.type="checkbox";check.disabled=!Number.isFinite(c.aud)||!c.source||age(c.checked,today)===null||age(c.checked,today)>180;const text=el("label",c.item+" · "+(c.amount===null?"Amount unknown":c.amount+" "+(c.currency||""))+(c.aud===null?"":" · A$"+c.aud));if(c.source)text.append(" ",link(c.source,"Source"));if(c.checked)text.append(el("small"," · "+c.checked));check.onchange=()=>{if(check.checked)chosen.set(i,c.aud);else chosen.delete(i);total.textContent=chosen.size?"Selected sourced AUD items: A$"+[...chosen.values()].reduce((n,v)=>n+v,0).toLocaleString("en-AU",{maximumFractionDigits:2}):"No AUD cost items selected."};line.append(check,text);fees.append(line)});
 fees.append(total,el("p","Select only compatible, non-overlapping charges for the same period. Other establishment, travel, compliance and operating costs may be missing.","muted"));box.append(fees)
}
function renderPortfolio(){
 const cards=$("project-cards");if(cards)for(const p of projects){const card=el("article",undefined,"card");card.append(el("div",p.kind,"category"),el("h3",p.title),el("p",p.summary),el("small","Anchor: "+p.anchor+" · "+p.stage),el("p",p.pathways.map(q=>label(q.id)).join(" · "),"muted"));const detail=el("details"),sum=el("summary",p.sourceRepos.length+" source repositories");detail.append(sum);const list=el("ul");p.sourceRepos.forEach(r=>{const li=el("li");li.append(link(r.url,r.name));list.append(li)});detail.append(list);card.append(detail);const actions=el("div",undefined,"actions");if(p.website){actions.append(link(p.website,"Visit project website"));if(p.websiteStatus)card.append(el("small",p.websiteStatus,"muted"))}const b=el("button","Explore initiative");b.onclick=()=>choose(p,p.pathways[0]);actions.append(b);card.append(actions);cards.append(card)}
 const leads=$("lead-cards");if(leads)for(const l of portfolio.researchLeads){const p=projects.find(p=>p.id===l.projectId),j=places.find(j=>j.id===l.placeId);if(!p||!j)continue;const card=el("article",undefined,"card");card.append(el("div","Research lead · "+j.name,"category"),el("h3",p.title),el("p",l.question),el("small",label(l.pathway)));const b=el("button","Inspect requirements");b.onclick=()=>choose(p,p.pathways.find(q=>q.id===l.pathway),j);card.append(b);leads.append(card)}
 const list=el("ul");for(const w of portfolio.withheld)list.append(el("li",w.name+": "+w.reason));$("withheld")?.append(list)
}

function renderPurpose(p,path,j){
 $("purpose")?.replaceChildren(el("strong",p.title+" · "+label(path.id)),el("p",path.objective),el("small","Anchor: "+p.anchor+" · "+p.stage+" · Scope: "+path.scope));
 const related=$("related-workspaces");
 if(related){
   const items=[["projects.html","Project explorer"],["jurisdictions.html","Jurisdiction explorer"],["compare.html","Compare jurisdictions"],["budget.html","Plan establishment costs"]];
   related.replaceChildren(...items.filter(([file])=>!location.pathname.endsWith("/"+file)).map(([file,title])=>{const a=el("a",title,"page-link");a.href=workspace(file,p,path,j);return a}));
 }
}
function renderCompare(){
 const p=currentProject(),path=currentPath(),first=currentPlace();
 renderPurpose(p,path,first);
 const ids=[...new Set([$("place").value,$("place-b").value,$("place-c").value].filter(Boolean))];
 const list=ids.map(id=>places.find(j=>j.id===id)).filter(Boolean);
 const results=list.map(j=>({j,result:evaluateOne(p,path,j)}));
 $("compare-note").textContent=list.length<2?"Choose at least two different jurisdictions.":list.length+" distinct jurisdictions. All are evaluated against the same initiative requirements.";
 const table=el("table",undefined,"comparison-table"),head=el("thead"),tr=el("tr");
 tr.append(el("th","Requirement"));results.forEach(x=>{const cell=el("th",x.j.name);cell.scope="col";tr.append(cell)});head.append(tr);table.append(head);
 const body=el("tbody");
 const addRow=(title,fn)=>{const row=el("tr"),h=el("th",title);h.scope="row";row.append(h);for(const x of results){const cell=el("td");fn(cell,x);row.append(cell)}body.append(row)};
 addRow("Geographic scope",(cell,x)=>cell.textContent=x.result.scope==="outside"?"Outside scope":"In scope");
 addRow("Required gates",(cell,x)=>cell.textContent=x.result.gateState);
 addRow("Research-source coverage",(cell,x)=>cell.textContent=pct(x.result.researchCoverage));
 addRow("Reviewed evidence coverage",(cell,x)=>cell.textContent=pct(x.result.reviewCoverage));
 addRow("Reviewed fit",(cell,x)=>cell.textContent=x.result.fit===null?"Not reviewed":Math.round(x.result.fit)+"%"+(x.result.rankable?"":" · provisional"));
 for(const c of path.criteria)addRow(c.question+(c.gate?" · Required gate":""),(cell,x)=>{
   const row=x.result.rows.find(r=>r.criterion.id===c.id);if(!row){cell.textContent="Outside scope";return}
   cell.append(el("strong",row.reviewed?.result||"Not reviewed"),el("p",row.record.summary),el("small",row.record.status+" · "+row.record.confidence+" · "+(row.record.checked||"unknown date")));
   if(row.stale||row.conflict||row.record.status==="none-found")cell.append(el("p","Further direct review required.","warning"));
   if(row.record.agency)cell.append(el("p",undefined),link(row.record.agency.url,row.record.agency.name||"Official starting point"));
   for(const source of row.record.sources.slice(0,2))cell.append(el("p",undefined),link(source.url,source.title));
 });
 addRow("Next action",(cell,x)=>{const a=el("a","Inspect and review evidence");a.href=workspace("projects.html",p,path,x.j);const b=el("a","Plan costs");b.href=workspace("budget.html",p,path,x.j);cell.append(a,el("p",undefined),b)});
 table.append(body);$("compare-results").replaceChildren(table);
 $("review-status").textContent=observations.length+" in-memory observations. Export before closing.";
}
let budgetContext="",manualItems=[],selectedFees=new Map(),availableFees=[];
function costTiming(value="initial"){const s=el("select");option(s,"initial","Initial / once");option(s,"annual","Recurring annually");s.value=value;return s}
function budgetTotals(){
 const sourceRows=[...selectedFees.values()],manualRows=manualItems.filter(x=>x.amount!==null&&Number.isFinite(x.amount)&&x.amount>=0&&x.name.trim());
 const initial=[...sourceRows,...manualRows].filter(x=>x.timing==="initial").reduce((n,x)=>n+x.amount,0);
 const annual=[...sourceRows,...manualRows].filter(x=>x.timing==="annual").reduce((n,x)=>n+x.amount,0);
 const aud=n=>new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(n);
 const stats=$("budget-totals");stats.replaceChildren();
 for(const [name,value] of [["Initial selected subtotal",initial],["Annual recurring subtotal",annual],["Selected first-year estimate",initial+annual]]){const d=el("div");d.append(el("strong",aud(value)),el("span",name));stats.append(d)}
 return {initial,annual,firstYear:initial+annual,sourceRows,manualRows}
}
function renderManual(){
 const box=$("budget-manual");box.replaceChildren();
 for(const item of manualItems){
   const row=el("div",undefined,"budget-row");
   const name=el("input");name.placeholder="Allowance description";name.value=item.name;name.setAttribute("aria-label","Allowance description");name.oninput=()=>{item.name=name.value;budgetTotals()};
   const amount=el("input");amount.type="number";amount.min="0";amount.step="0.01";amount.placeholder="AUD estimate";amount.value=item.amount??"";amount.setAttribute("aria-label","Allowance in AUD");amount.oninput=()=>{item.amount=amount.value!==""&&Number.isFinite(amount.valueAsNumber)&&amount.valueAsNumber>=0?amount.valueAsNumber:null;budgetTotals()};
   const timing=costTiming(item.timing);timing.setAttribute("aria-label","Allowance timing");timing.onchange=()=>{item.timing=timing.value;budgetTotals()};
   const remove=el("button","Remove","secondary");remove.type="button";remove.onclick=()=>{manualItems=manualItems.filter(x=>x!==item);renderManual();budgetTotals()};
   row.append(name,amount,timing,remove);box.append(row)
 }
}
function renderBudget(){
 const p=currentProject(),path=currentPath(),j=currentPlace(),key=[p.id,path.id,j.id].join("/");
 if(key!==budgetContext){selectedFees=new Map();manualItems=[];budgetContext=key}
 renderPurpose(p,path,j);
 const result=evaluateOne(p,path,j),box=$("budget-source-items");box.replaceChildren();
 if(result.scope==="outside")box.append(el("p","Outside the pathway's geographic scope.","warning"));
 availableFees=[...new Map(result.rows.flatMap(r=>r.record.costs).map(c=>[JSON.stringify([c.item,c.amount,c.currency,c.source,c.checked]),c])).entries()];
 if(!availableFees.length)box.append(el("p","No quantified fee items are available in the relevant country records. Research official costs before relying on an estimate.","warning"));
 for(const [id,c] of availableFees){
   const row=el("div",undefined,"budget-row"),check=el("input");check.type="checkbox";check.checked=selectedFees.has(id);check.setAttribute("aria-label","Include "+c.item);
   const valid=Number.isFinite(c.aud)&&c.aud>=0&&safeUrl(c.source)&&age(c.checked,today)!==null&&age(c.checked,today)<=180;
   check.disabled=!valid;
   const text=el("div");text.append(el("strong",c.item),el("p",(c.amount===null?"Original amount unknown":c.amount+" "+(c.currency||""))+(c.aud===null?"":" · A$"+c.aud)),el("small",c.checked||"Date unknown"));
   if(c.source)text.append(el("p",undefined),link(c.source,"Source"));
   if(!valid)text.append(el("p","Not selectable: current sourced AUD amount required.","muted"));
   const timing=costTiming(selectedFees.get(id)?.timing||"initial");timing.setAttribute("aria-label","Fee timing for "+c.item);
   const sync=()=>{if(check.checked)selectedFees.set(id,{name:c.item,amount:c.aud,timing:timing.value,source:c.source,checked:c.checked,originalAmount:c.amount,currency:c.currency});else selectedFees.delete(id);budgetTotals()};
   check.onchange=sync;timing.onchange=sync;
   row.append(check,text,timing);box.append(row)
 }
 renderManual();budgetTotals();
 $("budget-add").onclick=()=>{manualItems.push({name:"",amount:null,timing:"initial"});renderManual()};
 $("budget-export").onclick=()=>{const totals=budgetTotals();const payload={schemaVersion:1,generatedOn:today,initiative:p.id,pathway:path.id,jurisdiction:j.id,currency:"AUD",...totals,disclaimer:"Selected fees and user estimates only; not a complete establishment cost."};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="coimas-budget-"+j.id+"-"+today+".json";a.click();URL.revokeObjectURL(url);$("budget-status").textContent="Budget export prepared."};
}
if($("export"))$("export").onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:1,observations},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="coimas-reviews-"+today+".json";a.click();URL.revokeObjectURL(url)};
if($("clear"))$("clear").onclick=()=>{if(confirm("Clear in-memory observations? Export them first if needed.")){observations=[];render()}};
if($("import"))$("import").onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(x.schemaVersion!==1||!Array.isArray(x.observations)||x.observations.length>100000)throw Error("Invalid workbook");observations=x.observations.filter(o=>o&&projects.some(p=>p.id===o.projectId&&p.pathways.some(q=>q.id===o.pathway&&q.criteria.some(c=>c.id===o.requirementId)))&&places.some(j=>j.id===o.placeId)&&o.reviewed===true&&["met","partial","not-met"].includes(o.result)&&safeUrl(o.source)&&typeof o.note==="string"&&o.note.trim()&&age(o.checked,today)!==null);render();$("review-status").textContent=observations.length+" valid matching observations imported; "+(x.observations.length-observations.length)+" ignored."}catch(err){$("review-status").textContent="Import failed: "+err.message}finally{e.target.value=""}};
for(const id of ["direction","project","place","place-b","place-c","pathway","filter","display"])$(id)?.addEventListener(id==="filter"?"input":"change",()=>{if(id==="project")setPaths();if(id==="pathway")resetWeights();render()});
try{
 const response=await fetch("generated/dataset.json",{cache:"no-cache"});if(!response.ok)throw Error("Generated dataset not available (HTTP "+response.status+")");data=await response.json();if(data.schemaVersion!==1||!data.portfolio?.projects?.length||!data.places?.length)throw Error("Invalid dataset");portfolio=data.portfolio;projects=portfolio.projects;places=[...data.places].sort((a,b)=>a.name.localeCompare(b.name));
 if($("project")){projects.forEach(p=>option($("project"),p.id,p.title));if(projects.some(p=>p.id===params.get("project")))$("project").value=params.get("project");for(const id of ["place","place-b","place-c"]){const select=$(id);if(!select)continue;if(id==="place-c")option(select,"","None");places.forEach(j=>option(select,j.id,j.name));const preferred=params.get(id)||(id==="place"?"ee":id==="place-b"?"kz":"");if([...select.options].some(o=>o.value===preferred))select.value=preferred}setPaths(params.get("pathway"))}
 $("status").textContent="Initial editorial portfolio · dataset "+data.generatedOn+" · source-backed research, not automatic legal advice.";
 const stats=[["Initiatives",projects.length],["Jurisdictions",places.length],["Defined engagement pathways",projects.reduce((n,p)=>n+p.pathways.length,0)],["Specific requirements",projects.reduce((n,p)=>n+p.pathways.reduce((a,q)=>a+q.criteria.length,0),0)]];
 for(const [t,v] of stats){const box=el("div");box.append(el("strong",String(v)),el("span",t));$("stats")?.append(box)}
 if($("versions"))$("versions").textContent="Source revisions: Atlas "+(data.versions.atlas||"unknown").slice(0,12)+" · Travel "+(data.versions.travel||"unknown").slice(0,12)+".";
 renderPortfolio();render()
}catch(e){$("status").textContent=e.message+". See the repository build instructions.";for(const id of ["direction","project","place","place-b","place-c","pathway","filter","display","export","clear","import","budget-add","budget-export"])if($(id))$(id).disabled=true;console.error(e)}
