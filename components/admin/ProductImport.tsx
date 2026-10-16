"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

type ImportItem = { sourceId: string; sourceUrl: string; categorySourceId: string; data: { title: string } };
type ImportPackage = { format: string; sourceTotal: number; categories: { id: string; name: string; url: string; parentId: string }[]; products: ImportItem[] };
type Result = { sourceId: string; title: string; state: "created" | "skipped" | "error"; id?: string; message?: string };
export function ProductImport({ canPublish }: { canPublish: boolean }) {
  const [file, setFile] = useState<ImportPackage | null>(null);
  const [busy, setBusy] = useState(false), [publish, setPublish] = useState(false), [partial, setPartial] = useState(false);
  const [message, setMessage] = useState(""), [completed, setCompleted] = useState(0), [results, setResults] = useState<Result[]>([]), [page, setPage] = useState(1);
  const stop = useRef(false);
  async function chooseFile(value: File) {
    setFile(null); setMessage(""); setResults([]); setCompleted(0); setPage(1);
    try {
      if (value.size > 32 * 1024 * 1024) throw new Error("资料包不能超过 32MB。");
      const parsed = JSON.parse(await value.text()) as ImportPackage;
      if (parsed.format !== "saizhao-alibaba-v1" || !Array.isArray(parsed.categories) || !Array.isArray(parsed.products) || !parsed.products.length || parsed.products.length > 2000 || !Number.isInteger(parsed.sourceTotal) || parsed.sourceTotal < parsed.products.length || new Set(parsed.products.map((item) => item.sourceId)).size !== parsed.products.length || parsed.products.some((item) => !item?.sourceId || !item.data?.title)) throw new Error("资料包格式不正确，请选择已核对的产品资料包。");
      setFile(parsed); setPartial(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "资料包无法读取。"); }
  }
  async function start() {
    if (!file || busy || (file.products.length < file.sourceTotal && !partial)) return;
    setBusy(true); stop.current = false; setMessage("正在同步分类…"); setCompleted(0); setResults([]); setPage(1);
    try {
      const categories = await fetch("/api/admin/import/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "categories", categories: file.categories }) });
      const categoryResult = await categories.json();
      if (!categories.ok) throw new Error(categoryResult.message || "分类同步失败。");
      let failures = 0;
      for (const [index, product] of file.products.entries()) {
        if (stop.current) break;
        setMessage(`正在导入：${product.data.title}`);
        let result: Result;
        try {
          const response = await fetch("/api/admin/import/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "product", product, publish }) });
          const saved = await response.json();
          if (!response.ok || !saved.data?.id) throw new Error(saved.message || "导入未完成。");
          result = { sourceId: product.sourceId, title: product.data.title, state: saved.skipped ? "skipped" : "created", id: saved.data.id };
        } catch (error) { failures++; result = { sourceId: product.sourceId, title: product.data.title, state: "error", message: error instanceof Error ? error.message : "网络连接失败。" }; }
        setResults((current) => [...current, result]); setCompleted(index + 1);
      }
      setMessage(stop.current ? "导入已暂停。再次开始时会跳过已存在产品，不会覆盖手工修改。" : failures ? `本次处理结束，${failures} 条未完成。可查看下方记录并重试。` : "本次资料包处理完成。已存在产品保持原样，未覆盖运营修改。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "导入暂时无法完成。"); }
    finally { setBusy(false); }
  }
  const pages = Math.max(1, Math.ceil(results.length / 10));
  return <AdminShell><section id="main-content" className="admin-content admin-content-wide">
    <header className="admin-header"><div><h1>批量导入产品</h1><p className="admin-subtitle">导入已核对的分类、产品参数和图片。已有产品不会重复创建或被覆盖。</p></div><Link className="admin-row-action" href="/admin/products">返回产品管理</Link></header>
    <section className="admin-panel admin-editor"><h2>产品资料包</h2><label>选择已核对的资料包<input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} /></label>
      {file && <><p>来源共有 {file.sourceTotal} 个产品，本资料包包含 {file.products.length} 个已核实详情、{file.categories.length} 个分类。</p>{file.products.length < file.sourceTotal && <label><input type="checkbox" disabled={busy} checked={partial} onChange={(event) => setPartial(event.target.checked)} /> 仅导入已核实的 {file.products.length} 个产品，其余 {file.sourceTotal - file.products.length} 个待补充详情</label>}
        {canPublish && <label><input type="checkbox" disabled={busy} checked={publish} onChange={(event) => setPublish(event.target.checked)} /> 导入后发布已核实产品（不启用在线零售）</label>}
        <div className="admin-row-actions"><button type="button" className="admin-primary" disabled={busy || (file.products.length < file.sourceTotal && !partial)} onClick={() => void start()}>{busy ? "正在导入…" : "开始导入"}</button>{busy && <button type="button" className="admin-row-action" onClick={() => { stop.current = true; setMessage("将在当前产品处理完成后暂停。"); }}>暂停导入</button>}</div>
        <label>已处理 {completed} / {file.products.length}<progress max={file.products.length} value={completed} aria-label="产品导入进度" /></label>
      </>}
      <p role="status" className="admin-feedback">{message}</p>
    </section>
    {results.length > 0 && <section className="admin-panel"><h2>导入记录</h2><div className="admin-table-scroll"><table><thead><tr><th>产品</th><th>来源编号</th><th>结果</th><th>操作</th></tr></thead><tbody>{results.slice((page - 1) * 10, page * 10).map((result) => <tr key={result.sourceId}><td>{result.title}</td><td>{result.sourceId}</td><td>{result.state === "created" ? "已导入" : result.state === "skipped" ? "已存在，未覆盖" : result.message}</td><td>{result.id && <Link className="admin-row-action" href={`/admin/products/${result.id}`}>编辑产品</Link>}</td></tr>)}</tbody></table></div><div className="admin-pagination"><span>共 {results.length} 条 · 第 {page}/{pages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>下一页</button></div></div></section>}
  </section></AdminShell>;
}
