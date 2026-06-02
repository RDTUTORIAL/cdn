import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ToastProvider } from "@/components/Toast";
import Sidebar from "@/components/Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout for all authenticated dashboard pages.
 * Handles auth check, sidebar, and toast provider.
 */
export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const trashCount = db.data.files.filter(
    (f) => f.isDeleted && (session.role === "admin" || f.ownerId === session.userId)
  ).length;

  return (
    <ToastProvider>
      <div className="layout">
        <Sidebar
          username={session.username}
          role={session.role}
          trashCount={trashCount}
        />
        <div className="main-content">{children}</div>
      </div>
    </ToastProvider>
  );
}
