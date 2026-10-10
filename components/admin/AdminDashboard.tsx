"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, ChartLineUp, Eye, GlobeHemisphereWest, Handshake, Path, UsersThree } from "@phosphor-icons/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDateRange } from "@/components/admin/AdminDateRange";
import { AdminDateRangeValue, adminDateQuery, adminDateRange, validAdminDateRange } from "@/lib/admin-date-range";
import type { GoogleReporting } from "@/lib/google-reporting";

type Metrics = { visitors: number; sessions: number; pageViews: number; leads: number; excluded: number };
type Dashboard = { metrics: Metrics; countries: { label: string; value: number }[]; sources: { label: string; value: number }[]; pages: { label: string; value: number }[] };
type LoadState = "loading" | "ready" | "setup" | "error";

const sourceLabels: Record<string, string> = { direct: "直接访问", google: "Google", "google-organic": "Google 自然搜索", "bing-organic": "Bing 自然搜索", "meta-organic": "社交媒体", "linkedin-organic": "LinkedIn 自然搜索", linkedin: "LinkedIn" };
const displaySource = (value: string) => sourceLabels[value.toLowerCase()] ?? value;

export function AdminDashboard() {
  const [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [google, setGoogle] = useState<GoogleReporting | null>(null);
  const [googleState, setGoogleState] = useState<"loading" | "ready" | "error">("loading");
  const requestId = useRef(0);
  const googleRequestId = useRef(0);

  const load = useCallback(async () => {
    if (!validAdminDateRange(range)) return;
    const id = ++requestId.current;
    setState("loading"); setData(null);
    const query = new URLSearchParams(adminDateQuery(range));
    if (country.trim()) query.set("country", country.trim());
    if (source.trim()) query.set("source", source.trim());
    try {
      const response = await fetch(`/api/admin/overview?${query}`, { cache: "no-store" });
      if (id !== requestId.current) return;
      if (response.status === 503) { setState("setup"); return; }
      if (!response.ok) { setState("error"); return; }
      const result = await response.json();
      if (!result.data?.metrics) { setState("error"); return; }
      setData(result.data); setState("ready");
    } catch { if (id === requestId.current) setState("error"); }
  }, [range, country, source]);

  const loadGoogle = useCallback(async () => {
    if (!validAdminDateRange(range)) return;
    const id = ++googleRequestId.current;
    setGoogleState("loading"); setGoogle(null);
    try {
      const response = await fetch(`/api/admin/google?${new URLSearchParams({ from: range.from, to: range.to })}`, { cache: "no-store" });
      if (id !== googleRequestId.current) return;
      if (!response.ok) { setGoogleState("error"); return; }
      const result = await response.json();
      if (!result.data?.searchConsole || !result.data?.analytics) { setGoogleState("error"); return; }
      setGoogle(result.data); setGoogleState("ready");
    } catch { if (id === googleRequestId.current) setGoogleState("error"); }
  }, [range]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => void loadGoogle(), 0); return () => window.clearTimeout(timer); }, [loadGoogle]);
  function refresh() { void load(); void loadGoogle(); }

  const metrics = [
    { label: "有效访客", value: data?.metrics.visitors, origin: "站内访问记录", icon: UsersThree, href: "/admin/visitors" },
    { label: "访问会话", value: data?.metrics.sessions, origin: "站内访问记录", icon: ChartLineUp, href: "/admin/visitors" },
    { label: "页面浏览", value: data?.metrics.pageViews, origin: "站内访问记录", icon: Eye, href: "/admin/visitors" },
    { label: "新增询盘", value: data?.metrics.leads, origin: "询盘记录", icon: Handshake, href: "/admin/inquiries" },
  ];

  return <AdminShell><section id="main-content" className="admin-content admin-dashboard">
    <header className="admin-header admin-dashboard-hero"><div><h1>业务概览</h1><p className="admin-subtitle">访问与询盘情况</p></div></header>
    <section className="admin-filters admin-overview-filters" aria-label="数据筛选">
      <AdminDateRange id="overview" value={range} onChange={setRange} />
      <label>国家 / 地区<input value={country} onChange={(event) => setCountry(event.target.value.toUpperCase())} aria-label="筛选国家或地区" /></label>
      <label>来源渠道<input value={source} onChange={(event) => setSource(event.target.value)} aria-label="筛选来源渠道" /></label>
      <button type="button" onClick={refresh} disabled={!validAdminDateRange(range) || state === "loading"}><ArrowClockwise aria-hidden="true" />更新数据</button>
    </section>
    <div className="admin-source-note">指标来源：站内访问记录与询盘记录。仅统计所选时间范围内的数据；Google 数据单独展示。</div>
    <section className="admin-metrics" aria-label="关键指标">{metrics.map(({ label, value, origin, icon: Icon, href }) => <Link className="admin-metric-card" key={label} href={href}>
      <div className="admin-metric-heading"><span>{label}</span><span className="admin-metric-icon"><Icon weight="regular" aria-hidden="true" /></span></div>
      <strong>{state === "ready" && typeof value === "number" ? value.toLocaleString("zh-CN") : "—"}</strong>
      <small>{state === "ready" ? origin : state === "loading" ? "正在读取" : "暂不可核实"}</small>
    </Link>)}</section>
    {(state === "setup" || state === "error") && <section className="admin-callout" role="alert"><h2>{state === "setup" ? "数据源暂不可用" : "无法读取业务数据"}</h2><p>当前不能核实指标，请稍后重试。页面不会用默认数字代替真实结果。</p><button className="admin-row-action" type="button" onClick={refresh}>重试</button></section>}
    {state === "ready" && data && data.metrics.visitors === 0 && data.metrics.leads === 0 && <section className="admin-callout"><h2>所选时间内暂无记录</h2><p>可以调整时间范围，或进入访客中心、询盘管理查看明细。</p><div className="admin-callout-actions"><Link className="admin-row-action" href="/admin/visitors">查看访客</Link><Link className="admin-primary" href="/admin/inquiries">查看询盘</Link></div></section>}
    <section className="admin-grid admin-overview-grid" aria-label="访问分析">
      <Summary title="主要访问地区" rows={data?.countries ?? []} state={state} icon={GlobeHemisphereWest} href="/admin/visitors" onSelect={setCountry} />
      <Summary title="访问来源" rows={data?.sources ?? []} state={state} icon={ChartLineUp} href="/admin/visitors" formatLabel={displaySource} onSelect={setSource} />
      <Summary title="热门页面" rows={data?.pages ?? []} state={state} icon={Path} href="/admin/visitors" />
    </section>
    <GooglePanel data={google} state={googleState} onRefresh={loadGoogle} />
    <section className="admin-panel admin-module-links"><div><h2>继续处理</h2><p className="admin-panel-subtitle">从汇总进入已有的访客轨迹和询盘记录。</p></div><div><Link className="admin-row-action" href="/admin/visitors">访客中心 <ArrowRight aria-hidden="true" /></Link><Link className="admin-primary" href="/admin/inquiries">询盘管理 <ArrowRight aria-hidden="true" /></Link></div></section>
  </section></AdminShell>;
}

function Summary({ title, rows, state, icon: Icon, href, onSelect, formatLabel }: { title: string; rows: { label: string; value: number }[]; state: LoadState; icon: typeof GlobeHemisphereWest; href: string; onSelect?: (label: string) => void; formatLabel?: (label: string) => string }) {
  return <section className="admin-summary"><div className="admin-summary-heading"><div><h2>{title}</h2><p className="admin-panel-subtitle">站内访问记录</p></div><Icon aria-hidden="true" /></div>
    {state === "ready" && rows.length ? <ol>{rows.map((row) => <li key={row.label}><button type="button" onClick={() => onSelect?.(row.label)} disabled={!onSelect}><span>{formatLabel?.(row.label) ?? row.label}</span><b>{row.value.toLocaleString("zh-CN")}</b></button></li>)}</ol> : <p className="admin-summary-empty">{state === "loading" ? "正在读取…" : state === "ready" ? "所选时间内暂无记录" : "数据暂不可用"}</p>}
    <Link className="admin-summary-link" href={href}>查看访客 <ArrowRight aria-hidden="true" /></Link>
  </section>;
}

function GooglePanel({ data, state, onRefresh }: { data: GoogleReporting | null; state: "loading" | "ready" | "error"; onRefresh: () => void }) {
  const search = data?.searchConsole, analytics = data?.analytics;
  const sectionState = (value: GoogleReporting["searchConsole"]["state"] | undefined) => value === "not_configured" ? "未配置" : value === "not_authorized" ? "未获授权" : value === "unavailable" ? "暂不可读取" : "正在读取";
  return <section className="admin-panel admin-google-panel"><div className="admin-panel-heading"><div><h2>Google 搜索与网站使用情况</h2><p className="admin-panel-subtitle">Google Search Console 与 GA4，独立于站内统计口径。</p></div><button className="admin-row-action" type="button" onClick={onRefresh} disabled={state === "loading"}>更新数据</button></div>
    {state === "error" ? <p className="admin-google-state" role="alert">Google 数据暂时无法读取。</p> : <div className="admin-google-grid">
      <section className="admin-google-section"><h3>自然搜索 · Search Console</h3>{search?.state === "ready" ? <><div className="admin-google-metrics"><Metric label="点击" value={search.data.totals.clicks} /><Metric label="展示" value={search.data.totals.impressions} /><Metric label="点击率" value={`${(search.data.totals.ctr * 100).toFixed(1)}%`} /><Metric label="平均排名" value={search.data.totals.position.toFixed(1)} /></div><GoogleRows title="热门搜索词" rows={search.data.queries} /><GoogleRows title="热门页面" rows={search.data.pages} /></> : <p className="admin-google-state">{sectionState(search?.state)}</p>}</section>
      <section className="admin-google-section"><h3>网站使用情况 · GA4</h3>{analytics?.state === "ready" ? <div className="admin-google-metrics admin-google-metrics-four"><Metric label="活跃用户" value={analytics.data.users} /><Metric label="会话" value={analytics.data.sessions} /><Metric label="页面浏览" value={analytics.data.pageViews} /><Metric label="关键事件" value={analytics.data.keyEvents} /></div> : <p className="admin-google-state">{sectionState(analytics?.state)}</p>}</section>
    </div>}
  </section>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("zh-CN") : value}</strong></div>; }
function GoogleRows({ title, rows }: { title: string; rows: { keys?: string[]; clicks?: number }[] }) { return <div className="admin-google-rows"><h4>{title}</h4>{rows.length ? <ol>{rows.slice(0, 5).map((row, index) => <li key={`${row.keys?.[0] ?? "row"}-${index}`}><span>{row.keys?.[0] ?? "—"}</span><b>{row.clicks ?? 0}</b></li>)}</ol> : <p>所选时间内暂无记录</p>}</div>; }
