import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminPasswordSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const session = await getAdminPasswordSession();
  if (session?.forcePasswordReset) redirect("/admin/change-password");
  return <AdminLoginForm />;
}
