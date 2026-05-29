# 금은동 (CBNU GOLD)

충북대학교 금융권 취업 동아리 금은동 공식 웹사이트

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Email:** Resend
- **Deploy:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.local` and fill in your Supabase + Resend credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL="금은동 시스템 <no-reply@your-domain.com>"
ADMIN_EMAILS=cbnu.gold@gmail.com
HEALTHCHECK_TOKEN=
NEXT_PUBLIC_SITE_URL=https://cbnugold.com
```

## Database Setup

Run `supabase-schema.sql` in the Supabase SQL Editor to create CMS, recruitment, applicant, admin, audit, RLS policies, and storage buckets.

Required storage buckets created by the schema:

- `applications` private bucket for submitted application files
- `cms-media` public bucket for CMS-managed media assets

Admin accounts must exist in both Supabase Auth and the `admin_profiles` table.
See [`docs/ADMIN_CMS_RUNBOOK.md`](docs/ADMIN_CMS_RUNBOOK.md) for the operating checklist.

## Verification

```bash
npm run verify
npm run check:ops -- https://your-deployment.example.com
```

Use `--allow-degraded` only when the Supabase connection outage is already known. Use `--deep --token=<HEALTHCHECK_TOKEN>` for table and storage diagnostics.

## Admin Operations

- `/admin` manages applicants, recruitment cycles, page content, activities, achievements, history, FAQ, media, admin profiles, and audit logs.
- Application files are stored in the private `applications` bucket and opened through short-lived signed URLs.
- Public pages use `content_pages` for metadata and only render `published` CMS records, with static fallback content for safe deploys.
- CMS media accepts PNG, JPG, WebP, and PDF files. SVG upload is intentionally blocked for public-bucket safety.
- The application API requires a published open recruitment cycle before accepting submissions.
- `/api/health` exposes a shallow public check; deep DB/storage checks require `HEALTHCHECK_TOKEN`.

## Project Structure

```
src/
  app/          - Pages and API routes
  components/   - UI primitives, layout, page sections
  data/         - Static content (Korean text, data)
  lib/          - Supabase, Resend, validation utilities
  types/        - TypeScript type definitions
```
