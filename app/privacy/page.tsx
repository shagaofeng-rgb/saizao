import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { company } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How Sai Zhao Fragrance handles website analytics and project enquiry information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main id="main-content">
      <SiteHeader />
      <article className="legal-page">
        <header><h1>Privacy notice</h1><p>How this website handles optional analytics and the information you send with a project enquiry.</p></header>
        <section><h2>Who handles the information</h2><p>{company.legalName}, at {company.address}, operates this website. For privacy questions, contact {company.contactName} by telephone at <a href={company.telephoneHref}>{company.telephone}</a>.</p></section>
        <section><h2>Project enquiries</h2><p>When you submit the brief form, we use the name, business contact details, company, market, application and project information you provide to review and respond to the enquiry. We also retain basic source and landing-page information so the team can understand how the enquiry arrived.</p></section>
        <section><h2>Optional website analytics</h2><p>Analytics only starts after you choose “Allow analytics”. The site then assigns random visitor and session identifiers and records page paths, referring page, campaign parameters, approximate country or region, masked IP information and a one-way IP hash. We do not use advertising cookies or sell visitor data.</p></section>
        <section><h2>Storage and access</h2><p>Website data is held in restricted operational systems used by Sai Zhao and its hosting and database providers. Public browser credentials cannot read the enquiry or analytics tables. Access is limited to the private admin interface and server-side services.</p></section>
        <section><h2>Your choices</h2><p>You can select “Essential only” in the analytics notice and still use the whole website and enquiry form. You may clear the site’s local storage and cookies in your browser to reset that choice. To ask about, correct, or request deletion of enquiry information, contact the company using the details above.</p></section>
        <p className="legal-updated">Last updated: 30 August 2026</p>
        <Link className="text-link" href="/contact">Contact Sai Zhao</Link>
      </article>
      <SiteFooter />
    </main>
  );
}
