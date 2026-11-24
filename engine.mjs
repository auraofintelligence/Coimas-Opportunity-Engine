export const PATTERNS=["digital-residency","physical-residency","citizenship","enterprise-establishment","collective-ownership","financial-infrastructure","intellectual-property","research-and-enterprise"];
export const safeUrl=v=>typeof v==="string"&&/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(v)?v:null;
export function age(date,today){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||"")||!/^\d{4}-\d{2}-\d{2}$/.test(today||""))return null;const a=(Date.parse(today)-Date.parse(date))/86400000;return Number.isFinite(a)&&a>=0?a:null}
export function normalise(raw,pattern,today,baseline=180){raw=raw||{};const checked=typeof raw.checked==="string"?raw.checked.slice(0,10):null;return {pattern,status:["mapped","partly-mapped","none-found","unknown"].includes(raw.status)?raw.status:"unknown",checked,baseline,stale:age(checked,today)===null||age(checked,today)>baseline,confidence:["read directly","search snapshot","unverified"].includes(raw.confidence)?raw.confidence:"unverified",summary:String(raw.summary||"No record available"),notes:String(raw.notes||""),agency:raw.agency&&safeUrl(raw.agency.url)?{name:String(raw.agency.name||""),url:raw.agency.url}:null,sources:(Array.isArray(raw.sources)?raw.sources:[]).filter(x=>safeUrl(x?.url)).map(x=>({url:x.url,title:String(x.title||x.authority||"Source"),checked:x.checked||null})),facts:(Array.isArray(raw.facts)?raw.facts:[]).filter(x=>typeof x?.text==="string").map(x=>({label:String(x.label||""),text:x.text,source:safeUrl(x.source),checked:x.checked||null})),costs:(Array.isArray(raw.costs)?raw.costs:[]).filter(x=>typeof x?.item==="string").map(x=>({item:x.item,amount:Number.isFinite(x.amount)?x.amount:null,currency:typeof x.currency==="string"?x.currency:null,aud:Number.isFinite(x.aud)?x.aud:null,source:safeUrl(x.source),checked:x.checked||null}))}}
export function validatePortfolio(portfolio,atlas){
 if(portfolio.schemaVersion!==1||!Array.isArray(portfolio.projects)||!portfolio.scopes||!portfolio.pathwayLabels)throw Error("Invalid portfolio");
 const known=new Map(atlas.projects.map(p=>[p.name,p]));
 const ids=new Set();
 for(const p of portfolio.projects){
  if(!/^[a-z0-9-]+$/.test(p.id)||ids.has(p.id)||!p.title||!p.anchor||!p.stage||!p.sourceRepos?.length||!p.pathways?.length)throw Error("Invalid or duplicate initiative "+p.id);
  ids.add(p.id);
  for(const r of p.sourceRepos){const a=known.get(r.name);if(!a||a.repositoryUrl?.toLowerCase()!==r.url?.toLowerCase()||/command[-_ ]?cent(?:re|er)|(?:^|[-_])private(?:$|[-_])/i.test(r.name))throw Error("Unapproved public source "+r.name)}
  const paths=new Set();
  for(const path of p.pathways){
   if(paths.has(path.id)||!portfolio.pathwayLabels[path.id]||!portfolio.scopes[path.scope]||!path.objective||!path.criteria?.length)throw Error("Invalid pathway "+p.id);
   paths.add(path.id);const requirements=new Set();
   for(const r of path.criteria){if(!/^[a-z0-9-]+$/.test(r.id)||requirements.has(r.id)||!PATTERNS.includes(r.pattern)||!r.question||typeof r.gate!=="boolean"||!Number.isFinite(r.weight)||r.weight<=0)throw Error("Invalid requirement "+p.id+"/"+path.id);requirements.add(r.id)}
  }
 }
 for(const l of portfolio.researchLeads||[]){if(!portfolio.projects.some(p=>p.id===l.projectId&&p.pathways.some(q=>q.id===l.pathway))||!l.placeId||l.status!=="research-lead")throw Error("Invalid research lead")}
 return true
}
export function inScope(path,j,scopes){const scope=scopes[path.scope];return Boolean(scope&&(path.scope==="global"||Array.isArray(scope.placeIds)&&scope.placeIds.includes(j.id)))}
export function evaluate(project,path,j,scopes,reviews=[],weights={},today){
 if(!inScope(path,j,scopes))return {scope:"outside",gateState:"outside scope",researchCoverage:0,reviewCoverage:0,fit:null,rankable:false,rows:[]};
 const rows=path.criteria.map(c=>{
  const record=j.records[c.pattern]||normalise(null,c.pattern,today);
  const stale=age(record.checked,today)===null||age(record.checked,today)>record.baseline;
  const weight=c.gate?Math.max(1,Number.isFinite(weights[c.id])?weights[c.id]:c.weight):Math.max(0,Number.isFinite(weights[c.id])?weights[c.id]:c.weight);
  const observations=reviews.filter(o=>o.projectId===project.id&&o.pathway===path.id&&o.placeId===j.id&&o.requirementId===c.id&&o.reviewed===true&&["met","partial","not-met"].includes(o.result)&&safeUrl(o.source)&&typeof o.note==="string"&&o.note.trim()&&age(o.checked,today)!==null&&age(o.checked,today)<=180);
  const outcomes=new Set(observations.map(o=>o.result));
  const reviewed=outcomes.size===1?observations.sort((a,b)=>b.checked.localeCompare(a.checked))[0]:null;
  const lead=!stale&&record.status!=="unknown"&&(record.sources.length>0||record.facts.some(f=>f.source));
  return {criterion:c,record,weight,reviewed,conflict:outcomes.size>1,lead,stale,score:reviewed?({met:1,partial:0.5,"not-met":0})[reviewed.result]:null}
 });
 const total=rows.reduce((n,r)=>n+r.weight,0),known=rows.filter(r=>r.reviewed),knownWeight=known.reduce((n,r)=>n+r.weight,0);
 const gateState=rows.some(r=>r.criterion.gate&&r.reviewed?.result==="not-met")?"blocked":rows.some(r=>r.criterion.gate&&r.reviewed?.result!=="met")?"unresolved":"confirmed";
 const reviewCoverage=total?knownWeight/total:0,researchCoverage=total?rows.filter(r=>r.lead).reduce((n,r)=>n+r.weight,0)/total:0;
 const fit=knownWeight?100*known.reduce((n,r)=>n+r.weight*r.score,0)/knownWeight:null;
 const rankable=gateState==="confirmed"&&reviewCoverage>=0.6&&fit!==null&&!rows.some(r=>r.conflict);
 return {scope:"candidate",gateState,researchCoverage,reviewCoverage,fit,rankable,rows}
}
export function ordered(items){return items.sort((a,b)=>Number(b.result.rankable)-Number(a.result.rankable)||(a.result.rankable&&b.result.rankable?b.result.fit-a.result.fit:0)||Number(b.lead)-Number(a.lead)||b.result.researchCoverage-a.result.researchCoverage||a.label.localeCompare(b.label))}
export function buildDataset(portfolio,atlas,spine,vetting,baselines,today,versions={}){
 validatePortfolio(portfolio,atlas);
 if(!Array.isArray(spine.places)||!spine.places.length)throw Error("Invalid place spine");
 const ids=new Set();
 const places=spine.places.map(p=>{
  if(!p.id||ids.has(p.id))throw Error("Duplicate place");ids.add(p.id);
  const raw=vetting[p.id];if(raw&&raw.place!==p.id)throw Error("Place mismatch "+p.id);
  return {id:p.id,name:p.name,region:p.region||null,kind:p.kind,records:Object.fromEntries(PATTERNS.map(k=>[k,normalise(raw?.patterns?.[k],k,today,baselines[k]||180)]))}
 });
 return {schemaVersion:1,generatedOn:today,versions,portfolio,places}
}
