"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const timeout = window.setTimeout(() => setToken(params.get("token") ?? ""), 0);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) { setMessage("两次输入的密码不一致。"); return; }
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const result = await response.json();
    setMessage(result.message ?? "操作失败，请重试。");
    if (response.ok) { setPassword(""); setConfirmPassword(""); setCompleted(true); }
    setSending(false);
  }

  return <main id="main-content" className="admin-login"><form onSubmit={submit}><p className="admin-kicker">SECURE PASSWORD RESET</p><h1>设置新密码</h1><p>新密码至少 16 位，并同时包含大写字母、小写字母、数字和符号。</p>{completed ? null : token === null ? <p>正在校验重置链接…</p> : token ? <><label>新密码<input autoFocus type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={16} /></label><label>确认新密码<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={16} /></label><button type="submit" disabled={sending}>{sending ? "正在更新…" : "更新密码"}</button></> : <p className="admin-error">重置链接无效或已被清除，请重新申请。</p>}<div aria-live="polite">{message && <p className={message.includes("已更新") ? "admin-success" : "admin-error"}>{message}</p>}</div><Link className="admin-auth-link" href={completed || token ? "/admin/login" : "/admin/forgot-password"}>{completed || token ? "返回登录" : "重新申请重置链接"}</Link></form></main>;
}
