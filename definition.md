# AUSH DocFlow

## App Name
AUSH DocFlow

## What It Does
Multi-step intake form with OCR document processing, PDF generation, email confirmation, and admin dashboard. Designed for client onboarding workflows where users submit personal information, upload identification documents, and receive automated confirmations.

## Tech Stack
- **Framework:** Next.js 15 (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL, Auth, Storage)
- **OCR:** Tesseract.js v5 (client-side, self-hosted WASM)
- **PDF Generation:** jsPDF + jspdf-autotable
- **Email:** Resend
- **Animations:** Motion (Framer Motion v12+)
- **Form Handling:** React Hook Form + Zod
- **Deployment:** Vercel

## Core Features

### 1. Six-Step Intake Form (`/form`)
- **Step 1 — Personal Info:** First name, last name, email, phone, SSN (masked + encrypted)
- **Step 2 — Employment:** Employment status, employer name, job title, annual income (conditional fields)
- **Step 3 — Additional Details:** Additional notes, terms & conditions checkbox
- **Step 4 — Document Upload:** Drag-and-drop upload (JPG/PNG), client-side OCR with Tesseract.js, auto-fill fields from scanned ID
- **Step 5 — Review:** Full summary of all entered data with edit links back to each step
- **Step 6 — Confirmation:** Reference number, PDF download, email confirmation status

### 2. Document Upload with OCR
- Client-side OCR using Tesseract.js v5 with self-hosted WASM files
- Targets 3-5 common driver's license and passport formats
- Confidence scoring with color-coded badges
- Fallback to manual entry on OCR failure or low confidence
- Error boundary for crash recovery

### 3. PDF Generation
- Server-side PDF generation with jsPDF + jspdf-autotable
- Formal document layout with structured sections
- Generated asynchronously via Next.js `after()` API
- Stored in Supabase Storage, downloadable by user and admin

### 4. Email Confirmation
- Sent via Resend after successful submission
- Includes reference number and submission summary
- Async (non-blocking to the user)

### 5. Admin Dashboard (`/admin`)
- Protected by Supabase Auth (admin_users table)
- List all submissions with status filters and search
- View individual submissions with document preview (signed URLs)
- SSN revealed on click only (separate API call, no caching)
- Update submission status (pending, reviewed, approved, rejected)

## Security
- SSN encrypted with AES-256-GCM (Node.js crypto), never stored in localStorage
- File uploads validated with magic byte detection (file-type package)
- Row Level Security (RLS) on all Supabase tables
- Content Security Policy and security headers in next.config.js
- Internal API routes protected with x-internal-secret header
- Origin header validation on public API routes
- Reference numbers use nanoid (non-sequential, non-enumerable)
- Admin authentication via Supabase Auth with SSR middleware

## Acceptance Criteria
1. User can complete all 6 form steps with validation on each step
2. Form data persists across browser refresh (except SSN) via namespaced localStorage
3. Browser back/forward navigates between steps correctly
4. Document upload accepts JPG/PNG, rejects other formats
5. OCR processes uploaded image and auto-fills fields with confidence scores
6. OCR failure gracefully falls back to manual entry
7. Submission stores data in Supabase with encrypted SSN
8. PDF is generated and stored in Supabase Storage
9. Email confirmation is sent via Resend
10. Reference number is displayed on confirmation step and is non-enumerable
11. Admin can log in and view all submissions
12. Admin can filter submissions by status and search by name/email
13. Admin can view uploaded documents via signed URLs
14. Admin can reveal SSN on demand (separate API call)
15. Admin can update submission status
16. All API routes validate input with Zod
17. `npm run build` passes with zero errors
18. `npx tsc --noEmit` passes with zero errors
19. Playwright tests cover the golden path and OCR mock flow
20. WCAG 2.1 AA accessibility: focus management, aria-live regions, keyboard navigation
