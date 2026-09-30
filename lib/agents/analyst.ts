import {generate} from "@/lib/llm/providers";import {evidenceCompleteProfileSchema} from "@/lib/schema";
const system="Use ONLY the supplied LinkedIn and Instagram data. Never infer sexual orientation, religion, health, or politics. Sparse data means lower confidence, never invention. Output valid JSON only with summary, career_stage, skills, hobbies, interests, values, communication_style, lifestyle, location, needs, looking_for, deal_breakers, confidence, and evidence. Evidence must contain at least one item for EACH of these fields: summary, career_stage, skills, hobbies, interests, values, communication_style, lifestyle, location, needs, looking_for, deal_breakers. Every evidence item is {field,claim,source,snippet}; source is exactly LinkedIn or Instagram and snippet is a short verbatim excerpt from the supplied data. If a field is unknown, state that in the field and cite the source gap without inventing.";
function normalize(value:unknown){const p=value as Record<string,unknown>;const strings=(v:unknown)=>Array.isArray(v)?v.map(String):v?[String(v)]:[];const text=(v:unknown,fallback="Not enough public information")=>Array.isArray(v)?v.join("; "):String(v||fallback),evidence=Array.isArray(p.evidence)?p.evidence.map((item)=>{const e=item as Record<string,unknown>;const raw=String(e.source||"").toLowerCase();return {field:String(e.field||"").toLowerCase(),claim:text(e.claim,"Public signal"),source:raw.includes("linkedin")?"LinkedIn" as const:"Instagram" as const,snippet:text(e.snippet,"")}}):[],unsupported=/\b(unknown|not enough|not present|no .* (listed|mentioned|expressed|information)|source gap)\b/i,supportedFields=new Set(evidence.filter(item=>!unsupported.test(`${item.claim} ${item.snippet}`)).map(item=>item.field)),evidenceConfidence=Math.min(.9,supportedFields.size/12),reported=Math.max(0,Math.min(1,Number(p.confidence)||0));return {...p,summary:text(p.summary),career_stage:text(p.career_stage),communication_style:text(p.communication_style),lifestyle:text(p.lifestyle),location:text(p.location),skills:strings(p.skills),hobbies:strings(p.hobbies),interests:strings(p.interests),values:strings(p.values),needs:strings(p.needs),deal_breakers:strings(p.deal_breakers),looking_for:text(p.looking_for),confidence:Math.max(reported,evidenceConfidence),evidence};}
function record(value:unknown){const unwrapped=Array.isArray(value)?value[0]:value;return unwrapped&&typeof unwrapped==="object"?unwrapped as Record<string,unknown>:{};}
function clip(value:unknown,max=700){return String(value||"").slice(0,max);}
function compactSources(sources:unknown){
  const value=sources&&typeof sources==="object"?sources as Record<string,unknown>:{},linkedin=record(value.linkedin),instagram=record(value.instagram),list=(input:unknown)=>Array.isArray(input)?input:[];
  const compactLinkedIn={
    full_name:linkedin.full_name,profile_headline:linkedin.profile_headline,description:clip(linkedin.description||linkedin.manualText,1200),job_title:linkedin.job_title,
    industry_name:linkedin.industry_name||linkedin.industry,current_company_name:linkedin.current_company_name,location:linkedin.address||linkedin.location,
    skills:list(linkedin.skills).slice(0,20),
    experience:list(linkedin.experience).slice(0,6).map(item=>{const row=record(item);return {job_title:row.job_title,company_name:row.company_name,job_location:row.job_location,employment_type:row.employment_type,job_description:clip(row.job_description,600),company_description:clip(row.company_description,700)}}),
    featured:list(linkedin.featured).slice(0,6).map(item=>{const row=record(item);return {type:row.type,description:clip(row.description,900)}}),
    education:list(linkedin.education).slice(0,5),publication:list(linkedin.publication).slice(0,5),volunteering:list(linkedin.volunteering).slice(0,5),certification:list(linkedin.certification).slice(0,5),honors_and_awards:list(linkedin.honors_and_awards).slice(0,5),
  };
  const compactInstagram={
    fullName:instagram.fullName,username:instagram.username,biography:clip(instagram.biography||instagram.bio||instagram.manualText,1200),verified:instagram.verified,businessCategoryName:instagram.businessCategoryName,externalUrl:instagram.externalUrl,postsCount:instagram.postsCount,followersCount:instagram.followersCount,
    latestPosts:list(instagram.latestPosts).slice(0,10).map(item=>{const row=record(item);return {caption:clip(row.caption,900),hashtags:list(row.hashtags).slice(0,15),timestamp:row.timestamp,locationName:row.locationName}}),
  };
  return JSON.stringify({linkedin:compactLinkedIn,instagram:compactInstagram});
}
function deterministicProfile(sources:unknown){
  const compact=JSON.parse(compactSources(sources)) as {linkedin:Record<string,unknown>;instagram:Record<string,unknown>},li=compact.linkedin,ig=compact.instagram;
  const value=(...items:unknown[])=>items.map(item=>String(item||"").trim()).find(Boolean)||"Not enough public information";
  const list=(input:unknown)=>Array.isArray(input)?input.map(item=>typeof item==="string"?item:value((item as Record<string,unknown>)?.name,(item as Record<string,unknown>)?.skill)).filter(item=>item&&item!=="Not enough public information"):[];
  const posts=Array.isArray(ig.latestPosts)?ig.latestPosts as Array<Record<string,unknown>>:[],caption=value(posts[0]?.caption),bio=value(ig.biography),headline=value(li.profile_headline,li.job_title),location=value(li.location),skills=list(li.skills).slice(0,8),themes=[...new Set(posts.flatMap(post=>list(post.hashtags)).map(tag=>tag.replace(/^#/,"")))].slice(0,8);
  const available=(text:string)=>text!=="Not enough public information",unknown="Not enough public information";
  const profile={
    summary:[headline,bio].filter(available).join(". ")||unknown,career_stage:headline,skills,hobbies:themes,interests:themes,values:[],communication_style:unknown,lifestyle:unknown,location,needs:[],looking_for:unknown,deal_breakers:[],
    confidence:Math.min(.65,([headline,bio,location].filter(available).length+(skills.length?1:0)+(themes.length?1:0))/5*.65),
    evidence:[] as Array<{field:string;claim:string;source:"LinkedIn"|"Instagram";snippet:string}>,
  };
  const linkedinSnippet=available(headline)?headline:"Source gap: LinkedIn does not explicitly state this.",instagramSnippet=available(bio)?bio:available(caption)?caption:"Source gap: Instagram does not explicitly state this.";
  const rows:Array<[string,string,"LinkedIn"|"Instagram",string]>=[
    ["summary","Public professional and social summary","LinkedIn",linkedinSnippet],["career_stage","Public professional headline","LinkedIn",linkedinSnippet],["skills",skills.length?"Publicly listed skills":"Skills not explicitly available","LinkedIn",skills.join(", ")||linkedinSnippet],
    ["hobbies",themes.length?"Themes visible in public Instagram posts":"Hobbies not explicitly available","Instagram",themes.join(", ")||instagramSnippet],["interests",themes.length?"Themes visible in public Instagram posts":"Interests not explicitly available","Instagram",themes.join(", ")||instagramSnippet],
    ["values","Values were not explicitly stated","Instagram",instagramSnippet],["communication_style","Communication style was not explicitly stated","Instagram",instagramSnippet],["lifestyle","Lifestyle was not explicitly stated","Instagram",instagramSnippet],
    ["location",available(location)?"Publicly listed location":"Location not explicitly available","LinkedIn",available(location)?location:linkedinSnippet],["needs","Relationship needs were not explicitly stated","Instagram",instagramSnippet],["looking_for","Dating goals were not explicitly stated","Instagram",instagramSnippet],["deal_breakers","Deal breakers were not explicitly stated","LinkedIn",linkedinSnippet],
  ];
  profile.evidence=rows.map(([field,claim,source,snippet])=>({field,claim,source,snippet}));
  return evidenceCompleteProfileSchema.parse(profile);
}
export async function analyze(sources:unknown,retry=false){
  const content=compactSources(sources),instruction=retry?`A previous queued attempt returned invalid or incomplete JSON. Return valid JSON with all 12 evidence field labels exactly.\n${content}`:content;
  try{const text=(await generate({system,messages:[{role:"user",content:instruction}]})).replace(/^```json\s*|\s*```$/g,"");return evidenceCompleteProfileSchema.parse(normalize(JSON.parse(text)))}catch(error){console.error("profile_analysis_fallback",error instanceof Error?error.message:error);return deterministicProfile(sources)}
}
