# CDN Panel

A file management and sharing dashboard with role-based access control, public share links, analytics, and API key management. Built with Next.js 16, TypeScript, and React 19.

## Features

- Upload, download, and manage files
- Folder & tagging system
- Starred / favorites
- Trash / recycle bin
- Public share links (with optional password & expiry)
- Role-based users (admin, editor, viewer)
- API Keys for external integrations
- Dashboard analytics & statistics
- Dark mode
- Redis-backed rate limiting for login
- Supabase PostgreSQL support for production

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** Custom CSS + Lucide icons
- **Database:** Lowdb (local dev) / Supabase PostgreSQL (production)
- **Storage:** Vercel Blob (production) / local filesystem (dev)
- **Auth:** JWT (jose) + bcrypt
- **Rate Limiting:** Upstash Redis

## Quick Start (Local Development)

```bash
# Clone & install
git clone <repo-url>
cd cdn
npm install

# Setup environment
cp .env.example .env
# Edit .env (minimum: JWT_SECRET)

# Run development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Login

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin`   | admin |

> **Warning:** Change the default password before production!

## Deploy to Vercel (Production)

### 1. Import Project
- Go to [vercel.com](https://vercel.com) → Add New Project
- Select the `RDTUTORIAL/cdn` repository

### 2. Environment Variables (Required)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Required** | Secret key for JWT tokens. Generate with: `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | **Required** | Vercel Blob token. [Get it here](https://vercel.com/dashboard/stores/blob) |
| `REDIS_URL` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis for login rate limiting. Without this, rate limiting is disabled |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional but **recommended** | Supabase project URL. Without this, data is stored in-memory (lost on redeploy) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key (required if using Supabase) |

### 3. Supabase Setup (Recommended for Production)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `lib/supabase/schema.sql` in the Supabase SQL Editor
3. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
4. After first deploy, access `POST /api/migrate` to migrate default data

### 4. Deploy

Click **Deploy** on Vercel. Every push to `main` will auto-deploy.

## Environment Variables

### `JWT_SECRET`
- **Required in production.** The app will crash on startup if missing
- Generate with: `openssl rand -hex 32`

### `BLOB_READ_WRITE_TOKEN`
- **Required in production.** Vercel's filesystem is read-only, so local file storage won't work
- Get it from Vercel Dashboard → Blob Stores

### `REDIS_URL` (Format: `redis://default:PASSWORD@HOST:PORT`)
- Optional. If not set, login rate limiting is disabled
- Get it from [Upstash Console](https://console.upstash.com)
- Alternative: use `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (REST API format)

### Supabase Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Anonymous key (for client-side, not currently used)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for server-side database operations)

## Database

### Development (Default)
**Lowdb** — JSON file at `data/db.json`. Auto-created on first run.

### Production (Recommended)
**Supabase PostgreSQL** — persistent, scalable, queryable with SQL.

If Supabase is not configured in production:
- Data is stored **in-memory** (RAM)
- Data is **lost** on every serverless cold start
- Suitable for demos/testing, but **not recommended** for production

## Security

- JWT tokens with environment variable secret
- bcrypt for password hashing
- Login rate limiting (5 attempts / 15 minutes) via Redis
- Path traversal guard on file storage
- Ownership checks on all CRUD endpoints
- HttpOnly + Secure cookies (production only)
- File passwords hashed with bcrypt

## Project Structure

```
app/              Routes & API
components/       UI Components
lib/              Logic & utilities
  auth.ts         JWT auth (exports SECRET for middleware)
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
