import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Request a Fragrance Quote | Sai Zhao", description: "Share your fragrance product brief with Sai Zhao." };
export default function RequestQuotePage() { return <main><SiteHeader /><section className="quote-hero"><p className="eyebrow">REQUEST A QUOTE / SAMPLE DISCUSSION</p><h1>Tell us what you want your product to feel like.</h1><p className="lead">The more useful your brief, the faster we can begin the right conversation about application, sample direction and the next production step.</p></section><section className="quote-page section"><div><p className="eyebrow">YOUR PROJECT</p><h2>Start with the essentials.</h2><p>We use this first brief to understand who is asking, what product is being made, and what sort of scent development discussion is needed.</p><p className="direct-call">Prefer a direct call? Contact Wang Jiahong at <a href="tel:+8613701780563">+86 137 0178 0563</a>.</p></div><QuoteForm /></section><SiteFooter /></main>; }
