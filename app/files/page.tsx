"use client";

import { useState, useEffect } from "react";
import { FileRecord, FolderRecord } from "@/lib/types";
import { Eye, Download, Link as LinkIcon, Share, Star, Lock, Globe, Edit, FolderOpen, Trash2, Home, Folder, FolderPlus, Upload, Search, Grid, List, ArrowRight } from "lucide-react";
import { timeAgo, buildPublicUrl } from "@/lib/utils";
import FileCard from "@/components/FileCard";
import UploadZone from "@/components/UploadZone";
import FilePreview from "@/components/FilePreview";
import ShareModal from "@/components/ShareModal";
import ContextMenu from "@/components/ContextMenu";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

type View = "grid" | "list";
type SortKey = "name" | "size" | "createdAt" | "downloadCount";

export default function FilesPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);

  // UI state
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAccess, setFilterAccess] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPublic, setUploadPublic] = useState(false);

  // Modals
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);
  const [renameFile, setRenameFile] = useState<FileRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [moveFileOpen, setMoveFileOpen] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);

  // Context menu
  const [ctx, setCtx] = useState<{ x: number; y: number; file: FileRecord } | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("folderId", currentFolderId);
      if (search) params.set("search", search);
      if (filterType) params.set("type", filterType);
      if (filterAccess) params.set("isPublic", filterAccess);
      params.set("sort", sort);
      params.set("order", order);

      const [filesRes, foldersRes] = await Promise.all([
        fetch(`/api/files?${params}`),
        fetch(`/api/folders?parentId=${currentFolderId || ""}`),
      ]);
      const [filesData, foldersData] = await Promise.all([
        filesRes.json(),
        foldersRes.json(),
      ]);
      setFiles(filesData.files || []);
      setFolders(foldersData.folders || []);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [currentFolderId, search, filterType, filterAccess, sort, order]);

  // Keyboard shortcuts — stable effect that reads latest state via closures
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") { setSelected(new Set()); setCtx(null); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleSelect(id: string, multi: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        if (next.size === 1 && next.has(id)) next.clear();
        else { next.clear(); next.add(id); }
      }
      return next;
    });
  }

  function openFolder(folder: FolderRecord) {
    setCurrentFolderId(folder.id);
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelected(new Set());
  }

  function navigateTo(id: string | null, index: number) {
    setCurrentFolderId(id);
    setBreadcrumb((prev) => prev.slice(0, index + 1));
    setSelected(new Set());
  }

  async function handleDelete(fileId: string) {
    const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    if (res.ok) { showToast("File dipindah ke sampah", "success"); fetchData(); }
    else showToast("Gagal hapus file", "error");
    setCtx(null);
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Hapus ${selected.size} file ke sampah?`)) return;
    const results = await Promise.allSettled(
      [...selected].map((id) => fetch(`/api/files/${id}`, { method: "DELETE" }))
    );
    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
    if (failed > 0) {
      showToast(`${failed} file gagal dihapus`, "error");
    } else {
      showToast(`${selected.size} file dihapus`, "success");
    }
    setSelected(new Set());
    fetchData();
  }

  async function handleFavorite(file: FileRecord) {
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorited: !file.isFavorited }),
    });
    if (res.ok) { showToast(file.isFavorited ? "Dihapus dari favorit" : "Ditambah ke favorit", "success"); fetchData(); }
    setCtx(null);
  }

  async function handleTogglePublic(file: FileRecord) {
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !file.isPublic }),
    });
    if (res.ok) { showToast(`File ${!file.isPublic ? "dijadikan publik" : "dijadikan privat"}`, "success"); fetchData(); }
    setCtx(null);
  }

  async function handleRename() {
    if (!renameFile || !renameValue.trim()) return;
    const res = await fetch(`/api/files/${renameFile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) { showToast("File diubah namanya", "success"); fetchData(); }
    setRenameFile(null);
    setRenameValue("");
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName.trim(), parentId: currentFolderId }),
    });
    if (res.ok) { showToast("Folder dibuat", "success"); fetchData(); }
    setCreateFolderOpen(false);
    setFolderName("");
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm("Hapus folder ini?")) return;
    const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    if (res.ok) { showToast("Folder dihapus", "success"); fetchData(); }
  }

  async function handleMoveFile() {
    if (!renameFile) return;
    const res = await fetch(`/api/files/${renameFile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: moveTargetFolder }),
    });
    if (res.ok) { showToast("File dipindah", "success"); fetchData(); }
    setMoveFileOpen(false);
    setRenameFile(null);
  }

  function copyLink(file: FileRecord) {
    if (!file.isPublic) { showToast("File harus publik dulu", "warning"); return; }
    navigator.clipboard.writeText(buildPublicUrl(file.slug));
    showToast("Link disalin!", "success");
    setCtx(null);
  }

  function getContextMenuItems(file: FileRecord) {
    return [
      { label: "Preview", icon: <Eye size={14} />, onClick: () => setPreviewFile(file) },
      { label: "Download", icon: <Download size={14} />, onClick: () => { window.open(`${file.blobUrl}`, "_blank"); } },
      { label: "Copy Link", icon: <LinkIcon size={14} />, onClick: () => copyLink(file) },
      { label: "Bagikan", icon: <Share size={14} />, onClick: () => setShareFile(file) },
      { divider: true, label: "", icon: null, onClick: () => {} },
      { label: file.isFavorited ? "Hapus Favorit" : "Tambah Favorit", icon: <Star size={14} />, onClick: () => handleFavorite(file) },
      { label: file.isPublic ? "Jadikan Privat" : "Jadikan Publik", icon: file.isPublic ? <Lock size={14} /> : <Globe size={14} />, onClick: () => handleTogglePublic(file) },
      { label: "Rename", icon: <Edit size={14} />, onClick: () => { setRenameFile(file); setRenameValue(file.name); } },
      { label: "Pindah Folder", icon: <FolderOpen size={14} />, onClick: () => { setRenameFile(file); setMoveFileOpen(true); } },
      { divider: true, label: "", icon: null, onClick: () => {} },
      { label: "Hapus", icon: <Trash2 size={14} />, onClick: () => handleDelete(file.id), danger: true },
    ];
  }

  const filteredFolders = folders.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body" onClick={() => { setCtx(null); }}>
      {/* Page Header */}
      <div className="flex-between mb-16">
        <div>
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            {breadcrumb.map((bc, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span className="breadcrumb-sep">/</span>}
                <button
                  className={`breadcrumb-item ${i === breadcrumb.length - 1 ? "current" : ""}`}
                  onClick={() => navigateTo(bc.id, i)}
                >
                  {i === 0 ? <><Home size={14} style={{ marginRight: 4 }} /> Root</> : <><Folder size={14} style={{ marginRight: 4 }} /> {bc.name}</>}
                </button>
              </span>
            ))}
          </nav>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>File Manager</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setCreateFolderOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><FolderPlus size={16} /> Folder Baru</button>
          <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Upload size={16} /> Upload</button>
        </div>
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <div className="card mb-16">
          <div className="card-header">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><Upload size={18} /> Upload File</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                <label className="toggle" style={{ width: 32, height: 18 }}>
                  <input type="checkbox" checked={uploadPublic} onChange={(e) => setUploadPublic(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
                Upload sebagai Publik
              </label>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUpload(false)}>×</button>
            </div>
          </div>
          <UploadZone
            folderId={currentFolderId}
            isPublic={uploadPublic}
            onUploaded={fetchData}
            onToast={showToast}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}><Search size={16} /></span>
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Cari file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <select className="form-select" style={{ width: 140 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Semua Tipe</option>
          <option value="image">Gambar</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="application/pdf">PDF</option>
          <option value="text">Teks</option>
        </select>

        <select className="form-select" style={{ width: 130 }} value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}>
          <option value="">Semua Akses</option>
          <option value="true">Publik</option>
          <option value="false">Privat</option>
        </select>

        <select className="form-select" style={{ width: 160 }} value={`${sort}-${order}`} onChange={(e) => {
          const [s, o] = e.target.value.split("-");
          setSort(s as SortKey);
          setOrder(o as "asc" | "desc");
        }}>
          <option value="createdAt-desc">Terbaru</option>
          <option value="createdAt-asc">Terlama</option>
          <option value="name-asc">Nama A–Z</option>
          <option value="name-desc">Nama Z–A</option>
          <option value="size-desc">Ukuran ↓</option>
          <option value="size-asc">Ukuran ↑</option>
          <option value="downloadCount-desc">Paling Banyak Diunduh</option>
        </select>

        <div className="toolbar-sep" />

        {/* View toggle */}
        <div className="view-toggle">
          <button className={`view-toggle-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} title="Grid view" style={{ display: "flex" }}><Grid size={16} /></button>
          <button className={`view-toggle-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} title="List view" style={{ display: "flex" }}><List size={16} /></button>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <>
            <div className="toolbar-sep" />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{selected.size} dipilih</span>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} style={{ display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={14} /> Hapus</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Batal</button>
          </>
        )}
      </div>

      {/* List header for list view */}
      {view === "list" && (files.length > 0 || filteredFolders.length > 0) && (
        <div style={{ display: "flex", gap: 12, padding: "6px 12px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
          <div style={{ width: 36, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Nama</div>
          <div style={{ width: 100, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", textAlign: "right" }}>Akses</div>
          <div style={{ width: 70, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", textAlign: "right" }}>Ukuran</div>
          <div style={{ width: 130, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", textAlign: "right" }}>Waktu</div>
          <div style={{ width: 60 }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && files.length === 0 && filteredFolders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)" }}><FolderOpen size={48} /></div>
          <div className="empty-title">{search ? "Tidak ada hasil" : "Folder ini kosong"}</div>
          <div className="empty-sub">{search ? "Coba kata kunci lain" : "Upload file atau buat folder baru"}</div>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload File Sekarang
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className={view === "grid" ? "file-grid" : "file-list"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={view === "grid" ? { height: 180 } : { height: 48, marginBottom: 4 }} />
          ))}
        </div>
      )}

      {/* Folders */}
      {!loading && filteredFolders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 8 }}>
            Folder ({filteredFolders.length})
          </div>
          <div className={view === "grid" ? "file-grid" : "file-list"}>
            {filteredFolders.map((folder) => (
              view === "grid" ? (
                <div
                  key={folder.id}
                  className="file-card"
                  onDoubleClick={() => openFolder(folder)}
                  style={{ cursor: "pointer" }}
                  title="Klik 2x untuk buka"
                >
                  <div className="file-card-thumb" style={{ background: "var(--accent-dim)" }}>
                    <span className="file-card-thumb-icon" style={{ display: "flex", justifyContent: "center" }}><Folder size={40} /></span>
                  </div>
                  <div className="file-card-info">
                    <div className="file-card-name">{folder.name}</div>
                    <div className="file-card-meta">
                      <span>{folder.isPublic ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={12} /> Publik</span> : <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Lock size={12} /> Privat</span>}</span>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); openFolder(folder); }} title="Buka"><ArrowRight size={16} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--danger)" }} onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} title="Hapus"><Trash2 size={16} /></button>
                  </div>
                </div>
              ) : (
                <div key={folder.id} className="file-row" onDoubleClick={() => openFolder(folder)}>
                  <div className="file-row-icon" style={{ background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}><Folder size={20} /></div>
                  <span className="file-row-name">{folder.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{folder.isPublic ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Globe size={12} /> Publik</span> : <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Lock size={12} /> Privat</span>}</span>
                  <span className="file-row-size">—</span>
                  <span className="file-row-date">{timeAgo(folder.createdAt)}</span>
                  <div className="file-row-actions">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openFolder(folder)}><ArrowRight size={16} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDeleteFolder(folder.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {!loading && files.length > 0 && (
        <div>
          {filteredFolders.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 8 }}>
              File ({files.length})
            </div>
          )}
          <div className={view === "grid" ? "file-grid" : "file-list"}>
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                view={view}
                selected={selected.has(file.id)}
                onSelect={handleSelect}
                onContextMenu={(e, f) => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, file: f }); }}
                onClick={setPreviewFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          items={getContextMenuItems(ctx.file)}
          onClose={() => setCtx(null)}
        />
      )}

      {/* File Preview Modal */}
      <FilePreview
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Share Modal */}
      <ShareModal
        key={shareFile?.id}
        file={shareFile}
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        onUpdate={() => fetchData()}
      />

      {/* Rename Modal */}
      <Modal isOpen={!!renameFile && !moveFileOpen} onClose={() => setRenameFile(null)} title="Rename File"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setRenameFile(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleRename}>Simpan</button>
          </>
        }
      >
        <div className="form-group" style={{ paddingBottom: 4 }}>
          <label className="form-label">Nama Baru</label>
          <input
            className="form-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal isOpen={createFolderOpen} onClose={() => setCreateFolderOpen(false)} title="Buat Folder Baru"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateFolderOpen(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleCreateFolder}>Buat</button>
          </>
        }
      >
        <div className="form-group" style={{ paddingBottom: 4 }}>
          <label className="form-label">Nama Folder</label>
          <input
            className="form-input"
            placeholder="Nama folder..."
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
        </div>
      </Modal>

      {/* Move File Modal */}
      <Modal isOpen={moveFileOpen} onClose={() => setMoveFileOpen(false)} title="Pindah File"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMoveFileOpen(false)}>Batal</button>
            <button className="btn btn-primary" onClick={handleMoveFile}>Pindah</button>
          </>
        }
      >
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Pilih folder tujuan:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              className={`file-row ${moveTargetFolder === null ? "selected" : ""}`}
              onClick={() => setMoveTargetFolder(null)}
            >
              <div className="file-row-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Home size={20} /></div>
              <span className="file-row-name">Root</span>
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className={`file-row ${moveTargetFolder === f.id ? "selected" : ""}`}
                onClick={() => setMoveTargetFolder(f.id)}
              >
                <div className="file-row-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Folder size={20} /></div>
                <span className="file-row-name">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
