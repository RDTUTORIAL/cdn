import { basename, join, resolve } from "path";

const INLINE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const INLINE_PREFIXES = ["video/", "audio/"];
const INLINE_TYPES = new Set(["application/pdf", "text/plain"]);

export function canServeInline(mimeType?: string | null): boolean {
  const type = (mimeType || "application/octet-stream").toLowerCase().split(";")[0].trim();

  if (INLINE_IMAGE_TYPES.has(type) || INLINE_TYPES.has(type)) return true;
  return INLINE_PREFIXES.some((prefix) => type.startsWith(prefix));
}

export function safeContentType(mimeType?: string | null): string {
  return mimeType || "application/octet-stream";
}

export function contentDisposition(filename: string, inline: boolean): string {
  const fallback = basename(filename).replace(/["\r\n]/g, "_") || "file";
  const encoded = encodeURIComponent(fallback);
  return `${inline ? "inline" : "attachment"}; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}

export function deliveryHeaders(options: {
  mimeType?: string | null;
  filename: string;
  isPublic: boolean;
  forceDownload?: boolean;
  etag?: string;
  contentLength?: number;
}): HeadersInit {
  const inline = !options.forceDownload && canServeInline(options.mimeType);

  return {
    "Content-Type": safeContentType(options.mimeType),
    "Content-Disposition": contentDisposition(options.filename, inline),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": options.isPublic ? "public, max-age=3600" : "private, no-cache",
    ...(options.etag ? { ETag: options.etag } : {}),
    ...(typeof options.contentLength === "number" ? { "Content-Length": String(options.contentLength) } : {}),
  };
}

export function resolveUploadPath(blobUrl: string): string | null {
  const uploadsDir = resolve(process.cwd(), "public", "uploads");
  const relativePath = blobUrl.startsWith("/uploads/")
    ? blobUrl.slice("/uploads/".length)
    : blobUrl.replace(/^\/+/, "");
  const fullPath = resolve(join(uploadsDir, relativePath));

  if (fullPath !== uploadsDir && !fullPath.startsWith(`${uploadsDir}/`)) {
    return null;
  }

  return fullPath;
}
