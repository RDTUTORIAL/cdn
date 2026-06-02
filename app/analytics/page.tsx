import { getDb } from "@/lib/db";
import { formatBytes, getFileCategory, getFileCategoryIcon, timeAgo } from "@/lib/utils";
import { TrendingUp, Folder, HardDrive, Download, Eye, Calendar, Folders, List, Pin, Upload, Trash2, Trash, RefreshCcw, Edit, Key } from "lucide-react";

export const metadata = { title: "Analitik — CDN Panel" };

const actionLabels: Record<string, string> = {
  upload: "Upload file", delete: "Hapus file", delete_permanent: "Hapus permanen",
  restore: "Pulihkan file", update: "Update file", create_folder: "Buat folder",
  delete_folder: "Hapus folder", create_api_key: "Buat API Key",
};
const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload size={16} />, delete: <Trash2 size={16} />, delete_permanent: <Trash size={16} />,
  restore: <RefreshCcw size={16} />, update: <Edit size={16} />, create_folder: <Folder size={16} />,
  delete_folder: <Folders size={16} />, create_api_key: <Key size={16} />,
};

export default async function AnalyticsPage() {
  const db = await getDb();
  const files = db.data.files.filter((f) => !f.isDeleted);
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const totalDl = files.reduce((a, f) => a + f.downloadCount, 0);
  const totalViews = files.reduce((a, f) => a + f.viewCount, 0);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
  const last7Days = last30Days.slice(-7);

  const uploadsPerDay = last7Days.map((day) => ({
    day: day.slice(5),
    count: files.filter((f) => f.createdAt.startsWith(day)).length,
    size: files.filter((f) => f.createdAt.startsWith(day)).reduce((a, f) => a + f.size, 0),
  }));

  const topDownloaded = [...files].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 8);

  const typeMap: Record<string, { count: number; size: number }> = {};
  files.forEach((f) => {
    const cat = getFileCategory(f.mimeType);
    if (!typeMap[cat]) typeMap[cat] = { count: 0, size: 0 };
    typeMap[cat].count++;
    typeMap[cat].size += f.size;
  });

  const activity = db.data.activityLog.slice(0, 30);
  const maxBar = Math.max(...uploadsPerDay.map((d) => d.count), 1);

  return (
    <div className="page-body">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={24} /> Analitik</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Statistik penggunaan CDN kamu</p>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-24">
        {[
          { label: "Total File", value: files.length, icon: <Folder size={24} />, sub: `${files.filter(f=>f.isPublic).length} publik` },
          { label: "Total Ukuran", value: formatBytes(totalSize), icon: <HardDrive size={24} />, sub: "Semua file" },
          { label: "Total Unduhan", value: totalDl.toLocaleString(), icon: <Download size={24} />, sub: "Semua waktu" },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: <Eye size={24} />, sub: "File publik" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-icon" style={{ display: "flex" }}>{s.icon}</span>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Upload Chart */}
      <div className="card mb-24">
        <div className="card-header">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={18} /> Upload 7 Hari Terakhir</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "16px 0 0" }}>
          {uploadsPerDay.map(({ day, count, size }) => (
            <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", height: 16, display: "flex", alignItems: "center" }}>
                {count > 0 ? count : ""}
              </div>
              <div
                title={`${count} file · ${formatBytes(size)}`}
                style={{
                  width: "100%",
                  height: `${Math.max((count / maxBar) * 100, 4)}px`,
                  background: count > 0 ? "linear-gradient(to top, var(--accent), var(--purple))" : "var(--border)",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.5s",
                  cursor: "default",
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{day}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mb-24" style={{ gap: 20 }}>
        {/* Top Downloaded */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={18} /> Paling Banyak Diunduh</span></div>
          {topDownloaded.length === 0
            ? <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>Belum ada data</div>
            : topDownloaded.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", width: 18 }}>#{i+1}</span>
              <span style={{ fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => { const Icon = getFileCategoryIcon(getFileCategory(f.mimeType)); return <Icon size={18} />; })()}
              </span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                <div className="progress-bar" style={{ height: 4, marginTop: 4 }}>
                  <div className="progress-fill" style={{ width: `${topDownloaded[0].downloadCount > 0 ? (f.downloadCount / topDownloaded[0].downloadCount) * 100 : 0}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-hover)", flexShrink: 0 }}>{f.downloadCount}x</span>
            </div>
          ))}
        </div>

        {/* File Type Distribution */}
        <div className="card">
          <div className="card-header"><span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Folders size={18} /> Distribusi Tipe</span></div>
          {Object.entries(typeMap).length === 0
            ? <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>Belum ada data</div>
            : Object.entries(typeMap).sort((a, b) => b[1].count - a[1].count).map(([type, data]) => {
            const pct = files.length > 0 ? Math.round((data.count / files.length) * 100) : 0;
            return (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}>
                    {(() => { const Icon = getFileCategoryIcon(type); return <span style={{ display: "flex" }}><Icon size={16} /></span>; })()} {type}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {data.count} file · {formatBytes(data.size)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="card-header"><span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><List size={18} /> Log Aktivitas (30 Terakhir)</span></div>
        {activity.length === 0
          ? <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>Belum ada aktivitas</div>
          : (
          <table className="table">
            <thead>
              <tr>
                <th>Aksi</th>
                <th>Target</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "flex" }}>{actionIcons[log.action] || <Pin size={16} />}</span>
                      <span>{actionLabels[log.action] || log.action}</span>
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.targetName || "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{timeAgo(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
