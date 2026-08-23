"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CaretDown, List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { applications, primaryNav } from "@/lib/site-data";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [applicationMenu, setApplicationMenu] = useState(false);
  const pathname = usePathname();

  return (
    <header className="site-header">
      <Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home" onClick={() => setOpen(false)}>
        <Image src="/images/sai-zhao-logo.png" alt="Sai Zhao Fragrance" width={96} height={96} priority />
        <span>Sai Zhao<br /><small>FRAGRANCE</small></span>
      </Link>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
        {open ? <X size={24} /> : <List size={24} />}
      </button>
      <nav className={open ? "nav nav-open" : "nav"} aria-label="Primary navigation">
        {primaryNav.map((item) => item.href === "/applications" ? <div className="nav-mega" key={item.href} onMouseEnter={() => setApplicationMenu(true)} onMouseLeave={() => setApplicationMenu(false)}>
          <div className="nav-mega-trigger"><Link href={item.href} className={pathname.startsWith("/applications") ? "nav-active" : ""} onClick={() => setOpen(false)}>{item.label}</Link><button type="button" aria-label="Open applications menu" aria-expanded={applicationMenu} onClick={() => setApplicationMenu((value) => !value)}><CaretDown size={13} weight="bold" /></button></div>
          <div className={applicationMenu ? "mega-panel mega-panel-open" : "mega-panel"}>
            <p>Choose your product route</p>
            <div>{applications.map((application) => <Link key={application.slug} href={`/applications/${application.slug}`} onClick={() => { setApplicationMenu(false); setOpen(false); }}><span>{application.title}</span><small>{application.description}</small></Link>)}</div>
          </div>
        </div> : <Link key={item.href} href={item.href} className={pathname === item.href ? "nav-active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>)}
      </nav>
      <Link className="button button-small header-cta" href="/request-a-quote">Share Your Brief <ArrowUpRight size={16} /></Link>
    </header>
  );
}
