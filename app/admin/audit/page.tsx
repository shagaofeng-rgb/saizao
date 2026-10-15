import { redirect } from "next/navigation";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { AuditLog } from "@/components/admin/AuditLog";

export const dynamic = "force-dynamic";
export default async function AuditPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageStaff(session.role)) redirect("/admin");
  return <AuditLog />;
}
