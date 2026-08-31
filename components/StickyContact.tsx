"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Phone } from "@phosphor-icons/react";
import { company } from "@/lib/site-data";

export function StickyContact() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const update = () => setVisible(window.scrollY > 360);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);
  if (pathname.startsWith("/admin")) return null;
  return <aside className={visible ? "sticky-contact sticky-contact-visible" : "sticky-contact"} aria-label="Quick contact options">
    <a href={company.telephoneHref} aria-label="Call Sai Zhao"><Phone size={17} weight="fill" /><span>Call</span></a>
    <Link href="/request-a-quote"><span>Get a Quote</span><ArrowUpRight size={17} /></Link>
  </aside>;
}
