import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { VisitorCenter } from "@/components/admin/AdminOperations";
export const dynamic = "force-dynamic";
export default async function Page(){ if (!(await hasAdminSession())) redirect("/admin/login"); return <VisitorCenter />; }
