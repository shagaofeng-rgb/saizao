import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/UiIcons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Fragrance Resources | Sai Zhao", description: "Practical fragrance development resources and common questions for product teams." };
const resources = [["How to prepare a fragrance development brief", "A useful brief explains the product, user, market, desired mood and evaluation route."], ["Choosing a fragrance application route", "Start with the finished product and intended use so development can follow the right questions."], ["From scent idea to sample feedback", "A simple way to make sampling feedback more actionable for the next refinement." ]];
export default function ResourcesPage() { return <main><SiteHeader /><section className="listing-hero"><p className="eyebrow">RESOURCES</p><h1>Useful context for better fragrance briefs.</h1><p className="lead">A small, growing library built for product teams and buyers starting a scent-led project.</p></section><section className="resource-grid section">{resources.map(([title, text], index) => <article key={title}><span>GUIDE 0{index + 1}</span><h2>{title}</h2><p>{text}</p><Link href="/request-a-quote">Talk through your project <ArrowRight size={16} /></Link></article>)}<article className="resource-feature"><span>FAQ</span><h2>Looking for a direct answer?</h2><p>See the common questions page for a practical starting point.</p><Link className="button" href="/resources/faq">Visit FAQs <ArrowRight size={18} /></Link></article></section><SiteFooter /></main>; }
