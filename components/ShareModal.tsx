"use client";

import Modal from "./Modal";
import { FileRecord } from "@/lib/types";
import { useState } from "react";
import { buildPublicUrl, formatBytes } from "@/lib/utils";
import { Copy, Check, ExternalLink, Lock, Clock, Info, Save, FileEdit, Code } from "lucide-react";
import { useToast } from "./Toast";

interface ShareModalProps {
  file: FileRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updated: Partial<FileRecord>) => void;
}

export default function ShareModal({ file, isOpen, onClose, onUpdate }: ShareModalProps) {
  const { showToast } = useToast();

  // State initialized from file prop. Component remounts via `key` when file changes.
  const [isPublic, setIsPublic] = useState(file?.isPublic ?? false);
  const [password, setPassword] = useState(file?.password ?? "");
  const [usePassword, setUsePassword] = useState(!!file?.password);
  const [expiresAt, setExpiresAt] = useState(
    file?.expiresAt ? file.expiresAt.split("T")[0] : ""
  );
  const [useExpiry, setUseExpiry] = useState(!!file?.expiresAt);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const publicUrl = buildPublicUrl(file.slug);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        isPublic,
        password: usePassword ? password : null,
        expiresAt: useExpiry && expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const res = await fetch(`/api/files/${file!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate?.(data.file);
        showToast("Pengaturan share disimpan", "success");
        onClose();
      }
    } catch {
      showToast("Gagal menyimpan", "error");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast("Link disalin!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  function copyEmbed() {
    const embed = `<img src="${publicUrl}" alt="${file!.name}" />`;
    navigator.clipboard.writeText(embed);
    showToast("Kode embed disalin!", "success");
  }

  function copyMarkdown() {
    const md = `![${file!.name}](${publicUrl})`;
    navigator.clipboard.writeText(md);
    showToast("Kode Markdown disalin!", "success");
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bagikan — ${file.name}`}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {saving ? "Menyimpan..." : <><Save size={16} /> Simpan</>}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
        {/* Public toggle */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", background: "var(--bg-elevated)",
            borderRadius: "var(--r-md)", border: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Akses Publik</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              File bisa diakses tanpa login
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Public URL */}
        {isPublic && (
          <div>
            <div
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px",
              }}
            >
              Link Publik
            </div>
            <div className="copy-group">
              <input type="text" value={publicUrl} readOnly />
              <button className="copy-group-btn" onClick={copyLink} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {copied ? <><Check size={14} /> Disalin</> : <><Copy size={14} /> Salin</>}
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={copyEmbed} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Code size={14} /> Embed
              </button>
              <button className="btn btn-secondary btn-sm" onClick={copyMarkdown} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileEdit size={14} /> Markdown
              </button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <ExternalLink size={14} /> Buka
              </a>
            </div>
          </div>
        )}

        {/* Password Protection */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: usePassword ? 10 : 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={16} /> Password Protection
            </div>
            <label className="toggle">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {usePassword && (
            <input
              className="form-input"
              type="text"
              placeholder="Masukkan password untuk file ini..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        {/* Expiry */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: useExpiry ? 10 : 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={16} /> Link Kadaluarsa
            </div>
            <label className="toggle">
              <input type="checkbox" checked={useExpiry} onChange={(e) => setUseExpiry(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          {useExpiry && (
            <input
              className="form-input"
              type="date"
              value={expiresAt}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          )}
        </div>

        <div
          style={{
            padding: "10px 14px", background: "var(--info-dim)",
            border: "1px solid rgba(59,130,246,0.2)", borderRadius: "var(--r-md)",
            fontSize: 12, color: "var(--info)", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Info size={16} /> File: <strong>{file.name}</strong> · {formatBytes(file.size)}
        </div>
      </div>
    </Modal>
  );
}
