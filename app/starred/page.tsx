"use client";
import { useState, useEffect } from "react";
import { FileRecord } from "@/lib/types";
import FileCard from "@/components/FileCard";
import FilePreview from "@/components/FilePreview";
import ShareModal from "@/components/ShareModal";
import { useToast } from "@/components/Toast";
import { Star } from "lucide-react";

export default function StarredPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FileRecord | null>(null);
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/files?isFavorited=true", { signal: controller.signal });
      if (cancelled) return;
      const data = await res.json();
      if (!cancelled) {
        setFiles((data.files || []).filter((f: FileRecord) => f.isFavorited && !f.isDeleted));
        setLoading(false);
      }
    })().catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function load() {
    const res = await fetch("/api/files?isFavorited=true");
    const data = await res.json();
    setFiles((data.files || []).filter((f: FileRecord) => f.isFavorited && !f.isDeleted));
  }

  return (
    <div className="page-body">
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Star size={24} /> Favorit
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {files.length} file favorit
          </p>
        </div>
      </div>
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Memuat...
        </div>
      )}
      {!loading && files.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon flex-center" style={{ color: "var(--warning)" }}>
            <Star size={48} />
          </div>
          <div className="empty-title">Belum ada favorit</div>
          <div className="empty-sub">Tandai file sebagai favorit dari File Manager</div>
        </div>
      )}
      {!loading && files.length > 0 && (
        <div className="file-grid">
          {files.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              view="grid"
              onClick={setPreview}
              onContextMenu={() => {}}
              onSelect={() => {}}
            />
          ))}
        </div>
      )}
      <FilePreview file={preview} isOpen={!!preview} onClose={() => setPreview(null)} />
      <ShareModal
        file={shareFile}
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        onUpdate={load}
      />
    </div>
  );
}
