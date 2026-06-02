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
- Redis-backed rate limiting (login)
- Supabase PostgreSQL support untuk production

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Bahasa:** TypeScript
- **UI:** Custom CSS + Lucide icons
- **Database:** Lowdb (local dev) / Supabase PostgreSQL (production)
- **Storage:** Vercel Blob (production) / local filesystem (dev)
- **Auth:** JWT (jose) + bcrypt
- **Rate Limiting:** Upstash Redis

## Mulai Cepat (Local Development)

```bash
# Clone & install
git clone <repo-url>
cd cdn
npm install

# Siapkan environment
cp .env.example .env
# Edit .env (minimal: JWT_SECRET)

# Jalankan development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Default Login

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin`   | admin |

> **Warning:** Ganti password default sebelum production!

## Deploy ke Vercel (Production)

### 1. Import Project
- Buka [vercel.com](https://vercel.com) → Add New Project
- Pilih repo `RDTUTORIAL/cdn`

### 2. Environment Variables (Wajib)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Wajib** | Secret key untuk JWT token. Generate: `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | **Wajib** | Token Vercel Blob. [Dapatkan di sini](https://vercel.com/dashboard/stores/blob) |
| `REDIS_URL` atau `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Opsional | Upstash Redis untuk rate limiting login. Tanpa ini, rate limiter dinonaktifkan |
| `NEXT_PUBLIC_SUPABASE_URL` | Opsional tapi **direkomendasikan** | Supabase project URL. Kalau tidak di-set, data tersimpan in-memory (hilang tiap deploy) |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsional | Supabase service role key (wajib kalau pakai Supabase) |

### 3. Supabase Setup (Direkomendasikan untuk Production)

1. Buat project di [supabase.com](https://supabase.com)
2. Jalankan SQL di `lib/supabase/schema.sql` ke Supabase SQL Editor
3. Isi env vars `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy pertama kali, lalu akses `POST /api/migrate` untuk migrasi data default

### 4. Deploy

Klik **Deploy** di Vercel. Setiap push ke `main` akan auto-deploy.

## Environment Variables Detail

### `JWT_SECRET`
- **Wajib di production.** Kalau kosong di production, app akan crash saat startup
- Generate dengan: `openssl rand -hex 32`

### `BLOB_READ_WRITE_TOKEN`
- **Wajib di production.** Vercel filesystem read-only, jadi tidak bisa simpan file lokal
- Dapatkan dari Vercel Dashboard → Blob Stores

### `REDIS_URL` (Format: `redis://default:PASSWORD@HOST:PORT`)
- Opsional. Kalau tidak di-set, rate limiter login dinonaktifkan
- Dapatkan dari [Upstash Console](https://console.upstash.com)
- Alternatif: pakai `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (format REST API)

### Supabase Variables
- `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Anonymous key (untuk client, belum dipakai)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (untuk server-side DB operations)

## Database

### Development (Default)
**Lowdb** — file JSON di `data/db.json`. Auto-dibuat saat pertama kali jalan.

### Production (Direkomendasikan)
**Supabase PostgreSQL** — persistent, scalable, bisa di-query SQL.

Kalau Supabase tidak dikonfigurasi di production:
- Data tersimpan **in-memory** (RAM)
- Data **hilang** tiap kali serverless instance cold start
- Cukup untuk demo/testing, tapi **tidak direkomendasikan** untuk production

## Keamanan

- JWT token dengan secret environment variable
- bcrypt untuk password hashing
- Rate limiting login (5 percobaan / 15 menit) via Redis
- Path traversal guard pada file storage
- Ownership checks pada semua CRUD endpoints
- Cookie HttpOnly + Secure (production only)
- File password di-hash dengan bcrypt

## Troubleshooting Deploy

### Error: `ENOENT: no such file or directory, mkdir '/var/task/data'`
**Penyebab:** Vercel filesystem read-only, Lowdb tidak bisa bikin folder.  
**Fix:** Konfigurasi Supabase atau set `BLOB_READ_WRITE_TOKEN`.

### Error: `JWT_SECRET environment variable is required in production`
**Penyebab:** `JWT_SECRET` tidak di-set di Vercel Environment Variables.  
**Fix:** Generate secret dan tambahkan ke Vercel Dashboard.

### Error: `BLOB_READ_WRITE_TOKEN is required in production`
**Penyebab:** Upload file di production tanpa Vercel Blob.  
**Fix:** Dapatkan token dari Vercel Blob Store atau konfigurasi storage eksternal.

## Struktur Project

```
app/              Routes & API
components/       UI Components
lib/              Logic & utilities
  auth.ts         JWT auth (export SECRET untuk middleware)
  db.ts           Lowdb adapter + Supabase auto-detect
  db-supabase.ts  Supabase adapter + Lowdb Adapter interface
  redis.ts        Upstash Redis rate limiter
  storage.ts      File storage (Vercel Blob / local)
  supabase/       Supabase config & schema
middleware.ts     Next.js middleware (auth redirects & guards)
public/           Static assets
data/             Local database (gitignored, dev only)
```

## License

MIT
