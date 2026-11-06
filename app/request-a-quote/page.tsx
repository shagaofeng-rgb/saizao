import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { company } from "@/lib/site-data";
import { getRetailProductBySlug } from "@/lib/retail-data";

export const metadata: Metadata = { title: "Request a Fragrance Quote", description: "Share your fragrance product brief with Sai Zhao.", alternates: { canonical: "/request-a-quote" } };
export default async function RequestQuotePage({ searchParams }: { searchParams: Promise<{ product?: string | string[] }> }) {
  const raw = (await searchParams).product;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  const product = slug ? await getRetailProductBySlug(slug).catch(() => null) : null;
  return <main id="main-content">
    <SiteHeader />
    <section className="quote-hero">
      <p className="eyebrow">BULK SUPPLY AND CUSTOM FRAGRANCE</p>
      <h1>Request a fragrance quote.</h1>
      <p className="lead">Tell us which fragrance you need, how you plan to use it and whether you need samples or bulk supply.</p>
    </section>
    <section className="quote-page section">
      <div>
        <h2>What to include</h2>
        <p>Share the application, estimated quantity, destination and target delivery date if you know them.</p>
        <p className="direct-call">Prefer a direct call? Contact {company.contactName} at <a href={company.telephoneHref}>{company.telephone}</a>.</p>
      </div>
      <QuoteForm productTitle={product?.title} />
    </section>
    <SiteFooter />
  </main>;
}
