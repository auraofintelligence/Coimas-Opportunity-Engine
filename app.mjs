import {evaluate,ordered,inScope,safeUrl,age} from "./engine.mjs";
const $=id=>document.getElementById(id);
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
function resetWeights(){weights={};const box=$("weights");box.replaceChildren();for(const c of currentPath().criteria){const field=el("label",c.question+(c.gate?" · required gate":""));const inp=el("input");inp.type="range";inp.min=c.gate?"1":"0";inp.max="10";inp.value=c.weight;const value=el("small","Weight "+c.weight);inp.oninput=()=>{weights[c.id]=Number(inp.value);value.textContent="Weight "+inp.value;render()};field.append(inp,value);box.append(field)}}
function choose(p,path,j){$("project").value=p.id;setPaths(path?.id);if(j)$("place").value=j.id;render();document.getElementById("explore").scrollIntoView({block:"start"})}
function evaluateOne(p,path,j){return evaluate(p,path,j,portfolio.scopes,observations,p.id===$("project").value&&path.id===$("pathway").value?weights:{},today)}
function hasLead(p,path,j){return portfolio.researchLeads.some(l=>l.projectId===p.id&&l.pathway===path.id&&l.placeId===j.id)}
function render(){
 if(!data)return;const p=currentProject(),j=currentPlace(),path=currentPath(),reverse=$("direction").value==="place",query=$("filter").value.toLowerCase().trim(),mode=$("display").value;
 $("purpose").replaceChildren(el("strong",p.title+" · "+label(path.id)),el("p",path.objective),el("small","Anchor: "+p.anchor+" · "+p.stage+" · Scope: "+path.scope));
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
  const c=row.criterion,r=row.record,sec=el("section",undefined,"record");sec.append(el("h4",c.question+(c.gate?" · Required gate":"")),el("small",label(c.pattern)+" · "+r.status+" · "+r.confidence+" · checked "+(r.checked||"unknown")));
  if(row.conflict)sec.append(el("p","Conflicting reviewed evidence; resolve before ranking.","warning"));
  if(r.status==="none-found")sec.append(el("p","No programme was found in this research pass. That is not a legal finding that none exists.","warning"));
  if(row.stale)sec.append(el("p","Source record missing or stale; check the current official rule.","warning"));
  if(r.confidence!=="read directly")sec.append(el("p","Treat as a starting lead; verify the official source directly.","muted"));
  sec.append(el("p",r.summary));if(r.agency){const a=el("p","Official starting point: ");a.append(link(r.agency.url,r.agency.name||r.agency.url));sec.append(a)}
  if(r.facts.length){const list=el("ul");for(const f of r.facts){const li=el("li",f.label+": "+f.text);if(f.source)li.append(" ",link(f.source,"Source"));list.append(li)}sec.append(list)}
  if(r.notes)sec.append(el("p",r.notes,"muted"));
  if(r.sources.length){const list=el("ul");for(const s of r.sources){const li=el("li");li.append(link(s.url,s.title),el("small",s.checked?" · "+s.checked:""));list.append(li)}sec.append(list)}
  if(row.reviewed){const reviewed=el("p","Reviewed: "+row.reviewed.result+" · "+row.reviewed.checked+" · ");reviewed.append(link(row.reviewed.source,"Evidence"));sec.append(reviewed,el("p",row.reviewed.note,"muted"))}
  const form=el("form"),outcome=el("select");option(outcome,"","Choose outcome");[["met","Requirement met"],["partial","Partly met / conditional"],["not-met","Requirement not met"]].forEach(([v,t])=>option(outcome,v,t));outcome.required=true;
  const source=el("input");source.type="url";source.required=true;source.placeholder="https://official-source...";
  const checked=el("input");checked.type="date";checked.value=today;checked.max=today;checked.required=true;
  const note=el("textarea");note.required=true;note.rows=2;note.placeholder="Why does the direct evidence satisfy this exact requirement?";
  for(const [t,n] of [["Reviewed outcome",outcome],["Direct source URL",source],["Review date",checked],["Evidence explanation",note]]){const field=el("label",t);field.append(n);form.append(field)}
  const btn=el("button","Record reviewed evidence");btn.type="submit";form.append(btn);
  form.onsubmit=e=>{e.preventDefault();if(!outcome.value||!safeUrl(source.value)||age(checked.value,today)===null||!note.value.trim()){alert("Supply a direct HTTPS source, date, outcome and explanation.");return}const key={projectId:p.id,pathway:path.id,placeId:j.id,requirementId:c.id};observations=observations.filter(o=>!Object.keys(key).every(k=>o[k]===key[k]));observations.push({...key,reviewed:true,result:outcome.value,source:source.value,checked:checked.value,note:note.value.trim()});render()};
  sec.append(form);box.append(sec)
 }
 const fees=el("section",undefined,"record");fees.append(el("h3","Published cost items"));
 const items=[...new Map(result.rows.flatMap(r=>r.record.costs).map(c=>[JSON.stringify([c.item,c.amount,c.currency,c.source,c.checked]),c])).values()];
 if(!items.length)fees.append(el("p","No quantified costs in these upstream records. Unknown is not zero.","warning"));
 const chosen=new Map(),total=el("p","No AUD cost items selected.");
 items.forEach((c,i)=>{const line=el("div",undefined,"cost"),check=el("input");check.type="checkbox";check.disabled=!Number.isFinite(c.aud)||!c.source||age(c.checked,today)===null||age(c.checked,today)>180;const text=el("label",c.item+" · "+(c.amount===null?"Amount unknown":c.amount+" "+(c.currency||""))+(c.aud===null?"":" · A$"+c.aud));if(c.source)text.append(" ",link(c.source,"Source"));if(c.checked)text.append(el("small"," · "+c.checked));check.onchange=()=>{if(check.checked)chosen.set(i,c.aud);else chosen.delete(i);total.textContent=chosen.size?"Selected sourced AUD items: A$"+[...chosen.values()].reduce((n,v)=>n+v,0).toLocaleString("en-AU",{maximumFractionDigits:2}):"No AUD cost items selected."};line.append(check,text);fees.append(line)});
 fees.append(total,el("p","Select only compatible, non-overlapping charges for the same period. Other establishment, travel, compliance and operating costs may be missing.","muted"));box.append(fees)
}
function renderPortfolio(){
 const cards=$("project-cards");for(const p of projects){const card=el("article",undefined,"card");card.append(el("div",p.kind,"category"),el("h3",p.title),el("p",p.summary),el("small","Anchor: "+p.anchor+" · "+p.stage),el("p",p.pathways.map(q=>label(q.id)).join(" · "),"muted"));const detail=el("details"),sum=el("summary",p.sourceRepos.length+" source repositories");detail.append(sum);const list=el("ul");p.sourceRepos.forEach(r=>{const li=el("li");li.append(link(r.url,r.name));list.append(li)});detail.append(list);card.append(detail);const actions=el("div",undefined,"actions"),b=el("button","Explore initiative");b.onclick=()=>{$("direction").value="project";choose(p,p.pathways[0])};actions.append(b);card.append(actions);cards.append(card)}
 const leads=$("lead-cards");for(const l of portfolio.researchLeads){const p=projects.find(p=>p.id===l.projectId),j=places.find(j=>j.id===l.placeId);if(!p||!j)continue;const card=el("article",undefined,"card");card.append(el("div","Research lead · "+j.name,"category"),el("h3",p.title),el("p",l.question),el("small",label(l.pathway)));const b=el("button","Inspect requirements");b.onclick=()=>{$("direction").value="project";choose(p,p.pathways.find(q=>q.id===l.pathway),j)};card.append(b);leads.append(card)}
 const list=el("ul");for(const w of portfolio.withheld)list.append(el("li",w.name+": "+w.reason));$("withheld").append(list)
}
$("export").onclick=()=>{const blob=new Blob([JSON.stringify({schemaVersion:1,observations},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="coimas-reviews-"+today+".json";a.click();URL.revokeObjectURL(url)};
$("clear").onclick=()=>{if(confirm("Clear in-memory observations? Export them first if needed.")){observations=[];render()}};
$("import").onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(x.schemaVersion!==1||!Array.isArray(x.observations)||x.observations.length>100000)throw Error("Invalid workbook");observations=x.observations.filter(o=>o&&projects.some(p=>p.id===o.projectId&&p.pathways.some(q=>q.id===o.pathway&&q.criteria.some(c=>c.id===o.requirementId)))&&places.some(j=>j.id===o.placeId)&&o.reviewed===true&&["met","partial","not-met"].includes(o.result)&&safeUrl(o.source)&&typeof o.note==="string"&&o.note.trim()&&age(o.checked,today)!==null);render();$("review-status").textContent=observations.length+" valid matching observations imported; "+(x.observations.length-observations.length)+" ignored."}catch(err){$("review-status").textContent="Import failed: "+err.message}finally{e.target.value=""}};
for(const id of ["direction","project","place","pathway","filter","display"])$(id).addEventListener(id==="filter"?"input":"change",()=>{if(id==="project")setPaths();if(id==="pathway")resetWeights();render()});
try{
 const response=await fetch("generated/dataset.json",{cache:"no-cache"});if(!response.ok)throw Error("Generated dataset not available (HTTP "+response.status+")");data=await response.json();if(data.schemaVersion!==1||!data.portfolio?.projects?.length||!data.places?.length)throw Error("Invalid dataset");portfolio=data.portfolio;projects=portfolio.projects;places=[...data.places].sort((a,b)=>a.name.localeCompare(b.name));
 projects.forEach(p=>option($("project"),p.id,p.title));places.forEach(j=>option($("place"),j.id,j.name));if(places.some(j=>j.id==="ee"))$("place").value="ee";setPaths();
 $("status").textContent="Initial editorial portfolio · dataset "+data.generatedOn+" · source-backed research, not automatic legal advice.";
 const stats=[["Initiatives",projects.length],["Jurisdictions",places.length],["Defined engagement pathways",projects.reduce((n,p)=>n+p.pathways.length,0)],["Specific requirements",projects.reduce((n,p)=>n+p.pathways.reduce((a,q)=>a+q.criteria.length,0),0)]];
 for(const [t,v] of stats){const box=el("div");box.append(el("strong",String(v)),el("span",t));$("stats").append(box)}
 $("versions").textContent="Source revisions: Atlas "+(data.versions.atlas||"unknown").slice(0,12)+" · Travel "+(data.versions.travel||"unknown").slice(0,12)+".";
 renderPortfolio();render()
}catch(e){$("status").textContent=e.message+". See the repository build instructions.";for(const id of ["direction","project","place","pathway","filter","display","export","clear","import"])$(id).disabled=true;console.error(e)}
