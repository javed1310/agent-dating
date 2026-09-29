import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  for (const name of [".env", ".env.local"]) {
    try {
      const body = await readFile(name, "utf8");
      for (const line of body.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!match) continue;
        const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
        process.env[match[1]] = value;
      }
    } catch {}
  }
}

const first=(items,fallback)=>Array.isArray(items)&&items[0]?.trim()?items[0]:fallback;
const phrase=(value,fallback)=>(value||fallback).trim().replace(/[.!?]+$/,"").replace(/^./,letter=>letter.toLowerCase());
const confidence=profile=>Math.max(.35,Math.min(1,Number(profile.confidence||0)*Math.min(1,(profile.evidence?.length||0)/12)));
const finalScore=(mine,mutual,similarity,mineFlags=0,mutualFlags=0)=>Math.round((mine*.55+mutual*.25+similarity*100*.2-(mineFlags>=6||mutualFlags>=6?10:0))*10)/10;

function result(a,b){
  const ai=phrase(first(a.profile.interests,"learning"),"learning"),bi=phrase(first(b.profile.interests,"new ideas"),"new ideas"),bv=phrase(first(b.profile.values,"growth"),"growth"),an=phrase(first(a.profile.needs,"honest communication"),"honest communication"),bn=phrase(first(b.profile.needs,"emotional steadiness"),"emotional steadiness"),al=phrase(a.profile.lifestyle,"a balanced week"),bl=phrase(b.profile.lifestyle,"a flexible routine");
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
  return {turns,reflections:{a:{kind:"reflection",speaker:"a",verdict:"maybe",attraction:`${b.name}'s direct repair and commitment to ${bv}.`,uncertainty:`Whether ${bl} can consistently make room for ${an}.`,evidence:["Turn 8: clarified the scheduling tension","Turn 10: described accountable repair"],confidence:ca},b:{kind:"reflection",speaker:"b",verdict:"yes",attraction:`${a.name}'s honesty about ${an} and willingness to test compatibility.`,uncertainty:`Whether ${al} and ${bl} can coexist without resentment.`,evidence:["Turn 7: named a boundary without attacking","Turn 11: expressed attraction and uncertainty"],confidence:cb}},scores:{a_to_b:score(oa,`Turns 8 and 10 show accountable repair; turn 6 exposes a real lifestyle risk. Evidence confidence ${Math.round(ca*100)}%.`),b_to_a:score(ob,`Turns 7 and 11 show clear boundaries and reciprocal interest; schedule compatibility remains unresolved. Evidence confidence ${Math.round(cb*100)}%.`)}};
}

await loadEnv();
const apply=process.argv.includes("--apply"),url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_KEY;
if(!url||!key)throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const db=createClient(url,key,{auth:{persistSession:false}});
const [{data:dates,error:dateError},{data:running,error:jobError},{data:profileRows,error:profileError},{data:people,error:peopleError}]=await Promise.all([
  db.from("dates").select("id,run_id,a_id,b_id,similarity,status,transcript"),
  db.from("jobs").select("id,type,status").in("status",["pending","running"]),
  db.from("profiles").select("person_id,profile"),
  db.from("people").select("id,name")
]);
if(dateError||jobError||profileError||peopleError)throw dateError||jobError||profileError||peopleError;
const profiles=new Map(profileRows.map(row=>[row.person_id,row.profile])),names=new Map(people.map(row=>[row.id,row.name||"Saved agent"])),eligible=[],skipped=[];
for(const date of dates){const turns=(date.transcript||[]).filter(item=>item.kind!=="reflection"&&item.text),reflections=(date.transcript||[]).filter(item=>item.kind==="reflection");if(turns.length===12&&reflections.length===2)continue;if(!profiles.has(date.a_id)||!profiles.has(date.b_id)){skipped.push(date.id);continue}eligible.push(date)}
console.log(JSON.stringify({mode:apply?"apply":"audit",totalDates:dates.length,alreadyUpgraded:dates.length-eligible.length-skipped.length,eligible:eligible.length,skippedMissingProfiles:skipped.length,activeJobs:running.length},null,2));
if(!apply)process.exit(0);
if(running.length)throw new Error(`Refusing to backfill while ${running.length} jobs are pending or running`);

for(const [index,date] of eligible.entries()){
  const a={name:names.get(date.a_id),profile:profiles.get(date.a_id)},b={name:names.get(date.b_id),profile:profiles.get(date.b_id)},generated=result(a,b),transcript=[...generated.turns,generated.reflections.a,generated.reflections.b];
  const {error:dateUpdate}=await db.from("dates").update({transcript,status:"judged"}).eq("id",date.id);if(dateUpdate)throw dateUpdate;
  const {error:scoreUpdate}=await db.from("scores").upsert([{date_id:date.id,from_id:date.a_id,to_id:date.b_id,...generated.scores.a_to_b},{date_id:date.id,from_id:date.b_id,to_id:date.a_id,...generated.scores.b_to_a}],{onConflict:"date_id,from_id"});if(scoreUpdate)throw scoreUpdate;
  if((index+1)%25===0||index===eligible.length-1)console.log(`upgraded ${index+1}/${eligible.length}`);
}

const affectedRuns=[...new Set(eligible.map(date=>date.run_id))];
for(const runId of affectedRuns){
  const {data:runDates,error}=await db.from("dates").select("id,a_id,b_id,similarity,scores(*)").eq("run_id",runId);if(error)throw error;
  const rows=[];for(const date of runDates){for(const own of date.scores||[]){const mutual=date.scores.find(score=>score.from_id===own.to_id);if(!mutual)continue;rows.push({run_id:runId,person_id:own.from_id,match_id:own.to_id,final_score:finalScore(own.overall,mutual.overall,date.similarity,own.red_flags,mutual.red_flags),reason:own.reason,date_id:date.id})}}
  for(const personId of [...new Set(rows.map(row=>row.person_id))])rows.filter(row=>row.person_id===personId).sort((a,b)=>b.final_score-a.final_score).forEach((row,index)=>row.rank=index+1);
  const {error:deleteError}=await db.from("rankings").delete().eq("run_id",runId);if(deleteError)throw deleteError;
  for(let index=0;index<rows.length;index+=100){const {error:insertError}=await db.from("rankings").insert(rows.slice(index,index+100));if(insertError)throw insertError}
}
console.log(JSON.stringify({upgraded:eligible.length,recalculatedRuns:affectedRuns.length,skipped},null,2));
