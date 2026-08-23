"use client";

import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  GlobeHemisphereWest,
  Flask,
  Leaf,
  List,
  Package,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

const applications = [
  {
    title: "Perfume",
    text: "Fine fragrance direction for signature personal-care experiences.",
    image: "/images/application-perfume.png",
    icon: Sparkle,
  },
  {
    title: "Candle",
    text: "Scent development for memorable warm and cold throw.",
    image: "/images/application-candle.png",
    icon: Flask,
  },
  {
    title: "Diffuser",
    text: "Elegant, long-lasting scents for reed and non-reed systems.",
    image: "/images/application-diffuser.png",
    icon: Leaf,
  },
  {
    title: "Home Care",
    text: "Fragrance direction for fabric, laundry and home-care applications.",
    image: "/images/application-home-care.png",
    icon: Package,
  },
];

const process = [
  ["01", "Brief & Insight", "Tell us the application, market and desired scent direction."],
  ["02", "Concept & Direction", "Our team develops an initial direction around your brief."],
  ["03", "Sampling & Refinement", "Evaluate, refine and align the scent with your product."],
  ["04", "Scale & Delivery", "Prepare the agreed formula for your production plan."],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitBrief = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main>
      <section className="hero" id="top">
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="Sai Zhao Fragrance home">
            <span>SAI ZHAO</span>
            <small>FRAGRANCE</small>
          </a>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle menu">
            {menuOpen ? <X size={24} /> : <List size={24} />}
          </button>
          <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="Primary navigation">
            <a href="#about">About Us</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#applications">Applications</a>
            <a href="#quality">Sourcing & Quality</a>
            <a href="#markets">Markets</a>
            <a href="#resources">Resources</a>
          </nav>
          <a className="button button-small header-cta" href="#brief">Share Your Brief <ArrowUpRight size={16} /></a>
        </header>

        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">GLOBAL B2B FRAGRANCE MANUFACTURER</p>
            <h1>Formulas<br />with feeling.</h1>
            <p className="lead">We develop fragrance solutions that help brands create products people remember.</p>
            <a className="button" href="#brief">Share Your Brief <ArrowUpRight size={18} /></a>
            <div className="proof-row" aria-label="Core strengths">
              <span><Sparkle size={20} /> Application-led<br />development</span>
              <span><Flask size={20} /> End-to-end<br />customization</span>
              <span><CheckCircle size={20} /> Quality-focused<br />production</span>
              <span><GlobeHemisphereWest size={20} /> Export-ready<br />support</span>
            </div>
          </div>
          <div className="hero-image-wrap">
            <Image src="/images/hero-fragrance-still-life.png" alt="Amber fragrance bottles, aromatic botanicals and citrus in a warm studio" fill priority sizes="(max-width: 800px) 100vw, 52vw" className="cover-image" />
          </div>
        </div>
      </section>

      <section className="applications section" id="applications">
        <div className="section-intro">
          <p className="eyebrow">MADE FOR EVERY APPLICATION</p>
          <h2>Scents that bring products to life.</h2>
          <p>Explore a clear application-led route into custom fragrance development.</p>
        </div>
        <div className="application-grid">
          {applications.map(({ title, text, image, icon: Icon }) => (
            <article className="application-card" key={title}>
              <Image src={image} alt={`${title} fragrance application`} width={700} height={700} className="card-image" />
              <div className="application-card-copy">
                <span className="icon-chip"><Icon size={21} weight="light" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="#brief" aria-label={`Discuss ${title} fragrance development`}>Discuss application <ArrowRight size={15} /></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section section" id="capabilities">
        <div className="process-image">
          <Image src="/images/sai-zhao-factory-gate.png" alt="Zhejiang Sai Zhao Flavor And Fragrance factory entrance" fill sizes="(max-width: 800px) 100vw, 45vw" className="cover-image" />
        </div>
        <div className="process-copy">
          <p className="eyebrow">OUR CUSTOMIZATION METHOD</p>
          <h2>Your vision.<br />Our expertise.</h2>
          <p>From first inspiration to a production-ready formula, each stage keeps your application and brand direction in view.</p>
          <ol className="process-list">
            {process.map(([number, title, text]) => (
              <li key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="quality section" id="quality">
        <div className="quality-copy">
          <p className="eyebrow eyebrow-light">SOURCING & MANUFACTURING ASSURANCE</p>
          <h2>Built on quality.<br />Delivered with care.</h2>
          <p>Quality starts with a clear brief, thoughtful formulation and a disciplined route from sample to supply.</p>
          <ul>
            <li><CheckCircle size={18} weight="fill" /> Application-conscious development</li>
            <li><CheckCircle size={18} weight="fill" /> Sample refinement before scale-up</li>
            <li><CheckCircle size={18} weight="fill" /> Factory-led production communication</li>
            <li><CheckCircle size={18} weight="fill" /> Documentation available upon confirmation</li>
          </ul>
        </div>
        <div className="quality-image">
          <Image src="/images/sai-zhao-factory-gate.png" alt="Sai Zhao manufacturing facility" fill sizes="(max-width: 800px) 100vw, 52vw" className="cover-image" />
        </div>
      </section>

      <section className="markets section" id="markets">
        <div className="markets-copy">
          <p className="eyebrow">GLOBAL MARKETS</p>
          <h2>A partner for brands building scent-led products.</h2>
          <p>We structure each project around the application, desired market, sample process and next production step.</p>
          <a href="#brief" className="text-link">Start a conversation <ArrowRight size={17} /></a>
        </div>
        <div className="map-wrap">
          <Image src="/images/global-market-map.png" alt="Stylized global market map" width={1600} height={900} className="map-image" />
        </div>
        <aside className="brief-card" id="brief">
          <p className="eyebrow">READY TO CREATE SOMETHING MEMORABLE?</p>
          <h2>Share your brief with our team.</h2>
          {submitted ? (
            <div className="success-state"><CheckCircle size={32} weight="fill" /><p>Thank you. Your brief has been saved in this local preview.</p><button onClick={() => setSubmitted(false)}>Send another brief</button></div>
          ) : (
            <form onSubmit={submitBrief}>
              <label><span>Name</span><input required name="name" placeholder="Your name" /></label>
              <label><span>Work email</span><input required type="email" name="email" placeholder="you@company.com" /></label>
              <label><span>Project type</span><select name="project"><option>Fine fragrance</option><option>Home fragrance</option><option>Home care</option><option>Other</option></select></label>
              <button className="button" type="submit">Share Your Brief <ArrowUpRight size={18} /></button>
            </form>
          )}
        </aside>
      </section>

      <footer className="footer" id="about">
        <div className="footer-brand"><a className="wordmark" href="#top"><span>SAI ZHAO</span><small>FRAGRANCE</small></a><p>Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.</p></div>
        <div><h3>Company</h3><a href="#about">About Us</a><a href="#capabilities">Capabilities</a><a href="#quality">Quality</a></div>
        <div id="resources"><h3>Resources</h3><a href="#applications">Applications</a><a href="#brief">Request a sample</a><a href="#brief">FAQs</a></div>
        <div><h3>Get in touch</h3><a href="#brief">Share your brief</a><a href="#brief">Contact the export team</a><p className="footer-note">Official contact details will be added from the verified company source files.</p></div>
      </footer>
    </main>
  );
}
