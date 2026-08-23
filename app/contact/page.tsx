import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, EnvelopeSimple, Factory, GlobeHemisphereWest } from "@phosphor-icons/react";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Contact Sai Zhao Fragrance", description: "Start a conversation with Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd." };
export default function ContactPage() { return <main><SiteHeader /><PageHero eyebrow="CONTACT" title="Start with the conversation your product needs." intro="Tell us what you are developing and we will guide the inquiry toward the right next step." image="/images/sai-zhao-factory-gate.png" /><section className="contact-grid section"><article><EnvelopeSimple size={30} weight="light" /><h2>Project inquiries</h2><p>Use the structured brief form to share product, application and market context.</p><Link className="text-link" href="/request-a-quote">Share Your Brief <ArrowRight size={17} /></Link></article><article><Factory size={30} weight="light" /><h2>Factory conversation</h2><p>For a facility or production discussion, begin with the product route and desired timing.</p><Link className="text-link" href="/request-a-quote">Start an inquiry <ArrowRight size={17} /></Link></article><article><GlobeHemisphereWest size={30} weight="light" /><h2>Market context</h2><p>Share where the product will be introduced so the project can start with the relevant questions.</p><Link className="text-link" href="/markets">Explore markets <ArrowRight size={17} /></Link></article></section><SiteFooter /></main>; }
