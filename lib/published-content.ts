import "server-only";
import { isSupabaseConfigured, rest } from "@/lib/supabase-server";

export type PublishedItem = {
  id:string; title:string; slug:string; summary?:string; excerpt?:string; content:string;
  cover_url?:string; attachment_url?:string; application?:string; article_type?:string;
  published_at?:string; seo_title?:string; seo_description?:string;
  content_categories?:{name:string}|null;
};

const productFields="id,title,slug,summary,content,cover_url,attachment_url,application,published_at,seo_title,seo_description,content_categories(name)";
const articleFields="id,title,slug,excerpt,content,cover_url,attachment_url,article_type,published_at,seo_title,seo_description,content_categories(name)";

async function list(table:"products"|"articles") {
  if (!isSupabaseConfigured()) return [] as PublishedItem[];
  const fields=table==="products"?productFields:articleFields;
  try {
    return (await rest<PublishedItem[]>(`${table}?select=${fields}&status=eq.published&order=published_at.desc`)).data;
  } catch { return [] as PublishedItem[]; }
}
export const publishedProducts=()=>list("products");
export const publishedArticles=()=>list("articles");

async function one(table:"products"|"articles", slug:string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)||!isSupabaseConfigured()) return null;
  const fields=table==="products"?productFields:articleFields;
  try {
    return (await rest<PublishedItem[]>(`${table}?select=${fields}&status=eq.published&slug=eq.${slug}&limit=1`)).data[0]??null;
  } catch { return null; }
}
export const publishedProduct=(slug:string)=>one("products",slug);
export const publishedArticle=(slug:string)=>one("articles",slug);
