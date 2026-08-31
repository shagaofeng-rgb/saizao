import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/UiIcons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { applicationImageAlt, applications } from "@/lib/site-data";

export const metadata: Metadata = { title: "Fragrance Applications", description: "Explore fragrance development for fine fragrance, candles, home fragrance and home care.", alternates: { canonical: "/applications" } };
export default function ApplicationsPage() { return <main id="main-content"><SiteHeader /><section className="listing-hero"><p className="eyebrow">APPLICATIONS</p><h1>Different products.<br />A considered scent direction for each.</h1><p className="lead">Choose an application to explore the kind of development conversation we can begin together.</p></section><section className="listing-grid section">{applications.map((item) => <article className="listing-card" key={item.slug}><Image src={item.image} alt={applicationImageAlt(item.title)} width={900} height={900} /><div><h2>{item.title}</h2><p>{item.description}</p><Link className="text-link" href={`/applications/${item.slug}`}>Explore {item.title} <ArrowRight size={17} /></Link></div></article>)}</section><SiteFooter /></main>; }
