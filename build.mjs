import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,join,dirname} from "node:path";
import {execFileSync} from "node:child_process";
import {buildDataset,PATTERNS} from "./engine.mjs";
const args=process.argv.slice(2);
const arg=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1]};
const root=resolve(arg("--root","."));
const atlasRoot=resolve(arg("--atlas","../project-atlas")),travel=resolve(arg("--travel","../world-travel-patterns"));
const out=resolve(arg("--out",join(root,"generated/dataset.json")));
const read=async p=>JSON.parse(await readFile(p,"utf8"));
const maybe=async p=>{try{return await read(p)}catch(e){if(e.code==="ENOENT")return null;throw e}};
const rev=p=>execFileSync("git",["-C",p,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
const today=new Date(Date.now()+36000000).toISOString().slice(0,10);
const portfolio=await read(join(root,"data/portfolio.json"));
const atlas=await read(join(atlasRoot,"data/projects.json"));
const spine=await read(join(travel,"data/places/spine.json"));
const vetting={},baselines={};
for(const k of PATTERNS){const d=await read(join(travel,"patterns",k+".json"));if(d.id!==k)throw Error("Pattern ID mismatch");baselines[k]=d.baseline_days}
for(const p of spine.places){if(!/^[a-z0-9][a-z0-9/_-]*$/i.test(p.id))throw Error("Invalid place identifier");const x=await maybe(join(travel,"data/vetting",p.id.replaceAll("/","__")+".json"));if(x)vetting[p.id]=x}
const dataset=buildDataset(portfolio,atlas,spine,vetting,baselines,today,{atlas:rev(atlasRoot),travel:rev(travel)});
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(dataset)+"\n");
console.log(JSON.stringify({initiatives:portfolio.projects.length,jurisdictions:dataset.places.length,pathways:portfolio.projects.reduce((n,p)=>n+p.pathways.length,0),sourceRecords:dataset.places.reduce((n,j)=>n+Object.values(j.records).filter(r=>r.status!=="unknown").length,0),versions:dataset.versions}));
