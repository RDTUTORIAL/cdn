"use client";

import { FileRecord } from "@/lib/types";
import { formatBytes, getFileCategory, getFileCategoryIcon, isExpired, timeAgo } from "@/lib/utils";
import { Lock, Star, Eye, MoreHorizontal, Check } from "lucide-react";

interface FileCardProps {
  file: FileRecord;
  view: "grid" | "list";
  selected?: boolean;
  onSelect?: (id: string, multi: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileRecord) => void;
  onClick?: (file: FileRecord) => void;
}

function getThumb(file: FileRecord) {
  const cat = getFileCategory(file.mimeType);
  if (cat === "image") return `/api/files/${file.id}/content`;
  return null;
}

function FileBadges({ file }: { file: FileRecord }) {
  const expired = isExpired(file.expiresAt);
  return (
    <div className="file-card-badges">
      {expired ? (
        <span className="badge badge-expired">Expired</span>
      ) : file.password ? (
        <span className="badge badge-protected"><Lock size={12} /></span>
      ) : file.isPublic ? (
        <span className="badge badge-public">Publik</span>
      ) : (
        <span className="badge badge-private">Privat</span>
      )}
      {file.isFavorited && (
        <span className="badge" style={{ background: "var(--warning-dim)", color: "var(--warning)", padding: "2px 4px" }}>
          <Star size={12} />
        </span>
      )}
    </div>
  );
}

export default function FileCard({
  file,
  view,
  selected = false,
  onSelect,
  onContextMenu,
  onClick,
}: FileCardProps) {
  const thumb = getThumb(file);
  const category = getFileCategory(file.mimeType);
  const categoryIcon = getFileCategoryIcon(category);

  function handleClick(e: React.MouseEvent) {
    if (e.detail === 2) {
      onClick?.(file);
    } else {
      onSelect?.(file.id, e.metaKey || e.ctrlKey || e.shiftKey);
    }
  }

  const iconElement = (size: number) => {
    const TheIcon = categoryIcon;
    return <TheIcon size={size} />;
  };

  if (view === "list") {
    return (
      <div
        className={`file-row ${selected ? "selected" : ""}`}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, file); }}
        role="row"
      >
        <div className="file-row-icon">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="flex-center">{iconElement(20)}</span>
          )}
        </div>
        <span className="file-row-name">{file.name}</span>

        <div className="flex-gap">
          {file.password && (
            <span title="Password protected" style={{ display: "flex" }}><Lock size={12} /></span>
          )}
          {file.isFavorited && (
            <span style={{ display: "flex", color: "var(--warning)" }}><Star size={12} /></span>
          )}
          {file.isPublic ? (
            <span className="badge badge-public">Publik</span>
          ) : (
            <span className="badge badge-private">Privat</span>
          )}
        </div>

        <span className="file-row-size">{formatBytes(file.size)}</span>
        <span className="file-row-date">{timeAgo(file.createdAt)}</span>

        <div className="file-row-actions">
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={(e) => { e.stopPropagation(); onClick?.(file); }}
            title="Preview"
          ><Eye size={16} /></button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={(e) => { e.stopPropagation(); onContextMenu?.(e, file); }}
            title="Opsi"
          ><MoreHorizontal size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`file-card ${selected ? "selected" : ""}`}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, file); }}
      role="gridcell"
      title={file.name}
    >
      <div
        className="file-card-checkbox"
        onClick={(e) => { e.stopPropagation(); onSelect?.(file.id, true); }}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </div>

      <div className="file-card-thumb">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={file.name} loading="lazy" />
        ) : (
          <span className="file-card-thumb-icon flex-center">{iconElement(40)}</span>
        )}
        <FileBadges file={file} />
      </div>

      <div className="file-card-info">
        <div className="file-card-name">{file.name}</div>
        <div className="file-card-meta">
          <span>{formatBytes(file.size)}</span>
          <span>·</span>
          <span>{timeAgo(file.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
