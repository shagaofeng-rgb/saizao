"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Phone } from "@phosphor-icons/react";

export function StickyContact() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 360);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <aside className={visible ? "sticky-contact sticky-contact-visible" : "sticky-contact"} aria-label="Quick contact options">
    <a href="tel:+8613701780563" aria-label="Call Sai Zhao"><Phone size={17} weight="fill" /><span>Call</span></a>
    <Link href="/request-a-quote"><span>Get a Quote</span><ArrowUpRight size={17} /></Link>
  </aside>;
}
