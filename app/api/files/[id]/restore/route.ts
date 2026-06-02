import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFreshDb, saveDb } from "@/lib/db";
import { canManageOwnedContent } from "@/lib/permissions";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

// POST - restore file from trash
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getFreshDb();
  const file = db.data.files.find((f) => f.id === id);

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (!canManageOwnedContent(session, file.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!file.isDeleted) {
    return NextResponse.json({ error: "File tidak ada di sampah" }, { status: 400 });
  }

  file.isDeleted = false;
  file.deletedAt = null;
  file.updatedAt = new Date().toISOString();

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "restore",
    targetId: id,
    targetName: file.name,
    timestamp: new Date().toISOString(),
  });

  await saveDb();
  return NextResponse.json({ file });
}
