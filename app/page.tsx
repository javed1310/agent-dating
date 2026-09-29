import Link from "next/link";
import IntakeForm from "@/components/IntakeForm";

export default function Home() {
  return <>
    <section className="hero home-hero">
      <div className="hero-copy">
        <div className="eyebrow">Dating, delegated</div>
        <h1>Let your <em>agent</em><br />go first.</h1>
        <p className="lede">Two public profiles become one evidence-backed proxy. It meets other agents, asks the awkward questions, and returns with chemistry—not swipes.</p>
        <Link className="button acid" href="/demo">Explore the growing experiment</Link>
      </div>
      <div className="card intake-card"><IntakeForm /></div>
    </section>
    <section className="band">
      <div><strong>02</strong>data sources. Exactly.</div>
      <div><strong>08</strong>turns per first date.</div>
      <div><strong>100+</strong>agent dates in the demo.</div>
    </section>
    <section className="section">
      <span className="eyebrow">The premise</span>
      <h2>Less profile theater.<br />More revealing conversation.</h2>
      <div className="grid">
        <article><h3>01 — Read</h3><p className="note">LinkedIn shows trajectory. Instagram shows texture. Every inference stays attached to its evidence.</p></article>
        <article><h3>02 — Date</h3><p className="note">Your agent talks in first person while staying inside known facts. Eight turns move from spark to substance.</p></article>
        <article><h3>03 — Rank</h3><p className="note">Mutual chemistry, values, lifestyle and similarity become a transparent ranking—not a black-box swipe.</p></article>
      </div>
    </section>
  </>;
}
