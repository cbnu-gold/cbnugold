# 금은동 (CBNU GOLD)

충북대학교 금융권 취업 동아리 금은동 공식 웹사이트

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4 + Framer Motion
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
ADMIN_EMAILS=cbnu.gold@gmail.com
NEXT_PUBLIC_SITE_URL=https://cbnugold.com
```

## Database Setup

Run `supabase-schema.sql` in the Supabase SQL Editor to create CMS, recruitment, applicant, admin, audit, and RLS policies.

Required storage buckets:

- `applications` private bucket for submitted application files
- `cms-media` public bucket for CMS-managed media assets

Admin accounts must exist in both Supabase Auth and the `admin_profiles` table.
See [`docs/ADMIN_CMS_RUNBOOK.md`](docs/ADMIN_CMS_RUNBOOK.md) for the operating checklist.

## Admin Operations

- `/admin` manages applicants, recruitment cycles, page content, activities, achievements, history, FAQ, media, admin profiles, and audit logs.
- Application files are stored in the private `applications` bucket and opened through short-lived signed URLs.
- Public pages use `content_pages` for metadata and only render `published` CMS records, with static fallback content for safe deploys.
- The application API requires a published open recruitment cycle before accepting submissions.

## Project Structure

```
src/
  app/          - Pages and API routes
  components/   - UI primitives, layout, page sections
  data/         - Static content (Korean text, data)
  lib/          - Supabase, Resend, validation utilities
  types/        - TypeScript type definitions
```
