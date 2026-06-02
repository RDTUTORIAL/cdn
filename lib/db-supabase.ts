/**
 * Supabase-backed database adapter.
 * Mirrors the lowdb Data interface using Supabase PostgreSQL tables.
 * Falls back to lowdb if Supabase is not configured.
 */

import { supabase, isSupabaseAvailable } from "./supabase/admin";
import type { User, FileRecord, FolderRecord, Tag, Settings, ActivityLog } from "./types";
import type { Adapter } from "lowdb";

export interface Data {
  users: User[];
  files: FileRecord[];
  folders: FolderRecord[];
  tags: Tag[];
  settings: Settings;
  activityLog: ActivityLog[];
  sessions: string[];
}

// ─── Helpers: snake_case ↔ camelCase ───

function userFromDb(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    password: row.password as string,
    role: row.role as User["role"],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    apiKeys: (row.api_keys as string[]) ?? [],
  };
}

function fileFromDb(row: Record<string, unknown>): FileRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    originalName: row.original_name as string,
    mimeType: row.mime_type as string,
    size: row.size as number,
    blobUrl: row.blob_url as string,
    folderId: (row.folder_id as string) ?? null,
    ownerId: row.owner_id as string,
    isPublic: (row.is_public as boolean) ?? false,
    password: (row.password as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    tags: (row.tags as string[]) ?? [],
    isFavorited: (row.is_favorited as boolean) ?? false,
    isDeleted: (row.is_deleted as boolean) ?? false,
    deletedAt: (row.deleted_at as string) ?? null,
    downloadCount: (row.download_count as number) ?? 0,
    viewCount: (row.view_count as number) ?? 0,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function folderFromDb(row: Record<string, unknown>): FolderRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    parentId: (row.parent_id as string) ?? null,
    ownerId: row.owner_id as string,
    isPublic: (row.is_public as boolean) ?? false,
    isDeleted: (row.is_deleted as boolean) ?? false,
    deletedAt: (row.deleted_at as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function tagFromDb(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    ownerId: row.owner_id as string,
  };
}

function settingsFromDb(row: Record<string, unknown>): Settings {
  return {
    siteName: (row.site_name as string) ?? "CDN Panel",
    maxFileSizeMB: (row.max_file_size_mb as number) ?? 50,
    allowedTypes: (row.allowed_types as string) ?? "*",
    storageQuotaMB: (row.storage_quota_mb as number) ?? 5000,
    publicBaseUrl: (row.public_base_url as string) ?? "",
  };
}

function activityFromDb(row: Record<string, unknown>): ActivityLog {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    action: row.action as string,
    targetId: row.target_id as string,
    targetName: row.target_name as string,
    timestamp: row.timestamp as string,
  };
}

// ─── Public API ───

/**
 * Check if Supabase is ready for use.
 */
export async function isSupabaseReady(): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  const { error } = await supabase.from("settings").select({ limit: 1 });
  return !error;
}

/**
 * Read all data from Supabase. Returns Data structure matching lowdb format.
 */
export async function readAllFromSupabase(): Promise<Data | null> {
  if (!isSupabaseAvailable()) return null;

  try {
    const [usersRes, filesRes, foldersRes, tagsRes, settingsRes, activityRes] =
      await Promise.all([
        supabase.from("users").select(),
        supabase.from("files").select(),
        supabase.from("folders").select(),
        supabase.from("tags").select(),
        supabase.from("settings").select({ limit: 1 }),
        supabase.from("activity_log").select({ order: { column: "timestamp", ascending: false }, limit: 500 }),
      ]);

    if (usersRes.error) throw usersRes.error;

    const settingsRow = settingsRes.data?.[0];
    const settings: Settings = settingsRow
      ? settingsFromDb(settingsRow)
      : {
          siteName: "CDN Panel",
          maxFileSizeMB: 50,
          allowedTypes: "*",
          storageQuotaMB: 5000,
          publicBaseUrl: "",
        };

    return {
      users: (usersRes.data || []).map(userFromDb),
      files: (filesRes.data || []).map(fileFromDb),
      folders: (foldersRes.data || []).map(folderFromDb),
      tags: (tagsRes.data || []).map(tagFromDb),
      settings,
      activityLog: (activityRes.data || []).map(activityFromDb),
      sessions: [],
    };
  } catch (err) {
    console.error("[supabase] Failed to read data:", err);
    return null;
  }
}

/**
 * Write a single entity to Supabase.
 */
export async function writeToSupabase(
  table: string,
  operation: "insert" | "update" | "delete" | "upsert",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;

  try {
    let result;

    switch (operation) {
      case "insert":
        result = await supabase.from(table).insert(payload.data);
        break;
      case "update":
        result = await supabase.from(table).update(payload.data, payload.match);
        break;
      case "delete":
        result = await supabase.from(table).delete(payload.match);
        break;
      case "upsert":
        result = await supabase.from(table).upsert(payload.data);
        break;
    }

    return !result?.error;
  } catch (err) {
    console.error(`[supabase] Write error on ${table}:`, err);
    return false;
  }
}

/**
 * Migrate data from lowdb JSON to Supabase.
 * Reads the lowdb db.json and upserts all records into Supabase tables.
 */
export async function migrateToSupabase(data: Data): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.error("[supabase] Cannot migrate — service role key not set.");
    return false;
  }

  try {
    // Users
    const { error: userErr } = await supabase.from("users").upsert(
      data.users.map((u) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        created_at: u.createdAt,
        api_keys: u.apiKeys,
      }))
    );
    if (userErr) throw userErr;

    // Files
    if (data.files.length > 0) {
      const { error: fileErr } = await supabase.from("files").upsert(
        data.files.map((f) => ({
          id: f.id,
          name: f.name,
          slug: f.slug,
          original_name: f.originalName,
          mime_type: f.mimeType,
          size: f.size,
          blob_url: f.blobUrl,
          folder_id: f.folderId,
          owner_id: f.ownerId,
          is_public: f.isPublic,
          password: f.password,
          expires_at: f.expiresAt,
          tags: f.tags,
          is_favorited: f.isFavorited,
          is_deleted: f.isDeleted,
          deleted_at: f.deletedAt,
          download_count: f.downloadCount,
          view_count: f.viewCount,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        }))
      );
      if (fileErr) throw fileErr;
    }

    // Folders
    if (data.folders.length > 0) {
      const { error: foldErr } = await supabase.from("folders").upsert(
        data.folders.map((f) => ({
          id: f.id,
          name: f.name,
          slug: f.slug,
          parent_id: f.parentId,
          owner_id: f.ownerId,
          is_public: f.isPublic,
          is_deleted: f.isDeleted,
          deleted_at: f.deletedAt,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        }))
      );
      if (foldErr) throw foldErr;
    }

    // Tags
    if (data.tags.length > 0) {
      const { error: tagErr } = await supabase.from("tags").upsert(
        data.tags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          owner_id: t.ownerId,
        }))
      );
      if (tagErr) throw tagErr;
    }

    // Settings
    const { error: setErr } = await supabase.from("settings").upsert([{
      id: 1,
      site_name: data.settings.siteName,
      max_file_size_mb: data.settings.maxFileSizeMB,
      allowed_types: data.settings.allowedTypes,
      storage_quota_mb: data.settings.storageQuotaMB,
      public_base_url: data.settings.publicBaseUrl,
      updated_at: new Date().toISOString(),
    }]);
    if (setErr) throw setErr;

    // Activity log
    if (data.activityLog.length > 0) {
      const { error: actErr } = await supabase.from("activity_log").upsert(
        data.activityLog.map((a) => ({
          id: a.id,
          user_id: a.userId,
          action: a.action,
          target_id: a.targetId,
          target_name: a.targetName,
          timestamp: a.timestamp,
        }))
      );
      if (actErr) throw actErr;
    }

    console.log("[supabase] Migration complete!");
    return true;
  } catch (err) {
    console.error("[supabase] Migration failed:", err);
    return false;
  }
}

// ─── Lowdb Adapter ───

/**
 * Lowdb adapter that persists to Supabase.
 * Every write() syncs the entire Data object to Supabase via upsert.
 * Suitable for small-to-medium datasets. For large datasets, consider
 * migrating API routes to direct Supabase queries.
 */
export class SupabaseAdapter implements Adapter<Data> {
  async read(): Promise<Data | null> {
    return readAllFromSupabase();
  }

  async write(data: Data): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn("[supabase] write() called but Supabase is not configured");
      return;
    }
    const ok = await migrateToSupabase(data);
    if (!ok) {
      console.error("[supabase] Adapter write failed");
    }
  }
}
