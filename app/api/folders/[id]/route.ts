import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const folder = db.data.folders.find((f) => f.id === id);
  if (!folder) return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });

  if (session.role !== "admin" && folder.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (body.name) folder.name = body.name;
  if ("isPublic" in body) folder.isPublic = body.isPublic;
  if ("parentId" in body) {
    const newParentId = body.parentId || null;
    if (newParentId && !db.data.folders.find((f) => f.id === newParentId && f.ownerId === session.userId && !f.isDeleted)) {
      return NextResponse.json({ error: "Parent folder tidak valid" }, { status: 400 });
    }
    folder.parentId = newParentId;
  }
  folder.updatedAt = new Date().toISOString();

  await saveDb();
  return NextResponse.json({ folder });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const folder = db.data.folders.find((f) => f.id === id);
  if (!folder) return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });

  if (session.role !== "admin" && folder.ownerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete folder and move files to root
  folder.isDeleted = true;
  folder.deletedAt = new Date().toISOString();

  // Move files in this folder to root
  db.data.files
    .filter((f) => f.folderId === id && !f.isDeleted && (session.role === "admin" || f.ownerId === session.userId))
    .forEach((f) => { f.folderId = null; });

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "delete_folder",
    targetId: id,
    targetName: folder.name,
    timestamp: new Date().toISOString(),
  });
  if (db.data.activityLog.length > 500) {
    db.data.activityLog = db.data.activityLog.slice(0, 500);
  }

  await saveDb();
  return NextResponse.json({ success: true });
}
