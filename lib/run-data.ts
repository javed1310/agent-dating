import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentProfile } from "./schema";
import type { DemoRun, RunPerson } from "./types";
import { db } from "./db/supabase";

const colors = ["#d8ff43", "#ff765f", "#baa0ff", "#63d8cb", "#ffc857"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type DisplayPerson = RunPerson & { role: string; location: string; color: string; isLive?: boolean; matchSummary?: { requested: number; available: number; reason?: string } };
export const getDemoRun = cache(async () => JSON.parse(await readFile(path.join(process.cwd(), "db", "demo-run.json"), "utf8")) as DemoRun);
export async function getPeople(): Promise<DisplayPerson[]> { const run = await getDemoRun(); return run.people.map((p, i) => ({ ...p, role: p.profile.career_stage, location: p.profile.location, color: colors[i % colors.length] })); }
function relation<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value || undefined; }
function livePerson(row: any): DisplayPerson | undefined { const profileRow = relation(row?.profiles); const profile = profileRow?.profile as AgentProfile | undefined; if (!profile) return undefined; let matchSummary; try { matchSummary = JSON.parse(String(row.interested_in || "{}")).matchSummary; } catch {} return { id: row.id, name: row.name || "Saved agent", linkedin: row.linkedin_url, instagram: row.instagram_url, profile, embedding: [], role: profile.career_stage, location: profile.location, color: colors[0], isLive: true, matchSummary }; }
export async function personById(id: string) { const demo = (await getPeople()).find(p => p.id === id); if (demo || !uuid.test(id) || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return demo; const { data, error } = await db().from("people").select("id,name,linkedin_url,instagram_url,interested_in,profiles(profile,confidence)").eq("id", id).maybeSingle(); return error || !data ? undefined : livePerson(data); }
export async function matchesFor(id: string) {
  const run = await getDemoRun(), people = await getPeople();
  const demo = run.rankings.filter(r => r.personId === id).sort((a, b) => a.rank - b.rank).map(r => ({ person: people.find(p => p.id === r.matchId)!, rank: r.rank, score: Math.round(r.score), reason: r.reason, dateId: r.dateId, notDated:false }));
  if (demo.length || !uuid.test(id) || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return demo;

  const client = db(), { data: links } = await client.from("run_people").select("run_id").eq("person_id", id);
  const ownedIds = [...new Set((links || []).map(link => link.run_id))];
  if (!ownedIds.length) return [];
  const [{ data: ownedRuns }, { data: rows }] = await Promise.all([
    client.from("runs").select("id,created_at").in("id", ownedIds).order("created_at", { ascending: false }),
    client.from("rankings").select("run_id,rank,final_score,reason,date_id,people:people!rankings_match_id_fkey(id,name,linkedin_url,instagram_url,interested_in,profiles(profile,confidence))").eq("person_id", id).in("run_id", ownedIds).order("rank"),
  ]);
  const ownRun = (ownedRuns || []).find(candidate => rows?.some(row => row.run_id === candidate.id));
  if (!ownRun || !rows?.length) return [];
  return rows.filter(row => row.run_id === ownRun.id && row.date_id).map((row: any) => ({ person: livePerson(relation(row.people))!, rank: row.rank, score: Math.round(row.final_score), reason: row.reason, dateId: row.date_id as string, notDated:false })).filter(row => row.person);
}
export async function demoDate(id: string) { const run = await getDemoRun(), people = await getPeople(), date = run.dates.find(d => d.id === id); if (!date) return null; const a = people.find(p => p.id === date.aId)!, b = people.find(p => p.id === date.bId)!, scores = date.result.scores; return { a, b, turns: date.result.turns.map(t => ({ who: t.speaker, text: t.text })), reflections: date.result.reflections, scoreA: scores.a_to_b.overall, scoreB: scores.b_to_a.overall, reason: `${scores.a_to_b.reason} ${scores.b_to_a.reason}`, scores }; }
export async function dateById(id: string) { const demo = await demoDate(id); if (demo || !uuid.test(id) || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return demo; const { data, error } = await db().from("dates").select("id,transcript,a_id,b_id,people_a:people!dates_a_id_fkey(id,name,linkedin_url,instagram_url,profiles(profile,confidence)),people_b:people!dates_b_id_fkey(id,name,linkedin_url,instagram_url,profiles(profile,confidence)),scores(*)").eq("id", id).maybeSingle(); if (error || !data) return null; const a = livePerson(relation(data.people_a)), b = livePerson(relation(data.people_b)); if (!a || !b) return null; const scoreRows = data.scores as any[] || [], ab = scoreRows.find(s => s.from_id === data.a_id), ba = scoreRows.find(s => s.from_id === data.b_id); if (!ab || !ba) return null; const transcript=(data.transcript as any[])||[],turns=transcript.filter(t=>t.kind!=="reflection"&&t.text).map(t=>({who:t.speaker,text:t.text})),reflectionRows=transcript.filter(t=>t.kind==="reflection"),fallbackReflection=(speaker:"a"|"b",reason:string)=>({speaker,verdict:"maybe" as const,attraction:reason,uncertainty:"Not enough structured reflection data was saved for this earlier date.",evidence:["Completed conversation","Two-sided compatibility score"],confidence:.5}),reflections={a:reflectionRows.find(t=>t.speaker==="a")||fallbackReflection("a",ab.reason),b:reflectionRows.find(t=>t.speaker==="b")||fallbackReflection("b",ba.reason)};return { a, b, turns, reflections, scoreA: ab.overall, scoreB: ba.overall, reason: `${ab.reason} ${ba.reason}`, scores: { a_to_b: ab, b_to_a: ba } }; }
