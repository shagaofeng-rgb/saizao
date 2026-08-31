import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@/components/UiIcons";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { applicationImageAlt, applications } from "@/lib/site-data";

export function generateStaticParams() { return applications.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const item = applications.find((application) => application.slug === slug); return item ? { title: item.title.endsWith("Fragrance") ? `${item.title} Development` : `${item.title} Fragrance Development`, description: item.description, alternates: { canonical: `/applications/${item.slug}` } } : {}; }
export default async function ApplicationDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const item = applications.find((application) => application.slug === slug); if (!item) notFound(); const productLabel = item.title.endsWith("Fragrance") ? item.title : `${item.title} fragrance`; return <main id="main-content"><SiteHeader /><PageHero eyebrow={item.eyebrow} title={`${productLabel}, developed around your product.`} intro={item.description} image={item.image} imageAlt={applicationImageAlt(item.title)} /><section className="content-section two-column"><div><h2>Start with the product experience you want to create.</h2></div><ul className="detail-list">{item.applications.map((entry) => <li key={entry}><CheckCircle size={19} weight="fill" />{entry}</li>)}</ul></section><section className="focus-section"><div>{item.focus.map((entry, index) => <article key={entry}><span>0{index + 1}</span><h2>{entry}</h2><p>We keep this part of the conversation visible from the brief through the next sample.</p></article>)}</div><Link className="button" href="/request-a-quote">Discuss this application <ArrowRight size={18} /></Link></section><SiteFooter /></main>; }
