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
  const [applicationMenu, setApplicationMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuCloseTimer = useRef<number | null>(null);

  const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clearMenuCloseTimer = () => {
    if (menuCloseTimer.current) window.clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = null;
  };
  const openApplicationsMenu = () => {
    clearMenuCloseTimer();
    setApplicationMenu(true);
  };
  const scheduleApplicationsClose = () => {
    if (!canHover()) return;
    clearMenuCloseTimer();
    menuCloseTimer.current = window.setTimeout(() => setApplicationMenu(false), 160);
  };

  useEffect(() => () => clearMenuCloseTimer(), []);
  useEffect(() => {
    const sync = () => setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    sync(); window.addEventListener("saizhao-cart-change", sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("saizhao-cart-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setApplicationMenu(false);
      }
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setApplicationMenu(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [open]);

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
        {primaryNav.map((item) => item.href === "/applications" ? (
          <div className="nav-mega" key={item.href} onPointerEnter={() => { if (canHover()) openApplicationsMenu(); }} onPointerLeave={scheduleApplicationsClose}>
            <div className="nav-mega-trigger">
              <Link href={item.href} aria-current={pathname.startsWith("/applications") ? "page" : undefined} className={pathname.startsWith("/applications") ? "nav-active" : ""} onFocus={openApplicationsMenu} onClick={() => { setOpen(false); setApplicationMenu(false); }}>{item.label}</Link>
              <button type="button" aria-label={applicationMenu ? "Close applications menu" : "Open applications menu"} aria-expanded={applicationMenu} aria-controls="applications-menu" onFocus={openApplicationsMenu} onClick={() => { clearMenuCloseTimer(); setApplicationMenu((value) => !value); }}><CaretDown size={13} weight="bold" /></button>
            </div>
            <div id="applications-menu" className={applicationMenu ? "mega-panel mega-panel-open" : "mega-panel"} onFocus={openApplicationsMenu}>
              <p>Choose your product route</p>
              <div>{applications.map((application) => <Link key={application.slug} href={`/applications/${application.slug}`} onClick={() => { setOpen(false); setApplicationMenu(false); }}><span>{application.title}</span><small>{application.description}</small></Link>)}</div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "nav-active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>
        ))}
      </nav>
      <Link className="header-cart" href="/cart" aria-label={`Cart, ${cartCount} items`}><ShoppingBag size={22}/>{cartCount > 0 && <span>{cartCount}</span>}</Link>
      <Link className="button button-small header-cta" href="/request-a-quote">Share Your Brief <ArrowUpRight size={16} /></Link>
    </header>
  );
}
