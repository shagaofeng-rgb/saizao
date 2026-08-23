import type { MetadataRoute } from "next";
import { applications, siteUrl } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/about", "/capabilities", "/applications", "/quality", "/markets", "/resources", "/resources/faq", "/contact", "/request-a-quote"];
  return [...staticPages.map((path) => ({ url: `${siteUrl}${path}`, lastModified: new Date() })), ...applications.map(({ slug }) => ({ url: `${siteUrl}/applications/${slug}`, lastModified: new Date() }))];
}
