"use client";
import { useState, useEffect } from "react";
import { FileRecord } from "@/lib/types";
import { formatBytes, timeAgo, getFileCategory, getFileCategoryIcon } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { Trash2, RefreshCcw, Trash } from "lucide-react";

export default function TrashPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/files?deleted=true", { signal: controller.signal });
      if (cancelled) return;
      const data = await res.json().catch(() => ({}));
      if (!cancelled) {
        if (!res.ok) {
          showToast(data.error || "Gagal memuat sampah", "error");
          setFiles([]);
          setLoading(false);
          return;
        }
        setFiles(data.files || []);
        setLoading(false);
      }
    })().catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  async function load() {
    const res = await fetch("/api/files?deleted=true");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Gagal memuat sampah", "error");
      return;
    }
    setFiles(data.files || []);
  }

  async function restore(id: string) {
    setActionPending(true);
    try {
      const res = await fetch(`/api/files/${id}/restore`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("File dipulihkan", "success");
        await load();
      } else {
        showToast(data.error || "Gagal memulihkan file", "error");
      }
    } catch {
      showToast("Gagal memulihkan file", "error");
    } finally {
      setActionPending(false);
    }
  }

  async function deletePermanent(id: string) {
    if (!confirm("Hapus permanen? File tidak bisa dipulihkan.")) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/files/${id}?permanent=true`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("File dihapus permanen", "success");
        await load();
      } else {
        showToast(data.error || "Gagal hapus file", "error");
      }
    } catch {
      showToast("Gagal hapus file", "error");
    } finally {
      setActionPending(false);
    }
  }

  async function emptyTrash() {
    if (files.length === 0) return;
    if (!confirm(`Kosongkan sampah? ${files.length} file akan dihapus permanen.`)) return;
    setActionPending(true);
    try {
      const res = await fetch("/api/files?deleted=true", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`${data.deleted ?? 0} file dihapus permanen`, "success");
        setFiles([]);
      } else {
        showToast(data.error || "Gagal mengosongkan sampah", "error");
      }
    } catch {
      showToast("Gagal mengosongkan sampah", "error");
    } finally {
      setActionPending(false);
    }
  }

  async function restoreAll() {
    if (files.length === 0 || actionPending) return;
    setActionPending(true);
    let failed = 0;
    try {
      for (const file of files) {
        const res = await fetch(`/api/files/${file.id}/restore`, { method: "POST" }).catch(() => null);
        if (!res?.ok) failed += 1;
      }
      if (failed > 0) showToast(`${failed} file gagal dipulihkan`, "error");
      else showToast("Semua file dipulihkan", "success");
      await load();
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div className="page-body">
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Trash2 size={24} /> Sampah
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {files.length} file dalam sampah
          </p>
        </div>
        {files.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={restoreAll} disabled={actionPending} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCcw size={16} /> Pulihkan Semua
            </button>
            <button className="btn btn-danger" onClick={emptyTrash} disabled={actionPending} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Trash size={16} /> Kosongkan Sampah
            </button>
          </div>
        )}
      </div>
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Memuat...
        </div>
      )}
      {!loading && files.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon flex-center" style={{ color: "var(--text-muted)" }}>
            <Trash2 size={48} />
          </div>
          <div className="empty-title">Sampah kosong</div>
          <div className="empty-sub">File yang dihapus akan muncul di sini</div>
        </div>
      )}
      {!loading && files.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Ukuran</th>
                <th>Dihapus</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="flex-center">
                        {(() => {
                          const Icon = getFileCategoryIcon(getFileCategory(f.mimeType));
                          return <Icon size={24} />;
                        })()}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.mimeType}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{formatBytes(f.size)}</td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {f.deletedAt ? timeAgo(f.deletedAt) : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => restore(f.id)} disabled={actionPending} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <RefreshCcw size={14} /> Pulihkan
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePermanent(f.id)} disabled={actionPending} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Trash size={14} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
