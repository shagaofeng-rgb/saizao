"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { ChartPieSlice, FolderOpen, Handshake, Images, List, MagnifyingGlass, NewspaperClipping, Package, Plus, ShieldCheck, SignOut, Truck, ShoppingBag, Users, UsersFour, X } from "@phosphor-icons/react";
import { useAdminRole } from "@/components/admin/AdminRoleContext";

const navigation = [
  { href: "/admin", label: "业务概览", icon: ChartPieSlice },
  { href: "/admin/visitors", label: "访客中心", icon: Users },
  { href: "/admin/inquiries", label: "询盘管理", icon: Handshake },
  { href: "/admin/products", label: "产品管理", icon: Package },
  { href: "/admin/products/new", label: "上传产品", icon: Plus },
  { href: "/admin/categories", label: "分类管理", icon: FolderOpen },
  { href: "/admin/media", label: "媒体资料", icon: Images },
  { href: "/admin/orders", label: "零售订单", icon: ShoppingBag },
  { href: "/admin/shipping", label: "配送区域", icon: Truck },
  { href: "/admin/news", label: "资讯内容", icon: NewspaperClipping },
  { href: "/admin/seo", label: "搜索展示", icon: MagnifyingGlass },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const role = useAdminRole();
  const canManageStaff = role === "super_admin" || role === "admin";
  const canEditContent = canManageStaff || role === "content_editor";
  const isActive = (href: string) => href === "/admin" || href === "/admin/products/new" ? pathname === href : (pathname === href || pathname.startsWith(`${href}/`)) && !(href === "/admin/products" && pathname === "/admin/products/new");

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key !== "Tab" || !sidebar.current) return;
      const links = Array.from(sidebar.current.querySelectorAll<HTMLElement>("a, button:not(:disabled)"));
      const first = links[0], last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const breakpoint = window.matchMedia("(max-width: 860px)");
    const onBreakpointChange = () => { if (!breakpoint.matches) setMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    breakpoint.addEventListener("change", onBreakpointChange);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); breakpoint.removeEventListener("change", onBreakpointChange); };
  }, [menuOpen]);

  async function signOut() {
    setIsSigningOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <main className="admin-main">
      <aside ref={sidebar} className={`admin-sidebar${menuOpen ? " admin-sidebar-open" : ""}`}>
        <Link className="admin-brand" href="/admin" aria-label="赛兆业务中心首页">
          <Image src="/images/sai-zhao-logo.png" width={38} height={38} alt="" />
          <span><b>赛兆</b><small>SAI ZHAO FRAGRANCE</small></span>
        </Link>
        <nav id="admin-navigation" aria-label="后台导航">
          <p className="admin-nav-label">工作台</p>
          {navigation.slice(0, 3).map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} aria-current={isActive(item.href) ? "page" : undefined} href={item.href} onClick={() => setMenuOpen(false)}><item.icon weight="regular" aria-hidden="true" />{item.label}</Link>
          ))}
          <p className="admin-nav-label">内容管理</p>
          {navigation.slice(3).filter((item) => item.href !== "/admin/products/new" || canEditContent).filter((item) => item.href !== "/admin/shipping" || canManageStaff).filter((item) => item.href !== "/admin/orders" || canManageStaff || role === "sales").map((item) => (
            <Link key={item.href} className={isActive(item.href) ? "active" : ""} aria-current={isActive(item.href) ? "page" : undefined} href={item.href} onClick={() => setMenuOpen(false)}><item.icon weight="regular" aria-hidden="true" />{item.label}</Link>
          ))}
          {canManageStaff && <><p className="admin-nav-label">系统管理</p>
            <Link className={isActive("/admin/sync") ? "active" : ""} aria-current={isActive("/admin/sync") ? "page" : undefined} href="/admin/sync" onClick={() => setMenuOpen(false)}><ChartPieSlice weight="regular" aria-hidden="true" />数据核验</Link>
            <Link className={isActive("/admin/staff") ? "active" : ""} aria-current={isActive("/admin/staff") ? "page" : undefined} href="/admin/staff" onClick={() => setMenuOpen(false)}><UsersFour weight="regular" aria-hidden="true" />团队账号</Link>
            <Link className={isActive("/admin/audit") ? "active" : ""} aria-current={isActive("/admin/audit") ? "page" : undefined} href="/admin/audit" onClick={() => setMenuOpen(false)}><ShieldCheck weight="regular" aria-hidden="true" />操作记录</Link>
          </>}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/admin/change-password" className={isActive("/admin/change-password") ? "active" : ""} onClick={() => setMenuOpen(false)}><ShieldCheck weight="regular" aria-hidden="true" />账号安全</Link>
          <button type="button" onClick={signOut} disabled={isSigningOut}><SignOut weight="bold" aria-hidden="true" />{isSigningOut ? "正在退出" : "退出登录"}</button>
        </div>
      </aside>
      {menuOpen && <button type="button" className="admin-menu-backdrop" aria-label="关闭导航" tabIndex={-1} onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }} />}
      <div className="admin-workspace">
        <div className="admin-topbar"><button ref={menuButton} className="admin-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" aria-label={menuOpen ? "关闭导航" : "打开导航"} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}</button><span>赛兆业务中心</span><Link href="/" target="_blank" rel="noopener noreferrer">查看网站</Link></div>
        {children}
      </div>
    </main>
  );
}
