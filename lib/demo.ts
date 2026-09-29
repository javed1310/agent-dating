import type { AgentProfile } from "./schema";

const seeds = [
 ["Melanie Perkins","Canva co-founder","Sydney","design,travel,building","https://www.linkedin.com/in/melanieperkins/","https://www.instagram.com/melaniecanva/"],
 ["Steven Bartlett","Entrepreneur & host","London","conversation,fitness,ideas","https://www.linkedin.com/in/stevenbartlett-123/","https://www.instagram.com/steven/"],
 ["Reshma Saujani","Founder & author","New York","education,writing,equality","https://www.linkedin.com/in/reshmasaujani/","https://www.instagram.com/reshmasaujani/"],
 ["Alexis Ohanian","Founder & investor","Miami","sports,technology,parenting","https://www.linkedin.com/in/alexisohanian/","https://www.instagram.com/alexisohanian/"],
 ["Whitney Wolfe Herd","Founder","Austin","travel,community,design","https://www.linkedin.com/in/whitney-wolfe-herd/","https://www.instagram.com/whitney/"],
 ["Jay Shetty","Author & host","Los Angeles","mindfulness,storytelling,wellness","https://www.linkedin.com/in/jayshetty/","https://www.instagram.com/jayshetty/"],
 ["Bozoma Saint John","Marketing leader","Los Angeles","culture,fashion,travel","https://www.linkedin.com/in/bozoma-saint-john/","https://www.instagram.com/badassboz/"],
 ["Brian Chesky","Airbnb co-founder","San Francisco","design,travel,community","https://www.linkedin.com/in/brianchesky/","https://www.instagram.com/bchesky/"],
 ["Mindy Kaling","Writer & producer","Los Angeles","comedy,books,fashion","https://www.linkedin.com/in/mindykaling/","https://www.instagram.com/mindykaling/"],
 ["Ali Abdaal","Creator & entrepreneur","London","learning,productivity,travel","https://www.linkedin.com/in/ali-abdaal/","https://www.instagram.com/aliabdaal/"],
 ["Sophia Amoruso","Founder & author","Los Angeles","fashion,writing,business","https://www.linkedin.com/in/sophiaamoruso/","https://www.instagram.com/sophiaamoruso/"],
 ["Andrew Huberman","Professor & host","California","science,fitness,nature","https://www.linkedin.com/in/andrew-huberman/","https://www.instagram.com/hubermanlab/"],
 ["Marie Forleo","Entrepreneur & author","New York","dance,writing,coaching","https://www.linkedin.com/in/marieforleo/","https://www.instagram.com/marieforleo/"],
 ["Ryan Reynolds","Actor & founder","New York","comedy,film,football","https://www.linkedin.com/in/vancityreynolds/","https://www.instagram.com/vancityreynolds/"],
 ["Emma Grede","Entrepreneur","Los Angeles","fashion,family,mentoring","https://www.linkedin.com/in/emma-grede/","https://www.instagram.com/emmagrede/"],
 ["Tim Ferriss","Author & investor","Austin","experiments,books,fitness","https://www.linkedin.com/in/timferriss/","https://www.instagram.com/timferriss/"],
 ["Payal Kadakia","Founder","New York","dance,community,entrepreneurship","https://www.linkedin.com/in/payalkadakia/","https://www.instagram.com/payal/"],
 ["Lewis Howes","Author & host","Los Angeles","sports,wellness,conversation","https://www.linkedin.com/in/lewishowes/","https://www.instagram.com/lewishowes/"],
 ["Arianna Huffington","Founder & author","New York","wellness,books,sleep","https://www.linkedin.com/in/ariannahuffington/","https://www.instagram.com/ariannahuff/"],
 ["Gary Vaynerchuk","Entrepreneur","New York","collecting,sports,media","https://www.linkedin.com/in/garyvaynerchuk/","https://www.instagram.com/garyvee/"],
 ["Elaine Welteroth","Author & journalist","Los Angeles","culture,writing,fashion","https://www.linkedin.com/in/elaine-welteroth/","https://www.instagram.com/elainewelteroth/"],
 ["Hasan Minhaj","Comedian & writer","New York","comedy,storytelling,basketball","https://www.linkedin.com/in/hasanminhaj/","https://www.instagram.com/hasanminhaj/"],
 ["Jessica Alba","Founder & actor","Los Angeles","wellness,family,design","https://www.linkedin.com/in/jessica-alba/","https://www.instagram.com/jessicaalba/"],
 ["Kevin Systrom","Instagram co-founder","San Francisco","photography,technology,food","https://www.linkedin.com/in/kevinsystrom/","https://www.instagram.com/kevin/"],
 ["Lilly Singh","Creator & author","Los Angeles","comedy,writing,advocacy","https://www.linkedin.com/in/lillysingh/","https://www.instagram.com/lilly/"],
 ["Reese Witherspoon","Actor & producer","Nashville","books,film,community","https://www.linkedin.com/in/reesewitherspoon/","https://www.instagram.com/reesewitherspoon/"]
] as const;

const colors=["#d8ff43","#ff765f","#baa0ff","#63d8cb","#ffc857"];
export type DemoPerson={id:string;name:string;role:string;location:string;linkedin:string;instagram:string;color:string;profile:AgentProfile};
export const people:DemoPerson[]=seeds.map((s,i)=>{const interests=s[3].split(",");return {id:`person-${i+1}`,name:s[0],role:s[1],location:s[2],linkedin:s[4],instagram:s[5],color:colors[i%colors.length],profile:{
 summary:`${s[0]} comes across as a curious, high-agency person who balances ${s[1].toLowerCase()} with ${interests[0]}. Their public voice suggests warmth, clarity, and a bias toward building things that bring people together.`,career_stage:s[1],skills:["Leadership","Storytelling","Creative problem-solving"],hobbies:interests,interests,values:["Curiosity","Growth","Meaningful connection"],communication_style:"Direct, energetic, and reflective; uses stories to make ideas personal.",lifestyle:`A full, outward-facing life anchored in ${s[2]}, with room for creative work and intentional downtime.`,location:s[2],needs:["Intellectual spark","Emotional steadiness","Playfulness"],looking_for:"Someone self-directed who can be both an enthusiastic collaborator and a calm counterweight.",deal_breakers:["Performative curiosity","Dismissive communication"],evidence:[{claim:`Invested in ${interests[0]}`,source:"Instagram",snippet:`Recent public captions repeatedly feature ${interests.join(", ")}.`},{claim:"Builder mindset",source:"LinkedIn",snippet:`Public headline identifies them as ${s[1]}.`}],confidence:.78+(i%4)*.04}}});
export const personById=(id:string)=>people.find(p=>p.id===id);
export function matchesFor(id:string){const idx=people.findIndex(p=>p.id===id);return [1,7,13,19,5,11].map((n,rank)=>{const p=people[(idx+n)%people.length];return {person:p,rank:rank+1,score:94-rank*4-(idx%3),reason:`Strong overlap in ${p.profile.interests[rank%p.profile.interests.length]} with a complementary communication rhythm.`,dateId:`${id}--${p.id}`}})}
export function demoDate(id:string){const [aId,bId]=id.split("--");const a=personById(aId)||people[0], b=personById(bId)||people[1];const shared=a.profile.interests.find(x=>b.profile.interests.includes(x))||a.profile.interests[0];return {a,b,turns:[
 {who:"a",text:`Let’s skip the résumé question. What’s something about ${shared} that still surprises you?`},
 {who:"b",text:`How it changes when you share it with someone. I’m curious: do you make room for wonder, or schedule it like everything else?`},
 {who:"a",text:"A little of both. Ambition gives my week shape, but the best parts tend to be unplanned. What does a genuinely good Sunday look like to you?"},
 {who:"b",text:"A slow morning, one absorbing conversation, and enough movement to feel awake. No performing productivity. What are you unwilling to trade for success?"},
 {who:"a",text:"The people who knew me before the polished version. I need relationships where quiet is as comfortable as momentum."},
 {who:"b",text:"That lands. I want someone with their own fire, but no need to turn dinner into a pitch. How do you handle disagreement?"},
 {who:"a",text:"Name the real thing early, stay kind, and get curious before getting defensive. Chemistry without repair skills feels temporary."},
 {who:"b",text:"Then yes, I’d meet again. Somewhere neither of us can optimize—maybe a tiny restaurant with no reviews?"}
 ],scoreA:91,scoreB:88,reason:"Mutual curiosity grew into a grounded conversation about ambition, presence, and repair."};}
