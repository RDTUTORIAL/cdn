import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  return NextResponse.json({ settings: db.data.settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const db = await getDb();
  const allowedFields: (keyof typeof db.data.settings)[] = [
    "siteName", "maxFileSizeMB", "allowedTypes", "storageQuotaMB", "publicBaseUrl",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      if (typeof value !== "undefined") {
        (db.data.settings as unknown as Record<string, unknown>)[field] = value;
      }
    }
  }

  await saveDb();
  return NextResponse.json({ settings: db.data.settings });
}
