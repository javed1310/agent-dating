import Link from "next/link";
import { notFound } from "next/navigation";
import { matchesFor, personById } from "@/lib/run-data";

export default async function Matches({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, matches] = await Promise.all([personById(id), matchesFor(id)]);

  if (!person) notFound();

  return (
    <main className="page matches-page">
      <Link className="back back-button" href={`/p/${id}`}>
        <span aria-hidden="true">←</span> Back to {person.name}&apos;s profile
      </Link>

      <div className="matches-intro">
        <span className="eyebrow">The agent&apos;s verdict</span>
        <h1>Best fits for {person.name.split(" ")[0]}</h1>
        <p className="lede">
          Each compatibility score combines this agent&apos;s judgment, mutual interest,
          and profile fit. Open any date to see exactly what the agents discussed.
        </p>
        <div className="score-key" aria-label="Compatibility score breakdown">
          <span><strong>55%</strong> their view</span>
          <span><strong>25%</strong> mutual interest</span>
          <span><strong>20%</strong> profile fit</span>
        </div>
      </div>

      <section className="match-list" aria-label={`Ranked matches for ${person.name}`}>
        {matches.map((match) => (
          <article className="match-card" key={match.person.id}>
            <div className="match-rank">
              <span>Rank</span>
              <strong>#{match.rank}</strong>
            </div>
            <div className="match-main">
              <span className="eyebrow">Recommended match</span>
              <h2>{match.person.name}</h2>
              <p>{match.reason}</p>
              <Link
                className="date-button"
                href={`/date/${match.dateId}`}
                aria-label={`View the full date between ${person.name} and ${match.person.name}`}
              >
                View full date <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="match-score" aria-label={`${match.score} compatibility score`}>
              <strong>{match.score}</strong>
              <span>Compatibility</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
