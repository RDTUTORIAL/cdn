-- ============================================
-- CDN Panel — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table (mirrors the lowdb User type)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  api_keys TEXT[] NOT NULL DEFAULT '{}'
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  blob_url TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  password TEXT,
  expires_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'CDN Panel',
  max_file_size_mb INTEGER NOT NULL DEFAULT 50,
  allowed_types TEXT NOT NULL DEFAULT '*',
  storage_quota_mb INTEGER NOT NULL DEFAULT 5000,
  public_base_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_owner ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_slug ON files(slug);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_owner ON tags(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp DESC);

-- Default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can read their own data, admins can read/write all
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (id = auth.uid()::text OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');

-- For files: owner can access their own, public files visible to all
CREATE POLICY "Owner can manage files" ON files FOR ALL USING (owner_id = auth.uid()::text);
CREATE POLICY "Public files are readable" ON files FOR SELECT USING (is_public = true AND is_deleted = false);
CREATE POLICY "Admins can manage all files" ON files FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');

-- Folders
CREATE POLICY "Owner can manage folders" ON folders FOR ALL USING (owner_id = auth.uid()::text);
CREATE POLICY "Admins can manage all folders" ON folders FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');

-- Tags
CREATE POLICY "Owner can manage tags" ON tags FOR ALL USING (owner_id = auth.uid()::text);
CREATE POLICY "Admins can manage all tags" ON tags FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');

-- Settings: admin only
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');
CREATE POLICY "Everyone can read settings" ON settings FOR SELECT USING (true);

-- Activity log
CREATE POLICY "Users can read own activity" ON activity_log FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Admins can read all activity" ON activity_log FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()::text) = 'admin');
CREATE POLICY "Authenticated can insert activity" ON activity_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
