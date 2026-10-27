import type { Metadata } from "next";
import { plans } from "@/lib/content";
import { Breadcrumb, CallToAction, Pricing } from "@/components/sections";
import { ContactButton } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Pricing" };
const questions = [
  ["Which plan is right for me?", "Sprint is for one focused deliverable. Studio brings together a complete site, product or identity. Retainer gives an existing team regular design support. A short conversation helps us find the right fit."],
  ["Can we combine services?", "Yes. Related work can share one scope, one schedule and one quote. A website and a brand identity, for example, work well together."],
  ["What happens before we start?", "We agree on the goal, deliverables, schedule and price in writing. You know what is included before the first sketch."],
  ["Can you work with an existing team?", "Yes. The process can fit around your team, existing brand and development workflow. We decide how to share updates and feedback at the start."],
];
export default function PricingPage() { return <><div className="container pricing-breadcrumb"><Breadcrumb current="Pricing" /></div><Pricing full /><section className="container comparison" id="compare"><h2 data-reveal>FIND YOUR <em>fit.</em></h2><div className="comparison-scroll"><table><caption className="sr-only">Compare design plans</caption><thead><tr><th scope="col">A little side by side</th>{plans.map(plan => <th scope="col" key={plan.name}>{plan.name}</th>)}</tr></thead><tbody>{[["Best for", "A focused launch", "A complete project", "Ongoing design"], ["Working rhythm", "2-week sprint", "6-week project", "Monthly"], ["Design partner", "Mahdi", "Mahdi", "Mahdi"], ["Clear project scope", "✓", "✓", "✓"], ["Responsive design", "✓", "✓", "✓"], ["Handover & source files", "✓", "✓", "✓"], ["Starting from", "$1,800", "$4,900", "$3,200/mo"]].map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></section><section className="container faq-section"><div><h2>GOOD <em>questions.</em></h2><ContactButton className="text-link blue-link">ASK SOMETHING ELSE ↗</ContactButton></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section><CallToAction variant="general" /></>; }
