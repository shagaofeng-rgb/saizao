import "./admin.css";

export const metadata = {
  title: "赛兆运营后台",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell" lang="zh-CN">{children}</div>;
}
