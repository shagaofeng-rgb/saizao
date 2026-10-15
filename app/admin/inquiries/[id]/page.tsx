import { redirect } from "next/navigation";
import { canManageLeads, canManageStaff, getAdminSession } from "@/lib/admin-session";
import { InquiryDetail } from "@/components/admin/AdminOperations";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }){ const session = await getAdminSession(); if (!session) redirect("/admin/login"); return <InquiryDetail id={(await params).id} canManage={canManageLeads(session.role)} canAssign={canManageStaff(session.role)} />; }
