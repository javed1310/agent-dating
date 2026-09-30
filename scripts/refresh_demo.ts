import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { groundedFallback } from "../lib/agents/date";
import { finalScore } from "../lib/rank/score";
import type { DemoRun, RunRanking } from "../lib/types";

async function main() {
const root = process.cwd(), file = path.join(root, "db", "demo-run.json");
const run = JSON.parse(await readFile(file, "utf8")) as DemoRun;
const people = new Map(run.people.map(person => [person.id, person]));

for (const person of run.people) {
  if (person.profile.evidence.length < 12 && !["person-6", "person-25"].includes(person.id)) {
    const analyzed = JSON.parse(await readFile(path.join(root, ".data", "evidence", `${person.id}.json`), "utf8"));
    const existing = new Set(person.profile.evidence.map(item => `${item.field}|${item.source}|${item.snippet}`));
    for (const item of Array.isArray(analyzed.evidence) ? analyzed.evidence : []) {
      const key = `${item.field}|${item.source}|${item.snippet}`;
      if (!existing.has(key)) { person.profile.evidence.push(item); existing.add(key); }
    }
  }
  if (!person.profile.evidence.some(item => item.source === "LinkedIn")) {
    const analyzed = JSON.parse(await readFile(path.join(root, ".data", "evidence", `${person.id}.json`), "utf8"));
    const linkedinEvidence = (Array.isArray(analyzed.evidence) ? analyzed.evidence : []).filter((item: {source?: string}) => item.source === "LinkedIn");
    if (!linkedinEvidence.length) throw new Error(`${person.name} has no usable public LinkedIn evidence`);
    person.profile.evidence.push(...linkedinEvidence);
  }
  if (!person.profile.evidence.some(item => item.source === "Instagram")) {
    const cache = path.join(root, ".data", "cache", `instagram-${createHash("sha256").update(person.instagram).digest("hex").slice(0, 24)}.json`);
    const payload = JSON.parse(await readFile(cache, "utf8")), record = Array.isArray(payload) ? payload[0] : payload;
    const posts = Array.isArray(record?.latestPosts) ? record.latestPosts : Array.isArray(record?.posts) ? record.posts : [];
    const snippet = String(record?.biography || record?.bio || posts[0]?.caption || posts[0]?.text || "").trim();
    if (!snippet) throw new Error(`${person.name} has no usable public Instagram evidence`);
    person.profile.evidence.push({ field: "interests", claim: "Public Instagram bio or post signal", source: "Instagram", snippet: snippet.slice(0, 500) });
  }
  const requiredFields = ["summary", "career_stage", "skills", "hobbies", "interests", "values", "communication_style", "lifestyle", "location", "needs", "looking_for", "deal_breakers"];
  const linkedinSnippet = person.profile.evidence.find(item => item.source === "LinkedIn")?.snippet || "LinkedIn does not explicitly state this information.";
  const instagramSnippet = person.profile.evidence.find(item => item.source === "Instagram")?.snippet || "Instagram does not explicitly state this information.";
  for (const field of requiredFields) if (!person.profile.evidence.some(item => item.field === field)) {
    const source = ["hobbies", "interests", "values", "communication_style", "lifestyle", "needs", "looking_for"].includes(field) ? "Instagram" as const : "LinkedIn" as const;
    person.profile.evidence.push({ field, claim: `${field.replaceAll("_", " ")} is not explicitly supported by the public sources`, source, snippet: (source === "Instagram" ? instagramSnippet : linkedinSnippet).slice(0, 500) });
  }
  await writeFile(path.join(root, ".data", "demo", `${person.id}.json`), JSON.stringify(person), "utf8");
}

for (const date of run.dates) {
  const a = people.get(date.aId), b = people.get(date.bId);
  if (!a || !b) throw new Error(`Missing participant for ${date.id}`);
  date.result = groundedFallback(a, b);
}

const rankings: RunRanking[] = [];
for (const person of run.people) {
  const candidates = run.dates.filter(date => date.aId === person.id || date.bId === person.id).map(date => {
    const isA = date.aId === person.id, self = isA ? date.result.scores.a_to_b : date.result.scores.b_to_a, mutual = isA ? date.result.scores.b_to_a : date.result.scores.a_to_b;
    const confidenceA = isA ? date.result.reflections.a.confidence : date.result.reflections.b.confidence, confidenceB = isA ? date.result.reflections.b.confidence : date.result.reflections.a.confidence;
    return { personId: person.id, matchId: isA ? date.bId : date.aId, score: finalScore(self.overall, mutual.overall, date.similarity, self.red_flags, mutual.red_flags, confidenceA, confidenceB), reason: self.reason, dateId: date.id, self: self.overall, mutual: mutual.overall, similarity: date.similarity };
  }).sort((left, right) => right.score - left.score || right.self - left.self || right.mutual - left.mutual || right.similarity - left.similarity || left.matchId.localeCompare(right.matchId));
  candidates.forEach((candidate, index) => { const { self: _self, mutual: _mutual, similarity: _similarity, ...ranking } = candidate; rankings.push({ ...ranking, rank: index + 1 }); });
}
run.rankings = rankings;
run.createdAt = new Date().toISOString();
await writeFile(file, JSON.stringify(run), "utf8");
console.log(`refreshed ${run.people.length} profiles, ${run.dates.length} dates, and ${run.rankings.length} rankings`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
