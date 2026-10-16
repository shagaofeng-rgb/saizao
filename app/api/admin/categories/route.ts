import { NextResponse } from "next/server";
import { canManageContent, getAdminSession } from "@/lib/admin-session";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rest, rpc } from "@/lib/supabase-server";

type Category = { id: string; content_kind: "product" | "article"; name: string; slug: string; parent_id: string | null; description: string | null; sort_order: number; is_enabled: boolean; show_in_nav: boolean; deleted_at: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const kind = (value: unknown) => value === "article" ? "article" : "product";
const fields = "id,content_kind,name,slug,parent_id,description,sort_order,is_enabled,show_in_nav,deleted_at";
async function validParent(value: unknown, contentKind: string, selfId?: string) {
  if (!value) return true;
  const id = String(value);
  if (!uuid.test(id) || id === selfId) return false;
  const parent = await rest<Category[]>(`content_categories?select=id,parent_id&id=eq.${id}&content_kind=eq.${contentKind}&parent_id=is.null&deleted_at=is.null&limit=1`);
  if (!parent.data[0]) return false;
  if (selfId) {
    const children = await rest<Category[]>(`content_categories?select=id&parent_id=eq.${selfId}&deleted_at=is.null&limit=1`);
    if (children.data.length) return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Number(query.get("page")) || 1));
  const pageSize = [10, 20, 50, 100].includes(Number(query.get("pageSize"))) ? Number(query.get("pageSize")) : 20;
  const search = (query.get("q") || "").trim().replace(/[,*()]/g, "").slice(0, 80);
  const filter = search ? `&name=ilike.*${encodeURIComponent(search)}*` : "";
  try {
    const deleted = query.get("archived") === "1" ? "not.is.null" : "is.null";
    const { data, response } = await rest<Category[]>(`content_categories?select=${fields}&content_kind=eq.${kind(query.get("kind"))}&deleted_at=${deleted}${filter}&order=sort_order.asc,name.asc&limit=${pageSize}&offset=${(page - 1) * pageSize}`, { headers: { Prefer: "count=exact" } });
    return NextResponse.json({ data, total: Number(response.headers.get("content-range")?.split("/")[1] || 0), page, pageSize });
  } catch { return NextResponse.json({ message: "分类暂时无法读取。" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权管理分类。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "分类资料无效。" }, { status: 400 });
  const name = String(body.name || "").trim().slice(0, 100);
  const slug = String(body.slug || "").trim().toLowerCase().slice(0, 120);
  if (name.length < 2 || !slugPattern.test(slug)) return NextResponse.json({ message: "请填写分类名称和有效的英文地址。" }, { status: 400 });
  try {
    if (!(await validParent(body.parent_id, kind(body.kind)))) return NextResponse.json({ message: "请选择同一类型下有效的一级分类。" }, { status: 400 });
    const payload = { content_kind: kind(body.kind), name, slug, parent_id: body.parent_id || null, description: String(body.description || "").trim().slice(0, 1000) || null, sort_order: 0, is_enabled: true, show_in_nav: true };
    const saved = await rest<Category[]>("content_categories", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "category_created", p_entity_type: "content_categories", p_entity_id: saved.data[0]?.id, p_metadata: { kind: payload.content_kind } }).catch(() => undefined);
    return NextResponse.json({ data: saved.data[0] }, { status: 201 });
  } catch { return NextResponse.json({ message: "保存失败，请检查分类地址是否重复。" }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权管理分类。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "分类资料无效。" }, { status: 400 });
  const id = String(body.id || "");
  if (!uuid.test(id)) return NextResponse.json({ message: "分类编号无效。" }, { status: 400 });
  if (body.action === "restore") {
    try {
      const restored = await rest<Category[]>(`content_categories?id=eq.${id}&deleted_at=not.is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ deleted_at: null, is_enabled: false, show_in_nav: false, updated_at: new Date().toISOString() }) });
      if (!restored.data[0]) return NextResponse.json({ message: "分类不存在或已恢复。" }, { status: 404 });
      await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "category_restored", p_entity_type: "content_categories", p_entity_id: id, p_metadata: {} }).catch(() => undefined);
      return NextResponse.json({ data: restored.data[0] });
    } catch { return NextResponse.json({ message: "分类恢复失败，请稍后重试。" }, { status: 503 }); }
  }
  const name = String(body.name || "").trim().slice(0, 100);
  const slug = String(body.slug || "").trim().toLowerCase().slice(0, 120);
  const order = Number(body.sort_order);
  if (!uuid.test(id) || name.length < 2 || !slugPattern.test(slug) || !Number.isInteger(order) || order < 0 || order > 99999) return NextResponse.json({ message: "请检查分类信息。" }, { status: 400 });
  try {
    const current = await rest<Category[]>(`content_categories?select=content_kind&id=eq.${id}&deleted_at=is.null&limit=1`);
    if (!current.data[0]) return NextResponse.json({ message: "分类不存在。" }, { status: 404 });
    if (!(await validParent(body.parent_id, current.data[0].content_kind, id))) return NextResponse.json({ message: "上级分类无效，或当前分类仍有子分类。" }, { status: 400 });
    const payload = { name, slug, parent_id: body.parent_id || null, description: String(body.description || "").trim().slice(0, 1000) || null, sort_order: order, is_enabled: Boolean(body.is_enabled), show_in_nav: Boolean(body.show_in_nav), updated_at: new Date().toISOString() };
    const saved = await rest<Category[]>(`content_categories?id=eq.${id}&deleted_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!saved.data[0]) return NextResponse.json({ message: "分类不存在。" }, { status: 404 });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "category_updated", p_entity_type: "content_categories", p_entity_id: id, p_metadata: { enabled: payload.is_enabled, inNavigation: payload.show_in_nav } }).catch(() => undefined);
    return NextResponse.json({ data: saved.data[0] });
  } catch { return NextResponse.json({ message: "保存失败，请检查分类地址是否重复。" }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权管理分类。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 3000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "分类资料无效。" }, { status: 400 });
  const id = String(body.id || "");
  if (!uuid.test(id)) return NextResponse.json({ message: "分类编号无效。" }, { status: 400 });
  try {
    const [products, articles, children] = await Promise.all([
      rest<{ id: string }[]>(`products?select=id&category_id=eq.${id}&limit=1`),
      rest<{ id: string }[]>(`articles?select=id&category_id=eq.${id}&limit=1`),
      rest<{ id: string }[]>(`content_categories?select=id&parent_id=eq.${id}&deleted_at=is.null&limit=1`),
    ]);
    if (children.data.length) return NextResponse.json({ message: "请先调整或删除该分类下的子分类。" }, { status: 409 });
    if (products.data.length || articles.data.length) return NextResponse.json({ message: "该分类仍有关联内容，请先调整内容分类。" }, { status: 409 });
    const saved = await rest<Category[]>(`content_categories?id=eq.${id}&deleted_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ deleted_at: new Date().toISOString(), is_enabled: false, show_in_nav: false }) });
    if (!saved.data[0]) return NextResponse.json({ message: "分类不存在。" }, { status: 404 });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "category_archived", p_entity_type: "content_categories", p_entity_id: id, p_metadata: {} }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: "分类暂时无法归档。" }, { status: 503 }); }
}
