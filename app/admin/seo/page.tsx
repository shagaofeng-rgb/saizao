import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { SearchQuality } from "@/components/admin/SearchQuality";

export const dynamic = "force-dynamic";
export default async function SearchQualityPage() {
  if (!(await getAdminSession())) redirect("/admin/login");
  return <SearchQuality />;
}
