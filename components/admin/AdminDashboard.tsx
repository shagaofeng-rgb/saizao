"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = { visitors: number; sessions: number; pageViews: number; leads: number; excluded: number };
type Visitor = { anonymousId: string; country: string; source: string; visits: number; lastSeen: string; latestPage: string; classification: string; ipMasked: string };
type Lead = { name: string; company: string; country: string; source: string; createdAt: string; status: string };
type Dashboard = { metrics: Metrics; countries: { label: string; value: number }[]; sources: { label: string; value: number }[]; pages: { label: string; value: number }[]; visitors: Visitor[]; visitorTotal: number; leads: Lead[] };

const empty: Dashboard = { metrics: { visitors: 0, sessions: 0, pageViews: 0, leads: 0, excluded: 0 }, countries: [], sources: [], pages: [], visitors: [], visitorTotal: 0, leads: [] };

function date(value: Date) { return value.toISOString().slice(0, 10); }

export function AdminDashboard() {
  const router = useRouter();
  const today = date(new Date());
  const [from, setFrom] = useState(() => date(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(today);
  const [country, setCountry] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<Dashboard>(empty);
  const [state, setState] = useState<"loading" | "ready" | "setup" | "error">("loading");

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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const totalPages = Math.max(1, Math.ceil(data.visitorTotal / pageSize));

  return <main id="main-content" className="admin-main">
    <aside className="admin-sidebar">
      <a className="admin-brand" href="#overview"><span>SAI ZHAO</span><small>B2B GROWTH CONSOLE</small></a>
      <nav aria-label="后台导航">
        <a className="active" href="#overview">数据总览</a>
        <a href="#visitors">访客与旅程</a>
        <a href="#leads">询盘 CRM</a>
        <a href="#quality">流量质量</a>
        <a href="/admin/change-password">账号与密码</a>
        <span>产品与内容 <small>下一期</small></span>
        <span>市场与投流 <small>下一期</small></span>
      </nav>
      <div className="admin-sidebar-note"><b>实时数据</b><p>仅统计已通过质量规则的访问。</p></div>
    </aside>

    <section className="admin-content">
      <header className="admin-header">
        <div><p className="admin-kicker">OPERATIONS OVERVIEW</p><h1>业务数据总览</h1></div>
        <button className="admin-logout" onClick={logout}>退出登录</button>
      </header>

      <section className="admin-filters" aria-label="数据筛选">
        <label>开始日期<input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
        <label>结束日期<input type="date" value={to} min={from} max={today} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
        <label>国家 / 地区<input value={country} placeholder="如 AE、US、SA" onChange={(event) => { setCountry(event.target.value.toUpperCase()); setPage(1); }} /></label>
        <label>来源渠道<input value={source} placeholder="如 google、linkedin" onChange={(event) => { setSource(event.target.value); setPage(1); }} /></label>
        <button onClick={load}>应用筛选</button>
      </section>

      {state === "setup" ? <section className="admin-callout"><h2>数据层尚未连接</h2><p>后台界面与采集接口已就绪，但尚未配置 Supabase 环境变量，因此不会显示模拟数据。完成数据库脚本与 Vercel 环境变量配置后，真实访问和询盘会立即开始入库。</p></section> : <>
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
            <div className="admin-panel-heading"><div><p className="admin-kicker">VERIFIED VISITORS</p><h2>真实访客与访问轨迹</h2></div><label>每页<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={25}>25 条</option><option value={50}>50 条</option><option value={100}>100 条</option></select></label></div>
            <div className="admin-table-scroll"><table><thead><tr><th>访客</th><th>国家</th><th>脱敏 IP</th><th>来源</th><th>访问次数</th><th>最近页面</th><th>最近访问</th><th>分类</th></tr></thead><tbody>{data.visitors.length ? data.visitors.map((visitor) => <tr key={visitor.anonymousId}><td>{visitor.anonymousId}</td><td>{visitor.country || "Unknown"}</td><td>{visitor.ipMasked || "—"}</td><td>{visitor.source || "Direct"}</td><td>{visitor.visits}</td><td className="admin-path">{visitor.latestPage}</td><td>{visitor.lastSeen}</td><td><span className="admin-tag">{visitor.classification}</span></td></tr>) : <tr><td colSpan={8} className="admin-empty">当前筛选条件下暂无有效访问。</td></tr>}</tbody></table></div>
            <div className="admin-pagination"><span>共 {data.visitorTotal} 位访客 · 第 {page} / {totalPages} 页</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button><button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>
          </section>

          <section id="leads" className="admin-panel">
            <div className="admin-panel-heading"><div><p className="admin-kicker">LEAD INBOX</p><h2>最新询盘</h2></div><span className="admin-hint">询盘会自动保留来源、国家与首次落地页归因。</span></div>
            <div className="admin-table-scroll"><table><thead><tr><th>联系人</th><th>公司</th><th>国家</th><th>来源</th><th>提交时间</th><th>状态</th></tr></thead><tbody>{data.leads.length ? data.leads.map((lead, index) => <tr key={`${lead.createdAt}-${index}`}><td>{lead.name}</td><td>{lead.company}</td><td>{lead.country || "Unknown"}</td><td>{lead.source || "Direct"}</td><td>{lead.createdAt}</td><td><span className="admin-tag">{lead.status}</span></td></tr>) : <tr><td colSpan={6} className="admin-empty">暂无询盘。官网表单接入后会在这里生成真实记录。</td></tr>}</tbody></table></div>
          </section>

          <section id="quality" className="admin-quality"><div><p className="admin-kicker">DATA QUALITY</p><h2>真实流量，不混入测试数据。</h2></div><p>本期有 <b>{data.metrics.excluded}</b> 条流量被标记为内部访问、预览环境、自动化测试、机器人或 Collects 类采集流量。它们保留审计记录，但不会进入有效访客、转化率和国家报表。</p></section>
        </>}
      </>}
    </section>
  </main>;
}

function Summary({ title, rows, onSelect }: { title: string; rows: { label: string; value: number }[]; onSelect?: (label: string) => void }) {
  return <section className="admin-summary"><h2>{title}</h2>{rows.length ? <ol>{rows.map((row) => <li key={row.label}><button onClick={() => onSelect?.(row.label)} disabled={!onSelect}><span>{row.label}</span><b>{row.value}</b></button></li>)}</ol> : <p>暂无有效数据</p>}</section>;
}
