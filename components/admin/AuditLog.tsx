"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDateRange } from "@/components/admin/AdminDateRange";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDateRangeValue, adminDateQuery, adminDateRange } from "@/lib/admin-date-range";

type Entry = { id: number; actor_name: string; action: string; entity_type: string; entity_id: string | null; created_at: string };
const actions: Record<string, string> = { content_created: "新建内容", content_status_changed: "修改发布状态", retail_product_updated: "编辑产品", article_updated: "编辑资讯", category_created: "新建分类", category_updated: "修改分类", category_archived: "归档分类", media_uploaded: "上传文件", media_updated: "修改文件说明", media_archived: "归档文件", lead_updated: "更新询盘", lead_note_added: "新增跟进", leads_exported: "导出询盘", lead_notification_retried: "重发询盘通知", google_report_checked: "核验 Google 数据" };
export function AuditLog() {
  const [range, setRange] = useState<AdminDateRangeValue>(() => adminDateRange("90d"));
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20), [total, setTotal] = useState(0);
  const [items, setItems] = useState<Entry[]>([]), [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const params = new URLSearchParams({ ...adminDateQuery(range), page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/api/admin/audit?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) throw new Error();
      setItems(result.data); setTotal(result.total); setState("ready");
    } catch { setItems([]); setState("error"); }
  }, [range, page, pageSize]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>操作记录</h1><p className="admin-subtitle">核对后台关键操作的执行时间与负责人。仅管理员可查看。</p></div></header>
    <section className="admin-filters admin-audit-filters"><AdminDateRange id="audit" value={range} onChange={(value) => { setRange(value); setPage(1); }} /><label>每页<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option>20</option><option>50</option><option>100</option></select></label><button type="button" onClick={() => void load()}>刷新记录</button></section>
    <section className="admin-panel"><h2>记录明细</h2><div className="admin-table-scroll"><table><thead><tr><th>时间（北京时间）</th><th>操作人</th><th>操作</th><th>对象</th></tr></thead><tbody>{state === "loading" ? <tr><td colSpan={4} className="admin-empty">正在读取记录…</td></tr> : state === "error" ? <tr><td colSpan={4} className="admin-empty" role="alert">读取失败，请重试。</td></tr> : items.length ? items.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</td><td>{item.actor_name}</td><td>{actions[item.action] || item.action}</td><td>{item.entity_type} · {item.entity_id || "—"}</td></tr>) : <tr><td colSpan={4} className="admin-empty">所选时间内暂无操作记录。</td></tr>}</tbody></table></div>{state === "ready" && <div className="admin-pagination"><span>共 {total} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}</section>
  </section></AdminShell>;
}
