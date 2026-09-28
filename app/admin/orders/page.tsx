import { redirect } from "next/navigation";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { RetailOrdersManager } from "@/components/admin/RetailOrdersManager";
export const dynamic = "force-dynamic";
export default async function OrdersPage() { const session = await getAdminSession(); if (!session) redirect("/admin/login"); if (!["super_admin", "admin", "sales"].includes(session.role)) redirect("/admin"); return <RetailOrdersManager canManage={canManageStaff(session.role)}/>; }
