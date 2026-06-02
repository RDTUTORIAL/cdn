"use client";

import { useEffect, useRef, useState } from "react";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    // Adjust position to stay within viewport
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos({
        x: x + rect.width > vw ? vw - rect.width - 8 : x,
        y: y + rect.height > vh ? vh - rect.height - 8 : y,
      });
    }

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [x, y, onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="context-divider" />
        ) : (
          <button
            key={i}
            className={`context-item ${item.danger ? "danger" : ""}`}
            onClick={() => { item.onClick(); onClose(); }}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
