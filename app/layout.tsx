import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sai Zhao Fragrance | Custom Fragrance Development",
  description:
    "Custom fragrance development and manufacturing for international brands.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.",
    alternateName: "Sai Zhao Fragrance",
    url: "https://saizao-davidsha.vercel.app",
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
    <html lang="en">
      <body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} /></body>
    </html>
  );
}
