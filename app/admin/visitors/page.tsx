import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { VisitorExplorer } from "@/components/admin/VisitorExplorer";
export const dynamic="force-dynamic";
export default async function VisitorsPage(){if(!(await hasAdminSession())) redirect("/admin/login");return <VisitorExplorer/>;}