import Image from "next/image";
import Link from "next/link";
import { plans, process, profile } from "@/lib/content";
import { Arrow } from "./icons";
import { ContactButton } from "./site-chrome";

export function Hero() {
  return <section className="hero" aria-label={`${profile.name}, ${profile.role}`}>
    <h1 className="headline"><span className="intro"><span>I’m</span><span>ui/ux</span></span><span className="designer">DESIGNER</span></h1>
    <div className="portrait"><Image src="/images/mahdi-portrait.webp" alt={`${profile.name}, independent UI and UX designer`} width={1254} height={1187} priority sizes="(max-width: 600px) 92vw, 690px" /></div>
    <div className="hero-chat"><ContactButton>LET’S CHAT</ContactButton></div>
    <p className="specialties">WEB DESIGN,<br />PRODUCT<br />INTERFACES AND<br />FRONT-END BUILD.</p><p className="statement">Clear interfaces.<br />Considered details.</p>
  </section>;
}

export function Introduction() {
  return <section className="container introduction" aria-label="A little about me" data-reveal>
    <p className="intro-copy">{profile.intro} <Image className="inline-image" src="/images/studio.webp" width={92} height={44} alt="A considered workspace" /> <em>ready before the next milestone.</em> <span>One person from the first sketch <Image className="inline-image" src="/images/design-process.webp" width={92} height={44} alt="Design sketches on paper" /> to the deployed page.</span></p>
    <div className="stats"><div><strong>01</strong><p>Design partner, from the<br />first idea to launch.</p></div><div><strong>09</strong><p>Connected services for<br />your next good idea.</p></div><div><strong>02<em>parts</em></strong><p>Thoughtful design.<br />Careful development.</p></div><div><strong>100<em>%</em></strong><p>Attention to the details<br />that make a difference.</p></div></div>
    <Link className="text-link blue-link" href="/about">MORE ABOUT ME <Arrow /></Link>
  </section>;
}

export function Pricing({ full = false }: { full?: boolean }) {
  return <section className={`container pricing-section ${full ? "pricing-full" : ""}`} id="plans">
    <div className="section-heading" data-reveal><div><h2>PRICING <em>plan</em></h2><p>Three fixed-scope plans. A written scope before any work starts, and no<br className="desktop-break" /> invoices for extra emails.</p></div>{!full && <Link className="text-link" href="/pricing#compare">COMPARE PLANS <Arrow /></Link>}</div>
    <div className="pricing-grid">{plans.map(plan => <article id={plan.name.toLowerCase()} key={plan.name} className={`price-card ${plan.featured ? "featured" : ""}`} data-reveal>
      {plan.featured && <span className="popular-tag">MOST CHOSEN</span>}<div className="price-top"><h3>{plan.name}</h3><span>{plan.duration}</span></div><p className="price">${plan.price}{plan.name === "Retainer" && <small>/ month</small>}</p><h4>{plan.subtitle}</h4><p className="plan-description">{plan.description}</p><ContactButton className={`button ${plan.featured ? "button-white" : "button-dark"}`} subject={`${plan.name} plan`}>LET’S TALK {plan.name.toUpperCase()} <Arrow /></ContactButton><ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul><p className="plan-fineprint">Clear scope. Considered details.</p>
    </article>)}</div><p className="pricing-note">Indicative rates adapted from the reference. Final scope and quote agreed together.</p>
  </section>;
}

export function CallToAction({ variant = "services" }: { variant?: "services" | "general" }) {
  return <section className="contact-band" data-reveal><div className="container"><h2>{variant === "services" ? <>NEED TWO <em>of them?</em></> : <>LET’S BUILD <em>something good.</em></>}</h2><p>{variant === "services" ? <>Combined work gets one scope, one price and one calendar.<br />Tell me what you have in mind.</> : <>A new idea, a fresh start, or the next chapter.<br />Let’s find the right way to make it happen.</>}</p><div className="cta-actions"><ContactButton>START A PROJECT <Arrow /></ContactButton><Link href="/pricing">or see the three plans</Link></div></div></section>;
}

export function Process() {
  return <section id="process" className="container process-section"><div className="section-heading" data-reveal><h2>HOW I <em>work</em></h2><p>A simple process.<br />Room for the right details.</p></div><div className="process-grid">{process.map((step, index) => <article key={step.title} data-reveal><span className="process-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>;
}

export function StudioGallery() {
  return <section className="container studio-gallery" aria-label="Design process and studio"><figure data-reveal><Image src="/images/design-process.webp" alt="Hands sketching interface wireframes in a notebook beside a coffee cup" width={780} height={520} priority sizes="(max-width: 700px) 90vw, 60vw" /><figcaption>Every project starts on paper. A little clarity before the pixels.</figcaption></figure><figure data-reveal><Image src="/images/studio.webp" alt="Sunlit workspace with a cobalt blue chair and abstract blue artwork" width={520} height={650} priority sizes="(max-width: 700px) 70vw, 40vw" /><figcaption>A space for considered ideas.</figcaption></figure></section>;
}

export function Breadcrumb({ current }: { current: string }) { return <p className="breadcrumb"><Link href="/">HOME</Link><span>›</span>{current.toUpperCase()}</p>; }
