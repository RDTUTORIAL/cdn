// Shared TypeScript types — safe to import in both server and client components

export interface User {
  id: string;
  username: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  apiKeys: string[];
}

export interface FileRecord {
  id: string;
  name: string;
  slug: string;
  originalName: string;
  mimeType: string;
  size: number;
  blobUrl: string;
  folderId: string | null;
  ownerId: string;
  isPublic: boolean;
  password: string | null;
  expiresAt: string | null;
  tags: string[];
  isFavorited: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderRecord {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  ownerId: string;
  isPublic: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  ownerId: string;
}

export interface Settings {
  siteName: string;
  maxFileSizeMB: number;
  allowedTypes: string;
  storageQuotaMB: number;
  publicBaseUrl: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  targetId: string;
  targetName: string;
  timestamp: string;
}
