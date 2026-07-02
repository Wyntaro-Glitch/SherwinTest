# SherwinMail — Build Pipeline

## Stage 1: Data Foundation

- [ ] Set up global state management — Extract app state from `page.tsx` into a React Context or Zustand store
- [ ] Initialize IndexedDB schema — Create DB for emails, drafts, user profile, and template library
- [ ] Add `useEncryptedStorage` hook — Wrap localStorage/IndexedDB with Web Crypto API for SMTP credentials
- [x] Create reusable modal/toast system — Needed by upload, settings, and confirmation dialogs (`ErrorModal.tsx`)

## Stage 2: User Profile & Resume

- [ ] Build User Profile module (local JSON + IndexedDB) — name, email, phone, skills, experience
- [x] Create Resume upload UI — Drag-and-drop PDF/image uploader with loading state (`ResumeScanner.tsx`)
- [x] Wire PDF upload to `/api/extract` — Extract text, show word/page count, store in profile (`route.ts`)
- [ ] Implement client-side PDF preview — Render PDF pages before user confirms extraction
- [x] Add manual text editor for resume — Allow users to paste or edit extracted text directly (textarea in `ResumeScanner.tsx`)

## Stage 3: Job Description Intake

- [ ] Add JD upload/paste interface — Sidebar panel in the Composer for pasting or uploading JD PDFs
- [ ] Validate PDF extraction across various layouts — Test with real job descriptions, handle edge cases
- [ ] Implement text cleaning utility — Strip headers/footers, normalize whitespace, extract structured fields
- [ ] Implement context-aware extraction — Match JD requirements against stored User Profile

## Stage 4: AI Integration & Safety

- [ ] Migrate AIService logic into a Web Worker — Move heavy inference off main thread
- [ ] Refine token streaming from Worker to UI — Smooth, non-blocking text rendering
- [x] Implement system prompting with bracket identifier logic — Mandate `[Placeholder]` for missing info (in `aiService.ts` + `ResumeScanner.tsx`)
- [ ] Implement manual GPU selection — Show detected adapters, let user choose (integrated vs dedicated)
- [x] Add UI feedback for model initialization — Progress bar, status text, ETA, error states (in `ChatPanel.tsx`)
- [ ] Build Model Download Manager — UI showing cached models, disk usage, download/cancel/delete
- [ ] Build Hallucination Scanner — Highlight `[...]` brackets in generated drafts, warn before send
- [x] Implement graceful fallback UI — Banner when WebGPU unavailable, suggest mock mode (`BrowserWebGPUHelp.tsx`)

## Stage 5: Email Drafting & SMTP

- [ ] Build secure SMTP configuration interface — Provider presets, encrypted storage, test connection
- [x] Enhance draft editing interface — Auto-save indicators, field validation (`MailDetail.tsx`)
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
- [x] Add dark/light mode toggle — 6 themes: Dark, Light, Cyberpunk, Sakura, Forest, Ocean (`AppearanceSettings.tsx`, `ThemeProvider.tsx`)
- [ ] Implement undo/redo for drafts — History stack for body edits
- [x] Add onboarding walkthrough — First-visit tutorial for provider setup (`ProviderSetupModal.tsx`)

---

## Phase 2 — Core Application Shell

- [x] Main app layout with sidebar navigation — Mail folders, Chat, Privacy, Resume, Settings (`page.tsx`, `MailSidebar.tsx`)
- [x] Theme system with context provider — Persists to localStorage, 6 themes with canvas backgrounds (`ThemeProvider.tsx`, `ThemeBackground.tsx`)
- [x] AI provider config system — 4 providers (WebGPU, Ollama, LM Studio, API Key) with auto-detect (`ProviderSettings.tsx`, `aiProvider.ts`)
- [x] Model catalog — 7 models across 5 categories with VRAM/size/description (`aiService.ts`)
- [x] Error handling — Structured error modal for API failures and AI errors (`ErrorModal.tsx`)
- [x] System task scheduler — Housekeeping, health checks, error scanning (`SystemTaskScheduler.tsx`)
- [x] Web search API — Server-side route for fetching search results (`POST /api/search`)

## Phase 3 — WebGPU & Browser Detection

- [x] Browser auto-detection — Detect Brave, Chrome, Edge, Firefox, Safari, Opera when WebGPU is unavailable (`browser.ts`)
- [x] Brave-specific instructions — Show `brave://flags/#enable-unsafe-webgpu` steps + Linux Vulkan black-screen workaround in-app (`BrowserWebGPUHelp.tsx`)
- [x] Chrome/Edge/Firefox/Safari WebGPU instructions — Per-browser setup steps linked from dashboard
- [x] WebGPU hardware detection — Adapter info, buffer limits, `shader-f16` feature check (`webgpu.ts`)
- [x] Model tier suggestion — Maps VRAM limits to recommended model + vision alternative (`webgpu.ts`)
- [x] GPU diagnostics display — Hardware info + feature status in Privacy Dashboard (`PrivacyDashboard.tsx`)
- [x] shader-f16 warning banner — Shown in ChatPanel when GPU lacks required feature (`ChatPanel.tsx`)
- [x] Brave flag enable instructions with Vulkan black-screen note — In PrivacyDashboard when WebGPU unavailable

## Phase 4 — AI Chat System

- [x] General-purpose AI chat — Messages, streaming responses, system prompts (`ChatPanel.tsx`)
- [x] Dual provider routing — WebGPU uses `aiService.getChatCompletion()`, other providers use `chatCompletion()` from `aiProvider`
- [x] Vision model support — Image-base64 in chat messages, `isVisionModel()` helper (`aiService.ts`)
- [x] Web search integration — Auto-detects app questions vs general questions, fetches web results (`ChatPanel.tsx`)
- [x] Categorized model picker — Dropdown with `<optgroup>` sections + hover tooltips for descriptions
- [x] Engine initialization UI — Progress bar, status text, error display
- [x] Custom system prompt support — `getChatCompletion()` accepts optional `systemPrompt` parameter

## Phase 5 — PDF & Resume Scanner

- [x] PDF text extraction API — `POST /api/extract` using pdf-parse v2 (`route.ts`)
- [x] pdfjs-dist worker fix — `PDFParse.setWorker("pdfjs-dist/legacy/build/pdf.worker.mjs")` resolves bare specifier in bundled context
- [x] Resume Scanner UI — Split-pane layout: editor (left) + AI chat (right) (`ResumeScanner.tsx`)
- [x] PDF upload flow — Server-side text extraction, word/page count, auto-analysis via AI
- [x] Image upload flow — AI-powered OCR extraction (vision model or external API), then auto-analysis
- [x] Auto-analysis after upload — `runAnalysis()` sends resume content to AI, streams structured feedback into chat
- [x] WebGPU restriction — Resume AI analysis blocked when WebGPU is active; warning banner + input/button disable
- [x] Image upload guard — Rejects with clear message when WebGPU is the only provider (OCR needs AI)
- [x] Apply AI output to editor — Button that copies latest assistant response into the text editor
- [x] Manual text editing — Editable textarea with word count

## Phase 6 — Settings & Configuration

- [x] AI Provider settings — 4 provider buttons with status indicators + scan results (`ProviderSettings.tsx`)
- [x] Auto-detect provider — Scans WebGPU → Ollama → LM Studio in priority order
- [x] WebGPU model picker — Categorized dropdown with all 7 models, descriptions, VRAM requirements
- [x] Apply button pattern — WebGPU model changes use pending state + Apply button (no auto-save)
- [x] API Key config — Key, base URL, model name inputs
- [x] Theme picker — 6 theme options with preview descriptions (`AppearanceSettings.tsx`)
- [x] SMTP connection UI — Server, port, credentials form in Settings
- [x] Onboarding wizard — First-run provider setup modal (`ProviderSetupModal.tsx`)

## Phase 7 — Quality & Error Handling

- [x] WebGPU shader-f16 detection — Pre-checks GPU capability before model load attempt
- [x] Informative shader error message — Guides users to update drivers, enable Brave flags, or try Chrome/Edge
- [x] Console error suppression — Graceful catch with user-facing message instead of raw WebGPU errors
- [x] Provider status feedback — Green/red/gray status dots per provider after scanning
- [x] Upload error display — Inline error messages for failed PDF/image extraction
- [x] AI generation error handling — Catches failures, shows actionable message in chat

---

## Model Catalog

| Category | Model | Size | VRAM | Notes |
|---|---|---|---|---|
| Fast (Text) | Qwen 2.5 (0.5B) | 0.35 GB | 1.2 GB | Fastest, simple chat |
| Smart (Text) | Qwen 2.5 (1.5B) | 0.98 GB | 2.2 GB | Balanced drafting |
| Smart (Text) | Phi-3.5 Mini (3.8B) | 2.2 GB | 3.5 GB | Proven, great drafting |
| Smart (Text) | Llama 3.2 (3B) | 1.8 GB | 3 GB | Modern architecture |
| Powerful (Text) | Qwen 3 (4B) | 2.5 GB | 3.5 GB | Reasoning + large context |
| Powerful (Text) | Llama 3 (8B) | 4.7 GB | 6.5 GB | Best text quality |
| Vision | Phi-3.5 Vision (4.2B) | 3.9 GB | 4 GB | Reads images (resumes) |
| Fallback | Rule-based Assistant | 0 MB | 0 GB | No GPU needed |

All models have `low_resource_required: true` in web-llm v0.2.84 registry (verified WASM binaries).

---

## Provider Routing Rules

| Component | WebGPU | Ollama | LM Studio | API Key |
|---|---|---|---|---|
| **ChatPanel** (general chat) | ✓ | ✓ | ✓ | ✓ |
| **ResumeScanner** (analysis) | ✗ | ✓ | ✓ | ✓ |
| **ResumeScanner** (PDF upload) | ✓ | ✓ | ✓ | ✓ |
| **ResumeScanner** (image upload) | ✗ | ✓ | ✓ | ✓ |
| **ResumeScanner** (auto-generate) | ✗ | ✓ | ✓ | ✓ |

---

## Key Technical Decisions

- **WebGPU models**: Only `low_resource_required: true` models used (Phi-4-mini, Qwen2.5-7B, Llama-3-8B excluded because they lack verified WASM binaries)
- **shader-f16**: Required by all WebLLM models. `detectWebGPUSupport()` checks `adapter.features.has("shader-f16")` and reports it. Missing feature → model load fails with `index_kernel` shader error
- **PDF worker**: pdfjs-dist v5.4.296 requires worker path set via `PDFParse.setWorker("pdfjs-dist/legacy/build/pdf.worker.mjs")` (bare specifier) — resolves correctly in Next.js bundled context via Node module resolution
- **Apply button**: WebGPU model picker uses pending state, saves only on Apply click. Prevents accidental model switches
- **Brave Linux**: `brave://flags/#enable-unsafe-webgpu` is required; `enable-vulkan` flag causes black screen on Linux/Flatpak — documented in help text

---

## File Map

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts       # PDF text extraction endpoint
│   │   └── search/route.ts        # Web search endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # App orchestrator
├── components/
│   ├── AppearanceSettings.tsx      # Theme picker
│   ├── BrowserWebGPUHelp.tsx       # Browser-specific WebGPU enable steps
│   ├── ChatPanel.tsx               # General AI chat
│   ├── ErrorModal.tsx              # Error display modal
│   ├── MailDetail.tsx              # Email compose/view/edit
│   ├── MailSidebar.tsx             # Folder navigation
│   ├── PrivacyDashboard.tsx        # GPU diagnostics + privacy info
│   ├── ProviderSettings.tsx        # AI provider config
│   ├── ProviderSetupModal.tsx       # First-run onboarding
│   ├── ResumeScanner.tsx           # Resume upload + AI analysis
│   ├── SystemTaskScheduler.tsx     # Scheduled maintenance
│   ├── ThemeBackground.tsx         # Canvas animations per theme
│   └── ThemeProvider.tsx           # Theme context + persistence
├── types/
│   └── index.ts                    # Shared TypeScript types
└── utils/
    ├── aiProvider.ts               # Provider config + chat API
    ├── aiService.ts                # Model catalog + WebLLM engine
    ├── browser.ts                  # Browser detection
    └── webgpu.ts                   # WebGPU detection + tier suggestions
```

---

## Improvements & Technical Debt

- Replace `any` casts in `webgpu.ts`, `aiService.ts`, `aiProvider.ts` with proper types from `@webgpu/types`
- Add Vitest unit tests for PDF cleaning, mock AI generation, WebGPU fallbacks
- Set up GitHub Actions — lint + type-check + build on every PR
- Pin exact dependency versions to avoid `pdf-parse` v2 / `web-llm` v0.2.84-style breakage
- Wrap AI Chat and PDF upload in React error boundaries
- Add client-side event log (IndexedDB) for debugging AI failures
- Remove Ocean theme, replace with 7 nature themes (Desert, Aurora, Sunset, Tundra, Volcano, Autumn, Tropical) with canvas animations
- Extract global state from `page.tsx` into React Context or Zustand store
- Move AIService into Web Worker to keep main thread free
- Implement lazy loading of `@mlc-ai/web-llm` (only import when user clicks Load Engine)
