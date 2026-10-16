"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { ProductImage } from "@/lib/retail-types";

type Category = { id: string; name: string; is_enabled: boolean };
type Tab = "basic" | "images" | "search";
type UploadTarget = "coverUrl" | "heroUrl" | "gallery" | "attachmentUrl";
const tabs: { id: Tab; label: string }[] = [{ id: "basic", label: "基本资料" }, { id: "images", label: "产品图片与资料" }, { id: "search", label: "搜索展示" }];
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const initial = { title: "", slug: "", categoryId: "", summary: "", content: "", application: "", coverUrl: "", heroUrl: "", attachmentUrl: "", seoTitle: "", seoDescription: "" };
const slugFromTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

export function ProductCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial), [gallery, setGallery] = useState<ProductImage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("basic"), [slugEdited, setSlugEdited] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]), [categoryState, setCategoryState] = useState<"loading" | "ready" | "error">("loading");
  const [uploading, setUploading] = useState(false), [saving, setSaving] = useState(false), [progress, setProgress] = useState("");
  const [message, setMessage] = useState(""), [hasError, setHasError] = useState(false);
  const busy = uploading || saving;
  const operationLock = useRef(false), nameInput = useRef<HTMLInputElement>(null), slugInput = useRef<HTMLInputElement>(null);
  const loadCategories = useCallback(async () => {
    setCategoryState("loading");
    try {
      const records: Category[] = [];
      for (let page = 1; ; page++) {
        const response = await fetch(`/api/admin/categories?kind=product&pageSize=100&page=${page}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) throw new Error();
        records.push(...result.data);
        if (records.length >= result.total || result.data.length < 100) break;
      }
      setCategories(records.filter((item) => item.is_enabled)); setCategoryState("ready");
    } catch { setCategoryState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadCategories(), 0); return () => window.clearTimeout(timer); }, [loadCategories]);
  function update(key: keyof typeof initial, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[next].id); document.getElementById(`product-tab-${tabs[next].id}`)?.focus();
  }
  async function upload(event: ChangeEvent<HTMLInputElement>, target: UploadTarget) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!files.length || operationLock.current) return;
    if (target === "gallery" && gallery.length + files.length > 12) { setHasError(true); setMessage("图集最多 12 张，请减少选择数量。"); return; }
    if (files.some((file) => file.size > 4 * 1024 * 1024 || (target === "attachmentUrl" ? file.type !== "application/pdf" : !imageTypes.has(file.type)))) {
      setHasError(true); setMessage(target === "attachmentUrl" ? "请选择不超过 4MB 的 PDF 文件。" : "请选择不超过 4MB 的 JPG、PNG、WebP 或 AVIF 图片。"); return;
    }
    operationLock.current = true; setUploading(true); setMessage(""); setHasError(false);
    let uploaded = 0;
    try {
      for (const file of files) {
        setProgress(`正在上传 ${uploaded + 1}/${files.length}：${file.name}`);
        const data = new FormData(); data.set("file", file);
        const response = await fetch("/api/admin/media", { method: "POST", body: data });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.data?.public_url) throw new Error(result.message || "上传未完成，请重试。");
        const url = String(result.data.public_url);
        if (target === "gallery") setGallery((current) => [...current, { url, alt: form.title.trim() }]);
        else update(target, url);
        uploaded++;
      }
      setMessage(`已上传 ${uploaded} 个文件，保存产品后关联生效。`);
    } catch (error) { setHasError(true); setMessage(`${uploaded ? `已上传 ${uploaded} 个文件。` : ""}${error instanceof Error ? error.message : "上传失败，请重试。"}`); }
    finally { operationLock.current = false; setUploading(false); setProgress(""); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (operationLock.current) return;
    if (form.title.trim().length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      setActiveTab("basic"); setHasError(true); setMessage(form.title.trim().length < 2 ? "请填写至少两个字的产品名称。" : "页面地址请使用英文字母、数字和短横线。");
      requestAnimationFrame(() => (form.title.trim().length < 2 ? nameInput.current : slugInput.current)?.focus()); return;
    }
    operationLock.current = true; setSaving(true); setMessage(""); setHasError(false);
    try {
      const response = await fetch("/api/admin/content/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, title: form.title.trim(), gallery, status: "draft" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.data?.id) throw new Error(result.message || "保存未完成，请先到产品列表检查后再重试。");
      router.replace(`/admin/products/${result.data.id}`);
    } catch (error) { setHasError(true); setMessage(error instanceof Error ? error.message : "保存未完成，请先到产品列表检查后再重试。"); setSaving(false); operationLock.current = false; }
  }
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <Link className="admin-text-link" href="/admin/products"><ArrowLeft aria-hidden="true" /> 返回产品管理</Link>
    <header className="admin-header admin-detail-header"><div><h1>上传产品</h1><p className="admin-subtitle">录入产品资料并上传图片，保存后继续设置零售规格与详情板块。</p></div><span className="admin-tag">保存为草稿</span></header>
    <form onSubmit={save} noValidate className="admin-product-create">
      <div className="admin-product-tabs" role="tablist" aria-label="产品录入板块">{tabs.map((tab, index) => <button id={`product-tab-${tab.id}`} key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`product-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={(event) => changeTab(event, index)} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>
      <section id="product-panel-basic" role="tabpanel" aria-labelledby="product-tab-basic" hidden={activeTab !== "basic"} className="admin-editor admin-product-section">
        <h2>产品资料</h2><fieldset className="admin-product-fields" disabled={busy}>
          <div className="admin-form-grid"><label>产品名称（必填）<input ref={nameInput} required minLength={2} maxLength={180} value={form.title} onChange={(e) => { update("title", e.target.value); if (!slugEdited) update("slug", slugFromTitle(e.target.value)); }} /></label><label>页面地址（英文，必填）<input ref={slugInput} required maxLength={120} value={form.slug} onChange={(e) => { setSlugEdited(true); update("slug", e.target.value.toLowerCase()); }} /><small>网址：/products/{form.slug || "…"}</small></label></div>
          <div className="admin-form-grid"><label>产品分类<select value={form.categoryId} disabled={categoryState === "loading"} onChange={(e) => update("categoryId", e.target.value)}><option value="">未分类</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>应用场景<input maxLength={160} value={form.application} onChange={(e) => update("application", e.target.value)} /></label></div>
          <div className="admin-row-actions"><Link href="/admin/categories" target="_blank" rel="noopener noreferrer" className="admin-row-action">管理产品分类</Link><button type="button" className="admin-row-action" disabled={categoryState === "loading"} onClick={() => void loadCategories()}>刷新分类</button>{categoryState === "error" && <span role="alert" className="admin-error">分类读取失败，请重试。</span>}{categoryState === "ready" && !categories.length && <span className="admin-panel-subtitle">暂无已启用分类，可先保存草稿。</span>}</div>
          <label>产品简介<textarea rows={3} maxLength={600} value={form.summary} onChange={(e) => update("summary", e.target.value)} /></label>
          <label>产品说明<textarea rows={8} maxLength={30000} value={form.content} onChange={(e) => update("content", e.target.value)} /></label>
        </fieldset>
      </section>
      <section id="product-panel-images" role="tabpanel" aria-labelledby="product-tab-images" hidden={activeTab !== "images"} className="admin-editor admin-product-section">
        <h2>产品图片与资料</h2><p className="admin-panel-subtitle">图片支持 JPG、PNG、WebP、AVIF，单个文件不超过 4MB。图集最多 12 张。</p>
        <fieldset className="admin-product-fields" disabled={busy}>
          <div className="admin-form-grid">{([{ field: "coverUrl", label: "产品主图", note: "用于产品列表和商品主图" }, { field: "heroUrl", label: "详情首屏图片", note: "用于产品详情页首屏展示" }] as const).map(({ field, label, note }) => <div className="admin-product-image-field" key={field}><label>{label}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => void upload(e, field)} /><small>{note}</small></label><div className="admin-product-image-preview">{form[field] ? <Image src={form[field]} alt={form.title || label} width={440} height={280} sizes="(max-width: 860px) 90vw, 40vw" /> : <span><ImageSquare aria-hidden="true" />尚未上传</span>}</div>{form[field] && <button type="button" className="admin-row-action" onClick={() => update(field, "")}><Trash aria-hidden="true" />移除图片</button>}</div>)}</div>
          <label className="admin-product-gallery-label">产品图集<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => void upload(e, "gallery")} /><small>可一次选择多张图片；已添加 {gallery.length}/12 张。</small></label>
          {gallery.length > 0 && <div className="admin-product-gallery">{gallery.map((image, index) => <article key={image.url}><Image src={image.url} alt={image.alt || `产品图 ${index + 1}`} width={220} height={170} sizes="(max-width: 600px) 90vw, 220px" /><label>图片说明<input value={image.alt} maxLength={180} onChange={(e) => setGallery((current) => current.map((item, at) => at === index ? { ...item, alt: e.target.value } : item))} /></label><button type="button" className="admin-row-action" onClick={() => setGallery((current) => current.filter((_, at) => at !== index))}><Trash aria-hidden="true" />移除</button></article>)}</div>}
          <label>产品资料（PDF）<input type="file" accept="application/pdf" onChange={(e) => void upload(e, "attachmentUrl")} /></label>{form.attachmentUrl && <div className="admin-row-actions"><a className="admin-row-action" href={form.attachmentUrl} target="_blank" rel="noopener noreferrer">查看已上传资料</a><button type="button" className="admin-row-action" onClick={() => update("attachmentUrl", "")}>移除资料</button></div>}
        </fieldset>
      </section>
      <section id="product-panel-search" role="tabpanel" aria-labelledby="product-tab-search" hidden={activeTab !== "search"} className="admin-editor admin-product-section">
        <h2>搜索展示</h2><fieldset className="admin-product-fields" disabled={busy}><label>搜索标题<input maxLength={180} value={form.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} /></label><label>搜索摘要<textarea rows={4} maxLength={320} value={form.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} /></label></fieldset>
      </section>
      <footer className="admin-product-save"><div aria-live="polite"><p className={`admin-feedback${hasError ? " admin-error" : ""}`} role={hasError ? "alert" : "status"}>{progress || message || "保存后可预览产品、设置售价与库存，并完成发布。"}</p></div><button className="admin-primary" type="submit" disabled={busy}><UploadSimple aria-hidden="true" />{saving ? "正在保存…" : uploading ? "正在上传…" : "保存并完善详情"}</button></footer>
    </form>
  </section></AdminShell>;
}
