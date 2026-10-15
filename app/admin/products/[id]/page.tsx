import { redirect } from "next/navigation";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { RetailProductEditor } from "@/components/admin/RetailProductEditor";
export const dynamic = "force-dynamic";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageContent(session.role)) redirect("/admin/products");
  return <RetailProductEditor id={(await params).id} canPublish={canPublishContent(session.role)} />;
}
