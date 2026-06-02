"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { LayoutDashboard, Folder, Star, TrendingUp, Trash2, Key, Settings, Loader2, LogOut, Users } from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { href: "/files", icon: <Folder size={20} />, label: "File Manager" },
  { href: "/starred", icon: <Star size={20} />, label: "Favorit" },
  { href: "/analytics", icon: <TrendingUp size={20} />, label: "Analitik" },
];

const adminItems: NavItem[] = [
  { href: "/users", icon: <Users size={20} />, label: "User" },
];

const bottomItems: NavItem[] = [
  { href: "/trash", icon: <Trash2 size={20} />, label: "Sampah" },
  { href: "/api-keys", icon: <Key size={20} />, label: "API Keys" },
  { href: "/settings", icon: <Settings size={20} />, label: "Pengaturan" },
];

interface SidebarProps {
  username?: string;
  role?: string;
  trashCount?: number;
}

export default function Sidebar({ username = "admin", role = "admin", trashCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const allBottomItems = bottomItems.map((item) =>
    item.href === "/trash" ? { ...item, badge: trashCount } : item
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Image src="/logo.webp" alt="CDN Panel" width={28} height={28} className="sidebar-logo-icon" />
        <span className="sidebar-logo-text">CDN Panel</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Menu Utama</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      {role === "admin" && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Admin</div>
          {adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-label">Lainnya</div>
        {allBottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
            {item.badge ? (
              <span className="sidebar-item-badge">{item.badge > 99 ? "99+" : item.badge}</span>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Klik untuk logout">
          <div className="sidebar-avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-username">{username}</div>
            <div className="sidebar-role">{role}</div>
          </div>
          <span style={{ color: "var(--text-muted)", display: "flex" }}>
            {loggingOut ? <Loader2 size={16} className="spinner" /> : <LogOut size={16} />}
          </span>
        </div>
      </div>
    </aside>
  );
}
