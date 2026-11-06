import { redirect } from "next/navigation";
import { getAdminPasswordSession } from "@/lib/admin-session";
import { AdminChangePassword } from "@/components/admin/AdminChangePassword";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getAdminPasswordSession();
  if (!session) redirect("/admin/login");
  return <AdminChangePassword required={session.forcePasswordReset} />;
}
