import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { ScrollProgress } from "@/components/ScrollProgress";
import { StickyContact } from "@/components/StickyContact";
import { company, siteUrl } from "@/lib/site-data";
import "./globals.css";

const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const displayFont = Newsreader({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sai Zhao Fragrance | Custom Fragrance Development",
    template: "%s | Sai Zhao Fragrance",
  },
  description:
    "Application-led fragrance development and manufacturing support for international brands.",
  openGraph: {
    type: "website",
    siteName: company.brandName,
    title: "Sai Zhao Fragrance | Custom Fragrance Development",
    description: "Application-led fragrance development and manufacturing support for international brands.",
    url: siteUrl,
    images: [{ url: "/images/hero-fragrance-still-life.jpg", width: 1200, height: 630, alt: "Sai Zhao fragrance development" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sai Zhao Fragrance | Custom Fragrance Development",
    description: "Application-led fragrance development and manufacturing support for international brands.",
    images: ["/images/hero-fragrance-still-life.jpg"],
  },
  icons: { icon: "/images/sai-zhao-logo.png", apple: "/images/sai-zhao-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.legalName,
    alternateName: company.brandName,
    url: siteUrl,
    telephone: "+86-137-0178-0563",
    address: {
      "@type": "PostalAddress",
      streetAddress: "No. 13, Xinggong North Road, Jiangshan Economic Development Zone (Jiangdong District)",
      addressLocality: "Quzhou",
      addressRegion: "Zhejiang",
      postalCode: "324100",
      addressCountry: "CN",
    },
  };
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}><a className="skip-link" href="#main-content">Skip to content</a><AnalyticsTracker /><ScrollProgress />{children}<StickyContact /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} /></body>
    </html>
  );
}
