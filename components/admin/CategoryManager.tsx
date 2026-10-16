"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Category = { id: string; name: string; slug: string; parent_id: string | null; description: string | null; sort_order: number; is_enabled: boolean; show_in_nav: boolean };
const empty = { name: "", slug: "", description: "", parent_id: "" };
export function CategoryManager({ canEdit }: { canEdit: boolean }) {
  const [kind, setKind] = useState<"product" | "article">("product");
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [parents, setParents] = useState<Category[]>([]);
  const [deleteItem, setDeleteItem] = useState<Category | null>(null);
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [total, setTotal] = useState(0);
  const [items, setItems] = useState<Category[]>([]), [drafts, setDrafts] = useState<Record<string, Category>>({});
  const [form, setForm] = useState(empty), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setState("loading");
    try {
      const params = new URLSearchParams({ kind, page: String(page), pageSize: String(pageSize), q: query.trim(), archived: archived ? "1" : "0" });
      const response = await fetch(`/api/admin/categories?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error();
      if (current !== requestId.current) return;
      setItems(result.data); setDrafts({}); setTotal(result.total); setState("ready");
    } catch { if (current === requestId.current) { setItems([]); setState("error"); } }
  }, [kind, page, pageSize, query, archived]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (state !== "ready") return;
    const controller = new AbortController();
    async function loadParents() {
      const values: Category[] = [];
      for (let currentPage = 1; ; currentPage++) {
        const response = await fetch(`/api/admin/categories?kind=${kind}&pageSize=100&page=${currentPage}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) throw new Error();
        values.push(...result.data);
        if (values.length >= result.total || result.data.length < 100) break;
      }
      if (!controller.signal.aborted) setParents(values.filter((item) => !item.parent_id));
    }
    void loadParents().catch(() => { if (!controller.signal.aborted) setParents([]); });
    return () => controller.abort();
  }, [kind, total, state]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, kind }) });
      const result = await response.json();
      setMessage(response.ok ? "分类已创建。" : result.message || "创建失败。");
      if (response.ok) { setForm(empty); setPage(1); setArchived(false); void load(); }
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
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json(); setMessage(response.ok ? "分类已删除，可在已删除列表中恢复。" : result.message || "删除失败。");
      if (response.ok) { setDeleteItem(null); if (items.length === 1 && page > 1) setPage(page - 1); else void load(); }
    } catch { setMessage("归档失败，请重试。"); }
    setBusy(false);
  }
  async function restore(item: Category) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action: "restore" }) });
      const result = await response.json(); setMessage(response.ok ? "分类已恢复，请到使用中列表确认资料后启用。" : result.message || "恢复失败。");
      if (response.ok) { if (items.length === 1 && page > 1) setPage(page - 1); else void load(); }
    } catch { setMessage("恢复失败，请重试。"); }
    finally { setBusy(false); }
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function switchKind(value: "product" | "article") { setKind(value); setPage(1); setForm(empty); setDeleteItem(null); setMessage(""); setParents([]); }
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>内容分类</h1><p className="admin-subtitle">维护分类名称、上下级、排序和前台显示。删除分类前需先调整关联产品与子分类。</p></div></header>
    <div className="admin-segmented" role="group" aria-label="分类类型"><button type="button" aria-pressed={kind === "product"} onClick={() => switchKind("product")}>产品分类</button><button type="button" aria-pressed={kind === "article"} onClick={() => switchKind("article")}>资讯分类</button></div>
    {canEdit && <form className="admin-editor admin-compact-editor" onSubmit={create}><h2>新建{kind === "product" ? "产品" : "资讯"}分类</h2><div className="admin-form-grid"><label>分类名称<input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label><label>英文地址 Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => setForm((v) => ({ ...v, slug: e.target.value.toLowerCase() }))} /></label><label>上级分类<select value={form.parent_id} onChange={(e) => setForm((v) => ({ ...v, parent_id: e.target.value }))}><option value="">一级分类</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label></div><label>分类简介<input maxLength={1000} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label><button className="admin-primary" disabled={busy}>创建分类</button></form>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>分类列表</h2><p className="admin-panel-subtitle">修改排序值可调整显示顺序；归档前必须移走关联内容。</p></div></div>
      <div className="admin-list-filters"><label>搜索分类<input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><label>记录范围<select value={archived ? "archived" : "active"} onChange={(e) => { setArchived(e.target.value === "archived"); setDeleteItem(null); setPage(1); }}><option value="active">使用中</option><option value="archived">已删除</option></select></label><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></label></div>
      {deleteItem && <section className="admin-feedback" role="alert" aria-label="确认删除分类"><p>确认删除“{deleteItem.name}”？如有关联产品或子分类，需要先调整归属。删除后可恢复。</p><div className="admin-row-actions"><button className="admin-row-action" type="button" disabled={busy} onClick={() => void archive(deleteItem)}>确认删除</button><button className="admin-row-action" type="button" disabled={busy} onClick={() => setDeleteItem(null)}>取消</button></div></section>}
      <p role="status" className="admin-feedback">{message}</p><div className="admin-table-scroll"><table><thead><tr><th>名称与地址</th><th>简介</th><th>排序</th><th>启用</th><th>前台导航</th><th>操作</th></tr></thead><tbody>
        {state === "loading" ? <tr><td colSpan={6} className="admin-empty">正在读取分类…</td></tr> : state === "error" ? <tr><td colSpan={6} className="admin-empty" role="alert">分类读取失败，请重试。</td></tr> : items.length ? items.map((item) => { const draft = drafts[item.id] || item; const readOnly = !canEdit || archived; return <tr key={item.id}><td><input aria-label={`${item.name}名称`} disabled={readOnly} value={draft.name} onChange={(e) => change(item, "name", e.target.value)} /><input aria-label={`${item.name}地址`} disabled={readOnly} value={draft.slug} onChange={(e) => change(item, "slug", e.target.value.toLowerCase())} /><label>上级分类<select disabled={readOnly} value={draft.parent_id || ""} onChange={(e) => change(item, "parent_id", e.target.value)}><option value="">一级分类</option>{parents.filter((parent) => parent.id !== item.id).map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label></td><td><input aria-label={`${item.name}简介`} disabled={readOnly} value={draft.description || ""} onChange={(e) => change(item, "description", e.target.value)} /></td><td><input aria-label={`${item.name}排序`} disabled={readOnly} type="number" min={0} max={99999} value={draft.sort_order} onChange={(e) => change(item, "sort_order", Number(e.target.value))} /></td><td><input aria-label={`${item.name}启用`} disabled={readOnly} type="checkbox" checked={draft.is_enabled} onChange={(e) => change(item, "is_enabled", e.target.checked)} /></td><td><input aria-label={`${item.name}显示在导航`} disabled={readOnly} type="checkbox" checked={draft.show_in_nav} onChange={(e) => change(item, "show_in_nav", e.target.checked)} /></td><td>{canEdit ? archived ? <button className="admin-row-action" type="button" disabled={busy} onClick={() => void restore(item)}>恢复</button> : <div className="admin-row-actions"><button className="admin-row-action" type="button" disabled={busy || !drafts[item.id]} onClick={() => void save(item)}>保存</button><button className="admin-row-action" type="button" disabled={busy} onClick={() => setDeleteItem(item)}>删除</button></div> : "只读"}</td></tr>; }) : <tr><td colSpan={6} className="admin-empty">暂无分类，可在上方创建。</td></tr>}
      </tbody></table></div>{state === "error" && <button type="button" className="admin-row-action" onClick={() => void load()}>重试</button>}{state === "ready" && <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}
