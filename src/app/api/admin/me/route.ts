import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { admin, response } = await verifyAdmin(request, true);
  if (response) return response;

  return NextResponse.json({ admin: admin?.profile });
}
