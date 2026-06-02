"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Users, UserPlus, User, Shield, Trash2, Edit, AlertTriangle,
  Crown, PenLine, Eye, BookOpen,
} from "lucide-react";

interface UserRecord {
  id: string;
  username: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  apiKeyCount: number;
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const roleColor: Record<string, string> = {
  admin: "var(--danger)",
  editor: "var(--accent)",
  viewer: "var(--text-muted)",
};

const roleIcon: Record<string, React.ReactNode> = {
  admin: <Crown size={14} />,
  editor: <PenLine size={14} />,
  viewer: <Eye size={14} />,
};

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("viewer");

  // Edit modal
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/users", { signal: controller.signal });
      if (cancelled) return;
      const data = await res.json();
      if (!cancelled) {
        setUsers(data.users || []);
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
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }

  async function handleCreate() {
    if (!newUsername.trim()) { showToast("Username wajib diisi", "error"); return; }
    if (!newPassword || newPassword.length < 4) { showToast("Password minimal 4 karakter", "error"); return; }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`User ${data.user.username} dibuat`, "success");
      setCreateOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("viewer");
      load();
    } else {
      showToast(data.error || "Gagal membuat user", "error");
    }
  }

  async function handleUpdate() {
    if (!editUser) return;
    const body: Record<string, string> = {};
    if (editUsername.trim() && editUsername.trim() !== editUser.username) body.username = editUsername.trim();
    if (editRole && editRole !== editUser.role) body.role = editRole;
    if (editPassword && editPassword.length >= 4) body.password = editPassword;

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("User diperbarui", "success");
      setEditUser(null);
      load();
    } else {
      showToast(data.error || "Gagal update user", "error");
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      showToast(`User ${deleteUser.username} dihapus`, "success");
      setDeleteUser(null);
      load();
    } else {
      showToast(data.error || "Gagal hapus user", "error");
    }
  }

  function openEdit(user: UserRecord) {
    setEditUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole(user.role);
  }

  return (
    <div className="page-body">
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={24} /> Manajemen User
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Kelola akun pengguna CDN Panel
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      {/* Info card */}
      <div className="card mb-24">
        <div className="card-header">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={18} /> Info Role
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            {
              role: "admin",
              desc: "Akses penuh — bisa kelola user, file, dan pengaturan sistem. Hanya admin yang bisa mengakses halaman ini.",
            },
            {
              role: "editor",
              desc: "Bisa upload, edit, hapus file sendiri. Tidak bisa mengakses pengaturan sistem dan manajemen user.",
            },
            {
              role: "viewer",
              desc: "Hanya bisa melihat dan mendownload file. Tidak bisa upload atau menghapus.",
            },
          ].map((r) => (
            <div key={r.role} style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                  fontWeight: 700, fontSize: 13, color: roleColor[r.role],
                }}
              >
                {roleIcon[r.role]} {roleLabel[r.role]}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Memuat...
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon flex-center" style={{ color: "var(--text-muted)" }}>
            <Users size={48} />
          </div>
          <div className="empty-title">Belum ada user</div>
          <div className="empty-sub">Tambah user pertama dengan tombol di atas</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>API Keys</th>
                <th>Dibuat</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--accent), var(--purple))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0,
                        }}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 99,
                        fontSize: 11, fontWeight: 700,
                        background: user.role === "admin"
                          ? "var(--danger-dim)"
                          : user.role === "editor"
                            ? "var(--accent-dim)"
                            : "var(--bg-active)",
                        color: roleColor[user.role],
                      }}
                    >
                      {roleIcon[user.role]} {roleLabel[user.role]}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 13 }}>
                    {user.apiKeyCount} keys
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {new Date(user.createdAt).toLocaleDateString("id-ID", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEdit(user)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={() => setDeleteUser(user)}
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah User Baru"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleCreate} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <UserPlus size={16} /> Buat User
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              placeholder="Username..."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimal 4 karakter..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="viewer">👁 Viewer — Hanya melihat</option>
              <option value="editor">✏️ Editor — Upload & edit</option>
              <option value="admin">👑 Admin — Akses penuh</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit User — ${editUser?.username}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditUser(null)}>
              Batal
            </button>
            <button className="btn btn-primary" onClick={handleUpdate} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Edit size={16} /> Simpan
            </button>
          </>
        }
      >
        {editUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru (kosongkan jika tidak ingin ganti)</label>
              <input
                className="form-input"
                type="password"
                placeholder="Minimal 4 karakter..."
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="viewer">👁 Viewer</option>
                <option value="editor">✏️ Editor</option>
                <option value="admin">👑 Admin</option>
              </select>
              <span className="form-hint">Mengubah role user ke non-admin mungkin tidak bisa jika user adalah admin</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Hapus User"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteUser(null)}>
              Batal
            </button>
            <button className="btn btn-danger" onClick={handleDelete} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={16} /> Hapus Permanen
            </button>
          </>
        }
      >
        <div>
          <div
            style={{
              padding: "12px 16px", background: "var(--danger-dim)",
              border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-md)",
              marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8,
            }}
          >
            <AlertTriangle size={18} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
                Tindakan ini tidak bisa dibatalkan
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                User <strong>{deleteUser?.username}</strong> akan dihapus permanen. File yang diupload oleh user ini akan tetap ada.
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            Yakin ingin melanjutkan?
          </p>
        </div>
      </Modal>
    </div>
  );
}
