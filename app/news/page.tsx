import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { publishedArticles } from "@/lib/published-content";

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const items = await publishedArticles();
  return {
    title: "News & Insights",
    description: "Published updates and fragrance insight from Sai Zhao Fragrance.",
    alternates: { canonical: "/news" },
    robots: items.length ? undefined : { index: false, follow: true },
  };
}

export default async function News() {
  const items = await publishedArticles();
  return <><SiteHeader /><main id="main-content" className="catalog-page"><header className="catalog-hero"><p className="eyebrow">NEWS & INSIGHTS</p><h1>Updates from Sai Zhao Fragrance.</h1><p>Company news, fragrance insight, FAQs and market-oriented content published by our team.</p></header><section className="catalog-grid">{items.length ? items.map((item) => <article className="catalog-card" key={item.id}>{item.cover_url && <Image src={item.cover_url} alt={item.title} width={1200} height={900} sizes="(max-width: 780px) 100vw, 33vw" />}<div><p className="eyebrow">{item.content_categories?.name ?? item.article_type ?? "NEWS"}</p><h2>{item.title}</h2><p>{item.excerpt}</p><Link className="text-link" href={`/news/${item.slug}`}>Read article</Link></div></article>) : <p className="catalog-empty">No news has been published yet.</p>}</section></main><SiteFooter /></>;
}
