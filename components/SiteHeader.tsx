"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CaretDown, List, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { applications, primaryNav } from "@/lib/site-data";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [applicationMenu, setApplicationMenu] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpen(false);
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
          <div className="nav-mega" key={item.href}>
            <div className="nav-mega-trigger">
              <Link href={item.href} aria-current={pathname.startsWith("/applications") ? "page" : undefined} className={pathname.startsWith("/applications") ? "nav-active" : ""} onClick={() => { setOpen(false); setApplicationMenu(false); }}>{item.label}</Link>
              <button type="button" aria-label={applicationMenu ? "Close applications menu" : "Open applications menu"} aria-expanded={applicationMenu} aria-controls="applications-menu" onClick={() => setApplicationMenu((value) => !value)}><CaretDown size={13} weight="bold" /></button>
            </div>
            <div id="applications-menu" className={applicationMenu ? "mega-panel mega-panel-open" : "mega-panel"}>
              <p>Choose your product route</p>
              <div>{applications.map((application) => <Link key={application.slug} href={`/applications/${application.slug}`} onClick={() => { setOpen(false); setApplicationMenu(false); }}><span>{application.title}</span><small>{application.description}</small></Link>)}</div>
            </div>
          </div>
        ) : (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={pathname === item.href ? "nav-active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>
        ))}
      </nav>
      <Link className="button button-small header-cta" href="/request-a-quote">Share Your Brief <ArrowUpRight size={16} /></Link>
    </header>
  );
}
