"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Staff = { id: string; email: string; display_name: string; role: string; is_active: boolean; force_password_reset: boolean; last_login_at?: string; created_at: string };
const roleLabels: Record<string, string> = { super_admin: "超级管理员", admin: "管理员", sales: "销售", content_editor: "内容编辑", viewer: "只读" };
const pageSize = 10;

export function StaffManager() {
  const [items, setItems] = useState<Staff[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading"), [page, setPage] = useState(1), [query, setQuery] = useState("");
  const [form, setForm] = useState({ email: "", displayName: "", role: "sales", temporaryPassword: "" });
  const load = useCallback(async () => {
    setReadState("loading"); setItems([]);
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) { setReadState("error"); return; }
      setItems(result.data); setReadState("ready");
    } catch { setReadState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      setMessage(result.message ?? (response.ok ? "员工已创建。" : "创建失败。"));
      if (response.ok) { setForm({ email: "", displayName: "", role: "sales", temporaryPassword: "" }); void load(); }
    } catch { setMessage("创建失败，请重试。"); }
    setBusy(false);
  }
  async function toggle(item: Staff) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.is_active }) });
      const result = await response.json();
      setMessage(result.message ?? (response.ok ? "状态已更新。" : "更新失败。"));
      if (response.ok) void load();
    } catch { setMessage("更新失败，请重试。"); }
    setBusy(false);
  }
  const filtered = items.filter((item) => `${item.display_name} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide"><header className="admin-header"><div><h1>团队账号</h1><p className="admin-subtitle">管理有权访问业务中心的团队成员。</p></div></header><section className="admin-split">
    <form className="admin-editor" onSubmit={submit}><h2>创建员工</h2><label>员工姓名<input required value={form.displayName} onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} /></label><label>工作邮箱<input required type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} /></label><label>角色<select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>{Object.entries(roleLabels).filter(([key]) => key !== "super_admin").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>临时密码<input required type="password" minLength={16} value={form.temporaryPassword} onChange={(event) => setForm((value) => ({ ...value, temporaryPassword: event.target.value }))} /><small>至少 16 位，包含大小写字母、数字和符号。</small></label><button className="admin-primary" disabled={busy}>{busy ? "正在创建…" : "创建员工"}</button><p role="status" className="admin-feedback">{message}</p></form>
    <section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><div><h2>员工列表</h2><p className="admin-panel-subtitle">来源：后台账号记录。</p></div></div><div className="admin-list-filters"><label>搜索姓名或邮箱<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label></div><div className="admin-table-scroll"><table><thead><tr><th>员工</th><th>邮箱</th><th>角色</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead><tbody>{readState === "loading" ? <tr><td colSpan={6} className="admin-empty">正在读取员工记录…</td></tr> : readState === "error" ? <tr><td colSpan={6} className="admin-empty" role="alert">读取失败，请重试。</td></tr> : visible.length ? visible.map((item) => <tr key={item.id}><td>{item.display_name}</td><td>{item.email}</td><td><span className="admin-tag">{roleLabels[item.role] ?? item.role}</span></td><td>{item.is_active ? "启用" : "停用"}{item.force_password_reset && <small>首次登录需修改密码</small>}</td><td>{item.last_login_at ? new Date(item.last_login_at).toLocaleString("zh-CN") : "未登录"}</td><td><button className="admin-row-action" type="button" disabled={busy} onClick={() => void toggle(item)}>{item.is_active ? "停用" : "启用"}</button></td></tr>) : <tr><td colSpan={6} className="admin-empty">暂无符合条件的员工</td></tr>}</tbody></table></div>{readState === "error" && <button className="admin-row-action" type="button" onClick={() => void load()}>重试</button>}{readState === "ready" && <div className="admin-pagination"><span>共 {filtered.length} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div>}</section>
  </section></section></AdminShell>;
}
