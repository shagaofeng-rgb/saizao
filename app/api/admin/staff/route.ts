import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { hashAdminPassword, passwordPolicyMessage } from "@/lib/admin-credentials";
import { rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const search=new URL(request.url).searchParams, now=new Date(), fallback=new Date(now.getTime()-29*86400000);
  const date=(value:string|null,defaultValue:Date)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():defaultValue.toISOString();
  const page=Math.max(1,Number(search.get("page")??1)), pageSize=Math.min(100,Math.max(20,Number(search.get("pageSize")??20)));
  const role=search.get("role")??"", activeValue=search.get("active"), active=activeValue==="true"?true:activeValue==="false"?false:null;
  const staff = await rpc("admin_list_staff_page", { p_start:date(search.get("from"),fallback), p_end:date(search.get("to"),now), p_role:role, p_active:active, p_query:search.get("q")??"", p_page:page, p_page_size:pageSize }).catch(() => null);
  return staff ? NextResponse.json({ data: staff }) : NextResponse.json({ message: "无法读取员工账号。" }, { status: 503 });
}
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const role = typeof body.role === "string" ? body.role : "viewer";
  const temporaryPassword = typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
  const error = passwordPolicyMessage(temporaryPassword);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || error) return NextResponse.json({ message: error ?? "请填写有效的员工姓名与邮箱。" }, { status: 400 });
  if (!["admin","sales","content_editor","viewer"].includes(role)) return NextResponse.json({ message: "无效的员工角色。" }, { status: 400 });
  const { hash, salt } = hashAdminPassword(temporaryPassword);
  const username = `staff_${randomBytes(10).toString("hex")}`;
  const result = await rpc<{created:boolean;reason?:string}>("admin_create_staff", { p_email: email, p_display_name: displayName, p_role: role, p_username: username, p_password_hash: hash, p_password_salt: salt, p_actor_id: session.accountId }).catch(() => null);
  if (!result?.created) return NextResponse.json({ message: result?.reason === "duplicate" ? "该邮箱已存在。" : "无法创建员工账号。" }, { status: 400 });
  return NextResponse.json({ ok: true, message: "员工账号已创建。员工首次使用邮箱登录后必须修改临时密码。" });
}
export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 4000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.active !== "boolean") return NextResponse.json({ message: "无效请求。" }, { status: 400 });
  const result = await rpc<{updated:boolean;reason?:string}>("admin_set_staff_status", { p_account_id: body.id, p_active: body.active, p_actor_id: session.accountId }).catch(() => null);
  return result?.updated ? NextResponse.json({ ok:true }) : NextResponse.json({ message: result?.reason === "self" ? "不能停用当前登录账号。" : "无法更新员工状态。" }, { status: 400 });
}
