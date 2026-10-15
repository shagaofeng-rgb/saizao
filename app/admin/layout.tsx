import "./admin.css";
import { AdminRoleProvider } from "@/components/admin/AdminRoleContext";
import { getAdminSession } from "@/lib/admin-session";

export const metadata = {
  title: "赛兆运营后台",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  return <div className="admin-shell" lang="zh-CN"><AdminRoleProvider role={session?.role || null}>{children}</AdminRoleProvider></div>;
}
