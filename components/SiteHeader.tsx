"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CaretDown, List, ShoppingBag, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { applications, primaryNav } from "@/lib/site-data";
import { readCart } from "@/lib/retail-cart";

type NavigationMenu = "products" | "applications";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<NavigationMenu | null>(null);
  const [productCategories, setProductCategories] = useState<{ id: string; name: string; slug: string; parent_id: string | null }[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const menuCloseTimer = useRef<number | null>(null);
  const hoveredMenu = useRef<NavigationMenu | null>(null);

  const canHover = () => window.matchMedia("(min-width: 1191px) and (hover: hover) and (pointer: fine)").matches;
  const clearMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = null;
  }, []);
  const openMenu = (menu: NavigationMenu, fromHover = false) => {
    clearMenuCloseTimer();
    hoveredMenu.current = fromHover ? menu : null;
    setActiveMenu(menu);
  };
  const closeMenu = useCallback(() => {
    clearMenuCloseTimer();
    hoveredMenu.current = null;
    setActiveMenu(null);
  }, [clearMenuCloseTimer]);
  const toggleMenu = (menu: NavigationMenu, fromPointer: boolean) => {
    const alreadyOpenedByPointer = fromPointer && hoveredMenu.current === menu;
    clearMenuCloseTimer();
    hoveredMenu.current = null;
    setActiveMenu((current) => current === menu && !alreadyOpenedByPointer ? null : menu);
  };
  const closeNavigation = useCallback(() => {
    setOpen(false);
    closeMenu();
  }, [closeMenu]);
  const scheduleMenuClose = () => {
    if (!canHover()) return;
    clearMenuCloseTimer();
    menuCloseTimer.current = window.setTimeout(() => {
      if (!headerRef.current?.querySelector(".mega-panel-open")?.contains(document.activeElement)) closeMenu();
    }, 180);
  };

  useEffect(() => () => clearMenuCloseTimer(), [clearMenuCloseTimer]);
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
        setCategoriesUnavailable(false);
        setCategoriesLoaded(true);
      })
      .catch(() => { if (!controller.signal.aborted) setCategoriesUnavailable(true); });
    return () => controller.abort();
  }, [activeMenu, categoriesLoaded]);

  useEffect(() => {
    if (!open && !activeMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (!open && !headerRef.current?.contains(document.activeElement))) return;
      event.preventDefault();
      if (activeMenu) {
        closeMenu();
        headerRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="${activeMenu}-menu"]`)?.focus();
      } else {
        setOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        closeNavigation();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [open, activeMenu, closeMenu, closeNavigation]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    const keepFocusInMenu = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !menuToggleRef.current || !navRef.current) return;
      const elements = Array.from(navRef.current.querySelectorAll<HTMLElement>("a[href],button:not(:disabled)"))
        .filter((element) => element.getClientRects().length > 0);
      const first = menuToggleRef.current;
      const last = elements.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const mobile = window.matchMedia("(max-width: 1190px)");
    const closeOnDesktop = () => {
      if (!mobile.matches) {
        closeNavigation();
      }
    };
    window.addEventListener("keydown", keepFocusInMenu);
    mobile.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keepFocusInMenu);
      mobile.removeEventListener("change", closeOnDesktop);
    };
  }, [open, closeNavigation]);

  return (
    <header className="site-header" ref={headerRef}>
      <Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home">
        <Image src="/images/sai-zhao-logo.png" alt="" width={96} height={96} loading="eager" />
        <span>Sai Zhao<br /><small>FRAGRANCE</small></span>
      </Link>
      <button ref={menuToggleRef} className="menu-toggle" type="button" onClick={() => open ? closeNavigation() : setOpen(true)} aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? "Close menu" : "Open menu"}>
        {open ? <X size={24} /> : <List size={24} />}
      </button>
      <nav ref={navRef} id="primary-navigation" className={open ? "nav nav-open" : "nav"} aria-label="Primary navigation">
        {primaryNav.map((item) => item.href === "/applications" || item.href === "/products" ? (
          <div className="nav-mega" key={item.href} onPointerEnter={() => { if (!canHover()) return; clearMenuCloseTimer(); const menu = item.href === "/products" ? "products" : "applications"; if (activeMenu !== menu) openMenu(menu, true); }} onPointerLeave={scheduleMenuClose} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeMenu(); }}>
            <div className="nav-mega-trigger">
              <Link href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined} className={pathname.startsWith(item.href) ? "nav-active" : ""} onClick={closeNavigation}>{item.label}</Link>
              <button type="button" aria-label={`${activeMenu === item.href.slice(1) ? "Close" : "Open"} ${item.label.toLowerCase()} menu`} aria-expanded={activeMenu === item.href.slice(1)} aria-controls={`${item.href.slice(1)}-menu`} onClick={(event) => toggleMenu(item.href === "/products" ? "products" : "applications", event.detail > 0)}><CaretDown size={13} weight="bold" /></button>
            </div>
            <div id={`${item.href.slice(1)}-menu`} className={activeMenu === item.href.slice(1) ? "mega-panel mega-panel-open" : "mega-panel"} onFocus={() => openMenu(item.href === "/products" ? "products" : "applications")}>
              <p>{item.href === "/products" ? "Explore the collection" : "Choose your product route"}</p>
              <div>{item.href === "/products" ? <>
                <Link href="/products" onClick={closeNavigation}><span>All products</span><small>Browse fragrance oils and samples</small></Link>
                {activeMenu === "products" && !categoriesLoaded && <p className="mega-category-status" role="status">{categoriesUnavailable ? "Categories are temporarily unavailable." : "Loading categories…"}</p>}
                <div className="mega-product-groups">{productCategories.filter((category) => !category.parent_id).map((category) => <div className="mega-product-group" key={category.slug}>
                  <Link href={`/products?category=${encodeURIComponent(category.slug)}`} prefetch={false} onClick={closeNavigation}><span>{category.name}</span></Link>
                  {productCategories.some((child) => child.parent_id === category.id) && <div className="mega-product-children">{productCategories.filter((child) => child.parent_id === category.id).map((child) => <Link key={child.slug} href={`/products?category=${encodeURIComponent(child.slug)}`} prefetch={false} onClick={closeNavigation}>{child.name}</Link>)}</div>}
                </div>)}</div>
                <Link className="mega-panel-cta" href="/request-a-quote" onClick={closeNavigation}><span>Custom Fragrance</span><small>Share your product brief with our team</small></Link>
              </> : applications.map((application) => <Link key={application.slug} href={`/applications/${application.slug}`} onClick={closeNavigation}><span>{application.title}</span><small>{application.description}</small></Link>)}</div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "nav-active" : ""} onClick={closeNavigation}>{item.label}</Link>
        ))}
        <Link className="nav-drawer-cta" href="/request-a-quote" onClick={closeNavigation}>Request a quote <ArrowUpRight size={16} /></Link>
      </nav>
      <Link className="header-cart" href="/cart" aria-label={`Cart, ${cartCount} items`}><ShoppingBag size={22}/>{cartCount > 0 && <span>{cartCount}</span>}</Link>
      <Link className="button button-small header-cta" href="/request-a-quote">Request a quote <ArrowUpRight size={16} /></Link>
    </header>
  );
}
