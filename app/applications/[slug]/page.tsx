import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@/components/UiIcons";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { applications } from "@/lib/site-data";

export function generateStaticParams() { return applications.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const item = applications.find((application) => application.slug === slug); return item ? { title: `${item.title} Fragrance Development | Sai Zhao`, description: item.description } : {}; }
export default async function ApplicationDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const item = applications.find((application) => application.slug === slug); if (!item) notFound(); return <main><SiteHeader /><PageHero eyebrow={item.eyebrow} title={`${item.title} fragrance, developed around your product.`} intro={item.description} image={item.image} /><section className="content-section two-column"><div><p className="eyebrow">WHERE IT CAN APPLY</p><h2>Start with the product experience you want to create.</h2></div><ul className="detail-list">{item.applications.map((entry) => <li key={entry}><CheckCircle size={19} weight="fill" />{entry}</li>)}</ul></section><section className="focus-section"><p className="eyebrow">OUR DEVELOPMENT FOCUS</p><div>{item.focus.map((entry, index) => <article key={entry}><span>0{index + 1}</span><h2>{entry}</h2><p>We keep this part of the conversation visible from the brief through the next sample.</p></article>)}</div><Link className="button" href="/request-a-quote">Discuss this application <ArrowRight size={18} /></Link></section><SiteFooter /></main>; }
