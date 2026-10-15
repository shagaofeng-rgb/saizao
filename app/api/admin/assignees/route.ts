import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { rpc } from "@/lib/supabase-server";

export async function GET() {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "无权查看负责人。" }, { status: 403 });
  try {
    const staff = await rpc<{ id: string; display_name: string; role: string; is_active: boolean }[]>("admin_list_staff", {});
    return NextResponse.json({ data: staff.filter((item) => item.is_active && ["super_admin", "admin", "sales"].includes(item.role)).map((item) => ({ id: item.id, name: item.display_name })) });
  } catch { return NextResponse.json({ message: "暂时无法读取负责人。" }, { status: 503 }); }
}
