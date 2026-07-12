---
tags:
  - sherwinmail
  - wiki
  - index
  - reference
created: 2026-07-02
aliases:
  - Home
  - Index
  - SherwinMail
---
# SherwinMail Wiki

> **Privacy-Centric AI Email Orchestrator** — An offline-first, in-browser web application that runs large language models entirely on-device via WebGPU to automate professional email outreach, resume analysis, and job application workflows.

| Attribute | Value |
|---|---|
| **Stack** | Next.js 16.2.9 (App Router) + Tailwind CSS 4 + TypeScript 5 |
| **AI Engine** | `@mlc-ai/web-llm` v0.2.84 (WebGPU) |
| **AI Providers** | WebGPU, Ollama, LM Studio, API Key (OpenAI/Anthropic-compatible) |
| **PDF Parsing** | `pdf-parse` v2.4.5 with `pdfjs-dist` v5.4.296 |
| **State Persistence** | localStorage (emails, settings, provider config, theme, SMTP credentials) |
| **Deployment Target** | Static export / Vercel / PWA |
| **Package Manager** | npm |
| **Lint** | ESLint (config: `eslint.config.mjs`) |

---

## Architecture

SherwinMail uses a **hybrid in-browser AI strategy** with no backend dependency for inference:

### Data Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────┐
│ page.tsx (App Orchestrator)                     │
│  - State: emails[], currentFolder, detection    │
│  - localStorage read/write hooks                │
│  - First-run detection → ProviderSetupModal     │
│  - Routing: home|inbox|draft|sent|chat|resume   │
│  - SMTP connection config                       │
└────┬────────────┬──────────────┬────────────────┘
     │            │              │
     ▼            ▼              ▼
  MailList     MailDetail    ChatPanel /
  MailSidebar               ResumeScanner
     │            │              │
     ▼            ▼              ▼
  localStorage  AI Service   AI Provider
                 (WebGPU)    (Ollama/LM Studio/API)
```

### Server Routes (only 2)

| Route | Method | Purpose | Library |
|---|---|---|---|
| `/api/extract` | POST | PDF text extraction | `pdf-parse` + `pdfjs-dist` |
| `/api/search` | POST | Web search for context | Custom fetch-based |

### Client-Only Architecture

All AI inference, state management, and UI rendering happen client-side. The two API routes are minimal utility endpoints. The app can function entirely offline after initial load and model caching.

---

## Project Map

```
SherwinTest/
├── SherwinMail/                    # Obsidian vault root
│   ├── .obsidian/                  # Vault config (app, appearance, core-plugins, graph, workspace)
│   └── Welcome.md                  # ← You are here
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract/route.ts    # POST — PDF text extraction via pdf-parse
│   │   │   └── search/route.ts     # POST — Web search for context
│   │   ├── globals.css             # Global styles + Tailwind directives
│   │   ├── layout.tsx              # Root layout (HTML shell)
│   │   └── page.tsx                # App orchestrator (state hub, routing, layout)
│   ├── components/
│   │   ├── AppearanceSettings.tsx  # Theme picker (6 themes)
│   │   ├── BrowserWebGPUHelp.tsx   # Per-browser WebGPU enable steps
│   │   ├── ChatPanel.tsx           # General AI chat + web search + engine init
│   │   ├── ErrorModal.tsx          # Structured error display modal
│   │   ├── MailDetail.tsx          # Email compose/view/edit + AI Pitch Builder
│   │   ├── MailList.tsx            # Email list pane with search
│   │   ├── MailSidebar.tsx         # Folder navigation sidebar
│   │   ├── PrivacyBanner.tsx       # Zero-data-transfer banner
│   │   ├── PrivacyDashboard.tsx    # GPU diagnostics + hardware info + tier suggestion
│   │   ├── ProviderSettings.tsx    # AI provider config (4 providers)
│   │   ├── ProviderSetupModal.tsx  # First-run onboarding wizard
│   │   ├── ResumeScanner.tsx       # Resume upload (PDF/image) + AI analysis chat
│   │   ├── SystemTaskScheduler.tsx # Periodic maintenance tasks
│   │   ├── ThemeBackground.tsx     # Canvas-based animated backgrounds per theme
│   │   └── ThemeProvider.tsx       # Theme context + localStorage persistence
│   ├── types/
│   │   └── index.ts                # All shared TypeScript interfaces
│   └── utils/
│       ├── ai.worker.ts            # Web Worker entry — WebLLM inference off main thread
│       ├── aiProvider.ts           # Multi-provider: check, auto-detect, chatCompletion
│       ├── aiService.ts            # Model catalog + WebLLM engine wrapper + mock fallback
│       ├── browser.ts              # Browser detection (Brave, Chrome, Edge, Firefox, Safari, Opera)
│       └── webgpu.ts               # WebGPU detection + model tier suggestion
├── plan.md                         # Full build pipeline & phased roadmap
├── README.md                       # Public-facing overview
├── package.json                    # Dependencies & scripts
├── next.config.ts                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
├── postcss.config.mjs              # PostCSS + Tailwind config
└── eslint.config.mjs              # ESLint flat config
```

---

## Component Reference

### [[page.tsx]] — App Orchestrator

The central state hub at `src/app/page.tsx`. Manages:

**State (all via `useState`):**
- `emails: Email[]` — synced to `localStorage("sherwin_emails")`
- `currentFolder: MailFolder` — routing: `home | inbox | draft | sent | chat | settings | resume`
- `selectedEmailId: string | null`
- `detection: WebGPUDetectionResult | null` — from `detectWebGPUSupport()`
- SMTP connection fields: `provider`, `emailAddress`, `smtpServer`, `smtpPort`, `smtpUser`, `smtpPassword`

**Key Behaviors:**
- **Hydration guard:** Renders a spinner until `hasLoaded` is true (localStorage read completes)
- **First-run detection:** If no `sherwin_ai_provider` in localStorage, shows `ProviderSetupModal`
- **Auto-save:** Every email mutation calls `localStorage.setItem("sherwin_emails", ...)`
- **Compose:** Creates a new draft email with `status: "draft"` and pushes it to the top of the list
- **Reply:** Prepends `"Re: "` to subject, quotes original body with `> ` prefix
- **SMTP save:** Validates email format, persists all SMTP fields to localStorage, shows success/error toast
- **Routing:** Renders center/right pane based on `currentFolder`:
  - `home` → `PrivacyDashboard`
  - `resume` → `ResumeScanner`
  - `chat` → `ChatPanel`
  - `settings` → Settings page (ProviderSettings + SMTP + AppearanceSettings + SystemTaskScheduler)
  - `inbox|draft|sent` → Dual pane: `MailList` + `MailDetail`

**SMTP Provider Presets:**
| Provider | Server | Port |
|---|---|---|
| ProtonMail Bridge | 127.0.0.1 | 1025 |
| Gmail | smtp.gmail.com | 587 |
| Custom | user-defined | user-defined |

### [[MailSidebar.tsx]] — Navigation

Fixed `w-64` sidebar with:
- **Compose Draft** button (gradient purple, calls `onCompose`)
- **Mailboxes** section: Inbox (unread count badge), Drafts (count), Sent (count)
- **Services** section: Dashboard, AI Assistant Chat, Resume Scanner, Settings & Accounts
- Active folder highlighted with indigo left-border indicator

### [[MailList.tsx]] — Email List

`w-80` list pane with:
- **Search bar** — filters by subject, to, from, and body (case-insensitive)
- **Email items** — shows sender/recipient, subject, preview snippet, date, unread indicator
- Active selection has indigo left border
- Unread emails have bold text + indigo dot indicator
- Empty state message when no emails match

### [[MailDetail.tsx]] — Email View & Compose

Handles two modes:

**Draft Mode (editable):**
- To, Subject, Body fields with auto-save on every change
- AI Pitch Builder sidebar — paste Job Description text → click "Generate AI Pitch"
- AI generation routes through `aiProvider.chatCompletion()` for Ollama/LM Studio/API, falls back to `aiService.generateDraftFromJob()` for WebGPU/mock
- Mock generation uses regex extraction of job title, company, contact name, skills from JD text
- Send button marks email as `status: "sent"` with timestamp
- Delete button removes from list

**Read Mode (inbox/sent):**
- From, To, Date header
- Reply button (creates a new draft quoting the original)
- Delete button

### [[ChatPanel.tsx]] — AI Chat

General-purpose AI assistant with:

**Provider Detection:**
- Checks `getProviderConfig()` on mount
- For ollama/lmstudio/api: sets provider label and marks engine as loaded
- For webgpu/auto: detects WebGPU support, checks `shader-f16` feature, shows warning if missing

**Web Search Integration:**
- Uses `APP_KEYWORDS` list to detect if a question is about the app vs general knowledge
- App questions → answered from model knowledge (no search)
- General questions → fetches `POST /api/search?q=...`, injects results into system prompt
- Shows "Searching web..." status indicator during fetch

**Model Loader (WebGPU only):**
- Categorized model picker dropdown with optgroups: Fast & Light, Smart & Balanced, Powerful Text, Vision, Fallback
- Model info tooltip on hover (category, size, description, VRAM, recommendation)
- "Load Engine" button calls `aiService.initEngine()` with progress bar (0-100%)
- Progress shows status text + percentage + animated bar
- On success, posts a system message confirming model loaded

**Conversation:**
- Streaming responses via `onChunk` callback
- Suggestion chips (4 presets including "What is 1+1?" which triggers web search)
- Typing indicator (bouncing dots) during generation
- Input disabled when engine not loaded or no provider configured

### [[ResumeScanner.tsx]] — Resume Analysis

Split-pane layout: 3/5 editor (left) + 2/5 AI chat (right).

**Left Pane — Upload & Editor:**
- Drag-and-drop or click-to-browse file upload (PDF, PNG, JPG, WebP)
- PDF upload: sends to `/api/extract`, shows word count + page count, triggers auto-analysis
- Image upload: uses vision model (AI provider must not be WebGPU) for OCR extraction
- WebGPU restriction: when provider is WebGPU, image upload shows error message and PDF upload is suggested instead
- Textarea editor: editable extracted text with word count
- "Apply AI Output to Editor" button — copies latest assistant response (if > 100 chars) into editor
- Remove & re-upload button
- Image preview thumbnail for uploaded images

**Right Pane — AI Chat:**
- System prompt built from resume content via `buildSystemPrompt(resumeText)`
- Responsibilities: analyze structure, gaps, grammar, ATS compatibility, suggest improvements
- Auto-Generate button — produces a complete polished resume with sections (Summary, Skills, Experience, Education, Certifications)
- Streaming responses
- Message history with timestamps
- Input field to ask follow-up questions about the resume

**Provider Routing:**
- Resume analysis is **blocked when WebGPU is active** (shows amber warning banner)
- Routes through `aiProvider.chatCompletion()` for ollama/lmstudio/api
- This is because resume analysis requires more capable models than WebGPU provides

### [[PrivacyDashboard.tsx]] — Home Dashboard

Shown on the `home` route. Three sections:

**1. Zero-Data-Transfer Policy:**
- Explains all AI runs locally via WebGPU
- PDF extraction via local API route (no third-party)
- SMTP credentials encrypted in localStorage

**2. Hardware Diagnostics & Model Tier:**
- Runs `detectWebGPUSupport()` on mount with loading spinner
- Status indicator: green pulsing dot ("WebGPU Active") or amber dot ("WebGPU Unavailable")
- GPU info grid: device name, vendor, architecture, max buffer size (auto-formatted in GB/MB)
- shader-f16 feature: green checkmark if supported, red X if missing
- Recommended Model Tier card: tier name (Tiny/Small/Medium/Large), description, model name
- If VRAM sufficient, shows Vision Model Available sub-card
- Fallback notice when no device created
- Shows [[BrowserWebGPUHelp.tsx]] component when device unavailable

**3. Quick Actions:**
- Three cards: Go to Inbox, Open AI Chat, Configure Email

### [[ProviderSettings.tsx]] — AI Provider Configuration

Located in the Settings page. Features:

**Provider Buttons (4):**
| Provider | Default Endpoint | Status Indicator |
|---|---|---|
| Ollama | `localhost:11434` | Green/gray/red dot |
| LM Studio | `localhost:1234` | Green/gray/red dot |
| WebGPU | Browser GPU | Green/gray/red dot |
| API Key | User-defined | No status (always available) |

**Auto-Detect:** Scans WebGPU → Ollama → LM Studio in priority order. Shows "Scanning..." during check.

**WebGPU Model Picker:**
- Categorized dropdown (Fast, Smart, Powerful, Vision)
- **Apply button pattern**: model selection is stored in `pendingModel`; only saved to config on "Apply" click
- Shows pending state indicator when model differs from saved config
- Recommendation hints below dropdown

**API Key Config:**
- Password field for API key
- Base URL text input (default `https://api.openai.com`)
- Model name text input (default `gpt-4o-mini`)
- Auto-saves on change via `update()`

### [[ProviderSetupModal.tsx]] — Onboarding Wizard

First-run modal shown when no `sherwin_ai_provider` is configured. Steps:

1. **Choose** — 4 options: Auto Detect, Ollama, LM Studio, API Key + "Skip — use mock assistant"
2. **Scanning** — Loading spinner while scanning providers
3. **Ollama/LM Studio detail** — shown if provider check fails (user can retry or go back)
4. **API Key form** — API Key, Base URL, Model fields + Connect/Back buttons

Clicking outside the modal triggers `onSkip()`.

### [[AppearanceSettings.tsx]] — Theme Picker

6 themes in a `grid-cols-3` button layout:

| Theme | Emoji | Description |
|---|---|---|
| Dark | 🌙 | Easy on the eyes |
| Light | ☀️ | Clean and bright |
| Cyberpunk | ⚡ | Neon glow |
| Sakura | 🌸 | Cherry blossom pink |
| Forest | 🌲 | Earthy greens |
| Ocean | 🌊 | Deep blues |

Active theme shows indigo border + ring. Setting is persisted to `localStorage("sherwin_theme")` and applied via `data-theme` attribute on `<html>`.

### [[ThemeProvider.tsx]] & [[ThemeBackground.tsx]]

- `ThemeProvider` wraps the app in a React Context (`useTheme()` hook)
- On mount, reads `localStorage("sherwin_theme")` and validates against allowed themes
- `setTheme()` updates state + localStorage + `document.documentElement` `data-theme` attribute
- `ThemeBackground` renders canvas-based animated backgrounds that vary per theme

### [[ErrorModal.tsx]]

Modal with:
- Title, description, optional details (expandable)
- Action buttons array (e.g., "Try Again")
- Used by `page.tsx` for API failures and AI errors

### [[SystemTaskScheduler.tsx]]

Displays system task statuses (type `SystemTaskStatus`):
- Each task has: id, label, description, lastRun, status (idle/running/success/error)
- Shows maintenance, health checks, error scanning tasks

### [[PrivacyBanner.tsx]]

Persistent banner at the top of the workspace:
- Reinforces zero-data-transfer message
- Shown regardless of current view

### [[BrowserWebGPUHelp.tsx]]

Shown in PrivacyDashboard when WebGPU is unavailable:
- Browser-specific instructions for enabling WebGPU
- Brave: `brave://flags/#enable-unsafe-webgpu`, Vulkan black screen warning on Linux
- Chrome: `chrome://flags/#enable-unsafe-webgpu`
- Edge: `edge://flags/#enable-unsafe-webgpu`
- Firefox: `about:config` → `dom.webgpu.enabled`
- Safari: Settings → Advanced → Develop → Experimental Features

---

## AI & Model System

### [[aiService.ts]] — Model Catalog & WebLLM Engine

**Model Catalog** (`AVAILABLE_MODELS`):

| Category | Model ID | Name | Size | VRAM | Description |
|---|---|---|---|---|---|
| `text-fast` | `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Qwen 2.5 (0.5B) | 0.35 GB | 1.2 GB | Fastest option, simple chat |
| `text-smart` | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Qwen 2.5 (1.5B) | 0.98 GB | 2.2 GB | Balanced email drafting |
| `text-smart` | `Phi-3.5-mini-instruct-q4f16_1-MLC` | Phi-3.5 Mini (3.8B) | 2.2 GB | 3.5 GB | High-quality drafting & analysis |
| `text-smart` | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | Llama 3.2 (3B) | 1.8 GB | 3 GB | Modern architecture |
| `text-powerful` | `Qwen3-4B-q4f16_1-MLC` | Qwen 3 (4B) | 2.5 GB | 3.5 GB | Reasoning + large context |
| `text-powerful` | `Llama-3-8B-Instruct-q4f16_1-MLC-1k` | Llama 3 (8B) | 4.7 GB | 6.5 GB | Best text quality |
| `vision` | `Phi-3.5-vision-instruct-q4f16_1-MLC` | Phi-3.5 Vision (4.2B) | 3.9 GB | 4 GB | Reads images (resumes) |
| `fallback` | `mock-assistant` | Offline Rule-based Assistant | 0 MB | 0 GB | No GPU needed |

**WebLLM Engine (`AIService` class):**
- `initEngine(modelId, onProgress)` — Dynamically imports `@mlc-ai/web-llm`, calls `CreateMLCEngine` with progress callback (10-100%)
- Error handling: catches `index_kernel` / `ShaderModule` / shader errors, falls back to `mock-assistant` with user-friendly error message about shader-f16
- `getChatCompletion(messages, onChunk, imageBase64?, systemPrompt?)` — Supports streaming + vision (image as base64 in user message)
- `runMockCompletion(userMessage)` — Smart fallback with keyword-based responses (greetings, draft requests, clear/reset)
- `generateDraftFromJob(jobText, subject)` — Regex-based extraction of job title, company, contact, skills from text; generates templated outreach email with `[Brackets]`
- Singleton: `export const aiService = new AIService()`

### [[aiProvider.ts]] — Multi-Provider System

Unified interface for non-WebGPU providers:

| Provider | Check Endpoint | Chat Endpoint |
|---|---|---|
| Ollama | `GET localhost:11434/api/tags` (3s timeout) | `POST localhost:11434/v1/chat/completions` |
| LM Studio | `GET localhost:1234/v1/models` (3s timeout) | `POST localhost:1234/v1/chat/completions` |
| API Key | Always available | User-configured base URL + model |

**`chatCompletion(req)`:**
1. Reads config from localStorage
2. Builds URL from provider type or `baseUrl`
3. Adds `Authorization: Bearer {apiKey}` if configured
4. Streams response via `ReadableStream` reader
5. Parses SSE `data:` lines, extracts `choices[0].delta.content`
6. Calls `onChunk` with accumulated text

**`autoDetectProvider()`:** Tries webgpu → ollama → lmstudio in order, saves first available.

### [[ai.worker.ts]] — Web Worker

Minimal worker entry point:
- Creates `WebWorkerMLCEngineHandler` from `@mlc-ai/web-llm`
- Hooks `self.onmessage` to `handler.onmessage`
- All LLM inference runs off the main thread, keeping UI responsive

### Provider Routing Rules

| Feature | WebGPU | Ollama | LM Studio | API Key |
|---|---|---|---|---|
| ChatPanel (general chat) | ✓ | ✓ | ✓ | ✓ |
| ResumeScanner (analysis) | ✗ | ✓ | ✓ | ✓ |
| ResumeScanner (PDF upload) | ✓ | ✓ | ✓ | ✓ |
| ResumeScanner (image upload) | ✗ | ✓ | ✓ | ✓ |
| ResumeScanner (auto-generate) | ✗ | ✓ | ✓ | ✓ |
| MailDetail (AI Pitch) | ✓ (mock) | ✓ | ✓ | ✓ |

### Bracket Identifier Protocol

A strict system prompt prevents hallucination across all AI interactions:

```
If any context (Names, Companies, Dates, Jobs) is missing,
strictly use [BRACKETS] e.g., [Hiring Manager Name] or [Company Name].
Do not hallucinate or make up details.
```

This is enforced in:
- `aiService.ts` — default system prompt for `getChatCompletion()`
- `MailDetail.tsx` — system prompt for AI Pitch Builder
- `ResumeScanner.tsx` — system prompt for resume analysis (uses brackets only for personal details)
- `ChatPanel.tsx` — `buildSystemPrompt()` for general chat

---

## WebGPU Detection & GPU Diagnostics

### [[webgpu.ts]] — Detection Pipeline

`detectWebGPUSupport()` runs a multi-step probe:

1. **Browser check** — `typeof window !== "undefined"`
2. **navigator.gpu presence** — if missing, returns error
3. **Adapter request** — `navigator.gpu.requestAdapter()`
4. **GPU info** — reads `adapter.info` (vendor, architecture, device, description)
5. **Limits** — `maxBufferSize`, `maxStorageBufferBindingSize`, `maxComputeWorkgroupStorageSize`, `maxComputeInvocationsPerWorkgroup`
6. **Features** — checks `adapter.features.has("shader-f16")` (required by all WebLLM models)
7. **Device creation** — `adapter.requestDevice()` with required features

Returns `WebGPUDetectionResult` with all fields.

### Model Tier Suggestion

`suggestModelTier(limits)` maps `maxBufferSize` to tier:

| Max Buffer | Tier | Model | Vision Alternative |
|---|---|---|---|
| < 1 GB | Tiny | Qwen 2.5 (0.5B) | — |
| 1-3 GB | Small | Qwen 2.5 (1.5B) | — |
| 3-5 GB | Medium | Phi-3.5 Mini (3.8B) | Phi-3.5 Vision (4.2B) |
| 5+ GB | Large | Phi-3.5 Vision (4.2B) | Llama 3 (8B) |

### [[browser.ts]] — Browser Detection

`detectBrowser()` returns `{ name, label, webgpuFlagsUrl }`:

1. Checks `navigator.brave.isBrave()` (async) for Brave detection
2. UA string matching: `opr` → Opera, `edg` → Edge, `firefox|fxios` → Firefox, `chrome|chromium|crios` → Chrome, `safari` → Safari
3. Returns `BrowserDetectionResult` with browser-specific flags URL

`getFlagsInstructions(browser)` returns per-browser WebGPU enable steps:
- Brave: `brave://flags/#enable-unsafe-webgpu`, Vulkan flag note for Linux
- Chrome: `chrome://flags/#enable-unsafe-webgpu`, Vulkan for Linux
- Edge: `edge://flags/#enable-unsafe-webgpu`
- Firefox: `about:config` → `dom.webgpu.enabled`
- Safari: Settings → Develop → Experimental Features

---

## Type System

All shared types in `src/types/index.ts` ([[index.ts]]):

```typescript
interface Email {
  id: string; subject: string; from: string; to: string;
  body: string; status: "inbox" | "draft" | "sent";
  date: string; isRead: boolean;
}

interface ChatMessage {
  id: string; sender: "user" | "assistant";
  text: string; timestamp: string;
}

type MailFolder = "home" | "inbox" | "draft" | "sent" | "chat" | "settings" | "profile" | "resume";

type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface UserProfile {
  name: string; email: string; phone: string;
  resumeText: string; experience: string; skills: string[];
}

type AIProviderType = "auto" | "webgpu" | "ollama" | "lmstudio" | "api";

interface AIProviderConfig {
  provider: AIProviderType; model: string;
  apiKey?: string; baseUrl?: string;
  ollamaModel?: string; lmStudioModel?: string;
}

type ThemeName = "dark" | "light" | "cyberpunk" | "sakura" | "forest" | "ocean";

interface SystemTaskStatus {
  id: string; label: string; description: string;
  lastRun: string | null;
  status: "idle" | "running" | "success" | "error";
  errorMessage?: string;
}
```

---

## Key Technical Decisions

### WebGPU shader-f16 Requirement
All WebLLM models require the `shader-f16` GPU feature. `detectWebGPUSupport()` checks `adapter.features.has("shader-f16")`. Missing this feature causes `index_kernel` shader failure. The error message guides users to update GPU drivers, try Chrome/Edge, or (for Brave) enable `brave://flags/#enable-unsafe-webgpu`.

### Brave Linux Vulkan Quirk
On Linux, Brave requires `brave://flags/#enable-unsafe-webgpu`. The `enable-vulkan` flag causes black screens on Linux/Flatpak — this is documented in the help text and in [[BrowserWebGPUHelp.tsx]].

### PDF Worker Fix
`pdfjs-dist` v5.4.296 requires explicit worker path configuration: `PDFParse.setWorker("pdfjs-dist/legacy/build/pdf.worker.mjs")`. This bare specifier resolves correctly in Next.js bundled context via Node module resolution. Without this, PDF extraction silently fails.

### Apply Button Pattern
WebGPU model selection uses a **pending state** pattern in [[ProviderSettings.tsx]]. The dropdown changes `pendingModel`, but the config is only saved when the user clicks "Apply". This prevents accidental model switches during browsing.

### Theme System
6 themes persisted to `localStorage("sherwin_theme")` and applied via `data-theme` attribute. Each theme has a matching canvas-based animated background in [[ThemeBackground.tsx]].

### localStorage Persistence
All user data lives in `localStorage` under keys:
- `sherwin_emails` — Email array (inbox, drafts, sent)
- `sherwin_ai_provider` — AI provider config JSON
- `sherwin_theme` — Theme name string
- `sherwin_provider` — SMTP provider type
- `sherwin_email_address` / `sherwin_smtp_server` / `sherwin_smtp_port` / `sherwin_smtp_user` / `sherwin_smtp_password`

### Rule-Based Fallback (Mock Assistant)
When no GPU/AI provider is available, the app falls back to a deterministic rule-based assistant. `runMockCompletion()` in `aiService.ts` matches keywords:
- `hello|hi|hey` → greeting + mode explanation
- `draft|email|job` → template with `[Brackets]`
- `clear|reset` → context cleared
- Default → instructions for use

### Web Search Auto-Detection
[[ChatPanel.tsx]] categorizes user questions using `APP_KEYWORDS`:
- Email/app-related keywords → answer from model knowledge
- Everything else → fetches web search results, injects into system prompt
- Fallback: if search fails, model answers from its own knowledge

---

## Email & SMTP Integration

### AI Pitch Builder (in [[MailDetail.tsx]])

Sidebar panel in the draft composer:
1. User pastes a Job Description into the textarea
2. Clicks "Generate AI Pitch"
3. For ollama/lmstudio/api: routes through `chatCompletion()` with system prompt enforcing `[Brackets]`
4. For WebGPU/mock: falls back to `aiService.generateDraftFromJob()` which uses regex to extract:
   - Job title (`/job title|role|position|looking for a|seeking a/i`)
   - Company name (`/company|organization|at|client/i`)
   - Contact name (`/contact|hiring manager|recruiter|write to|apply to/i`)
   - Skills (matches against predefined list: React, Next.js, TypeScript, etc.)
5. Produces a 4-paragraph outreach email with `[Brackets]` for missing info

### SMTP Connection Settings

Configured in `page.tsx` settings pane:
- Provider selection: ProtonMail Bridge, Gmail, Custom SMTP
- Fields: Email Address, SMTP Server, SMTP Port, Username, Password
- "Save & Test Connection" button validates email format and saves to localStorage
- Auto-switches default server/port based on provider selection
- Connection test is simulated (1.2s delay) — real SMTP send via `/api/send` is planned

---

## Build Pipeline Status

From `plan.md` — all milestones:

| Phase | Status | Description |
|---|---|---|
| 1. Core App Shell | Complete | Layout, sidebar, theme system, provider config, model catalog, error handling, task scheduler, web search API |
| 2. WebGPU & Browser Detection | Complete | Browser auto-detection, per-browser WebGPU instructions, GPU diagnostics, hardware detection, model tier suggestion, shader-f16 detection |
| 3. AI Chat System | Complete | Streaming chat, dual provider routing, vision support, web search, categorized model picker, engine init UI, custom system prompts |
| 4. PDF & Resume Scanner | Complete | PDF extraction API, Resume Scanner UI (split-pane), PDF/image upload, OCR for images, auto-analysis, WebGPU restriction for analysis, apply AI output |
| 5. Settings & Configuration | Complete | Provider settings with auto-detect, WebGPU model apply button, API Key config, theme picker, SMTP UI, onboarding wizard |
| 6. Quality & Error Handling | Complete | shader-f16 pre-checks, informative error messages, console error suppression, provider status feedback, inline upload errors, AI generation error handling |
| 7. Future / In Progress | Planned | IndexedDB, Web Worker migration, SMTP `/api/send`, PWA (`next-pwa`), bundle optimization (`@next/bundle-analyzer`), RAG fine-tuning, undo/redo, accessibility, event logging, error boundaries, lazy loading of WebLLM, Vitest tests, GitHub Actions |

---

## Obsidian Vault Structure

Two Obsidian vaults exist in the project:

**Root vault** (`.obsidian/` in project root):
- App config: `{}` (default)
- Core plugins: file-explorer, global-search, switcher, graph, canvas, backlink, outgoing-link, tag-pane, properties, page-preview, daily-notes, templates, note-composer, command-palette, editor-status, bookmarks, outline, word-count, file-recovery, sync, bases

**SherwinMail vault** (`SherwinMail/.obsidian/`):
- Same plugin configuration as root
- Contains only `Welcome.md` (this file)

---

## Related Pages

- [[plan.md]] — Full build pipeline with granular tasks and dependencies
- [[README.md]] — Public-facing project overview with setup instructions
- [[page.tsx]] — App orchestrator (state hub)
- [[aiService.ts]] — Model catalog + WebLLM engine
- [[aiProvider.ts]] — Multi-provider chat completion API
- [[webgpu.ts]] — WebGPU detection + tier suggestion
- [[browser.ts]] — Browser detection utility
- [[MailDetail.tsx]] — Email compose/view with AI Pitch Builder
- [[ChatPanel.tsx]] — AI chat with web search
- [[ResumeScanner.tsx]] — Resume upload + AI analysis
- [[PrivacyDashboard.tsx]] — GPU diagnostics + privacy info
- [[ProviderSettings.tsx]] — AI provider configuration
- [[ThemeProvider.tsx]] — Theme context + persistence
- [[ThemeBackground.tsx]] — Canvas animated backgrounds
- [[ProviderSetupModal.tsx]] — First-run onboarding wizard

---

## Recommendations & Improvements

This section evaluates the current state of SherwinMail and provides actionable recommendations organized by priority and impact.

### 🔴 Critical Issues

#### 1. SMTP Credentials Stored in Plaintext
**Location:** `page.tsx:127`, `localStorage("sherwin_smtp_password")`

The SMTP password is stored and retrieved as raw plaintext. Anyone with access to the browser's DevTools or file system can read it.

**Fix:** Implement the planned `useEncryptedStorage` hook using the Web Crypto API:
```typescript
// Generate a key on first use, store in sessionStorage (cleared on tab close)
const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
// Encrypt before writing to localStorage
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
// Store iv + ciphertext in localStorage
```

#### 2. All State Lives in page.tsx (God Component)
**Location:** `page.tsx:70-137`

`page.tsx` manages 15+ state variables directly. As features grow, this becomes unmaintainable.

**Fix:** Extract state into a Zustand store or React Context:
```typescript
// stores/emailStore.ts
export const useEmailStore = create<EmailStore>((set) => ({
  emails: [],
  currentFolder: "home",
  selectedEmailId: null,
  loadEmails: () => { /* localStorage read */ },
  saveEmails: (emails) => { /* localStorage write + set state */ },
}));
```

#### 3. No Database Layer (localStorage Limits)
localStorage has a ~5MB limit and no query capabilities. Email search (`MailList.tsx:20-27`) does a full linear scan over the array.

**Fix:** Migrate to IndexedDB using a wrapper like `idb` or `dexie`:
```typescript
// db.ts
import Dexie from "dexie";
export const db = new Dexie("SherwinMail");
db.version(1).stores({
  emails: "++id, status, date, from, to, subject",
  drafts: "++id, updatedAt",
  templates: "++id, name, category",
});
```

This unlocks: full-text search, pagination, sorted queries, blob storage for resume files, and exceeds the 5MB limit.

#### 4. AI Service Blocked on Main Thread
**Location:** `aiService.ts:101-329` — Used directly from `ChatPanel.tsx:195`

Only the WebLLM handler runs in a worker (`ai.worker.ts`), but the `AIService` wrapper and mock completions run on the main thread.

**Fix:** Move the entire `AIService` into the worker via `postMessage`:
```typescript
// ai.worker.ts
self.onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type === "chat") {
    const result = await aiService.getChatCompletion(...);
    self.postMessage({ type: "chunk", data: result });
  }
};
```

### 🟠 High Priority

#### 5. No Real SMTP Send
**Location:** `page.tsx:141-168` — Connection test is a `setTimeout` with mock success

The app can configure SMTP but cannot actually send email. The plan references `/api/send` but it's not implemented.

**Fix:** Create `src/app/api/send/route.ts` using `nodemailer`:
```typescript
import nodemailer from "nodemailer";
export async function POST(req: Request) {
  const { host, port, user, pass, to, subject, body } = await req.json();
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from: user, to, subject, text: body });
  return Response.json({ ok: true });
}
```

#### 6. No Error Boundaries
`page.tsx` wraps no component in error boundaries. A crash in any child (e.g., ResumeScanner AI call) blows up the entire app.

**Fix:** Wrap each top-level route view:
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<{fallback: ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}
```
```typescript
// page.tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <ResumeScanner />
</ErrorBoundary>
```

#### 7. Type Safety with `any` Casts
**Location:** `webgpu.ts:126-134`, `aiService.ts:102-103`, `aiProvider.ts:44`

Multiple `as any` casts for WebGPU adapter info, WebLLM engine type, and provider model mappings.

**Fix:** Leverage `@webgpu/types` (already in devDependencies v0.1.70) and create proper WebLLM type declarations:
```typescript
// types/webgpu.d.ts
import "express" from "@webgpu/types";
// types/webllm.d.ts
declare module "@mlc-ai/web-llm" {
  export interface InitProgressReport { text: string; progress: number; }
  export function CreateMLCEngine(modelId: string, opts: { initProgressCallback: (r: InitProgressReport) => void }): Promise<any>;
}
```

#### 8. No Test Coverage
Zero unit or integration tests.

**Fix:** Add Vitest + React Testing Library:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Test priorities:
- `aiService.generateDraftFromJob()` — verify bracket placeholder insertion
- `webgpu.suggestModelTier()` — verify tier mapping at boundary values
- `browser.detectBrowser()` — mock user agents
- `MailDetail` AI Pitch flow — verify body gets populated
- `ResumeScanner` provider blocking — verify WebGPU warning renders

#### 9. No CI/CD Pipeline
No automated quality gates.

**Fix:** Add GitHub Actions workflow:
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

### 🟡 Medium Priority

#### 10. Draft Auto-Save Has No Feedback
**Location:** `MailDetail.tsx:52-63` — `handleFieldChange` saves on every keystroke

Users see "Draft auto-saved" as static text. There's no indication when a save fails or is in progress.

**Fix:** Implement a save state indicator:
```typescript
const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

const handleFieldChange = (field, value) => {
  setSaveState("unsaved");
  clearTimeout(saveTimeout.current);
  saveTimeout.current = setTimeout(() => {
    setSaveState("saving");
    onUpdateEmail({ ...email, ...fields });
    setSaveState("saved");
  }, 500);
};
```

#### 11. No Keyboard Shortcuts
Users must click through every action.

**Add:**
| Shortcut | Action |
|---|---|
| `Ctrl+N` | New draft |
| `Ctrl+Enter` | Send email |
| `Ctrl+R` | Reply |
| `Ctrl+Shift+I` | Focus inbox |
| `Ctrl+Shift+D` | Focus drafts |
| `Escape` | Close detail pane |
| `/` | Focus search |
| `Ctrl+K` | Command palette |

```typescript
// hooks/useKeyboardShortcuts.ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "n") { e.preventDefault(); onCompose(); }
    if (e.key === "Escape") { setSelectedEmailId(null); }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

#### 12. No Cancel for Model Loading
**Location:** `ChatPanel.tsx:96-123` — Once `initEngine` starts, the user can't cancel

Loading a 4GB model takes minutes. Users should be able to abort.

**Fix:** Pass `AbortSignal` to `initEngine`:
```typescript
const abortController = useRef(new AbortController());
const handleLoadModel = async () => {
  abortController.current = new AbortController();
  await aiService.initEngine(model, onProgress, abortController.current.signal);
};
// Cancel button
<button onClick={() => abortController.current.abort()}>Cancel</button>
```

#### 13. No Model Download Progress Persistence
Closing the tab during a model download loses all progress. Large models (Llama 3 8B = 4.7GB) must re-download from scratch.

**Fix:** The WebLLM cache API (`caches.open("webllm")`) can be used to resume downloads. Check `caches.match(modelUrl)` before starting, and display cached status:
```typescript
const cache = await caches.open("webllm");
const cached = await cache.match(modelUrl);
if (cached) { /* resume from cache */ }
```

#### 14. No Import/Export of Settings
Users cannot back up or transfer their provider config, SMTP credentials, or themes.

**Fix:** Add a settings migration section:
```typescript
const exportConfig = () => {
  const data = {
    provider: localStorage.getItem("sherwin_ai_provider"),
    theme: localStorage.getItem("sherwin_theme"),
    smtp: { server, port, user /* not password */ },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "sherwinmail-config.json"; a.click();
};
```

#### 15. Pending State Not Visible During Email Operations
**Location:** `page.tsx:140-168` — Save button shows spinner but no background state indicator

**Fix:** Add a global mutation queue with a visible badge:
```typescript
interface Mutation { type: "save" | "delete" | "send"; status: "pending" | "done" | "error"; }
const [mutations, setMutations] = useState<Mutation[]>([]);
// Show as a small badge in the header
```

### 🔵 Lower Priority

#### 16. AI Provider Auto-Detect is Silent
**Location:** `ProviderSettings.tsx:24-32` — Auto-detect runs silently and overwrites current config without confirmation

**Fix:** Show a confirmation dialog before applying auto-detect results:
```typescript
const handleAutoDetect = async () => {
  const result = await autoDetectProvider();
  if (result && !confirm(`Switch to ${result.config.provider} (${result.config.model})?`)) return;
  // Apply
};
```

#### 17. WebGPU Provider Shows No Model Selection Feedback
**Location:** `ProviderSettings.tsx:116-178` — The model dropdown shows specs but doesn't warn when the selected model exceeds detected VRAM

**Fix:** Gray out models that exceed available VRAM and show a tooltip:
```typescript
const detection = await detectWebGPUSupport();
const maxBufGB = detection.limits?.maxBufferSize / (1024 ** 3) || 0;
const disabled = parseFloat(m.vramRequired) > maxBufGB;
<option disabled={disabled}>...</option>
```

#### 18. No Offline/Online Status Indicator
The app is designed as offline-first but never shows connectivity state.

**Fix:**
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  window.addEventListener("online", () => setIsOnline(true));
  window.addEventListener("offline", () => setIsOnline(false));
}, []);
// Render banner when offline
```

#### 19. Electron/Desktop Wrapper
For users who want a dedicated app without browser tabs.

**Add** `electron-builder` configuration:
```bash
npx create-next-app -e with-electron
```
Features: system tray, native notifications, auto-start, dedicated GPU context.

#### 20. Template Library
Users frequently send similar emails. Add a template system to IndexedDB:
- Save any draft as a template
- Categorize (Cold Outreach, Follow-up, Thank You, Networking)
- Insert template into current draft with one click
- Template variables `{{Name}}`, `{{Company}}` auto-replaced

#### 21. Email Threading
Group replies by normalized subject (`Re:` stripping, `(n)` suffix handling):
```typescript
function normalizeSubject(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*|\[.*?\]\s*)*/i, "").replace(/\s*\(\d+\)\s*$/, "").trim();
}
const threads = emails.reduce((acc, email) => {
  const key = normalizeSubject(email.subject);
  (acc[key] = acc[key] || []).push(email);
  return acc;
}, {} as Record<string, Email[]>);
```

#### 22. Tone Toggle for Email Generation
Let users switch between Formal, Direct, and Creative tones before generating:

```typescript
type Tone = "formal" | "direct" | "creative";
const TONE_PROMPTS: Record<Tone, string> = {
  formal: "Write in a professional, courteous tone with standard business letter structure.",
  direct: "Write concisely and directly. Get straight to the point with clear action items.",
  creative: "Write with personality and flair. Use engaging language that stands out.",
};
```

#### 23. Drag-and-Drop Email Organization
Allow dragging emails between folders (Inbox → Drafts for reply, Drafts → Sent for send).

#### 24. Notification System for New Emails
Even without a server, the app could check for new emails on a timer or via WebSocket (with a backend):
```typescript
let unreadCount = emails.filter(e => e.status === "inbox" && !e.isRead).length;
if (unreadCount > 0 && document.hidden) {
  new Notification(`SherwinMail: ${unreadCount} new message(s)`);
}
```

### 📋 Summary of Recommended Actions

| # | Issue | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | Plaintext SMTP credentials | 🔴 Critical | Small | Security |
| 2 | God component page.tsx | 🔴 Critical | Medium | Maintainability |
| 3 | No database (localStorage) | 🔴 Critical | Large | Performance/Scale |
| 4 | AI on main thread | 🔴 Critical | Medium | Performance |
| 5 | No real SMTP send | 🟠 High | Medium | Core feature gap |
| 6 | No error boundaries | 🟠 High | Small | Stability |
| 7 | Type safety (`any` casts) | 🟠 High | Small | Code quality |
| 8 | No test coverage | 🟠 High | Large | Reliability |
| 9 | No CI/CD | 🟠 High | Small | Quality gates |
| 10 | Draft save feedback | 🟡 Medium | Small | UX |
| 11 | Keyboard shortcuts | 🟡 Medium | Small | UX |
| 12 | Cancel model loading | 🟡 Medium | Small | UX |
| 13 | Download persistence | 🟡 Medium | Large | UX |
| 14 | Import/export settings | 🟡 Medium | Small | Usability |
| 15 | Mutation visibility | 🟡 Medium | Small | UX |
| 16 | Auto-detect confirmation | 🔵 Low | Small | UX |
| 17 | VRAM model warnings | 🔵 Low | Small | UX |
| 18 | Offline indicator | 🔵 Low | Small | UX |
| 19 | Desktop wrapper | 🔵 Low | Large | Distribution |
| 20 | Template library | 🔵 Low | Medium | Feature |
| 21 | Email threading | 🔵 Low | Medium | Feature |
| 22 | Tone toggle | 🔵 Low | Small | Feature |
| 23 | Drag-drop folders | 🔵 Low | Medium | UX |
| 24 | Notifications | 🔵 Low | Medium | Feature |

### Quick Wins (Implement in < 1 hour each)

1. **`any` → proper types** (`webgpu.ts` adapter info, `aiService.ts` engine reference)
2. **Keyboard shortcuts** (Ctrl+N compose, Escape close detail)
3. **Draft save feedback** (saved/saving/unsaved indicator)
4. **Cancel model loading** (AbortController)
5. **Auto-detect confirmation** (confirm() dialog before switching)
6. **Offline status indicator** (navigator.onLine listener)
7. **Error boundaries** around ResumeScanner and ChatPanel

---

## Letting Local AI Models Interact With the Application

Currently, the AI only generates **text** (email drafts, resume improvements, chat responses). It cannot perform actions in the app — it can't create drafts, update settings, send emails, navigate folders, or modify your data. This section covers how to make the local model an **active agent** that can interact with and control the application itself.

### Why This Matters

Right now, when you ask the AI "Create a draft response to the Stripe email about scheduling," it can only **describe** what the draft should contain. You must manually navigate, compose, paste, and send. An interactive AI would:

1. Understand the current app state (what emails exist, what folder you're in)
2. Plan a sequence of actions (navigate to inbox → select email → click reply → fill body → send)
3. Execute those actions through a sandboxed tool system
4. Report back what it did

### Architecture: Tool-Using Local AI

```
User: "Reply to the Stripe email saying I'm available Tuesday at 2pm"
       │
       ▼
┌─────────────────────────────────────────────────┐
│ ChatPanel (modified)                            │
│  1. Inject app state into system prompt         │
│  2. Model responds with tool call (JSON)        │
│  3. Tool executor runs the action               │
│  4. Result fed back to model                    │
│  5. Model confirms to user                      │
└─────────────────────────────────────────────────┘
```

### Step 1: Define a Tool System

Create a tool registry that the AI can call via structured JSON output. Each tool has a name, description, parameters, and an executor function.

```typescript
// utils/tools.ts
export interface Tool {
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string; required?: boolean }[];
  execute: (args: Record<string, any>) => Promise<string>;
}

export const TOOLS: Tool[] = [
  {
    name: "create_draft",
    description: "Create a new email draft in the current mailbox",
    parameters: [
      { name: "to", type: "string", description: "Recipient email address", required: true },
      { name: "subject", type: "string", description: "Email subject line", required: true },
      { name: "body", type: "string", description: "Email body content", required: true },
    ],
    execute: async ({ to, subject, body }) => {
      // Access the email store and create a draft
      const draft: Email = {
        id: `draft-${Date.now()}`,
        subject, to, body,
        from: "you@sherwinmail.io",
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      // This needs access to the store — see architecture below
      useEmailStore.getState().addEmail(draft);
      return `Created draft to ${to} with subject "${subject}"`;
    },
  },
  {
    name: "reply_to_email",
    description: "Create a reply to an existing email by ID",
    parameters: [
      { name: "emailId", type: "string", description: "ID of the email to reply to", required: true },
      { name: "body", type: "string", description: "Reply body content", required: true },
    ],
    execute: async ({ emailId, body }) => {
      const emails = useEmailStore.getState().emails;
      const original = emails.find(e => e.id === emailId);
      if (!original) return `Error: email ${emailId} not found`;
      const reply: Email = {
        id: `draft-${Date.now()}`,
        subject: original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`,
        to: original.from, from: "you@sherwinmail.io",
        body: `${body}\n\nOn ${original.date}, ${original.from} wrote:\n> ${original.body.split("\n").join("\n> ")}`,
        status: "draft", date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      useEmailStore.getState().addEmail(reply);
      return `Created reply to ${original.from} about "${original.subject}"`;
    },
  },
  {
    name: "send_email",
    description: "Send a draft email by ID",
    parameters: [
      { name: "draftId", type: "string", description: "ID of the draft to send", required: true },
    ],
    execute: async ({ draftId }) => {
      const emails = useEmailStore.getState().emails;
      const draft = emails.find(e => e.id === draftId && e.status === "draft");
      if (!draft) return `Error: draft ${draftId} not found`;
      useEmailStore.getState().updateEmail(draftId, { status: "sent", date: new Date().toLocaleDateString() });
      // In future: also call /api/send for real SMTP delivery
      return `Sent email to ${draft.to} with subject "${draft.subject}"`;
    },
  },
  {
    name: "navigate_to",
    description: "Navigate to a different folder or view",
    parameters: [
      { name: "folder", type: "string", description: "Target folder: inbox, draft, sent, chat, resume, settings, home", required: true },
    ],
    execute: async ({ folder }) => {
      const validFolders = ["inbox", "draft", "sent", "chat", "resume", "settings", "home"];
      if (!validFolders.includes(folder)) return `Error: invalid folder "${folder}"`;
      useEmailStore.getState().setCurrentFolder(folder as MailFolder);
      return `Navigated to ${folder}`;
    },
  },
  {
    name: "search_emails",
    description: "Search across all emails by keyword",
    parameters: [
      { name: "query", type: "string", description: "Search keyword or phrase", required: true },
    ],
    execute: async ({ query }) => {
      const emails = useEmailStore.getState().emails;
      const results = emails.filter(e =>
        e.subject.toLowerCase().includes(query.toLowerCase()) ||
        e.body.toLowerCase().includes(query.toLowerCase()) ||
        e.from.toLowerCase().includes(query.toLowerCase())
      );
      if (results.length === 0) return "No matching emails found";
      return results.map(e => `[${e.status}] ${e.subject} — ${e.from} (${e.date})`).join("\n");
    },
  },
  {
    name: "get_app_state",
    description: "Get the current application state (current folder, email counts, active email)",
    parameters: [],
    execute: async () => {
      const state = useEmailStore.getState();
      const inboxUnread = state.emails.filter(e => e.status === "inbox" && !e.isRead).length;
      const draftCount = state.emails.filter(e => e.status === "draft").length;
      return `Current folder: ${state.currentFolder} | Inbox unread: ${inboxUnread} | Drafts: ${draftCount} | Emails selected: ${state.selectedEmailId ? "yes" : "no"}`;
    },
  },
  {
    name: "delete_email",
    description: "Delete an email or draft by ID",
    parameters: [
      { name: "emailId", type: "string", description: "ID of the email to delete", required: true },
    ],
    execute: async ({ emailId }) => {
      useEmailStore.getState().deleteEmail(emailId);
      return `Deleted email ${emailId}`;
    },
  },
  {
    name: "update_draft",
    description: "Update fields of an existing draft",
    parameters: [
      { name: "draftId", type: "string", description: "ID of the draft to update", required: true },
      { name: "to", type: "string", description: "New recipient (optional)" },
      { name: "subject", type: "string", description: "New subject (optional)" },
      { name: "body", type: "string", description: "New body (optional)" },
    ],
    execute: async ({ draftId, ...fields }) => {
      useEmailStore.getState().updateEmail(draftId, fields);
      return `Updated draft ${draftId}`;
    },
  },
  {
    name: "change_settings",
    description: "Change application settings (theme, provider, SMTP)",
    parameters: [
      { name: "setting", type: "string", description: "Setting name: theme, provider, smtp_server, smtp_port", required: true },
      { name: "value", type: "string", description: "New value for the setting", required: true },
    ],
    execute: async ({ setting, value }) => {
      // Map to actual settings changes
      if (setting === "theme") {
        useTheme.getState().setTheme(value as ThemeName);
        return `Theme changed to ${value}`;
      }
      if (setting === "provider") {
        useProviderStore.getState().setProvider(value);
        return `Provider changed to ${value}`;
      }
      return `Setting "${setting}" not yet supported for AI changes`;
    },
  },
  {
    name: "generate_and_create_draft",
    description: "Analyze a job description and create a complete outreach draft",
    parameters: [
      { name: "jobDescription", type: "string", description: "The full job description text", required: true },
      { name: "recipientEmail", type: "string", description: "Recipient email address", required: true },
      { name: "companyName", type: "string", description: "Company name (optional)" },
      { name: "hiringManager", type: "string", description: "Hiring manager name (optional)" },
    ],
    execute: async ({ jobDescription, recipientEmail, companyName, hiringManager }) => {
      // Parse job description, generate draft, and create it — all in one step
      const subject = `Application for ${extractJobTitle(jobDescription) || "[Job Title]"} position`;
      const body = aiService.generateDraftFromJob(jobDescription, subject);
      const draft = {
        id: `draft-${Date.now()}`,
        subject: companyName ? `[${companyName}] ${subject}` : subject,
        to: recipientEmail, from: "you@sherwinmail.io",
        body, status: "draft" as const,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      useEmailStore.getState().addEmail(draft);
      return `Created outreach draft to ${recipientEmail} about ${companyName || "the position"}. Navigate to Drafts to review and send.`;
    },
  },
  {
    name: "analyze_resume",
    description: "Run AI analysis on the current resume content in the Resume Scanner",
    parameters: [
      { name: "focus", type: "string", description: "What to focus on: 'ats', 'strengths', 'gaps', 'full'", required: false },
    ],
    execute: async ({ focus = "full" }) => {
      // Trigger resume analysis (requires ResumeScanner to have content loaded)
      return `Resume analysis triggered with focus: ${focus}. Open Resume Scanner to see results.`;
    },
  },
];
```

### Step 2: Inject App State Into the System Prompt

The model needs to know what's in the app to act on it. Before each user message, inject a serialized snapshot:

```typescript
// utils/stateContext.ts
function buildAppContext(): string {
  const state = useEmailStore.getState();
  const emails = state.emails.slice(0, 20); // Limit to avoid token overflow
  const emailList = emails.map(e =>
    `[${e.id}] ${e.status.toUpperCase()} | ${e.subject || "(no subject)"} | ${e.from} → ${e.to} | ${e.date}${e.isRead ? "" : " (UNREAD)"}`
  ).join("\n");

  return `## Application State
Current folder: ${state.currentFolder}
Total emails: ${state.emails.length}
${emailList ? `Recent emails:\n${emailList}` : "No emails yet."}

## Available Tools
${TOOLS.map(t =>
  `- ${t.name}: ${t.description}
  Parameters: ${t.parameters.map(p => `${p.name} (${p.type})${p.required ? " *required" : ""}: ${p.description}`).join(", ")}`
).join("\n")}

## Instructions
You are an AI assistant that can control this email application.
When the user asks you to perform an action, respond with a JSON tool call in this format:
{"tool": "tool_name", "args": {"param1": "value1"}}
You can call multiple tools sequentially if needed.
If you need more information before acting, ask the user.
When the user asks a question that doesn't need a tool call, answer normally.`;
}
```

### Step 3: Modify ChatPanel to Route Tool Calls

```typescript
// In ChatPanel.tsx — modified handleSendMessage
const handleSendMessage = async (text: string) => {
  // ... existing message setup ...

  // Build the full prompt with app state
  const contextPrompt = buildAppContext();

  // Get AI response
  const response = await getChatCompletion({
    messages: [
      { role: "system", content: contextPrompt },
      ...chatMessages,
    ],
    onChunk: (chunk) => setStreamingText(chunk),
  });

  // Check if response contains a tool call (JSON block)
  const toolMatch = response.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
  if (toolMatch) {
    const toolName = toolMatch[1];
    const args = JSON.parse(toolMatch[2]);
    const tool = TOOLS.find(t => t.name === toolName);
    if (tool) {
      const result = await tool.execute(args);
      // Feed result back to model for confirmation
      const confirmation = await getChatCompletion({
        messages: [
          { role: "system", content: contextPrompt },
          { role: "assistant", content: response },
          { role: "user", content: `Tool "${toolName}" returned: ${result}. Summarize what was done.` },
        ],
        onChunk: ...,
      });
      setMessages(prev => [...prev, { role: "assistant", content: confirmation }]);
    }
  }
};
```

### Step 4: Zustand Store for Accessible State

For tools to work, state must be accessible outside React components. Extract from `page.tsx` into a Zustand store:

```typescript
// stores/emailStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EmailStore {
  emails: Email[];
  currentFolder: MailFolder;
  selectedEmailId: string | null;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setCurrentFolder: (folder: MailFolder) => void;
  setSelectedEmailId: (id: string | null) => void;
}

export const useEmailStore = create<EmailStore>()(
  persist(
    (set) => ({
      emails: DEFAULT_EMAILS,
      currentFolder: "home",
      selectedEmailId: null,
      addEmail: (email) => set((s) => ({ emails: [email, ...s.emails] })),
      updateEmail: (id, updates) => set((s) => ({
        emails: s.emails.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),
      deleteEmail: (id) => set((s) => ({
        emails: s.emails.filter((e) => e.id !== id),
        selectedEmailId: s.selectedEmailId === id ? null : s.selectedEmailId,
      })),
      setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmailId: null }),
      setSelectedEmailId: (id) => set({ selectedEmailId: id }),
    }),
    { name: "sherwin_emails" }
  )
);
```

Now tools can import `useEmailStore.getState()` from anywhere — even outside React.

### Step 5: Local RAG for Personalization

Let the AI search through your **own data** (past emails, saved drafts, resume content) to personalize responses:

```typescript
// utils/localRag.ts
import { pipeline } from "@xenova/transformers";

class LocalRAG {
  private extractor: any = null;

  async initialize() {
    this.extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  async search(query: string, documents: string[], topK = 3): Promise<string[]> {
    // Generate embeddings locally
    const queryEmbedding = await this.extractor(query, { pooling: "mean", normalize: true });
    const docEmbeddings = await Promise.all(
      documents.map(d => this.extractor(d, { pooling: "mean", normalize: true }))
    );

    // Cosine similarity search
    const scored = docEmbeddings.map((emb, i) => ({
      index: i,
      score: cosineSimilarity(queryEmbedding.data, emb.data),
    }));
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(s => documents[s.index]);
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

Add a tool that uses this:

```typescript
{
  name: "search_past_emails_semantic",
  description: "Semantic search through your past emails to find relevant context",
  parameters: [
    { name: "query", type: "string", description: "What to search for (natural language)", required: true },
  ],
  execute: async ({ query }) => {
    const emails = useEmailStore.getState().emails;
    const docs = emails.map(e => `Subject: ${e.subject}\nFrom: ${e.from}\nBody: ${e.body}`);
    const rag = new LocalRAG();
    await rag.initialize();
    const results = await rag.search(query, docs);
    return results.join("\n---\n");
  },
}
```

### Step 6: Agentic Workflows (Multi-Step Planning)

For complex requests like "Draft a follow-up to every company I applied to last week that hasn't replied," the AI needs to plan and execute multiple steps:

```typescript
// utils/agent.ts
class Agent {
  async run(task: string, maxSteps = 10): Promise<string> {
    let context = buildAppContext();
    let steps: string[] = [];

    for (let i = 0; i < maxSteps; i++) {
      const response = await getChatCompletion({
        messages: [
          { role: "system", content: context + "\nPlan your next action. You must respond with a tool call JSON." },
          { role: "user", content: task },
          ...steps.map(s => ({ role: "assistant" as const, content: s })),
        ],
      });

      const toolCall = parseToolCall(response);
      if (!toolCall) {
        // Model decided it's done — return final answer
        return response;
      }

      const result = await toolCall.tool.execute(toolCall.args);
      steps.push(response);
      steps.push(`Result: ${result}`);

      context += `\nStep ${i + 1} result: ${result}`;
    }

    return "Task completed or reached maximum steps.";
  }
}
```

### Step 7: Voice Input for Local AI

Since everything runs locally, add speech-to-text using the Web Speech API:

```typescript
// hooks/useVoiceInput.ts
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-US";

    recognition.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Send to chat as if typed
      handleSendMessage(transcript);
    };

    recognition.current.start();
    setIsListening(true);

    recognition.current.onend = () => setIsListening(false);
  };

  return { isListening, startListening };
}

// In ChatPanel — add a mic button next to the input
<button onClick={startListening} className={isListening ? "text-red-400" : "text-slate-500"}>
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
</button>
```

### Step 8: Scheduled / Automated Email Actions

Allow the AI to set up recurring or trigger-based actions using the system task scheduler:

```typescript
{
  name: "schedule_action",
  description: "Schedule an automated email action for later",
  parameters: [
    { name: "trigger", type: "string", description: "When to run: 'daily', 'weekly', 'in 2 hours', or 'when email from X arrives'", required: true },
    { name: "action", type: "string", description: "Description of what to do", required: true },
  ],
  execute: async ({ trigger, action }) => {
    // Store in IndexedDB scheduled tasks table
    await db.scheduledTasks.add({ trigger, action, createdAt: new Date(), enabled: true });
    return `Scheduled action "${action}" to run ${trigger}`;
  },
}
```

### Step 9: AI-Configurable Rules Engine

Users should be able to create if-this-then-that rules through natural language:

```
User: "Whenever I get an email from a recruiter about a React job, auto-create a draft reply"
AI: "Rule created: [INCOMING EMAIL contains 'react' AND from matches recruiter domain] → [CREATE DRAFT with template 'react-outreach']"
```

```typescript
// utils/ruleEngine.ts
interface Rule {
  id: string;
  condition: {
    field: "from" | "subject" | "body";
    operator: "contains" | "matches" | "starts_with";
    value: string;
  };
  action: {
    type: "create_draft" | "send_notification" | "apply_label" | "forward";
    params: Record<string, string>;
  };
  enabled: boolean;
}

export class RuleEngine {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
    // Persist to IndexedDB
    db.rules.put(rule);
  }

  evaluate(email: Email) {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const fieldValue = email[rule.condition.field as keyof Email] as string;
      const matches = this.matchField(fieldValue, rule.condition);
      if (matches) {
        this.executeAction(rule.action, email);
      }
    }
  }

  private matchField(value: string, condition: Rule["condition"]): boolean {
    switch (condition.operator) {
      case "contains": return value.toLowerCase().includes(condition.value.toLowerCase());
      case "starts_with": return value.toLowerCase().startsWith(condition.value.toLowerCase());
      case "matches": return new RegExp(condition.value, "i").test(value);
    }
  }

  private executeAction(action: Rule["action"], email: Email) {
    if (action.type === "create_draft") {
      const draft = { /* ... */ };
      useEmailStore.getState().addEmail(draft);
    }
    if (action.type === "send_notification") {
      new Notification(`Rule triggered: ${action.params.message}`);
    }
  }
}
```

### Step 10: Natural Language Command Parser (Hybrid Approach)

For models that don't support structured JSON tool calling reliably, use a parser layer:

```typescript
// utils/nlpCommands.ts
const COMMAND_PATTERNS = [
  {
    pattern: /(?:create|make|write)\s+(?:a|an|new)\s+draft\s+(?:to|for)\s+(\S+@\S+)\s+(?:about|with subject|regarding)\s+(.+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "create_draft",
      args: { to: match[1], subject: match[2], body: "" },
    }),
  },
  {
    pattern: /(?:reply|respond)\s+(?:to|on)\s+(?:the\s+)?(?:(?:email|thread)\s+)?(?:from\s+)?(\S+@\S+|"(.+?)")\s+(?:saying|with)\s+(.+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "reply_to_email",
      args: { emailQuery: match[1] || match[2], body: match[3] },
    }),
  },
  {
    pattern: /(?:go\s+(?:to|into)|navigate\s+(?:to|into)|open|show)\s+(?:the\s+)?(\w+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "navigate_to",
      args: { folder: match[1].toLowerCase() },
    }),
  },
  {
    pattern: /(?:send|deliver|fire\s+off)\s+(?:the\s+)?draft\s+(?:titled|with subject|about)\s+(.+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "send_email",
      args: { subjectQuery: match[1] },
    }),
  },
  {
    pattern: /(?:find|search|look\s+up)\s+(?:emails?\s+)?(?:about|regarding|with|containing)\s+(.+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "search_emails",
      args: { query: match[1] },
    }),
  },
  {
    pattern: /(?:change|switch|set)\s+(?:the\s+)?theme\s+(?:to\s+)?(\w+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "change_settings",
      args: { setting: "theme", value: match[1].toLowerCase() },
    }),
  },
  {
    pattern: /(?:delete|remove|trash)\s+(?:the\s+)?(?:email|draft)\s+(?:titled|with subject|about)\s+(.+)/i,
    execute: (match: RegExpMatchArray) => ({
      tool: "delete_email",
      args: { subjectQuery: match[1] },
    }),
  },
];

export function parseCommand(text: string): { tool: string; args: Record<string, any> } | null {
  for (const { pattern, execute } of COMMAND_PATTERNS) {
    const match = text.match(pattern);
    if (match) return execute(match);
  }
  return null; // No match — pass through to normal chat
}
```

### Putting It All Together: The Interactive AI Flow

```
User: "Reply to the Stripe interview email. I'm available next Tuesday at 2pm."

  1. [System] Injects app state + tool definitions into prompt
  2. [Model] Detects intent → emits tool call:
     {"tool": "get_app_state", "args": {}}
  3. [System] Returns current folder, emails list
  4. [Model] Finds Stripe email ID → emits:
     {"tool": "reply_to_email", "args": {"emailId": "inbox-2", "body": "Hi there,\n\nI'm available next Tuesday at 2pm. Please let me know if that works.\n\nBest,\n[Your Name]"}}
  5. [System] Creates reply draft in Drafts folder → "Created reply..."
  6. [Model] Confirms: "I've created a draft reply to HR at Stripe offering Tuesday at 2pm. Navigate to Drafts to review and send."
```

### Extension: Local Model Fine-Tuning for Application-Specific Tasks

For even better performance, fine-tune a small local model (e.g., Qwen 2.5 1.5B) on a dataset of application-specific tool calls:

```
Training example:
  User: "send the draft about the react position"
  Assistant: {"tool": "send_email", "args": {"subjectQuery": "react position"}}

Dataset can be built by logging user interactions and their corresponding tool calls.
Use LoRA fine-tuning with `unsloth` or `llama.cpp` to produce a `.gguf` file that can be loaded via WebLLM.
```

### Comparison: Current vs. Interactive AI

| Capability | Current State | With Tool System |
|---|---|---|
| Create draft | AI describes what to write → user copies manually | AI creates draft directly in Drafts folder |
| Reply to email | User must navigate, click Reply, paste AI text | AI identifies the email and creates a reply draft |
| Navigate folders | User clicks sidebar | AI navigates on command |
| Send email | User clicks Send button manually | AI triggers send via tool |
| Search | User types in search box | AI searches and returns results inline |
| Multi-step tasks | User does each step manually | AI plans and executes multiple tool calls |
| Settings changes | User opens Settings and edits fields | AI changes theme/provider on command |
| Scheduled actions | Not possible | AI creates rules in the scheduler |
| Resume analysis | User opens Scanner and clicks buttons | AI triggers analysis from chat |
| Voice control | Not possible | Web Speech API input to AI |

---

## Implementation History

### PR 1 — Zustand State Extraction + Tool-Using AI System (2026-07-03)

Extracted scattered `useState` patterns into persisted Zustand stores and implemented a tool-using AI architecture. Files:

| File | Purpose |
|------|---------|
| `src/stores/emailStore.ts` | Email state: list, current folder, selection, compose, reply; persisted to `localStorage` |
| `src/stores/smtpStore.ts` | SMTP config: provider presets (ProtonMail, Gmail, Custom), credentials; persisted to `localStorage` |
| `src/utils/tools.ts` | 10-tool registry: `create_draft`, `reply_to_email`, `send_email`, `navigate_to`, `search_emails`, `get_app_state`, `delete_email`, `update_draft`, `change_setting`, `generate_and_create_draft`. Each tool has typed parameters, a description, and an async executor. Includes `parseToolCall()` for both raw JSON and markdown ` ```json ` code block formats |
| `src/utils/stateContext.ts` | `buildAppContext()` — serialises current app state (folder, email counts, SMTP config) and all tool definitions into a system-prompt string the AI can consume |
| `src/app/page.tsx` | Replaced `useState` for emails (list, folder, selection, compose, reply) and SMTP with Zustand store hooks. Removed ~60 lines of state boilerplate. Initialises provider setup modal via lazy `useState` (no effect). |
| `src/components/ChatPanel.tsx` | After AI responds, checks output for a JSON tool call via `parseToolCall()`; if found, routes to `executeToolAndSummarize()` which runs the tool then asks the AI to generate a human-readable summary, streaming it into the message pane |

**Key decisions:**

- **Zustand over React Context** — tools need `getState()` outside the component tree (e.g., from inside executor functions)
- **Plain JSON tool calls** instead of function-calling API — works with every local model, no provider-specific bindings
- **`executeToolAndSummarize` pattern** — raw JSON is never shown to the user; the AI summarises the outcome in natural language
- **`APP_KEYWORDS` heuristic** — action-oriented queries (e.g. "send", "compose", "draft") trigger app-context injection; general queries fall back to web search
- **`[\s\S]` over `/s` flag** — project targets ES2017 which does not support the `dotAll` regex flag

### Getting Started Checklist for Interactive AI

- [x] **1. Extract state into Zustand** (remove direct `useState` from `page.tsx`)
- [x] **2. Create `utils/tools.ts`** with the tool registry
- [x] **3. Create `utils/stateContext.ts`** for building the system prompt context
- [x] **4. Modify `ChatPanel.tsx`** to detect and route tool calls
- [ ] **5. Add `useVoiceInput` hook** for speech-to-text
- [ ] **6. Implement NLP command parser** as fallback for non-JSON models
- [ ] **7. Build the Rule Engine** for automated triggers
- [ ] **8. Add Local RAG** with `@xenova/transformers` for semantic search
- [ ] **9. Create agentic workflow loop** for multi-step tasks
- [ ] **10. Test with smaller models first** (Qwen 2.5 0.5B) before scaling up

---

### PR 2 — Bug Fixes: Undefined References, Duplicate Keys, Dead Code (2026-07-12)

Fixed 4 bugs that caused runtime errors or code quality issues:

| Bug | File | Root Cause | Fix |
|-----|------|------------|-----|
| `encryptPassword()` undefined | `src/stores/smtpStore.ts:53-57` | Called a function that was never defined or imported — threw `ReferenceError` on every password save, silently caught by `.catch()` | Removed the broken `encryptPassword()` call entirely. Will be properly implemented in the encryption phase using Web Crypto API. |
| `hasLoaded` undefined | `src/app/page.tsx:103-111` | Referenced in `useEffect` dependency array and condition, but never declared as state/ref — threw `ReferenceError` at runtime | Deleted the entire duplicate `useEffect` block. The `useState` lazy initializer on lines 51-56 already handles first-run provider setup detection. |
| Duplicate `description`/`parameters` | `src/utils/tools.ts` (all 10 tools) | Every tool object had `description` and `parameters` written twice — second pair silently overwrote the first in JS object literals. Copy-paste artifact from when shorter stubs were replaced with detailed versions. | Removed the first (shorter) `description`/`parameters` pair on each tool, keeping only the second (better) version. Reduced file from 329 to 291 lines. |
| Dead code after early return | `src/utils/stateContext.ts:28-59` | `buildAppContext()` had two `return` statements — the second block (lines 28-59) was unreachable dead code left over from a refactor | Deleted the unreachable second implementation block. Reduced file from 60 to 28 lines. |

**Files changed:** `src/stores/smtpStore.ts`, `src/app/page.tsx`, `src/utils/tools.ts`, `src/utils/stateContext.ts`

**Verification:** TypeScript compiles cleanly (`tsc --noEmit`). ESLint shows only pre-existing warnings unrelated to these changes.

### PR 3 — SMTP Password Encryption with Web Crypto API (2026-07-12)

Implemented AES-256-GCM encryption for SMTP credentials using the browser's native Web Crypto API. Passwords are now encrypted at rest in localStorage and the encryption key lives only in sessionStorage (cleared when the tab closes).

| File | Purpose |
|------|---------|
| `src/utils/encryption.ts` | Core encryption module: `encryptPassword(plaintext)` and `decryptPassword(encrypted)` using AES-256-GCM. Key is generated on first use, stored in `sessionStorage` as raw bytes (base64-encoded). IV is 12 bytes, prepended to ciphertext. |
| `src/hooks/useEncryptedStorage.ts` | React hook wrapping `encryptPassword`/`decryptPassword` for component-level encrypted localStorage reads/writes. Returns `{ value, isLoaded, set, remove }`. Handles decryption failures gracefully (clears stale data). |
| `src/stores/smtpStore.ts` | Restored `encryptPassword()` call in `setSmtpPassword` — now imports the real implementation from `@/utils/encryption`. Passwords are encrypted before writing to `sherwin_smtp_encrypted` in localStorage. Also resolved nested merge conflict markers. |
| `src/utils/tools.ts` | Resolved 10 nested merge conflict blocks (one per tool definition). Wrote clean version with single `description`/`parameters` per tool. |
| `src/app/page.tsx` | Resolved merge conflict markers around the removed `hasLoaded` useEffect block. |

**Security model:**
- **Encryption key** → `sessionStorage` (exists only while tab is open, wiped on close)
- **Ciphertext** → `localStorage` (persists across sessions, unreadable without the key)
- **Each encrypt call** generates a fresh 12-byte IV (no nonce reuse)
- **AES-256-GCM** provides both confidentiality and integrity (authentication tag)

**Verification:** TypeScript compiles cleanly. ESLint shows only pre-existing warnings.

### PR 4 — Real SMTP Send via Nodemailer (2026-07-12)

Replaced simulated SMTP with real email delivery through a server-side API route using `nodemailer`. The `send_email` AI tool now attempts actual SMTP delivery when configured.

| File | Change |
|------|--------|
| `src/app/api/send/route.ts` | **New.** POST endpoint accepting `{ host, port, user, pass, from, to, subject, text, html }`. Creates a `nodemailer` transporter, calls `sendMail()`. Returns `{ ok: true }` or `{ ok: false, error: "..." }`. 10s connection timeout, 5s greeting timeout. |
| `src/stores/smtpStore.ts` | Added `sendEmail(to, subject, text)` action that calls `POST /api/send`. Replaced simulated `saveAndTest()` (`setTimeout` fake) with a real test: sends a test email to the user's own address. |
| `src/utils/tools.ts` | `send_email` tool now calls `POST /api/send` if SMTP is configured. Reports whether delivery succeeded or failed. Falls back to marking status only when no SMTP is configured. |
| `package.json` | Added `nodemailer` (^7.0.5) + `@types/nodemailer` (dev). |

**Flow:**
1. User configures SMTP in Settings (provider, server, port, credentials)
2. "Save & Test Connection" sends a test email to their own address via `/api/send`
3. AI tool `send_email` marks draft as sent AND attempts SMTP delivery
4. Response clearly states whether email was actually delivered or just marked locally

### PR 5 — Voice Input (2026-07-12)

Added browser-based voice input via the Web Speech API (`SpeechRecognition`). Users click a mic button to dictate messages into the chat input.

| File | Change |
|------|--------|
| `src/hooks/useVoiceInput.ts` | **New.** Custom React hook wrapping `webkitSpeechRecognition`. Returns `{ isListening, transcript, isSupported, error, startListening, stopListening }`. Supports interim results. Handles `no-speech` and `not-allowed` errors with clear messages. Cleans up on unmount. |
| `src/types/speech.d.ts` | **New.** TypeScript declarations for `SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`, and related interfaces on `Window`. |
| `src/components/ChatPanel.tsx` | Imported `useVoiceInput`. Added mic button (mic icon / stop icon with `animate-pulse` + red background when active) between the attach button and the text input. Transcript is appended to `inputValue` when finalized. Error banner shown above the input when recognition fails. |

**Behavior:**
- Mic button only appears if the browser supports `SpeechRecognition`
- Click to start → button turns red and pulses
- Speech is transcribed in real-time (interim results) and appended to the input
- User reviews the transcribed text before pressing Send
- No auto-send — user stays in control

### PR 6 — NLP Command Parser (2026-07-12)

Added a regex-based natural language parser as a fallback when local models can't produce JSON tool calls. Enables basic command understanding even with models that ignore formatting instructions.

| File | Change |
|------|--------|
| `src/utils/nlpParser.ts` | **New.** Pure function `parseNlpCommand(text)` → `{ toolName, args } \| null`. Regex patterns for 12 intents: `navigate`, `create_draft`, `search_emails`, `send_email`, `update_draft`, `delete_email`, `mark_read/unread`, `star/unstar`, `reply_email`, `schedule_send`, `view_email`. Extracts email addresses, subjects, body text, search queries, and folder names from natural language. |
| `src/utils/tools.ts` | `parseToolCall()` now falls back to `parseNlpCommand()` after JSON and markdown block parsing fail. Imported `parseNlpCommand`. |

**Examples:**
| User says | Parsed as |
|-----------|-----------|
| "draft an email to alice@example.com about the meeting" | `create_draft` with `to`, `subject` |
| "search emails from sarah" | `search_emails` with query |
| "go to sent" | `navigate` with `folder: "sent"` |
| "send the draft about project update" | `send_email` with query |
| "star email about invoice" | `star_email` with query |
| "reply to the last email saying sounds good" | `reply_email` with body |

**Limitations:** Designed for common phrasings. Complex multi-step or ambiguous commands still require the AI model. No context/memory across turns.

### PR 7 — Rule Engine: If-This-Then-That Automation (2026-07-12)

Added a rule engine that lets users create automation rules through natural language via the AI chat. Rules evaluate incoming emails against conditions and execute actions.

| File | Change |
|------|--------|
| `src/types/rule.ts` | **New.** Type definitions: `Rule`, `RuleCondition` (field/operator/value), `RuleAction` (type + params). Supports 6 operators (`contains`, `not_contains`, `equals`, `starts_with`, `ends_with`, `matches`/regex) and 6 action types (`create_draft`, `mark_read`, `star`, `delete`, `move_to_folder`, `send_notification`). |
| `src/stores/ruleStore.ts` | **New.** Zustand store persisted to `sherwin_rules`. Actions: `addRule`, `updateRule`, `removeRule`, `toggleRule`, `getEnabledRules`. |
| `src/utils/ruleEngine.ts` | **New.** `processEmail(email)` evaluates all enabled rules against an email. `evaluateAllRules()` runs all rules against all inbox emails. Supports AND/OR logic across multiple conditions per rule. |
| `src/utils/tools.ts` | Added 3 new AI tools: `create_rule` (creates a rule from structured params), `list_rules` (shows all rules + trigger counts), `run_rules` (manually evaluates all rules). |

**Example conversation:**
```
User: "When I get an email from a recruiter about React, auto-create a draft reply"
AI:   [calls create_rule] → Rule "Recruiter React" created: when [from contains "recruiter" AND subject contains "react"] → [create_draft]
```

### PR 8 — Vitest Test Suite + GitHub Actions CI (2026-07-12)

Added 32 unit tests across 3 test files covering the NLP parser, rule engine, and tool call parser. CI runs lint + test + build on push/PR.

| File | Change |
|------|--------|
| `vitest.config.ts` | **New.** Vitest config with jsdom environment, React plugin, `@/` path alias. |
| `src/__tests__/setup.ts` | **New.** Mocks `localStorage` for jsdom (zustand persist). |
| `src/__tests__/nlpParser.test.ts` | **New.** 19 tests: navigate, create_draft, search, send, update, delete, mark_read/unread, star/unstar, reply, null for unknown input. |
| `src/__tests__/ruleEngine.test.ts` | **New.** 6 tests: condition matching, disabled rules, any/all logic, regex operator, trigger count increment. |
| `src/__tests__/tools.test.ts` | **New.** 7 tests: JSON parsing, markdown blocks, extra text, malformed JSON, NLP fallback. |
| `.github/workflows/ci.yml` | **New.** GitHub Actions: checkout → setup-node → npm ci → lint → test → build. Runs on push to main/jp-plans- and PRs to main. |
| `package.json` | Added `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`. Added `test` and `test:watch` scripts. |

### PR 9 — Interactive Onboarding Tutorial (2026-07-12)

Added an 8-step interactive tutorial overlay that appears on first visit. Users can replay it anytime from Settings.

| File | Change |
|------|--------|
| `src/components/Tutorial.tsx` | **New.** Full-screen modal with 8 steps: Welcome, AI Provider, Compose/Manage, Voice Input, NLP Commands, SMTP Setup, Automation Rules, Get Started. Progress bar, dot indicators, back/next/skip navigation. |
| `src/stores/tutorialStore.ts` | **New.** Zustand store persisted to `sherwin_tutorial`. Tracks `completed` boolean and `currentStep`. Actions: `setStep`, `complete`, `reset`. |
| `src/app/page.tsx` | Imported `Tutorial` and `useTutorialStore`. Renders `<Tutorial />` on first load. Added "Replay Tutorial" button in Settings section that calls `reset()`. |
