import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-session";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

function iso(value:string|null,fallback:Date){const parsed=value?new Date(value):fallback;return Number.isNaN(parsed.getTime())?fallback.toISOString():parsed.toISOString();}
export async function GET(request:Request){
 if(!(await hasAdminSession())) return NextResponse.json({message:"Unauthorized"},{status:401});
 if(!isSupabaseConfigured()) return NextResponse.json({message:"数据服务尚未配置。"},{status:503});
 const q=new URL(request.url).searchParams, now=new Date(), start=new Date(now.getTime()-29*86400000);
 const data=await rpc("admin_list_visitors",{p_start:iso(q.get("from"),start),p_end:iso(q.get("to"),now),p_country:q.get("country")||null,p_source:q.get("source")||null,p_query:q.get("q")||null,p_page:Math.max(Number(q.get("page")||1),1),p_page_size:Math.min(Math.max(Number(q.get("pageSize")||20),20),100)}).catch(()=>null);
 return data?NextResponse.json({data}):NextResponse.json({message:"无法读取访客数据。"},{status:503});
}