import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { canManageOwnedContent } from "@/lib/permissions";
import { deleteFromBlob } from "@/lib/storage";
import { generateId, generateUniqueSlug } from "@/lib/utils";

export const runtime = "nodejs";

function canAccessFile(session: { userId: string; role: string }, file: { ownerId: string }): boolean {
  return session.role === "admin" || file.ownerId === session.userId;
}

// GET single file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const file = db.data.files.find((f) => f.id === id);

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (!canAccessFile(session, file)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ file });
}

// PATCH - update file metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  const file = db.data.files.find((f) => f.id === id);

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  if (!canManageOwnedContent(session, file.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const allowedFields = [
    "name",
    "isPublic",
    "password",
    "expiresAt",
    "tags",
    "isFavorited",
    "folderId",
  ];

  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field];
      if (typeof value !== "undefined") {
        if (field === "password" && value) {
          (file as unknown as Record<string, unknown>)[field] = await bcrypt.hash(value, 10);
        } else {
          (file as unknown as Record<string, unknown>)[field] = value;
        }
      }
    }
  }

  // Regenerate slug if name changed
  if (body.name && body.name !== file.name) {
    const existingSlugs = db.data.files
      .filter((f) => f.id !== id)
      .map((f) => f.slug);
    file.slug = generateUniqueSlug(body.name, existingSlugs);
  }

  file.updatedAt = new Date().toISOString();

  // Log activity
  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "update",
    targetId: id,
    targetName: file.name,
    timestamp: new Date().toISOString(),
  });

  await saveDb();
  return NextResponse.json({ file });
}

// DELETE - soft delete or permanent delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const permanent = searchParams.get("permanent") === "true";

  const db = await getDb();
  const fileIndex = db.data.files.findIndex((f) => f.id === id);

  if (fileIndex === -1) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const file = db.data.files[fileIndex];

  if (!canManageOwnedContent(session, file.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (permanent) {
    // Delete from blob storage
    await deleteFromBlob(file.blobUrl);
    db.data.files.splice(fileIndex, 1);

    db.data.activityLog.unshift({
      id: generateId(),
      userId: session.userId,
      action: "delete_permanent",
      targetId: id,
      targetName: file.name,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date().toISOString();
    file.updatedAt = new Date().toISOString();

    db.data.activityLog.unshift({
      id: generateId(),
      userId: session.userId,
      action: "delete",
      targetId: id,
      targetName: file.name,
      timestamp: new Date().toISOString(),
    });
  }

  await saveDb();
  return NextResponse.json({ success: true });
}
