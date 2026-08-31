import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return <main id="main-content"><SiteHeader /><section className="system-state"><span>404</span><h1>This page has moved out of view.</h1><p>Return to the fragrance development overview or choose a product application.</p><div><Link className="button" href="/">Return home</Link><Link className="text-link" href="/applications">Explore applications</Link></div></section><SiteFooter /></main>;
}
