export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.szxj6899.com").replace(/\/$/, "");

export const company = {
  legalName: "Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.",
  brandName: "Sai Zhao Fragrance",
  contactName: "Wang Jiahong",
  telephone: "+86 137 0178 0563",
  telephoneHref: "tel:+8613701780563",
  whatsAppUrl: "https://wa.me/8613701780563",
  address: "No. 13, Xinggong North Road, Jiangshan Economic Development Zone (Jiangdong District), Quzhou, Zhejiang, China 324100",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=28.808416854519283%2C118.72345789315749",
  googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2988.4615546210753!2d118.72345789315749!3d28.808416854519283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3448212a0f72457d%3A0xefb78d3325541895!2s13%20Xinggong%20N%20Rd%2C%20Jiang%20Shan%20Shi%2C%20Qu%20Zhou%20Shi%2C%20Zhe%20Jiang%20Sheng%2C%20China%2C%20324013!5e1!3m2!1sen!2suk!4v1789374963899!5m2!1sen!2suk",
};

export const primaryNav = [
  { href: "/about", label: "About Us" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/applications", label: "Applications" },
  { href: "/quality", label: "Sourcing & Quality" },
  { href: "/markets", label: "Markets" },
  { href: "/resources", label: "Resources" },
];

export type Application = {
  slug: string;
  title: string;
  eyebrow: string;
  image: string;
  description: string;
  applications: string[];
  focus: string[];
};

export const applications: Application[] = [
  {
    slug: "perfume",
    title: "Fine Fragrance",
    eyebrow: "PERSONAL EXPRESSION, CRAFTED WITH PURPOSE",
    image: "/images/application-perfume.jpg",
    description: "Custom fragrance direction for personal-care and fine-fragrance concepts that need a distinct point of view.",
    applications: ["Eau de parfum", "Body mist", "Personal-care fragrance", "Brand scent concepts"],
    focus: ["Brief-led scent direction", "Sampling and refinement", "Application-aligned development"],
  },
  {
    slug: "candle",
    title: "Candle",
    eyebrow: "ATMOSPHERE IN EVERY LIGHT",
    image: "/images/application-candle.jpg",
    description: "Fragrance development for candle concepts, shaped around the mood, material system and desired scent experience.",
    applications: ["Container candles", "Wax melts", "Seasonal collections", "Gifting concepts"],
    focus: ["Warm and cold scent direction", "Collection development", "Sample-based refinement"],
  },
  {
    slug: "diffuser",
    title: "Home Fragrance",
    eyebrow: "A LASTING SENSE OF PLACE",
    image: "/images/application-diffuser.jpg",
    description: "Elegant scent concepts for reed diffusers and other home-fragrance systems, developed around the intended space and brand mood.",
    applications: ["Reed diffuser", "Room fragrance", "Home scent collections", "Seasonal home fragrance"],
    focus: ["Scent character and direction", "System-aware development", "Sampling for evaluation"],
  },
  {
    slug: "home-care",
    title: "Home & Fabric Care",
    eyebrow: "CLEAN, COMFORTING, MEMORABLE",
    image: "/images/application-home-care.jpg",
    description: "Fragrance direction for laundry, fabric and home-care concepts where the product experience continues after use.",
    applications: ["Laundry care", "Fabric care", "Surface care", "Home-care product lines"],
    focus: ["Application-first brief", "Scent profile refinement", "Production planning support"],
  },
];

export const capabilities = [
  ["Custom Development", "Turn a market, product and scent brief into an initial fragrance direction."],
  ["Sampling & Refinement", "Use samples to compare, adjust and align the concept before the next production step."],
  ["OEM / ODM Support", "Build a clearer path from product concept through fragrance development and supply planning."],
  ["Scale-up Communication", "Keep product, sampling and manufacturing conversations connected as a project progresses."],
];

export function applicationImageAlt(title: string) {
  return title.endsWith("Fragrance") ? `${title} application` : `${title} fragrance application`;
}
