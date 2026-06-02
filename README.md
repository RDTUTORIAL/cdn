# CDN Panel

Panel administrasi CDN untuk mengelola dan berbagi file. Dibangun dengan Next.js 16, TypeScript, dan React 19.

## Fitur

- Upload, download, dan manage file
- Folder & tagging system
- Starred / favorites
- Trash / recycle bin
- Public share links (dengan optional password & expiry)
- Role-based users (admin, editor, viewer)
- API Keys untuk integrasi eksternal
- Dashboard analytics & statistik
- Dark mode

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Bahasa:** TypeScript
- **UI:** Custom CSS + Lucide icons
- **Database:** Lowdb (local) / Supabase PostgreSQL
- **Storage:** Vercel Blob / local filesystem
- **Auth:** JWT (jose) + bcrypt

## Mulai Cepat

```bash
# Clone & install
npm install

# Siapkan environment
cp .env.example .env
# Edit .env sesuai kebutuhan

# Jalankan development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Default Login

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin`   | admin |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Ya | Secret key untuk JWT token |
| `BLOB_READ_WRITE_TOKEN` | Opsional | Token Vercel Blob. Jika tidak di-set, file disimpan lokal di `public/uploads/` |
| `NEXT_PUBLIC_SUPABASE_URL` | Opsional | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Opsional | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional | Supabase service role key (untuk admin operations) |

## Database

Default pake **Lowdb** (JSON file di `data/db.json`). Untuk production, disarankan pake **Supabase**:

1. Buat project di [supabase.com](https://supabase.com)
2. Isi `.env` dengan credential Supabase
3. Jalankan SQL di `lib/supabase/schema.sql` ke Supabase SQL Editor
4. Akses endpoint `POST /api/migrate` untuk migrasi data dari lowdb

## Struktur

```
app/          Routes & API
components/  UI Components
lib/          Logic & utilities
  auth.ts     JWT auth
  db.ts       Lowdb adapter
  db-supabase.ts  Supabase adapter
  storage.ts  File storage abstraction
  supabase/   Supabase config & schema
public/       Static assets
data/         Local database (gitignored)
```
