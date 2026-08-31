import type { MetadataRoute } from "next";
import { applications, siteUrl } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/about", "/capabilities", "/applications", "/quality", "/markets", "/resources", "/resources/faq", "/contact", "/request-a-quote", "/privacy"];
  return [...staticPages.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : path === "/request-a-quote" ? 0.9 : 0.7 })), ...applications.map(({ slug }) => ({ url: `${siteUrl}/applications/${slug}`, changeFrequency: "monthly" as const, priority: 0.8 }))];
}
