import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/retail/ProductDetailView";
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
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: product.detail.overview || product.summary || product.content || undefined,
    image: [...new Set([product.cover_url, product.hero_url, ...product.gallery.map((image) => image.url)].filter((url): url is string => Boolean(url)))],
    brand: { "@type": "Brand", name: company.brandName },
    url,
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
