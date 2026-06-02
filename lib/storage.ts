import { put, del, head } from "@vercel/blob";
import { writeFile, mkdir, unlink, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export interface UploadResult {
  url: string;
  pathname: string;
  size: number;
}

/**
 * Check if Vercel Blob is configured (token is set).
 * If not, we fall back to local filesystem storage.
 */
function isBlobConfigured(): boolean {
  return !!(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

async function ensureUploadsDir(): Promise<void> {
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }
}

async function localPut(
  file: File | Buffer,
  path: string
): Promise<UploadResult> {
  await ensureUploadsDir();

  const fullPath = join(UPLOADS_DIR, path);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  let buffer: Buffer;
  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    buffer = file;
  }

  await writeFile(fullPath, buffer);

  // Local URL maps to /uploads/... served by Next.js static files
  const url = `/uploads/${path}`;

  return {
    url,
    pathname: path,
    size: buffer.length,
  };
}

async function localDelete(url: string): Promise<void> {
  try {
    // Extract the path from /uploads/...
    const relPath = url.replace(/^\/uploads\//, "");
    const fullPath = join(UPLOADS_DIR, relPath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch {
    // Ignore errors on delete (file may not exist)
  }
}

async function localHead(
  url: string
): Promise<{ url: string; size: number; contentType?: string } | null> {
  try {
    const relPath = url.replace(/^\/uploads\//, "");
    const fullPath = join(UPLOADS_DIR, relPath);
    const info = await stat(fullPath);
    return {
      url,
      size: info.size,
      contentType: undefined,
    };
  } catch {
    return null;
  }
}

export async function uploadToBlob(
  file: File,
  path: string
): Promise<UploadResult> {
  if (isBlobConfigured()) {
    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
    };
  }

  console.warn(
    "[storage] BLOB_READ_WRITE_TOKEN not set — using local filesystem storage. Uploaded files go to public/uploads/."
  );
  return localPut(file, path);
}

export async function uploadBufferToBlob(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<UploadResult> {
  if (isBlobConfigured()) {
    const blob = await put(path, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.length,
    };
  }

  console.warn(
    "[storage] BLOB_READ_WRITE_TOKEN not set — using local filesystem storage."
  );
  return localPut(buffer, path);
}

export async function deleteFromBlob(url: string): Promise<void> {
  if (url.startsWith("/uploads/")) {
    await localDelete(url);
    return;
  }

  try {
    await del(url);
  } catch {
    // Ignore errors on delete (file may not exist)
  }
}

export async function getBlobInfo(url: string) {
  if (url.startsWith("/uploads/")) {
    return localHead(url);
  }

  try {
    return await head(url);
  } catch {
    return null;
  }
}

export function generateFilePath(ownerId: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${ownerId}/${year}/${month}/${filename}`;
}
