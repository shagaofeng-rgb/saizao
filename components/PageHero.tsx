import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/UiIcons";

export function PageHero({ eyebrow, title, intro, image, cta = true }: { eyebrow: string; title: string; intro: string; image: string; cta?: boolean }) {
  return (
    <section className="page-hero">
      <div className="page-hero-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lead">{intro}</p>{cta && <Link className="button" href="/request-a-quote">Share Your Brief <ArrowUpRight size={18} /></Link>}</div>
      <div className="page-hero-image"><Image src={image} alt="Sai Zhao fragrance development" fill priority sizes="(max-width: 800px) 100vw, 48vw" className="cover-image" /></div>
    </section>
  );
}
