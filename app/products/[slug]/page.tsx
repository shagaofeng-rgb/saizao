import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/retail/ProductDetailView";
import { getRelatedRetailProducts, getRetailProductBySlug } from "@/lib/retail-data";
import { company, siteUrl } from "@/lib/site-data";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getRetailProductBySlug((await params).slug);
  return product ? { title: product.seo_title || product.title, description: product.seo_description || product.summary || undefined, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.seo_title || product.title, description: product.seo_description || product.summary || undefined, url: `${siteUrl}/products/${product.slug}`, images: product.cover_url || product.hero_url ? [{ url: product.cover_url || product.hero_url || "", alt: product.title }] : undefined }, robots: product.is_demo ? { index: false } : undefined } : {};
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getRetailProductBySlug((await params).slug);
  if (!product || product.is_demo) notFound();
  const related = await getRelatedRetailProducts(product.detail.relatedSlugs, product.id);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.summary || product.content || undefined,
    image: [...new Set([product.cover_url, product.hero_url, ...product.gallery.map((image) => image.url)].filter((url): url is string => Boolean(url)))],
    brand: { "@type": "Brand", name: company.brandName },
    url: `${siteUrl}/products/${product.slug}`,
  };
  return <><ProductDetailView product={product} related={related} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /></>;
}
