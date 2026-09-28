export type CartLine = { variantId: string; productId: string; slug: string; title: string; label: string; image: string; quantity: number };
const key = "saizhao-retail-cart-v1";
export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data.filter((x) => x && typeof x.variantId === "string" && Number.isInteger(x.quantity) && x.quantity > 0).slice(0, 25) : [];
  } catch { return []; }
}
export function writeCart(lines: CartLine[]) {
  window.localStorage.setItem(key, JSON.stringify(lines));
  window.dispatchEvent(new Event("saizhao-cart-change"));
}
export function addCart(line: CartLine) {
  const lines = readCart();
  const existing = lines.find((item) => item.variantId === line.variantId);
  if (existing) existing.quantity = Math.min(20, existing.quantity + line.quantity);
  else lines.push(line);
  writeCart(lines);
}
