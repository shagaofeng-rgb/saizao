import { redirect } from "next/navigation";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { GoogleSyncCenter } from "@/components/admin/GoogleSyncCenter";

export const dynamic = "force-dynamic";
export default async function GoogleSyncPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageStaff(session.role)) redirect("/admin");
  return <GoogleSyncCenter />;
}
