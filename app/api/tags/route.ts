import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { canManageContent, canManageOwnedContent } from "@/lib/permissions";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const tags = session.role === "admin"
    ? db.data.tags
    : db.data.tags.filter((t) => t.ownerId === session.userId);
  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageContent(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nama tag wajib diisi" }, { status: 400 });
  }

  const db = await getDb();
  const tag = {
    id: generateId(),
    name: name.trim(),
    color: color || "#6366f1",
    ownerId: session.userId,
  };

  db.data.tags.push(tag);
  await saveDb();
  return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  const db = await getDb();
  const tag = db.data.tags.find((t) => t.id === id);
  if (!tag) return NextResponse.json({ error: "Tag tidak ditemukan" }, { status: 404 });
  if (!canManageOwnedContent(session, tag.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  db.data.tags = db.data.tags.filter((t) => t.id !== id);

  // Remove tag from all files
  db.data.files.forEach((f) => {
    f.tags = f.tags.filter((t) => t !== id);
  });

  await saveDb();
  return NextResponse.json({ success: true });
}
