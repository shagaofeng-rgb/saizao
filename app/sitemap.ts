import type { MetadataRoute } from "next";
import { getPublishedRetailProductSlugs } from "@/lib/retail-data";
import { publishedArticleSlugs } from "@/lib/published-content";
import { applications, siteUrl } from "@/lib/site-data";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "/about", "/capabilities", "/products", "/applications", "/quality", "/markets", "/resources", "/resources/faq", "/contact", "/request-a-quote", "/privacy"];
  const [productSlugs, articles] = await Promise.all([getPublishedRetailProductSlugs(), publishedArticleSlugs()]);
  return [...staticPages.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : path === "/request-a-quote" ? 0.9 : 0.7 })), ...applications.map(({ slug }) => ({ url: `${siteUrl}/applications/${slug}`, changeFrequency: "monthly" as const, priority: 0.8 })), ...productSlugs.map((slug) => ({ url: `${siteUrl}/products/${slug}`, changeFrequency: "weekly" as const, priority: 0.75 })), ...(articles.length ? [{ url: `${siteUrl}/news`, changeFrequency: "weekly" as const, priority: 0.6 }] : []), ...articles.map(({ slug, published_at }) => ({ url: `${siteUrl}/news/${slug}`, lastModified: published_at || undefined, changeFrequency: "monthly" as const, priority: 0.65 }))];
}
