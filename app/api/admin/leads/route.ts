import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rest } from "@/lib/supabase-server";

const stages=["New","Contacted","Qualified","Sample","Quote","Negotiation","Won","Lost"];
function iso(value:string|null, fallback:Date){return value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():fallback.toISOString();}
export async function GET(request:Request){
  const session=await getAdminSession();
  if(!session)return NextResponse.json({message:"Unauthorized"},{status:401});
  const search=new URL(request.url).searchParams, now=new Date(), fallback=new Date(now.getTime()-29*86400000);
  const page=Math.max(1,Number(search.get("page")??1)), pageSize=Math.min(100,Math.max(20,Number(search.get("pageSize")??20)));
  const status=search.get("status")??"", source=search.get("source")?.trim()??"", country=search.get("country")?.trim()??"", query=(search.get("q")??"").replace(/[,()*]/g,"").trim();
  const filters=[
    "created_at=gte."+encodeURIComponent(iso(search.get("from"),fallback)),
    "created_at=lte."+encodeURIComponent(iso(search.get("to"),now)),
    stages.includes(status)?"status=eq."+encodeURIComponent(status):null,
    source?"source=eq."+encodeURIComponent(source):null,
    country?"country_code=eq."+encodeURIComponent(country):null,
    query?"or="+encodeURIComponent("(name.ilike.*"+query+"*,email.ilike.*"+query+"*,company.ilike.*"+query+"*)"):null
  ].filter(Boolean).join("&");
  const fields="id,created_at,status,name,email,company,application,country_code,country_name,phone,page_path,source,medium,campaign,anonymous_id,next_follow_up_at";
  const response=await rest<Record<string,unknown>[]>("leads?select="+fields+"&order=created_at.desc&limit="+pageSize+"&offset="+((page-1)*pageSize)+"&"+filters,{headers:{Prefer:"count=exact"}}).catch(()=>null);
  if(!response)return NextResponse.json({message:"无法读取询盘数据。"},{status:503});
  const total=Number((response.response.headers.get("content-range")??"0-0/0").split("/")[1]??0);
  return NextResponse.json({data:response.data,total,page,pageSize});
}