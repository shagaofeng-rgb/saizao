import type { MetadataRoute } from "next";
import { getPublishedRetailProductEntries } from "@/lib/retail-data";
import { publishedArticleSlugs } from "@/lib/published-content";
import { applications, siteUrl } from "@/lib/site-data";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "/about", "/capabilities", "/products", "/applications", "/quality", "/markets", "/resources", "/resources/faq", "/contact", "/request-a-quote", "/privacy"];
  const [products, articles] = await Promise.all([getPublishedRetailProductEntries(), publishedArticleSlugs()]);
  return [
    ...staticPages.map((path) => ({ url: `${siteUrl}${path}` })),
    ...applications.map(({ slug }) => ({ url: `${siteUrl}/applications/${slug}` })),
    ...products.map(({ slug, published_at, updated_at }) => ({
      url: `${siteUrl}/products/${slug}`,
      lastModified: updated_at || published_at || undefined,
    })),
    ...(articles.length ? [{ url: `${siteUrl}/news` }] : []),
    ...articles.map(({ slug, published_at, updated_at }) => ({
      url: `${siteUrl}/news/${slug}`,
      lastModified: updated_at || published_at || undefined,
    })),
  ];
}
