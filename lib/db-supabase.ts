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

function userToDb(u: User): Record<string, unknown> {
  return {
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role,
    created_at: u.createdAt,
    api_keys: u.apiKeys,
  };
}

function folderToDb(f: FolderRecord): Record<string, unknown> {
  return {
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
  };
}

function fileToDb(f: FileRecord): Record<string, unknown> {
  return {
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
  };
}

function tagToDb(t: Tag): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    owner_id: t.ownerId,
  };
}

function settingsToDb(settings: Settings): Record<string, unknown> {
  return {
    id: 1,
    site_name: settings.siteName,
    max_file_size_mb: settings.maxFileSizeMB,
    allowed_types: settings.allowedTypes,
    storage_quota_mb: settings.storageQuotaMB,
    public_base_url: settings.publicBaseUrl,
    updated_at: new Date().toISOString(),
  };
}

function settingsFingerprint(settings: Settings): string {
  return JSON.stringify({
    siteName: settings.siteName,
    maxFileSizeMB: settings.maxFileSizeMB,
    allowedTypes: settings.allowedTypes,
    storageQuotaMB: settings.storageQuotaMB,
    publicBaseUrl: settings.publicBaseUrl,
  });
}

function activityToDb(a: ActivityLog): Record<string, unknown> {
  return {
    id: a.id,
    user_id: a.userId,
    action: a.action,
    target_id: a.targetId,
    target_name: a.targetName,
    timestamp: a.timestamp,
  };
}

function cloneData(data: Data): Data {
  return structuredClone(data);
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

async function deleteRowsMissingFromSnapshot(
  table: string,
  keepIds: Set<string>
): Promise<void> {
  const { data, error } = await supabase.from(table).select();
  if (error) throw error;

  const staleRows = (data || []).filter((row) => {
    const id = row.id;
    return typeof id === "string" && !keepIds.has(id);
  });

  for (const row of staleRows) {
    const { error: deleteErr } = await supabase.from(table).delete({ id: row.id });
    if (deleteErr) throw deleteErr;
  }
}

async function pruneSupabaseToSnapshot(data: Data): Promise<void> {
  // Child tables first, then parent users, so foreign keys/cascades stay predictable.
  await deleteRowsMissingFromSnapshot("files", new Set(data.files.map((f) => f.id)));
  await deleteRowsMissingFromSnapshot("activity_log", new Set(data.activityLog.map((a) => a.id)));
  await deleteRowsMissingFromSnapshot("tags", new Set(data.tags.map((t) => t.id)));
  await deleteRowsMissingFromSnapshot("folders", new Set(data.folders.map((f) => f.id)));
  await deleteRowsMissingFromSnapshot("users", new Set(data.users.map((u) => u.id)));
}

async function deleteRemovedRows<T extends { id: string }>(
  table: string,
  previousRows: T[],
  nextRows: T[]
): Promise<void> {
  const nextIds = new Set(nextRows.map((row) => row.id));
  const removedRows = previousRows.filter((row) => !nextIds.has(row.id));

  for (const row of removedRows) {
    const { error } = await supabase.from(table).delete({ id: row.id });
    if (error) throw error;
  }
}

async function upsertChangedRows<T extends { id: string }>(
  table: string,
  previousRows: T[],
  nextRows: T[],
  toDb: (row: T) => Record<string, unknown>
): Promise<void> {
  const previousById = new Map(
    previousRows.map((row) => [row.id, JSON.stringify(toDb(row))])
  );
  const changedRows = nextRows
    .map((row) => ({ row, payload: toDb(row) }))
    .filter(({ row, payload }) => previousById.get(row.id) !== JSON.stringify(payload))
    .map(({ payload }) => payload);

  if (changedRows.length === 0) return;

  const { error } = await supabase.from(table).upsert(changedRows);
  if (error) throw error;
}

async function writeDiffToSupabase(
  previousData: Data | null,
  nextData: Data
): Promise<boolean> {
  if (!previousData) {
    return migrateToSupabase(nextData, { prune: true });
  }

  try {
    // Delete before upsert, and child tables before parents.
    await deleteRemovedRows("files", previousData.files, nextData.files);
    await deleteRemovedRows("activity_log", previousData.activityLog, nextData.activityLog);
    await deleteRemovedRows("tags", previousData.tags, nextData.tags);
    await deleteRemovedRows("folders", previousData.folders, nextData.folders);
    await deleteRemovedRows("users", previousData.users, nextData.users);

    // Upsert parents before children.
    await upsertChangedRows("users", previousData.users, nextData.users, userToDb);
    await upsertChangedRows("folders", previousData.folders, nextData.folders, folderToDb);
    await upsertChangedRows("files", previousData.files, nextData.files, fileToDb);
    await upsertChangedRows("tags", previousData.tags, nextData.tags, tagToDb);
    await upsertChangedRows("activity_log", previousData.activityLog, nextData.activityLog, activityToDb);

    const previousSettings = settingsFingerprint(previousData.settings);
    const nextSettings = settingsToDb(nextData.settings);
    if (previousSettings !== settingsFingerprint(nextData.settings)) {
      const { error } = await supabase.from("settings").upsert([nextSettings]);
      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error("[supabase] Diff write failed:", err);
    return false;
  }
}

/**
 * Migrate data from lowdb JSON to Supabase.
 * Reads the lowdb db.json and upserts all records into Supabase tables.
 */
export async function migrateToSupabase(
  data: Data,
  options: { prune?: boolean } = {}
): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.error("[supabase] Cannot migrate — service role key not set.");
    return false;
  }

  try {
    // Users
    if (data.users.length > 0) {
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

    if (options.prune) {
      await pruneSupabaseToSnapshot(data);
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
 * Runtime write() applies a row-level diff instead of syncing the whole snapshot.
 * Suitable for small-to-medium datasets. For large datasets, consider
 * migrating API routes to direct Supabase queries.
 */
export class SupabaseAdapter implements Adapter<Data> {
  private previousData: Data | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<Data | null> {
    const data = await readAllFromSupabase();
    this.previousData = data ? cloneData(data) : null;
    return data;
  }

  async write(data: Data): Promise<void> {
    if (!isSupabaseAvailable()) {
      console.warn("[supabase] write() called but Supabase is not configured");
      return;
    }

    const snapshot = cloneData(data);
    const run = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const ok = await writeDiffToSupabase(this.previousData, snapshot);
        if (!ok) {
          console.error("[supabase] Adapter write failed");
          return;
        }
        this.previousData = cloneData(snapshot);
      });

    this.writeQueue = run.catch(() => undefined);
    await run;
  }
}
