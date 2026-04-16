# AUSH DocFlow — Multi-Step Intake Form with OCR

## What is the end product?
A mobile-first, public-facing multi-step intake form (tax/insurance style) where users fill out personal, address, employment, and insurance information across 6 steps. Users upload identification documents (driver's license, passport, state ID) which are processed via OCR to auto-populate form fields. On completion, a formal PDF summary is generated and emailed to the user. All data is saved to Supabase with encryption on sensitive fields. An admin dashboard allows a human reviewer to view, review, and manage submissions.

## Who is the user?
**Primary:** Individuals completing an intake form — likely in a waiting room on their phone, at home on a laptop, or at a kiosk. They need a fast, clear, mobile-friendly flow.

**Secondary:** Admin/reviewer (David) who logs in to view submissions, review OCR accuracy, flag issues, and manage the pipeline.

## Core Features

### Public Intake Form (6 Steps)
1. **Personal Info** — First name, last name, DOB, SSN (last 4 digits), phone, email
2. **Address & Contact** — Street address, city, state, zip, mailing vs residential toggle
3. **Employment Info** — Employer name, occupation, annual income, employment status
4. **Document Upload + OCR** — Upload ID document (driver's license, passport, state ID), OCR processes and extracts data, auto-populates fields with confidence indicators (green/yellow/red)
5. **Additional Details** — Insurance provider, policy number, dependents count, additional notes
6. **Review & Submit** — Full summary of all data, edit capability per section, PDF preview, submit

### Document Processing
- File upload to Supabase Storage (drag-and-drop + tap to browse)
- Supported formats: PDF, JPG, PNG (max 10MB)
- Supported document types: Driver's license, passport, state ID
- OCR via Tesseract.js (client-side processing)
- Auto-populate: name, DOB, address, ID number, expiration date from OCR results
- Confidence color coding: green (>95%), yellow (70-95%), red (<70%)
- User can correct any OCR-extracted field before submission
- Side-by-side document viewer + extracted fields on desktop
- Stacked layout with collapsible document preview on mobile

### PDF Generation
- Formal, professional PDF summary of all submitted data
- Includes: all form fields organized by section, submission timestamp, document thumbnail
- Generated server-side
- Available for download on success screen
- Emailed to user's provided email address

### Admin Dashboard
- Supabase Auth login (email/password) for admin
- View all submissions with status badges (New, Reviewed, Flagged)
- Detail view: all form data + uploaded document + OCR confidence scores
- Mark submissions as reviewed, flag for follow-up, add internal notes
- Search/filter submissions by name, date, status

### Security
- SSN (last 4) encrypted at rest in Supabase (pgcrypto or application-level encryption)
- All sensitive fields transmitted over HTTPS
- RLS on all tables — admin sees all, public has insert-only
- File uploads stored in private Supabase Storage bucket (signed URLs for admin access)
- No auth required for form submission (public intake)

### Email Confirmation
- Sent on successful submission
- Includes: confirmation message, submission reference number, PDF attachment
- Via Supabase Edge Function + Resend (or similar email service)

## Tech Stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **OCR:** Tesseract.js (client-side)
- **PDF Generation:** @react-pdf/renderer or jsPDF
- **Email:** Resend API via Supabase Edge Function
- **Form State:** React Hook Form + Zod (per-step validation)
- **Animations:** Framer Motion (direction-aware step transitions)
- **Deployment:** Vercel (auto-deploy from GitHub)
- **Testing:** Playwright CLI

## Branding
- **App Name:** AUSH DocFlow
- **Color Palette:** Indigo accent (#6366F1) with zinc neutrals — NO black backgrounds, NO gradient text
- **Font:** Inter (via next/font)
- **Design Language:** Premium, clean, mobile-first. Modeled after Linear/Stripe/Vercel. Generous whitespace, subtle shadows, 8px border radius.

## Acceptance Criteria
- [ ] Full 6-step flow works end-to-end on mobile and desktop
- [ ] Per-step validation catches bad input with clear error messages
- [ ] Document upload works (drag-and-drop on desktop, tap on mobile)
- [ ] OCR processes document and auto-populates fields with confidence indicators
- [ ] User can correct OCR-extracted fields before submission
- [ ] Review page shows all data with edit capability
- [ ] Formal PDF generates correctly with all submitted data
- [ ] PDF is emailed to user on submission
- [ ] All data saved to Supabase with SSN encrypted
- [ ] Admin can log in and view/review/flag submissions
- [ ] RLS enforced: public = insert only, admin = full access
- [ ] Playwright tests cover full flow, OCR auto-fill, and PDF download
- [ ] Deployed to Vercel, connected to GitHub repo
- [ ] Mobile-first responsive design, works on all screen sizes
- [ ] No "vibe coded" aesthetics — production-grade UI quality

## Constraints
- Timeline: 2 days
- OCR accuracy depends on document quality — architecture must handle low confidence gracefully
- Tesseract.js runs client-side — large documents may be slow on older phones
- Email delivery requires Resend API key (free tier: 100 emails/day)

## Edge Cases
- User uploads a blurry or rotated document — OCR returns low confidence, user must manually fill fields
- User uploads wrong document type (not an ID) — show helpful error, allow re-upload
- User closes browser mid-form — localStorage persistence to restore progress
- User uploads file exceeding size limit — client-side validation before upload
- OCR extracts nothing useful — all fields show red confidence, user fills manually
- Email delivery fails — submission still saves, PDF still available for download
- Admin reviews submission while user is still filling form — no conflict (insert-only for public)
- Mobile user on slow connection — upload progress indicator, graceful timeout handling
