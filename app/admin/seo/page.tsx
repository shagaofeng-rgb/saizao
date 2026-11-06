import { redirect } from "next/navigation";
import { canPublishContent, getAdminSession } from "@/lib/admin-session";
import { SearchQuality } from "@/components/admin/SearchQuality";

export const dynamic = "force-dynamic";
export default async function SearchQualityPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <SearchQuality canEditPublished={canPublishContent(session.role)} />;
}
