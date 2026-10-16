import { NextResponse } from "next/server";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { normalizeDetail, type ProductImage } from "@/lib/retail-types";
import { catalogImageKey, copyCatalogImage, validCatalogImage } from "@/lib/catalog-media";
import { rest, rpc } from "@/lib/supabase-server";

export const maxDuration = 60;
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const sourceId = (value: unknown) => /^\d{6,20}$/.test(String(value));
const sourceUrl = (value: unknown, id: string, category = false) => {
  try { const url = new URL(String(value)); return url.protocol === "https:" && !url.port && !url.username && !url.password && (category ? url.hostname === "zjszsj.en.alibaba.com" && url.pathname.startsWith(`/productgrouplist-${id}/`) : url.hostname === "www.alibaba.com" && url.pathname.startsWith("/product-detail/") && url.pathname.endsWith(`_${id}.html`)); } catch { return false; }
};
type SourceCategory = { id: string; name: string; url: string; parentId: string };

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权导入产品。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 250000)) return NextResponse.json({ message: "请求校验失败或资料过大。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "导入资料无效。" }, { status: 400 });
  try {
    if (body.mode === "categories") {
      const categories = body.categories as SourceCategory[];
      if (!Array.isArray(categories) || !categories.length || categories.length > 100 || new Set(categories.map((category) => category?.id)).size !== categories.length || categories.some((category) => !category || !sourceId(category.id) || !category.name || !sourceUrl(category.url, category.id, true))) return NextResponse.json({ message: "分类来源资料无效。" }, { status: 400 });
      const savedIds = new Map<string, string>();
      for (const category of [...categories].sort((a, b) => Number(a.parentId !== "products") - Number(b.parentId !== "products"))) {
        const existing = await rest<{ id: string; deleted_at: string | null }[]>(`content_categories?select=id,deleted_at&source_provider=eq.alibaba&source_id=eq.${category.id}&limit=1`);
        if (existing.data[0]) {
          if (existing.data[0].deleted_at) return NextResponse.json({ message: "来源分类已被运营删除，不会自动重建。" }, { status: 409 });
          savedIds.set(category.id, existing.data[0].id); continue;
        }
        const parent_id = category.parentId === "products" ? null : savedIds.get(category.parentId);
        if (category.parentId !== "products" && !parent_id) return NextResponse.json({ message: "分类上下级资料不完整。" }, { status: 400 });
        const slug = text(category.name, 100).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!slug) return NextResponse.json({ message: "分类英文地址无效。" }, { status: 400 });
        const saved = await rest<{ id: string }[]>("content_categories", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ content_kind: "product", name: text(category.name, 100), slug, parent_id, sort_order: categories.findIndex((item) => item.id === category.id) * 10, is_enabled: true, show_in_nav: true, source_provider: "alibaba", source_id: category.id, source_url: category.url }) });
        savedIds.set(category.id, saved.data[0].id);
        await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "category_imported", p_entity_type: "content_categories", p_entity_id: saved.data[0].id, p_metadata: { sourceId: category.id } });
      }
      return NextResponse.json({ ok: true, categories: savedIds.size });
    }
    const item = body.product;
    if (!item || typeof item !== "object" || !sourceId(item.sourceId) || !sourceId(item.categorySourceId) || !sourceUrl(item.sourceUrl, String(item.sourceId)) || !item.sourceSnapshot || item.sourceSnapshot.id !== item.sourceId || !Array.isArray(item.sourceSnapshot.attributes) || !item.sourceSnapshot.attributes.length) return NextResponse.json({ message: "产品来源或核对记录无效。" }, { status: 400 });
    if (body.publish && !canPublishContent(session.role)) return NextResponse.json({ message: "只有管理员可以发布导入产品。" }, { status: 403 });
    const capturedAt = new Date(item.capturedAt);
    if (!Number.isFinite(capturedAt.getTime())) return NextResponse.json({ message: "采集时间无效。" }, { status: 400 });
    const existing = await rest<{ id: string; status: string }[]>(`products?select=id,status&source_provider=eq.alibaba&source_id=eq.${item.sourceId}&limit=1`);
    if (existing.data[0]) return NextResponse.json({ ok: true, skipped: true, data: existing.data[0] });
    const data = item.data;
    if (!data || typeof data !== "object") return NextResponse.json({ message: "产品资料无效。" }, { status: 400 });
    const title = text(data.title, 180), slug = text(data.slug, 120), summary = text(data.summary, 600), content = text(data.content, 30000);
    const detail = normalizeDetail(data.detail);
    if (title.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !summary || !content || !Array.isArray(data.gallery) || !data.gallery.length || data.gallery.length > 12 || detail.descriptionImages.length > 60 || ![...data.gallery, ...detail.descriptionImages].every(validCatalogImage)) return NextResponse.json({ message: "请检查标题、正文、参数和图片资料。" }, { status: 400 });
    const category = await rest<{ id: string }[]>(`content_categories?select=id&content_kind=eq.product&source_provider=eq.alibaba&source_id=eq.${item.categorySourceId}&is_enabled=eq.true&deleted_at=is.null&limit=1`);
    if (!category.data[0]) return NextResponse.json({ message: "产品分类不存在或已停用。" }, { status: 400 });
    detail.technical = detail.technical.slice(0, 100).map((row) => ({ label: text(row?.label, 100), value: text(row?.value, 1000) })).filter((row) => row.label && row.value);
    detail.overview = text(detail.overview, 10000); detail.heroLine = ""; detail.heroDescription = ""; detail.defaultVariantSku = "";
    detail.topNotes = text(detail.topNotes, 400); detail.heartNotes = text(detail.heartNotes, 400); detail.baseNotes = text(detail.baseNotes, 400);
    detail.storage = detail.storage.slice(0, 20).map((value) => text(value, 300)); detail.shipping = detail.shipping.slice(0, 20).map((value) => text(value, 300));
    detail.packagingIntro = text(detail.packagingIntro, 1000); detail.packagingImage = ""; detail.applications = []; detail.downloads = []; detail.relatedSlugs = []; detail.dosage = []; detail.retailBenefits = []; detail.customBenefits = [];
    detail.faqs = detail.faqs.slice(0, 30).map((faq) => ({ question: text(faq?.question, 300), answer: text(faq?.answer, 2000) })).filter((faq) => faq.question && faq.answer);
    const cache = new Map<string, Promise<ProductImage>>();
    const copy = (image: ProductImage, alt: string) => { const key = catalogImageKey(image.url); if (!cache.has(key)) cache.set(key, copyCatalogImage(image, session.accountId, alt)); return cache.get(key)!.then((saved) => ({ ...saved, alt: text(image.alt || alt, 180) })); };
    const all = [...data.gallery, ...detail.descriptionImages] as ProductImage[];
    const copied: ProductImage[] = [];
    for (let offset = 0; offset < all.length; offset += 3) copied.push(...await Promise.all(all.slice(offset, offset + 3).map((image, index) => copy(image, `${title} — product information ${offset + index + 1}`))));
    const gallery = copied.slice(0, data.gallery.length);
    detail.descriptionImages = copied.slice(data.gallery.length);
    const saved = await rest<{ id: string }[]>("products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title, slug, summary, content, application: text(data.application, 160) || null, category_id: category.data[0].id, cover_url: gallery[0].url, hero_url: gallery[0].url, gallery, detail, retail_enabled: false, is_demo: false, status: body.publish ? "published" : "draft", published_at: body.publish ? new Date().toISOString() : null, created_by: session.accountId, updated_by: session.accountId, source_provider: "alibaba", source_id: item.sourceId, source_url: item.sourceUrl, source_synced_at: capturedAt.toISOString(), source_snapshot: item.sourceSnapshot }) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "catalog_imported", p_entity_type: "products", p_entity_id: saved.data[0].id, p_metadata: { sourceId: item.sourceId, status: body.publish ? "published" : "draft" } });
    return NextResponse.json({ ok: true, skipped: false, data: saved.data[0] });
  } catch (error) {
    console.error("catalog_import_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "本条导入未完成，已完成记录不会重复创建。请重试或核对来源图片。" }, { status: 503 });
  }
}
