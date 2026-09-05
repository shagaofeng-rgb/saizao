"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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

  return <main id="main-content" className="admin-login"><form onSubmit={submit}><p className="admin-kicker">ACCOUNT SECURITY</p><h1>修改后台密码</h1><p>修改后其他设备上的后台登录会立即失效。</p><label>当前密码<input autoFocus type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>新密码<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={16} /></label><label>确认新密码<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={16} /></label><button type="submit" disabled={sending}>{sending ? "正在更新…" : "保存新密码"}</button><div aria-live="polite">{message && <p className={message.includes("已更新") ? "admin-success" : "admin-error"}>{message}</p>}</div><Link className="admin-auth-link" href="/admin">返回数据后台</Link></form></main>;
}
