import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getFreshDb, saveDb } from "@/lib/db";
import { isBlobUrl, readFromBlob } from "@/lib/storage";
import { isExpired } from "@/lib/utils";
import { deliveryHeaders, resolveUploadPath } from "@/lib/content-delivery";
import { readFile, stat } from "fs/promises";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = await getFreshDb();

  const file = db.data.files.find(
    (f) => f.slug === slug && !f.isDeleted
  );

  if (!file) {
    return new NextResponse("File tidak ditemukan", { status: 404 });
  }

  // Check expiry
  if (isExpired(file.expiresAt)) {
    return new NextResponse("Link ini sudah kadaluarsa", { status: 410 });
  }

  // Check password
  if (file.password) {
    const pwdParam = request.nextUrl.searchParams.get("pwd");
    const isCorrect = pwdParam && await bcrypt.compare(pwdParam, file.password).catch(() => false);
    if (!pwdParam || !isCorrect) {
      // Return HTML page asking for password
      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Dilindungi Password</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f13;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e2e8f0;
    }
    .card {
      background: #1a1a2e;
      border: 1px solid #2d2d44;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #0f0f13;
      border: 1px solid #2d2d44;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .error { color: #f87171; font-size: 0.875rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>File Dilindungi</h1>
    <p>Masukkan password untuk mengakses file ini</p>
    <form id="form">
      <input type="password" id="pwd" placeholder="Password..." autofocus>
      <button type="submit">Buka File</button>
    </form>
    <div class="error" id="error" style="display:none">Password salah</div>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = document.getElementById('pwd').value;
      window.location.href = window.location.pathname + '?pwd=' + encodeURIComponent(pwd);
    });
    ${pwdParam !== null ? "document.getElementById('error').style.display='block';" : ""}
  </script>
</body>
</html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  if (!file.isPublic && !file.password) {
    return new NextResponse("File ini bersifat privat", { status: 403 });
  }

  // Increment view count
  file.viewCount += 1;

  const download = request.nextUrl.searchParams.get("download") === "true";
  if (download) {
    file.downloadCount += 1;
  }

  await saveDb();

  if (isBlobUrl(file.blobUrl)) {
    const result = await readFromBlob(file.blobUrl, request.headers.get("if-none-match"));
    if (!result) {
      return new NextResponse("File tidak ditemukan di storage", { status: 404 });
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
        forceDownload: download,
        etag: result.etag,
      }),
    });
  }

  try {
    const fullPath = resolveUploadPath(file.blobUrl);
    if (!fullPath) {
      return new NextResponse("Path file tidak valid", { status: 400 });
    }
    const fileStat = await stat(fullPath);
    const buffer = await readFile(fullPath);

    return new NextResponse(buffer, {
      headers: deliveryHeaders({
        mimeType: file.mimeType,
        filename: file.name,
        isPublic: file.isPublic,
        forceDownload: download,
        contentLength: fileStat.size,
      }),
    });
  } catch {
    return new NextResponse("File tidak ditemukan di storage", { status: 404 });
  }
}
