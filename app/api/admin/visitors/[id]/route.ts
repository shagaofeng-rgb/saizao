import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-session";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";
function iso(value:string|null,fallback:Date){const parsed=value?new Date(value):fallback;return Number.isNaN(parsed.getTime())?fallback.toISOString():parsed.toISOString();}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await hasAdminSession())) return NextResponse.json({message:"Unauthorized"},{status:401});
 if(!isSupabaseConfigured()) return NextResponse.json({message:"数据服务尚未配置。"},{status:503});
 const {id}=await params; if(!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({message:"无效访客编号。"},{status:400});
 const q=new URL(request.url).searchParams, now=new Date(), start=new Date(now.getTime()-29*86400000);
 const data=await rpc("admin_visitor_detail",{p_visitor_id:id,p_start:iso(q.get("from"),start),p_end:iso(q.get("to"),now)}).catch(()=>null);
 return data?NextResponse.json({data}):NextResponse.json({message:"无法读取访客详情。"},{status:503});
}