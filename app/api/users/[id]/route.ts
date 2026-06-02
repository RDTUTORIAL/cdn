import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getFreshDb, saveDb } from "@/lib/db";
import { deleteFromBlob } from "@/lib/storage";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

// PATCH /api/users/:id — update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = await getFreshDb();
  const user = db.data.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();

  // Update username
  if (body.username?.trim() && body.username.trim() !== user.username) {
    const duplicate = db.data.users.find(
      (u) => u.id !== id && u.username.toLowerCase() === body.username.trim().toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    }
    user.username = body.username.trim();
  }

  // Update role (can't demote yourself)
  if (body.role && ["admin", "editor", "viewer"].includes(body.role)) {
    if (user.id === session.userId && body.role !== "admin") {
      return NextResponse.json(
        { error: "Tidak bisa menurunkan role diri sendiri" },
        { status: 400 }
      );
    }
    user.role = body.role;
  }

  // Update password
  if (body.password && body.password.length >= 4) {
    user.password = await bcrypt.hash(body.password, 10);
  }

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "update_user",
    targetId: user.id,
    targetName: user.username,
    timestamp: new Date().toISOString(),
  });

  await saveDb();

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      apiKeyCount: user.apiKeys.length,
    },
  });
}

// DELETE /api/users/:id — delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Can't delete yourself
  if (id === session.userId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  const db = await getFreshDb();
  const userIndex = db.data.users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const deletedUser = db.data.users[userIndex];
  const filesToDelete = db.data.files.filter((f) => f.ownerId === id);

  await Promise.all(filesToDelete.map((file) => deleteFromBlob(file.blobUrl)));

  db.data.users.splice(userIndex, 1);

  db.data.files = db.data.files.filter((f) => f.ownerId !== id);
  db.data.folders = db.data.folders.filter((f) => f.ownerId !== id);
  db.data.tags = db.data.tags.filter((t) => t.ownerId !== id);
  db.data.activityLog = db.data.activityLog.filter((a) => a.userId !== id);

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "delete_user",
    targetId: id,
    targetName: deletedUser.username,
    timestamp: new Date().toISOString(),
  });

  await saveDb();

  return NextResponse.json({ success: true });
}
