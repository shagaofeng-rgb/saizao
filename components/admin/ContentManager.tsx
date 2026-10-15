"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

type Item = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  article_type?: string;
  is_demo?: boolean;
  content_categories?: { name: string } | null;
};

const statuses = ["draft", "review", "published", "archived"];
const statusLabels: Record<string, string> = { draft: "草稿", review: "待审核", published: "已发布", archived: "已归档" };
const articleTypeLabels: Record<string, string> = { news: "新闻", insight: "洞察", faq: "常见问题", market: "市场动态" };

export function ContentManager({ kind, canEdit, canPublish }: { kind: "products" | "articles"; canEdit: boolean; canPublish: boolean }) {
  const label = kind === "products" ? "产品" : "资讯";
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ title: "", slug: "", categoryId: "", summary: "", application: "", articleType: "news", content: "", seoTitle: "", seoDescription: "", status: "draft", coverUrl: "", attachmentUrl: "" });

  useEffect(() => { let live = true; fetch(`/api/admin/categories?kind=${kind === "products" ? "product" : "article"}&pageSize=100`, { cache: "no-store" }).then((response) => response.json()).then((result) => { if (live && Array.isArray(result.data)) setCategories(result.data.filter((item: { is_enabled: boolean }) => item.is_enabled)); }).catch(() => undefined); return () => { live = false; }; }, [kind]);

  const load = useCallback(async () => {
    setReadState("loading"); setItems([]); setTotal(0);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter) params.set("status", statusFilter);
    try {
      const response = await fetch(`/api/admin/content/${kind}?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) { setReadState("error"); return; }
      setItems(result.data); setTotal(result.total); setReadState("ready");
    } catch { setReadState("error"); }
  }, [kind, page, pageSize, query, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function upload(file: File, field: "coverUrl" | "attachmentUrl") {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const result = await response.json();
      if (response.ok) setForm((value) => ({ ...value, [field]: result.data.public_url }));
      else setMessage(result.message ?? "上传失败。");
    } catch { setMessage("上传失败，请重试。"); }
    setBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/content/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.message ?? "保存失败。");
      return;
    }
    setMessage("已保存。");
    setForm({ title: "", slug: "", categoryId: "", summary: "", application: "", articleType: "news", content: "", seoTitle: "", seoDescription: "", status: "draft", coverUrl: "", attachmentUrl: "" });
    setPage(1);
    void load();
  }

  async function changeStatus(id: string, status: string) {
    const response = await fetch(`/api/admin/content/${kind}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const result = await response.json();
    setMessage(response.ok ? "状态已更新。" : (result.message ?? "更新失败。"));
    if (response.ok) void load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>{label}管理</h1><p className="admin-subtitle">维护官网公开内容</p></div></header>
    <section className={canEdit ? "admin-split" : "admin-readonly-list"}>
      {canEdit && <form className="admin-editor" onSubmit={submit}>
        <h2>新建{label}</h2>
        <div className="admin-form-grid">
          <label>标题<input required value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label>
          <label>页面地址 <span className="admin-field-code">Slug</span><input value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))} /></label>
          <label>分类<select value={form.categoryId} onChange={(event) => setForm((value) => ({ ...value, categoryId: event.target.value }))}><option value="">未分类</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>在分类管理中新增或启用分类。</small></label>
          {kind === "products" ? <label>应用场景<input value={form.application} onChange={(event) => setForm((value) => ({ ...value, application: event.target.value }))} /></label> : <label>内容类型<select value={form.articleType} onChange={(event) => setForm((value) => ({ ...value, articleType: event.target.value }))}>{Object.entries(articleTypeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>}
          <label>发布状态<select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{statuses.filter((value) => (canPublish && kind === "articles") || value !== "published").map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
        </div>
        <label>简介<textarea rows={3} value={form.summary} onChange={(event) => setForm((value) => ({ ...value, summary: event.target.value }))} /></label>
        <label>正文<textarea rows={10} required value={form.content} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} /></label>
        <div className="admin-form-grid">
          <label>封面图片<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "coverUrl")} />{form.coverUrl && <small>已上传</small>}</label>
          <label>附件<input type="file" accept="application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "attachmentUrl")} />{form.attachmentUrl && <small>已上传</small>}</label>
        </div>
        <details><summary>搜索展示设置</summary><label>搜索标题<input value={form.seoTitle} onChange={(event) => setForm((value) => ({ ...value, seoTitle: event.target.value }))} /></label><label>搜索摘要<textarea rows={2} value={form.seoDescription} onChange={(event) => setForm((value) => ({ ...value, seoDescription: event.target.value }))} /></label></details>
        <button className="admin-primary" disabled={busy}>{busy ? "正在保存…" : `保存${label}`}</button>
        <div aria-live="polite">{message && <p className="admin-feedback">{message}</p>}</div>
      </form>}
      <section className="admin-panel admin-list-panel">
        <div className="admin-panel-heading"><h2>{label}列表</h2><label>每页<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10 条</option><option value={20}>20 条</option><option value={50}>50 条</option><option value={100}>100 条</option></select></label></div>
        <div className="admin-list-filters"><label>搜索标题<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><label>发布状态<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">全部状态</option>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label></div>
        <div className="admin-table-scroll"><table><thead><tr><th>标题</th><th>分类</th><th>状态</th><th>最后更新</th><th>操作</th></tr></thead><tbody>{readState === "loading" ? <tr><td colSpan={5} className="admin-empty">正在读取{label}…</td></tr> : readState === "error" ? <tr><td colSpan={5} className="admin-empty" role="alert">无法读取{label}，请重试。</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td><b>{item.title}</b>{item.is_demo && <span className="admin-tag">设计示例</span>}<small>/{kind === "products" ? "products" : "news"}/{item.slug}</small></td><td>{item.content_categories?.name ?? "—"}</td><td><span className="admin-tag">{statusLabels[item.status] ?? item.status}</span></td><td>{new Date(item.updated_at).toLocaleDateString("zh-CN")}</td><td>{canEdit ? <div className="admin-row-actions"><Link className="admin-row-action" href={kind === "products" ? `/admin/products/${item.id}` : `/admin/news/${item.id}`}>编辑内容</Link><select value={item.status} disabled={item.status === "published" && !canPublish} aria-label={`${item.title}的发布状态`} onChange={(event) => void changeStatus(item.id, event.target.value)}>{statuses.filter((value) => value !== "published" || item.status === "published" || (canPublish && kind === "articles")).map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></div> : "只读"}</td></tr>) : <tr><td colSpan={5} className="admin-empty">暂无{label}记录</td></tr>}</tbody></table></div>
        {readState === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}
        {readState === "ready" && <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>}
      </section>
    </section>
  </section></AdminShell>;
}
