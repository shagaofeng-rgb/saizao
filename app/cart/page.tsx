import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartView } from "@/components/retail/CartView";
import type { Metadata } from "next";
import "@/app/products/product-detail.css";
export const metadata: Metadata = { title: "Your Cart", robots: { index: false, follow: false } };
export default async function CartPage({ searchParams }: { searchParams: Promise<{ payment?: string | string[] }> }) {
  const { payment } = await searchParams;
  return <><SiteHeader /><main id="main-content" className="retail-page"><CartView payment={typeof payment === "string" ? payment : undefined} /></main><SiteFooter /></>;
}
