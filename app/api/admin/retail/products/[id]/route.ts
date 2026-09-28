import { NextResponse } from "next/server";
import { canManageContent, getAdminSession } from "@/lib/admin-session";
import { getRetailProductForAdmin } from "@/lib/retail-data";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { normalizeDetail } from "@/lib/retail-types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const safeUrl = (value: unknown) => {
  const url = text(value, 2000);
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try { const parsed = new URL(url); return parsed.protocol === "https:" && parsed.hostname === "pohsefmowgthjskmbkyg.supabase.co" && parsed.pathname.startsWith("/storage/v1/object/public/website-media/") ? url : ""; }
  catch { return ""; }
};
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); const { id } = await params;
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!uuid.test(id)) return NextResponse.json({ message: "Invalid product" }, { status: 400 });
  const product = await getRetailProductForAdmin(id);
  return product ? NextResponse.json({ data: product }) : NextResponse.json({ message: "Not found" }, { status: 404 });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); const { id } = await params;
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!uuid.test(id) || !isSameOrigin(request) || requestBodyTooLarge(request, 200000)) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  const existing = await getRetailProductForAdmin(id);
  if (!existing) return NextResponse.json({ message: "Product not found" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  const title = text(body.title, 180), slug = text(body.slug, 120).toLowerCase();
  if (title.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ message: "Title or slug is invalid" }, { status: 400 });
  const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0, 12).map((image: { url?: unknown; alt?: unknown }) => ({ url: safeUrl(image?.url), alt: text(image?.alt, 180) })).filter((image: { url: string }) => image.url) : [];
  const detail = normalizeDetail(body.detail);
  detail.heroLine = text(detail.heroLine, 200); detail.heroDescription = text(detail.heroDescription, 500); detail.defaultVariantSku = text(detail.defaultVariantSku, 80).toUpperCase();
  detail.overview = text(detail.overview, 10000); detail.packagingIntro = text(detail.packagingIntro, 1000);
  detail.packagingImage = safeUrl(detail.packagingImage);
  detail.topNotes = text(detail.topNotes, 400); detail.heartNotes = text(detail.heartNotes, 400); detail.baseNotes = text(detail.baseNotes, 400);
  detail.technical = detail.technical.slice(0, 30).map((row) => ({ label: text(row.label, 100), value: text(row.value, 500) })).filter((row) => row.label && row.value);
  detail.dosage = detail.dosage.slice(0, 20).map((row) => ({ label: text(row.label, 100), value: text(row.value, 300) })).filter((row) => row.label && row.value);
  detail.applications = detail.applications.slice(0, 12).map((item) => ({ title: text(item.title, 100), description: text(item.description, 300), image: safeUrl(item.image), alt: text(item.alt, 180) })).filter((item) => item.title && item.image);
  detail.storage = detail.storage.slice(0, 20).map((item) => text(item, 300)).filter(Boolean);
  detail.shipping = detail.shipping.slice(0, 20).map((item) => text(item, 300)).filter(Boolean);
  detail.retailBenefits = detail.retailBenefits.slice(0, 12).map((item) => text(item, 200)).filter(Boolean);
  detail.customBenefits = detail.customBenefits.slice(0, 12).map((item) => text(item, 200)).filter(Boolean);
  detail.downloads = detail.downloads.slice(0, 20).map((item) => ({ title: text(item.title, 160), url: safeUrl(item.url), note: text(item.note, 200) })).filter((item) => item.title && item.url);
  detail.faqs = detail.faqs.slice(0, 30).map((item) => ({ question: text(item.question, 300), answer: text(item.answer, 2000) })).filter((item) => item.question && item.answer);
  detail.relatedSlugs = detail.relatedSlugs.slice(0, 8).map((item) => text(item, 120)).filter((item) => /^[a-z0-9-]+$/.test(item));
  const variants = Array.isArray(body.variants) ? body.variants.slice(0, 30) as Record<string, unknown>[] : [];
  const cleaned = variants.map((v, sort_order) => ({ id: uuid.test(String(v.id ?? "")) ? String(v.id) : undefined, product_id: id, sku: text(v.sku, 80).toUpperCase(), label: text(v.label, 60), price_minor: Number(v.price_minor), compare_at_minor: v.compare_at_minor ? Number(v.compare_at_minor) : null, currency: "USD", stock_quantity: Number(v.stock_quantity), weight_grams: Number(v.weight_grams) || 0, image_url: safeUrl(v.image_url) || null, is_active: Boolean(v.is_active), sort_order }));
  if (cleaned.some((v) => !v.sku || !v.label || !Number.isInteger(v.price_minor) || v.price_minor < 0 || !Number.isInteger(v.stock_quantity) || v.stock_quantity < 0 || !Number.isInteger(v.weight_grams) || v.weight_grams < 0)) return NextResponse.json({ message: "Check variant prices, stock and SKU" }, { status: 400 });
  const demo = existing.is_demo || Boolean(body.is_demo);
  if (body.status === "published" && demo) return NextResponse.json({ message: "Demo products cannot be published. Create a real product with verified information." }, { status: 400 });
  const status = ["draft", "review", "published", "archived"].includes(body.status) ? body.status : existing.status;
  const payload = { title, slug, subtitle: text(body.subtitle, 240) || null, badge: text(body.badge, 80) || null, summary: text(body.summary, 600) || null, content: text(body.content, 30000), cover_url: safeUrl(body.cover_url) || null, hero_url: safeUrl(body.hero_url) || null, gallery, detail, retail_enabled: Boolean(body.retail_enabled), seo_title: text(body.seo_title, 180) || null, seo_description: text(body.seo_description, 320) || null, status, published_at: status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString(), updated_by: session.accountId };
  try {
    const saved = await rest<Record<string, unknown>[]>(`products?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    for (const variant of cleaned) {
      if (variant.id) await rest(`retail_variants?id=eq.${variant.id}&product_id=eq.${id}`, { method: "PATCH", body: JSON.stringify(variant) });
      else await rest("retail_variants", { method: "POST", body: JSON.stringify(variant) });
    }
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "retail_product_updated", p_entity_type: "products", p_entity_id: id, p_metadata: { status, variantCount: cleaned.length } }).catch(() => undefined);
    return NextResponse.json({ ok: true, data: saved.data[0] });
  } catch { return NextResponse.json({ message: "Save failed. Check SKU uniqueness and stock reservations." }, { status: 400 }); }
}
