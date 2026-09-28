import { notFound, redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { getRetailProductForAdmin } from "@/lib/retail-data";
import { ProductDetailView } from "@/components/retail/ProductDetailView";
export const dynamic = "force-dynamic";
export default async function ProductPreview({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) redirect("/admin/login");
  const product = await getRetailProductForAdmin((await params).id);
  if (!product) notFound();
  return <ProductDetailView product={product} preview />;
}
