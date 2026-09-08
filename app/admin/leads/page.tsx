import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { LeadManager } from "@/components/admin/LeadManager";
export default async function LeadsPage(){if(!(await hasAdminSession()))redirect("/admin/login");return <LeadManager/>;}