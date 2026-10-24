import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartView } from "@/components/retail/CartView";
import type { Metadata } from "next";
import "@/app/products/product-detail.css";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export default function CheckoutPage() { return <><SiteHeader/><main id="main-content" className="retail-page"><CartView checkout/></main><SiteFooter/></>; }
