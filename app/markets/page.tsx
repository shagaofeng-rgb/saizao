import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Global Markets | Sai Zhao", description: "Begin a fragrance development conversation for your target market and application." };
export default function MarketsPage() { return <main><SiteHeader /><section className="listing-hero"><p className="eyebrow">GLOBAL MARKETS</p><h1>Designed for conversations that cross borders.</h1><p className="lead">Tell us your intended market early so the project discussion can begin with the context that matters.</p></section><section className="market-story section"><Image src="/images/global-market-map.png" alt="Stylized dotted global map" width={1600} height={900} /><div><p className="eyebrow">THE RIGHT STARTING POINT</p><h2>Application, market, sample, next step.</h2><p>Every market and product route has a different set of questions. Our inquiry structure makes space for the details that help a project move forward.</p><Link className="text-link" href="/request-a-quote">Tell us about your market <ArrowRight size={17} /></Link></div></section><section className="feature-band"><div><h3>Target market</h3><p>Where will the product be introduced?</p></div><div><h3>Product route</h3><p>What kind of finished product is being developed?</p></div><div><h3>Project timing</h3><p>What does the sample and launch schedule need to support?</p></div></section><SiteFooter /></main>; }
