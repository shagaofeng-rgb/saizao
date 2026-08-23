import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/UiIcons";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { capabilities } from "@/lib/site-data";

export const metadata: Metadata = { title: "Fragrance Development Capabilities | Sai Zhao", description: "Custom fragrance development, sampling, OEM/ODM support and scale-up communication." };
export default function CapabilitiesPage() { return <main><SiteHeader /><PageHero eyebrow="CAPABILITIES" title="From first scent thought to the next production step." intro="A practical development structure designed around your application, brand direction and sampling feedback." image="/images/hero-fragrance-still-life.png" /><section className="content-section"><p className="eyebrow">HOW WE CAN SUPPORT</p><div className="capability-grid">{capabilities.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p><Link href="/request-a-quote">Discuss this capability <ArrowRight size={16} /></Link></article>)}</div></section><section className="centered-cta"><p className="eyebrow">A CLEARER NEXT STEP</p><h2>Start with the brief your product needs.</h2><Link className="button" href="/request-a-quote">Share Your Brief <ArrowRight size={18} /></Link></section><SiteFooter /></main>; }
