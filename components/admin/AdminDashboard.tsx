"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise, CalendarBlank, ChartLineUp, Eye, GlobeHemisphereWest, Handshake, Path, UsersThree } from "@phosphor-icons/react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { GoogleReporting } from "@/lib/google-reporting";

type Metrics = { visitors: number; sessions: number; pageViews: number; leads: number; excluded: number };
type Visitor = { anonymousId: string; country: string; source: string; visits: number; lastSeen: string; latestPage: string; classification: string; ipMasked: string };
type Lead = { name: string; company: string; country: string; source: string; createdAt: string; status: string };
type Dashboard = { metrics: Metrics; countries: { label: string; value: number }[]; sources: { label: string; value: number }[]; pages: { label: string; value: number }[]; visitors: Visitor[]; visitorTotal: number; leads: Lead[] };

const empty: Dashboard = { metrics: { visitors: 0, sessions: 0, pageViews: 0, leads: 0, excluded: 0 }, countries: [], sources: [], pages: [], visitors: [], visitorTotal: 0, leads: [] };
const emptyGoogle: GoogleReporting = { searchConsole: { state: "not_configured" }, analytics: { state: "not_configured" } };

function date(value: Date) { return value.toISOString().slice(0, 10); }
const sourceLabels: Record<string, string> = { direct: "直接访问", google: "Google", "google-organic": "Google 自然搜索", "bing-organic": "Bing 自然搜索", "meta-organic": "社交媒体", "linkedin-organic": "LinkedIn 自然搜索", linkedin: "LinkedIn" };
const statusLabels: Record<string, string> = { new: "新询盘", qualified: "已确认", contacted: "已联系", closed: "已完成" };
function displayValue(value: string, fallback: string) { return value ? sourceLabels[value.toLowerCase()] ?? value : fallback; }
function formatDate(value: Date) { return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(value); }

export function AdminDashboard() {
  const today = date(new Date());
  const [from, setFrom] = useState(() => {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 27);
    return date(start);
  });
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

  function setRange(days: number) {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    setFrom(date(start));
    setTo(date(end));
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(data.visitorTotal / pageSize));

  const metricCards = [
    { label: "有效访客", value: data.metrics.visitors, note: "去重后的有效访问", icon: UsersThree },
    { label: "访问会话", value: data.metrics.sessions, note: "真实访问会话", icon: ChartLineUp },
    { label: "页面浏览", value: data.metrics.pageViews, note: "已记录的浏览次数", icon: Eye },
    { label: "新增询盘", value: data.metrics.leads, note: "当前周期收到的询盘", icon: Handshake },
  ];

  return <AdminShell><section id="main-content" className="admin-content">
      <header className="admin-header">
        <div><p className="admin-kicker">SAI ZHAO · BUSINESS OVERVIEW</p><h1>业务概览</h1><p className="admin-subtitle">访问与询盘情况一目了然</p></div>
        <div className="admin-period"><CalendarBlank weight="bold" aria-hidden="true" /><span>{formatDate(new Date(`${from}T00:00:00`))} — {formatDate(new Date(`${to}T00:00:00`))}</span></div>
      </header>

      <section className="admin-filters" aria-label="数据筛选">
        <div className="admin-range-actions" aria-label="快捷日期范围"><button type="button" onClick={() => setRange(7)}>近 7 天</button><button type="button" onClick={() => setRange(30)}>近 30 天</button><button type="button" onClick={() => setRange(90)}>近 90 天</button></div>
        <label>开始日期<input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>结束日期<input type="date" value={to} min={from} max={today} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        <label>国家 / 地区<input value={country} onChange={(event) => { setCountry(event.target.value.toUpperCase()); setPage(1); }} /></label>
        <label>来源渠道<input value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }} /></label>
        <button onClick={refresh}><ArrowClockwise weight="bold" aria-hidden="true" />更新数据</button>
      </section>

      <GooglePanel data={google} state={googleState} onRefresh={refresh} />

      {state === "setup" ? <section className="admin-callout"><h2>暂无可展示的数据</h2><p>数据将在产生有效访问或询盘后显示。</p></section> : <>
        <section id="overview" className="admin-metrics">
          {metricCards.map(({ label, value, note, icon: Icon }) => <article key={label}><div className="admin-metric-heading"><span>{label}</span><Icon weight="bold" aria-hidden="true" /></div><strong>{state === "loading" ? "—" : value}</strong><small>{note}</small></article>)}
        </section>

        {state === "error" ? <section className="admin-callout"><h2>暂时无法读取数据</h2><p>请稍后刷新页面重试。</p></section> : <>
          <section className="admin-grid">
            <Summary title="主要访问地区" rows={data.countries} icon={GlobeHemisphereWest} onSelect={(label) => { setCountry(label); setPage(1); }} />
            <Summary title="访问来源" rows={data.sources} icon={ChartLineUp} formatLabel={(label) => displayValue(label, "直接访问")} onSelect={(label) => { setSource(label); setPage(1); }} />
            <Summary title="热门页面" rows={data.pages} icon={Path} />
          </section>

          <section id="visitors" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>访客记录</h2><p className="admin-panel-subtitle">仅显示已记录的有效访问</p></div><label>每页<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25 条</option><option value={50}>50 条</option><option value={100}>100 条</option></select></label></div>
            <div className="admin-table-scroll"><table><thead><tr><th>国家/地区</th><th>来源</th><th>访问次数</th><th>最近页面</th><th>最近访问</th></tr></thead><tbody>{data.visitors.length ? data.visitors.map((visitor) => <tr key={visitor.anonymousId}><td>{visitor.country || "未知"}</td><td>{displayValue(visitor.source, "直接访问")}</td><td>{visitor.visits}</td><td className="admin-path">{visitor.latestPage}</td><td>{visitor.lastSeen}</td></tr>) : <tr><td colSpan={5} className="admin-empty">当前周期暂无访问记录</td></tr>}</tbody></table></div>
            <div className="admin-pagination"><span>共 {data.visitorTotal} 位有效访客 · 第 {page} / {totalPages} 页</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>
          </section>

          <section id="leads" className="admin-panel">
            <div className="admin-panel-heading"><div><h2>最新询盘</h2><p className="admin-panel-subtitle">当前周期内收到的客户联系</p></div></div>
            <div className="admin-table-scroll"><table><thead><tr><th>联系人</th><th>公司</th><th>国家/地区</th><th>来源</th><th>提交时间</th><th>状态</th></tr></thead><tbody>{data.leads.length ? data.leads.map((lead, index) => <tr key={`${lead.createdAt}-${index}`}><td>{lead.name}</td><td>{lead.company}</td><td>{lead.country || "未知"}</td><td>{displayValue(lead.source, "直接访问")}</td><td>{lead.createdAt}</td><td><span className="admin-tag">{statusLabels[lead.status.toLowerCase()] ?? lead.status}</span></td></tr>) : <tr><td colSpan={6} className="admin-empty">当前周期暂无新询盘</td></tr>}</tbody></table></div>
          </section>
        </>}
      </>}
    </section></AdminShell>;
}

function Summary({ title, rows, icon: Icon, onSelect, formatLabel }: { title: string; rows: { label: string; value: number }[]; icon: typeof GlobeHemisphereWest; onSelect?: (label: string) => void; formatLabel?: (label: string) => string }) {
  return <section className="admin-summary"><div className="admin-summary-heading"><h2>{title}</h2><Icon weight="bold" aria-hidden="true" /></div>{rows.length ? <ol>{rows.map((row) => <li key={row.label}><button onClick={() => onSelect?.(row.label)} disabled={!onSelect}><span>{formatLabel?.(row.label) ?? row.label}</span><b>{row.value}</b></button></li>)}</ol> : <p>当前周期暂无记录</p>}</section>;
}

function GooglePanel({ data, state, onRefresh }: { data: GoogleReporting; state: "loading" | "ready" | "error"; onRefresh: () => void }) {
  const search = data.searchConsole;
  const analytics = data.analytics;
  const hasSearchData = search.state === "ready";
  const hasAnalyticsData = analytics.state === "ready";
  if (!hasSearchData && !hasAnalyticsData) return null;
  return <section className="admin-panel admin-google-panel">
    <div className="admin-panel-heading"><div><h2>搜索表现</h2><p className="admin-panel-subtitle">来自 Google 的已同步搜索数据</p></div><button className="admin-row-action" type="button" onClick={onRefresh} disabled={state === "loading"}>{state === "loading" ? "正在更新…" : "更新数据"}</button></div>
    <div className="admin-google-grid">
      {hasSearchData && <section className="admin-google-section"><h3>自然搜索</h3><div className="admin-google-metrics"><Metric label="点击" value={search.data.totals.clicks} /><Metric label="展示" value={search.data.totals.impressions} /><Metric label="点击率" value={`${(search.data.totals.ctr * 100).toFixed(1)}%`} /><Metric label="平均排名" value={search.data.totals.position.toFixed(1)} /></div><GoogleRows title="热门搜索词" rows={search.data.queries} /><GoogleRows title="热门页面" rows={search.data.pages} /></section>}
      {hasAnalyticsData && <section className="admin-google-section"><h3>网站使用情况</h3><div className="admin-google-metrics admin-google-metrics-four"><Metric label="活跃用户" value={analytics.data.users} /><Metric label="会话" value={analytics.data.sessions} /><Metric label="页面浏览" value={analytics.data.pageViews} /><Metric label="关键事件" value={analytics.data.keyEvents} /></div></section>}
    </div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function GoogleRows({ title, rows }: { title: string; rows: { keys?: string[]; clicks?: number }[] }) {
  return <div className="admin-google-rows"><h4>{title}</h4>{rows.length ? <ol>{rows.slice(0, 5).map((row, index) => <li key={`${row.keys?.[0] ?? "row"}-${index}`}><span>{row.keys?.[0] ?? "—"}</span><b>{row.clicks ?? 0}</b></li>)}</ol> : <p>暂无数据</p>}</div>;
}
