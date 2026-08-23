"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { primaryNav } from "@/lib/site-data";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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
        {primaryNav.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
      </nav>
      <Link className="button button-small header-cta" href="/request-a-quote">Share Your Brief <ArrowUpRight size={16} /></Link>
    </header>
  );
}
