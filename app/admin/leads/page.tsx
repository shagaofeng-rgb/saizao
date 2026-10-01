import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
export default async function LeadsPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  redirect("/admin/inquiries");
}
