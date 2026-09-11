"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { GoogleReporting } from "@/lib/google-reporting";

type Metrics = { visitors: number; sessions: number; pageViews: number; leads: number; excluded: number };
type Visitor = { anonymousId: string; country: string; source: string; visits: number; lastSeen: string; latestPage: string; classification: string; ipMasked: string };
type Lead = { name: string; company: string; country: string; source: string; createdAt: string; status: string };
type Dashboard = { metrics: Metrics; countries: { label: string; value: number }[]; sources: { label: string; value: number }[]; pages: { label: string; value: number }[]; visitors: Visitor[]; visitorTotal: number; leads: Lead[] };

const empty: Dashboard = { metrics: { visitors: 0, sessions: 0, pageViews: 0, leads: 0, excluded: 0 }, countries: [], sources: [], pages: [], visitors: [], visitorTotal: 0, leads: [] };
const emptyGoogle: GoogleReporting = { searchConsole: { state: "not_configured" }, analytics: { state: "not_configured" } };

function date(value: Date) { return value.toISOString().slice(0, 10); }
const sourceLabels: Record<string, string> = { direct: "直接访问", google: "Google", linkedin: "LinkedIn" };
const statusLabels: Record<string, string> = { new: "新询盘", qualified: "已确认", contacted: "已联系", closed: "已完成" };
function displayValue(value: string, fallback: string) { return value ? sourceLabels[value.toLowerCase()] ?? value : fallback; }

export function AdminDashboard() {
  const today = date(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<Dashboard>(empty);
  const [state, setState] = useState<"loading" | "ready" | "setup" | "error">("loading");
  const [google, setGoogle] = useState<GoogleReporting>(emptyGoogle);
  const [googleState, setGoogleState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const query = new URLSearchParams({ from: new Date(`${from}T00:00:00Z`).toISOString(), to: new Date(`${to}T23:59:59Z`).toISOString(), page: String(page), pageSize: String(pageSize) });
    if (country) query.set("country", country);
    if (source) query.set("source", source);
    const response = await fetch(`/api/admin/overview?${query}`, { cache: "no-store" });
    if (response.status === 503) { setState("setup"); return; }
    if (!response.ok) { setState("error"); return; }
    const result = await response.json();
    setData(result.data ?? empty);
    setState("ready");
  }, [from, to, country, source, page, pageSize]);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);

  const loadGoogle = useCallback(async () => {
    setGoogleState("loading");
    const response = await fetch(`/api/admin/google?${new URLSearchParams({ from, to })}`, { cache: "no-store" });
    if (!response.ok) { setGoogleState("error"); return; }
    const result = await response.json();
    setGoogle(result.data ?? emptyGoogle);
    setGoogleState("ready");
  }, [from, to]);

  useEffect(() => { const timeout = window.setTimeout(() => void loadGoogle(), 0); return () => window.clearTimeout(timeout); }, [loadGoogle]);

  function refresh() {
    void load();
    void loadGoogle();
  }

  const totalPages = Math.max(1, Math.ceil(data.visitorTotal / pageSize));

  return <AdminShell><section id="main-content" className="admin-content">
      <header className="admin-header">
        <div><h1>运营概览</h1><p className="admin-subtitle">网站访问与询盘数据</p></div>
      </header>

      <section className="admin-filters" aria-label="数据筛选">
        <label>开始日期<input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>结束日期<input type="date" value={to} min={from} max={today} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        <label>国家 / 地区<input value={country} placeholder="如 AE、US、SA" onChange={(event) => { setCountry(event.target.value.toUpperCase()); setPage(1); }} /></label>
        <label>来源渠道<input value={source} placeholder="如 google、linkedin" onChange={(event) => { setSource(event.target.value); setPage(1); }} /></label>
        <button onClick={refresh}>应用筛选</button>
      </section>

      <GooglePanel data={google} state={googleState} onRefresh={refresh} />

      {state === "setup" ? <section className="admin-callout"><h2>数据服务尚未连接</h2><p>暂无可用数据。</p></section> : <>
        <section id="overview" className="admin-metrics">
          {[["有效访客", data.metrics.visitors], ["有效会话", data.metrics.sessions], ["页面浏览", data.metrics.pageViews], ["新增询盘", data.metrics.leads], ["已排除流量", data.metrics.excluded]].map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{state === "loading" ? "—" : value}</strong><small>{label === "已排除流量" ? "不计入经营报表" : "当前筛选周期"}</small></article>)}
        </section>

        {state === "error" ? <section className="admin-callout"><h2>暂时无法读取数据</h2><p>请检查 Supabase 连接、数据库脚本与管理员环境变量。</p></section> : <>
          <section className="admin-grid">
            <Summary title="重点国家" rows={data.countries} onSelect={(label) => { setCountry(label); setPage(1); }} />
            <Summary title="来源渠道" rows={data.sources} onSelect={(label) => { setSource(label); setPage(1); }} />
            <Summary title="热门落地页" rows={data.pages} />
          </section>

          <section id="visitors" className="admin-panel">
            <div className="admin-panel-heading"><h2>访客记录</h2><label>每页<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25 条</option><option value={50}>50 条</option><option value={100}>100 条</option></select></label></div>
            <div className="admin-table-scroll"><table><thead><tr><th>访客</th><th>国家/地区</th><th>脱敏 IP</th><th>来源</th><th>访问次数</th><th>最近页面</th><th>最近访问</th><th>分类</th></tr></thead><tbody>{data.visitors.length ? data.visitors.map((visitor) => <tr key={visitor.anonymousId}><td>{visitor.anonymousId}</td><td>{visitor.country || "未知"}</td><td>{visitor.ipMasked || "—"}</td><td>{displayValue(visitor.source, "直接访问")}</td><td>{visitor.visits}</td><td className="admin-path">{visitor.latestPage}</td><td>{visitor.lastSeen}</td><td><span className="admin-tag">{visitor.classification}</span></td></tr>) : <tr><td colSpan={8} className="admin-empty">暂无数据</td></tr>}</tbody></table></div>
            <div className="admin-pagination"><span>共 {data.visitorTotal} 位访客 · 第 {page} / {totalPages} 页</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>
          </section>

          <section id="leads" className="admin-panel">
            <div className="admin-panel-heading"><h2>最新询盘</h2></div>
            <div className="admin-table-scroll"><table><thead><tr><th>联系人</th><th>公司</th><th>国家/地区</th><th>来源</th><th>提交时间</th><th>状态</th></tr></thead><tbody>{data.leads.length ? data.leads.map((lead, index) => <tr key={`${lead.createdAt}-${index}`}><td>{lead.name}</td><td>{lead.company}</td><td>{lead.country || "未知"}</td><td>{displayValue(lead.source, "直接访问")}</td><td>{lead.createdAt}</td><td><span className="admin-tag">{statusLabels[lead.status.toLowerCase()] ?? lead.status}</span></td></tr>) : <tr><td colSpan={6} className="admin-empty">暂无询盘</td></tr>}</tbody></table></div>
          </section>

          <section id="quality" className="admin-quality"><div><h2>流量质量</h2><p>已排除流量不计入经营数据。</p></div><strong>{data.metrics.excluded}</strong></section>
        </>}
      </>}
    </section></AdminShell>;
}

function Summary({ title, rows, onSelect }: { title: string; rows: { label: string; value: number }[]; onSelect?: (label: string) => void }) {
  return <section className="admin-summary"><h2>{title}</h2>{rows.length ? <ol>{rows.map((row) => <li key={row.label}><button onClick={() => onSelect?.(row.label)} disabled={!onSelect}><span>{row.label}</span><b>{row.value}</b></button></li>)}</ol> : <p>暂无有效数据</p>}</section>;
}

function GooglePanel({ data, state, onRefresh }: { data: GoogleReporting; state: "loading" | "ready" | "error"; onRefresh: () => void }) {
  const search = data.searchConsole;
  const analytics = data.analytics;
  return <section className="admin-panel admin-google-panel">
    <div className="admin-panel-heading"><div><h2>Google 数据</h2><p className="admin-panel-subtitle">自然搜索与网站使用情况</p></div><button className="admin-row-action" type="button" onClick={onRefresh} disabled={state === "loading"}>{state === "loading" ? "正在同步…" : "刷新数据"}</button></div>
    {state === "error" ? <p className="admin-empty">暂时无法读取 Google 数据</p> : <div className="admin-google-grid">
      <section className="admin-google-section"><h3>Search Console</h3>{search.state === "ready" ? <><div className="admin-google-metrics"><Metric label="点击" value={search.data.totals.clicks} /><Metric label="展示" value={search.data.totals.impressions} /><Metric label="点击率" value={`${(search.data.totals.ctr * 100).toFixed(1)}%`} /><Metric label="平均排名" value={search.data.totals.position.toFixed(1)} /></div><GoogleRows title="热门搜索词" rows={search.data.queries} /><GoogleRows title="热门页面" rows={search.data.pages} /></> : <PanelState value={search.state} />}</section>
      <section className="admin-google-section"><h3>Google Analytics 4</h3>{analytics.state === "ready" ? <div className="admin-google-metrics admin-google-metrics-four"><Metric label="活跃用户" value={analytics.data.users} /><Metric label="会话" value={analytics.data.sessions} /><Metric label="页面浏览" value={analytics.data.pageViews} /><Metric label="关键事件" value={analytics.data.keyEvents} /></div> : <PanelState value={analytics.state} />}</section>
    </div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function GoogleRows({ title, rows }: { title: string; rows: { keys?: string[]; clicks?: number }[] }) {
  return <div className="admin-google-rows"><h4>{title}</h4>{rows.length ? <ol>{rows.slice(0, 5).map((row, index) => <li key={`${row.keys?.[0] ?? "row"}-${index}`}><span>{row.keys?.[0] ?? "—"}</span><b>{row.clicks ?? 0}</b></li>)}</ol> : <p>暂无数据</p>}</div>;
}

function PanelState({ value }: { value: "not_configured" | "not_authorized" | "unavailable" }) {
  const labels = { not_configured: "尚未配置", not_authorized: "尚未授权", unavailable: "暂时不可用" };
  return <p className="admin-google-state">{labels[value]}</p>;
}
