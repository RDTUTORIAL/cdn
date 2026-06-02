"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { Settings, Globe, Lock, AlertTriangle, Save, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    siteName: "CDN Panel",
    maxFileSizeMB: 50,
    allowedTypes: "*",
    storageQuotaMB: 5000,
    publicBaseUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Password change
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) setSettings(d.settings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) showToast("Pengaturan disimpan", "success");
    else showToast("Gagal menyimpan", "error");
    setSaving(false);
  }

  async function changePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) { showToast("Semua field wajib diisi", "error"); return; }
    if (newPwd !== confirmPwd) { showToast("Password baru tidak cocok", "error"); return; }
    if (newPwd.length < 6) { showToast("Password minimal 6 karakter", "error"); return; }
    setPwdSaving(true);
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) { showToast("Password berhasil diubah", "success"); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }
    else showToast(data.error || "Gagal ubah password", "error");
    setPwdSaving(false);
  }

  async function dangerEmptyTrash() {
    if (!confirm("Kosongkan semua sampah? File tidak bisa dipulihkan.")) return;
    const res = await fetch("/api/files?deleted=true", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) showToast(`${data.deleted ?? 0} file dihapus permanen`, "success");
    else showToast(data.error || "Gagal mengosongkan sampah", "error");
  }

  if (loading) return <div className="page-body" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Memuat...</div>;

  return (
    <div className="page-body">
      <div className="mb-24">
        <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><Settings size={24} /> Pengaturan</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Konfigurasi CDN Panel kamu</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: "general", label: "Umum" },
          { id: "security", label: "Keamanan" },
          { id: "danger", label: "Danger Zone" },
        ].map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {t.id === "general" ? <Globe size={16} /> : t.id === "security" ? <Lock size={16} /> : <AlertTriangle size={16} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Globe size={18} /> Pengaturan Umum</span>
          </div>

          <div className="form-group">
            <label className="form-label">Nama Situs</label>
            <input className="form-input" value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} />
            <span className="form-hint">Ditampilkan di sidebar dan judul halaman</span>
          </div>

          <div className="form-group">
            <label className="form-label">Ukuran File Maksimal (MB)</label>
            <input className="form-input" type="number" min={1} max={500}
              value={settings.maxFileSizeMB}
              onChange={(e) => setSettings({ ...settings, maxFileSizeMB: Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label className="form-label">Kuota Storage (MB)</label>
            <input className="form-input" type="number" min={100}
              value={settings.storageQuotaMB}
              onChange={(e) => setSettings({ ...settings, storageQuotaMB: Number(e.target.value) })} />
          </div>

          <div className="form-group">
            <label className="form-label">Tipe File yang Diizinkan</label>
            <input className="form-input" value={settings.allowedTypes}
              onChange={(e) => setSettings({ ...settings, allowedTypes: e.target.value })}
              placeholder="* (semua) atau image/*,video/*" />
            <span className="form-hint">Gunakan * untuk semua, atau pisah dengan koma: image/*,video/*</span>
          </div>

          <div className="form-group">
            <label className="form-label">Public Base URL</label>
            <input className="form-input" value={settings.publicBaseUrl}
              onChange={(e) => setSettings({ ...settings, publicBaseUrl: e.target.value })}
              placeholder="https://cdn.domain.com" />
            <span className="form-hint">Kosongkan untuk menggunakan domain saat ini</span>
          </div>

          <button className="btn btn-primary" onClick={saveSettings} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving ? "Menyimpan..." : <><Save size={16} /> Simpan Pengaturan</>}
          </button>
        </div>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={18} /> Ganti Password</span>
          </div>

          <div className="form-group">
            <label className="form-label">Password Saat Ini</label>
            <input className="form-input" type="password" value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)} placeholder="Password saat ini..." />
          </div>

          <div className="form-group">
            <label className="form-label">Password Baru</label>
            <input className="form-input" type="password" value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} placeholder="Password baru (min 6 karakter)..." />
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru</label>
            <input className="form-input" type="password" value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Ulangi password baru..." />
          </div>

          <button className="btn btn-primary" onClick={changePassword} disabled={pwdSaving} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {pwdSaving ? "Menyimpan..." : <><Lock size={16} /> Ubah Password</>}
          </button>
        </div>
      )}

      {/* Danger Zone */}
      {activeTab === "danger" && (
        <div>
          <div style={{
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px", background: "var(--danger-dim)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={18} /> Danger Zone</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Tindakan berikut tidak bisa dibatalkan</p>
            </div>

            {[
              {
                title: "Kosongkan Sampah",
                desc: "Hapus permanen semua file di sampah. File tidak bisa dipulihkan.",
                btnLabel: "Kosongkan Sampah",
                action: dangerEmptyTrash,
              },
            ].map((item) => (
              <div key={item.title} style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
                </div>
                <button className="btn btn-danger" onClick={item.action} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={16} /> {item.btnLabel}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
