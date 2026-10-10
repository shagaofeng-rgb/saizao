"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDateRange } from "@/components/admin/AdminDateRange";
import { AdminDateRangeValue, adminDateQuery, adminDateRange, validAdminDateRange } from "@/lib/admin-date-range";
import { formatMoney } from "@/lib/retail-types";

type Order = { id: string; order_number: string; buyer_name: string; buyer_email: string; country_code: string; total_minor: number; currency: string; status: string; fulfillment_status: string; tracking_number: string | null; carrier: string | null; created_at: string; retail_order_items: { id: string; product_title: string; variant_label: string; quantity: number; line_total_minor: number }[] };

export function RetailOrdersManager({ canManage }: { canManage: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]), [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const [status, setStatus] = useState(""), [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading"), [message, setMessage] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!validAdminDateRange(range)) return;
    const id = ++requestId.current;
    setReadState("loading"); setOrders([]); setTotal(0);
    const params = new URLSearchParams({ page: String(page), pageSize: "10", ...adminDateQuery(range) });
    if (status) params.set("status", status);
    try {
      const response = await fetch(`/api/admin/retail/orders?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok || !Array.isArray(result.data)) { setReadState("error"); return; }
      setOrders(result.data); setTotal(result.total); setReadState("ready");
    } catch { if (id === requestId.current) setReadState("error"); }
  }, [page, status, range]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function save(order: Order, fulfillment_status: string, carrier: string, tracking_number: string) {
    try {
      const response = await fetch(`/api/admin/retail/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fulfillment_status, carrier, tracking_number }) });
      const result = await response.json();
      setMessage(response.ok ? "订单已更新。" : result.message ?? "保存失败。");
      if (response.ok) void load();
    } catch { setMessage("保存失败，请重试。"); }
  }
  const pages = Math.max(1, Math.ceil(total / 10));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>零售订单</h1><p className="admin-subtitle">订单来自实际结算记录；支付状态与履约状态分别显示。</p></div></header>
    <section className="admin-filters" aria-label="订单筛选"><AdminDateRange id="orders" value={range} onChange={(value) => { setRange(value); setPage(1); }} /><label>支付状态<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">全部状态</option><option value="pending">待支付</option><option value="paid">已支付</option><option value="cancelled">已取消</option><option value="expired">已过期</option><option value="refunded">已退款</option></select></label><button type="button" onClick={() => void load()} disabled={!validAdminDateRange(range) || readState === "loading"}>查询</button></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>订单记录</h2><p className="admin-panel-subtitle">来源：零售订单及订单商品记录。</p></div></div><p role="status" className="admin-feedback">{message}</p>
      {readState === "loading" ? <p className="admin-empty">正在读取订单…</p> : readState === "error" ? <div className="admin-empty" role="alert">订单读取失败。<button className="admin-row-action" type="button" onClick={() => void load()}>重试</button></div> : orders.length ? orders.map((order) => <OrderCard key={order.id} order={order} save={save} canManage={canManage} />) : <p className="admin-empty">所选时间内暂无订单记录</p>}
      {readState === "ready" && <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}

function OrderCard({ order, save, canManage }: { order: Order; save: (order: Order, fulfillment: string, carrier: string, tracking: string) => Promise<void>; canManage: boolean }) {
  const [fulfillment, setFulfillment] = useState(order.fulfillment_status), [carrier, setCarrier] = useState(order.carrier || ""), [tracking, setTracking] = useState(order.tracking_number || "");
  return <details className="retail-admin-order"><summary><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleString("zh-CN")}</span><span>{order.buyer_name}</span><b>{formatMoney(order.total_minor, order.currency)}</b></summary><div className="retail-admin-order-details"><p>{order.buyer_email} · {order.country_code}</p><p>支付：{order.status} · 履约：{order.fulfillment_status}</p><ul>{order.retail_order_items.map((item) => <li key={item.id}>{item.product_title} · {item.variant_label} × {item.quantity} — {formatMoney(item.line_total_minor)}</li>)}</ul>{order.status === "paid" && canManage && <div className="retail-order-actions"><select aria-label="履约状态" value={fulfillment} onChange={(event) => setFulfillment(event.target.value)}><option value="unfulfilled">未履约</option><option value="packed">已打包</option><option value="shipped">已发货</option><option value="delivered">已送达</option></select><input placeholder="承运商" aria-label="承运商" value={carrier} onChange={(event) => setCarrier(event.target.value)} /><input placeholder="运单号" aria-label="运单号" value={tracking} onChange={(event) => setTracking(event.target.value)} /><button type="button" onClick={() => void save(order, fulfillment, carrier, tracking)}>保存</button></div>}</div></details>;
}
