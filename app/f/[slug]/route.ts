import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb } from "@/lib/db";
import { isExpired } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = await getDb();

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
    if (!pwdParam || pwdParam !== file.password) {
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

  // Build target URL — handle both absolute Blob URLs and local storage paths
  let targetUrl: string;
  if (file.blobUrl.startsWith("http://") || file.blobUrl.startsWith("https://")) {
    // Vercel Blob: append download param if needed
    targetUrl = download ? `${file.blobUrl}?download=1` : file.blobUrl;
  } else {
    // Local storage: build absolute URL
    const base = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    if (download) {
      // Serve via API that forces Content-Disposition: attachment
      targetUrl = `${base}/api/files/${file.id}/download`;
    } else {
      targetUrl = file.blobUrl.startsWith("/") ? `${base}${file.blobUrl}` : `${base}/${file.blobUrl}`;
    }
  }

  return NextResponse.redirect(targetUrl);
}
