"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

const navigation = [
  { href: "/admin", label: "运营概览" },
  { href: "/admin#visitors", label: "流量与访客" },
  { href: "/admin#leads", label: "询盘管理" },
  { href: "/admin/products", label: "产品管理" },
  { href: "/admin/news", label: "资讯管理" },
  { href: "/admin/staff", label: "员工与权限" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <main className="admin-main">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin" aria-label="赛兆运营后台首页">
          <span>赛兆</span>
          <small>运营后台</small>
        </Link>
        <nav aria-label="后台导航">
          <p className="admin-nav-label">工作台</p>
          {navigation.slice(0, 3).map((item) => (
            <Link key={item.href} className={pathname === "/admin" && item.href.startsWith("/admin#") ? "" : pathname === item.href ? "active" : ""} href={item.href}>{item.label}</Link>
          ))}
          <p className="admin-nav-label">内容与系统</p>
          {navigation.slice(3).map((item) => (
            <Link key={item.href} className={pathname === item.href ? "active" : ""} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/admin/change-password">账号安全</Link>
          <button type="button" onClick={signOut} disabled={isSigningOut}>{isSigningOut ? "正在退出" : "退出登录"}</button>
        </div>
      </aside>
      {children}
    </main>
  );
}
