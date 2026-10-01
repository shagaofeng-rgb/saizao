import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublishedRetailProducts } from "@/lib/retail-data";
import { formatMoney } from "@/lib/retail-types";
import "./product-detail.css";
export const revalidate = 60;
export default async function Products() {
  const items = await getPublishedRetailProducts();
  return <><SiteHeader/><main id="main-content" className="retail-page retail-catalog"><header><p className="eyebrow">PRODUCT LIBRARY</p><h1>Fragrance for every experience.</h1><p>Explore our fragrance products or share a custom brief with the Sai Zhao team.</p></header><section className="retail-catalog-grid">{items.length ? items.map((item) => { const variant = item.variants.filter((v) => v.is_active).sort((a, b) => a.price_minor - b.price_minor)[0]; const image = item.cover_url || item.hero_url; return <article key={item.id}><Link href={`/products/${item.slug}`}><div className="retail-catalog-image">{image && <Image src={image} alt={item.title} fill sizes="(max-width: 700px) 45vw, 25vw" />}</div><div className="retail-catalog-copy">{item.badge && <span>{item.badge}</span>}<h2>{item.title}</h2><p>{item.summary}</p><strong>{item.retail_enabled && variant ? `From ${formatMoney(variant.price_minor, variant.currency)}` : "Explore product"}</strong></div></Link></article>; }) : <div className="retail-catalog-empty"><h2>Our product collection is coming soon.</h2><p>For fragrance sourcing or development, tell us about your project and our team will respond.</p><Link className="button" href="/request-a-quote">Share Your Brief</Link></div>}</section></main><SiteFooter/></>;
}
