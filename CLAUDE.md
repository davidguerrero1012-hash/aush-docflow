# AUSH DocFlow

## Project Overview
Multi-step intake form with OCR document processing, PDF generation, and admin dashboard.

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL, Auth, Storage)
- Tesseract.js v5 (client-side OCR)
- jsPDF + jspdf-autotable (PDF generation)
- Resend (email)
- Motion (Framer Motion v12+) for animations
- React Hook Form + Zod for form validation

## Build Commands
```
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Run linter
npx tsc --noEmit     # Type check
npx playwright test  # Run Playwright tests
```

## Architecture
- /app/form — Public multi-step form (no auth required)
- /app/admin — Admin dashboard (Supabase Auth required)
- /app/api — API routes (submit, upload-doc, generate-pdf, send-email)
- /components/form — Form step components
- /components/ocr — OCR-related components
- /components/admin — Admin dashboard components
- /lib — Utility libraries (supabase, encryption, ocr, pdf, email, schemas)
- /types — TypeScript interfaces
- /hooks — Custom React hooks

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ENCRYPTION_KEY (32-byte hex for AES-256-GCM)
- RESEND_API_KEY
- INTERNAL_API_SECRET
- NEXT_PUBLIC_MOCK_OCR (set to "true" for test mocking)

## Design System
- Primary: indigo-500 (#6366F1)
- Neutrals: zinc scale
- Font: Inter
- Inputs: h-11, rounded-lg
- Cards: rounded-xl, shadow-sm
- NO dark mode, NO gradient text, NO black backgrounds

## Key Decisions
- SSN encrypted with AES-256-GCM (Node.js crypto), never stored in localStorage
- File uploads go through API route (not direct to Supabase Storage)
- OCR uses self-hosted Tesseract WASM files from /public/tesseract/
- PDF/email are async via Next.js after() API
- Reference numbers use nanoid (non-sequential, non-enumerable)
