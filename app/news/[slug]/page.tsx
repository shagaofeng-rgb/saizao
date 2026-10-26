import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArticleBody } from "@/components/ArticleBody";
import { publishedArticle } from "@/lib/published-content";
import { company, siteUrl } from "@/lib/site-data";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await publishedArticle((await params).slug);
  return item ? {
    title: { absolute: item.seo_title || item.title },
    description: item.seo_description || item.excerpt || undefined,
    keywords: item.focus_keywords?.split(",").map((value) => value.trim()).filter(Boolean),
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: { type: "article", title: item.seo_title || item.title, description: item.seo_description || item.excerpt || undefined, url: `${siteUrl}/news/${item.slug}`, images: item.cover_url ? [{ url: item.cover_url, alt: item.cover_alt || item.title }] : undefined },
  } : {};
}

export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  const item = await publishedArticle((await params).slug);
  if (!item) notFound();
  const articleSchema = {
    "@context": "https://schema.org", "@type": item.article_type === "news" ? "NewsArticle" : "Article", headline: item.title,
    description: item.excerpt || undefined, image: item.cover_url || undefined,
    keywords: item.focus_keywords || undefined,
    datePublished: item.published_at || undefined,
    author: { "@type": "Organization", name: company.brandName },
    publisher: { "@type": "Organization", name: company.legalName },
    mainEntityOfPage: `${siteUrl}/news/${item.slug}`,
  };
  const publishedDate = item.published_at ? new Date(item.published_at) : null;
  return <><SiteHeader /><main id="main-content" className="detail-page"><article><p className="eyebrow">{item.content_categories?.name ?? item.article_type ?? "NEWS"}</p><h1>{item.title}</h1>{publishedDate && <time className="detail-date" dateTime={publishedDate.toISOString()}>{new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric" }).format(publishedDate)}</time>}{item.cover_url && <Image className="detail-cover" src={item.cover_url} alt={item.cover_alt || item.title} width={1600} height={900} sizes="(max-width: 780px) 100vw, 820px" priority />}<p className="detail-intro">{item.excerpt}</p><ArticleBody content={item.content} />{item.attachment_url && <a className="text-link" href={item.attachment_url} target="_blank" rel="noreferrer">Download attachment</a>}<Link className="button" href="/request-a-quote">Share Your Brief</Link></article></main><SiteFooter /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} /></>;
}
