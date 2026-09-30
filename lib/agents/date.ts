import { z } from "zod";
import { generate } from "../llm/providers";
import { componentScore } from "../rank/score";
import type { AgentProfile } from "../schema";

const numeric = (min: number, max: number) => z.coerce.number().min(min).max(max);
const turnSchema = z.object({ speaker: z.enum(["a", "b"]), text: z.string().min(1).max(800) });
const generatedScoreSchema = z.object({
  interest: numeric(0, 100), chemistry: numeric(0, 100),
  values_fit: numeric(0, 100), lifestyle: numeric(0, 100),
  red_flags: numeric(0, 10), overall: numeric(0, 100).optional(),
  reason: z.string().min(1),
});
const scoreSchema = generatedScoreSchema.extend({ overall: numeric(0, 100) });
const reflectionSchema = z.object({
  speaker: z.enum(["a", "b"]), verdict: z.enum(["yes", "maybe", "no"]),
  attraction: z.string().min(1), uncertainty: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(2).max(4), confidence: numeric(0, 1),
});
const judgmentSchema = z.object({
  reflections: z.object({ a: reflectionSchema, b: reflectionSchema }),
  scores: z.object({ a_to_b: generatedScoreSchema, b_to_a: generatedScoreSchema }),
});
const resultSchema = z.object({
  turns: z.array(turnSchema).length(12),
  reflections: judgmentSchema.shape.reflections,
  scores: z.object({ a_to_b: scoreSchema, b_to_a: scoreSchema }),
});

export type DateTurn = z.infer<typeof turnSchema>;
export type DateReflection = z.infer<typeof reflectionSchema>;
export type DateResult = z.infer<typeof resultSchema>;
export type DateScore = DateResult["scores"];
export type DateJudgment = Pick<DateResult, "scores" | "reflections">;

const phases = [
  "natural opening grounded in one verified interest", "respond to the previous answer with a specific follow-up",
  "ordinary weekly rhythm and availability", "ambition and what must not be sacrificed for it",
  "relationship needs and how support should feel", "a concrete lifestyle trade-off where they may differ",
  "challenge the trade-off respectfully instead of agreeing", "clarify or repair the tension",
  "communication during disappointment", "long-term direction without inventing private goals",
  "name one genuine attraction and one uncertainty", "decide whether another date is warranted",
] as const;

const first = (xs: unknown, fallback: string) => Array.isArray(xs) && typeof xs[0] === "string" && xs[0].trim() ? xs[0] : fallback;
const phrase = (value: string, fallback: string) => (value || fallback).trim().replace(/[.!?]+$/, "").replace(/^./, letter => letter.toLowerCase());
const evidenceConfidence = (profile: AgentProfile) => Math.max(.35, Math.min(1, profile.confidence * Math.min(1, profile.evidence.length / 12)));
const words = (value: string) => new Set((value.toLowerCase().match(/[a-z]{4,}/g) || []).filter(word => !["that", "this", "with", "from", "have", "your", "what", "when", "would", "about", "their", "there"].includes(word)));
const overlap = (left: string, right: string) => {
  const a = words(left), b = words(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(word => b.has(word)).length / Math.max(1, Math.min(a.size, b.size));
};
const bounded = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
const parseJson = (raw: string) => {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("LLM returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
};
const normalizeScore = (raw: z.infer<typeof generatedScoreSchema>) => {
  const parsed = generatedScoreSchema.parse(raw);
  const components = {
    interest: bounded(parsed.interest), chemistry: bounded(parsed.chemistry),
    values_fit: bounded(parsed.values_fit), lifestyle: bounded(parsed.lifestyle),
  };
  return { ...components, red_flags: Math.round(parsed.red_flags), overall: componentScore(components), reason: parsed.reason };
};
const normalizeJudgment = (value: unknown): DateJudgment => {
  const raw = value as Record<string, unknown>;
  const reflectionSource = raw.reflections as Record<string, unknown> | unknown[];
  const reflectionList = Array.isArray(reflectionSource) ? reflectionSource as Array<Record<string, unknown>> : [];
  const reflectionObject = Array.isArray(reflectionSource) ? {
    a: reflectionList.find(item => String(item.speaker).toLowerCase() === "a"),
    b: reflectionList.find(item => String(item.speaker).toLowerCase() === "b"),
  } : reflectionSource;
  const scoreSource = raw.scores as Record<string, unknown> | unknown[];
  const scoreList = Array.isArray(scoreSource) ? scoreSource as Array<Record<string, unknown>> : [];
  const scoreObject = Array.isArray(scoreSource) ? {
    a_to_b: scoreList.find(item => ["a", "a_to_b"].includes(String(item.speaker || item.from || item.direction).toLowerCase())),
    b_to_a: scoreList.find(item => ["b", "b_to_a"].includes(String(item.speaker || item.from || item.direction).toLowerCase())),
  } : scoreSource;
  const parsed = judgmentSchema.parse({ ...raw, reflections: reflectionObject, scores: scoreObject });
  return { reflections: parsed.reflections, scores: { a_to_b: normalizeScore(parsed.scores.a_to_b), b_to_a: normalizeScore(parsed.scores.b_to_a) } };
};

function transcriptFallbackJudgment(
  a: { name: string; profile: AgentProfile },
  b: { name: string; profile: AgentProfile },
  turns: DateTurn[],
): DateJudgment {
  const combined = turns.map(turn => turn.text).join(" ");
  const profileText = (profile: AgentProfile) => [profile.interests, profile.values, profile.needs, profile.lifestyle, profile.communication_style].flat().join(" ");
  const side = (speaker: "a" | "b", mine: typeof a, other: typeof b) => {
    const mineTurns = turns.filter(turn => turn.speaker === speaker);
    const said = mineTurns.map(turn => turn.text).join(" ");
    const sharedInterests = mine.profile.interests.filter(item => other.profile.interests.some(candidate => candidate.toLowerCase() === item.toLowerCase())).length;
    const sharedValues = mine.profile.values.filter(item => other.profile.values.some(candidate => candidate.toLowerCase() === item.toLowerCase())).length;
    const responsiveness = overlap(said, combined);
    const profileGrounding = overlap(said, profileText(other.profile));
    const lifestyleFit = overlap(mine.profile.lifestyle, other.profile.lifestyle);
    const repair = /repair|own|fair|understand|clarif|compromise|address|listen/i.test(combined);
    const tension = /clash|friction|uncertain|risk|disagree|concern|difficult/i.test(combined);
    const interest = bounded(52 + sharedInterests * 7 + profileGrounding * 22);
    const chemistry = bounded(50 + responsiveness * 18 + (repair ? 8 : 0) - (tension ? 3 : 0));
    const values_fit = bounded(50 + sharedValues * 9 + overlap(profileText(mine.profile), profileText(other.profile)) * 18);
    const lifestyle = bounded(48 + lifestyleFit * 30 + (repair ? 5 : 0) - (tension ? 6 : 0));
    const red_flags = Math.min(10, (tension ? 2 : 0) + (/dismiss|insult|control|never listen|lie/i.test(combined) ? 5 : 0));
    const components = { interest, chemistry, values_fit, lifestyle };
    const indices = mineTurns.map(turn => turns.indexOf(turn) + 1);
    const evidence = [`Turn ${indices[Math.max(0, indices.length - 2)]}: tested a concrete compatibility concern`, `Turn ${indices[indices.length - 1]}: stated interest and uncertainty`];
    const confidence = evidenceConfidence(mine.profile);
    return {
      reflection: { speaker, verdict: componentScore(components) >= 68 ? "yes" as const : componentScore(components) >= 52 ? "maybe" as const : "no" as const, attraction: `${other.name}'s responses showed enough specificity to test profile fit.`, uncertainty: tension ? "The conversation exposed a lifestyle or communication tension that needs another date to resolve." : "The available public evidence leaves some relationship preferences unknown.", evidence, confidence },
      score: { ...components, red_flags, overall: componentScore(components), reason: `${evidence.join("; ")}. Transcript-based fallback; evidence confidence ${Math.round(confidence * 100)}%.` },
    };
  };
  const left = side("a", a, b), right = side("b", b, a);
  return { reflections: { a: left.reflection, b: right.reflection }, scores: { a_to_b: left.score, b_to_a: right.score } };
}

export function groundedFallback(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }): DateResult {
  const ai = phrase(first(a.profile.interests, "learning"), "learning"), bi = phrase(first(b.profile.interests, "new ideas"), "new ideas");
  const av = phrase(first(a.profile.values, "curiosity"), "curiosity"), bv = phrase(first(b.profile.values, "growth"), "growth");
  const an = phrase(first(a.profile.needs, "honest communication"), "honest communication"), bn = phrase(first(b.profile.needs, "emotional steadiness"), "emotional steadiness");
  const al = phrase(a.profile.lifestyle, "a balanced week"), bl = phrase(b.profile.lifestyle, "a flexible routine");
  const shared = a.profile.interests.filter(x => b.profile.interests.some(y => y.toLowerCase() === x.toLowerCase()));
  const sharedTopic = shared[0] || `${ai} and ${bi}`;
  const turns: DateTurn[] = [
    { speaker: "a", text: `I noticed ${sharedTopic} matters to both of us. What part of it still surprises you?` },
    { speaker: "b", text: `The part that keeps changing how I think. You seem drawn to ${ai}; when did that become more than a passing interest?` },
    { speaker: "a", text: `It stays meaningful when it fits into ${al}. What does a genuinely good ordinary week look like for you?` },
    { speaker: "b", text: `Mine is closer to ${bl}. I care about ${bv}, but I do not want ambition to crowd out ${bn}. What would you refuse to sacrifice?` },
    { speaker: "a", text: `${an} matters most. Support should feel honest, not like automatic agreement. When you are stretched, what kind of support actually helps?` },
    { speaker: "b", text: `Space first, then a direct conversation. I wonder if our rhythms could clash: your ${al} may not always fit my ${bl}. How much flexibility would you expect?` },
    { speaker: "a", text: "That could be a real friction point. I can adapt, but not if every plan becomes provisional. I would need us to protect some shared time." },
    { speaker: "b", text: "That is fair. I was describing pressure, not asking you to accept unreliability. I could commit to plans and flag intense weeks early. Would that address it?" },
    { speaker: "a", text: "Mostly. I respond well when disappointment is named early and neither person tries to win. How do you usually repair after letting someone down?" },
    { speaker: "b", text: `I would own the impact, explain without hiding behind the explanation, and ask what repair looks like. Long term, I want ${bv} without losing ${bn}.` },
    { speaker: "a", text: "I am attracted to that clarity and to our shared curiosity. My uncertainty is whether our schedules would leave enough room to build something steady." },
    { speaker: "b", text: "I share that uncertainty, but the way we handled it makes me interested in another date. I would rather test the rhythm honestly than pretend it is already solved." },
  ];
  return { turns, ...transcriptFallbackJudgment(a, b, turns) };
}

export async function runDate(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, localOnly = false) {
  if (localOnly) return groundedFallback(a, b);
  const system = "Simulate a natural, evidence-bound first date. Do not invent biography, private goals, or sensitive traits. Avoid generic agreement and interview-style question chains. Include one plausible lifestyle tension and a respectful repair. Return JSON only: exactly 12 alternating turns, private reflections for a and b, and two-sided scores. Every judgment reason and reflection must cite specific turn numbers. Lower confidence when source evidence is weak. Scores must be numbers from 0 to 100; red_flags must be 0 to 10.";
  try {
    const parsed = parseJson(await generate({ system, messages: [{ role: "user", content: JSON.stringify({ phases, a, b }) }] }));
    const base = parsed.date || parsed.conversation || parsed;
    const turns = z.array(turnSchema).length(12).parse(base.turns);
    return { turns, ...normalizeJudgment(base) };
  } catch (error) {
    console.error("date_generation_fallback", error instanceof Error ? error.message : error);
    return groundedFallback(a, b);
  }
}

const generatedTurnSchema = z.object({ text: z.string().min(1).max(800) });
export async function generateDateTurn(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, turns: DateTurn[], index: number) {
  const speaker = index % 2 === 0 ? "a" : "b";
  const prompt = `Write only turn ${index + 1} of 12, spoken by person ${speaker}. Stage: ${phases[index]}. Maximum 75 words. Respond directly to the previous turn, reveal something relevant, and do not repeat a question already asked. Use only supplied profile facts. Return JSON {"text":"..."}.`;
  try {
    const parsed = parseJson(await generate({ system: "You simulate one evidence-bound date turn. Be natural, specific, concise, and willing to disagree respectfully. Never invent biography or sensitive traits. Output JSON only.", messages: [{ role: "user", content: JSON.stringify({ prompt, a, b, turns }) }] }));
    return { speaker, text: generatedTurnSchema.parse(parsed).text };
  } catch (error) {
    console.error(`date_turn_${index + 1}_fallback`, error instanceof Error ? error.message : error);
    return groundedFallback(a, b).turns[index];
  }
}

export async function judgeDate(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, turns: DateTurn[]): Promise<DateJudgment> {
  try {
    const parsed = parseJson(await generate({
      system: "Independently judge a completed first date from both sides. Separate verified profile facts from statements made in the simulation. Cite exact turn numbers, name attraction and uncertainty, and reduce confidence when evidence is thin. Score interest, chemistry, values_fit and lifestyle independently from 0 to 100; score red_flags from 0 to 10. Do not output an overall score because it is calculated deterministically. Output one JSON object. `reflections` may be an array of exactly two objects, each containing speaker (`a` or `b`), verdict (`yes`, `maybe`, or `no`), attraction, uncertainty, evidence (2-4 turn citations), and confidence (0-1). `scores` must contain `a_to_b` and `b_to_a`, each with interest, chemistry, values_fit, lifestyle, red_flags, and a reason citing turns.",
      messages: [{ role: "user", content: JSON.stringify({ a, b, turns }) }],
    }));
    return normalizeJudgment(parsed.judgment || parsed);
  } catch (error) {
    console.error("date_judgment_fallback", error instanceof Error ? error.message : error);
    return transcriptFallbackJudgment(a, b, turns);
  }
}
