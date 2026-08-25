import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  return <AdminDashboard />;
}
