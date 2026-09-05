"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const response = await fetch("/api/admin/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login }) });
    const result = await response.json();
    setMessage(result.message ?? "请求已提交。");
    setSending(false);
  }

  return <main id="main-content" className="admin-login"><form onSubmit={submit}><p className="admin-kicker">ACCOUNT RECOVERY</p><h1>找回后台密码</h1><p>输入管理员账号或绑定邮箱。匹配成功后，重置链接会发送到安全邮箱。</p><label>管理员账号或邮箱<input autoFocus type="text" autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></label><button type="submit" disabled={sending}>{sending ? "正在发送…" : "发送重置邮件"}</button><div aria-live="polite">{message && <p className={message.includes("暂") || message.includes("未") ? "admin-error" : "admin-success"}>{message}</p>}</div><Link className="admin-auth-link" href="/admin/login">返回登录</Link></form></main>;
}
