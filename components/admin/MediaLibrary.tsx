"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Asset = { id: string; file_name: string; public_url: string; mime_type: string; byte_size: number; asset_kind: string; alt_text: string | null; created_at: string };
type Usage = { products: { id: string; title: string }[]; articles: { id: string; title: string }[] };
export function MediaLibrary({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Asset[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState(""), [kind, setKind] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [alt, setAlt] = useState<Record<string, string>>({}), [usage, setUsage] = useState<Record<string, Usage>>({});
  const load = useCallback(async () => {
    setState("loading");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), q, kind });
      const response = await fetch(`/api/admin/media?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error();
      setItems(result.data); setTotal(result.total); setAlt(Object.fromEntries(result.data.map((item: Asset) => [item.id, item.alt_text || ""]))); setState("ready");
    } catch { setItems([]); setState("error"); }
  }, [page, pageSize, q, kind]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const result = await response.json(); setMessage(response.ok ? "文件已上传，可以填写替代文字并复制链接。" : result.message || "上传失败。");
      if (response.ok) { setPage(1); void load(); }
    } catch { setMessage("上传失败，请重试。"); }
    setBusy(false);
  }
  async function save(item: Asset) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, altText: alt[item.id] }) });
      const result = await response.json(); setMessage(response.ok ? "文件说明已保存。" : result.message || "保存失败。");
      if (response.ok) void load();
    } catch { setMessage("保存失败，请重试。"); }
    setBusy(false);
  }
  async function showUsage(item: Asset) {
    try {
      const response = await fetch(`/api/admin/media?usage=${item.id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(); setUsage((current) => ({ ...current, [item.id]: result.data }));
    } catch { setMessage("无法查询使用位置，请重试。"); }
  }
  async function archive(item: Asset) {
    if (!window.confirm(`确定归档“${item.file_name}”？文件仍可在存储中恢复，但不会出现在媒体库。`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json(); setMessage(response.ok ? "文件已归档。" : result.message || "归档失败。");
      if (response.ok) void load();
    } catch { setMessage("归档失败，请重试。"); }
    setBusy(false);
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>媒体库</h1><p className="admin-subtitle">统一管理产品和资讯使用的真实图片与文件。归档不会立即删除存储对象。</p></div></header>
    {canEdit && <section className="admin-editor admin-compact-editor"><h2>上传文件</h2><label>选择图片、PDF、CSV 或 XLSX（不超过 4MB）<input type="file" disabled={busy} accept="image/jpeg,image/png,image/webp,image/avif,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => void upload(e.target.files?.[0])} /></label></section>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>已上传文件</h2><p className="admin-panel-subtitle">仅展示真实上传记录；可查询文件在产品与资讯中的引用。</p></div></div>
      <div className="admin-list-filters"><label>搜索文件名<input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label><label>类型<select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">全部</option><option value="image">图片</option><option value="document">文档</option><option value="spreadsheet">表格</option></select></label><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>10</option><option>20</option><option>50</option><option>100</option></select></label></div>
      <p role="status" className="admin-feedback">{message}</p><div className="admin-media-list">{state === "loading" ? <p className="admin-empty">正在读取媒体资料…</p> : state === "error" ? <p role="alert" className="admin-empty">媒体库暂时无法读取。</p> : items.length ? items.map((item) => <article className="admin-media-item" key={item.id}><div className="admin-media-preview">{item.asset_kind === "image" ? <Image src={item.public_url} width={120} height={90} alt={item.alt_text || "图片预览"} /> : <span>{item.mime_type === "application/pdf" ? "PDF" : "文件"}</span>}</div><div className="admin-media-information"><h3>{item.file_name}</h3><p>{(item.byte_size / 1024).toFixed(1)} KB · {new Date(item.created_at).toLocaleDateString("zh-CN")}</p><label>替代文字或文件说明<input disabled={!canEdit} value={alt[item.id] || ""} onChange={(e) => setAlt((current) => ({ ...current, [item.id]: e.target.value }))} /></label><div className="admin-row-actions">{canEdit && <button type="button" className="admin-row-action" disabled={busy || alt[item.id] === (item.alt_text || "")} onClick={() => void save(item)}>保存说明</button>}<button type="button" className="admin-row-action" onClick={() => void navigator.clipboard.writeText(item.public_url).then(() => setMessage("文件链接已复制。"), () => setMessage("无法复制，请使用打开文件。"))}>复制链接</button><a className="admin-row-action" href={item.public_url} target="_blank" rel="noopener noreferrer">打开文件</a><button type="button" className="admin-row-action" onClick={() => void showUsage(item)}>使用位置</button>{canEdit && <button type="button" className="admin-row-action" disabled={busy} onClick={() => void archive(item)}>归档</button>}</div>{usage[item.id] && <p className="admin-media-usage">{usage[item.id].products.length || usage[item.id].articles.length ? <>产品：{usage[item.id].products.map((p) => <Link key={p.id} href={`/admin/products/${p.id}`}>{p.title}</Link>)}　资讯：{usage[item.id].articles.map((a) => <span key={a.id}>{a.title} </span>)}</> : "未发现产品或资讯引用"}</p>}</div></article>) : <p className="admin-empty">暂无符合条件的文件。</p>}</div>
      {state === "error" && <button type="button" className="admin-row-action" onClick={() => void load()}>重试</button>}{state === "ready" && <div className="admin-pagination"><span>共 {total} 个文件 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}
