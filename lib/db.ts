import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { Memory } from "lowdb";
import { SupabaseAdapter } from "./db-supabase";
import { isSupabaseAvailable } from "./supabase/admin";
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

  // ─── Option 1: Supabase (production recommended) ───
  if (isSupabaseAvailable()) {
    console.log("[db] Using Supabase adapter");
    const adapter = new SupabaseAdapter();
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
  }

  // ─── Option 2: Local filesystem (development) ───
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
    // ─── Option 3: In-memory fallback (serverless without Supabase) ───
    console.warn("[db] Filesystem not writable — falling back to in-memory database. Data will NOT persist between requests!");
    console.warn("[db] For persistent data in production, configure Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");

    const adapter = new Memory<Data>();
    db = new Low<Data>(adapter, defaultData);
    db.data = structuredClone(defaultData);

    return db;
  }
}

export async function saveDb(): Promise<void> {
  if (db) await db.write();
}
