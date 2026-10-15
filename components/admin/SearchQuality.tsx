"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Issue = { entity_type: "products" | "articles"; id: string; title: string; slug: string; updated_at: string; missing: string[] };
export function SearchQuality() {
  const [items, setItems] = useState<Issue[]>([]), [total, setTotal] = useState(0), [publishedTotal, setPublishedTotal] = useState(0), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`/api/admin/seo?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data?.items)) throw new Error();
      setItems(result.data.items); setTotal(result.data.total); setPublishedTotal(result.data.publishedTotal); setState("ready");
    } catch { setItems([]); setState("error"); }
  }, [page, pageSize]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>搜索展示检查</h1><p className="admin-subtitle">只检查已发布的真实产品和资讯，列出缺少搜索标题、摘要或封面的页面。</p></div></header>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>待完善页面</h2><p className="admin-panel-subtitle">基于站内实时内容资料。此列表不代表 Google 已收录或未收录。</p></div><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>20</option><option>50</option><option>100</option></select></label></div>
      <div className="admin-table-scroll"><table><thead><tr><th>页面</th><th>类型</th><th>待完善项目</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{state === "loading" ? <tr><td colSpan={5} className="admin-empty">正在核对内容…</td></tr> : state === "error" ? <tr><td colSpan={5} className="admin-empty" role="alert">检查失败，请重试。</td></tr> : items.length ? items.map((item) => <tr key={`${item.entity_type}-${item.id}`}><td><b>{item.title}</b><small>/{item.entity_type === "products" ? "products" : "news"}/{item.slug}</small></td><td>{item.entity_type === "products" ? "产品" : "资讯"}</td><td>{item.missing.join("、")}</td><td>{new Date(item.updated_at).toLocaleDateString("zh-CN")}</td><td><Link className="admin-row-action" href={item.entity_type === "products" ? `/admin/products/${item.id}` : `/admin/news/${item.id}`}>完善内容</Link></td></tr>) : <tr><td colSpan={5} className="admin-empty">{publishedTotal ? "已发布内容暂无这三类缺项。" : "尚无已发布的产品或资讯，发布后将在此自动检查。"}</td></tr>}</tbody></table></div>
      {state === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}{state === "ready" && <div className="admin-pagination"><span>共 {total} 个待完善页面 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
    </section>
  </section></AdminShell>;
}
