import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartView } from "@/components/retail/CartView";
import type { Metadata } from "next";
import "@/app/products/product-detail.css";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ country?: string | string[]; payment?: string | string[] }> }) {
  const { country, payment } = await searchParams;
  const initialCountry = typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "";
  return <><SiteHeader /><main id="main-content" className="retail-page"><CartView checkout initialCountry={initialCountry} payment={typeof payment === "string" ? payment : undefined} /></main><SiteFooter /></>;
}
