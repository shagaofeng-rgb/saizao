import { NextResponse } from "next/server";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rest, rpc } from "@/lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses = ["draft", "review", "published", "archived"];
const types = ["news", "faq", "market", "insight"];
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
function mediaUrl(value: unknown) {
  const raw = text(value, 2000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "pohsefmowgthjskmbkyg.supabase.co" && url.pathname.startsWith("/storage/v1/object/public/website-media/") ? raw : null;
  } catch { return null; }
}
type Article = { id: string; title: string; slug: string; category_id: string | null; article_type: string; excerpt: string | null; content: string | null; cover_url: string | null; attachment_url: string | null; seo_title: string | null; seo_description: string | null; status: string; updated_at: string };
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ message: "资讯编号无效。" }, { status: 400 });
  try {
    const [article, revisions] = await Promise.all([
      rest<Article[]>(`articles?select=id,title,slug,category_id,article_type,excerpt,content,cover_url,attachment_url,seo_title,seo_description,status,updated_at&id=eq.${id}&limit=1`),
      rest<{ id: string; created_at: string; actor_id: string | null }[]>(`content_revisions?select=id,created_at,actor_id&entity_type=eq.articles&entity_id=eq.${id}&order=created_at.desc&limit=10`),
    ]);
    return article.data[0] ? NextResponse.json({ data: article.data[0], revisions: revisions.data }) : NextResponse.json({ message: "资讯不存在。" }, { status: 404 });
  } catch { return NextResponse.json({ message: "暂时无法读取资讯。" }, { status: 503 }); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权编辑资讯。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 100000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ message: "资讯编号无效。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "请填写资讯内容。" }, { status: 400 });
  const title = text(body.title, 180), slug = text(body.slug, 120).toLowerCase();
  const status = statuses.includes(body.status) ? body.status : "draft";
  const categoryId = uuid.test(String(body.category_id || "")) ? String(body.category_id) : null;
  if (title.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ message: "请填写标题与有效的英文地址。" }, { status: 400 });
  try {
    const current = await rest<{ status: string }[]>(`articles?select=status&id=eq.${id}&limit=1`);
    if (!current.data[0]) return NextResponse.json({ message: "资讯不存在。" }, { status: 404 });
    if ((status === "published" || current.data[0].status === "published") && !canPublishContent(session.role)) return NextResponse.json({ message: "只有管理员可以发布或修改已发布资讯。" }, { status: 403 });
    const content = text(body.content, 30000), cover = mediaUrl(body.cover_url);
    if (status === "published") {
      if (!categoryId || !cover || !content) return NextResponse.json({ message: "发布前请补齐分类、封面和正文。" }, { status: 400 });
      const category = await rest<{ id: string }[]>(`content_categories?select=id&id=eq.${categoryId}&content_kind=eq.article&is_enabled=eq.true&deleted_at=is.null&limit=1`);
      if (!category.data[0]) return NextResponse.json({ message: "请选择已启用的资讯分类。" }, { status: 400 });
    }
    const payload = { title, slug, category_id: categoryId, article_type: types.includes(body.article_type) ? body.article_type : "news", excerpt: text(body.excerpt, 600) || null, content, cover_url: cover, attachment_url: mediaUrl(body.attachment_url), seo_title: text(body.seo_title, 180) || null, seo_description: text(body.seo_description, 320) || null, status, published_at: status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString(), updated_by: session.accountId };
    const result = await rest<Article[]>(`articles?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!result.data[0]) return NextResponse.json({ message: "保存失败。" }, { status: 400 });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "article_updated", p_entity_type: "articles", p_entity_id: id, p_metadata: { status } }).catch(() => undefined);
    return NextResponse.json({ data: result.data[0] });
  } catch { return NextResponse.json({ message: "保存失败，请检查英文地址是否重复。" }, { status: 400 }); }
}
