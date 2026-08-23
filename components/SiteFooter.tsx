import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-brand"><Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home"><Image src="/images/sai-zhao-logo.png" alt="Sai Zhao Fragrance" width={82} height={82} /><span>Sai Zhao<br /><small>FRAGRANCE</small></span></Link><p>Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.</p></div>
      <div><h3>Company</h3><Link href="/about">About Us</Link><Link href="/capabilities">Capabilities</Link><Link href="/quality">Quality</Link></div>
      <div><h3>Resources</h3><Link href="/applications">Applications</Link><Link href="/resources">Fragrance Library</Link><Link href="/resources/faq">FAQs</Link></div>
      <div><h3>Get in touch</h3><Link href="/request-a-quote">Share your brief</Link><Link href="/contact">Contact the export team</Link><p className="footer-note">Official contact details will be added from verified company source files.</p></div>
    </footer>
  );
}
