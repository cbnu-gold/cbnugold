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
See [`docs/DEPLOYMENT_CUTOVER_CHECKLIST.md`](docs/DEPLOYMENT_CUTOVER_CHECKLIST.md) for domain cutover and Vercel/Supabase verification.
See [`docs/ORG_SITE_PLATFORM_BLUEPRINT.md`](docs/ORG_SITE_PLATFORM_BLUEPRINT.md) for the reusable organization-site blueprint.

## Verification

```bash
npm run verify
npm run test:e2e
npm run check:ops -- https://your-deployment.example.com
```

Use `--allow-degraded` only when the Supabase connection outage is already known. Use `--deep --token=<HEALTHCHECK_TOKEN>` for table and storage diagnostics.
`test:e2e` checks public routes, mobile navigation, rejected copy, image loading, and horizontal overflow across mobile, tablet, and desktop Chromium viewports.

## Admin Operations

- `/admin` manages applicants, recruitment cycles, page content, activities, achievements, history, FAQ, media, admin profiles, and audit logs.
- Application files are stored in the private `applications` bucket and opened through short-lived signed URLs.
- Application notification email does not include applicant name, student ID, phone number, or file links; admins review details only in `/admin`.
- Public pages use `content_pages` for metadata and only render `published` CMS records, with static fallback content for safe deploys.
- CMS media accepts PNG, JPG, WebP, PDF, DOCX, and HWP files. SVG upload is intentionally blocked for public-bucket safety.
- `site_settings.value` controls organization type, brand statement, theme preset, logo URL, sharing image URL, homepage CTA, and contact channels.
- `home/hero` can use a CMS media URL for the first-screen key visual; if empty, the site sharing image is used.
- Open Graph and Twitter preview cards use `share_image_url` for consistent sharing.
- Theme presets are `gold`, `navy`, `green`, and `graphite`; 금은동 keeps the default `gold` tone.
- Public copy should stay factual: activity, schedule, support process, and verified outcomes. Do not add self-ranking claims or encyclopedia-style content.
- The application API requires a published open recruitment cycle before accepting submissions and blocks duplicate submissions by recruitment scope and student ID.
- `/api/health` exposes a shallow public check; deep DB/storage checks require `HEALTHCHECK_TOKEN`.
- `next.config.ts` applies baseline security headers. `src/proxy.ts` enforces `no-store` caching on admin surfaces in production/runtime checks.

## Project Structure

```
src/
  app/          - Pages and API routes
  components/   - UI primitives, layout, page sections
  data/         - Static content (Korean text, data)
  lib/          - Supabase, Resend, validation utilities
  types/        - TypeScript type definitions
```
