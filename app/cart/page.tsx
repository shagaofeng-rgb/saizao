import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartView } from "@/components/retail/CartView";
import "@/app/products/product-detail.css";
export default function CartPage() { return <><SiteHeader/><main id="main-content" className="retail-page"><CartView/></main><SiteFooter/></>; }
