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
  return <>
    <SiteHeader />
    <main id="main-content" className="news-index-page">
      <header className="news-index-header">
        <h1>News from Sai Zhao</h1>
        <p>Exhibitions, company updates and notes from our fragrance team.</p>
      </header>
      <section className="news-index-list" aria-label="Published news">
        {items.length ? items.map((item) => <article className="news-index-card" key={item.id}>
          {item.cover_url && <Link className="news-index-image" href={`/news/${item.slug}`} aria-label={`Read ${item.title}`}><Image src={item.cover_url} alt={item.cover_alt || item.title} width={1200} height={900} sizes="(max-width: 780px) 100vw, 50vw" /></Link>}
          <div className="news-index-copy">
            <p className="news-index-category">{item.content_categories?.name ?? item.article_type ?? "News"}</p>
            <h2><Link href={`/news/${item.slug}`}>{item.title}</Link></h2>
            {item.excerpt && <p className="news-index-summary">{item.excerpt}</p>}
            <Link className="news-index-read" href={`/news/${item.slug}`}>Read article</Link>
          </div>
        </article>) : <p className="news-index-empty">No news has been published yet.</p>}
      </section>
    </main>
    <SiteFooter />
  </>;
}
