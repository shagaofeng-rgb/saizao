"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/retail-types";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (!active) {
    return <div className="retail-product-gallery retail-product-gallery-empty"><p>Product image unavailable</p></div>;
  }

  return <div className={`retail-product-gallery${images.length === 1 ? " retail-product-gallery-single" : ""}`} aria-label="Product image gallery">
    {images.length > 1 && <div className="retail-product-thumbnails" role="group" aria-label="Choose product image">
      {images.map((image, index) => <button
        type="button"
        key={`${image.url}-${index}`}
        aria-label={`View image ${index + 1} of ${images.length}`}
        aria-pressed={index === activeIndex}
        onClick={() => setActiveIndex(index)}
      ><Image src={image.url} alt="" fill unoptimized={process.env.NODE_ENV === "development"} sizes="(max-width: 650px) 72px, 100px" /></button>)}
    </div>}
    <div className="retail-product-stage">
      <Image
        key={active.url}
        src={active.url}
        alt={active.alt || title}
        fill
        priority={activeIndex === 0}
        unoptimized={process.env.NODE_ENV === "development"}
        sizes="(max-width: 900px) 100vw, 48vw"
      />
      {images.length > 1 && <span className="retail-product-image-count" aria-live="polite">{activeIndex + 1} / {images.length}</span>}
    </div>
  </div>;
}
