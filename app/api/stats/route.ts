import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatBytes } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const files = db.data.files.filter((f) => !f.isDeleted);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const publicFiles = files.filter((f) => f.isPublic).length;
  const privateFiles = files.filter((f) => !f.isPublic).length;
  const totalDownloads = files.reduce((acc, f) => acc + f.downloadCount, 0);
  const totalViews = files.reduce((acc, f) => acc + f.viewCount, 0);

  // Files per day last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const uploadsPerDay = last7Days.map((day) => ({
    date: day,
    count: files.filter((f) => f.createdAt.startsWith(day)).length,
    size: files
      .filter((f) => f.createdAt.startsWith(day))
      .reduce((acc, f) => acc + f.size, 0),
  }));

  // Top downloaded
  const topDownloaded = [...files]
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 5)
    .map((f) => ({ id: f.id, name: f.name, downloads: f.downloadCount }));

  // File type distribution
  const typeMap: Record<string, number> = {};
  files.forEach((f) => {
    const type = f.mimeType.split("/")[0];
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  const typeDistribution = Object.entries(typeMap).map(([type, count]) => ({
    type,
    count,
  }));

  // Recent activity
  const recentActivity = db.data.activityLog.slice(0, 20);

  // Trash count
  const trashCount = db.data.files.filter((f) => f.isDeleted).length;

  return NextResponse.json({
    overview: {
      totalFiles: files.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      publicFiles,
      privateFiles,
      totalDownloads,
      totalViews,
      totalFolders: db.data.folders.filter((f) => !f.isDeleted).length,
      trashCount,
      storageQuotaMB: db.data.settings.storageQuotaMB,
      usedMB: Math.round(totalSize / (1024 * 1024)),
    },
    uploadsPerDay,
    topDownloaded,
    typeDistribution,
    recentActivity,
  });
}
