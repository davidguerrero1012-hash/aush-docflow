# AUSH DocFlow — Implementation Plan

**Status:** FINAL REVIEWED — Pending User Approval
**Project:** Multi-Step Intake Form with OCR & Document Processing
**Timeline:** 2 Days
**Stack:** Next.js 15 + TypeScript + Tailwind + shadcn/ui + Supabase + Tesseract.js

---

## Adversarial Review Changes Applied (Round 1 + Round 2)

### Round 1 Fixes:
1. **RLS policies now check `admin_users` membership** — not just `authenticated` role
2. **SSN encryption switched to application-level AES-256-GCM** via Node.js `crypto` — no pgcrypto RPC
3. **PDF generation switched to jsPDF + jspdf-autotable** — `@react-pdf/renderer` has native dep issues on Vercel serverless
4. **File uploads routed through API route** — no direct anon-to-storage (prevents abuse)
5. **Rate limiting + honeypot** added to submit endpoint
6. **Submission is atomic** — PDF/email decoupled as async follow-up
7. **PDF removed from OCR-supported uploads** — Tesseract.js only processes images (JPG, PNG)
8. **SSN excluded from localStorage** persistence
9. **`updated_at` trigger** added to schema
10. **Server-side auth checks** for admin routes via Supabase SSR middleware
11. **React Error Boundary** around OCR processor for crash recovery
12. **Dark mode cut** from scope — not in acceptance criteria, saves time
13. **File type stored as ref/separate state** — not in React Hook Form data (not serializable)

### Round 2 Fixes:
14. **Async PDF/email uses Next.js 15 `after()` API** — not fire-and-forget fetch (prevents Vercel runtime termination)
15. **Tesseract.js pinned to stable v5** — v7 does not exist, verified correct API surface
16. **`shouldUnregister: false`** in useForm config — prevents AnimatePresence from destroying registered field validation
17. **Sequence permissions granted explicitly** — `GRANT USAGE, SELECT ON SEQUENCE` to service_role
18. **API routes do not log request bodies** — prevents SSN exposure in Vercel logs
19. **Middleware matcher** configured to `/admin/:path*` only — avoids running on static assets
20. **Rate limiter note:** in-memory rate limit is defense-in-depth only (Vercel serverless is stateless) — honeypot + server-side validation are primary guards
21. **Resend domain:** use `onboarding@resend.dev` for demo, document DNS setup as post-deploy task
22. **jsPDF enhanced with `jspdf-autotable`** for structured sections + `splitTextToSize()` for text wrapping
23. **OCR field parsing is best-effort** — targets 3-5 common DL/passport formats, sets conservative confidence thresholds, documented as demo-quality
24. **Admin SSN shown on click only** — not loaded by default, separate API call with `Cache-Control: no-store`
25. **Signed URL generation in Server Component** — passes only signed URL to client, 1-hour expiry
26. **Preload Tesseract worker on Step 3** — reduces perceived latency on Step 4
27. **Browser back/forward handled** — `onbeforeunload` warning + URL-based step tracking (`/form?step=N`)
28. **Field length limits** — `additional_notes.max(2000)`, `annual_income >= 0` in Zod + DB CHECK constraints
29. **localStorage key namespaced** — `aush-docflow-form-v1`
30. **Admin dashboard loading.tsx** added for skeleton state
31. **Playwright OCR mock strategy** — env var `NEXT_PUBLIC_MOCK_OCR=true` swaps Tesseract for deterministic mock results in tests
32. **`framer-motion` verified for React 19** — use `motion` package (>=12.x) for compatibility

### Round 3 Fixes (Security Review):
33. **Magic byte validation on file uploads** — validate first 8-16 bytes against JPEG/PNG signatures, not just MIME type. Use `file-type` npm package.
34. **Internal API route auth** — `/api/generate-pdf` and `/api/send-email` validate `x-internal-secret` header against `INTERNAL_API_SECRET` env var, return 401 without it. Never `NEXT_PUBLIC_` prefixed.
35. **Content-Security-Policy + security headers** in `next.config.js` — `script-src 'self'`, `worker-src` for Tesseract WASM, `connect-src` for Supabase/Resend, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`
36. **Reference numbers are random, not sequential** — use `AUSH-{nanoid(12)}` instead of DB sequence to prevent enumeration
37. **camelCase/snake_case mapping utility** — `mapSubmissionFromDB()` and `mapSubmissionToDB()` in `lib/mappers.ts` to convert between TypeScript types and Supabase rows
38. **Self-host Tesseract WASM + traineddata** in `/public/tesseract/` — eliminates CDN dependency and supply chain risk for PII-handling app (~6MB)
39. **Origin header validation** on public API routes — reject requests from non-matching origins
40. **Request body size limit** — `export const maxDuration = 30` on submit route + stream-based size limiter on upload route
41. **Accessibility (WCAG 2.1 AA)** — focus management on step change, `aria-live` for OCR/validation, text labels on confidence badges (not color-only), `aria-describedby` for errors, `role="progressbar"` on stepper, keyboard-accessible viewer
42. **Orphaned file cleanup** — document as known limitation; admin can manually delete. Note: upload + submit could be combined into single FormData call to eliminate orphans entirely
43. **Admin brute-force protection** — document reliance on Supabase Auth built-in rate limiting (GoTrue)
44. **Zod validation for ocr_data** — add `ocrResultSchema` to validate OCR data structure before DB insertion
45. **`robots.txt` with `Disallow: /admin`** + `noindex` meta on admin pages
46. **Dynamic imports for client bundle** — jsPDF/jspdf-autotable server-only, react-dropzone lazy-loaded on Step 4, motion tree-shaken
47. **`export const maxDuration = 30`** on submit route for Vercel `after()` execution time
48. **Data retention note** — retained indefinitely, manual deletion by admin. CCPA/GDPR compliance documented as post-launch task

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   VERCEL                         │
│  ┌─────────────────────────────────────────────┐│
│  │            Next.js 15 App Router            ││
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ ││
│  │  │  /form   │  │ /admin   │  │   /api     │ ││
│  │  │ (public) │  │ (auth)   │  │ submit     │ ││
│  │  │ 6 steps  │  │ dashboard│  │ upload-doc │ ││
│  │  │ OCR      │  │ review   │  │ gen-pdf    │ ││
│  │  └──────────┘  └──────────┘  │ send-email │ ││
│  │                               └───────────┘ ││
│  └─────────────────────────────────────────────┘│
│                        │                         │
│  ┌─────────────────────▼───────────────────────┐│
│  │              SUPABASE                        ││
│  │  PostgreSQL         │ Storage │ Auth         ││
│  │  submissions table  │ docs    │ admin login  ││
│  │  admin_users table  │ pdfs    │              ││
│  └─────────────────────────────────────────────┘│
│                        │                         │
│  ┌─────────────────────▼───────────────────────┐│
│  │              RESEND (Email API)              ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
multi-step-form/
├── app/
│   ├── layout.tsx                    # Root layout: Inter font, metadata
│   ├── page.tsx                      # Landing → redirects to /form
│   ├── globals.css                   # Tailwind base + indigo theme variables
│   ├── form/
│   │   └── page.tsx                  # Multi-step form page (public)
│   ├── success/
│   │   └── page.tsx                  # Success: reference number + PDF download
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx              # Admin login
│   │   └── dashboard/
│   │       ├── layout.tsx            # Admin layout with nav + SERVER-SIDE auth guard
│   │       ├── loading.tsx           # Skeleton table while submissions load
│   │       ├── page.tsx              # Submissions list
│   │       └── [id]/
│   │           └── page.tsx          # Submission detail + doc viewer
│   └── api/
│       ├── submit/
│       │   └── route.ts             # Atomic: save form data + encrypt SSN → return ref#
│       ├── upload-doc/
│       │   └── route.ts             # Upload file to Supabase Storage (server-side, validates MIME + size)
│       ├── generate-pdf/
│       │   └── route.ts             # Async: generate PDF via jsPDF, upload to Storage
│       └── send-email/
│           └── route.ts             # Async: send confirmation email via Resend
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── form/
│   │   ├── form-shell.tsx           # FormProvider + step state + localStorage (excludes SSN)
│   │   ├── step-indicator.tsx       # Desktop: circles. Mobile: thin progress bar
│   │   ├── personal-info.tsx        # Step 1
│   │   ├── address-info.tsx         # Step 2
│   │   ├── employment-info.tsx      # Step 3
│   │   ├── document-upload.tsx      # Step 4: upload + OCR + auto-fill
│   │   ├── additional-info.tsx      # Step 5
│   │   ├── review-submit.tsx        # Step 6: summary + edit + submit
│   │   └── step-navigation.tsx      # Back/Next/Submit buttons (fixed bottom on mobile)
│   ├── ocr/
│   │   ├── ocr-processor.tsx        # Tesseract.js processing UI (wrapped in Error Boundary)
│   │   ├── document-viewer.tsx      # Zoomable document preview
│   │   ├── confidence-field.tsx     # Input with green/yellow/red confidence badge
│   │   └── ocr-error-boundary.tsx   # Catches Tesseract crashes → falls back to manual entry
│   ├── admin/
│   │   ├── submissions-table.tsx    # Sortable/filterable list
│   │   ├── submission-detail.tsx    # Full detail view + document viewer
│   │   └── admin-nav.tsx            # Sidebar navigation
│   └── shared/
│       └── honeypot-field.tsx       # Hidden spam prevention field
├── lib/
│   ├── supabase.ts                  # Browser client (anon key)
│   ├── supabase-admin.ts            # Service role client (server-only)
│   ├── supabase-middleware.ts       # SSR auth middleware for admin routes
│   ├── schemas.ts                   # Zod schemas per step + combined + ocrResultSchema
│   ├── encryption.ts                # AES-256-GCM encrypt/decrypt (Node.js crypto, server-only)
│   ├── mappers.ts                   # camelCase <-> snake_case mapping for Supabase rows
│   ├── ocr.ts                       # Tesseract.js v5 wrapper (loads from /public/tesseract/)
│   ├── pdf.ts                       # jsPDF + jspdf-autotable document template (server-only import)
│   ├── email.ts                     # Resend API helper
│   ├── rate-limit.ts               # In-memory rate limiter (defense-in-depth)
│   └── validate-file.ts            # Magic byte validation (file-type npm package)
├── middleware.ts                     # Next.js middleware: admin auth via supabase.auth.getUser() (NOT getSession). Matcher: /admin/:path*
├── types/
│   └── index.ts                     # All TypeScript interfaces
├── hooks/
│   ├── use-form-persistence.ts      # localStorage save/restore (EXCLUDES SSN)
│   └── use-ocr.ts                   # OCR processing state hook
├── test/
│   ├── form-flow.spec.ts
│   ├── validation.spec.ts
│   ├── ocr.spec.ts
│   ├── pdf.spec.ts
│   ├── admin.spec.ts
│   ├── mobile.spec.ts
│   └── fixtures/
│       └── test-license.png
├── public/
│   ├── tesseract/                   # Self-hosted Tesseract WASM + eng.traineddata (~6MB)
│   └── robots.txt                   # Disallow: /admin
├── next.config.js                   # Security headers (CSP, HSTS, nosniff, X-Frame-Options)
├── definition.md
├── CLAUDE.md
└── .planning/
    ├── ocr-intake-spec.md
    └── ocr-intake-plan.md
```

---

## Database Schema

```sql
-- Enable pgcrypto for gen_random_uuid() only (NOT for SSN encryption)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'flagged')),
  
  -- Step 1: Personal Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  ssn_last4_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted, base64 encoded
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Step 2: Address
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  mailing_same_as_residential BOOLEAN NOT NULL DEFAULT true,
  mailing_address JSONB,
  
  -- Step 3: Employment
  employer_name TEXT NOT NULL,
  occupation TEXT NOT NULL,
  annual_income NUMERIC NOT NULL,
  employment_status TEXT NOT NULL,
  
  -- Step 4: Document
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL,
  ocr_data JSONB,
  ocr_fields_edited JSONB DEFAULT '[]',
  
  -- Step 5: Additional
  insurance_provider TEXT,
  policy_number TEXT,
  dependents_count INTEGER DEFAULT 0,
  additional_notes TEXT,
  
  -- Admin
  admin_notes TEXT,
  pdf_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public: insert only (no select, no update, no delete)
CREATE POLICY "Public can insert submissions"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admin only: must be in admin_users table
CREATE POLICY "Admin can view all submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admin can update submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- No DELETE policy for anyone (data retention)

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read own profile"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- No sequence needed — reference numbers use nanoid(12) for non-enumerable IDs

-- DB-level constraints
ALTER TABLE submissions ADD CONSTRAINT chk_annual_income CHECK (annual_income >= 0);
ALTER TABLE submissions ADD CONSTRAINT chk_additional_notes_length CHECK (length(additional_notes) <= 2000);
```

### Storage Buckets (via service role — no direct anon access)
```sql
-- Private bucket for uploaded documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Private bucket for generated PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Only authenticated admin can read from storage
CREATE POLICY "Admin can read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('documents', 'pdfs')
    AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- No anon INSERT policy — uploads go through API route using service role
```

---

## Shared Types (types/index.ts)

```typescript
// Step data
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLast4: string;  // plaintext in form only, encrypted before storage
  phone: string;
  email: string;
}

export interface AddressInfo {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  mailingSameAsResidential: boolean;
  mailingAddress?: { street: string; city: string; state: string; zip: string };
}

export interface EmploymentInfo {
  employerName: string;
  occupation: string;
  annualIncome: number;
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
}

export interface DocumentUploadData {
  // File stored in useRef, NOT in form state (not serializable)
  documentType: 'drivers_license' | 'passport' | 'state_id';
  documentPath: string | null;  // Supabase storage path after upload
  ocrData: OCRResult | null;
}

export interface AdditionalInfo {
  insuranceProvider: string;
  policyNumber: string;
  dependentsCount: number;
  additionalNotes: string;
}

// OCR
export interface OCRField {
  fieldName: string;
  value: string;
  confidence: number;  // 0-100
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OCRResult {
  fields: OCRField[];
  rawText: string;
  processingTimeMs: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Combined form (what React Hook Form manages)
export interface IntakeFormData {
  personalInfo: PersonalInfo;
  addressInfo: AddressInfo;
  employmentInfo: EmploymentInfo;
  documentUpload: DocumentUploadData;
  additionalInfo: AdditionalInfo;
}

// Submission record (what's in Supabase)
export interface Submission {
  id: string;
  referenceNumber: string;
  status: 'new' | 'reviewed' | 'flagged';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLast4Encrypted: string;  // AES-256-GCM, base64
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  mailingSameAsResidential: boolean;
  mailingAddress: { street: string; city: string; state: string; zip: string } | null;
  employerName: string;
  occupation: string;
  annualIncome: number;
  employmentStatus: string;
  documentUrl: string;
  documentType: string;
  ocrData: OCRResult | null;
  ocrFieldsEdited: string[];
  insuranceProvider: string | null;
  policyNumber: string | null;
  dependentsCount: number;
  additionalNotes: string | null;
  adminNotes: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// API
export interface SubmitResponse {
  success: boolean;
  referenceNumber: string;
}
```

---

## Implementation Phases

### Phase A: Project Setup (Sequential)

**A1: Initialize Next.js 15**
```bash
npx create-next-app@latest multi-step-form --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```
- Acceptance: `npm run dev` starts on localhost:3000

**A2: Install Dependencies**
```bash
npm install react-hook-form @hookform/resolvers zod motion tesseract.js@^5 react-dropzone lucide-react @supabase/supabase-js @supabase/ssr jspdf jspdf-autotable resend nanoid file-type
```
- Acceptance: `npm ls` clean

**A3: Set Up shadcn/ui**
```bash
npx shadcn@latest init
npx shadcn@latest add button input label card form select textarea separator progress badge skeleton alert dialog dropdown-menu table drawer
```
- Configure indigo as primary in globals.css
- Acceptance: Components render with indigo accent

**A4: Supabase Setup**
- Create project via Supabase MCP
- Run migration with full schema above (tables, RLS, triggers, storage, sequence)
- Create admin user in Supabase Auth + insert into admin_users
- Acceptance: Tables exist, RLS active, admin can authenticate

**A5: GitHub Repo**
- Create `aush-docflow` repo
- Push initial setup
- Acceptance: Repo exists on GitHub

**A6: Project Docs**
- Create definition.md and CLAUDE.md in project root
- Acceptance: Files exist

**A7: Hooks**
- Configure hooks in .claude/settings.json
- Acceptance: Hooks fire correctly

---

### Phase B: Core Infrastructure (Parallel)

**B1: lib/supabase.ts** — Browser client (anon key from env)
**B2: lib/supabase-admin.ts** — Service role client (server-only, never imported in client components)
**B3: types/index.ts** — All interfaces above
**B4: lib/schemas.ts** — Zod schemas:
  - `personalInfoSchema` — name required, DOB valid date, SSN exactly 4 digits, phone/email valid
  - `addressInfoSchema` — all required, conditional mailing address when toggle is off
  - `employmentInfoSchema` — employer, occupation required, income positive number, status enum
  - `documentUploadSchema` — documentType required, documentPath required (after upload)
  - `additionalInfoSchema` — all optional, dependentsCount >= 0
**B5: lib/encryption.ts** — AES-256-GCM via Node.js `crypto`:
  - `encryptSSN(plaintext: string): string` — returns base64 `iv:encrypted:authTag`
  - `decryptSSN(ciphertext: string): string` — decrypts using ENCRYPTION_KEY env var
  - Key: 32-byte random key stored in Vercel env vars
**B6: app/layout.tsx** — Inter font via next/font, metadata
**B7: middleware.ts** — Supabase SSR middleware using `supabase.auth.getUser()` (NOT `getSession()`). Matcher config:
```typescript
export const config = { matcher: ['/admin/:path*'] }
```
**B8: lib/rate-limit.ts** — In-memory rate limiter (defense-in-depth only — Vercel serverless is stateless, so this resets per cold start. Honeypot + server-side Zod validation are primary guards.)
**B9: lib/mappers.ts** — `mapSubmissionFromDB(row): Submission` and `mapSubmissionToDB(data): DBRow` for camelCase/snake_case conversion between TypeScript interfaces and Supabase rows
**B10: lib/validate-file.ts** — Magic byte validation using `file-type` package. Exports `validateImageFile(buffer): { valid: boolean, detectedType: string }`
**B11: next.config.js** — Security headers:
  - `Content-Security-Policy`: `script-src 'self'; worker-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' blob: data:`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
**B12: public/robots.txt** — `Disallow: /admin`
**B13: public/tesseract/** — Self-hosted `tesseract-core-simd.wasm`, `tesseract-core-lstm-simd.wasm`, `eng.traineddata` copied from node_modules or Tesseract.js CDN

- Acceptance: `npx tsc --noEmit` passes, security headers visible in response, Tesseract loads from /public/

---

### Phase C: Form UI — Steps 1-3 (Sequential then Parallel)

**C1: components/form/form-shell.tsx**
- React Hook Form `FormProvider` wrapping all steps
- **`useForm({ shouldUnregister: false })`** — critical: prevents AnimatePresence from destroying field registrations on unmount
- Step state (currentStep, direction for animation)
- `AnimatePresence` with direction-aware Motion variants (using `motion` package v12+)
- localStorage persistence via `useFormPersistence` hook (**excludes ssnLast4**, key: `aush-docflow-form-v1`)
- URL-based step tracking (`/form?step=N`) + `onbeforeunload` warning for unsaved data
- Clear localStorage on successful submission
- Acceptance: Shell renders, steps navigate, data persists across refresh (except SSN), browser back goes to previous step

**C2: components/form/step-indicator.tsx**
- Desktop (sm+): Numbered circles with connecting lines, checkmarks on completed, indigo active ring
- Mobile (<sm): Thin progress bar + "Step X of 6" text
- Acceptance: Correct state on both viewports

**C3: components/form/step-navigation.tsx**
- Back + Next buttons (Step 1: Next only, Middle: Back + Next, Final: Back + Submit)
- Fixed to bottom on mobile with `backdrop-blur-xl` + border-top
- Relative position on desktop
- Loading spinner on Submit
- Acceptance: Correct buttons per step, fixed on mobile

**C4: components/form/personal-info.tsx** (Parallel)
- Fields: first name, last name, DOB (date input), SSN last 4 (masked, maxLength 4, inputMode numeric), phone (tel), email
- Acceptance: All validate, SSN masked as dots

**C5: components/form/address-info.tsx** (Parallel)
- Fields: street, city, state (select with US states), zip (5 digits)
- Toggle: "Mailing address same as residential" — conditional fields animate in/out
- Acceptance: Toggle works, conditional fields validate when visible

**C6: components/form/employment-info.tsx** (Parallel)
- Fields: employer, occupation, annual income (formatted with commas), employment status (select)
- Acceptance: Income formats, status validates

**C7: app/form/page.tsx**
- Wire form shell + stepper + steps 1-3 + step navigation
- Acceptance: Full 3-step navigation with validation

---

### Phase D: OCR Feature (Depends on C)

**D1: lib/ocr.ts**
- Tesseract.js v5 wrapper: `processDocument(imageFile: File, docType: string): Promise<OCRResult>`
- Dynamic import of Tesseract worker (lazy-loaded)
- **Self-hosted WASM + traineddata from `/public/tesseract/`** — no CDN dependency, eliminates supply chain risk
- **Preload worker on Step 3** (one step before upload) via `useEffect` — reduces perceived latency
- Parse raw OCR text into structured fields based on document type
- **Best-effort parsing targeting 3-5 common formats** — not all 50 state DL formats
- DL: name, DOB, address, license number, expiration (regex patterns for CA, TX, NY, FL, IL formats)
- Passport: name, DOB, passport number, expiration (more standardized format, higher success rate)
- State ID: same patterns as DL
- Conservative confidence: anything below 90% shows yellow, below 70% shows red
- 15-second timeout — if exceeded, return partial results or empty with "timeout" flag
- **`NEXT_PUBLIC_MOCK_OCR=true` env var** — when set, returns deterministic mock data (for Playwright tests)
- Acceptance: Processes test image, returns structured fields. Even 2/5 fields auto-filled is a win.

**D2: hooks/use-ocr.ts**
- States: idle | loading (progress %) | success (OCRResult) | error (message) | timeout
- Wraps lib/ocr.ts
- Acceptance: All states handled

**D3: components/ocr/confidence-field.tsx**
- Input with right-side badge: green checkmark (>=95%), yellow warning (70-94%), red X (<70%)
- When user edits: badge changes to blue pencil (manually verified)
- Acceptance: Correct colors, edit tracking

**D4: components/ocr/document-viewer.tsx**
- Zoomable image preview (CSS transform-based, pinch on mobile, scroll on desktop)
- Rotate button (90 degree increments)
- Acceptance: Image displays, zoom + rotate work

**D5: components/ocr/ocr-processor.tsx**
- Processing UI: document thumbnail + animated scan line (CSS keyframes) + progress % + stage text
- Skeleton loaders for form fields while processing
- "For best results, use a well-lit, flat photo" tip
- Acceptance: Animation plays, transitions to results

**D6: components/ocr/ocr-error-boundary.tsx**
- React Error Boundary wrapping OCR processor
- Fallback: "OCR processing failed. Please fill in the fields manually."
- Acceptance: Catches crash, shows fallback

**D7: components/form/document-upload.tsx** — Step 4
- Drag-and-drop zone (react-dropzone) + document type selector
- Accepted formats: **JPG, PNG only** (no PDF — Tesseract.js limitation)
- Max size: 10MB (client + server validation)
- File stored in `useRef`, not in form state
- Upload via `/api/upload-doc` (service role, server-side MIME validation)
- After upload → OCR processing → auto-fill fields
- Desktop: side-by-side (document left 45%, fields right 55%)
- Mobile: stacked (collapsible document preview, fields below)
- Acceptance: Full upload → OCR → auto-fill flow, fallback to manual on failure

---

### Phase E: Steps 5-6 + Submission (Depends on C + D)

**E1: components/form/additional-info.tsx** — Step 5
- Fields: insurance provider, policy number, dependents count (number input), additional notes (textarea)
- All optional except dependents (default 0)
- Acceptance: Renders, validates

**E2: components/form/review-submit.tsx** — Step 6
- Summary cards for each section (Personal, Address, Employment, Document, Additional)
- Edit button per section → sets currentStep back to that section
- Document thumbnail with OCR confidence summary ("5 of 6 fields auto-verified")
- Honeypot hidden field (spam prevention)
- Submit button
- Acceptance: All data correct, edit links work, honeypot hidden

**E3: app/api/upload-doc/route.ts**
- Stream-based request body size limiter (reject >10MB before full parse)
- Receives file via FormData
- Validates MIME type (image/jpeg, image/png) AND **magic bytes** via `file-type` package (first 8-16 bytes: `FF D8 FF` for JPEG, `89 50 4E 47` for PNG)
- Validates `Origin` header against deployment URL
- Generates UUID-based path: `documents/{uuid}.{ext}`
- Uploads to Supabase Storage using service role client
- Returns storage path
- Acceptance: File in storage, rejects spoofed MIME types, rejects wrong origins, rejects oversized bodies

**E4: app/api/submit/route.ts** — ATOMIC
- Rate limit check (5/min per IP)
- Honeypot check (reject if filled)
- Validate all form data server-side with Zod
- Encrypt SSN last 4 with AES-256-GCM
- Generate reference number: `AUSH-{YYYY}-{sequence}` (6-digit padded from DB sequence)
- Insert into submissions table
- Generate reference number: `AUSH-{nanoid(12)}` — cryptographically random, non-enumerable
- Validate `Origin` header against deployment URL
- Validate `ocr_data` with `ocrResultSchema` Zod schema before insertion
- Return `{ success: true, referenceNumber }` immediately
- **`export const maxDuration = 30`** — extends Vercel function lifetime for `after()` execution
- **Use Next.js 15 `after()` API** to run PDF generation + email sending after response is sent
- Internal PDF/email calls validate `x-internal-secret` header against `INTERNAL_API_SECRET` env var (never `NEXT_PUBLIC_` prefixed), return 401 without it
- **API route must NOT log request body** — SSN in plaintext in the request
- Acceptance: Data in Supabase, SSN encrypted, reference number random + unique, returns fast, PDF/email queued reliably

**E5: Wire submission**
- Connect submit button → upload doc API → submit API
- Handle loading/error/success states
- On success → redirect to /success?ref={referenceNumber}
- Clear localStorage on success
- Acceptance: End-to-end works

---

### Phase F: PDF + Email (Parallel Track 1, async from submission)

**F1: lib/pdf.ts**
- jsPDF + **jspdf-autotable** for structured section tables
- Formal layout: AUSH DocFlow header with indigo accent, reference number, submission date
- Sections as auto-tables: Personal Info, Address, Employment, Document Info, Additional Details
- **`splitTextToSize()`** for long text fields (notes, address) — prevents text overflow
- **Explicit page break logic** — check remaining page height before each section
- Font: Helvetica (jsPDF built-in) — Inter not available in jsPDF
- Acceptance: PDF looks formal, handles long text, multi-page if needed

**F2: app/api/generate-pdf/route.ts**
- Receives submission ID
- Fetches data from Supabase (service role)
- Generates PDF via lib/pdf.ts
- Uploads to 'pdfs' bucket
- Updates submission.pdf_url
- Returns signed URL
- Acceptance: PDF in storage, submission updated

**F3: lib/email.ts**
- Resend API wrapper
- HTML template: AUSH branding, confirmation message, reference number
- PDF attachment support
- Acceptance: Sends email

**F4: app/api/send-email/route.ts**
- Receives submission ID
- Fetches submission + PDF
- Sends confirmation email with PDF attached
- If email fails: logs error, submission still valid
- Acceptance: Email sent (or gracefully failed)

**F5: app/success/page.tsx**
- Reads reference number from URL params, **validates it exists via server-side call** (prevents spoofed URLs)
- Displays: checkmark animation, reference number, "Confirmation email sent" message
- PDF download button (polls for PDF readiness with **30-second max timeout**, then falls back to "PDF will be emailed to you")
- "What happens next" info
- Acceptance: Shows reference number (validated), PDF downloads when ready or graceful fallback

---

### Phase G: Admin Dashboard (Parallel Track 2)

**G1: Supabase Auth admin setup**
- Admin user created in Auth
- Inserted into admin_users table
- Acceptance: Admin can sign in via Supabase Auth

**G2: app/admin/login/page.tsx**
- Email + password form with Zod validation
- Supabase Auth `signInWithPassword`
- Redirect to /admin/dashboard on success
- Error handling for wrong credentials
- Acceptance: Login works

**G3: app/admin/dashboard/layout.tsx**
- Server-side auth check via Supabase SSR (reads session from cookies)
- If no session or not in admin_users → redirect to /admin/login
- Sidebar: Submissions link, Logout button
- Acceptance: Unauthenticated users cannot access

**G4: components/admin/submissions-table.tsx**
- Table columns: Reference#, Name, Email, Date, Status
- Status badges: New (blue), Reviewed (green), Flagged (red)
- Search input (filters by name or email)
- Status filter dropdown
- Click row → navigate to detail
- Acceptance: Renders, filters, sorts

**G5: app/admin/dashboard/page.tsx**
- Fetch submissions from Supabase with pagination (20 per page)
- Wire submissions table
- Acceptance: List loads with data

**G6: components/admin/submission-detail.tsx**
- All form data in organized sections
- Document viewer (signed URL from Supabase Storage)
- OCR data with confidence indicators
- **SSN last 4 shown on click only** ("Show SSN" button) — separate server action with `Cache-Control: no-store`, not loaded by default
- Document viewer uses **signed URL generated in Server Component** (1-hour expiry) — only signed URL passed to client, never raw storage path
- Status dropdown (New/Reviewed/Flagged) → saves on change
- Admin notes textarea → saves on blur
- Acceptance: All data visible, SSN only on explicit click, status + notes persist

**G7: app/admin/dashboard/[id]/page.tsx**
- Server component: fetch submission by ID (with SSN decryption)
- Wire detail component
- Acceptance: Detail page loads

---

### Phase H: Polish + Testing (Final)

**H1: Framer Motion transitions**
- Direction-aware step transitions (slide right on Next, left on Back)
- Staggered field entry (50ms delay between fields)
- Success checkmark SVG path animation
- Button active:scale-[0.98]
- Acceptance: Smooth, directional, under 250ms

**H2: Mobile responsiveness**
- Test at 375px (iPhone SE), 428px (iPhone 14), 768px (iPad), 1024px, 1440px
- Fixed bottom nav with backdrop blur on mobile
- Stacked layouts on mobile, side-by-side on desktop (OCR step)
- 44px touch targets, appropriate inputMode attributes
- Acceptance: No overflow or cut-off at any viewport

**H3: Accessibility (WCAG 2.1 AA)**
- Focus first input when step changes (`useEffect` with `ref.focus()`)
- `aria-live="polite"` region for OCR processing status + validation error announcements
- Confidence badges have **text labels** alongside colors (not color-only — WCAG 1.4.1)
- `aria-describedby` linking error messages to their input fields
- `role="progressbar"` with `aria-valuenow` on step indicator
- Keyboard-accessible document viewer (arrow keys for pan, +/- for zoom, R for rotate)
- All interactive elements reachable via Tab key
- Acceptance: navigable via keyboard only, screen reader announces step changes and errors

**H4: Loading + Error + Empty states**
- Loading: skeleton screens in form shell, spinner on buttons
- Error: inline field errors (red, 13px), toast for API errors
- Empty: admin empty state ("No submissions yet")
- OCR timeout: "Processing is taking longer than expected" with skip option
- Acceptance: All states have visual treatment

**H5: Playwright tests**
- `form-flow.spec.ts`: Fill all 6 steps → submit → verify success page + reference number
- `validation.spec.ts`: Empty fields → errors. Invalid email → error. Wrong file type → rejected
- `ocr.spec.ts`: Upload test image → verify processing indicator → verify fields populate (mock OCR in test for speed)
- `pdf.spec.ts`: Submit → verify PDF download link appears on success page
- `admin.spec.ts`: Login → view list → click submission → verify detail → update status
- `mobile.spec.ts`: 375px viewport → complete form flow → verify fixed bottom nav
- Acceptance: All 6 test files pass

**H6: Deploy to Vercel**
- Connect GitHub repo
- Set all env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, RESEND_API_KEY, INTERNAL_API_SECRET)
- Verify production build
- Acceptance: Live on Vercel

**H7: Final verification**
- `npm run build` — clean
- `npm run lint` — clean
- `npx tsc --noEmit` — clean
- `npx playwright test` — all pass
- Chrome DevTools: zero console errors on each step
- Acceptance: Ship-ready

---

## Design System

| Element | Value |
|---------|-------|
| Font | Inter (next/font/google) |
| Primary | Indigo 500 (#6366F1) |
| Neutrals | Zinc scale (50-950) |
| Background | zinc-50 (light) |
| Surface | white (light) |
| Border radius | rounded-lg (8px) inputs, rounded-xl (12px) cards |
| Shadows | shadow-sm on cards, none on inputs |
| Input height | h-11 (44px) mobile-first |
| Max form width | max-w-2xl (672px) centered |
| Step transitions | 200ms, ease [0.25, 0.1, 0.25, 1], direction-aware |
| Icons | Lucide React, stroke-width 1.75 |
| Headings | tracking-tight, font-semibold |
| Focus ring | ring-2 ring-indigo-500/20 |
| Error | text-red-500, border-red-500 |
| Success | text-emerald-500 |
| Warning | text-amber-500 |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tesseract.js slow on mobile (5-15s) | Poor UX | Progress bar, 15s timeout, skip option, preload on Step 3, "well-lit photo" tips |
| Tesseract.js crash on low-memory device | Form dies | Error Boundary → falls back to manual entry |
| OCR accuracy on varied DL formats | Low auto-fill rate | Best-effort on 3-5 common formats, conservative confidence thresholds, manual fallback is primary UX |
| jsPDF output quality | Ugly PDF | jspdf-autotable for structure, splitTextToSize for wrapping, page break logic, Helvetica font |
| Vercel function timeout (10s default) | Submit fails | Atomic submit (fast), PDF/email via `after()` API |
| Vercel terminates async work | No PDF/email | `after()` API keeps function alive post-response |
| Resend rate limit (100/day free) | No emails | Submission still saves, PDF still downloadable |
| Resend domain verification (48h DNS) | Emails in spam | Use `onboarding@resend.dev` for demo, document DNS setup |
| In-memory rate limiter resets on cold start | Weak protection | Defense-in-depth only; honeypot + Zod validation are primary |
| Reference number enumeration | Info disclosure | nanoid(12) — cryptographically random, non-enumerable |
| Spoofed file upload (MIME bypass) | Stored XSS | Magic byte validation via file-type + nosniff header |
| Tesseract CDN compromise | Supply chain attack | Self-hosted WASM + traineddata in /public/ |
| XSS exfiltrating PII | Data breach | CSP headers restrict script-src, connect-src |
| Orphaned files in storage | Wasted storage | Documented limitation; admin can manually delete |
| Admin brute-force | Account takeover | Supabase Auth GoTrue built-in rate limiting |
| Vercel after() timeout | No PDF/email | maxDuration=30 on submit route |
| camelCase/snake_case mismatch | Silent runtime bugs | Explicit mapper functions in lib/mappers.ts |
| SSN in request body (plaintext over HTTPS) | Log exposure | API route does not log body, Vercel request logging reviewed |
| Internal API routes exposed | Unauthorized PDF/email trigger | x-internal-secret header validation, 401 without it |
| 2-day timeline | Incomplete | Core flow → Admin → PDF/Email priority order |

---

## Known Limitations (Accepted)

1. **No PDF upload for OCR** — Tesseract.js only processes images. Users must upload JPG/PNG.
2. **No document content validation** — We don't detect if the uploaded image is actually an ID vs a random photo. Out of scope.
3. **No dark mode** — Cut to save time. Not in acceptance criteria.
4. **Upload progress** — Indeterminate spinner, not percentage-based progress bar. react-dropzone + Supabase client don't provide byte-level progress easily.
5. **OCR accuracy** — Phone camera photos will have mixed results. Targets 3-5 common DL/passport formats. The app is fully usable with manual entry as fallback. Even 2/5 fields auto-filled is a positive demo.
6. **Resend emails** — Demo uses `onboarding@resend.dev` sender. Production requires DNS verification (SPF, DKIM).
7. **PDF font** — Uses Helvetica (jsPDF built-in), not Inter. Acceptable for formal documents.
8. **Rate limiting** — In-memory only, resets on Vercel cold starts. Acceptable for demo; production would use Redis/Upstash.
9. **Orphaned storage files** — If upload succeeds but submission fails/is abandoned, file remains in storage. No auto-cleanup; admin can manually delete.
10. **Data retention** — Submissions retained indefinitely. Manual deletion by admin. CCPA/GDPR compliance is a post-launch task.
11. **No monitoring/alerting** — No Sentry or error tracking. Errors visible in Vercel logs only. Production would add observability.
