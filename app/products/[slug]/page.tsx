import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/retail/ProductDetailView";
import { getRelatedRetailProducts, getRetailProductBySlug } from "@/lib/retail-data";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getRetailProductBySlug((await params).slug);
  return product ? { title: product.seo_title || product.title, description: product.seo_description || product.summary || undefined, robots: product.is_demo ? { index: false } : undefined } : {};
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getRetailProductBySlug((await params).slug);
  if (!product || product.is_demo) notFound();
  const related = await getRelatedRetailProducts(product.detail.relatedSlugs, product.id);
  return <ProductDetailView product={product} related={related} />;
}
