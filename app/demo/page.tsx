import Link from "next/link";
import { getDemoRun, getPeople } from "@/lib/run-data";
import { getCompletedLiveAgents } from "@/lib/live-runs";

export const dynamic = "force-dynamic";

export default async function Demo() {
  const [run, people] = await Promise.all([getDemoRun(), getPeople()]);
  const liveAgents = await getCompletedLiveAgents(people);
  return (
    <div className="page">
      <span className="eyebrow">Precomputed experiment · complete</span>
      <h1 style={{ font: "500 64px Georgia", marginBottom: 10 }}>
        {people.length} people. {run.dates.length} first dates.
      </h1>
      <p className="lede">
        A fixed, browsable experiment built from public LinkedIn and Instagram signals.
        Completed live submissions are shown separately and never change these demo totals.
      </p>
      <div className="progress">
        {[1, 2, 3, 4].map((step) => <i className="step done" key={step} />)}
      </div>
      {liveAgents.length > 0 && (
        <section style={{ margin: "54px 0" }}>
          <span className="eyebrow">Saved from the live site</span>
          <h2 style={{ font: "500 46px Georgia", margin: "10px 0" }}>Newly added agents</h2>
          <p className="note">Open an agent to see their saved profile, completed dates, and rankings.</p>
          <div className="grid" style={{ marginTop: 24 }}>
            {liveAgents.map((agent) => (
              <Link className="person live-person" href={`/p/${agent.personId}`} key={agent.personId}>
                <div className="avatar" style={{ background: "var(--acid)" }}>
                  {agent.name.split(" ").map((part) => part[0]).join("").slice(0, 3)}
                </div>
                <span className="eyebrow">Live agent · {agent.dates} dates</span>
                <h3>{agent.name}</h3>
                <p className="note">{agent.role} · {agent.location}</p>
                <div className="pills">
                  {agent.interests.slice(0, 4).map((interest) => (
                    <span className="pill" key={interest}>{interest}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="grid">
        {people.map((person, index) => (
          <Link className="person" href={`/p/${person.id}`} key={person.id}>
            <div className="avatar" style={{ background: person.color }}>
              {person.name.split(" ").map((part) => part[0]).join("")}
            </div>
            <span className="eyebrow">Agent {String(index + 1).padStart(2, "0")}</span>
            <h3>{person.name}</h3>
            <p className="note">{person.role} · {person.location}</p>
            <div className="pills">
              {person.profile.interests.map((interest) => (
                <span className="pill" key={interest}>{interest}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
