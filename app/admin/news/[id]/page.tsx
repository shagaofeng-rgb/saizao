import { redirect } from "next/navigation";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export const dynamic = "force-dynamic";
export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageContent(session.role)) redirect("/admin/news");
  return <ArticleEditor id={(await params).id} canPublish={canPublishContent(session.role)} />;
}
