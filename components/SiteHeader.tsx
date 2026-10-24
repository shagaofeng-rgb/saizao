"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CaretDown, List, ShoppingBag, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { applications, primaryNav } from "@/lib/site-data";
import { readCart } from "@/lib/retail-cart";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"products" | "applications" | null>(null);
  const [productCategories, setProductCategories] = useState<{ id: string; name: string; slug: string; parent_id: string | null }[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuCloseTimer = useRef<number | null>(null);

  const canHover = () => window.matchMedia("(min-width: 1191px) and (hover: hover) and (pointer: fine)").matches;
  const clearMenuCloseTimer = () => {
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = null;
  };
  const openMenu = (menu: "products" | "applications") => {
    clearMenuCloseTimer();
    setActiveMenu(menu);
  };
  const closeMenu = () => {
    clearMenuCloseTimer();
    setActiveMenu(null);
  };
  const closeNavigation = () => {
    setOpen(false);
    closeMenu();
  };
  const scheduleMenuClose = () => {
    if (!canHover()) return;
    clearMenuCloseTimer();
    menuCloseTimer.current = window.setTimeout(() => setActiveMenu(null), 160);
  };

  useEffect(() => () => clearMenuCloseTimer(), []);
  useEffect(() => {
    const sync = () => setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    sync(); window.addEventListener("saizhao-cart-change", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("saizhao-cart-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (activeMenu !== "products" || categoriesLoaded) return;
    const controller = new AbortController();
    fetch("/api/shop/product-navigation", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Product navigation unavailable");
        return response.json();
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setProductCategories(Array.isArray(result.categories) ? result.categories.filter((item: { name?: unknown; slug?: unknown }) => typeof item.name === "string" && typeof item.slug === "string") : []);
        setCategoriesLoaded(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [activeMenu, categoriesLoaded]);

  useEffect(() => {
    if (!open && !activeMenu) return;
    const previousOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveMenu(null);
      }
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      if (open) document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [open, activeMenu]);

  return (
    <header className="site-header" ref={headerRef}>
      <Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home">
        <Image src="/images/sai-zhao-logo.png" alt="" width={96} height={96} loading="eager" />
        <span>Sai Zhao<br /><small>FRAGRANCE</small></span>
      </Link>
      <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? "Close menu" : "Open menu"}>
        {open ? <X size={24} /> : <List size={24} />}
      </button>
      <nav id="primary-navigation" className={open ? "nav nav-open" : "nav"} aria-label="Primary navigation">
        {primaryNav.map((item) => item.href === "/applications" || item.href === "/products" ? (
          <div className="nav-mega" key={item.href} onPointerEnter={() => { if (canHover()) openMenu(item.href === "/products" ? "products" : "applications"); }} onPointerLeave={scheduleMenuClose} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeMenu(); }}>
            <div className="nav-mega-trigger">
              <Link href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined} className={pathname.startsWith(item.href) ? "nav-active" : ""} onFocus={() => openMenu(item.href === "/products" ? "products" : "applications")} onClick={closeNavigation}>{item.label}</Link>
              <button type="button" aria-label={`${activeMenu === item.href.slice(1) ? "Close" : "Open"} ${item.label.toLowerCase()} menu`} aria-expanded={activeMenu === item.href.slice(1)} aria-controls={`${item.href.slice(1)}-menu`} onClick={() => { clearMenuCloseTimer(); const menu = item.href === "/products" ? "products" : "applications"; setActiveMenu((value) => value === menu ? null : menu); }}><CaretDown size={13} weight="bold" /></button>
            </div>
            <div id={`${item.href.slice(1)}-menu`} className={activeMenu === item.href.slice(1) ? "mega-panel mega-panel-open" : "mega-panel"} onFocus={() => openMenu(item.href === "/products" ? "products" : "applications")}>
              <p>{item.href === "/products" ? "Explore the collection" : "Choose your product route"}</p>
              <div>{item.href === "/products" ? <>
                <Link href="/products" onClick={closeNavigation}><span>All Products</span><small>Browse the published collection</small></Link>
                <div className="mega-product-groups">{productCategories.filter((category) => !category.parent_id).map((category) => <div className="mega-product-group" key={category.slug}>
                  <Link href={`/products?category=${encodeURIComponent(category.slug)}`} onClick={closeNavigation}><span>{category.name}</span></Link>
                  {productCategories.some((child) => child.parent_id === category.id) && <div className="mega-product-children">{productCategories.filter((child) => child.parent_id === category.id).map((child) => <Link key={child.slug} href={`/products?category=${encodeURIComponent(child.slug)}`} onClick={closeNavigation}>{child.name}</Link>)}</div>}
                </div>)}</div>
                <Link className="mega-panel-cta" href="/request-a-quote" onClick={closeNavigation}><span>Custom Fragrance</span><small>Share your product brief with our team</small></Link>
              </> : applications.map((application) => <Link key={application.slug} href={`/applications/${application.slug}`} onClick={closeNavigation}><span>{application.title}</span><small>{application.description}</small></Link>)}</div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "nav-active" : ""} onClick={closeNavigation}>{item.label}</Link>
        ))}
      </nav>
      <Link className="header-cart" href="/cart" aria-label={`Cart, ${cartCount} items`}><ShoppingBag size={22}/>{cartCount > 0 && <span>{cartCount}</span>}</Link>
      <Link className="button button-small header-cta" href="/request-a-quote">Share Your Brief <ArrowUpRight size={16} /></Link>
    </header>
  );
}
