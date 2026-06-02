/**
 * API route to migrate existing lowdb data to Supabase.
 * POST /api/migrate — admin only
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { migrateToSupabase } from "@/lib/db-supabase";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const success = await migrateToSupabase(db.data);

  if (success) {
    return NextResponse.json({ ok: true, message: "Data migrated to Supabase successfully" });
  }

  return NextResponse.json(
    { ok: false, error: "Migration failed. Check server logs." },
    { status: 500 }
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return migration status
  const { isSupabaseReady } = await import("@/lib/db-supabase");
  const ready = await isSupabaseReady();

  return NextResponse.json({
    supabaseReady: ready,
    message: ready
      ? "Supabase is connected and ready"
      : "Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
  });
}
