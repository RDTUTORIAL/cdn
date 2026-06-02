import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFreshDb, saveDb } from "@/lib/db";
import { canManageContent } from "@/lib/permissions";
import { generateApiKey, generateId } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageContent(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getFreshDb();
  const user = db.data.users.find((u) => u.id === session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ apiKeys: user.apiKeys });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageContent(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getFreshDb();
  const user = db.data.users.find((u) => u.id === session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.apiKeys.length >= 10) {
    return NextResponse.json({ error: "Maksimal 10 API key" }, { status: 400 });
  }

  const key = generateApiKey();
  user.apiKeys.push(key);

  db.data.activityLog.unshift({
    id: generateId(),
    userId: session.userId,
    action: "create_api_key",
    targetId: "",
    targetName: "API Key baru",
    timestamp: new Date().toISOString(),
  });

  await saveDb();
  return NextResponse.json({ apiKey: key }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await request.json();
  const db = await getFreshDb();
  const user = db.data.users.find((u) => u.id === session.userId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  user.apiKeys = user.apiKeys.filter((k) => k !== key);
  await saveDb();
  return NextResponse.json({ success: true });
}
