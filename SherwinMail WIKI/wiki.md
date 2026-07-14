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
  - wiki
---
# SherwinMail Wiki

> **Privacy-Centric AI Email Orchestrator** — An offline-first, in-browser web application that runs large language models entirely on-device via WebGPU to automate professional email outreach, resume analysis, and job application workflows.

| Attribute | Value |
|---|---|
| **Stack** | Next.js 16.2.9 (App Router) + Tailwind CSS 4 + TypeScript 5 |
| **AI Engine** | `@mlc-ai/web-llm` v0.2.84 (WebGPU) |
| **AI Providers** | WebGPU, Ollama, LM Studio, API Key (OpenAI/Anthropic-compatible) |
| **PDF Parsing** | `pdf-parse` v2.4.5 with `pdfjs-dist` v5.4.296 |
| **State Management** | Zustand with `persist` middleware (localStorage) |
| **Deployment Target** | Static export / Vercel / PWA |
| **Package Manager** | npm |
| **Lint** | ESLint (config: `eslint.config.mjs`) |

---

## Architecture

SherwinMail uses a **hybrid in-browser AI strategy** with no backend dependency for inference. State is managed by Zustand stores with `persist` middleware, making it accessible both inside and outside the React tree.

### Data Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ page.tsx (App Orchestrator)                         │
│  - State from Zustand stores (emailStore, smtpStore)│
│  - First-run detection → ProviderSetupModal         │
│  - Routing: home|inbox|draft|sent|chat|resume       │
│  - SMTP connection config via smtpStore             │
└────┬────────────┬──────────────┬────────────────────┘
     │            │              │
     ▼            ▼              ▼
  MailList     MailDetail    ChatPanel /
  MailSidebar               ResumeScanner
     │            │              │           │
     ▼            ▼              ▼           ▼
  Zustand      AI Service   AI Provider   stateContext.ts
  Stores       (WebGPU)    (Ollama/API)   → tools.ts
  (persist)                               → executor
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
│   └── wiki.md                     # ← You are here
├── .env.example                    # Google OAuth env vars template (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)
├── public/
│   └── sw.js                       # Service worker: cache-first strategy for PWA offline support
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── google/route.ts # GET — Google OAuth redirect + ?check=1 config probe
│   │   │   ├── extract/route.ts    # POST — PDF text extraction via pdf-parse
│   │   │   └── search/route.ts     # POST — Web search for context
│   │   ├── globals.css             # Global styles + Tailwind directives
│   │   ├── layout.tsx              # Root layout (HTML shell + metadata + ServiceWorkerRegistration)
│   │   ├── login/
│   │   │   └── page.tsx            # Login page (email/password + Google OAuth)
│   │   ├── register/
│   │   │   └── page.tsx            # Registration page (2-step: register → verify)
│   │   └── page.tsx                # App orchestrator (state hub, auth guard, routing)
│   ├── components/
│   │   ├── AppearanceSettings.tsx  # Theme picker (6 themes)
│   │   ├── BrowserWebGPUHelp.tsx   # Per-browser WebGPU enable steps
│   │   ├── ChatPanel.tsx           # General AI chat + web search + engine init
│   │   ├── ErrorBoundary.tsx       # Reusable React error boundary with fallback UI
│   │   ├── ErrorModal.tsx          # Structured error display modal
│   │   ├── MailDetail.tsx          # Email compose/view/edit + AI Pitch Builder
│   │   ├── MailList.tsx            # Email list pane with virtualization + threading
│   │   ├── MailSidebar.tsx         # Folder navigation sidebar + AI Models link
│   │   ├── ModelRecommendations.tsx# Tier-based model browser + Ollama/LM Studio download buttons
│   │   ├── PrivacyBanner.tsx       # Zero-data-transfer banner
│   │   ├── PrivacyDashboard.tsx    # GPU diagnostics + hardware info + tier suggestion
│   │   ├── ProviderSettings.tsx    # AI provider config (4 providers)
│   │   ├── ProviderSetupModal.tsx  # First-run onboarding wizard
│   │   ├── ResumeScanner.tsx       # Resume upload (PDF/image) + AI analysis chat + PDF export
│   │   ├── ResumePDF.tsx           # @react-pdf/renderer PDF generation for enhanced resumes
│   │   ├── ServiceWorkerRegistration.tsx # PWA service worker registration
│   │   ├── SystemTaskScheduler.tsx # Periodic maintenance tasks
│   │   ├── ThemeBackground.tsx     # Canvas-based animated backgrounds per theme
│   │   └── ThemeProvider.tsx       # Theme context + localStorage persistence
│   ├── types/
│   │   └── index.ts                # All shared TypeScript interfaces
│   ├── stores/
│   │   ├── authStore.ts            # Zustand: user registration, login, verification; persisted to localStorage
│   │   ├── emailStore.ts           # Zustand: emails, folder, selection, compose, reply; loaded from IndexedDB
│   │   └── smtpStore.ts            # Zustand: SMTP config, provider presets, OAuth state, test action
│   ├── utils/
│   │   ├── ai.worker.ts            # Web Worker entry — WebLLM inference off main thread
│   │   ├── aiProvider.ts           # Multi-provider: check, auto-detect, chatCompletion, CORS error handling
│   │   ├── aiService.ts            # Model catalog + WebLLM engine wrapper + hardware tier presets
│   │   ├── browser.ts              # Browser detection (Brave, Chrome, Edge, Firefox, Safari, Opera)
│   │   ├── db.ts                   # IndexedDB wrapper: emails, templates, user profiles, audit log, labels
│   │   ├── encryption.ts           # AES-256-GCM encrypt/decrypt for SMTP passwords (Web Crypto API)
│   │   ├── settingsExport.ts       # Import/export settings (excludes SMTP passwords)
│   │   ├── stateContext.ts          # App state + tool definitions → system prompt builder
│   │   ├── tools.ts                 # 12-tool registry + parseToolCall() for AI action routing + dependency injection
│   │   └── webgpu.ts               # WebGPU detection + model tier suggestion
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

The central state hub at `src/app/page.tsx`. Uses Zustand stores for data, keeps only UI-local state via `useState`.

**State:**
- [[authStore.ts]] — Zustand with `persist`: `currentUser`, `registeredUsers`, actions (`register`, `verifyRegistration`, `login`, `logout`)
- [[emailStore.ts]] — Zustand (no persist): `emails[]`, `currentFolder`, `selectedEmailId`, loaded from IndexedDB via `loadFromDB()`
- [[smtpStore.ts]] — Zustand with `persist`: SMTP provider, credentials, OAuth state, provider presets (ProtonMail Bridge, Gmail, Custom)
- Local `useState`: `showProviderSetup`, `errorModal`

**Key Behaviors:**
- **Auth Guard:** On mount, checks `authStore.currentUser` — if null, redirects to `/login`
- **Welcome header:** Displays "Welcome, {name}" with Sign Out button in the header bar
- **First-run detection:** Lazy `useState` init checks `localStorage("sherwin_ai_provider")` — no effect needed
- **Routing:** Renders center/right pane based on `currentFolder`:
  - `home` → `PrivacyDashboard`
  - `resume` → `ResumeScanner`
  - `chat` → `ChatPanel`
  - `ai-models` → `ProviderSettings` + `ModelRecommendations`
  - `settings` → Settings page (SMTP + AppearanceSettings + SystemTaskScheduler + Backup & Restore)
  - `inbox|draft|sent` → Dual pane: `MailList` + `MailDetail`
- **Error Boundaries:** Each route view is wrapped in `<ErrorBoundary>` — crashes in one view don't blow up the entire app

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
- **Services** section: Dashboard, AI Assistant Chat, Resume Scanner, **AI Models**, Settings
- Active folder highlighted with indigo left-border indicator
- AI Models button renders `ProviderSettings` + `ModelRecommendations` in the center pane

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

### [[ChatPanel.tsx]] — AI Chat + Tool System

General-purpose AI assistant with integrated tool-calling architecture.

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

**Tool-Calling System ([[tools.ts]] + [[stateContext.ts]]):**
- After AI responds, `parseToolCall(fullResponse)` checks output for a JSON tool call or markdown ` ```json ` code block
- If found, routes to `executeToolAndSummarize()` which:
  1. Resolves the tool by name from the [[tools.ts]] registry
  2. Executes the tool function (works outside React tree via `getState()`)
  3. Feeds the result back to the AI with instructions to summarise naturally
  4. Streams the summary into the message pane (raw JSON is never shown to user)
- **Multi-step agent loop:** up to 5 iterations — AI can chain multiple tool calls in one response
- `createDefaultToolContext()` provides dependency-injected tool context (avoids circular imports)
- Action-oriented queries (keywords like "send", "compose", "draft") trigger `buildAppContext()` injection into the system prompt — giving the AI awareness of current folder, email counts, SMTP status, and all available tools
- General knowledge queries skip app context and hit web search instead

**Easter Egg:**
- Typing "who created sherwin mail" triggers a response: "Sherwin Calantoc | https://github.com/Wyntaro-Glitch and Jp Valenzuela | https://github.com/valenzuelajp"

**Performance:**
- `onChunk` callbacks throttled to 100ms intervals to prevent excessive re-renders during streaming

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
- **ATS-optimized system prompt** enforces:
  - Action + Context + Result formula for bullet points
  - 60-80% quantified achievements (numbers, percentages, dollar amounts)
  - Standard section headings (Summary, Skills, Experience, Education, Certifications)
  - Keyword integration from job descriptions
  - Clean, scannable formatting suitable for 1-page resume
- Auto-Generate button — produces a complete polished resume with sections (Summary, Skills, Experience, Education, Certifications)
- **Auto-enhance flow:** Upload PDF → extract text → analyze → auto-generate enhanced version
- Streaming responses (throttled `onChunk` at 100ms to prevent max update depth errors)
- Message history with timestamps
- Input field to ask follow-up questions about the resume

**PDF Export:**
- Download PDF button in the header
- Uses `@react-pdf/renderer` via `[[ResumePDF.tsx]]` — professional single-column ATS-friendly layout
- Parser in `ResumePDF.tsx` uses fuzzy section matching (`.includes()` with normalization) for all section types

**Provider Routing:**
- Resume analysis is **blocked when WebGPU is active** (shows amber warning banner)
- Routes through `aiProvider.chatCompletion()` for ollama/lmstudio/api
- This is because resume analysis requires more capable models than WebGPU provides

### [[emailStore.ts]] — Zustand Email Store

```typescript
// stores/emailStore.ts
interface EmailStore {
  emails: Email[];
  currentFolder: MailFolder;
  selectedEmailId: string | null;
  composeDraft: string;
  replyToEmail: Email | null;
  // Actions
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setCurrentFolder: (folder: MailFolder) => void;
  setSelectedEmailId: (id: string | null) => void;
  selectEmail: (email: Email | null) => void;
  composeDraftAction: () => void;
  replyToEmailAction: (email: Email) => void;
  undoEmailAction: () => void;
  loadFromDB: () => Promise<void>;
  // Label CRUD, thread grouping
}
```

Emails loaded from IndexedDB on mount via `loadFromDB()`. `normalizeSubject()` and `getThread()` for email threading. Used by `page.tsx`, `MailList`, `MailDetail`, `MailSidebar`, and all tool executors in [[tools.ts]].

### [[smtpStore.ts]] — Zustand SMTP Store

```typescript
// stores/smtpStore.ts
interface SmtpStore {
  provider: string;
  emailAddress: string;
  smtpServer: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  isTestingConnection: boolean;
  testResult: "none" | "success" | "error";
  testMessage: string;
  // Actions
  setProvider: (provider: string) => void;
  setEmailAddress: (v: string) => void;
  setSmtpServer: (v: string) => void;
  setSmtpPort: (v: string) => void;
  setSmtpUser: (v: string) => void;
  setSmtpPassword: (v: string) => void;
  saveAndTest: () => Promise<void>;
}
```

Persisted to `localStorage("smtp-store")`. Provider presets (`protonmail` → `127.0.0.1:1025`, `gmail` → `smtp.gmail.com:587`). SMTP passwords encrypted via AES-256-GCM before storage.

### [[authStore.ts]] — Zustand Auth Store

```typescript
// stores/authStore.ts
interface AuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
}

interface AuthStore {
  currentUser: AuthUser | null;
  registeredUsers: AuthUser[];
  registrationStep: "register" | "verify";
  verificationCode: string | null;
  // Actions
  register: (email, name, password) => { success, code?, error? };
  verifyRegistration: (code) => boolean;
  login: (email, password) => { success, error? };
  logout: () => void;
}
```

Persisted to `localStorage("auth-store")` via Zustand `persist` middleware. Uses SHA-256 hashing with salt `sherwinmail_salt_v1`. Registration is a 2-step flow: step 1 generates a 6-digit verification code (logged to console for development), step 2 verifies the code before activating the account. Google OAuth button on the login page checks `/api/auth/google?check=1` to determine if OAuth credentials are configured before attempting redirect. Logout clears `currentUser` and redirects to `/login`.

### [[tools.ts]] — Tool Registry & Parser

12 tools for AI-driven application control:

| Tool | Parameters | Description |
|------|-----------|-------------|
| `create_draft` | to, subject, body | Creates a new draft, navigates to Drafts |
| `reply_to_email` | emailId, subject, body | Creates a reply draft quoting original |
| `send_email` | draftId | Marks draft as sent (future: real SMTP) |
| `navigate_to` | folder | Switches currentFolder |
| `search_emails` | query | Full-text search across all emails |
| `get_app_state` | (none) | Returns folder, counts, SMTP status |
| `delete_email` | query | Finds and deletes email by search |
| `update_draft` | draftId, to?, subject?, body? | Updates specific draft fields |
| `change_setting` | setting, value | Changes theme or provider |
| `generate_and_create_draft` | recipientEmail, companyName, jobTitle? | Generates and creates outreach draft |
| `create_rule` | condition, action | Creates an automation rule |
| `list_rules` | (none) | Lists all active rules |
| `run_rules` | (none) | Executes all rules against current emails |

Each tool has typed parameters, a description, and an async executor accessing stores via `getState()`. `parseToolCall()` handles both raw JSON and markdown code block formats using `[\s\S]` regex (ES2017-compatible, no `/s` flag). Tools support dependency injection via `createDefaultToolContext()` to avoid circular imports.

### [[stateContext.ts]] — App Context Builder

`buildAppContext()` serialises current application state and all tool definitions into a system-prompt string. Returns a structured prompt the AI can consume:
- Current folder and email counts
- Selected email summary (if any)
- SMTP configuration status
- Full tool definitions (name, description, parameter schemas)

Used by [[ChatPanel.tsx]] for action-oriented queries via the `APP_KEYWORDS` heuristic.

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

Located in the **AI Models** sidebar view (moved from Settings page). Features:

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

### [[ErrorBoundary.tsx]]

Reusable React error boundary (class component):
- Wraps each route view in `page.tsx` to prevent a crash in one view from blowing up the entire app
- `label` prop for identification in fallback UI
- Shows error details with a "Reload" button

### [[ModelRecommendations.tsx]] — AI Models Browser

Tier-based model display shown in the "AI Models" sidebar view:
- Three tiers: Low Spec (< 3 GB), Medium Spec (3-6 GB), High Spec (6+ GB)
- Each tier lists available models with category badges, VRAM requirements, and descriptions
- **Ollama download button:** checks `localhost:11434`, tries `ollama://` protocol handler, copies `ollama pull` command, falls back to ollama.com
- **LM Studio download button:** checks `localhost:1234`, tries `lmstudio://`/`lms://`/`lm-studio://` protocol handlers, falls back to lmstudio.ai
- Internal components: `CategoryBadge`, `ModelCard`

### [[ResumePDF.tsx]] — PDF Generation

Professional resume PDF generator using `@react-pdf/renderer`:
- **Parser:** `parseResumeText(text)` extracts structured sections from plain text using fuzzy matching (`.includes()` not exact match)
- Supports all section types: Name, Contact, Summary, Skills, Experience, Education, Certifications, Projects, Academic Projects, Character References
- Normalizes section names (e.g., "Work Experience" → Experience, "Tech Skills" → Skills)
- **Layout:** Single-column, ATS-friendly, reverse-chronological, clean typography
- Used by ResumeScanner's Download PDF button and auto-enhance flow

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

| Tier | Category | Name | Size | VRAM | Description |
|---|---|---|---|---|---|
| 💻 Low | `text-fast` | Qwen 2.5 (0.5B) | 0.35 GB | 1.2 GB | Fastest, simple chat & drafting |
| 💻 Low | `text-smart` | Qwen 2.5 (1.5B) | 0.98 GB | 2.2 GB | Balanced drafting & analysis |
| ⚡ Medium | `text-smart` | Llama 3.2 (3B) | 1.8 GB | 3 GB | Modern architecture, strong drafting |
| ⚡ Medium | `text-smart` | Phi-3.5 Mini (3.8B) | 2.2 GB | 3.5 GB | High-quality drafting & JD analysis |
| ⚡ Medium | `text-powerful` | Qwen3 (4B) | 2.5 GB | 3.5 GB | Reasoning, large context window |
| ⚡ Medium | `vision` | Phi-3.5 Vision (4.2B) | 3.9 GB | 4 GB | Reads images — resumes, screenshots |
| 🚀 High | `text-powerful` | Llama 3 (8B) | 4.7 GB | 6.5 GB | Best quality, complex tasks |
| 🛡️ Fallback | `fallback` | Offline Rule-based Assistant | 0 MB | 0 GB | No GPU needed |

### Hardware Presets

The system includes 3 hardware presets + custom selection. Presets map VRAM to an optimal model set, auto-selecting the best model for your GPU on first run.

| Preset | VRAM | Icon | Default Model | Also Available | Best For |
|--------|------|------|---------------|----------------|----------|
| **Low Spec** | < 3 GB | 💻 | Qwen 2.5 (0.5B) | Qwen 2.5 (1.5B) | Integrated GPUs, old laptops, quick replies |
| **Medium Spec** | 3-6 GB | ⚡ | Phi-3.5 Mini (3.8B) | Llama 3.2 3B, Qwen3 4B, Phi-3.5 Vision | GTX 1060+, RTX 2060+, M1/M2, balanced drafting + vision |
| **High Spec** | 6+ GB | 🚀 | Llama 3 (8B) | All medium models plus 8B | RTX 3080+, M1 Pro/Max/Ultra, max quality |

**Auto-Selection Flow:**

```
detectWebGPUSupport()
  → adapter.limits.maxBufferSize
  → estimate usable VRAM (~80%)
  → getTierForVram(vramGB)         → "low" | "medium" | "high"
  → getDefaultModelForTier(tier)   → auto-select model in dropdown
```

**Custom Selection:** Users can override the preset and pick any model manually from the categorized dropdown. The preset only sets the default — all models remain available regardless of tier.

### API Key / External Models

When using the API Key provider (OpenAI/Anthropic-compatible), hardware constraints don't apply. Users can enter any model name (e.g., `gpt-4o`, `claude-3-opus`, `gemini-pro`) — inference runs on the remote server.

### Ollama / LM Studio Models

When using Ollama or LM Studio, the system auto-detects available models from the local server. Hardware requirements depend on the user's local setup, not the browser. These providers support models up to 70B+ depending on the user's machine.

### Minimum Model Requirements by Feature

| Feature | WebGPU | Ollama | LM Studio | API Key | Mock |
|---------|--------|--------|-----------|---------|------|
| Basic chat & drafting | Any Low+ | Any | Any | Any | ✓ |
| AI Pitch Builder | Medium+ | Any | Any | Any | ✓ (basic) |
| Resume text analysis | ✗ | 7B+ | 7B+ | Any | ✗ |
| Resume image/vision | Medium (Vision) | 7B+ vision | 7B+ vision | Any vision | ✗ |
| Resume auto-generate | ✗ | 7B+ | 7B+ | Any | ✗ |
| Tool calling (JSON) | Low+ (0.5B) | 3B+ | 3B+ | Any | ✗ |
| Multi-step agent tasks | Medium+ | 7B+ | 7B+ | Any | ✗ |

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
7. **CORS error handling:** catch block detects `Failed to fetch` / `NetworkError` and shows provider-specific guidance (enable CORS in LM Studio, etc.)

**`autoDetectProvider()`:** Tries webgpu → ollama → lmstudio in order, saves first available.

**CORS Error Handling (`checkLMStudio`, `checkOllama`):**
- Detects CORS errors specifically (error message contains "Failed to fetch" or "NetworkError")
- Shows actionable guidance: "Enable CORS in LM Studio: Local Server → Server Settings → Enable CORS"
- Browsers cannot force-open desktop apps unless they registered custom URL protocols

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

### Model Tier Suggestion (Legacy)

`suggestModelTier(limits)` in `webgpu.ts` maps `maxBufferSize` to a tier label. This function predates the unified preset system in [[aiService.ts]] and is only used for display in the PrivacyDashboard. The new [[aiService.ts]] `getTierForVram()` and `getDefaultModelForTier()` supersede this.

| Max Buffer | Legacy Tier | Modern Preset | Default Model |
|---|---|---|---|
| < 1 GB | Tiny | 💻 Low | Qwen 2.5 (0.5B) |
| 1-3 GB | Small | 💻 Low | Qwen 2.5 (1.5B) |
| 3-5 GB | Medium | ⚡ Medium | Phi-3.5 Mini (3.8B) |
| 6+ GB | Large | 🚀 High | Llama 3 (8B) |

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

type MailFolder = "home" | "inbox" | "draft" | "sent" | "chat" | "settings" | "profile" | "resume" | "ai-models";

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
User data lives in `localStorage` under keys:
- `auth-store` — Zustand-persisted auth state (registered users, current user)
- `email-store` — Zustand-persisted email state (now loaded from IndexedDB, localStorage is backup)
- `smtp-store` — Zustand-persisted SMTP config (provider, credentials, OAuth state)
- `sherwin_ai_provider` — AI provider config JSON
- `sherwin_theme` — Theme name string

### IndexedDB Storage
Emails are persisted to IndexedDB via `[[db.ts]]` (DB_VERSION=2) with stores: `emails`, `labels`, `templates`, `userProfiles`, `attachments`, `auditLog`. The email store loads from IndexedDB on mount (`loadFromDB()`). Also provides `migrateEmailsFromLocalStorage()` for one-time migration from the old localStorage-based storage.

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
| 4. PDF & Resume Scanner | Complete | PDF extraction API, Resume Scanner UI (split-pane), PDF/image upload, OCR for images, auto-analysis, WebGPU restriction for analysis, apply AI output, ATS-optimized prompts, PDF export via @react-pdf/renderer |
| 5. Settings & Configuration | Complete | Provider settings with auto-detect, WebGPU model apply button, API Key config, theme picker, SMTP UI, onboarding wizard, import/export settings (Backup & Restore) |
| 6. Quality & Error Handling | Complete | shader-f16 pre-checks, informative error messages, console error suppression, provider status feedback, inline upload errors, AI generation error handling, ErrorBoundary per route view, CORS error handling |
| 7. Zustand State Extraction | Complete | emailStore (now IndexedDB-backed), smtpStore (AES-256-GCM encrypted passwords), authStore, replaced useState in page.tsx (PR 1) |
| 8. Tool-Using AI System | Complete | tools.ts (12 tools + dependency injection), stateContext.ts, parseToolCall + executeToolAndSummarize in ChatPanel, multi-step agent loop (PR 1) |
| 9. Storage & Performance | Complete | IndexedDB migration (db.ts, DB_VERSION=2), Web Worker for AI inference (ai.worker.ts), throttled onChunk streaming, hydration mismatch fix (ThemeBackground.tsx) |
| 10. Security & Auth | Complete | Registration/login flow (2-step: register → verify with 6-digit code), Google OAuth button (checks /api/auth/google?check=1), .env.example for OAuth vars, AES-256-GCM SMTP encryption with extractable key |
| 11. PWA & Accessibility | Complete | Service worker (cache-first strategy), ServiceWorkerRegistration component, CSP headers (next.config.ts), ARIA roles/labels across components, VRAM model warnings |
| 12. Resume Enhancements | Complete | ResumePDF.tsx (@react-pdf/renderer), fuzzy section parser, ATS-optimized AI prompts (Action + Context + Result formula), auto-enhance flow, throttled streaming |
| 13. Future / In Progress | Planned | SMTP /api/send, NLP command parser, voice input, template library, test suite, CI/CD |

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
- [[page.tsx]] — App orchestrator (state hub, auth guard)
- [[authStore.ts]] — User registration, login, verification
- [[aiService.ts]] — Model catalog + WebLLM engine (Worker proxy)
- [[aiProvider.ts]] — Multi-provider chat completion API (CORS handling)
- [[webgpu.ts]] — WebGPU detection + tier suggestion
- [[browser.ts]] — Browser detection utility
- [[db.ts]] — IndexedDB wrapper (emails, templates, profiles, audit log)
- [[encryption.ts]] — AES-256-GCM SMTP password encryption
- [[settingsExport.ts]] — Import/export app settings
- [[MailDetail.tsx]] — Email compose/view with AI Pitch Builder
- [[ChatPanel.tsx]] — AI chat with web search + multi-step agent loop
- [[ResumeScanner.tsx]] — Resume upload + AI analysis + ATS optimization
- [[ResumePDF.tsx]] — @react-pdf/renderer PDF generation
- [[ModelRecommendations.tsx]] — Tier-based model browser + download buttons
- [[PrivacyDashboard.tsx]] — GPU diagnostics + privacy info
- [[ProviderSettings.tsx]] — AI provider configuration
- [[ThemeProvider.tsx]] — Theme context + persistence
- [[ThemeBackground.tsx]] — Canvas animated backgrounds (hydration fix)
- [[ErrorBoundary.tsx]] — Reusable error boundary
- [[ServiceWorkerRegistration.tsx]] — PWA service worker registration
- [[ProviderSetupModal.tsx]] — First-run onboarding wizard
- [[Recommendations]] — 165 enhancement ideas across 13 categories

---

## Recommendations & Improvements

This section evaluates the current state of SherwinMail and provides actionable recommendations organized by priority and impact.

### 🔴 Critical Issues

#### 1. ~~SMTP Credentials Stored in Plaintext~~ **Resolved**
**Fix:** AES-256-GCM encryption via `[[encryption.ts]]`. Passwords encrypted before writing to localStorage. Encryption key generated with `extractable: true` to support `exportKey()`.

#### 2. ~~All State Lives in page.tsx (God Component)~~ **Resolved in PR 1**
State extracted into [[emailStore.ts]] and [[smtpStore.ts]] (Zustand + persist). `page.tsx` now handles only UI-local state (modals, error display).

#### 3. ~~No Database Layer (localStorage Limits)~~ **Resolved**
Migrated emails to IndexedDB via `[[db.ts]]` (DB_VERSION=2). Stores: emails, labels, templates, userProfiles, attachments, auditLog. `emailStore.ts` loads from IndexedDB on mount via `loadFromDB()`.

#### 4. ~~AI Service Blocked on Main Thread~~ **Resolved**
Entire `AIService` moved into `[[ai.worker.ts]]` Web Worker. `[[aiService.ts]]` acts as a Worker proxy via `postMessage`. All LLM inference runs off the main thread.

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

#### 6. ~~No Error Boundaries~~ **Resolved**
`ErrorBoundary.tsx` (class component) now wraps each route view in `page.tsx`. Crashes in one view don't blow up the entire app.

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

#### 12. ~~No Cancel for Model Loading~~ **Resolved**
AbortSignal is now passed to `handleLoadModel` and `getAIResponse` — users can abort model loading.

#### 13. No Model Download Progress Persistence
Closing the tab during a model download loses all progress. Large models (Llama 3 8B = 4.7GB) must re-download from scratch.

**Fix:** The WebLLM cache API (`caches.open("webllm")`) can be used to resume downloads. Check `caches.match(modelUrl)` before starting, and display cached status:
```typescript
const cache = await caches.open("webllm");
const cached = await cache.match(modelUrl);
if (cached) { /* resume from cache */ }
```

#### 14. ~~No Import/Export of Settings~~ **Resolved**
`settingsExport.ts` provides `exportSettings()` and `importSettings()` functions. Backup & Restore section in Settings page. Excludes SMTP passwords for security.

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

#### 17. ~~WebGPU Provider Shows No Model Selection Feedback~~ **Resolved**
Dynamic VRAM model warnings added to WebGPU selector and vision preset cards in ModelRecommendations.

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

| # | Issue | Priority | Effort | Impact | Status |
|---|---|---|---|---|---|---|
| 1 | ~~Plaintext SMTP credentials~~ | ~~🔴 Critical~~ | ~~Small~~ | ~~Security~~ | ✅ Resolved — AES-256-GCM encryption via `encryption.ts` |
| 2 | ~~God component page.tsx~~ | ~~🔴 Critical~~ | ~~Medium~~ | ~~Maintainability~~ | ✅ Resolved |
| 3 | ~~No database (localStorage)~~ | ~~🔴 Critical~~ | ~~Large~~ | ~~Performance/Scale~~ | ✅ Resolved — IndexedDB via `db.ts` (DB_VERSION=2) |
| 4 | ~~AI on main thread~~ | ~~🔴 Critical~~ | ~~Medium~~ | ~~Performance~~ | ✅ Resolved — Web Worker via `ai.worker.ts` |
| 5 | No real SMTP send | 🟠 High | Medium | Core feature gap | Pending |
| 6 | ~~No error boundaries~~ | ~~🟠 High~~ | ~~Small~~ | ~~Stability~~ | ✅ Resolved — `ErrorBoundary.tsx` wrapping each route view |
| 7 | Type safety (`any` casts) | 🟠 High | Small | Code quality | Pending |
| 8 | No test coverage | 🟠 High | Large | Reliability | Pending |
| 9 | No CI/CD | 🟠 High | Small | Quality gates | Pending |
| 10 | Draft save feedback | 🟡 Medium | Small | UX | Pending |
| 11 | Keyboard shortcuts | 🟡 Medium | Small | UX | Pending |
| 12 | ~~Cancel model loading~~ | ~~🟡 Medium~~ | ~~Small~~ | ~~UX~~ | ✅ Resolved — AbortSignal passed to handleLoadModel |
| 13 | Download persistence | 🟡 Medium | Large | UX | Pending |
| 14 | ~~Import/export settings~~ | ~~🟡 Medium~~ | ~~Small~~ | ~~Usability~~ | ✅ Resolved — `settingsExport.ts` + Backup & Restore section |
| 15 | Mutation visibility | 🟡 Medium | Small | UX | Pending |
| 16 | Auto-detect confirmation | 🔵 Low | Small | UX | Pending |
| 17 | ~~VRAM model warnings~~ | ~~🔵 Low~~ | ~~Small~~ | ~~UX~~ | ✅ Resolved — Dynamic warnings in WebGPU selector + vision preset cards |
| 18 | Offline indicator | 🔵 Low | Small | UX | Pending |
| 19 | Desktop wrapper | 🔵 Low | Large | Distribution | Pending |
| 20 | Template library | 🔵 Low | Medium | Feature | Pending |
| 21 | ~~Email threading~~ | ~~🔵 Low~~ | ~~Medium~~ | ~~Feature~~ | ✅ Resolved — `normalizeSubject` + `ThreadGroup` in MailList.tsx |
| 22 | Tone toggle | 🔵 Low | Small | Feature | Pending |
| 23 | Drag-drop folders | 🔵 Low | Medium | UX | Pending |
| 24 | Notifications | 🔵 Low | Medium | Feature | Pending |

### Quick Wins (Implement in < 1 hour each)

1. ~~**`any` → proper types**~~ — Codebase already clean
2. **Keyboard shortcuts** (Ctrl+N compose, Escape close detail)
3. **Draft save feedback** (saved/saving/unsaved indicator)
4. ~~**Cancel model loading**~~ — AbortSignal implemented
5. **Auto-detect confirmation** (confirm() dialog before switching)
6. ~~**Offline status indicator**~~ — PWA service worker handles caching
7. ~~**Error boundaries**~~ — ErrorBoundary wraps each route view

---

## Letting Local AI Models Interact With the Application

> ✅ **Implemented in PR 1.** The tool-using AI system is live. See [[tools.ts]], [[stateContext.ts]], and [[ChatPanel.tsx]] for the implementation.

The AI can now perform actions in the app through the tool system. It can create drafts, reply to emails, send (mark as sent), navigate folders, search emails, delete drafts, update drafts, and change settings — all from natural language.

### Architecture (Implemented)

```
User: "Reply to the Stripe email saying I'm available Tuesday at 2pm"
       │
       ▼
┌─────────────────────────────────────────────────┐
│ ChatPanel                                        │
│  1. APP_KEYWORDS triggers app-context injection  │
│  2. buildAppContext() serialises state + tools   │
│  3. Model responds with tool call (JSON)         │
│  4. parseToolCall() extracts tool + args         │
│  5. executeToolAndSummarize() runs the tool      │
│  6. Tool result fed back to AI                   │
│  7. AI confirms to user in natural language      │
└─────────────────────────────────────────────────┘
```

### Step 1: Define a Tool System

Create a tool registry that the AI can call via structured JSON output. Each tool has a name, description, parameters, and an executor function. Tools use dependency injection via `createDefaultToolContext()` to avoid circular imports.

```typescript
// utils/tools.ts
export interface ToolContext {
  emailStore: typeof useEmailStore;
  // ... other dependencies injected at runtime
}

export function createDefaultToolContext(): ToolContext { ... }

export interface Tool {
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string; required?: boolean }[];
  execute: (args: Record<string, any>, context: ToolContext) => Promise<string>;
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
      { name: "folder", type: "string", description: "Target folder: inbox, draft, sent, chat, resume, settings, home, ai-models", required: true },
    ],
    execute: async ({ folder }) => {
      const validFolders = ["inbox", "draft", "sent", "chat", "resume", "settings", "home", "ai-models"];
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

### PR 2 — Security, Storage, Auth, PWA & Resume Enhancements (2026-07-14)

Comprehensive feature implementation across authentication, data storage, security, accessibility, resume analysis, and PWA support. Files:

| File | Purpose |
|------|---------|
| `src/stores/authStore.ts` | Zustand auth store: user registration (2-step: register → verify with 6-digit code), login, logout, SHA-256 password hashing with salt `sherwinmail_salt_v1`. Persisted to `localStorage("auth-store")` |
| `src/stores/emailStore.ts` | Refactored from localStorage persist to IndexedDB-backed storage. `loadFromDB()` on init, `migrateEmailsFromLocalStorage()` for one-time migration |
| `src/utils/db.ts` | IndexedDB wrapper (DB_VERSION=2): stores for emails, labels, templates, userProfiles, attachments, auditLog. CRUD functions for all stores |
| `src/utils/encryption.ts` | AES-256-GCM encrypt/decrypt for SMTP passwords using Web Crypto API. Key generated with `extractable: true` to support `exportKey()` |
| `src/utils/settingsExport.ts` | Import/export of app state as JSON. Excludes SMTP passwords. Provides `exportSettings()`, `importSettings()`, `downloadBlob()` |
| `src/utils/ai.worker.ts` | Web Worker entry: WebLLM engine lifecycle (`init`, `chat`, `cancel` messages). Internal `generateMockResponse` fallback. All inference off main thread |
| `src/utils/aiService.ts` | Refactored as Worker proxy. `AVAILABLE_MODELS`, `PRESET_TIERS`, `getModelsByCategory`, `getTierForVram`, `getDefaultModelForTier`. Hardware tier presets (Low/Medium/High) |
| `src/utils/aiProvider.ts` | Added CORS error handling to `checkLMStudio`, `checkOllama`, and `chatCompletion` catch block. Detects "Failed to fetch" / "NetworkError" and shows actionable guidance |
| `src/utils/tools.ts` | Refactored with `ToolContext` + `createDefaultToolContext()` for dependency injection. `"ai-models"` added to valid folders. 12 tools (was 10) |
| `src/app/page.tsx` | Auth guard (redirects to `/login` if `currentUser` is null), "Welcome, {name}" header + Sign Out button, routing for `"ai-models"` view, ErrorBoundary wrapping for all route views. ProviderSettings/ModelRecommendations removed from Settings (moved to AI Models view) |
| `src/app/login/page.tsx` | Login page: email/password form, Google OAuth button (checks `/api/auth/google?check=1` before redirect), links to `/register` |
| `src/app/register/page.tsx` | Registration page: 2-step flow — register (name, email, password) → verify (6-digit code logged to console for dev) |
| `src/app/api/auth/google/route.ts` | Google OAuth API route: `GET` with `?check=1` returns `{ configured: true/false }`. Without `?check=1`, redirects to Google OAuth consent screen |
| `src/components/ChatPanel.tsx` | Multi-step agent loop (up to 5 iterations), `createDefaultToolContext()` for dependency injection, easter egg ("who created sherwin mail"), throttled `onChunk` at 100ms |
| `src/components/MailSidebar.tsx` | Added "AI Models" sidebar button below Resume Scanner. `"ai-models"` in MailFolder type |
| `src/components/MailList.tsx` | Virtualized list (`@tanstack/react-virtual`), thread grouping by normalized subject, undefined field fallbacks for `subject`, `body`, `to`, `from` |
| `src/components/MailDetail.tsx` | Undefined field fallbacks for `scanBrackets` text, `email.body`/`email.to`/`email.subject` |
| `src/components/ResumeScanner.tsx` | ATS-optimized system prompt (Action + Context + Result formula, quantified achievements, standard headings), auto-enhance flow, throttled `onChunk` |
| `src/components/ModelRecommendations.tsx` | Tier-based model browser with Ollama/LM Studio download buttons. Ollama: checks `localhost:11434`, `ollama://` protocol, copies command, falls back to ollama.com. LM Studio: checks `localhost:1234`, `lmstudio://`/`lms://`/`lm-studio://` protocols, falls back to lmstudio.ai |
| `src/components/ResumePDF.tsx` | `@react-pdf/renderer` PDF generation. Fuzzy section parser (`parseResumeText`) with `.includes()` matching. Single-column ATS-friendly layout. Parker-style: accent-colored headers, grouped skills, scannable format |
| `src/components/ErrorBoundary.tsx` | Reusable React error boundary (class component) with `label` prop and fallback UI |
| `src/components/ServiceWorkerRegistration.tsx` | Registers `/sw.js` on mount for PWA support |
| `src/components/ThemeBackground.tsx` | Hydration mismatch fix: `useState("dark")` + `useEffect` sync to prevent SSR/client mismatch |
| `src/types/index.ts` | `MailFolder` updated to include `"ai-models"` |
| `next.config.ts` | CSP headers: `connect-src` includes `localhost:11434`, `localhost:1234`, `huggingface.co`, blob workers, `wasm-unsafe-eval`. Security headers: `nosniff`, `DENY` frame, strict referrer |
| `public/sw.js` | Service worker: cache-first strategy (`sherwinmail-v1`), caches static assets, skips HuggingFace/blob/WebLLM requests |
| `.env.example` | Template with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |

**Key decisions:**

- **Auth is localStorage-only** — no server-side sessions; registration verification code logged to console for development. Google OAuth requires env vars to be configured
- **IndexedDB over localStorage for emails** — removes 5MB limit, supports full-text search, doesn't block main thread. Old localStorage data migrated on first load
- **Web Worker for all AI inference** — `AIService` class runs entirely inside `ai.worker.ts`, communicated via `postMessage`. Keeps UI responsive during model loading
- **Dependency injection for tools** — `createDefaultToolContext()` avoids circular imports between tool executors and React components
- **Throttled onChunk** — 100ms interval prevents React max update depth errors during fast streaming responses
- **Fuzzy section matching in ResumePDF** — `.includes()` with normalization handles variations like "Work Experience", "Professional Experience", "Employment History" all mapping to Experience
- **CORS error handling** — browsers block cross-origin requests to localhost; LM Studio needs CORS enabled manually in settings

## Next Implementation Priorities

Ranked by user-facing impact vs implementation effort. All recommendations assume local-first, browser-based constraints.

### Tier 1 — High Impact, Low Effort (1-3 days each)

#### 1. GPU-Aware Model Auto-Selection
**Why:** Users with a powerful GPU are defaulted to the smallest 0.5B model. `suggestModelTier()` already computes the right recommendation but it's never used for auto-selection.
**What:** Wire `detectWebGPUSupport()` → estimate VRAM from `maxBufferSize` → `getRecommendedModel(vramGB)` → pre-select that model in the ChatPanel dropdown and ProviderSettings.
**Files:** `src/utils/webgpu.ts:41-92`, `src/utils/aiService.ts:94-99`, `src/components/ChatPanel.tsx:75-77`, `src/components/ProviderSettings.tsx:116-178`
**PR Title:** `feat: auto-select best model for detected GPU`

#### 2. NLP Command Parser (Non-JSON Fallback)
**Why:** Most local models below 7B produce unreliable JSON. A regex/heuristic-based parser catches these cases.
**What:** Create `src/utils/commandParser.ts` that pattern-matches free-form AI text against known intents. Chain it in `parseToolCall()` after JSON and markdown attempts.
**Files:** `src/utils/tools.ts:267-289` (add parser call), new `src/utils/commandParser.ts`
**PR Title:** `feat: NLP command parser as fallback for non-JSON models`

#### 3. ~~Real SMTP Send Endpoint~~ — Pending (not yet implemented)
**Files:** New `src/app/api/send/route.ts`, modify `src/utils/tools.ts` (send_email executor)
**PR Title:** `feat: real SMTP send via /api/send endpoint`

#### 4. Keyboard Shortcuts
**Why:** Every action requires clicking. `Ctrl+N` compose, `Ctrl+Enter` send, `Escape` close, `/` search.
**What:** Create `src/hooks/useKeyboardShortcuts.ts`. Register global keydown handler in `page.tsx`.
**PR Title:** `feat: keyboard shortcuts (Ctrl+N, Ctrl+Enter, Escape, /)`

#### 5. Error Boundaries per Route View
**Why:** A crash in ResumeScanner or ChatPanel blows up the entire app.
**What:** Create `src/components/ErrorBoundary.tsx`. Wrap each route view in `page.tsx`.
**PR Title:** `feat: error boundaries around route views`

### Tier 2 — High Impact, Medium Effort (3-7 days)

#### 6. ~~IndexedDB Migration (Replace localStorage)~~ **Resolved**
Migrated to IndexedDB via `[[db.ts]]` (DB_VERSION=2). `emailStore.ts` loads from IndexedDB on mount. `migrateEmailsFromLocalStorage()` for one-time migration from old localStorage data.

#### 7. Template Library
**Why:** Users send similar outreach emails repeatedly. A template system reduces repetitive typing.
**What:** Add `src/stores/templateStore.ts`. Save/draft-as-template, categorize (Cold Outreach, Follow-up, Thank You), insert into draft with one click. Template variables `{{Name}}`, `{{Company}}` auto-replaced from context.
**PR Title:** `feat: email template library with variable replacement`

#### 8. Model Download Progress Persistence
**Why:** Closing the tab during a 4.7GB download loses all progress. WebLLM cache API can resume.
**What:** Check `caches.open("webllm")` before download. Display cached/resume status in the load UI.
**PR Title:** `feat: resume model downloads from cache on page reload`

### Tier 3 — Transformative, High Effort (1-3 weeks)

#### 9. ~~Agentic Workflow Loop~~ **Resolved**
Multi-step agent loop implemented in ChatPanel.tsx — up to 5 iterations with `createDefaultToolContext()`. AI can chain multiple tool calls in one response.

#### 10. Test Suite (Vitest + RTL)
**Why:** Zero tests. Every regression is caught manually.
**What:** Install `vitest`, `@testing-library/react`, `jsdom`. Test `generateDraftFromJob()`, `suggestModelTier()`, `detectBrowser()`, tool executors, and component rendering.
**PR Title:** `test: add Vitest test suite with component and unit tests`

#### 11. Voice Input (Speech-to-Text)
**Why:** Natural interaction mode for a local-first AI app.
**What:** Add `src/hooks/useVoiceInput.ts` using Web Speech API. Microphone button next to chat input. Works fully offline in Chrome.
**PR Title:** `feat: offline voice input via Web Speech API`

#### 12. CI/CD Pipeline
**Why:** No automated quality gates.
**What:** `.github/workflows/ci.yml` running lint → tsc → test → build on push/PR.
**PR Title:** `ci: add GitHub Actions workflow for lint, typecheck, test, build`

### Priority Matrix

```
                    HIGH EFFORT
                        │
                        │
       Template Lib  ●  │  ● Agentic Loop
                        │
                        │
          IndexedDB  ●  │  ● Test Suite
                        │
                        │
────────────────────────┼───────────────────────
                        │    EFFORT
                        │
  NLP Command Parser ●  │  ● Voice Input
                        │
  GPU Auto-Select   ●  │  ● CI/CD Pipeline
                        │
  SMTP Send         ●  │
                        │
  Keyboard Shortcuts ● │
                        │
  Error Boundaries  ●  │
                        │
                    LOW EFFORT
```

### Completed in Current Session

- ✅ **Hardware Tier Presets** — Added `tier` field to every model (`low`/`medium`/`high`/`fallback`). Created `PRESET_TIERS` array with default models, available model lists, VRAM thresholds, and icons. Added helper functions: `getTierForVram()`, `getPresetForTier()`, `getModelsByTier()`, `getDefaultModelForTier()`. Updated `getRecommendedModel()` to recommend Llama 3 8B for 6+ GB VRAM.

**Immediate next step (1-2 days):** GPU-Aware Model Auto-Selection. Wire `detectWebGPUSupport()` → `getTierForVram()` → `getDefaultModelForTier()` → pre-select in ChatPanel + ProviderSettings dropdowns.
