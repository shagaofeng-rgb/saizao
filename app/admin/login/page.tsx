"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (response.ok) router.replace(result.mustChangePassword ? "/admin/change-password" : "/admin");
    else setMessage(result.message ?? "登录失败，请重试。");
    setSending(false);
  }

  return <main id="main-content" className="admin-login"><form onSubmit={submit}><div className="admin-auth-brand">赛兆</div><h1>运营后台</h1><label>管理员邮箱<input autoFocus type="email" autoComplete="email" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>管理员密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button type="submit" disabled={sending}>{sending ? "正在登录…" : "登录"}</button><div aria-live="polite">{message && <p className="admin-error">{message}</p>}</div><Link className="admin-auth-link" href="/admin/forgot-password">忘记密码</Link></form></main>;
}
