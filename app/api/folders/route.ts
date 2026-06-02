import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { generateId, generateUniqueSlug } from "@/lib/utils";

export const runtime = "nodejs";

// GET - list folders
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const parentId = searchParams.get("parentId");

  const db = await getDb();
  let folders = db.data.folders.filter((f) => !f.isDeleted);

  if (session.role !== "admin") {
    folders = folders.filter((f) => f.ownerId === session.userId);
  }

  if (parentId !== null) {
    folders = folders.filter((f) => f.parentId === (parentId || null));
  }

  return NextResponse.json({ folders });
}

// POST - create folder
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, parentId } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nama folder wajib diisi" }, { status: 400 });
  }

  const db = await getDb();

  // Validate parentId belongs to user
  if (parentId && !db.data.folders.find((f) => f.id === parentId && f.ownerId === session.userId && !f.isDeleted)) {
    return NextResponse.json({ error: "Parent folder tidak valid" }, { status: 400 });
  }

  const existingSlugs = db.data.folders.map((f) => f.slug);
  const slug = generateUniqueSlug(name, existingSlugs);

  const folder = {
    id: generateId(),
    name: name.trim(),
    slug,
    parentId: parentId || null,
    ownerId: session.userId,
    isPublic: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.data.folders.push(folder);

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "create_folder",
    targetId: folder.id,
    targetName: name,
    timestamp: new Date().toISOString(),
  });
  if (db.data.activityLog.length > 500) {
    db.data.activityLog = db.data.activityLog.slice(0, 500);
  }

  await saveDb();
  return NextResponse.json({ folder }, { status: 201 });
}
