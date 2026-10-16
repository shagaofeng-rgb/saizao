import "server-only";
import { isSupabaseConfigured, rest } from "@/lib/supabase-server";
import { normalizeDetail, type RetailProduct, type RetailVariant } from "@/lib/retail-types";

const productSelect = "id,title,slug,subtitle,badge,summary,content,application,category_id,cover_url,hero_url,gallery,detail,attachment_url,seo_title,seo_description,status,retail_enabled,is_demo,content_categories(name,slug,is_enabled,show_in_nav,deleted_at)";

export type ProductCategory = { id: string; name: string; slug: string; parent_id: string | null; sort_order: number; is_enabled?: boolean; show_in_nav?: boolean; deleted_at?: string | null };
export type CatalogResult = { items: RetailProduct[]; total: number; page: number; unavailable: boolean };
const catalogPageSize = 12;

type ProductRow = Omit<RetailProduct, "detail" | "variants"> & { detail: unknown; gallery: unknown };

async function hydrateProduct(row: ProductRow): Promise<RetailProduct> {
  const response = await rest<RetailVariant[]>(
    `retail_variants?select=*&product_id=eq.${encodeURIComponent(row.id)}&order=sort_order.asc`,
  );
  return {
    ...row,
    detail: normalizeDetail(row.detail),
    gallery: Array.isArray(row.gallery) ? row.gallery as RetailProduct["gallery"] : [],
    variants: response.data,
  };
}

export async function getRetailProductBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !isSupabaseConfigured()) return null;
  try {
    const response = await rest<ProductRow[]>(
      `products?select=${productSelect}&slug=eq.${slug}&status=eq.published&is_demo=eq.false&limit=1`,
    );
    return response.data[0] ? hydrateProduct(response.data[0]) : null;
  } catch { return null; }
}

export async function getRetailProductForAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !isSupabaseConfigured()) return null;
  try {
    const response = await rest<ProductRow[]>(
      `products?select=${productSelect},source_provider,source_id,source_url,source_synced_at&id=eq.${id}&limit=1`,
    );
    return response.data[0] ? hydrateProduct(response.data[0]) : null;
  } catch { return null; }
}

export async function getRelatedRetailProducts(slugs: string[], excludeId: string) {
  const values = slugs.filter((slug) => /^[a-z0-9-]{1,120}$/.test(slug)).slice(0, 4);
  if (!values.length) return [] as RetailProduct[];
  try {
    const response = await rest<ProductRow[]>(
      `products?select=${productSelect}&slug=in.(${values.join(",")})&status=eq.published&is_demo=eq.false&limit=4`,
    );
    const products = await Promise.all(response.data.filter((row) => row.id !== excludeId).map(hydrateProduct));
    return products;
  } catch { return [] as RetailProduct[]; }
}

export async function getPublishedProductCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const categories: ProductCategory[] = [];
    for (let offset = 0; ; offset += 500) {
      const response = await rest<ProductCategory[]>(
        `content_categories?select=id,name,slug,parent_id,sort_order&content_kind=eq.product&is_enabled=eq.true&show_in_nav=eq.true&deleted_at=is.null&order=sort_order.asc,name.asc&limit=500&offset=${offset}`,
      );
      categories.push(...response.data);
      if (response.data.length < 500) break;
    }
    return categories.filter((category) => !category.parent_id).flatMap((parent) => [parent, ...categories.filter((category) => category.parent_id === parent.id)]);
  } catch { return []; }
}

export async function getRetailCatalogPage({ query = "", category = "", page = 1 }: { query?: string; category?: string; page?: number } = {}): Promise<CatalogResult> {
  const requestedPage = Number.isInteger(page) ? Math.min(999, Math.max(1, page)) : 1;
  if (!isSupabaseConfigured()) return { items: [], total: 0, page: requestedPage, unavailable: true };
  try {
    const categorySlug = category.trim().toLowerCase();
    let categoryFilter = "";
    if (categorySlug) {
      if (!/^[a-z0-9-]{1,120}$/.test(categorySlug)) return { items: [], total: 0, page: 1, unavailable: false };
      const found = await rest<{ id: string }[]>(`content_categories?select=id&content_kind=eq.product&slug=eq.${categorySlug}&is_enabled=eq.true&deleted_at=is.null&limit=1`);
      if (!found.data[0]) return { items: [], total: 0, page: 1, unavailable: false };
      const children = await rest<{ id: string }[]>(`content_categories?select=id&content_kind=eq.product&parent_id=eq.${found.data[0].id}&is_enabled=eq.true&deleted_at=is.null&limit=1000`);
      categoryFilter = `&category_id=in.(${[found.data[0].id, ...children.data.map((child) => child.id)].join(",")})`;
    }
    const term = query.trim().replace(/[,%()*]/g, "").slice(0, 80);
    const searchFilter = term ? `&title=ilike.*${encodeURIComponent(term)}*` : "";
    const base = `products?select=${productSelect}&status=eq.published&is_demo=eq.false${categoryFilter}${searchFilter}&order=published_at.desc,id.desc`;
    const load = (pageNumber: number) => rest<ProductRow[]>(`${base}&limit=${catalogPageSize}&offset=${(pageNumber - 1) * catalogPageSize}`, { headers: { Prefer: "count=exact" } });
    let response = await load(requestedPage);
    const count = Number(response.response.headers.get("content-range")?.split("/")[1]);
    const total = Number.isFinite(count) ? count : response.data.length;
    const actualPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / catalogPageSize)));
    if (actualPage !== requestedPage) response = await load(actualPage);
    return { items: await Promise.all(response.data.map(hydrateProduct)), total, page: actualPage, unavailable: false };
  } catch { return { items: [], total: 0, page: requestedPage, unavailable: true }; }
}

export async function getPublishedRetailProductSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const slugs: string[] = [];
    for (let offset = 0; ; offset += 500) {
      const response = await rest<{ slug: string }[]>(`products?select=slug&status=eq.published&is_demo=eq.false&order=published_at.desc&limit=500&offset=${offset}`);
      slugs.push(...response.data.map((row) => row.slug));
      if (response.data.length < 500) break;
    }
    return slugs;
  } catch { return []; }
}
