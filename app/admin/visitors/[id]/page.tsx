import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { VisitorDetail } from "@/components/admin/VisitorDetail";
export const dynamic="force-dynamic";
export default async function VisitorDetailPage({params}:{params:Promise<{id:string}>}){if(!(await hasAdminSession())) redirect("/admin/login");const {id}=await params;return <VisitorDetail visitorId={id}/>;}