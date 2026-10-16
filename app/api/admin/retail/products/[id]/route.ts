import { NextResponse } from "next/server";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
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
  if (!product) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const revisions = await rest<{ id: string; created_at: string }[]>(`content_revisions?select=id,created_at&entity_type=eq.products&entity_id=eq.${id}&order=created_at.desc&limit=10`).catch(() => ({ data: [] as { id: string; created_at: string }[] }));
  return NextResponse.json({ data: product, revisions: revisions.data });
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
  detail.technical = detail.technical.slice(0, 100).map((row) => ({ label: text(row.label, 100), value: text(row.value, 1000) })).filter((row) => row.label && row.value);
  detail.descriptionImages = detail.descriptionImages.slice(0, 60).map((image) => ({ url: safeUrl(image.url), alt: text(image.alt, 180), ...(Number.isInteger(image.width) && Number(image.width) > 0 && Number(image.width) <= 30000 ? { width: image.width } : {}), ...(Number.isInteger(image.height) && Number(image.height) > 0 && Number(image.height) <= 30000 ? { height: image.height } : {}) })).filter((image) => image.url);
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
  const status = ["draft", "review", "published", "archived"].includes(body.status) ? body.status : existing.status;
  if ((status === "published" || existing.status === "published") && !canPublishContent(session.role)) return NextResponse.json({ message: "只有管理员可以发布或修改已发布商品。" }, { status: 403 });
  if (status === "published" && demo) return NextResponse.json({ message: "设计示例不能发布，请新建真实商品。" }, { status: 400 });
  const category_id = uuid.test(String(body.category_id || "")) ? String(body.category_id) : null;
  const cover_url = safeUrl(body.cover_url) || null;
  const content = text(body.content, 30000);
  const summary = text(body.summary, 600) || null;
  if (status === "published") {
    if (!category_id || !cover_url || !summary || !content) return NextResponse.json({ message: "发布前请补齐分类、主图、简介和正文。" }, { status: 400 });
    const category = await rest<{ id: string }[]>(`content_categories?select=id&id=eq.${category_id}&content_kind=eq.product&is_enabled=eq.true&deleted_at=is.null&limit=1`).catch(() => null);
    if (!category?.data[0]) return NextResponse.json({ message: "请选择已启用的产品分类。" }, { status: 400 });
    if (Boolean(body.retail_enabled) && !cleaned.some((variant) => variant.is_active && variant.price_minor > 0)) return NextResponse.json({ message: "开启零售前请配置至少一个有售价的上架规格。" }, { status: 400 });
  }
  const payload = { title, slug, category_id, subtitle: text(body.subtitle, 240) || null, badge: text(body.badge, 80) || null, summary, content, cover_url, hero_url: safeUrl(body.hero_url) || null, gallery, detail, retail_enabled: Boolean(body.retail_enabled), seo_title: text(body.seo_title, 180) || null, seo_description: text(body.seo_description, 320) || null, status, updated_by: session.accountId };
  try {
    const saved = await rpc<Record<string, unknown>>("admin_save_retail_product", { p_product_id: id, p_payload: payload, p_variants: cleaned });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "retail_product_updated", p_entity_type: "products", p_entity_id: id, p_metadata: { status, variantCount: cleaned.length } }).catch(() => undefined);
    return NextResponse.json({ ok: true, data: saved });
  } catch { return NextResponse.json({ message: "保存失败，请检查 SKU 是否重复，以及库存是否低于已预留数量。" }, { status: 400 }); }
}
