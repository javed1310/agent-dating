import Link from "next/link";
import { notFound } from "next/navigation";
import { personById } from "@/lib/run-data";

const unavailable = /^(unknown|n\/?a|none|not available|not enough public information)|source gap|no .+ (listed|mentioned|expressed|provided|found)/i;
const known = (value: unknown) => typeof value === "string" && value.trim().length > 0 && !unavailable.test(value.trim());

const list = (title: string, values: string[]) => {
  const visible = values.filter(known);
  return visible.length ? <section className="fact" key={title}><h3>{title}</h3><div className="pills">{visible.map(value => <span className="pill" key={value}>{value}</span>)}</div></section> : null;
};

const detail = (title: string, value: string) => known(value) ? <section className="fact" key={title}><h3>{title}</h3><p>{value}</p></section> : null;

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, person = await personById(id);
  if (!person) notFound();
  const profile = person.profile;
  const fields = [
    ["Skills", profile.skills], ["Hobbies", profile.hobbies], ["Interests", profile.interests], ["Values", profile.values], ["Needs", profile.needs], ["Deal breakers", profile.deal_breakers],
  ] as const;
  const details = [["Career stage", profile.career_stage], ["Location", profile.location], ["Looking for", profile.looking_for], ["Communication", profile.communication_style], ["Lifestyle", profile.lifestyle]] as const;
  const missing = [...fields.filter(([, values]) => !values.some(known)).map(([title]) => title), ...details.filter(([, value]) => !known(value)).map(([title]) => title)];
  const supportedEvidence = profile.evidence.filter(item => known(item.claim) && known(item.snippet));

  return <main className="page">
    <Link className="back" href="/demo">← All agents</Link>
    {person.matchSummary?.reason && <section className="card" style={{ margin: "28px 0", boxShadow: "6px 6px 0 var(--coral)" }}><span className="eyebrow">Preference-aware matching</span><h2>{person.matchSummary.available} of {person.matchSummary.requested} compatible candidates available</h2><p>{person.matchSummary.reason} Profiles with unknown gender or dating preferences were not guessed or silently included.</p></section>}
    <div className="profile-head"><div className="big-avatar" style={{ background: person.color }}>{person.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</div><div><span className="eyebrow">Evidence-backed agent</span><h1>{person.name}</h1><p className="lede">{profile.summary}</p><span className="confidence">{profile.confidence > 0 ? `${Math.round(profile.confidence * 100)}% confidence` : "Limited public evidence"}</span> <Link className="button" href={`/p/${person.id}/matches`}>View matches →</Link></div></div>
    <div className="facts">{fields.map(([title, values]) => list(title, [...values]))}{details.map(([title, value]) => detail(title, value))}</div>
    {missing.length > 0 && <aside className="source-gap"><strong>Not available from public sources</strong><p>{missing.join(", ")}. These details were not guessed.</p></aside>}
    <section className="profile-evidence"><span className="eyebrow">Receipts, not guesses</span><h2>Evidence for supported claims</h2>{supportedEvidence.map((evidence, index) => <article className="evidence" key={`${evidence.field}-${index}`}><span className="source">{evidence.source} · {evidence.field?.replaceAll("_", " ") || "profile"}</span><strong> {evidence.claim}</strong><p>“{evidence.snippet}”</p></article>)}</section>
  </main>;
}
