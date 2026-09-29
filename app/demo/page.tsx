import Link from "next/link";
import { getDemoRun, getPeople } from "@/lib/run-data";

export default async function Demo() {
  const [run, people] = await Promise.all([getDemoRun(), getPeople()]);

  return (
    <div className="page">
      <span className="eyebrow">Precomputed experiment · complete</span>
      <h1 style={{ font: "500 64px Georgia", marginBottom: 10 }}>
        {people.length} people. {run.dates.length} first dates.
      </h1>
      <p className="lede">
        A fixed, browsable experiment built from public LinkedIn and Instagram signals.
        Live submissions are saved separately at their private run URL and do not get
        published into this public demo automatically.
      </p>
      <div className="progress">
        {[1, 2, 3, 4].map((step) => <i className="step done" key={step} />)}
      </div>
      <div className="grid">
        {people.map((person, index) => (
          <Link className="person" href={`/p/${person.id}`} key={person.id}>
            <div className="avatar" style={{ background: person.color }}>
              {person.name.split(" ").map((part) => part[0]).join("")}
            </div>
            <span className="eyebrow">Proxy {String(index + 1).padStart(2, "0")}</span>
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
