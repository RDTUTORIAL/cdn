"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { EyeOff, Eye, AlertTriangle, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login gagal");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Decorative orbs */}
      <div style={{
        position: "absolute", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        top: "10%", left: "5%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300,
        background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
        bottom: "10%", right: "10%", pointerEvents: "none",
      }} />

      <div className="login-card">
        <div className="login-logo">
        <Image src="/logo.webp" alt="CDN Panel" width={40} height={40} className="login-logo-icon" />
          <span className="login-logo-text">CDN Panel</span>
        </div>

        <h1 className="login-title">Selamat datang</h1>
        <p className="login-sub">Masuk ke panel admin CDN kamu</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute", right: 10, top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", color: "var(--text-muted)",
                  fontSize: 16,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "var(--danger-dim)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--r-md)", padding: "10px 14px",
              color: "var(--danger)", fontSize: 13, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ justifyContent: "center", marginTop: 4 }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Masuk...</>
            ) : (
              <><span style={{ display: "flex" }}><Key size={18} /></span> Masuk</>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
