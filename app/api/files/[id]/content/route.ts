import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { getSession } from "@/lib/auth";
import { getFreshDb } from "@/lib/db";
import { isBlobUrl, readFromBlob } from "@/lib/storage";
import { deliveryHeaders, resolveUploadPath } from "@/lib/content-delivery";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const db = await getFreshDb();
  const file = db.data.files.find((f) => f.id === id && !f.isDeleted);

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const isOwner = session && (session.role === "admin" || file.ownerId === session.userId);
  if (!file.isPublic && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isBlobUrl(file.blobUrl)) {
    const result = await readFromBlob(file.blobUrl, request.headers.get("if-none-match"));
    if (!result) {
      return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ...(result.etag ? { ETag: result.etag } : {}),
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: deliveryHeaders({
        mimeType: file.mimeType || result.contentType,
        filename: file.name,
        isPublic: file.isPublic,
        etag: result.etag,
      }),
    });
  }

  try {
    const fullPath = resolveUploadPath(file.blobUrl);
    if (!fullPath) {
      return NextResponse.json({ error: "Path file tidak valid" }, { status: 400 });
    }
    const fileStat = await stat(fullPath);
    const buffer = await readFile(fullPath);

    return new NextResponse(buffer, {
      headers: deliveryHeaders({
        mimeType: file.mimeType,
        filename: file.name,
        isPublic: file.isPublic,
        contentLength: fileStat.size,
      }),
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
  }
}
