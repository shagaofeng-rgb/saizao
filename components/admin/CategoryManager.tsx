"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Category = { id: string; name: string; slug: string; description: string | null; sort_order: number; is_enabled: boolean; show_in_nav: boolean };
const empty = { name: "", slug: "", description: "" };
export function CategoryManager({ canEdit }: { canEdit: boolean }) {
  const [kind, setKind] = useState<"product" | "article">("product");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [total, setTotal] = useState(0);
  const [items, setItems] = useState<Category[]>([]), [drafts, setDrafts] = useState<Record<string, Category>>({});
  const [form, setForm] = useState(empty), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const params = new URLSearchParams({ kind, page: String(page), pageSize: String(pageSize), q: query.trim() });
      const response = await fetch(`/api/admin/categories?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error();
      setItems(result.data); setDrafts({}); setTotal(result.total); setState("ready");
    } catch { setItems([]); setState("error"); }
  }, [kind, page, pageSize, query]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, kind }) });
      const result = await response.json();
      setMessage(response.ok ? "分类已创建。" : result.message || "创建失败。");
      if (response.ok) { setForm(empty); setPage(1); void load(); }
    } catch { setMessage("创建失败，请重试。"); }
    setBusy(false);
  }
  function change(item: Category, key: keyof Category, value: string | number | boolean) { setDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] || item), [key]: value } })); }
  async function save(item: Category) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(drafts[item.id] || item) });
      const result = await response.json(); setMessage(response.ok ? "分类已保存。" : result.message || "保存失败。");
      if (response.ok) void load();
    } catch { setMessage("保存失败，请重试。"); }
    setBusy(false);
  }
  async function archive(item: Category) {
    if (!window.confirm(`确定归档“${item.name}”？关联内容需要先改到其他分类。`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json(); setMessage(response.ok ? "分类已归档。" : result.message || "归档失败。");
      if (response.ok) void load();
    } catch { setMessage("归档失败，请重试。"); }
    setBusy(false);
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>内容分类</h1><p className="admin-subtitle">分别维护产品与资讯分类。前台只展示已发布真实内容所关联的启用分类。</p></div></header>
    <div className="admin-segmented" role="group" aria-label="分类类型"><button type="button" aria-pressed={kind === "product"} onClick={() => { setKind("product"); setPage(1); }}>产品分类</button><button type="button" aria-pressed={kind === "article"} onClick={() => { setKind("article"); setPage(1); }}>资讯分类</button></div>
    {canEdit && <form className="admin-editor admin-compact-editor" onSubmit={create}><h2>新建{kind === "product" ? "产品" : "资讯"}分类</h2><div className="admin-form-grid"><label>分类名称<input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label><label>英文地址 Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm((v) => ({ ...v, slug: e.target.value.toLowerCase() }))} /></label></div><label>分类简介<input maxLength={1000} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label><button className="admin-primary" disabled={busy}>创建分类</button></form>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>分类列表</h2><p className="admin-panel-subtitle">修改排序值可调整显示顺序；归档前必须移走关联内容。</p></div></div>
      <div className="admin-list-filters"><label>搜索分类<input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></label></div>
      <p role="status" className="admin-feedback">{message}</p><div className="admin-table-scroll"><table><thead><tr><th>名称与地址</th><th>简介</th><th>排序</th><th>启用</th><th>前台导航</th><th>操作</th></tr></thead><tbody>
        {state === "loading" ? <tr><td colSpan={6} className="admin-empty">正在读取分类…</td></tr> : state === "error" ? <tr><td colSpan={6} className="admin-empty" role="alert">分类读取失败，请重试。</td></tr> : items.length ? items.map((item) => { const draft = drafts[item.id] || item; return <tr key={item.id}><td><input aria-label={`${item.name}名称`} disabled={!canEdit} value={draft.name} onChange={(e) => change(item, "name", e.target.value)} /><input aria-label={`${item.name}地址`} disabled={!canEdit} value={draft.slug} onChange={(e) => change(item, "slug", e.target.value.toLowerCase())} /></td><td><input aria-label={`${item.name}简介`} disabled={!canEdit} value={draft.description || ""} onChange={(e) => change(item, "description", e.target.value)} /></td><td><input aria-label={`${item.name}排序`} disabled={!canEdit} type="number" min={0} max={99999} value={draft.sort_order} onChange={(e) => change(item, "sort_order", Number(e.target.value))} /></td><td><input aria-label={`${item.name}启用`} disabled={!canEdit} type="checkbox" checked={draft.is_enabled} onChange={(e) => change(item, "is_enabled", e.target.checked)} /></td><td><input aria-label={`${item.name}显示在导航`} disabled={!canEdit} type="checkbox" checked={draft.show_in_nav} onChange={(e) => change(item, "show_in_nav", e.target.checked)} /></td><td>{canEdit ? <div className="admin-row-actions"><button className="admin-row-action" type="button" disabled={busy || !drafts[item.id]} onClick={() => void save(item)}>保存</button><button className="admin-row-action" type="button" disabled={busy} onClick={() => void archive(item)}>归档</button></div> : "只读"}</td></tr>; }) : <tr><td colSpan={6} className="admin-empty">暂无分类，可在上方创建。</td></tr>}
      </tbody></table></div>{state === "error" && <button type="button" className="admin-row-action" onClick={() => void load()}>重试</button>}{state === "ready" && <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}
