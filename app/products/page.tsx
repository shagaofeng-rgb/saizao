import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublishedProductCategories, getRetailCatalogPage } from "@/lib/retail-data";
import { formatMoney } from "@/lib/retail-types";
import { productDisplayTitle } from "@/lib/retail-display";
import { applications } from "@/lib/site-data";
import "./product-detail.css";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Fragrance Products",
  description: "Explore published Sai Zhao fragrance products and find the right next step for a custom project.",
  alternates: { canonical: "/products" },
};

type ProductSearch = { q?: string | string[]; category?: string | string[]; page?: string | string[] };
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
function catalogHref(query: string, category: string, page = 1) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  return `/products${params.size ? `?${params}` : ""}`;
}

export default async function Products({ searchParams }: { searchParams: Promise<ProductSearch> }) {
  const search = await searchParams;
  const query = first(search.q).trim().slice(0, 80);
  const category = first(search.category).trim().toLowerCase().slice(0, 120);
  const requestedPage = Number(first(search.page) || 1);
  const [{ items, total, page, unavailable }, categories] = await Promise.all([
    getRetailCatalogPage({ query, category, page: requestedPage }),
    getPublishedProductCategories(),
  ]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const filtered = Boolean(query || category);
  const showFilters = !unavailable && (total > 0 || filtered || categories.length > 0);

  return <><SiteHeader /><main id="main-content" className="retail-page retail-catalog">
    <header className="retail-catalog-header">
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Products</span></nav>
      <div className="retail-catalog-intro"><h1>Fragrance products for the next idea.</h1><p>Explore products published by our team. Choose an available size when online ordering is enabled, or share a brief for a custom fragrance project.</p></div>
    </header>

    {showFilters && <section className="retail-catalog-tools" aria-label="Find products">
      <form action="/products" method="get" role="search"><label htmlFor="catalog-search">Search products</label><div><input id="catalog-search" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Search by product name" />{category && <input type="hidden" name="category" value={category} />}<button type="submit">Search</button></div></form>
      {categories.length > 0 && <nav aria-label="Product categories" className="retail-catalog-categories"><Link href={catalogHref(query, "")} aria-current={!category ? "page" : undefined}>All products</Link>{categories.map((item) => <Link key={item.slug} href={catalogHref(query, item.slug)} aria-current={category === item.slug ? "page" : undefined}>{item.name}</Link>)}</nav>}
    </section>}

    {unavailable ? <section className="retail-catalog-message" role="alert"><h2>Products are temporarily unavailable.</h2><p>We could not load the published collection. Please try again, or contact our team about your project.</p><div><Link className="button" href="/products">Try again <ArrowRight size={17} /></Link><Link className="retail-catalog-secondary" href="/request-a-quote">Share a brief</Link></div></section>
      : items.length ? <>
        <div className="retail-catalog-count" role="status">{total} {total === 1 ? "product" : "products"}{filtered ? " matching your selection" : ""}</div>
        <section className="retail-catalog-grid" aria-label="Published products">{items.map((item) => {
          const variant = item.variants.filter((value) => value.is_active && value.stock_quantity > value.reserved_quantity).sort((a, b) => a.price_minor - b.price_minor)[0];
          const image = item.cover_url || item.hero_url;
          const displayTitle = productDisplayTitle(item);
          return <article key={item.id}><Link href={`/products/${item.slug}`}><div className="retail-catalog-image">{image ? <Image src={image} alt={item.gallery.find((photo) => photo.url === image)?.alt || item.title} fill sizes="(max-width: 650px) 100vw, (max-width: 1050px) 50vw, 33vw" /> : <span className="retail-catalog-no-image">Product image unavailable</span>}</div><div className="retail-catalog-copy">{item.content_categories?.name && <small>{item.content_categories.name}</small>}<h2 title={item.title}>{displayTitle}</h2>{item.summary && item.summary.toLowerCase() !== displayTitle.toLowerCase() && <p>{item.summary}</p>}<div>{item.retail_enabled && variant ? <strong>From {formatMoney(variant.price_minor, variant.currency)}</strong> : <strong>Explore details</strong>}<span>View product <ArrowRight size={16} /></span></div></div></Link></article>;
        })}</section>
        {pages > 1 && <nav className="retail-catalog-pagination" aria-label="Product pages"><Link aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined} href={page === 1 ? catalogHref(query, category, 1) : catalogHref(query, category, page - 1)}>Previous</Link><span>Page {page} of {pages}</span><Link aria-disabled={page === pages} tabIndex={page === pages ? -1 : undefined} href={page === pages ? catalogHref(query, category, pages) : catalogHref(query, category, page + 1)}>Next</Link></nav>}
      </> : filtered ? <section className="retail-catalog-message"><h2>No products match this search.</h2><p>Try another product name or category. You can also tell us what you are looking for.</p><div><Link className="button" href="/products">Clear filters <ArrowRight size={17} /></Link><Link className="retail-catalog-secondary" href="/request-a-quote">Share a brief</Link></div></section>
        : <section className="retail-catalog-message retail-catalog-waiting"><div><h2>No products are published yet.</h2><p>Our public product collection is currently empty. For a fragrance sourcing or development project, share your requirements with the Sai Zhao team.</p><Link className="button" href="/request-a-quote">Share Your Brief <ArrowRight size={17} /></Link></div><aside><h3>Explore by application</h3><p>Learn how we approach fragrance for different products.</p><ul>{applications.map((item) => <li key={item.slug}><Link href={`/applications/${item.slug}`}>{item.title}<ArrowRight size={16} /></Link></li>)}</ul></aside></section>}
  </main><SiteFooter /></>;
}
