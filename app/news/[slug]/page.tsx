import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { publishedArticle } from "@/lib/published-content";
import { company, siteUrl } from "@/lib/site-data";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await publishedArticle((await params).slug);
  return item ? {
    title: item.seo_title || item.title,
    description: item.seo_description || item.excerpt || undefined,
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: { type: "article", title: item.seo_title || item.title, description: item.seo_description || item.excerpt || undefined, url: `${siteUrl}/news/${item.slug}`, images: item.cover_url ? [{ url: item.cover_url, alt: item.title }] : undefined },
  } : {};
}

export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  const item = await publishedArticle((await params).slug);
  if (!item) notFound();
  const articleSchema = {
    "@context": "https://schema.org", "@type": "Article", headline: item.title,
    description: item.excerpt || undefined, image: item.cover_url || undefined,
    datePublished: item.published_at || undefined,
    author: { "@type": "Organization", name: company.brandName },
    publisher: { "@type": "Organization", name: company.legalName },
    mainEntityOfPage: `${siteUrl}/news/${item.slug}`,
  };
  return <><SiteHeader /><main id="main-content" className="detail-page"><article><p className="eyebrow">{item.content_categories?.name ?? item.article_type ?? "NEWS"}</p><h1>{item.title}</h1>{item.cover_url && <Image className="detail-cover" src={item.cover_url} alt={item.title} width={1600} height={900} sizes="(max-width: 780px) 100vw, 820px" />}<p className="detail-intro">{item.excerpt}</p><div className="detail-content">{item.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{item.attachment_url && <a className="text-link" href={item.attachment_url} target="_blank" rel="noreferrer">Download attachment</a>}<Link className="button" href="/request-a-quote">Share Your Brief</Link></article></main><SiteFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} /></>;
}
