# SherwinMail — Build Pipeline

## Stage 1: Data Foundation

- [ ] Set up global state management — Extract app state from `page.tsx` into a React Context or Zustand store
- [ ] Initialize IndexedDB schema — Create DB for emails, drafts, user profile, and template library
- [ ] Add `useEncryptedStorage` hook — Wrap localStorage/IndexedDB with Web Crypto API for SMTP credentials
- [ ] Create reusable modal/toast system — Needed by upload, settings, and confirmation dialogs

## Stage 2: User Profile & Resume

- [ ] Build User Profile module (local JSON + IndexedDB) — name, email, phone, skills, experience
- [ ] Create Resume upload UI — Drag-and-drop PDF uploader with loading state
- [ ] Wire PDF upload to `/api/extract` — Extract text, show word/page count, store in profile
- [ ] Implement client-side PDF preview — Render PDF pages before user confirms extraction
- [ ] Add manual text editor for resume — Allow users to paste or edit extracted text directly

## Stage 3: Job Description Intake

- [ ] Add JD upload/paste interface — Sidebar panel in the Composer for pasting or uploading JD PDFs
- [ ] Validate PDF extraction across various layouts — Test with real job descriptions, handle edge cases
- [ ] Implement text cleaning utility — Strip headers/footers, normalize whitespace, extract structured fields
- [ ] Implement context-aware extraction — Match JD requirements against stored User Profile

## Stage 4: AI Integration & Safety

- [ ] Migrate AIService logic into a Web Worker — Move heavy inference off main thread
- [ ] Refine token streaming from Worker to UI — Smooth, non-blocking text rendering
- [ ] Implement system prompting with bracket identifier logic — Mandate `[Placeholder]` for missing info
- [ ] Implement manual GPU selection — Show detected adapters, let user choose (integrated vs dedicated)
- [ ] Add UI feedback for model initialization — Progress bar, status text, ETA, error states
- [ ] Build Model Download Manager — UI showing cached models, disk usage, download/cancel/delete
- [ ] Build Hallucination Scanner — Highlight `[...]` brackets in generated drafts, warn before send
- [ ] Implement graceful fallback UI — Banner when WebGPU unavailable, suggest mock mode

## Stage 5: Email Drafting & SMTP

- [ ] Build secure SMTP configuration interface — Provider presets, encrypted storage, test connection
- [ ] Enhance draft editing interface — Auto-save indicators, field validation
- [ ] Integrate SMTP send functionality via `nodemailer` — Create `/api/send` route
- [ ] Build Local Template Library — Save/load/delete email templates from IndexedDB
- [ ] Add Email Variations feature — Toggle tone (Formal / Direct / Creative) before finalizing
- [ ] Create side-by-side preview — JD context next to generated email for verification

## Stage 6: Inbox & Email Management

- [ ] Implement email threading — Group replies by subject, conversation view
- [ ] Add inbox search with full-text — Search across IndexedDB
- [ ] Implement email labeling/tagging — Custom tags for organizing applications
- [ ] Add draft auto-recovery — Detect unsaved changes, prompt on navigation away

## Stage 7: Performance & PWA

- [ ] Implement lazy loading with React Suspense — Dynamically import `@mlc-ai/web-llm` only on AI Chat
- [ ] Preload critical UI assets — Fonts, sidebar, mail list to reduce LCP
- [ ] Implement model weight caching — Cache API for cross-session persistence
- [ ] Profile Web Worker communication — Audit postMessage patterns, eliminate bottlenecks
- [ ] Integrate bundle analyzer — `@next/bundle-analyzer`, minimize AI import footprint
- [ ] Convert to PWA with `next-pwa` — Service worker, offline fallback, manifest, install prompt

## Stage 8: Advanced AI & Polish

- [ ] Create fine-tuning hook with local RAG — Upload past emails, build local vector index for personalization
- [ ] Add accessibility (a11y) — ARIA labels, keyboard navigation, screen reader support
- [ ] Add dark/light mode toggle — System preference detection + manual toggle
- [ ] Implement undo/redo for drafts — History stack for body edits
- [ ] Add onboarding walkthrough — First-visit tutorial: Dashboard → Profile → Compose

---

## JP — Browser, Themes & Models

- [x] Browser auto-detection — Detect Brave, Chrome, Edge, Firefox, Safari, Opera when WebGPU is unavailable
- [x] Brave WebGPU enable instructions — Show `brave://flags/#enable-unsafe-webgpu` steps + Linux Vulkan note in-app
- [x] Chrome/Edge/Firefox/Safari WebGPU instructions — Per-browser setup steps linked from the dashboard
- [x] Expanded WebGPU model catalog — 7 models across 5 categories (Fast, Smart, Powerful, Vision, Fallback)
- [x] Vision-capable model support — Phi-3.5-vision can read images (resumes, screenshots, JDs) via WebGPU
- [x] Categorized model picker — Dropdown groups with hover tooltips showing description, VRAM, and use case
- [x] Vision-aware GPU recommendation — Dashboard suggests the best model + vision option based on detected VRAM
- [x] Resume Scanner vision integration — Image upload routes to WebGPU vision model when available; falls back to external API
- [ ] Replace Ocean theme with 7 nature themes — Desert, Aurora, Sunset, Tundra, Volcano, Autumn, Tropical
- [ ] Nature theme animated backgrounds — Canvas animations for each new theme (sand dunes, aurora curtain, snowfall, etc.)
- [ ] Update theme picker UI — Replace single Ocean button with 7 new theme options

---

## Improvements & Technical Debt

- Replace `any` casts in `webgpu.ts` and `aiService.ts` with proper types from `@webgpu/types`
- Add Vitest unit tests for PDF cleaning, mock AI generation, WebGPU fallbacks
- Set up GitHub Actions — lint + type-check + build on every PR
- Pin exact dependency versions to avoid `pdf-parse` v2 / `web-llm` v0.2.84-style breakage
- Wrap AI Chat and PDF upload in React error boundaries
- Add client-side event log (IndexedDB) for debugging AI failures
