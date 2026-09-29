import "server-only";import {cache} from "react";import {readFile} from "node:fs/promises";import path from "node:path";import type {DemoRun,RunPerson} from "./types";
const colors=["#d8ff43","#ff765f","#baa0ff","#63d8cb","#ffc857"];
export type DisplayPerson=RunPerson&{role:string;location:string;color:string};
export const getDemoRun=cache(async()=>JSON.parse(await readFile(path.join(process.cwd(),"db","demo-run.json"),"utf8")) as DemoRun);
export async function getPeople():Promise<DisplayPerson[]>{const run=await getDemoRun();return run.people.map((p,i)=>({...p,role:p.profile.career_stage,location:p.profile.location,color:colors[i%colors.length]}))}
export async function personById(id:string){return (await getPeople()).find(p=>p.id===id)}
export async function matchesFor(id:string){const run=await getDemoRun(),people=await getPeople();return run.rankings.filter(r=>r.personId===id).sort((a,b)=>a.rank-b.rank).map(r=>({person:people.find(p=>p.id===r.matchId)!,rank:r.rank,score:Math.round(r.score),reason:r.reason,dateId:r.dateId}))}
export async function demoDate(id:string){const run=await getDemoRun(),people=await getPeople(),date=run.dates.find(d=>d.id===id);if(!date)return null;const a=people.find(p=>p.id===date.aId)!,b=people.find(p=>p.id===date.bId)!,scores=date.result.scores;return{a,b,turns:date.result.turns.map(t=>({who:t.speaker,text:t.text})),scoreA:scores.a_to_b.overall,scoreB:scores.b_to_a.overall,reason:`${scores.a_to_b.reason} ${scores.b_to_a.reason}`,scores}}
