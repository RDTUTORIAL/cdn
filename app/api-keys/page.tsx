"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { Key, Sparkles, BookOpen, EyeOff, Eye, Copy, AlertTriangle } from "lucide-react";

export default function ApiKeysPage() {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/api-keys", { signal: controller.signal });
      if (cancelled) return;
      const data = await res.json();
      if (!cancelled) {
        setKeys(data.apiKeys || []);
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
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    setKeys(data.apiKeys || []);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/api-keys", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showToast("API Key baru dibuat!", "success");
      setRevealed((prev) => new Set([...prev, data.apiKey]));
      load();
    } else {
      showToast(data.error || "Gagal membuat key", "error");
    }
    setGenerating(false);
  }

  async function revoke(key: string) {
    if (!confirm("Cabut API key ini?")) return;
    const res = await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      showToast("API Key dicabut", "success");
      load();
    }
  }

  function maskKey(key: string) {
    return key.slice(0, 8) + "••••••••••••••••••••••••••••••••" + key.slice(-4);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    showToast("Key disalin!", "success");
  }

  return (
    <div className="page-body">
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={24} /> API Keys
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Gunakan API key untuk upload file secara eksternal
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={generating || keys.length >= 10}
        >
          {generating ? "Membuat..." : <><Sparkles size={16} /> Buat API Key</>}
        </button>
      </div>

      {/* How to use */}
      <div className="card mb-24">
        <div className="card-header">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={18} /> Cara Penggunaan
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Gunakan API key di header{" "}
          <code style={{ background: "var(--bg-active)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>
            x-api-key
          </code>{" "}
          untuk upload file:
        </p>
        <div
          style={{
            background: "var(--bg-base)",
            borderRadius: "var(--r-md)",
            padding: "16px",
            border: "1px solid var(--border)",
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
          }}
        >
          <div style={{ color: "var(--text-muted)" }}># Upload via curl</div>
          <div>
            <span style={{ color: "var(--accent-hover)" }}>curl</span> -X POST https://your-domain.com/api/files \
          </div>
          <div>
            {"  "}-H{" "}
            <span style={{ color: "var(--success)" }}>
              x-api-key: cdn_your_api_key
            </span>{" "}\
          </div>
          <div>
            {"  "}-F{" "}
            <span style={{ color: "var(--success)" }}>
              file=@/path/to/your/file.jpg
            </span>{" "}\
          </div>
          <div>
            {"  "}-F <span style={{ color: "var(--success)" }}>isPublic=true</span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            Response:
          </div>
          <div
            style={{
              background: "var(--bg-base)",
              borderRadius: "var(--r-md)",
              padding: "12px 16px",
              border: "1px solid var(--border)",
              fontFamily: "monospace",
              fontSize: 12,
              color: "var(--success)",
            }}
          >
            {`{ "file": { "id": "...", "slug": "...", "blobUrl": "...", "isPublic": true } }`}
          </div>
        </div>
      </div>

      {/* Keys list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Memuat...
        </div>
      ) : keys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon flex-center" style={{ color: "var(--text-muted)" }}>
            <Key size={48} />
          </div>
          <div className="empty-title">Belum ada API Key</div>
          <div className="empty-sub">Buat API key pertama kamu di atas</div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Daftar API Keys ({keys.length}/10)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {keys.map((key) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="flex-center" style={{ color: "var(--text-muted)" }}>
                  <Key size={20} />
                </span>
                <code
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {revealed.has(key) ? key : maskKey(key)}
                </code>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setRevealed((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  title={revealed.has(key) ? "Sembunyikan" : "Tampilkan"}
                >
                  {revealed.has(key) ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyKey(key)}
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => revoke(key)}>
                  Cabut
                </button>
              </div>
            ))}
          </div>

          {keys.length >= 10 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--warning)",
                padding: "8px 12px",
                background: "var(--warning-dim)",
                borderRadius: "var(--r-md)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle size={14} /> Batas maksimal 10 API key sudah tercapai
            </div>
          )}
        </div>
      )}
    </div>
  );
}
