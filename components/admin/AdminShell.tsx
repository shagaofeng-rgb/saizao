"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { ChartPieSlice, Handshake, NewspaperClipping, Package, ShieldCheck, SignOut, Users, UsersFour } from "@phosphor-icons/react";

const navigation = [
  { href: "/admin", label: "业务概览", icon: ChartPieSlice },
  { href: "/admin#visitors", label: "访客记录", icon: Users },
  { href: "/admin#leads", label: "询盘管理", icon: Handshake },
  { href: "/admin/products", label: "产品内容", icon: Package },
  { href: "/admin/news", label: "资讯内容", icon: NewspaperClipping },
  { href: "/admin/staff", label: "团队账号", icon: UsersFour },
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
        <Link className="admin-brand" href="/admin" aria-label="赛兆业务中心首页">
          <span>赛兆</span>
          <small>业务中心</small>
        </Link>
        <nav aria-label="后台导航">
          <p className="admin-nav-label">工作台</p>
          {navigation.slice(0, 3).map((item) => (
            <Link key={item.href} className={pathname === "/admin" && item.href.startsWith("/admin#") ? "" : pathname === item.href ? "active" : ""} href={item.href}><item.icon weight="bold" aria-hidden="true" />{item.label}</Link>
          ))}
          <p className="admin-nav-label">内容管理</p>
          {navigation.slice(3).map((item) => (
            <Link key={item.href} className={pathname === item.href ? "active" : ""} href={item.href}><item.icon weight="bold" aria-hidden="true" />{item.label}</Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/admin/change-password"><ShieldCheck weight="bold" aria-hidden="true" />账号安全</Link>
          <button type="button" onClick={signOut} disabled={isSigningOut}><SignOut weight="bold" aria-hidden="true" />{isSigningOut ? "正在退出" : "退出登录"}</button>
        </div>
      </aside>
      {children}
    </main>
  );
}
