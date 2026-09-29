import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../db/demo-run.json", import.meta.url);
const run = JSON.parse(await readFile(file, "utf8"));
const first = (items, fallback) => Array.isArray(items) && items[0]?.trim() ? items[0] : fallback;
const phrase = (value, fallback) => (value || fallback).trim().replace(/[.!?]+$/, "").replace(/^./, letter => letter.toLowerCase());
const confidence = profile => Math.max(.35, Math.min(1, profile.confidence * Math.min(1, profile.evidence.length / 12)));
const finalScore = (mine, mutual, similarity, mineFlags = 0, mutualFlags = 0) => Math.round((mine * .55 + mutual * .25 + similarity * 100 * .2 - (mineFlags >= 6 || mutualFlags >= 6 ? 10 : 0)) * 10) / 10;

function result(a, b) {
  const ai=phrase(first(a.profile.interests,"learning"),"learning"),bi=phrase(first(b.profile.interests,"new ideas"),"new ideas"),av=phrase(first(a.profile.values,"curiosity"),"curiosity"),bv=phrase(first(b.profile.values,"growth"),"growth"),an=phrase(first(a.profile.needs,"honest communication"),"honest communication"),bn=phrase(first(b.profile.needs,"emotional steadiness"),"emotional steadiness"),al=phrase(a.profile.lifestyle,"a balanced week"),bl=phrase(b.profile.lifestyle,"a flexible routine");
  const shared=a.profile.interests.filter(x=>b.profile.interests.some(y=>y.toLowerCase()===x.toLowerCase())),topic=shared[0]||`${ai} and ${bi}`;
  const turns=[
    {speaker:"a",text:`I noticed ${topic} matters to both of us. What part of it still surprises you?`},
    {speaker:"b",text:`The part that keeps changing how I think. You seem drawn to ${ai}; when did that become more than a passing interest?`},
    {speaker:"a",text:`It stays meaningful when it fits into ${al}. What does a genuinely good ordinary week look like for you?`},
    {speaker:"b",text:`Mine is closer to ${bl}. I care about ${bv}, but I do not want ambition to crowd out ${bn}. What would you refuse to sacrifice?`},
    {speaker:"a",text:`${an} matters most. Support should feel honest, not like automatic agreement. When you are stretched, what kind of support actually helps?`},
    {speaker:"b",text:`Space first, then a direct conversation. I wonder if our rhythms could clash: your ${al} may not always fit my ${bl}. How much flexibility would you expect?`},
    {speaker:"a",text:"That could be a real friction point. I can adapt, but not if every plan becomes provisional. I would need us to protect some shared time."},
    {speaker:"b",text:"That is fair. I was describing pressure, not asking you to accept unreliability. I could commit to plans and flag intense weeks early. Would that address it?"},
    {speaker:"a",text:"Mostly. I respond well when disappointment is named early and neither person tries to win. How do you usually repair after letting someone down?"},
    {speaker:"b",text:`I would own the impact, explain without hiding behind the explanation, and ask what repair looks like. Long term, I want ${bv} without losing ${bn}.`},
    {speaker:"a",text:"I am attracted to that clarity and to our shared curiosity. My uncertainty is whether our schedules would leave enough room to build something steady."},
    {speaker:"b",text:"I share that uncertainty, but the way we handled it makes me interested in another date. I would rather test the rhythm honestly than pretend it is already solved."}
  ];
  const ca=confidence(a.profile),cb=confidence(b.profile),fit=Math.min(92,66+shared.length*5+(a.profile.values.some(x=>b.profile.values.includes(x))?6:0)),oa=Math.round(fit*(.8+ca*.2)),ob=Math.round((fit-2)*(.8+cb*.2));
  const score=(overall,reason)=>({interest:Math.min(100,overall+3),chemistry:overall,values_fit:Math.min(100,overall+4),lifestyle:Math.max(0,overall-7),red_flags:1,overall,reason});
  return {turns,reflections:{a:{speaker:"a",verdict:"maybe",attraction:`${b.name}'s direct repair and commitment to ${bv}.`,uncertainty:`Whether ${bl} can consistently make room for ${an}.`,evidence:["Turn 8: clarified the scheduling tension","Turn 10: described accountable repair"],confidence:ca},b:{speaker:"b",verdict:"yes",attraction:`${a.name}'s honesty about ${an} and willingness to test compatibility.`,uncertainty:`Whether ${al} and ${bl} can coexist without resentment.`,evidence:["Turn 7: named a boundary without attacking","Turn 11: expressed attraction and uncertainty"],confidence:cb}},scores:{a_to_b:score(oa,`Turns 8 and 10 show accountable repair; turn 6 exposes a real lifestyle risk. Evidence confidence ${Math.round(ca*100)}%.`),b_to_a:score(ob,`Turns 7 and 11 show clear boundaries and reciprocal interest; schedule compatibility remains unresolved. Evidence confidence ${Math.round(cb*100)}%.`)}};
}

const people = new Map(run.people.map(person => [person.id, person]));
for (const date of run.dates) date.result = result(people.get(date.aId), people.get(date.bId));
run.rankings = [];
for (const person of run.people) {
  const ranked = run.dates.filter(date => date.aId === person.id || date.bId === person.id).map(date => {
    const isA=date.aId===person.id,self=isA?date.result.scores.a_to_b:date.result.scores.b_to_a,mutual=isA?date.result.scores.b_to_a:date.result.scores.a_to_b;
    return {personId:person.id,matchId:isA?date.bId:date.aId,score:finalScore(self.overall,mutual.overall,date.similarity,self.red_flags,mutual.red_flags),reason:self.reason,dateId:date.id};
  }).sort((a,b)=>b.score-a.score);
  ranked.forEach((item,index)=>run.rankings.push({...item,rank:index+1}));
}
run.createdAt = new Date().toISOString();
await writeFile(file, JSON.stringify(run), "utf8");
console.log(`upgraded ${run.dates.length} dates to 12 turns with independent reflections`);
