import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sai Zhao Fragrance | Custom Fragrance Development",
  description:
    "Custom fragrance development and manufacturing for international brands.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
