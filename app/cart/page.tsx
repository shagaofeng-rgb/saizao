import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartView } from "@/components/retail/CartView";
import type { Metadata } from "next";
import "@/app/products/product-detail.css";
export const metadata: Metadata = { title: "Your Cart", robots: { index: false, follow: false } };
export default function CartPage() { return <><SiteHeader/><main id="main-content" className="retail-page"><CartView/></main><SiteFooter/></>; }
