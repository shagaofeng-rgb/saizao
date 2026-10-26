import { NextResponse } from "next/server";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

type Kind = "products" | "articles";
function slug(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120); }
function mediaUrl(value: unknown) { const raw = String(value ?? "").trim().slice(0,2000); if (!raw) return null; try { const url = new URL(raw); return url.protocol === "https:" && url.hostname === "pohsefmowgthjskmbkyg.supabase.co" && url.pathname.startsWith("/storage/v1/object/public/website-media/") ? raw : null; } catch { return null; } }
async function tableFrom(params: Promise<{kind:string}>) { const kind=(await params).kind; return (kind==="products"||kind==="articles") ? kind as Kind : null; }
async function categoryId(value: unknown, contentKind: "product"|"article") {
  const id = String(value || "");
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const found = await rest<{id:string}[]>(`content_categories?select=id&id=eq.${id}&content_kind=eq.${contentKind}&is_enabled=eq.true&deleted_at=is.null&limit=1`);
  return found.data[0]?.id ?? null;
}
export async function GET(request:Request,{params}:{params:Promise<{kind:string}>}) {
  const session=await getAdminSession(); const table=await tableFrom(params);
  if(!session||!table) return NextResponse.json({message:"Unauthorized"},{status:401});
  const search=new URL(request.url).searchParams, page=Math.max(1,Number(search.get("page")??1)), pageSize=Math.min(100,Math.max(10,Number(search.get("pageSize")??25)));
  const term=search.get("q")?.trim(), status=search.get("status")?.trim(), from=search.get("from")?.trim(), to=search.get("to")?.trim();
  const validDate=(value:string|undefined)=>Boolean(value&&Number.isFinite(Date.parse(value)));
  const filters=[
    status&&["draft","review","published","archived"].includes(status)?"status=eq."+status:table==="products"?"status=neq.archived":null,
    term?"title=ilike.*"+encodeURIComponent(term.replace(/[,*()]/g,""))+"*":null,
    validDate(from)?"updated_at=gte."+encodeURIComponent(new Date(from as string).toISOString()):null,
    validDate(to)?"updated_at=lte."+encodeURIComponent(new Date(to as string).toISOString()):null
  ].filter(Boolean).join("&");
  const fields=table==="products"?"id,title,slug,status,is_demo,updated_at,published_at,cover_url,summary,application,content_categories(name)":"id,title,slug,status,updated_at,published_at,cover_url,excerpt,article_type,content_categories(name)";
  const response=await rest<Record<string,unknown>[]>(`${table}?select=${fields}&order=updated_at.desc&limit=${pageSize}&offset=${(page-1)*pageSize}${filters?`&${filters}`:""}`,{headers:{Prefer:"count=exact"}}).catch(()=>null);
  if(!response) return NextResponse.json({message:"无法读取内容。"},{status:503});
  const range=response.response.headers.get("content-range")??"0-0/0", total=Number(range.split("/")[1]??0);
  return NextResponse.json({data:response.data,total,page,pageSize});
}
export async function DELETE(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getAdminSession(); const table = await tableFrom(params);
  if (!session || !table || !canManageContent(session.role)) return NextResponse.json({ message: "无权删除内容。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 3000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.id || ""))) return NextResponse.json({ message: "内容编号无效。" }, { status: 400 });
  try {
    const current = await rest<{ id: string; status: string }[]>(`${table}?select=id,status&id=eq.${body.id}&limit=1`);
    if (!current.data[0]) return NextResponse.json({ message: "内容不存在。" }, { status: 404 });
    if (current.data[0].status === "published" && !canPublishContent(session.role)) return NextResponse.json({ message: "只有管理员可以删除已发布内容。" }, { status: 403 });
    const payload = { status: "archived", published_at: null, updated_at: new Date().toISOString(), updated_by: session.accountId, ...(table === "products" ? { retail_enabled: false } : {}) };
    const saved = await rest<{ id: string }[]>(`${table}?id=eq.${body.id}&status=eq.${current.data[0].status}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!saved.data[0]) return NextResponse.json({ message: "内容已被修改，请刷新后重试。" }, { status: 409 });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "content_archived", p_entity_type: table, p_entity_id: body.id, p_metadata: { previousStatus: current.data[0].status } }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: "删除失败，请稍后重试。" }, { status: 503 }); }
}
export async function POST(request:Request,{params}:{params:Promise<{kind:string}>}) {
  const session=await getAdminSession(); const table=await tableFrom(params);
  if(!session||!table||!canManageContent(session.role)) return NextResponse.json({message:"Unauthorized"},{status:401});
  if(!isSameOrigin(request)||requestBodyTooLarge(request,250000)) return NextResponse.json({message:"请求校验失败。"},{status:400});
  const parsed=await request.json().catch(()=>null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ message: "请填写有效的内容资料。" }, { status: 400 });
  const body=parsed, title=String(body.title??"").trim().slice(0,180), entrySlug=slug(body.slug||title);
  if(title.length<2||!entrySlug) return NextResponse.json({message:"请填写标题与有效链接标识。"},{status:400});
  const status=["draft","review","published","archived"].includes(body.status)?body.status:"draft";
  if (status === "published" && (!canPublishContent(session.role) || table === "products")) return NextResponse.json({ message: table === "products" ? "请先保存商品，再到详情编辑页完成资料和发布检查。" : "只有管理员可以发布内容。" }, { status: 403 });
  const category_id=await categoryId(body.categoryId,table==="products"?"product":"article").catch(() => undefined);
  if (category_id === undefined) return NextResponse.json({ message: "分类暂时无法读取，请重试。" }, { status: 503 });
  if (body.categoryId && !category_id) return NextResponse.json({ message: "请选择已启用的分类。" }, { status: 400 });
  const cover_url=mediaUrl(body.coverUrl), attachment_url=mediaUrl(body.attachmentUrl), hero_url=mediaUrl(body.heroUrl);
  const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0,12).map((value: unknown) => { const image = value && typeof value === "object" ? value as Record<string,unknown> : {}; return { url: mediaUrl(image.url), alt: String(image.alt ?? title).trim().slice(0,180) }; }) : [];
  if ((body.coverUrl && !cover_url) || (body.attachmentUrl && !attachment_url) || (table === "products" && ((body.heroUrl && !hero_url) || (body.gallery !== undefined && !Array.isArray(body.gallery)) || (Array.isArray(body.gallery) && body.gallery.length > 12) || gallery.some((image: { url: string | null }) => !image.url)))) return NextResponse.json({ message: "请检查图片与附件链接，图集最多 12 张。" }, { status: 400 });
  const common={title,slug:entrySlug,category_id,content:String(body.content??"").slice(0,30000),cover_url,attachment_url,seo_title:String(body.seoTitle??"").slice(0,180)||null,seo_description:String(body.seoDescription??"").slice(0,320)||null,status,published_at:status==="published"?new Date().toISOString():null,created_by:session.accountId,updated_by:session.accountId};
  const payload=table==="products"?{...common,hero_url,gallery,retail_enabled:false,summary:String(body.summary??"").slice(0,600)||null,application:String(body.application??"").slice(0,160)||null}:{...common,excerpt:String(body.summary??"").slice(0,600)||null,article_type:["news","faq","market","insight"].includes(body.articleType)?body.articleType:"news",cover_alt:String(body.coverAlt??"").trim().slice(0,180)||null,focus_keywords:String(body.focusKeywords??"").trim().slice(0,500)||null};
  if (status === "published" && (!payload.content.trim() || !payload.cover_url || !category_id)) return NextResponse.json({ message: "发布前请补齐正文、封面和分类。" }, { status: 400 });
  const saved=await rest<Record<string,unknown>[]>(table,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)}).catch(()=>null);
  if(!saved?.data[0]?.id) return NextResponse.json({message:"保存失败，链接标识可能已存在。"},{status:400});
  await rpc("admin_log_audit",{p_actor_id:session.accountId,p_action:"content_created",p_entity_type:table,p_entity_id:String(saved.data[0]?.id??""),p_metadata:{status}}).catch(()=>undefined);
  return NextResponse.json({ok:true,data:saved.data[0]});
}
export async function PATCH(request:Request,{params}:{params:Promise<{kind:string}>}) {
  const session=await getAdminSession(); const table=await tableFrom(params);
  if(!session||!table||!canManageContent(session.role)) return NextResponse.json({message:"Unauthorized"},{status:401});
  if(!isSameOrigin(request)||requestBodyTooLarge(request,250000)) return NextResponse.json({message:"请求校验失败。"},{status:400});
  const body=await request.json().catch(()=>({})); if(typeof body.id!=="string") return NextResponse.json({message:"缺少内容编号。"},{status:400});
  const status=["draft","review","published","archived"].includes(body.status)?body.status:null;
  if(!status) return NextResponse.json({message:"无效状态。"},{status:400});
  if (table === "products" && status === "published") return NextResponse.json({ message: "请进入产品详情完成发布检查。" }, { status: 400 });
  const current = await rest<{status:string;is_demo?:boolean;cover_url?:string|null;category_id?:string|null;content?:string}[]>(`${table}?select=status${table === "products" ? ",is_demo" : ""},cover_url,category_id,content&id=eq.${encodeURIComponent(body.id)}&limit=1`).catch(() => null);
  if (!current?.data[0]) return NextResponse.json({ message: "内容不存在。" }, { status: 404 });
  if ((status === "published" || current.data[0].status === "published") && !canPublishContent(session.role)) return NextResponse.json({ message: "只有管理员可以发布或下架内容。" }, { status: 403 });
  if (status === "published" && current.data[0].is_demo) return NextResponse.json({ message: "设计示例不能直接发布，请新建真实商品。" }, { status: 400 });
  if (status === "published" && (!current.data[0].cover_url || !current.data[0].category_id || !current.data[0].content?.trim())) return NextResponse.json({ message: "发布前请补齐正文、封面和分类。" }, { status: 400 });
  const saved=await rest<Record<string,unknown>[]>(`${table}?id=eq.${encodeURIComponent(body.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status,published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString(),updated_by:session.accountId})}).catch(()=>null);
  if(!saved?.data[0]) return NextResponse.json({message:"更新失败。"},{status:400});
  await rpc("admin_log_audit",{p_actor_id:session.accountId,p_action:"content_status_changed",p_entity_type:table,p_entity_id:body.id,p_metadata:{status}}).catch(()=>undefined);
  return NextResponse.json({ok:true,data:saved.data[0]});
}
