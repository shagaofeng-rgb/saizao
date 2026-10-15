import { redirect } from "next/navigation";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { rest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!canManageContent(session.role)) redirect("/admin/news");
  const id = (await params).id;
  if (!canPublishContent(session.role)) {
    const current = await rest<{ status: string }[]>(`articles?select=status&id=eq.${encodeURIComponent(id)}&limit=1`).catch(() => null);
    if (!current?.data[0] || current.data[0].status === "published") redirect("/admin/news");
  }
  return <ArticleEditor id={id} canPublish={canPublishContent(session.role)} />;
}
