"use client";

import { useCallback, useState } from "react";
import { formatBytes } from "@/lib/utils";
import { FolderOpen, CloudUpload, CheckCircle2, XCircle, Upload, X } from "lucide-react";

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UploadZoneProps {
  folderId?: string | null;
  isPublic?: boolean;
  onUploaded?: () => void;
  onToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function UploadZone({ folderId, isPublic = false, onUploaded, onToast }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ file: f, progress: 0, status: "pending" as const })),
    ]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = "";
  }, [addFiles]);

  function removeFile(file: File) {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  }

  async function uploadAll() {
    if (uploading) return;
    setUploading(true);

    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    const totalCount = pending.length;

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.file === item.file ? { ...f, status: "uploading" as const, progress: 0 } : f))
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        if (folderId) formData.append("folderId", folderId);
        formData.append("isPublic", String(isPublic));

        // Simulate progress since fetch doesn't support upload progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file && f.progress < 85
                ? { ...f, progress: f.progress + Math.random() * 15 }
                : f
            )
          );
        }, 200);

        const res = await fetch("/api/files", { method: "POST", body: formData });
        clearInterval(progressInterval);

        if (!res.ok) {
          const err = await res.json();
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "error" as const, error: err.error, progress: 0 } : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === item.file ? { ...f, status: "done" as const, progress: 100 } : f
            )
          );
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === item.file ? { ...f, status: "error" as const, error: "Gagal upload", progress: 0 } : f
          )
        );
      }
    }

    setUploading(false);
    onToast?.(`${totalCount} file berhasil diupload`, "success");
    onUploaded?.();

    // Clear done items after 2s
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status !== "done"));
    }, 2000);
  }

  const pendingCount = files.filter((f) => f.status === "pending" || f.status === "error").length;

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <span className="upload-zone-icon flex-center">
          {dragging ? <FolderOpen size={32} /> : <CloudUpload size={32} />}
        </span>
        <div className="upload-zone-text">
          {dragging ? "Lepaskan file di sini" : "Drag & drop file, atau klik untuk pilih"}
        </div>
        <div className="upload-zone-sub">
          Semua format didukung • Bisa multi-file sekaligus
        </div>
      </div>

      {files.length > 0 && (
        <div className="upload-progress-list">
          {files.map((item, i) => (
            <div key={i} className="upload-progress-item">
              <div className="upload-progress-name">
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  {item.status === "done" ? (
                    <CheckCircle2 size={16} className="text-success" />
                  ) : item.status === "error" ? (
                    <XCircle size={16} className="text-danger" />
                  ) : null}
                  {item.file.name}
                </span>
                <span className="upload-progress-pct">
                  {item.status === "done"
                    ? formatBytes(item.file.size)
                    : item.status === "uploading"
                      ? `${Math.round(item.progress)}%`
                      : item.status === "error"
                        ? "Error"
                        : formatBytes(item.file.size)}
                </span>
                {item.status !== "uploading" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(item.file); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: 8, display: "flex" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${item.progress}%`,
                    background: item.status === "error"
                      ? "var(--danger)"
                      : item.status === "done"
                        ? "var(--success)"
                        : undefined,
                  }}
                />
              </div>
              {item.error && (
                <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{item.error}</div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={uploadAll}
              disabled={uploading || pendingCount === 0}
            >
              {uploading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Mengupload...</>
              ) : (
                <><Upload size={16} className="flex" /> Upload {pendingCount} File</>
              )}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              Hapus Semua
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
