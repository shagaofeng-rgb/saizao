import { redirect } from "next/navigation";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { RetailShippingManager } from "@/components/admin/RetailShippingManager";
export const dynamic = "force-dynamic";
export default async function ShippingPage() { const session = await getAdminSession(); if (!session) redirect("/admin/login"); if (!canManageStaff(session.role)) redirect("/admin"); return <RetailShippingManager/>; }
