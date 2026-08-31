import Link from "next/link";
import Image from "next/image";
import { company } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-brand"><Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home"><Image src="/images/sai-zhao-logo.png" alt="" width={82} height={82} /><span>Sai Zhao<br /><small>FRAGRANCE</small></span></Link><p>{company.legalName}</p><p className="footer-positioning">Application-led fragrance development, sampling and production communication.</p></div>
      <div><h3>Company</h3><Link href="/about">About Us</Link><Link href="/capabilities">Capabilities</Link><Link href="/quality">Quality</Link></div>
      <div><h3>Resources</h3><Link href="/applications">Applications</Link><Link href="/resources">Fragrance Library</Link><Link href="/resources/faq">FAQs</Link></div>
      <div><h3>Get in touch</h3><p>Contact: {company.contactName}</p><a href={company.telephoneHref}>{company.telephone}</a><p className="footer-note">{company.address}.</p><Link href="/request-a-quote">Share your brief</Link><Link href="/privacy">Privacy notice</Link></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {company.brandName}</span><Link href="/sitemap.xml">Sitemap</Link><span>Public site: English</span></div>
    </footer>
  );
}
