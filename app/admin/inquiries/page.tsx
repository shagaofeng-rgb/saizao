import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";
import { InquiryCenter } from "@/components/admin/AdminOperations";
export const dynamic = "force-dynamic";
export default async function Page(){ if (!(await hasAdminSession())) redirect("/admin/login"); return <InquiryCenter />; }
