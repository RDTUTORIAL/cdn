"use client";

import Modal from "./Modal";
import { FileRecord } from "@/lib/types";
import { formatBytes, getFileCategory, isExpired, buildPublicUrl, timeAgo } from "@/lib/utils";
import { Music, FileText, Download, Link, Globe, Lock } from "lucide-react";

interface FilePreviewProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: FileRecord) => void;
}

export default function FilePreview({ file, isOpen, onClose, onDownload }: FilePreviewProps) {
  if (!file) return null;
  const category = getFileCategory(file.mimeType);
  const publicUrl = buildPublicUrl(file.slug);
  const contentUrl = `/api/files/${file.id}/content`;

  function renderContent(f: FileRecord) {
    switch (category) {
      case "image":
        return (
          <div className="preview-content" style={{ padding: 16, background: "var(--bg-base)", borderRadius: "var(--r-md)" }}>
            <img src={contentUrl} alt={f.name} style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "var(--r-md)" }} />
          </div>
        );
      case "video":
        return (
          <div className="preview-content">
            <video controls style={{ maxWidth: "100%", maxHeight: "65vh" }}>
              <source src={contentUrl} type={f.mimeType} />
            </video>
          </div>
        );
      case "audio":
        return (
          <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginBottom: 16, color: "var(--text-secondary)" }}><Music size={64} /></div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>{f.name}</div>
            <audio controls style={{ width: "100%" }}>
              <source src={contentUrl} type={f.mimeType} />
            </audio>
          </div>
        );
      case "pdf":
        return (
          <div className="preview-content" style={{ height: "65vh" }}>
            <iframe src={contentUrl} style={{ width: "100%", height: "100%", border: "none", borderRadius: "var(--r-md)" }} title={f.name} />
          </div>
        );
      default:
        return (
          <div style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ marginBottom: 16, color: "var(--text-secondary)" }}><FileText size={72} /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{f.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
              Preview tidak tersedia untuk format ini
            </div>
            <a href={`/api/files/${f.id}/download`} download={f.name} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Download size={16} /> Download File
            </a>
          </div>
        );
    }
  }

  const expired = isExpired(file.expiresAt);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={file.name} size="xl"
      footer={
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <a
            href={`/api/files/${file.id}/download`}
            download={file.name}
            className="btn btn-primary"
            onClick={() => onDownload?.(file)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={16} /> Download
          </a>
          {file.isPublic && !expired && (
            <button
              className="btn btn-secondary"
              onClick={() => { navigator.clipboard.writeText(publicUrl); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Link size={16} /> Copy Link
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
            <span>{formatBytes(file.size)}</span>
            <span>{timeAgo(file.createdAt)}</span>
          </div>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        {renderContent(file)}
      </div>

      {/* File Info */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        background: "var(--bg-elevated)", borderRadius: "var(--r-md)", padding: "12px 16px",
        marginBottom: 4,
      }}>
        {[
          ["Ukuran", formatBytes(file.size)],
          ["Tipe", file.mimeType],
          ["Status", file.isPublic ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={14} /> Publik</span> : <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Lock size={14} /> Privat</span>],
          ["Diunduh", `${file.downloadCount}x`],
          ["Dilihat", `${file.viewCount}x`],
          ["Dibuat", timeAgo(file.createdAt)],
        ].map(([label, val]) => (
          <div key={label as string}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
