export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saizao-davidsha.vercel.app";

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
    image: "/images/application-perfume.png",
    description: "Custom fragrance direction for personal-care and fine-fragrance concepts that need a distinct point of view.",
    applications: ["Eau de parfum", "Body mist", "Personal-care fragrance", "Brand scent concepts"],
    focus: ["Brief-led scent direction", "Sampling and refinement", "Application-aligned development"],
  },
  {
    slug: "candle",
    title: "Candle",
    eyebrow: "ATMOSPHERE IN EVERY LIGHT",
    image: "/images/application-candle.png",
    description: "Fragrance development for candle concepts, shaped around the mood, material system and desired scent experience.",
    applications: ["Container candles", "Wax melts", "Seasonal collections", "Gifting concepts"],
    focus: ["Warm and cold scent direction", "Collection development", "Sample-based refinement"],
  },
  {
    slug: "diffuser",
    title: "Home Fragrance",
    eyebrow: "A LASTING SENSE OF PLACE",
    image: "/images/application-diffuser.png",
    description: "Elegant scent concepts for reed diffusers and other home-fragrance systems, developed around the intended space and brand mood.",
    applications: ["Reed diffuser", "Room fragrance", "Home scent collections", "Seasonal home fragrance"],
    focus: ["Scent character and direction", "System-aware development", "Sampling for evaluation"],
  },
  {
    slug: "home-care",
    title: "Home & Fabric Care",
    eyebrow: "CLEAN, COMFORTING, MEMORABLE",
    image: "/images/application-home-care.png",
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
