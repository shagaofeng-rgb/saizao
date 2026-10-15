import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canManageContent, getAdminSession } from "@/lib/admin-session";
import { rest, supabaseRequest, supabaseUrl, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

const types=new Set(["image/jpeg","image/png","image/webp","image/avif","application/pdf","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
function clean(name:string){return name.toLowerCase().replace(/[^a-z0-9._-]/g,"-").replace(/-+/g,"-").slice(-120);}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Asset = { id: string; file_name: string; storage_path: string; public_url: string; mime_type: string; byte_size: number; asset_kind: string; alt_text: string | null; created_at: string };
type Usage = { products: { id: string; title: string }[]; articles: { id: string; title: string }[] };
function validSignature(file: File, bytes: Buffer) {
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (file.type === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (file.type === "image/avif") return bytes.toString("ascii", 4, 12).includes("ftypavif") || bytes.toString("ascii", 4, 12).includes("ftypavis");
  if (file.type === "application/pdf") return bytes.toString("ascii", 0, 5) === "%PDF-";
  if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return file.type === "text/csv";
}

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const id = query.get("usage");
  try {
    if (id) {
      if (!uuid.test(id)) return NextResponse.json({ message: "文件编号无效。" }, { status: 400 });
      const record = await rest<Asset[]>(`media_assets?select=public_url&id=eq.${id}&deleted_at=is.null&limit=1`);
      if (!record.data[0]) return NextResponse.json({ message: "文件不存在。" }, { status: 404 });
      return NextResponse.json({ data: await rpc<Usage>("admin_media_usage", { p_url: record.data[0].public_url }) });
    }
    const page = Math.min(10000, Math.max(1, Number(query.get("page")) || 1));
    const pageSize = [10,20,50,100].includes(Number(query.get("pageSize"))) ? Number(query.get("pageSize")) : 20;
    const term = (query.get("q") || "").trim().replace(/[,*()]/g, "").slice(0, 80);
    const assetKind = ["image","document","spreadsheet"].includes(query.get("kind") || "") ? `&asset_kind=eq.${query.get("kind")}` : "";
    const search = term ? `&file_name=ilike.*${encodeURIComponent(term)}*` : "";
    const { data, response } = await rest<Asset[]>(`media_assets?select=id,file_name,storage_path,public_url,mime_type,byte_size,asset_kind,alt_text,created_at&deleted_at=is.null${assetKind}${search}&order=created_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}`, { headers: { Prefer: "count=exact" } });
    return NextResponse.json({ data, total: Number(response.headers.get("content-range")?.split("/")[1] || 0), page, pageSize });
  } catch { return NextResponse.json({ message: "媒体库暂时无法读取。" }, { status: 503 }); }
}
export async function POST(request:Request) {
  const session=await getAdminSession();
  if(!session||!canManageContent(session.role)) return NextResponse.json({message:"Unauthorized"},{status:401});
  if(!isSameOrigin(request)) return NextResponse.json({message:"请求校验失败。"},{status:403});
  const form=await request.formData().catch(()=>null); const file=form?.get("file");
  if(!(file instanceof File)||!types.has(file.type)||file.size>4*1024*1024) return NextResponse.json({message:"仅支持 4MB 以内的图片、PDF、CSV 或 XLSX 文件。"},{status:400});
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validSignature(file, bytes)) return NextResponse.json({ message: "文件格式与文件内容不一致。" }, { status: 400 });
  const path=`${new Date().toISOString().slice(0,10)}/${randomUUID()}-${clean(file.name)}`;
  try {
    await supabaseRequest(`storage/v1/object/website-media/${path}`,{method:"POST",headers:{"Content-Type":file.type,"x-upsert":"false"},body:bytes});
    const publicUrl=`${supabaseUrl()}/storage/v1/object/public/website-media/${path}`;
    const asset_kind=file.type.startsWith("image/")?"image":file.type==="application/pdf"?"document":"spreadsheet";
    const record=await rest<Record<string,unknown>[]>("media_assets",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({file_name:file.name,storage_path:path,public_url:publicUrl,mime_type:file.type,byte_size:file.size,asset_kind,uploaded_by:session.accountId})});
    await rpc("admin_log_audit",{p_actor_id:session.accountId,p_action:"media_uploaded",p_entity_type:"media",p_entity_id:String(record.data[0]?.id??""),p_metadata:{fileName:file.name}}).catch(()=>undefined);
    return NextResponse.json({ok:true,data:record.data[0]});
  } catch { return NextResponse.json({message:"文件上传失败，请检查 Storage 配置。"},{status:503}); }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权修改媒体资料。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 3000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || ""), alt = String(body.altText || "").trim().slice(0, 180);
  if (!uuid.test(id)) return NextResponse.json({ message: "文件编号无效。" }, { status: 400 });
  try {
    const saved = await rest<Asset[]>(`media_assets?id=eq.${id}&deleted_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ alt_text: alt || null }) });
    if (!saved.data[0]) return NextResponse.json({ message: "文件不存在。" }, { status: 404 });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "media_updated", p_entity_type: "media", p_entity_id: id, p_metadata: {} }).catch(() => undefined);
    return NextResponse.json({ data: saved.data[0] });
  } catch { return NextResponse.json({ message: "保存失败。" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageContent(session.role)) return NextResponse.json({ message: "无权归档媒体资料。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 3000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => ({})), id = String(body.id || "");
  if (!uuid.test(id)) return NextResponse.json({ message: "文件编号无效。" }, { status: 400 });
  try {
    const found = await rest<Asset[]>(`media_assets?select=public_url&id=eq.${id}&deleted_at=is.null&limit=1`);
    if (!found.data[0]) return NextResponse.json({ message: "文件不存在。" }, { status: 404 });
    const usage = await rpc<Usage>("admin_media_usage", { p_url: found.data[0].public_url });
    if (usage.products.length || usage.articles.length) return NextResponse.json({ message: "文件仍被内容使用，请先替换引用。" }, { status: 409 });
    await rest(`media_assets?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "media_archived", p_entity_type: "media", p_entity_id: id, p_metadata: {} }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: "归档失败，请重试。" }, { status: 503 }); }
}
