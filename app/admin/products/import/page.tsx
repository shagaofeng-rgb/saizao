import { redirect } from "next/navigation";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { ProductImport } from "@/components/admin/ProductImport";

export const dynamic = "force-dynamic";
export default async function ProductImportPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageContent(session.role)) redirect("/admin/products");
  return <ProductImport canPublish={canPublishContent(session.role)} />;
}
