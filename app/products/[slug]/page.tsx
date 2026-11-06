import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/retail/ProductDetailView";
import { checkoutReady, dollars } from "@/lib/paypal";
import { getRelatedRetailProducts, getRetailProductBySlug } from "@/lib/retail-data";
import { productDisplayTitle, productSearchDescription } from "@/lib/retail-display";
import { company, siteUrl } from "@/lib/site-data";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getRetailProductBySlug((await params).slug);
  if (!product) return {};
  const title = product.seo_title?.trim() || productDisplayTitle(product);
  const description = productSearchDescription(product);
  const path = `/products/${product.slug}`;
  const image = product.cover_url || product.hero_url;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: `${siteUrl}${path}`, images: image ? [{ url: image, alt: productDisplayTitle(product) }] : undefined },
  };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getRetailProductBySlug((await params).slug);
  if (!product || product.is_demo) notFound();
  const related = await getRelatedRetailProducts(product.detail.relatedSlugs, product.id);
  const name = productDisplayTitle(product);
  const url = `${siteUrl}/products/${product.slug}`;
  const description = productSearchDescription(product);
  const images = [...new Set([product.cover_url, product.hero_url, ...product.gallery.map((image) => image.url)].filter((url): url is string => Boolean(url)))];
  const variants = product.retail_enabled && checkoutReady()
    ? product.variants.filter((variant) => variant.is_active).sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const displayedVariant = variants.find((variant) => variant.sku === product.detail.defaultVariantSku) || variants[0];
  const canShowOffer = displayedVariant && displayedVariant.price_minor > 0
    && variants.some((variant) => variant.stock_quantity > variant.reserved_quantity);
  const schema = canShowOffer ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images,
    brand: { "@type": "Brand", name: company.brandName },
    sku: displayedVariant.sku,
    url,
    offers: {
      "@type": "Offer",
      url,
      price: dollars(displayedVariant.price_minor),
      priceCurrency: displayedVariant.currency,
      availability: displayedVariant.stock_quantity > displayedVariant.reserved_quantity
        ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  } : {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name,
    description,
    url,
    primaryImageOfPage: images[0] ? { "@type": "ImageObject", contentUrl: images[0] } : undefined,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  };
  return <><ProductDetailView product={product} related={related} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([schema, breadcrumb]).replace(/</g, "\\u003c") }} /></>;
}
