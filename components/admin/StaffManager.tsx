"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Staff = { id: string; email: string; display_name: string; role: string; is_active: boolean; force_password_reset: boolean; last_login_at?: string; created_at: string };
const roleLabels: Record<string, string> = { admin: "管理员", sales: "销售", content_editor: "内容编辑", viewer: "只读" };

export function StaffManager() {
  const [items, setItems] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", role: "sales", temporaryPassword: "" });

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/staff", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setItems(result.data);
    else setMessage(result.message ?? "读取失败。");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json();
    setBusy(false);
    setMessage(result.message ?? (response.ok ? "员工已创建。" : "创建失败。"));
    if (response.ok) {
      setForm({ email: "", displayName: "", role: "sales", temporaryPassword: "" });
      void load();
    }
  }

  async function toggle(item: Staff) {
    const response = await fetch("/api/admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.is_active }) });
    const result = await response.json();
    setMessage(result.message ?? (response.ok ? "状态已更新。" : "更新失败。"));
    if (response.ok) void load();
  }

  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>团队账号</h1><p className="admin-subtitle">管理可访问业务中心的团队成员。</p></div></header>
    <section className="admin-split">
      <form className="admin-editor" onSubmit={submit}><h2>创建员工</h2><label>员工姓名<input required value={form.displayName} onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} /></label><label>工作邮箱<input required type="email" value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} /></label><label>角色<select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>临时密码<input required type="password" minLength={16} value={form.temporaryPassword} onChange={(event) => setForm((value) => ({ ...value, temporaryPassword: event.target.value }))} /><small>至少 16 位，包含大小写字母、数字和符号。</small></label><button className="admin-primary" disabled={busy}>{busy ? "正在创建…" : "创建员工"}</button><div aria-live="polite">{message && <p className="admin-feedback">{message}</p>}</div></form>
      <section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><h2>员工列表</h2></div><div className="admin-table-scroll"><table><thead><tr><th>员工</th><th>邮箱</th><th>角色</th><th>状态</th><th>最后登录</th><th>操作</th></tr></thead><tbody>{items.length ? items.map((item) => <tr key={item.id}><td>{item.display_name}</td><td>{item.email}</td><td><span className="admin-tag">{roleLabels[item.role] ?? item.role}</span></td><td>{item.is_active ? "启用" : "停用"}{item.force_password_reset && <small>首次登录需修改密码</small>}</td><td>{item.last_login_at ? new Date(item.last_login_at).toLocaleString("zh-CN") : "未登录"}</td><td><button className="admin-row-action" onClick={() => void toggle(item)}>{item.is_active ? "停用" : "启用"}</button></td></tr>) : <tr><td colSpan={6} className="admin-empty">暂无员工</td></tr>}</tbody></table></div></section>
    </section>
  </section></AdminShell>;
}
