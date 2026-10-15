import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { canManageContent, getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export default async function MediaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <MediaLibrary canEdit={canManageContent(session.role)} />;
}
