"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type Article = { id: string; title: string; slug: string; category_id: string | null; article_type: string; excerpt: string | null; content: string | null; cover_url: string | null; cover_alt: string | null; attachment_url: string | null; seo_title: string | null; seo_description: string | null; focus_keywords: string | null; status: string; updated_at: string };
type Category = { id: string; name: string };
type Revision = { id: string; created_at: string };
const statusLabels: Record<string, string> = { draft: "草稿", review: "待审核", published: "已发布", archived: "已归档" };
const typeLabels: Record<string, string> = { news: "新闻", insight: "洞察", faq: "常见问题", market: "市场动态" };
export function ArticleEditor({ id, canPublish }: { id: string; canPublish: boolean }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]), [revisions, setRevisions] = useState<Revision[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([fetch(`/api/admin/content/articles/${id}`, { cache: "no-store" }).then((res) => res.json()), fetch("/api/admin/categories?kind=article&pageSize=100", { cache: "no-store" }).then((res) => res.json())])
      .then(([detail, catalog]) => { if (!live) return; if (!detail.data) { setState("error"); return; } setArticle(detail.data); setRevisions(detail.revisions || []); setCategories(Array.isArray(catalog.data) ? catalog.data : []); setState("ready"); })
      .catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [id]);
  function update<Key extends keyof Article>(key: Key, value: Article[Key]) { setArticle((current) => current ? { ...current, [key]: value } : current); }
  async function upload(file: File | undefined, field: "cover_url" | "attachment_url") {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const result = await response.json();
      if (response.ok) { update(field, result.data.public_url); setMessage("文件已上传，保存资讯后生效。"); }
      else setMessage(result.message || "上传失败。");
    } catch { setMessage("上传失败，请重试。"); }
    setBusy(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!article) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/content/articles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(article) });
      const result = await response.json();
      if (response.ok) { setArticle(result.data); setMessage("资讯已保存。"); const fresh = await fetch(`/api/admin/content/articles/${id}`, { cache: "no-store" }).then((res) => res.json()); setRevisions(fresh.revisions || []); }
      else setMessage(result.message || "保存失败。");
    } catch { setMessage("保存失败，请重试。"); }
    setBusy(false);
  }
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <Link className="admin-text-link" href="/admin/news">← 返回资讯列表</Link>
    <header className="admin-header admin-detail-header"><div><h1>编辑资讯</h1><p className="admin-subtitle">修改正文、封面、分类和搜索展示信息；仅管理员可以发布。</p></div></header>
    {state === "loading" ? <section className="admin-panel"><p className="admin-empty">正在读取资讯…</p></section> : state === "error" || !article ? <section className="admin-callout" role="alert"><h2>无法读取资讯</h2><p>请返回资讯列表重试。</p></section> : <>
      <form className="admin-editor admin-article-editor" onSubmit={save}>
        <h2>基本资料</h2>
        <div className="admin-form-grid"><label>标题<input required minLength={2} maxLength={180} value={article.title} onChange={(e) => update("title", e.target.value)} /></label><label>页面地址 Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={article.slug} onChange={(e) => update("slug", e.target.value.toLowerCase())} /></label></div>
        <div className="admin-form-grid"><label>资讯分类<select value={article.category_id || ""} onChange={(e) => update("category_id", e.target.value || null)}><option value="">未分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>内容类型<select value={article.article_type} onChange={(e) => update("article_type", e.target.value)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <label>摘要<textarea rows={3} maxLength={600} value={article.excerpt || ""} onChange={(e) => update("excerpt", e.target.value)} /></label>
        <label>正文<textarea rows={16} value={article.content || ""} onChange={(e) => update("content", e.target.value)} /></label>
        <h2>媒体与搜索展示</h2>
        <div className="admin-form-grid"><label>封面图片<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(e) => void upload(e.target.files?.[0], "cover_url")} />{article.cover_url && <small>已设置封面图片</small>}</label><label>附件<input type="file" accept="application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(e) => void upload(e.target.files?.[0], "attachment_url")} />{article.attachment_url && <small>已设置附件</small>}</label></div>
        <label>媒体库封面链接<input type="url" value={article.cover_url || ""} onChange={(e) => update("cover_url", e.target.value || null)} /><small>可复制媒体库中已上传图片的链接。</small></label>
        <label>封面图片替代文字<input maxLength={180} value={article.cover_alt || ""} onChange={(e) => update("cover_alt", e.target.value || null)} /></label>
        <div className="admin-form-grid"><label>搜索标题<input maxLength={180} value={article.seo_title || ""} onChange={(e) => update("seo_title", e.target.value)} /></label><label>搜索摘要<textarea rows={3} maxLength={320} value={article.seo_description || ""} onChange={(e) => update("seo_description", e.target.value)} /></label></div>
        <label>重点关键词<input maxLength={500} value={article.focus_keywords || ""} onChange={(e) => update("focus_keywords", e.target.value || null)} /><small>多个词组用英文逗号分隔。</small></label>
        <label>发布状态<select value={article.status} disabled={busy || (article.status === "published" && !canPublish)} onChange={(e) => update("status", e.target.value)}>{Object.entries(statusLabels).filter(([value]) => canPublish || value !== "published" || article.status === "published").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="admin-row-actions"><button className="admin-primary" type="submit" disabled={busy}>{busy ? "正在保存…" : "保存资讯"}</button>{article.status === "published" && <Link className="admin-row-action" target="_blank" href={`/news/${article.slug}`}>查看公开页面</Link>}</div>
        <p role="status" className="admin-feedback">{message}</p>
      </form>
      <section className="admin-panel admin-article-editor"><h2>最近修改记录</h2><p className="admin-panel-subtitle">保存前的内容会自动留存，用于核对修改时间。</p>{revisions.length ? <div className="admin-timeline">{revisions.map((revision) => <div key={revision.id}><time>{new Date(revision.created_at).toLocaleString("zh-CN")}</time><span>已保存历史版本</span></div>)}</div> : <p className="admin-empty">暂无历史版本</p>}</section>
    </>}
  </section></AdminShell>;
}
