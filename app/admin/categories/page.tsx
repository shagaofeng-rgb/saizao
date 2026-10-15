import { redirect } from "next/navigation";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { canManageContent, getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <CategoryManager canEdit={canManageContent(session.role)} />;
}
