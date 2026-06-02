import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { Memory } from "lowdb";
import type { User, FileRecord, FolderRecord, Tag, Settings, ActivityLog } from "./types";

// Re-export types for server-side convenience
export type { User, FileRecord, FolderRecord, Tag, Settings, ActivityLog } from "./types";

export interface Data {
  users: User[];
  files: FileRecord[];
  folders: FolderRecord[];
  tags: Tag[];
  settings: Settings;
  activityLog: ActivityLog[];
  sessions: string[];
}

const defaultData: Data = {
  users: [],
  files: [],
  folders: [],
  tags: [],
  settings: {
    siteName: "CDN Panel",
    maxFileSizeMB: 50,
    allowedTypes: "*",
    storageQuotaMB: 5000,
    publicBaseUrl: "",
  },
  activityLog: [],
  sessions: [],
};

let db: Low<Data> | null = null;

export async function getDb(): Promise<Low<Data>> {
  if (db) return db;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try filesystem first (local development)
  try {
    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const filePath = join(dataDir, "db.json");
    const adapter = new JSONFile<Data>(filePath);
    db = new Low<Data>(adapter, defaultData);
    await db.read();

    db.data ??= defaultData;
    db.data.users ??= [];
    db.data.files ??= [];
    db.data.folders ??= [];
    db.data.tags ??= [];
    db.data.settings ??= defaultData.settings;
    db.data.activityLog ??= [];
    db.data.sessions ??= [];

    return db;
  } catch (err) {
    // Filesystem not writable (Vercel, serverless, read-only environments)
    console.warn("[db] Filesystem not writable — falling back to in-memory database. Data will NOT persist between requests!");

    if (supabaseUrl && supabaseKey) {
      console.warn("[db] Supabase env vars detected but full integration not yet implemented. All routes still use Lowdb.");
      console.warn("[db] To use Supabase, migrate API routes to use lib/db-supabase.ts instead of lib/db.ts");
    } else {
      console.warn("[db] For persistent data in production, configure Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) and migrate routes to lib/db-supabase.ts");
    }

    const adapter = new Memory<Data>();
    db = new Low<Data>(adapter, defaultData);
    db.data = structuredClone(defaultData);

    return db;
  }
}

export async function saveDb(): Promise<void> {
  if (db) await db.write();
}
