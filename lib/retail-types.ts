export type ProductImage = { url: string; alt: string };
export type DetailRow = { label: string; value: string };
export type ApplicationCard = { title: string; description: string; image: string; alt: string };
export type DownloadCard = { title: string; url: string; note: string };
export type Faq = { question: string; answer: string };

export type ProductDetail = {
  heroLine: string;
  heroDescription: string;
  defaultVariantSku: string;
  overview: string;
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
  technical: DetailRow[];
  applications: ApplicationCard[];
  dosage: DetailRow[];
  storage: string[];
  shipping: string[];
  retailBenefits: string[];
  customBenefits: string[];
  packagingIntro: string;
  packagingImage: string;
  downloads: DownloadCard[];
  faqs: Faq[];
  relatedSlugs: string[];
};

export type RetailVariant = {
  id: string;
  product_id: string;
  sku: string;
  label: string;
  price_minor: number;
  compare_at_minor: number | null;
  currency: string;
  stock_quantity: number;
  reserved_quantity: number;
  weight_grams: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type RetailProduct = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  badge: string | null;
  summary: string | null;
  content: string;
  application: string | null;
  cover_url: string | null;
  hero_url: string | null;
  gallery: ProductImage[];
  detail: ProductDetail;
  attachment_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: "draft" | "review" | "published" | "archived";
  retail_enabled: boolean;
  is_demo: boolean;
  content_categories?: { name: string } | null;
  variants: RetailVariant[];
};

export const emptyProductDetail: ProductDetail = {
  heroLine: "",
  heroDescription: "",
  defaultVariantSku: "",
  overview: "",
  topNotes: "",
  heartNotes: "",
  baseNotes: "",
  technical: [],
  applications: [],
  dosage: [],
  storage: [],
  shipping: [],
  retailBenefits: [],
  customBenefits: [],
  packagingIntro: "",
  packagingImage: "",
  downloads: [],
  faqs: [],
  relatedSlugs: [],
};

export function normalizeDetail(value: unknown): ProductDetail {
  const object = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const string = (key: keyof ProductDetail) => typeof object[key] === "string" ? String(object[key]) : "";
  const array = <T>(key: keyof ProductDetail) => Array.isArray(object[key]) ? object[key] as T[] : [];
  return {
    heroLine: string("heroLine"),
    heroDescription: string("heroDescription"),
    defaultVariantSku: string("defaultVariantSku"),
    overview: string("overview"),
    topNotes: string("topNotes"),
    heartNotes: string("heartNotes"),
    baseNotes: string("baseNotes"),
    technical: array<DetailRow>("technical"),
    applications: array<ApplicationCard>("applications"),
    dosage: array<DetailRow>("dosage"),
    storage: array<string>("storage"),
    shipping: array<string>("shipping"),
    retailBenefits: array<string>("retailBenefits"),
    customBenefits: array<string>("customBenefits"),
    packagingIntro: string("packagingIntro"),
    packagingImage: string("packagingImage"),
    downloads: array<DownloadCard>("downloads"),
    faqs: array<Faq>("faqs"),
    relatedSlugs: array<string>("relatedSlugs"),
  };
}

export function formatMoney(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}
