"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export function AdminChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setMessage("两次输入的新密码不一致。"); return; }
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const result = await response.json();
    if (response.status === 401 && result.message?.includes("登录")) { router.replace("/admin/login"); return; }
    setMessage(result.message ?? "操作失败，请重试。");
    if (response.ok) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setSending(false);
  }

  return <AdminShell><section id="main-content" className="admin-content admin-content-narrow"><header className="admin-header"><div><h1>账号安全</h1><p className="admin-subtitle">修改密码后，其他设备上的登录状态将失效。</p></div></header><form className="admin-editor admin-editor-narrow" onSubmit={submit}><h2>修改密码</h2><label>当前密码<input autoFocus type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>新密码<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={16} /><small>至少 16 位，包含大小写字母、数字和符号。</small></label><label>确认新密码<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={16} /></label><button className="admin-primary" type="submit" disabled={sending}>{sending ? "正在保存…" : "保存新密码"}</button><div aria-live="polite">{message && <p className={message.includes("已更新") ? "admin-success" : "admin-error"}>{message}</p>}</div><Link className="admin-text-link" href="/admin">返回运营概览</Link></form></section></AdminShell>;
}
