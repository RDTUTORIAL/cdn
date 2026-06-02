import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { readFile, stat } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;
  const db = await getDb();
  const file = db.data.files.find((f) => f.id === id && !f.isDeleted);

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  // Check access: public files, password-protected files (via slug), or owner/admin
  const isOwner = session && (session.role === "admin" || file.ownerId === session.userId);
  if (!file.isPublic && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  file.downloadCount += 1;
  await saveDb();

  // If it's a Vercel Blob URL, redirect to it with download parameter
  if (file.blobUrl.startsWith("http://") || file.blobUrl.startsWith("https://")) {
    return NextResponse.redirect(`${file.blobUrl}?download=1`);
  }

  // Local file — read and serve with Content-Disposition: attachment
  try {
    let localPath: string;
    // Extract the relative path from the URL
    if (file.blobUrl.startsWith("/uploads/")) {
      localPath = file.blobUrl.slice("/uploads/".length);
    } else if (file.blobUrl.startsWith("/")) {
      localPath = file.blobUrl.slice(1);
    } else {
      localPath = file.blobUrl;
    }

    const fullPath = join(process.cwd(), "public", "uploads", localPath);
    const fileStat = await stat(fullPath);
    const buffer = await readFile(fullPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
  }
}