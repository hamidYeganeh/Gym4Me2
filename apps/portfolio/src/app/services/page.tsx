import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/lib/content";
import { Arrow, ServiceIcon } from "@/components/icons";
import { Breadcrumb, CallToAction } from "@/components/sections";

export const metadata: Metadata = { title: "Services" };

export default function Services() { return <>
  <div className="container services-page"><header className="page-heading" data-reveal><Breadcrumb current="Services" /><h1>SERVICES <em>and prices</em></h1><p>Nine things I do well, each with a starting price and the plan it usually sits<br className="desktop-break" /> in. If you need two of them, they share one scope and one invoice.</p></header>
  <div className="services-layout"><aside className="services-sidebar" aria-label="Service index"><nav>{services.map((service, index) => <a key={service.id} href={`#${service.id}`}><span>{String(index + 1).padStart(2, "0")} {service.title}</span><span>${service.price}</span></a>)}</nav><div className="plan-help"><h2>Not sure which plan?</h2><p>Most single pages fit Sprint. Most sites and products fit Studio. Ongoing work fits Retainer.</p><Link className="text-link blue-link" href="/pricing#compare">COMPARE PLANS <Arrow /></Link></div></aside>
  <div className="services-list">{services.map((service, index) => <article className="service-row" id={service.id} key={service.id} data-reveal><span className="service-number">{String(index + 1).padStart(2, "0")}</span><div className="service-content"><h2><ServiceIcon name={service.icon} /><span>{service.title.toUpperCase()}</span> <em>{service.detail}</em></h2><p>{service.description}</p><div className="service-tags">{service.tags.map(tag => <span key={tag}>{tag}</span>)}<span>◷ {service.time}</span></div></div><div className="service-rate"><span>FROM</span><strong>${service.price}</strong><Link href={`/pricing#${service.plan.toLowerCase()}`}>{service.plan.toUpperCase()} PLAN <Arrow /></Link></div></article>)}</div></div></div><CallToAction />
  </>; }
