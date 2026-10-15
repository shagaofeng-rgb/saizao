"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDateRange } from "@/components/admin/AdminDateRange";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDateRangeValue, adminDateRange, validAdminDateRange } from "@/lib/admin-date-range";

type Section = { state: string; clicks?: number; impressions?: number; users?: number; sessions?: number; siteUrl?: string };
type Run = { id: string; status: string; period_from: string; period_to: string; started_at: string; result: { searchConsole?: Section; analytics?: Section } };
const stateLabels: Record<string, string> = { ready: "已取得数据", not_configured: "尚未配置", not_authorized: "未授权", unavailable: "暂时不可用" };
const runLabels: Record<string, string> = { running: "运行中", completed: "完成", partial: "部分完成", failed: "未完成" };
export function GoogleSyncCenter() {
  const [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [items, setItems] = useState<Run[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"), [running, setRunning] = useState(false), [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`/api/admin/sync?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error();
      setItems(result.data); setTotal(result.total); setState("ready");
    } catch { setItems([]); setState("error"); }
  }, [page, pageSize]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function run() {
    if (!validAdminDateRange(range)) return;
    setRunning(true); setMessage("");
    try {
      const response = await fetch("/api/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: range.from, to: range.to }) });
      const result = await response.json();
      setMessage(response.ok ? `核验${runLabels[result.status] || "已结束"}；以下显示对应时间段的真实接口结果。` : result.message || "核验失败。");
      if (response.ok) { setPage(1); void load(); }
    } catch { setMessage("核验失败，请稍后重试。"); }
    setRunning(false);
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>Google 数据核验</h1><p className="admin-subtitle">手动读取 Search Console 和 GA4 的真实接口结果，并保存每次核验状态；不会生成或补齐缺失数据。</p></div></header>
    <section className="admin-filters admin-sync-filters"><AdminDateRange id="sync" value={range} onChange={setRange} /><button type="button" disabled={running || !validAdminDateRange(range)} onClick={() => void run()}>{running ? "正在核验…" : "开始核验"}</button></section>
    <p role="status" className="admin-feedback admin-sync-feedback">{message}</p>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>核验历史</h2><p className="admin-panel-subtitle">数据为核验发生时的快照；网站概览仍直接查询所选时间范围。</p></div><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>20</option><option>50</option><option>100</option></select></label></div>
      <div className="admin-table-scroll"><table><thead><tr><th>核验时间</th><th>数据范围</th><th>状态</th><th>Search Console</th><th>GA4</th></tr></thead><tbody>{state === "loading" ? <tr><td colSpan={5} className="admin-empty">正在读取核验记录…</td></tr> : state === "error" ? <tr><td colSpan={5} className="admin-empty" role="alert">无法读取核验记录。</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td>{new Date(item.started_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</td><td>{item.period_from} — {item.period_to}</td><td><span className="admin-tag">{runLabels[item.status] || item.status}</span></td><td>{item.result.searchConsole?.state === "ready" ? `${item.result.searchConsole.clicks ?? 0} 次点击 · ${item.result.searchConsole.impressions ?? 0} 次展示` : stateLabels[item.result.searchConsole?.state || ""] || "等待结果"}</td><td>{item.result.analytics?.state === "ready" ? `${item.result.analytics.users ?? 0} 位用户 · ${item.result.analytics.sessions ?? 0} 次会话` : stateLabels[item.result.analytics?.state || ""] || "等待结果"}</td></tr>) : <tr><td colSpan={5} className="admin-empty">尚未执行过核验。</td></tr>}</tbody></table></div>{state === "error" && <button type="button" className="admin-row-action" onClick={() => void load()}>重试</button>}{state === "ready" && <div className="admin-pagination"><span>共 {total} 次 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}
