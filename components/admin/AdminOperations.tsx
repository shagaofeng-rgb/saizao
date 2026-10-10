"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDateRange } from "@/components/admin/AdminDateRange";
import { AdminDateRangeValue, adminDateQuery, adminDateRange, validAdminDateRange } from "@/lib/admin-date-range";

type PageData<T> = { total: number; items: T[] };
type Visitor = { id: string; country: string; latestSource: string; sessionCount: number; firstLandingPage: string; lastSeenAt: string };
type Lead = { id: string; name: string; company: string; email: string; country: string; application?: string; source: string; status: string; createdAt: string; nextFollowUpAt?: string | null };
type VisitorDetailData = { visitor: { firstSeen: string; lastSeen: string } | null; sessions: { id: string }[]; events: { at: string; page: string; title?: string }[]; leads: { id: string; name: string; company: string; status: string }[] };
type LeadDetailData = { lead: { name: string; company: string; email: string; phone?: string; country_name?: string; country_code?: string; application?: string; brief?: string; status: string; created_at?: string; next_follow_up_at?: string; visitorId?: string } | null; notes: { id: string; createdAt: string; stage?: string; note: string }[] };
type State = "loading" | "ready" | "error";

const sourceLabels: Record<string, string> = { Direct: "直接访问", direct: "直接访问", "google-organic": "Google 自然搜索", "bing-organic": "Bing 自然搜索", linkedin: "LinkedIn" };
const source = (value?: string) => sourceLabels[value ?? ""] ?? value ?? "直接访问";
const statusLabels: Record<string, string> = { New: "新询盘", Processing: "处理中", Contacted: "已联系", Qualified: "有效商机", Closed: "已完成", Invalid: "无效" };
const status = (value: string) => statusLabels[value] ?? value;
const localDateTime = (value?: string) => { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const utcDateTime = (value?: string) => value ? new Date(value).toISOString().slice(0, 16).replace("T", " ") : "—";

function Pagination({ page, pageSize, total, onPage, onSize }: { page: number; pageSize: number; total: number; onPage: (value: number) => void; onSize: (value: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(pages - 6, page - 3));
  const choices = Array.from({ length: Math.min(pages, 7) }, (_, index) => start + index);
  return <div className="admin-pagination admin-pagination-full"><span>共 {total} 条 · 第 {page} / {pages} 页</span><div>
    <label>每页<select value={pageSize} onChange={(event) => { onSize(Number(event.target.value)); onPage(1); }}><option value={20}>20 条</option><option value={50}>50 条</option><option value={100}>100 条</option></select></label>
    <button type="button" disabled={page === 1} onClick={() => onPage(1)}>首页</button><button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>上一页</button>
    {choices.map((item) => <button type="button" aria-current={item === page ? "page" : undefined} className={item === page ? "active" : ""} key={item} onClick={() => onPage(item)}>{item}</button>)}
    <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>下一页</button><button type="button" disabled={page === pages} onClick={() => onPage(pages)}>末页</button>
  </div></div>;
}

export function VisitorCenter() {
  const [data, setData] = useState<PageData<Visitor> | null>(null);
  const [state, setState] = useState<State>("loading");
  const [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState(""), [country, setCountry] = useState(""), [sourceValue, setSource] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!validAdminDateRange(range)) return;
    const id = ++requestId.current;
    setState("loading"); setData(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...adminDateQuery(range) });
    if (q.trim()) params.set("q", q.trim());
    if (country.trim()) params.set("country", country.trim());
    if (sourceValue.trim()) params.set("source", sourceValue.trim());
    try {
      const response = await fetch(`/api/admin/visitors?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok || !Array.isArray(result.data?.items)) { setState("error"); return; }
      setData(result.data); setState("ready");
    } catch { if (id === requestId.current) setState("error"); }
  }, [range, page, pageSize, q, country, sourceValue]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>访客中心</h1><p className="admin-subtitle">查看已记录的有效访问与页面轨迹。</p></div></header>
    <section className="admin-filters" aria-label="访客筛选"><AdminDateRange id="visitors" value={range} onChange={(value) => { setRange(value); setPage(1); }} /><label>关键词<input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="访客标识或脱敏 IP" /></label><label>国家 / 地区<input value={country} onChange={(event) => { setCountry(event.target.value.toUpperCase()); setPage(1); }} /></label><label>来源渠道<input value={sourceValue} onChange={(event) => { setSource(event.target.value); setPage(1); }} /></label><button type="button" onClick={() => void load()} disabled={!validAdminDateRange(range) || state === "loading"}><Funnel aria-hidden="true" />查询</button></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>访客记录</h2><p className="admin-panel-subtitle">来源：站内访问记录。按匿名访客汇总，不显示完整 IP。</p></div></div>
      <div className="admin-table-scroll"><table><thead><tr><th>国家/地区</th><th>来源</th><th>会话</th><th>首次进入页面</th><th>最近访问（UTC）</th><th>操作</th></tr></thead><tbody>
        {state === "loading" ? <tr><td colSpan={6} className="admin-empty">正在读取访客记录…</td></tr> : state === "error" ? <tr><td colSpan={6} className="admin-empty" role="alert">读取失败。请重试，当前不显示旧数据。</td></tr> : data?.items.length ? data.items.map((item) => <tr key={item.id}><td>{item.country}</td><td>{source(item.latestSource)}</td><td>{item.sessionCount}</td><td className="admin-path">{item.firstLandingPage}</td><td>{utcDateTime(item.lastSeenAt)}</td><td><Link className="admin-row-action" href={`/admin/visitors/${item.id}`}><Eye aria-hidden="true" />查看详情</Link></td></tr>) : <tr><td colSpan={6} className="admin-empty">所选条件下暂无访客记录</td></tr>}
      </tbody></table></div>{state === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}{state === "ready" && data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} onSize={setPageSize} />}</section>
  </section></AdminShell>;
}

export function InquiryCenter() {
  const [data, setData] = useState<PageData<Lead> | null>(null);
  const [state, setState] = useState<State>("loading");
  const [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState(""), [statusValue, setStatus] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!validAdminDateRange(range)) return;
    const id = ++requestId.current;
    setState("loading"); setData(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...adminDateQuery(range) });
    if (q.trim()) params.set("q", q.trim());
    if (statusValue) params.set("status", statusValue);
    try {
      const response = await fetch(`/api/admin/inquiries?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok || !Array.isArray(result.data?.items)) { setState("error"); return; }
      setData(result.data); setState("ready");
    } catch { if (id === requestId.current) setState("error"); }
  }, [range, page, pageSize, q, statusValue]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>询盘管理</h1><p className="admin-subtitle">查看客户需求，并跟进关联的访问轨迹。</p></div></header>
    <section className="admin-filters" aria-label="询盘筛选"><AdminDateRange id="inquiries" value={range} onChange={(value) => { setRange(value); setPage(1); }} /><label>关键词<input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="姓名、公司或邮箱" /></label><label>处理状态<select value={statusValue} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">全部状态</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => void load()} disabled={!validAdminDateRange(range) || state === "loading"}><MagnifyingGlass aria-hidden="true" />查询</button></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>询盘记录</h2><p className="admin-panel-subtitle">来源：客户提交并已保存的询盘。</p></div></div><div className="admin-table-scroll"><table><thead><tr><th>客户</th><th>公司</th><th>国家/地区</th><th>产品应用</th><th>来源</th><th>提交时间（UTC）</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {state === "loading" ? <tr><td colSpan={8} className="admin-empty">正在读取询盘…</td></tr> : state === "error" ? <tr><td colSpan={8} className="admin-empty" role="alert">读取失败。请重试，当前不显示旧数据。</td></tr> : data?.items.length ? data.items.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.email}</small></td><td>{item.company}</td><td>{item.country}</td><td>{item.application || "—"}</td><td>{source(item.source)}</td><td>{item.createdAt}</td><td><span className="admin-tag">{status(item.status)}</span></td><td><Link className="admin-row-action" href={`/admin/inquiries/${item.id}`}>查看详情</Link></td></tr>) : <tr><td colSpan={8} className="admin-empty">所选条件下暂无询盘</td></tr>}
    </tbody></table></div>{state === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}{state === "ready" && data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} onSize={setPageSize} />}</section>
  </section></AdminShell>;
}

export function VisitorDetail({ id }: { id: string }) {
  const [data, setData] = useState<VisitorDetailData | null>(null), [state, setState] = useState<State>("loading");
  useEffect(() => { let live = true; fetch(`/api/admin/visitors/${id}`, { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (!live) return; if (!response.ok || !result.data?.visitor) { setState("error"); return; } setData(result.data); setState("ready"); }).catch(() => { if (live) setState("error"); }); return () => { live = false; }; }, [id]);
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><Link className="admin-text-link" href="/admin/visitors"><ArrowLeft aria-hidden="true" />返回访客中心</Link><header className="admin-header admin-detail-header"><div><h1>访问详情</h1><p className="admin-subtitle">{state === "ready" && data?.visitor ? `首次访问 ${data.visitor.firstSeen} UTC · 最近访问 ${data.visitor.lastSeen} UTC` : state === "loading" ? "正在读取访问轨迹…" : "暂时无法读取访问轨迹"}</p></div></header>
    {state === "error" ? <section className="admin-callout" role="alert"><h2>访问详情不可用</h2><p>请返回访客中心后重试。</p></section> : state === "ready" && data ? <><section className="admin-grid"><DetailSummary title="访问会话" value={data.sessions.length} /><DetailSummary title="最近页面事件（最多 250 条）" value={data.events.length} /><DetailSummary title="关联询盘" value={data.leads.length} /></section><section className="admin-panel"><h2>页面访问轨迹</h2><div className="admin-timeline">{data.events.length ? data.events.map((event, index) => <div key={`${event.at}-${index}`}><time>{event.at} UTC</time><b>{event.page}</b><span>{event.title || "页面浏览"}</span></div>) : <p className="admin-empty">暂无可展示的页面访问轨迹</p>}</div></section><section className="admin-panel"><h2>关联询盘</h2>{data.leads.length ? data.leads.map((lead) => <Link key={lead.id} className="admin-related-link" href={`/admin/inquiries/${lead.id}`}>{lead.name} · {lead.company} <span>{status(lead.status)}</span></Link>) : <p className="admin-empty">该匿名访客暂未关联到询盘。</p>}</section></> : null}
  </section></AdminShell>;
}
function DetailSummary({ title, value }: { title: string; value: number }) { return <section className="admin-summary"><h2>{title}</h2><strong className="admin-summary-number">{value}</strong></section>; }

export function InquiryDetail({ id }: { id: string }) {
  const [data, setData] = useState<LeadDetailData | null>(null), [state, setState] = useState<State>("loading");
  const [note, setNote] = useState(""), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const response = await fetch(`/api/admin/inquiries/${id}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok || !result.data?.lead) { setState("error"); return; } setData(result.data); setState("ready"); } catch { setState("error"); } }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function update(body: Record<string, unknown>) { setSaving(true); setMessage(""); try { const response = await fetch(`/api/admin/inquiries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); setMessage(response.ok ? "已保存。" : result.message ?? "更新失败。"); if (response.ok) await load(); } catch { setMessage("更新失败，请重试。"); } setSaving(false); }
  async function addNote() { if (!note.trim()) return; setSaving(true); setMessage(""); try { const response = await fetch(`/api/admin/inquiries/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) }); const result = await response.json(); setMessage(response.ok ? "跟进记录已保存。" : result.message ?? "保存失败。"); if (response.ok) { setNote(""); await load(); } } catch { setMessage("保存失败，请重试。"); } setSaving(false); }
  const lead = data?.lead;
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><Link className="admin-text-link" href="/admin/inquiries"><ArrowLeft aria-hidden="true" />返回询盘管理</Link><header className="admin-header admin-detail-header"><div><h1>{lead?.company || "询盘详情"}</h1><p className="admin-subtitle">{lead ? `${lead.name} · ${lead.created_at ? new Date(lead.created_at).toLocaleString("zh-CN") : ""}` : state === "loading" ? "正在读取客户信息…" : "暂时无法读取客户信息"}</p></div></header>
    {state === "error" ? <section className="admin-callout" role="alert"><h2>询盘详情不可用</h2><p>请返回询盘管理后重试。</p></section> : lead && data ? <><section className="admin-detail-grid"><section className="admin-panel"><h2>客户信息</h2><dl className="admin-detail-list"><dt>联系人</dt><dd>{lead.name}</dd><dt>邮箱</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd><dt>电话</dt><dd>{lead.phone || "—"}</dd><dt>国家/地区</dt><dd>{lead.country_name || lead.country_code || "—"}</dd><dt>产品应用</dt><dd>{lead.application || "—"}</dd><dt>需求说明</dt><dd className="admin-detail-brief">{lead.brief || "—"}</dd></dl></section><section className="admin-panel"><h2>跟进处理</h2><label className="admin-field">状态<select value={lead.status} disabled={saving} onChange={(event) => void update({ status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="admin-field">下次跟进（本地时间）<input type="datetime-local" disabled={saving} value={localDateTime(lead.next_follow_up_at)} onChange={(event) => void update({ nextFollowUpAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label><label className="admin-field">新增跟进<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="记录本次沟通结果" /></label><button className="admin-primary" type="button" disabled={saving || !note.trim()} onClick={() => void addNote()}>保存跟进记录</button><p role="status" className="admin-feedback">{message}</p></section></section><section className="admin-panel"><h2>跟进记录</h2><div className="admin-timeline">{data.notes.length ? data.notes.map((item) => <div key={item.id}><time>{item.createdAt} UTC</time><b>{item.stage || "跟进"}</b><span>{item.note}</span></div>) : <p className="admin-empty">暂无跟进记录</p>}</div></section>{lead.visitorId && <section className="admin-panel"><h2>提交前访问轨迹</h2><p className="admin-panel-subtitle">该询盘与已同意统计的匿名访问记录关联。</p><Link className="admin-row-action" href={`/admin/visitors/${lead.visitorId}`}>查看完整访问轨迹</Link></section>}</> : null}
  </section></AdminShell>;
}
