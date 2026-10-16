import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, DownloadSimple, Flask, ShoppingCart, Thermometer, Truck } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductGallery } from "@/components/retail/ProductGallery";
import { ProductPurchase } from "@/components/retail/ProductPurchase";
import { productDisplayTitle } from "@/lib/retail-display";
import { formatMoney, type DetailRow, type RetailProduct } from "@/lib/retail-types";
import { checkoutReady } from "@/lib/paypal";
import "@/app/products/product-detail.css";

const sampleApplications = [
  { title: "Candles", description: "A warm, balanced fragrance experience", image: "/images/retail/candle.jpg", alt: "Fragranced candle" },
  { title: "Reed Diffusers", description: "Continuous ambient fragrance", image: "/images/retail/reed-diffuser.jpg", alt: "Reed diffuser" },
  { title: "Room Sprays", description: "A fresh, uplifting mist", image: "/images/retail/room-spray.jpg", alt: "Room spray bottle" },
];

function usefulValue(value: string) {
  return Boolean(value?.trim()) && !/^(none|null|n\/a|not available|-)$/i.test(value.trim());
}

function uniqueTechnical(rows: DetailRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.label?.trim() || !usefulValue(row.value)) return false;
    const key = `${row.label.trim().toLowerCase()}:${row.value.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const factLabels = [
  { label: "Sample", matches: /^sample(?: size)?$/i },
  { label: "Shelf life", matches: /^shelf[\s-]?life$/i },
  { label: "MOQ", matches: /^(?:moq|minimum order quantity)$/i },
  { label: "Storage", matches: /^storage$/i },
];

export function ProductDetailView({ product, related = [], preview = false }: { product: RetailProduct; related?: RetailProduct[]; preview?: boolean }) {
  const detail = product.detail;
  const hero = product.hero_url || product.cover_url || product.gallery[0]?.url;
  const images = [
    ...(hero ? [{ url: hero, alt: product.gallery.find((image) => image.url === hero)?.alt || product.title }] : []),
    ...product.gallery,
  ].filter((image, index, all) => image.url && all.findIndex((other) => other.url === image.url) === index).slice(0, 12);
  const technical = uniqueTechnical(detail.technical);
  const displayTitle = productDisplayTitle(product);
  const distinctCopy = (value?: string) => {
    const normalized = value?.trim().toLowerCase();
    return Boolean(normalized && normalized !== displayTitle.toLowerCase() && normalized !== product.title.trim().toLowerCase());
  };
  const description = [detail.overview, product.summary, product.content]
    .map((value) => value?.trim() || "")
    .find(distinctCopy) || "";
  const overviewText = [detail.overview, product.content, product.summary]
    .map((value) => value?.trim() || "")
    .find(distinctCopy) || "";
  const applicationText = technical.find((row) => /^application$/i.test(row.label))?.value.trim() || product.application?.trim() || "";
  const facts = factLabels.flatMap(({ label, matches }) => {
    const row = technical.find((item) => matches.test(item.label.trim()));
    return row ? [{ label, value: row.value.trim() }] : [];
  });
  const applications = detail.applications.length ? detail.applications : product.is_demo ? sampleApplications : [];
  const retailAvailable = checkoutReady() && !preview && !product.is_demo && product.retail_enabled && product.variants.some((variant) => variant.is_active && variant.stock_quantity > variant.reserved_quantity);
  const hasNotes = Boolean(detail.topNotes || detail.heartNotes || detail.baseNotes);
  const hasProfile = hasNotes || applications.length > 0 || detail.dosage.length > 0;
  const hasLogistics = Boolean(detail.packagingImage || detail.packagingIntro || detail.storage.length || detail.shipping.length);
  const downloads = detail.downloads.length ? detail.downloads : product.attachment_url ? [{ title: "Product information", url: product.attachment_url, note: "" }] : [];
  const quoteHref = `/request-a-quote?product=${encodeURIComponent(product.slug)}`;

  return <><SiteHeader /><main id="main-content" className="retail-page retail-detail">
    {preview && <div className="retail-preview-banner">Admin preview · This draft is not visible to customers. <Link href="/admin/products">Manage products</Link></div>}
    <nav className="retail-detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/products">Products</Link><span aria-hidden="true">/</span><span aria-current="page">{displayTitle}</span></nav>
    <section className="retail-top" aria-labelledby="product-title">
      <ProductGallery images={images} title={displayTitle} />
      <div className="retail-summary">
        <div className="retail-summary-intro">
          {product.content_categories?.name && <p className="retail-category-name">{product.content_categories.name}</p>}
          {product.badge && <span className="retail-badge">{product.badge}</span>}
          <h1 id="product-title" className={displayTitle.length > 80 ? "retail-title-long" : undefined}>{displayTitle}</h1>
          {(product.subtitle || applicationText) && <p className="retail-subtitle">{product.subtitle || applicationText}</p>}
          {description && <p className="retail-description">{description}</p>}
        </div>
        <div className="retail-summary-details">
          {facts.length > 0 && <dl className="retail-key-facts">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
          <ProductPurchase product={product} preview={preview} checkoutEnabled={checkoutReady()} />
        </div>
      </div>
    </section>

    {(overviewText || technical.length > 0) && <section className="retail-overview retail-two-column">
      <div>
        <h2>Product overview</h2>
        {overviewText && <p>{overviewText}</p>}
        {applicationText && <p className="retail-overview-application"><strong>Application</strong> {applicationText}</p>}
      </div>
      <div>
        <h2>Specifications</h2>
        {technical.length > 0 && <><dl className="retail-table">{technical.slice(0, 12).map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
          {technical.length > 12 && <details className="retail-more-specs"><summary>View all {technical.length} specifications</summary><dl className="retail-table">{technical.slice(12).map((row, index) => <div key={`${row.label}-${index + 12}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></details>}</>}
      </div>
    </section>}

    {detail.descriptionImages.length > 0 && <section className="retail-description-images" aria-label="Detailed product information">
      <h2>Product details</h2>
      {detail.descriptionImages.slice(0, 3).map((image, index) => <Image key={`${image.url}-${index}`} src={image.url} alt={image.alt || `${displayTitle} — product information ${index + 1}`} width={image.width || 1200} height={image.height || 1200} sizes="(max-width: 900px) 92vw, 900px" />)}
      {detail.descriptionImages.length > 3 && <details className="retail-more-images"><summary>View all product details</summary>{detail.descriptionImages.slice(3).map((image, index) => <Image key={`${image.url}-${index + 3}`} src={image.url} alt={image.alt || `${displayTitle} — product information ${index + 4}`} width={image.width || 1200} height={image.height || 1200} sizes="(max-width: 900px) 92vw, 900px" />)}</details>}
    </section>}

    {hasProfile && <section className="retail-profile-grid">
      {hasNotes && <div className="retail-panel"><h2>Fragrance profile</h2><dl className="retail-notes">{detail.topNotes && <div><dt>Top notes</dt><dd>{detail.topNotes}</dd></div>}{detail.heartNotes && <div><dt>Heart notes</dt><dd>{detail.heartNotes}</dd></div>}{detail.baseNotes && <div><dt>Base notes</dt><dd>{detail.baseNotes}</dd></div>}</dl></div>}
      {applications.length > 0 && <div className="retail-panel"><h2>Applications</h2><div className="retail-application-grid">{applications.map((item, index) => <article key={`${item.title}-${index}`}><div><Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 44vw, 15vw" /></div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div>}
      {detail.dosage.length > 0 && <div className="retail-panel"><h2>Dosage guidance</h2><ul>{detail.dosage.map((row) => <li key={row.label}>{row.label}: {row.value}</li>)}</ul><small>Final dosage should be validated in your finished product.</small></div>}
    </section>}

    {hasLogistics && <section className="retail-logistics-grid">
      {(detail.packagingImage || detail.packagingIntro) && <div className="retail-panel"><h2>Packaging sizes</h2>{detail.packagingImage && <div className="retail-packaging-image"><Image src={detail.packagingImage} alt={product.is_demo ? "Illustrative packaging range" : `${displayTitle} packaging`} fill sizes="(max-width: 700px) 100vw, 33vw" /></div>}{detail.packagingIntro && <p>{detail.packagingIntro}</p>}</div>}
      {detail.storage.length > 0 && <div className="retail-panel"><h2>Storage advice</h2><ul className="retail-icon-bullets">{detail.storage.map((item) => <li key={item}><Thermometer size={20}/>{item}</li>)}</ul></div>}
      {detail.shipping.length > 0 && <div className="retail-panel"><h2>Shipping information</h2><ul className="retail-icon-bullets">{detail.shipping.map((item) => <li key={item}><Truck size={20}/>{item}</li>)}</ul></div>}
    </section>}

    {retailAvailable && <section className="retail-paths"><article><ShoppingCart size={30}/><div><h2>Retail purchase</h2><p>Choose an available size and complete a secure online order.</p><ul>{detail.retailBenefits.map((item) => <li key={item}><CheckCircle size={16}/>{item}</li>)}</ul><Link href="/cart">View cart <ArrowRight size={16}/></Link></div></article><span className="retail-or">OR</span><article><Flask size={30}/><div><h2>Bulk / custom fragrance project</h2><p>Tailored solutions for brands and application needs.</p><ul>{detail.customBenefits.map((item) => <li key={item}><CheckCircle size={16}/>{item}</li>)}</ul><Link href={quoteHref}>Request a custom brief <ArrowRight size={16}/></Link></div></article></section>}
    <section className="retail-brief-band"><div><h2>Tell us what you&apos;re looking for</h2><p>Share your application and required quantity with our team.</p></div><Link href={quoteHref}>Share your brief <ArrowRight size={17}/></Link></section>
    <section className="retail-process"><h2>Our fragrance development &amp; manufacturing process</h2><div>{[["01", "Brief & insight", "Understand your needs and intended application."], ["02", "Concept & direction", "Develop a fragrance direction and sample plan."], ["03", "Sampling & refinement", "Evaluate and fine-tune the formula."], ["04", "Scale & delivery", "Manufacture and deliver the agreed product."]].map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    {(downloads.length > 0 || detail.faqs.length > 0) && <section className="retail-docs-faq retail-two-column">
      {downloads.length > 0 && <div><h2>Downloads</h2><div className="retail-downloads">{downloads.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><span>{item.title}<small>{item.note}</small></span><DownloadSimple size={19}/></a>)}</div></div>}
      {detail.faqs.length > 0 && <div><h2>FAQ</h2><div className="retail-faq">{detail.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div>}
    </section>}
    {related.length > 0 && <section className="retail-related"><h2>Related products</h2><div>{related.map((item) => {
      const availableVariant = item.retail_enabled ? item.variants.find((variant) => variant.is_active && variant.stock_quantity > variant.reserved_quantity) : null;
      return <Link href={`/products/${item.slug}`} key={item.id}><div>{(item.cover_url || item.hero_url) && <Image src={(item.cover_url || item.hero_url)!} alt={item.title} fill sizes="(max-width: 700px) 45vw, 20vw" />}</div><h3>{item.title}</h3><span>{availableVariant ? formatMoney(availableVariant.price_minor, availableVariant.currency) : "Explore product"}</span></Link>;
    })}</div></section>}
  </main><SiteFooter /></>;
}
