import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canManageContent, getAdminSession } from "@/lib/admin-session";
import { rest, supabaseRequest, supabaseUrl, rpc } from "@/lib/supabase-server";
import { isSameOrigin } from "@/lib/request-security";

const types=new Set(["image/jpeg","image/png","image/webp","image/avif","application/pdf","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
function clean(name:string){return name.toLowerCase().replace(/[^a-z0-9._-]/g,"-").replace(/-+/g,"-").slice(-120);}
export async function POST(request:Request) {
  const session=await getAdminSession();
  if(!session||!canManageContent(session.role)) return NextResponse.json({message:"Unauthorized"},{status:401});
  if(!isSameOrigin(request)) return NextResponse.json({message:"请求校验失败。"},{status:403});
  const form=await request.formData().catch(()=>null); const file=form?.get("file");
  if(!(file instanceof File)||!types.has(file.type)||file.size>10*1024*1024) return NextResponse.json({message:"仅支持 10MB 以内的图片、PDF、CSV 或 XLSX 文件。"},{status:400});
  const path=`${new Date().toISOString().slice(0,10)}/${randomUUID()}-${clean(file.name)}`;
  try {
    await supabaseRequest(`storage/v1/object/website-media/${path}`,{method:"POST",headers:{"Content-Type":file.type,"x-upsert":"false"},body:Buffer.from(await file.arrayBuffer())});
    const publicUrl=`${supabaseUrl()}/storage/v1/object/public/website-media/${path}`;
    const asset_kind=file.type.startsWith("image/")?"image":file.type==="application/pdf"?"document":"spreadsheet";
    const record=await rest<Record<string,unknown>[]>("media_assets",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({file_name:file.name,storage_path:path,public_url:publicUrl,mime_type:file.type,byte_size:file.size,asset_kind,uploaded_by:session.accountId})});
    await rpc("admin_log_audit",{p_actor_id:session.accountId,p_action:"media_uploaded",p_entity_type:"media",p_entity_id:String(record.data[0]?.id??""),p_metadata:{fileName:file.name}}).catch(()=>undefined);
    return NextResponse.json({ok:true,data:record.data[0]});
  } catch { return NextResponse.json({message:"文件上传失败，请检查 Storage 配置。"},{status:503}); }
}
