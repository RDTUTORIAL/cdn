import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { getFreshDb, saveDb } from "@/lib/db";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

// GET /api/users — list all users (admin only)
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getFreshDb();
  const users = db.data.users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    apiKeyCount: u.apiKeys.length,
  }));

  return NextResponse.json({ users });
}

// POST /api/users — create a new user (admin only)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, role } = await request.json();

  if (!username?.trim()) {
    return NextResponse.json({ error: "Username wajib diisi" }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password minimal 4 karakter" }, { status: 400 });
  }

  const db = await getFreshDb();
  const existing = db.data.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (existing) {
    return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: generateId(),
    username: username.trim(),
    password: hashed,
    role: role === "admin" || role === "editor" || role === "viewer" ? role : "viewer",
    createdAt: new Date().toISOString(),
    apiKeys: [] as string[],
  };

  db.data.users.push(user);

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "create_user",
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
      apiKeyCount: 0,
    },
  }, { status: 201 });
}
