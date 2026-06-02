import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFreshDb, saveDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getFreshDb();
  return NextResponse.json({ settings: db.data.settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const db = await getFreshDb();
  const allowedFields: (keyof typeof db.data.settings)[] = [
    "siteName", "maxFileSizeMB", "allowedTypes", "storageQuotaMB", "publicBaseUrl",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      if (typeof value !== "undefined") {
        // Type validation
        if ((field === "maxFileSizeMB" || field === "storageQuotaMB") && (typeof value !== "number" || value < 1)) {
          return NextResponse.json({ error: `${field} harus berupa angka positif` }, { status: 400 });
        }
        if (field === "siteName" && typeof value !== "string") {
          return NextResponse.json({ error: "Nama situs harus berupa teks" }, { status: 400 });
        }
        (db.data.settings as unknown as Record<string, unknown>)[field] = value;
      }
    }
  }

  await saveDb();
  return NextResponse.json({ settings: db.data.settings });
}
