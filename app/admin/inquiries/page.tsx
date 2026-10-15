import { redirect } from "next/navigation";
import { canExportLeads, getAdminSession } from "@/lib/admin-session";
import { InquiryCenter } from "@/components/admin/AdminOperations";
export const dynamic = "force-dynamic";
export default async function Page(){ const session = await getAdminSession(); if (!session) redirect("/admin/login"); return <InquiryCenter canExport={canExportLeads(session.role)} />; }
