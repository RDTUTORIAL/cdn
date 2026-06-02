import { getSession } from "@/lib/auth";
import { getFreshDb } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, Upload, Folder, HardDrive, Download, Folders, List, Pin, Trash2, Trash, RefreshCcw, Edit, Key, Clock } from "lucide-react";
import { formatBytes, getFileCategory, getFileCategoryIcon, timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard — CDN Panel" };

async function getStats(session: { userId: string; role: string }) {
  const db = await getFreshDb();
  const canSeeAll = session.role === "admin";
  const files = db.data.files.filter(
    (f) => !f.isDeleted && (canSeeAll || f.ownerId === session.userId)
  );
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const publicFiles = files.filter((f) => f.isPublic).length;
  const totalDl = files.reduce((a, f) => a + f.downloadCount, 0);
  const folders = db.data.folders.filter(
    (f) => !f.isDeleted && (canSeeAll || f.ownerId === session.userId)
  ).length;
  const recentActivity = db.data.activityLog
    .filter((log) => canSeeAll || log.userId === session.userId)
    .slice(0, 8);
  const trashCount = db.data.files.filter(
    (f) => f.isDeleted && (canSeeAll || f.ownerId === session.userId)
  ).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const uploadsPerDay = last7Days.map((day) => ({
    day: day.slice(5),
    count: files.filter((f) => f.createdAt.startsWith(day)).length,
  }));

  const recentFiles = [...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const typeBreakdown: Record<string, number> = {};
  files.forEach((f) => {
    const cat = getFileCategory(f.mimeType);
    typeBreakdown[cat] = (typeBreakdown[cat] || 0) + 1;
  });

  const usedPct = Math.min(100, Math.round((totalSize / (db.data.settings.storageQuotaMB * 1024 * 1024)) * 100));

  return { files, totalSize, publicFiles, totalDl, folders, recentActivity, trashCount, uploadsPerDay, recentFiles, typeBreakdown, usedPct, settings: db.data.settings };
}

const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload size={16} />, delete: <Trash2 size={16} />, delete_permanent: <Trash size={16} />, restore: <RefreshCcw size={16} />,
  update: <Edit size={16} />, create_folder: <Folder size={16} />, delete_folder: <Folders size={16} />, create_api_key: <Key size={16} />,
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const stats = await getStats(session);
  const maxBar = Math.max(...stats.uploadsPerDay.map((d) => d.count), 1);

  return (
    <div className="page-body">
      {/* Header */}
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
            👋 Halo, {session?.username}!
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Selamat datang kembali di CDN Panel kamu
          </p>
        </div>
        <Link href="/files" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Upload size={16} /> Upload File
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-24">
        {[
          { label: "Total File", value: stats.files.length, sub: `${stats.publicFiles} publik · ${stats.files.length - stats.publicFiles} privat`, icon: <Folder size={24} /> },
          { label: "Total Ukuran", value: formatBytes(stats.totalSize), sub: `${stats.usedPct}% dari kuota`, icon: <HardDrive size={24} /> },
          { label: "Total Unduhan", value: stats.totalDl.toLocaleString(), sub: "Semua waktu", icon: <Download size={24} /> },
          { label: "Total Folder", value: stats.folders, sub: `${stats.trashCount} di sampah`, icon: <Folders size={24} /> },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-icon" style={{ display: "flex" }}>{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Storage usage */}
      <div className="card mb-24">
        <div className="card-header">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><HardDrive size={18} /> Penggunaan Storage</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {formatBytes(stats.totalSize)} / {stats.settings.storageQuotaMB} MB
          </span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div className="progress-fill" style={{
            width: `${stats.usedPct}%`,
            background: stats.usedPct > 80
              ? "var(--danger)"
              : stats.usedPct > 60
              ? "var(--warning)"
              : "linear-gradient(90deg, var(--accent), var(--purple))",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <span>{stats.usedPct}% terpakai</span>
          <span>{stats.settings.storageQuotaMB - Math.round(stats.totalSize / (1024 * 1024))} MB tersisa</span>
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 20 }}>
        {/* Upload chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={18} /> Upload 7 Hari Terakhir</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
            {stats.uploadsPerDay.map(({ day, count }) => (
              <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{count > 0 ? count : ""}</div>
                <div style={{
                  width: "100%",
                  height: maxBar > 0 ? `${(count / maxBar) * 80}px` : "4px",
                  minHeight: 4,
                  background: count > 0
                    ? "linear-gradient(to top, var(--accent), var(--purple))"
                    : "var(--border)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.5s",
                }} />
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* File type breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Folders size={18} /> Tipe File</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(stats.typeBreakdown).length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Belum ada file</div>
            ) : (
              Object.entries(stats.typeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([type, count]) => {
                  const pct = Math.round((count / stats.files.length) * 100);
                  const Icon = getFileCategoryIcon(type);
                  return (
                    <div key={type}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}><Icon size={14} /> {type}</span>
                        <span style={{ color: "var(--text-muted)" }}>{count} ({pct}%)</span>
                      </div>
                      <div className="progress-bar" style={{ height: 5 }}>
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Recent files + activity */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Recent Files */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={18} /> File Terbaru</span>
            <Link href="/files" style={{ fontSize: 12, color: "var(--accent-hover)", textDecoration: "none" }}>Lihat semua →</Link>
          </div>
          {stats.recentFiles.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Belum ada file</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.recentFiles.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "var(--r-md)",
                    background: "var(--bg-active)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}>
                    {getFileCategory(f.mimeType) === "image" ? (
                      <img src={`/api/files/${f.id}/content`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                    ) : (
                      (() => { const Icon = getFileCategoryIcon(getFileCategory(f.mimeType)); return <Icon size={16} />; })()
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatBytes(f.size)} · {timeAgo(f.createdAt)}</div>
                  </div>
                  {f.isPublic && <span className="badge badge-public">Publik</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><List size={18} /> Aktivitas Terbaru</span>
          </div>
          {stats.recentActivity.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Belum ada aktivitas</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.recentActivity.map((log) => (
                <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "var(--accent-dim)", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "var(--accent)", flexShrink: 0,
                  }}>
                    {actionIcons[log.action] || <Pin size={16} />}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.targetName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(log.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
