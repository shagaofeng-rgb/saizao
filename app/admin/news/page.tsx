import { redirect } from "next/navigation";
import { canManageContent, canPublishContent, getAdminSession } from "@/lib/admin-session";
import { ContentManager } from "@/components/admin/ContentManager";

export const dynamic = "force-dynamic";
export default async function AdminNews() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <ContentManager kind="articles" canEdit={canManageContent(session.role)} canPublish={canPublishContent(session.role)} />;
}
