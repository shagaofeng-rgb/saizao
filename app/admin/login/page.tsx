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
    if (response.ok) router.replace("/admin");
    else setMessage(result.message ?? "登录失败，请重试。");
    setSending(false);
  }

  return <main id="main-content" className="admin-login"><form onSubmit={submit}><p className="admin-kicker">SAI ZHAO · PRIVATE CONSOLE</p><h1>业务增长后台</h1><p>使用管理员账号与密码进入。后台数据不会公开展示。</p><label>管理员账号或邮箱<input autoFocus type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>管理员密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button type="submit" disabled={sending}>{sending ? "正在验证…" : "安全登录"}</button><div aria-live="polite">{message && <p className="admin-error">{message}</p>}</div><Link className="admin-auth-link" href="/admin/forgot-password">忘记密码？通过邮箱找回</Link></form></main>;
}
