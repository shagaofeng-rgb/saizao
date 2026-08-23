import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-brand"><Link className="logo-lockup" href="/" aria-label="Sai Zhao Fragrance home"><Image src="/images/sai-zhao-logo.png" alt="Sai Zhao Fragrance" width={82} height={82} /><span>Sai Zhao<br /><small>FRAGRANCE</small></span></Link><p>Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.</p></div>
      <div><h3>Company</h3><Link href="/about">About Us</Link><Link href="/capabilities">Capabilities</Link><Link href="/quality">Quality</Link></div>
      <div><h3>Resources</h3><Link href="/applications">Applications</Link><Link href="/resources">Fragrance Library</Link><Link href="/resources/faq">FAQs</Link></div>
      <div><h3>Get in touch</h3><p>Contact: Wang Jiahong</p><a href="tel:+8613701780563">+86 137 0178 0563</a><p className="footer-note">No. 13, Xinggong North Road, Jiangshan Economic Development Zone (Jiangdong District), Quzhou, Zhejiang, China 324100.</p><Link href="/request-a-quote">Share your brief</Link></div>
    </footer>
  );
}
