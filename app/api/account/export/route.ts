import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleExport } from "@/lib/gdpr/export";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const data = await assembleExport(user.id);
  await logAudit({ userId: user.id, action: "data_exported", req });

  const json = JSON.stringify(data, null, 2);
  const filename = `testimony-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
