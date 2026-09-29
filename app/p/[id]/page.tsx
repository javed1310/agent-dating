import Link from "next/link";
import { notFound } from "next/navigation";
import { personById } from "@/lib/run-data";

const list = (title: string, values: string[]) => <section className="fact"><h3>{title}</h3><div className="pills">{values.map(value => <span className="pill" key={value}>{value}</span>)}</div></section>;

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, person = await personById(id);
  if (!person) notFound();
  const profile = person.profile;
  return <main className="page">
    <Link className="back" href="/demo">← All proxies</Link>
    {person.matchSummary?.reason && <section className="card" style={{ margin: "28px 0", boxShadow: "6px 6px 0 var(--coral)" }}><span className="eyebrow">Preference-aware matching</span><h2>{person.matchSummary.available} of {person.matchSummary.requested} compatible candidates available</h2><p>{person.matchSummary.reason} Profiles with unknown gender or dating preferences were not guessed or silently included.</p></section>}
    <div className="profile-head"><div className="big-avatar" style={{ background: person.color }}>{person.name.split(" ").map(part => part[0]).join("").slice(0, 2)}</div><div><span className="eyebrow">Evidence-backed proxy</span><h1>{person.name}</h1><p className="lede">{profile.summary}</p><span className="confidence">{Math.round(profile.confidence * 100)}% confidence</span> <Link className="button" href={`/p/${person.id}/matches`}>View matches →</Link></div></div>
    <div className="facts">{list("Skills", profile.skills)}{list("Hobbies", profile.hobbies)}{list("Interests", profile.interests)}{list("Values", profile.values)}{list("Needs", profile.needs)}{list("Deal breakers", profile.deal_breakers)}<section className="fact"><h3>Career stage</h3><p>{profile.career_stage}</p></section><section className="fact"><h3>Location</h3><p>{profile.location}</p></section><section className="fact"><h3>Looking for</h3><p>{profile.looking_for}</p></section><section className="fact"><h3>Communication</h3><p>{profile.communication_style}</p></section><section className="fact"><h3>Lifestyle</h3><p>{profile.lifestyle}</p></section></div>
    <section className="profile-evidence"><span className="eyebrow">Receipts, not guesses</span><h2>Evidence for every major claim</h2>{profile.evidence.map((evidence, index) => <article className="evidence" key={`${evidence.field}-${index}`}><span className="source">{evidence.source} · {evidence.field?.replaceAll("_", " ") || "profile"}</span><strong> {evidence.claim}</strong><p>“{evidence.snippet}”</p></article>)}</section>
  </main>;
}
