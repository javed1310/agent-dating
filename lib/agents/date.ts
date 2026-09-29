import { z } from "zod";
import { generate } from "../llm/providers";
import type { AgentProfile } from "../schema";

const turnSchema = z.object({ speaker: z.enum(["a", "b"]), text: z.string().min(1).max(800) });
const scoreSchema = z.object({
  interest: z.number().min(0).max(100), chemistry: z.number().min(0).max(100),
  values_fit: z.number().min(0).max(100), lifestyle: z.number().min(0).max(100),
  red_flags: z.number().min(0).max(10), overall: z.number().min(0).max(100),
  reason: z.string().min(1)
});
const reflectionSchema = z.object({
  speaker: z.enum(["a", "b"]), verdict: z.enum(["yes", "maybe", "no"]),
  attraction: z.string().min(1), uncertainty: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(2).max(4), confidence: z.number().min(0).max(1)
});
const resultSchema = z.object({
  turns: z.array(turnSchema).length(12),
  reflections: z.object({ a: reflectionSchema, b: reflectionSchema }),
  scores: z.object({ a_to_b: scoreSchema, b_to_a: scoreSchema })
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
  "name one genuine attraction and one uncertainty", "decide whether another date is warranted"
] as const;

const first = (xs: unknown, fallback: string) => Array.isArray(xs) && typeof xs[0] === "string" && xs[0].trim() ? xs[0] : fallback;
const phrase = (value: string, fallback: string) => (value || fallback).trim().replace(/[.!?]+$/, "").replace(/^./, letter => letter.toLowerCase());
const evidenceConfidence = (profile: AgentProfile) => Math.max(.35, Math.min(1, profile.confidence * Math.min(1, profile.evidence.length / 12)));

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
    { speaker: "a", text: `That could be a real friction point. I can adapt, but not if every plan becomes provisional. I would need us to protect some shared time.` },
    { speaker: "b", text: `That is fair. I was describing pressure, not asking you to accept unreliability. I could commit to plans and flag intense weeks early. Would that address it?` },
    { speaker: "a", text: `Mostly. I respond well when disappointment is named early and neither person tries to win. How do you usually repair after letting someone down?` },
    { speaker: "b", text: `I would own the impact, explain without hiding behind the explanation, and ask what repair looks like. Long term, I want ${bv} without losing ${bn}.` },
    { speaker: "a", text: `I am attracted to that clarity and to our shared curiosity. My uncertainty is whether our schedules would leave enough room to build something steady.` },
    { speaker: "b", text: `I share that uncertainty, but the way we handled it makes me interested in another date. I would rather test the rhythm honestly than pretend it is already solved.` }
  ];
  const fit = Math.min(92, 66 + shared.length * 5 + (a.profile.values.some(x => b.profile.values.includes(x)) ? 6 : 0));
  const confidenceA = evidenceConfidence(a.profile), confidenceB = evidenceConfidence(b.profile);
  const adjustedA = Math.round(fit * (.8 + confidenceA * .2)), adjustedB = Math.round((fit - 2) * (.8 + confidenceB * .2));
  const score = (overall: number, reason: string) => ({ interest: Math.min(100, overall + 3), chemistry: overall, values_fit: Math.min(100, overall + 4), lifestyle: Math.max(0, overall - 7), red_flags: 1, overall, reason });
  return {
    turns,
    reflections: {
      a: { speaker: "a", verdict: "maybe", attraction: `${b.name}'s direct repair and commitment to ${bv}.`, uncertainty: `Whether ${bl} can consistently make room for ${an}.`, evidence: ["Turn 8: clarified the scheduling tension", "Turn 10: described accountable repair"], confidence: confidenceA },
      b: { speaker: "b", verdict: "yes", attraction: `${a.name}'s honesty about ${an} and willingness to test compatibility.`, uncertainty: `Whether ${al} and ${bl} can coexist without resentment.`, evidence: ["Turn 7: named a boundary without attacking", "Turn 11: expressed attraction and uncertainty"], confidence: confidenceB }
    },
    scores: {
      a_to_b: score(adjustedA, `Turns 8 and 10 show accountable repair; turn 6 exposes a real lifestyle risk. Evidence confidence ${Math.round(confidenceA * 100)}%.`),
      b_to_a: score(adjustedB, `Turns 7 and 11 show clear boundaries and reciprocal interest; schedule compatibility remains unresolved. Evidence confidence ${Math.round(confidenceB * 100)}%.`)
    }
  };
}

export async function runDate(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, localOnly = false) {
  if (localOnly) return groundedFallback(a, b);
  const system = "Simulate a natural, evidence-bound first date. Do not invent biography, private goals, or sensitive traits. Avoid generic agreement and interview-style question chains. Include one plausible lifestyle tension and a respectful repair. Return JSON only: exactly 12 alternating turns, private reflections for a and b, and two-sided scores. Every judgment reason and reflection must cite specific turn numbers. Lower confidence and overall scores when source evidence is weak.";
  try {
    const raw = await generate({ system, messages: [{ role: "user", content: JSON.stringify({ phases, a, b }) }] });
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return resultSchema.parse(parsed.date || parsed.conversation || parsed);
  } catch { return groundedFallback(a, b); }
}

const generatedTurnSchema = z.object({ text: z.string().min(1).max(800) });
export async function generateDateTurn(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, turns: DateTurn[], index: number) {
  const speaker = index % 2 === 0 ? "a" : "b";
  const prompt = `Write only turn ${index + 1} of 12, spoken by person ${speaker}. Stage: ${phases[index]}. Maximum 75 words. Respond directly to the previous turn, reveal something relevant, and do not repeat a question already asked. Use only supplied profile facts. Return JSON {"text":"..."}.`;
  try {
    const raw = await generate({ system: "You simulate one evidence-bound date turn. Be natural, specific, concise, and willing to disagree respectfully. Never invent biography or sensitive traits. Output JSON only.", messages: [{ role: "user", content: JSON.stringify({ prompt, a, b, turns }) }] });
    return { speaker, text: generatedTurnSchema.parse(JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""))).text };
  } catch { return groundedFallback(a, b).turns[index]; }
}

export async function judgeDate(a: { name: string; profile: AgentProfile }, b: { name: string; profile: AgentProfile }, turns: DateTurn[]): Promise<DateJudgment> {
  try {
    const raw = await generate({
      system: "Independently judge a completed first date from both sides. Separate verified profile facts from statements made in the simulation. Cite exact turn numbers, name attraction and uncertainty, and reduce confidence when evidence is thin. Output JSON only with reflections {a,b} and scores {a_to_b,b_to_a}.",
      messages: [{ role: "user", content: JSON.stringify({ a, b, turns, scoring: ["interest", "chemistry", "values_fit", "lifestyle", "red_flags", "overall"] }) }]
    });
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    return resultSchema.pick({ reflections: true, scores: true }).parse(parsed.judgment || parsed);
  } catch {
    const fallback = groundedFallback(a, b);
    return { reflections: fallback.reflections, scores: fallback.scores };
  }
}
