import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { AdminChangePassword } from "@/components/admin/AdminChangePassword";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  return <AdminChangePassword />;
}
