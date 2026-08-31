import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { company } from "@/lib/site-data";

export const metadata: Metadata = { title: "Request a Fragrance Quote", description: "Share your fragrance product brief with Sai Zhao.", alternates: { canonical: "/request-a-quote" } };
export default function RequestQuotePage() { return <main id="main-content"><SiteHeader /><section className="quote-hero"><p className="eyebrow">REQUEST A QUOTE / SAMPLE DISCUSSION</p><h1>Tell us what you want your product to feel like.</h1><p className="lead">The more useful your brief, the faster we can begin the right conversation about application, sample direction and the next production step.</p></section><section className="quote-page section"><div><h2>Start with the essentials.</h2><p>We use this first brief to understand who is asking, what product is being made, and what sort of scent development discussion is needed.</p><p className="direct-call">Prefer a direct call? Contact {company.contactName} at <a href={company.telephoneHref}>{company.telephone}</a>.</p></div><QuoteForm /></section><SiteFooter /></main>; }
