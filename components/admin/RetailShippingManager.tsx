"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Zone = { country_code: string; country_name: string; rate_minor: number; free_over_minor: number | null; tax_rate_bps: number; estimated_days: string | null; enabled: boolean };
const blank: Zone = { country_code: "", country_name: "", rate_minor: 0, free_over_minor: null, tax_rate_bps: 0, estimated_days: null, enabled: false };
const pageSize = 10;

export function RetailShippingManager() {
  const [zones, setZones] = useState<Zone[]>([]), [form, setForm] = useState<Zone>(blank);
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading"), [page, setPage] = useState(1), [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setReadState("loading"); setZones([]);
    try {
      const response = await fetch("/api/admin/retail/shipping", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) { setReadState("error"); return; }
      setZones(result.data); setReadState("ready");
    } catch { setReadState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/retail/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      setMessage(response.ok ? "配送区域已保存。" : result.message ?? "保存失败。");
      if (response.ok) { setForm(blank); void load(); }
    } catch { setMessage("保存失败，请重试。"); }
    setBusy(false);
  }
  const filtered = zones.filter((zone) => `${zone.country_name} ${zone.country_code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>配送区域</h1><p className="admin-subtitle">管理已核实可配送国家的运费和税率规则。</p></div></header><section className="admin-split">
    <form className="admin-editor" onSubmit={save}><h2>{form.country_code ? `编辑 ${form.country_code}` : "新增区域"}</h2><div className="admin-form-grid"><label>国家代码（ISO 2 位）<input required maxLength={2} value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value.toUpperCase() })} /></label><label>国家名称<input required value={form.country_name} onChange={(event) => setForm({ ...form, country_name: event.target.value })} /></label><label>运费（美元分）<input type="number" min="0" required value={form.rate_minor} onChange={(event) => setForm({ ...form, rate_minor: Number(event.target.value) })} /></label><label>满额免运费（美元分，可留空）<input type="number" min="0" value={form.free_over_minor ?? ""} onChange={(event) => setForm({ ...form, free_over_minor: event.target.value === "" ? null : Number(event.target.value) })} /></label><label>税率（基点，100=1%）<input type="number" min="0" max="10000" value={form.tax_rate_bps} onChange={(event) => setForm({ ...form, tax_rate_bps: Number(event.target.value) })} /></label><label>预计送达时间<input value={form.estimated_days || ""} onChange={(event) => setForm({ ...form, estimated_days: event.target.value })} /></label><label>状态<select value={form.enabled ? "on" : "off"} onChange={(event) => setForm({ ...form, enabled: event.target.value === "on" })}><option value="off">关闭</option><option value="on">开启</option></select></label></div><button className="admin-primary" disabled={busy}>{busy ? "保存中…" : "保存区域"}</button><p role="status" className="admin-feedback">{message}</p></form>
    <section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><div><h2>已配置区域</h2><p className="admin-panel-subtitle">来源：配送区域记录。</p></div></div><div className="admin-list-filters"><label>搜索国家<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label></div><div className="admin-table-scroll"><table><thead><tr><th>国家</th><th>运费</th><th>税率</th><th>状态</th><th>操作</th></tr></thead><tbody>{readState === "loading" ? <tr><td colSpan={5} className="admin-empty">正在读取配送区域…</td></tr> : readState === "error" ? <tr><td colSpan={5} className="admin-empty" role="alert">读取失败，请重试。</td></tr> : visible.length ? visible.map((zone) => <tr key={zone.country_code}><td>{zone.country_name} ({zone.country_code})</td><td>${(zone.rate_minor / 100).toFixed(2)}</td><td>{(zone.tax_rate_bps / 100).toFixed(2)}%</td><td>{zone.enabled ? "已开启" : "已关闭"}</td><td><button className="admin-row-action" type="button" onClick={() => setForm(zone)}>编辑</button></td></tr>) : <tr><td colSpan={5} className="admin-empty">暂无符合条件的配送区域</td></tr>}</tbody></table></div>{readState === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}{readState === "ready" && <div className="admin-pagination"><span>共 {filtered.length} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}</section>
  </section></section></AdminShell>;
}
