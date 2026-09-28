import "server-only";
import { isSupabaseConfigured, rest } from "@/lib/supabase-server";
import { normalizeDetail, type RetailProduct, type RetailVariant } from "@/lib/retail-types";

const productSelect = "id,title,slug,subtitle,badge,summary,content,application,cover_url,hero_url,gallery,detail,attachment_url,seo_title,seo_description,status,retail_enabled,is_demo,content_categories(name)";

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
      `products?select=${productSelect}&slug=eq.${slug}&status=eq.published&limit=1`,
    );
    return response.data[0] ? hydrateProduct(response.data[0]) : null;
  } catch { return null; }
}

export async function getRetailProductForAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !isSupabaseConfigured()) return null;
  try {
    const response = await rest<ProductRow[]>(
      `products?select=${productSelect}&id=eq.${id}&limit=1`,
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

export async function getPublishedRetailProducts() {
  if (!isSupabaseConfigured()) return [] as RetailProduct[];
  try {
    const response = await rest<ProductRow[]>(`products?select=${productSelect}&status=eq.published&is_demo=eq.false&order=published_at.desc&limit=48`);
    return await Promise.all(response.data.map(hydrateProduct));
  } catch { return [] as RetailProduct[]; }
}
