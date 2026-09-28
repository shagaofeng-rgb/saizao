"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCart } from "@/lib/retail-cart";
import { formatMoney, type RetailProduct } from "@/lib/retail-types";

export function ProductPurchase({ product, preview = false, checkoutEnabled = false }: { product: RetailProduct; preview?: boolean; checkoutEnabled?: boolean }) {
  const router = useRouter();
  const variants = product.variants.filter((variant) => variant.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const [selectedId, setSelectedId] = useState(variants.find((variant) => variant.sku === product.detail.defaultVariantSku)?.id || variants[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const selected = variants.find((variant) => variant.id === selectedId);
  const available = selected ? Math.max(0, selected.stock_quantity - selected.reserved_quantity) : 0;
  const canPurchase = checkoutEnabled && !preview && !product.is_demo && product.retail_enabled && product.status === "published" && available > 0;
  function add(buyNow = false) {
    if (!selected || !canPurchase) return;
    addCart({ variantId: selected.id, productId: product.id, slug: product.slug, title: product.title, label: selected.label, image: selected.image_url || product.cover_url || product.hero_url || "", quantity });
    if (buyNow) router.push("/checkout");
    else setMessage("Added to your cart.");
  }
  return <div className="retail-purchase">
    {selected && <p className="retail-price">{formatMoney(selected.price_minor, selected.currency)}{selected.compare_at_minor && selected.compare_at_minor > selected.price_minor ? <del>{formatMoney(selected.compare_at_minor, selected.currency)}</del> : null}</p>}
    {variants.length > 0 && <><span className="retail-field-label">Volume</span><div className="retail-variants" role="group" aria-label="Choose volume">{variants.map((variant) => <button type="button" key={variant.id} aria-pressed={selectedId === variant.id} onClick={() => { setSelectedId(variant.id); setQuantity(1); }}>{variant.label}</button>)}</div></>}
    {selected && <><span className="retail-field-label">Quantity</span><div className="retail-quantity-row"><div className="retail-stepper"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((n) => Math.max(1, n - 1))}>−</button><output>{quantity}</output><button type="button" aria-label="Increase quantity" disabled={quantity >= Math.min(20, available)} onClick={() => setQuantity((n) => Math.min(Math.min(20, available), n + 1))}>+</button></div><span>{preview ? "Preview only" : available > 0 ? `${available} in stock` : "Out of stock"}</span></div></>}
    <div className="retail-buy-actions"><button type="button" className="retail-solid" disabled={!canPurchase} onClick={() => add(true)}>Buy now</button><button type="button" className="retail-outline" disabled={!canPurchase} onClick={() => add()}>Add to cart</button></div>
    {!canPurchase && <p className="retail-availability">{preview || product.is_demo ? "Design preview — this example is not available to buy." : !checkoutEnabled ? "Online ordering is not yet available. Please contact our team." : !variants.length ? "Retail pricing and sizes will appear when available." : "This item is currently unavailable online."}</p>}
    <p className="retail-purchase-message" role="status">{message}</p>
  </div>;
}
