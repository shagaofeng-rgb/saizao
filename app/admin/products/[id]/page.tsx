import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { RetailProductEditor } from "@/components/admin/RetailProductEditor";
export const dynamic = "force-dynamic";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) redirect("/admin/login");
  return <RetailProductEditor id={(await params).id} />;
}
