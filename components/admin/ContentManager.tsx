"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Item = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  article_type?: string;
  content_categories?: { name: string } | null;
};

const statuses = ["draft", "review", "published", "archived"];
const statusLabels: Record<string, string> = { draft: "草稿", review: "待审核", published: "已发布", archived: "已归档" };
const articleTypeLabels: Record<string, string> = { news: "新闻", insight: "洞察", faq: "常见问题", market: "市场动态" };

export function ContentManager({ kind }: { kind: "products" | "articles" }) {
  const label = kind === "products" ? "产品" : "资讯";
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", categoryName: "", summary: "", application: "", articleType: "news", content: "", seoTitle: "", seoDescription: "", status: "draft", coverUrl: "", attachmentUrl: "" });

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/content/${kind}?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      setItems(result.data);
      setTotal(result.total);
    } else {
      setMessage(result.message ?? "读取失败。");
    }
  }, [kind, page, pageSize]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function upload(file: File, field: "coverUrl" | "attachmentUrl") {
    setBusy(true);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/media", { method: "POST", body: formData });
    const result = await response.json();
    if (response.ok) setForm((value) => ({ ...value, [field]: result.data.public_url }));
    else setMessage(result.message ?? "上传失败。");
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
    setForm({ title: "", slug: "", categoryName: "", summary: "", application: "", articleType: "news", content: "", seoTitle: "", seoDescription: "", status: "draft", coverUrl: "", attachmentUrl: "" });
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
    <section className="admin-split">
      <form className="admin-editor" onSubmit={submit}>
        <h2>新建{label}</h2>
        <div className="admin-form-grid">
          <label>标题<input required value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label>
          <label>页面地址 <span className="admin-field-code">Slug</span><input value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))} /></label>
          <label>分类<input value={form.categoryName} onChange={(event) => setForm((value) => ({ ...value, categoryName: event.target.value }))} /></label>
          {kind === "products" ? <label>应用场景<input value={form.application} onChange={(event) => setForm((value) => ({ ...value, application: event.target.value }))} /></label> : <label>内容类型<select value={form.articleType} onChange={(event) => setForm((value) => ({ ...value, articleType: event.target.value }))}>{Object.entries(articleTypeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>}
          <label>发布状态<select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
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
      </form>
      <section className="admin-panel admin-list-panel">
        <div className="admin-panel-heading"><h2>{label}列表</h2><label>每页<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10 条</option><option value={25}>25 条</option><option value={50}>50 条</option></select></label></div>
        <div className="admin-table-scroll"><table><thead><tr><th>标题</th><th>分类</th><th>状态</th><th>最后更新</th><th>操作</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.id}><td><b>{item.title}</b><small>/{kind === "products" ? "products" : "news"}/{item.slug}</small></td><td>{item.content_categories?.name ?? "—"}</td><td><span className="admin-tag">{statusLabels[item.status] ?? item.status}</span></td><td>{new Date(item.updated_at).toLocaleDateString("zh-CN")}</td><td><select value={item.status} aria-label={`${item.title}的发布状态`} onChange={(event) => void changeStatus(item.id, event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></td></tr>) : <tr><td colSpan={5} className="admin-empty">暂无{label}</td></tr>}</tbody></table></div>
        <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button><button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></div>
      </section>
    </section>
  </section></AdminShell>;
}
