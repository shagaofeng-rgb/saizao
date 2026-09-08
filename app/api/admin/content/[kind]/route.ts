import { NextResponse } from "next/server";
import { canManageContent, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

type Kind = "products" | "articles";
function slug(value: unknown) { return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120); }
async function tableFrom(params: Promise<{kind:string}>) { const kind=(await params).kind; return (kind==="products"||kind==="articles") ? kind as Kind : null; }
async function categoryId(name: unknown, contentKind: "product"|"article") {
  const label=String(name??"").trim().slice(0,100); if(!label) return null;
  const key=slug(label); if(!key) return null;
  const found=await rest<{id:string}[]>(`content_categories?select=id&content_kind=eq.${contentKind}&slug=eq.${key}&limit=1`);
  if(found.data[0]) return found.data[0].id;
  const created=await rest<{id:string}[]>(`content_categories?on_conflict=content_kind,slug`,{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({content_kind:contentKind,name:label,slug:key})});
  return created.data[0]?.id ?? null;
}
export async function GET(request:Request,{params}:{params:Promise<{kind:string}>}) {
  const session=await getAdminSession(); const table=await tableFrom(params);
  if(!session||!table) return NextResponse.json({message:"Unauthorized"},{status:401});
  const search=new URL(request.url).searchParams, page=Math.max(1,Number(search.get("page")??1)), pageSize=Math.min(100,Math.max(10,Number(search.get("pageSize")??25)));
  const term=search.get("q")?.trim(), status=search.get("status")?.trim(), from=search.get("from")?.trim(), to=search.get("to")?.trim();
  const validDate=(value:string|undefined)=>Boolean(value&&Number.isFinite(Date.parse(value)));
  const filters=[
    status&&["draft","review","published","archived"].includes(status)?"status=eq."+status:null,
    term?"title=ilike.*"+encodeURIComponent(term.replace(/[,*()]/g,""))+"*":null,
    validDate(from)?"updated_at=gte."+encodeURIComponent(new Date(from as string).toISOString()):null,
    validDate(to)?"updated_at=lte."+encodeURIComponent(new Date(to as string).toISOString()):null
  ].filter(Boolean).join("&");
  const fields=table==="products"?"id,title,slug,status,updated_at,published_at,cover_url,summary,application,content_categories(name)":"id,title,slug,status,updated_at,published_at,cover_url,excerpt,article_type,content_categories(name)";
  const response=await rest<Record<string,unknown>[]>(`${table}?select=${fields}&order=updated_at.desc&limit=${pageSize}&offset=${(page-1)*pageSize}${filters?`&${filters}`:""}`,{headers:{Prefer:"count=exact"}}).catch(()=>null);
  if(!response) return NextResponse.json({message:"无法读取内容。"},{status:503});
  const range=response.response.headers.get("content-range")??"0-0/0", total=Number(range.split("/")[1]??0);
  return NextResponse.json({data:response.data,total,page,pageSize});
}
export async function POST(request:Request,{params}:{params:Promise<{kind:string}>}) {
  const session=await getAdminSession(); const table=await tableFrom(params);
  if(!session||!table||!canManageContent(session.role)) return NextResponse.json({message:"Unauthorized"},{status:401});
  if(!isSameOrigin(request)||requestBodyTooLarge(request,250000)) return NextResponse.json({message:"请求校验失败。"},{status:400});
  const body=await request.json().catch(()=>({})), title=String(body.title??"").trim().slice(0,180), entrySlug=slug(body.slug||title);
  if(title.length<2||!entrySlug) return NextResponse.json({message:"请填写标题与有效链接标识。"},{status:400});
  const status=["draft","review","published","archived"].includes(body.status)?body.status:"draft";
  const category_id=await categoryId(body.categoryName,table==="products"?"product":"article");
  const common={title,slug:entrySlug,category_id,content:String(body.content??"").slice(0,30000),cover_url:String(body.coverUrl??"").slice(0,2000)||null,attachment_url:String(body.attachmentUrl??"").slice(0,2000)||null,seo_title:String(body.seoTitle??"").slice(0,180)||null,seo_description:String(body.seoDescription??"").slice(0,320)||null,status,published_at:status==="published"?new Date().toISOString():null,created_by:session.accountId,updated_by:session.accountId};
  const payload=table==="products"?{...common,summary:String(body.summary??"").slice(0,600)||null,application:String(body.application??"").slice(0,160)||null}:{...common,excerpt:String(body.summary??"").slice(0,600)||null,article_type:["news","faq","market","insight"].includes(body.articleType)?body.articleType:"news"};
  const saved=await rest<Record<string,unknown>[]>(table,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)}).catch(()=>null);
  if(!saved) return NextResponse.json({message:"保存失败，链接标识可能已存在。"},{status:400});
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
  const saved=await rest<Record<string,unknown>[]>(`${table}?id=eq.${encodeURIComponent(body.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status,published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString(),updated_by:session.accountId})}).catch(()=>null);
  if(!saved?.data[0]) return NextResponse.json({message:"更新失败。"},{status:400});
  await rpc("admin_log_audit",{p_actor_id:session.accountId,p_action:"content_status_changed",p_entity_type:table,p_entity_id:body.id,p_metadata:{status}}).catch(()=>undefined);
  return NextResponse.json({ok:true,data:saved.data[0]});
}
