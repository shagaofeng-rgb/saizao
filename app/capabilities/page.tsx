import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/UiIcons";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollReveal } from "@/components/ScrollReveal";
import { capabilities } from "@/lib/site-data";

export const metadata: Metadata = { title: "Fragrance Development Capabilities", description: "Custom fragrance development, sampling, OEM/ODM support and scale-up communication.", alternates: { canonical: "/capabilities" } };
export default function CapabilitiesPage() { return <main id="main-content"><SiteHeader /><PageHero eyebrow="CAPABILITIES" title="From first scent thought to the next production step." intro="A practical development structure designed around your application, brand direction and sampling feedback." image="/images/facility/workshop-control.jpg" imageAlt="Sai Zhao production control area" /><ScrollReveal className="content-section"><div className="capability-grid">{capabilities.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p><Link href="/request-a-quote">Discuss this capability <ArrowRight size={16} /></Link></article>)}</div></ScrollReveal><ScrollReveal className="facility-feature"><div><h2>Development conversations stay close to the production environment.</h2><p>Our facility photos give your team a clearer view of the working setting behind sampling and the next production discussion.</p></div><figure><Image src="/images/facility/workshop-production.jpg" alt="Sai Zhao workshop production area" fill sizes="(max-width: 800px) 100vw, 50vw" className="cover-image" /></figure></ScrollReveal><section className="centered-cta"><h2>Start with the brief your product needs.</h2><Link className="button" href="/request-a-quote">Share Your Brief <ArrowRight size={18} /></Link></section><SiteFooter /></main>; }
