import Link from "next/link";
import { notFound } from "next/navigation";
import { matchesFor, personById } from "@/lib/run-data";

export default async function Matches({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, matches] = await Promise.all([personById(id), matchesFor(id)]);
  if (!person) notFound();
  return <main className="page matches-page">
    <Link className="back back-button" href={`/p/${id}`}>← Back to {person.name}&apos;s profile</Link>
    <div className="matches-intro"><span className="eyebrow">The agent&apos;s verdict</span><h1>Best fits for {person.name.split(" ")[0]}</h1><p className="lede">Every ranked match completed a full date. Scores combine both agents&apos; judgments with evidence-backed profile fit.</p><div className="score-key" aria-label="Compatibility score breakdown"><span><strong>55%</strong> their view</span><span><strong>25%</strong> mutual interest</span><span><strong>20%</strong> profile fit</span></div></div>
    {matches.length === 0 && <section className="card"><h2>No mutually compatible candidates yet</h2><p>The system did not guess missing gender or dating-preference information. As verified candidates join, they can appear here.</p></section>}
    <section className="match-list" aria-label={`Ranked matches for ${person.name}`}>{matches.map(match => <article className="match-card" key={match.person.id}><div className="match-rank"><span>Rank</span><strong>#{match.rank}</strong></div><div className="match-main"><span className="eyebrow">{match.notDated ? "Similarity estimate · not dated" : "Recommended match"}</span><h2>{match.person.name}</h2><p>{match.reason}</p>{match.dateId ? <Link className="date-button" href={`/date/${match.dateId}`} aria-label={`View the full date between ${person.name} and ${match.person.name}`}>View full date <span aria-hidden="true">→</span></Link> : <span className="confidence">No transcript · similarity only</span>}</div><div className="match-score" aria-label={`${match.score} ${match.notDated ? "similarity" : "compatibility"} score`}><strong>{match.score}</strong><span>{match.notDated ? "Similarity" : "Compatibility"}</span></div></article>)}</section>
  </main>;
}
