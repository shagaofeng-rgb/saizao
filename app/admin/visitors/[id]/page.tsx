import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { VisitorDetail } from "@/components/admin/AdminOperations";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }){ if (!(await hasAdminSession())) redirect("/admin/login"); return <VisitorDetail id={(await params).id} />; }
