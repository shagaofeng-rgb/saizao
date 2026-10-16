import { redirect } from "next/navigation";
import { ProductCreateForm } from "@/components/admin/ProductCreateForm";
import { canManageContent, getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageContent(session.role)) redirect("/admin/products");
  return <ProductCreateForm />;
}
