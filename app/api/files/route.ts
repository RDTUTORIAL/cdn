import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, saveDb } from "@/lib/db";
import { uploadToBlob, generateFilePath } from "@/lib/storage";
import { generateId, generateUniqueSlug, getMimeType, generateSlug } from "@/lib/utils";

export const runtime = "nodejs";

// GET - list files
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const folderId = searchParams.get("folderId") || null;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const isPublic = searchParams.get("isPublic");
  const isFavorited = searchParams.get("isFavorited");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const showDeleted = searchParams.get("deleted") === "true";

  const db = await getDb();

  let files = db.data.files.filter((f) => {
    if (showDeleted) return f.isDeleted;
    return !f.isDeleted;
  });

  if (!showDeleted && folderId !== "all") {
    files = files.filter((f) => f.folderId === folderId);
  }

  if (search) {
    files = files.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (type) {
    files = files.filter((f) => f.mimeType.startsWith(type));
  }

  if (isPublic !== null && isPublic !== "") {
    files = files.filter((f) => f.isPublic === (isPublic === "true"));
  }

  if (isFavorited === "true") {
    files = files.filter((f) => f.isFavorited);
  }

  // Sorting
  files.sort((a, b) => {
    let valA: string | number = a[sort as keyof typeof a] as string | number;
    let valB: string | number = b[sort as keyof typeof b] as string | number;
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  return NextResponse.json({ files });
}

// POST - upload file
export async function POST(request: NextRequest) {
  const session = await getSession();

  // Also allow API key auth
  let ownerId = session?.userId;
  if (!ownerId) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey) {
      const db = await getDb();
      const user = db.data.users.find((u) => u.apiKeys.includes(apiKey));
      if (user) ownerId = user.id;
    }
  }

  if (!ownerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const settings = db.data.settings;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folderId = (formData.get("folderId") as string) || null;
    const isPublic = formData.get("isPublic") === "true";

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Check file size
    const maxBytes = settings.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimal ${settings.maxFileSizeMB}MB` },
        { status: 400 }
      );
    }

    const id = generateId();
    const mimeType = file.type || getMimeType(file.name);
    const existingSlugs = db.data.files.map((f) => f.slug);
    const slug = generateUniqueSlug(file.name, existingSlugs);
    const filePath = generateFilePath(ownerId, `${id}-${generateSlug(file.name)}`);

    // Upload to Vercel Blob
    const uploadResult = await uploadToBlob(file, filePath);

    const fileRecord = {
      id,
      name: file.name,
      slug,
      originalName: file.name,
      mimeType,
      size: file.size,
      blobUrl: uploadResult.url,
      folderId,
      ownerId,
      isPublic,
      password: null,
      expiresAt: null,
      tags: [],
      isFavorited: false,
      isDeleted: false,
      deletedAt: null,
      downloadCount: 0,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.files.push(fileRecord);

    // Log activity
    db.data.activityLog.unshift({
      id: generateId(),
      userId: ownerId,
      action: "upload",
      targetId: id,
      targetName: file.name,
      timestamp: new Date().toISOString(),
    });
    if (db.data.activityLog.length > 500) {
      db.data.activityLog = db.data.activityLog.slice(0, 500);
    }

    await saveDb();

    return NextResponse.json({ file: fileRecord }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload gagal" }, { status: 500 });
  }
}
