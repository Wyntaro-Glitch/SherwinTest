---
tags:
  - sherwinmail
  - recommendations
  - roadmap
  - reference
created: 2026-07-03
aliases:
  - Recommendations
  - Roadmap
  - Enhancement Ideas
---

# 100+ Recommendations for SherwinMail

> A comprehensive catalog of every enhancement, improvement, architectural change, and moonshot idea for the SherwinMail system. Organized by domain and impact level.

---

## How to Read This

| Icon | Meaning |
|------|---------|
| 🟢 | Quick win (< 1 day, single file) |
| 🟡 | Moderate effort (1-5 days, cross-file) |
| 🟠 | Large effort (1-3 weeks, new subsystem) |
| 🔴 | Transformative (1-3 months, architectural) |
| 💎 | Moonshot (3+ months, experimental) |

---

## 🔧 Performance & Optimization (1-15)

### 1. 🟢 Lazy Load WebLLM Bundle
**Issue:** `@mlc-ai/web-llm` (~8 MB) is imported dynamically already, but the import can be deferred until the user clicks "Load Engine" rather than on mount.
**File:** `src/utils/aiService.ts:126`
**Fix:** Only import inside `initEngine()` — already done, but verify no static imports exist.

### 2. 🟢 Virtualize Email List
**Issue:** `MailList.tsx` renders every email as a DOM node. At 500+ emails, scrolling becomes laggy.
**Fix:** Use `react-window` or `@tanstack/react-virtual` to render only visible rows.
```bash
npm install @tanstack/react-virtual
```

### 3. 🟢 Debounce Draft Auto-Save
**Issue:** `MailDetail.tsx` writes to localStorage on every keystroke. After our Zustand migration, it writes to persist on every character.
**Fix:** Debounce the store update by 500ms using a ref timer.
**File:** `src/components/MailDetail.tsx`

### 4. 🟢 Memoize Expensive Computations
**Issue:** Email search in `MailList.tsx` does a full linear scan on every render.
**Fix:** Wrap with `useMemo` keyed on search query and emails array.

### 5. 🟡 Preload Small Model on App Start
**Issue:** User must manually click "Load Engine" and wait 10-30s for the model to download.
**Fix:** After first-run detection, silently preload Qwen 0.5B in the background while the user browses. When they open chat, it's ready.
**Additional:** Show a subtle "Model loading in background..." indicator in the sidebar.

### 6. 🟡 Model Caching Dashboard
**Issue:** No visibility into which models are cached, their sizes, or cache eviction.
**Fix:** Create a cache manager that lists cached shards from `caches.open("webllm")` with total size and per-model breakdown. Allow manual cache clearing.

### 7. 🟡 Image Optimization for Resume Uploads
**Issue:** Resume images (PNG/JPG) are sent as base64 directly to the AI, potentially very large.
**Fix:** Resize/compress images client-side before sending. Use `canvas` to downscale to 1024px max dimension and convert to JPEG at 0.8 quality.

### 8. 🟠 Web Worker for AIService
**Issue:** Only `WebWorkerMLCEngineHandler` runs in a worker. The rest of `AIService` (`getChatCompletion()`, `runMockCompletion()`) blocks the main thread.
**Fix:** Move all AI communication into `ai.worker.ts` using `postMessage`. Keep UI thread free for rendering and input.

### 9. 🟠 Streaming Search Results
**Issue:** Web search (`/api/search`) returns all results at once. User waits for the full response.
**Fix:** Stream search results as they arrive using SSE or chunked transfer. Show results incrementally.

### 10. 🟠 Bundle Splitting by Route
**Issue:** The entire app bundle is loaded on first visit, including `ResumeScanner`, `ChatPanel`, and all AI code.
**Fix:** Use Next.js dynamic imports for heavy components:
```typescript
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), { ssr: false });
const ResumeScanner = dynamic(() => import("@/components/ResumeScanner"), { ssr: false });
```

### 11. 🟠 Fixed-Length Message History for AI Context
**Issue:** Chat history grows unbounded. Every AI call sends the entire conversation, increasing token usage and latency.
**Fix:** Implement a sliding window that keeps the last N messages (e.g., 20) plus the system prompt. Summarize older messages into a single compressed entry.

### 12. 🟠 Adaptive Context Window
**Issue:** Different models have different context limits (Qwen 0.5B = 32K, Llama 3 8B = 8K). The app doesn't account for this.
**Fix:** Add `maxContextTokens` to `ModelOption`. Truncate messages proportionally when approaching the limit, keeping the system prompt and most recent messages.

### 13. 🟠 WebGPU Compute Shader for Draft Generation
**Issue:** Draft generation (`generateDraftFromJob`) runs as regex on CPU. For batch operations, this could use GPU compute.
**Fix:** For power users generating 50+ drafts, offload template rendering to WebGPU compute shaders. Each thread renders one draft.

### 14. 🔴 Database Query Optimization via IndexedDB Indexes
**Issue:** Full IndexedDB migration is recommended elsewhere, but even then, query performance depends on index design.
**Fix:** Create compound indexes:
```
emails: [status+date], [from+status], [subject+status]
```
Use cursors for range queries (date filtering) instead of `getAll()` + filter.

### 15. 🔴 Streaming Model Download with Resume
**Issue:** WebLLM downloads shards sequentially. A 4.7GB model takes 15+ minutes on average connections.
**Fix:** Implement parallel shard downloading (4 simultaneous fetches). Use IndexedDB instead of Cache API for more granular resume capability. Show per-shard progress.

---

## 🔒 Security & Privacy (16-30)

### 16. 🟢 SMTP Password Encryption
**Issue:** SMTP password stored as plaintext in localStorage.
**Fix:** Encrypt with Web Crypto API (AES-GCM) using a key derived from a user passphrase or stored in sessionStorage (cleared on tab close).
**File:** `src/stores/smtpStore.ts`
```typescript
// On save
const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
sessionStorage.setItem("sherwin_crypto_key", JSON.stringify(key));
localStorage.setItem("sherwin_smtp_encrypted", JSON.stringify({ iv: [...iv], data: [...new Uint8Array(encrypted)] }));
```

### 17. 🟢 Session-Locked Sensitive Data
**Issue:** AI provider API keys are stored permanently in localStorage.
**Fix:** Provide an option "Require re-entry on browser restart" that stores keys in `sessionStorage` instead.

### 18. 🟡 Auto-Lock on Idle
**Issue:** An unlocked device exposes all emails and SMTP credentials.
**Fix:** After N minutes of inactivity, blur or mask the email list. Require a click to reveal content.
```typescript
let idleTimer: ReturnType<typeof setTimeout>;
const resetIdle = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => setIsLocked(true), 5 * 60 * 1000); // 5 min
};
document.addEventListener("mousemove", resetIdle);
```

### 19. 🟡 Content Security Policy Headers
**Issue:** No CSP headers defined. An XSS vulnerability could exfiltrate emails and credentials.
**Fix:** Add CSP in `next.config.ts`:
```typescript
headers: async () => [{
  source: "/(.*)",
  headers: [{ key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' localhost:* https://*; img-src 'self' data: blob:; worker-src 'self' blob:" }],
}];
```

### 20. 🟡 Subresource Integrity for CDN Assets
**Issue:** If any external assets (fonts, analytics) are loaded, SRI ensures they haven't been tampered with.
**Fix:** Add `integrity` attributes to all external `<link>` and `<script>` tags.

### 21. 🟡 Email Content Sanitization
**Issue:** Email bodies could contain HTML/scripts when rendered in the UI. Currently rendered as text, but future rich-text rendering needs sanitization.
**Fix:** Use `DOMPurify` before rendering any email body as HTML.
```bash
npm install dompurify
npm install -D @types/dompurify
```

### 22. 🟡 API Key Obfuscation in UI
**Issue:** API keys are shown as plaintext in the settings input field.
**Fix:** Show only the last 4 characters by default. Add a "Show" toggle button (eye icon).

### 23. 🟡 Privacy-First Error Logging
**Issue:** Errors are logged to `console.error` which could contain sensitive data.
**Fix:** Create a sanitized logger that strips email addresses, names, and API keys before logging:
```typescript
function sanitize(str: string): string {
  return str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
            .replace(/sk-[a-zA-Z0-9]{20,}/g, "[API-KEY]");
}
```

### 24. 🟠 Credential Rotation Reminder
**Issue:** Users may keep the same SMTP/API credentials indefinitely.
**Fix:** Track credential age and show a gentle reminder after 90 days: "Your SMTP password hasn't been updated in 3 months."

### 25. 🟠 Local Authentication
**Issue:** Anyone who opens the browser can access all emails and credentials.
**Fix:** Add an optional local passcode (hashed, stored in localStorage) that must be entered on app start or tab wake. Use Web Crypto API for hashing.
```typescript
const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
sessionStorage.setItem("auth_hash", hex(hash));
// On mount: prompt if no session hash exists
```

### 26. 🟠 Encrypted Email Storage
**Issue:** All emails are stored as plaintext in localStorage (via Zustand persist).
**Fix:** Encrypt the entire `email-store` serialized state with a user-provided passphrase before writing to localStorage. Decrypt on app start.

### 27. 🟠 Secure Backup & Recovery
**Issue:** No way to recover data if localStorage is cleared or the browser is reset.
**Fix:** Encrypted export with a recovery key. Users download an encrypted `.sherwin` file that can only be decrypted with their passphrase.

### 28. 🟠 Audit Log
**Issue:** No record of when emails were sent, drafts modified, or settings changed.
**Fix:** Create a local audit log stored in IndexedDB:
```typescript
interface AuditEntry {
  timestamp: string;
  action: "send" | "draft" | "delete" | "setting_change" | "ai_generate";
  details: string; // sanitized
  userId?: string; // for multi-profile
}
```

### 29. 🔴 Third-Party Security Audit
**Issue:** No external security review has been performed.
**Fix:** Commission a security audit focused on: localStorage encryption, WebGPU sandboxing, API key handling, and SMTP credential storage.

### 30. 🔴 Zero-Knowledge Proof Architecture
**Issue:** Currently the app trusts the user's own machine. A future sync feature would need server trust.
**Fix:** Design a zero-knowledge sync protocol where the server never sees plaintext emails, only encrypted blobs with client-managed keys.

---

## 🎨 UX & Accessibility (31-50)

### 31. 🟢 Keyboard Shortcuts
**Issue:** Every action requires clicking.
**Fix:** Global key handlers:
| Shortcut | Action |
|----------|--------|
| `N` | New draft |
| `Ctrl+Enter` | Send email |
| `R` | Reply |
| `Ctrl+Shift+I` | Focus inbox |
| `Ctrl+Shift+D` | Focus drafts |
| `Escape` | Close detail pane |
| `/` | Focus search |
| `?` | Show shortcuts help overlay |

### 32. 🟢 Drag-and-Drop Email Organization
**Issue:** Can't drag emails between folders.
**Fix:** Implement HTML5 Drag and Drop API on email items. Drop targets: folder sidebar items.
**File:** `src/components/MailList.tsx`, `src/components/MailSidebar.tsx`

### 33. 🟢 Right-Click Context Menu
**Issue:** No context menu on emails.
**Fix:** Custom right-click menu: Reply, Forward, Delete, Mark Read/Unread, Move to Folder, Print.

### 34. 🟢 Command Palette
**Issue:** Users must navigate menus for every action.
**Fix:** `Ctrl+K` or `Cmd+K` palette: type "new draft", "go to inbox", "send email", "search for stripe" — fuzzy matching against all actions, folders, and recent emails.

### 35. 🟢 Undo/Redo for Email Operations
**Issue:** Deleting a draft or sending an email is irreversible.
**Fix:** Add a lightweight action history with undo:
```typescript
const actionHistory = useRef<{ undo: () => void; description: string }[]>([]);
const undo = () => actionHistory.current.pop()?.undo();
```
Show a toast "Email deleted. [Undo]" with 5s auto-dismiss.

### 36. 🟢 Toast Notification System
**Issue:** Operations (save, delete, send) have no non-blocking feedback.
**Fix:** Create a toast system with 4 variants: success, error, info, warning. Auto-dismiss after 3-5s. Stack multiple toasts.

### 37. 🟢 Loading Skeletons
**Issue:** Spinner + text for model loading. Better to show skeleton screens.
**Fix:** Replace loading spinners with skeleton placeholders that mimic the layout of the loaded content (e.g., email list lines, chat bubbles).

### 38. 🟢 Haptic Feedback (Mobile)
**Issue:** Mobile users get no tactile confirmation.
**Fix:** Use `navigator.vibrate()` for actions: short pulse on send, double pulse on error.

### 39. 🟢 Context-Preserving Navigation
**Issue:** Navigating from chat to inbox loses the chat conversation scroll position.
**Fix:** Persist scroll positions per view in a ref or Zustand. Restore on navigate back.

### 40. 🟢 Inline Email Preview
**Issue:** Clicking an email in the list replaces the entire right pane. Hard to browse quickly.
**Fix:** Add an optional "split pane" mode where clicking an email opens a preview below it (like Gmail's quick preview) without leaving the list.

### 41. 🟡 Offline Status Indicator
**Issue:** User has no visibility into network state.
**Fix:**
```typescript
const [online, setOnline] = useState(navigator.onLine);
useEffect(() => {
  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
}, []);
```
Show a subtle indicator in the header. Disable web search when offline.

### 42. 🟡 Responsive Mobile Layout
**Issue:** Currently desktop-only (sidebar + dual pane). Unusable on phone.
**Fix:** Implement a responsive breakpoint at 768px:
- Single column stack
- Bottom tab navigation (Inbox, Chat, Resume, Settings) replacing sidebar
- Swipe to delete/reply on email items
- Full-screen compose modal instead of side panel

### 43. 🟡 PWA with Offline Support
**Issue:** Can be added to home screen but no service worker for full offline.
**Fix:** Add `next-pwa` or `next-offline` for service worker. Cache the app shell, model shards, and static assets. Enable full offline use after initial load.

### 44. 🟡 Screen Reader Support (ARIA)
**Issue:** Custom components (dropdowns, modals, tabs) lack ARIA attributes.
**Fix:** Audit all components:
- `ProviderSettings.tsx` — dropdown needs `role="combobox"`, `aria-expanded`, `aria-activedescendant`
- `MailList.tsx` — list needs `role="listbox"`, items `role="option"`, `aria-selected`
- `ChatPanel.tsx` — messages need `role="log"`, `aria-live="polite"`
- `ErrorModal.tsx` — needs `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

### 45. 🟡 High Contrast Mode
**Issue:** Some themes (Cyberpunk, Ocean) have low contrast for text.
**Fix:** Add a high-contrast toggle that overrides theme colors with WCAG AAA-compliant contrast ratios (7:1 for normal text). Detect OS-level high contrast via `prefers-contrast: more`.

### 46. 🟡 Reduced Motion Mode
**Issue:** Canvas animations in `ThemeBackground.tsx` can cause motion sickness.
**Fix:** Respect `prefers-reduced-motion: reduce`. Disable all canvas animations and auto-scrolling effects. Use CSS transitions instead of JS animations.

### 47. 🟡 Font Size Scaling
**Issue:** Fixed font sizes don't accommodate users who need larger text.
**Fix:** Use `rem` units throughout. Add 3 font size presets (Small/Normal/Large) in AppearanceSettings. Respect OS-level font size settings.

### 48. 🟡 Multi-Window Support
**Issue:** Users want to open chat in one window and inbox in another.
**Fix:** Use `BroadcastChannel` API to sync Zustand stores across tabs:
```typescript
const channel = new BroadcastChannel("sherwinmail-sync");
channel.onmessage = (e) => useEmailStore.setState(e.data);
```
Share state across windows without a server.

### 49. 🟡 Focus Trap in Modals
**Issue:** Tab navigation can escape modals (`ErrorModal`, `ProviderSetupModal`).
**Fix:** Implement focus trapping: when modal opens, `focus` the first focusable element. Loop Tab through modal elements only. Return focus to trigger element on close.

### 50. 🟠 Custom Color Themes
**Issue:** 6 fixed themes. Users may want custom colors.
**Fix:** Add a custom theme editor: hue slider, saturation, brightness. Generate CSS variables dynamically. Persist as `sherwin_custom_theme` JSON.

---

## 🤖 AI/ML Enhancements (51-70)

### 51. 🟢 Tool Call Retry with Feedback
**Issue:** If `parseToolCall()` returns null, the AI's response is shown as raw text instead of retrying.
**Fix:** When no tool call is detected but the query is action-oriented, send a follow-up to the AI: "Please respond with a JSON tool call. Available tools: ..." Automatically retry up to 2 times.

### 52. 🟢 Per-Model System Prompt Templates
**Issue:** The same system prompt is used for all models. Smaller models need simpler instructions.
**Fix:** Create prompt templates per tier:
- Low: "Reply with ONE JSON tool call. No explanation."
- Medium: "Reply with a JSON tool call. Briefly explain what you did."
- High: Full system prompt with app state and tool descriptions.

### 53. 🟢 Tool Call Confidence Threshold
**Issue:** The model might output something that looks like a tool call but isn't.
**Fix:** Add confidence heuristics: if the JSON has unknown tool names or missing required fields, treat it as text instead of a tool call. Log and ignore malformed calls.

### 54. 🟡 Vision Model Support for ResumeScanner (WebGPU)
**Issue:** ResumeScanner blocks WebGPU entirely because not all WebGPU models are vision-capable.
**Fix:** Check if the loaded model is `Phi-3.5-vision` — if so, allow image upload and vision analysis even with WebGPU provider.

### 55. 🟡 Model Quantization Selection
**Issue:** Models are fixed at q4f16_1 quantization. Some users may want q3f16 for lower VRAM or q8f16 for higher quality.
**Fix:** Add quantization options to the model picker. Show VRAM/speed trade-off for each quantization level.

### 56. 🟡 Local RAG with @xenova/transformers
**Issue:** The AI has no long-term memory of past conversations or email context.
**Fix:** Add `@xenova/transformers` for local embedding generation. Store embeddings in IndexedDB. When a user asks a question, retrieve top-3 most relevant past emails/conversations and inject them into the context.
```bash
npm install @xenova/transformers
```
```typescript
import { pipeline } from "@xenova/transformers";
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const queryEmbedding = await extractor(query, { pooling: "mean", normalize: true });
```

### 57. 🟡 Agentic Multi-Step Loop
**Issue:** The tool system executes one tool call per response. Complex tasks ("find all unread Stripe emails and draft replies") need multiple calls.
**Fix:** Add a loop in `ChatPanel.tsx`:
```typescript
let iterations = 0;
const maxIterations = 5;
while (iterations < maxIterations) {
  const response = await chatCompletion(messages, ...);
  const toolCall = parseToolCall(response);
  if (!toolCall) break;
  const result = await executeTool(toolCall);
  messages.push({ role: "system", content: `Tool result: ${result}` });
  iterations++;
}
```

### 58. 🟡 Concurrent Tool Execution
**Issue:** Each tool call is sequential. Some tools (search_emails + get_app_state) are independent.
**Fix:** Allow the AI to output an array of tool calls: `[{tool: "search_emails", args: {...}}, {tool: "get_app_state", args: {}}]`. Execute in parallel with `Promise.all()`. Merge results.

### 59. 🟡 Tool Feedback Loop
**Issue:** After a tool executes, the AI summarizes the result but doesn't see the raw output.
**Fix:** Include raw tool output in the system turn so the AI can use it for follow-up decisions. For example, after `search_emails` returns results, the AI can ask "Which one should I reply to?"

### 60. 🟡 Custom Tool Definitions from User
**Issue:** Tools are hardcoded. Power users might want custom automations.
**Fix:** Allow users to define custom tools via a JSON editor in Settings. Store in localStorage. Register them alongside built-in tools.
```typescript
interface CustomTool {
  name: string;
  prompt: string; // "When I say X, do Y"
  action: "compose_draft" | "search" | "navigate" | "run_script";
  parameters: Record<string, string>;
}
```

### 61. 🟡 Batch Email Generation
**Issue:** User must generate one draft at a time. For mass outreach (50+ candidates), this is tedious.
**Fix:** Add a batch mode: upload CSV of `[Company, Role, Contact, Email]`, select tone, click "Generate All". Create 50 drafts in parallel with a progress bar. Each uses the tool system.

### 62. 🟡 A/B Testing Email Drafts
**Issue:** User can't compare multiple draft versions.
**Fix:** When generating, produce 3 variants (formal, direct, creative). Show them side by side. Let the user pick one or merge elements.

### 63. 🟡 Draft Quality Scoring
**Issue:** No objective measure of draft quality.
**Fix:** After generation, run a local scoring model or heuristic rules:
- Length check (too short/long)
- Placeholder count (too many [Brackets] = low quality)
- Spam trigger words
- Readability score (Flesch-Kincaid)
- Tone consistency check

### 64. 🟡 Follow-Up Reminder AI
**Issue:** If a sent email gets no reply, the user has to remember to follow up.
**Fix:** After sending, create a follow-up task: "Follow up in 3 days if no reply." AI generates a follow-up draft when the reminder fires.

### 65. 🟡 Smart Reply Suggestions
**Issue:** User must type every reply from scratch.
**Fix:** When viewing an email, show 3 AI-generated quick reply buttons: "Accept meeting", "Decline politely", "Ask for more info". Click inserts into compose.

### 66. 🟡 Email Categorization AI
**Issue:** All emails land in one inbox. No auto-labeling.
**Fix:** On receiving/drafting, run a local classifier to tag emails: `job-application`, `follow-up`, `networking`, `interview-scheduling`, `offer`, `rejection`, `other`. Show filters in sidebar.

### 67. 🟡 Sentiment Analysis on Received Emails
**Issue:** User can't quickly gauge the tone of a long email.
**Fix:** Run local sentiment analysis. Show a small emoji indicator in the email list: 😊 positive, 😐 neutral, 😟 negative, 😡 angry.

### 68. 🟠 Fine-Tuning Interface
**Issue:** The AI uses generic outreach templates. Users have their own voice.
**Fix:** Provide a fine-tuning UI where users paste 5-10 examples of their past emails. Use LoRA adapters to fine-tune a small model locally. Store adapter weights in IndexedDB.

### 69. 🔴 Multi-Model Ensemble
**Issue:** One model makes mistakes. Two models can cross-check.
**Fix:** Run the same prompt through two models (e.g., Qwen 1.5B + Phi-3.5 Mini). Compare outputs. If they disagree on key facts (names, dates), flag for user review.

### 70. 💎 On-Device RLHF
**Issue:** The model can't learn from user corrections.
**Fix:** When user edits an AI-generated draft, log the edit as preference data. Periodically fine-tune the model using RLHF (Reinforcement Learning from Human Feedback) locally. Users train their own personalized model over time.

---

## 🏗️ Architecture & Code Quality (71-85)

### 71. 🟢 Strict TypeScript Mode
**Issue:** `tsconfig.json` likely has `strict: false` or `strict: true` with gaps.
**Fix:** Enable `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Fix all resulting type errors.

### 72. 🟢 ESLint Rule Enforcement in CI
**Issue:** ESLint runs locally but there's no enforcement.
**Fix:** Add `lint-staged` to run ESLint on staged files pre-commit.

### 73. 🟢 Path Aliases for All Imports
**Issue:** Mix of `@/` and relative imports (`../../stores/`).
**Fix:** Use only `@/` aliases. Update `tsconfig.json` paths:
```json
{
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/components/*"],
    "@utils/*": ["src/utils/*"],
    "@stores/*": ["src/stores/*"],
    "@types/*": ["src/types/*"]
  }
}
```

### 74. 🟢 Consistent Error Handling Pattern
**Issue:** Errors are handled ad-hoc: some with try/catch, some with `.catch()`, some unhandled.
**Fix:** Create a centralized error handler:
```typescript
export function handleError(error: unknown, context: string): { message: string; userMessage: string } {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ${message}`);
  return { message, userMessage: friendlyError(message) };
}
```

### 75. 🟢 Barrel Exports for Components
**Issue:** `page.tsx` has 15+ import lines for components.
**Fix:** Create `src/components/index.ts` that re-exports all components:
```typescript
export { default as MailSidebar } from "./MailSidebar";
export { default as MailList } from "./MailList";
// ...
```

### 76. 🟡 Zustand Store Tests
**Issue:** No tests for store logic.
**Fix:** Test email store actions:
```typescript
describe("emailStore", () => {
  it("addEmail pushes to the top", () => {
    const store = useEmailStore.getState();
    store.addEmail({ id: "1", subject: "Test", ... });
    expect(useEmailStore.getState().emails[0].id).toBe("1");
  });
});
```

### 77. 🟡 Component Storybook
**Issue:** No isolated component development environment.
**Fix:** Add Storybook for UI components. Start with `MailDetail`, `ChatPanel`, `ErrorModal`, `ProviderSettings`. Document states: loading, empty, error, populated.

### 78. 🟡 Service Layer Abstraction
**Issue:** AI providers are hard-switched with if/else. Adding a new provider requires touching multiple files.
**Fix:** Create an abstract provider interface:
```typescript
interface AIProvider {
  name: string;
  check(): Promise<boolean>;
  chat(req: ChatRequest): Promise<string>;
  models(): Promise<string[]>;
  embed?(text: string): Promise<number[]>;
}
```
Implement `WebGPUProvider`, `OllamaProvider`, `LMStudioProvider`, `APIProvider`. Register in a provider registry.

### 79. 🟡 Event-Driven Architecture for Tool System
**Issue:** Tool calls directly mutate Zustand stores. No event log, no hooks for plugins.
**Fix:** Add an event bus:
```typescript
type Event = { type: "email.created"; data: Email } | { type: "email.sent"; data: Email };
const eventBus = new EventTarget();
// Tools dispatch events
// Plugins, audit log, undo system subscribe
```

### 80. 🟡 Plugin System
**Issue:** All features are hardcoded in the monolith.
**Fix:** Design a plugin API:
- Plugins register tools
- Plugins register system prompt injections
- Plugins register UI elements (sidebar items, buttons)
- Plugins are loaded from `src/plugins/*.ts`
- Example plugins: "LinkedIn Integration", "Grammar Checker", "Schedule Optimizer"

### 81. 🟡 Feature Flags
**Issue:** No way to gradually roll out new features.
**Fix:** Add a feature flag system:
```typescript
const features = {
  agenticLoop: false,
  batchDraft: true,
  smartReply: false,
};
// Check before rendering new UI
{features.smartReply && <SmartReplyButtons />}
```

### 82. 🟡 Dependency Injection for Stores
**Issue:** Tool executors import `useEmailStore` directly. Hard to test or mock.
**Fix:** Pass store references to tool executors:
```typescript
interface ToolContext {
  emailStore: typeof useEmailStore;
  smtpStore: typeof useSmtpStore;
  aiService: AIService;
}
execute: async (args, ctx: ToolContext) => { ... }
```

### 83. 🟡 Automated Accessibility Testing
**Issue:** No automated a11y checks.
**Fix:** Add `@axe-core/playwright` or `jest-axe` to CI. Audit all pages for WCAG 2.1 AA compliance.

### 84. 🟡 Environment-Specific Configs
**Issue:** All config (API endpoints, provider defaults) is hardcoded.
**Fix:** Create environment configs:
```
.env.local           → local development
.env.staging         → staging
.env.production      → production
```
Variables: `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_DEFAULT_MODEL`, `NEXT_PUBLIC_SEARCH_ENDPOINT`.

### 85. 🔴 Monorepo Split
**Issue:** Single package.json with everything. Hard to share types/utils between packages.
**Fix:** Split into:
- `packages/core/` — types, stores, tool system
- `packages/ai/` — AI providers, model catalog
- `packages/ui/` — React components
- `apps/sherwinmail/` — Next.js app
Use Turborepo or Nx for build orchestration.

---

## 💾 Data & Storage (86-95)

### 86. 🟡 IndexedDB Migration
**Issue:** localStorage caps at 5MB, no querying, synchronous.
**Fix:** Use `idb` wrapper:
```typescript
import { openDB } from "idb";
const db = await openDB("SherwinMail", 1, {
  upgrade(db) {
    db.createObjectStore("emails", { keyPath: "id" });
    db.createObjectStore("drafts", { keyPath: "id" });
    db.createObjectStore("settings");
  },
});
```
Replace Zustand's `persist` storage with IndexedDB adapter.

### 87. 🟡 Full-Text Search
**Issue:** Email search is `Array.filter()` with `includes()`. No ranking.
**Fix:** Use IndexedDB's `IDBObjectStore.index()` for field-specific queries. For full-text, use a simple inverted index built on write:
```typescript
const index: Record<string, Set<string>> = {};
// On save: tokenize body, add to index
body.toLowerCase().split(/\W+/).forEach(word => {
  (index[word] ??= new Set()).add(email.id);
});
```

### 88. 🟡 Email Threading (Conversation View)
**Issue:** Replies are separate emails. No threading.
**Fix:** Detect thread parent by normalized subject + `In-Reply-To` header (for SMTP). Group into conversations. Show threaded view with expand/collapse.

### 89. 🟡 Attachment Storage
**Issue:** No support for email attachments.
**Fix:** Store attachments as blobs in IndexedDB. Max size: 25 MB per attachment. Show attachment list in email detail. Download via `URL.createObjectURL()`.

### 90. 🟡 Import/Export Settings & Data
**Issue:** No way to back up or migrate.
**Fix:** Export all data as a single JSON blob:
```typescript
const export = async () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    emails: useEmailStore.getState().emails,
    settings: { provider: localStorage.getItem("sherwin_ai_provider"), ... },
    templates: localStorage.getItem("sherwin_templates"),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  // Trigger download
};
```
Import: validate version, merge or replace existing data.

### 91. 🟡 Data Migration Framework
**Issue:** As the schema evolves, old localStorage data becomes incompatible.
**Fix:** Implement versioned migrations:
```typescript
const CURRENT_VERSION = 3;
const migrate = (data: any, fromVersion: number) => {
  if (fromVersion < 2) data = { ...data, newField: [] };
  if (fromVersion < 3) data = { ...data, otherField: "" };
  return data;
};
```

### 92. 🟡 Automatic Data Compaction
**Issue:** IndexedDB/dexie grows over time with deleted records and stale data.
**Fix:** Run periodic compaction: remove deleted emails after 30 days, compress old audit logs, vacuum IndexedDB.

### 93. 🟡 Resume Blob Storage
**Issue:** Uploaded resumes are stored as text in state. Original PDF/images are lost.
**Fix:** Store uploaded files as blobs in IndexedDB. Link to email drafts. Enable re-download.

### 94. 🟡 Sync Across Devices (End-to-End Encrypted)
**Issue:** Each browser/device has its own localStorage. No sync.
**Fix:** Add optional sync via a sync server (user-provided or self-hosted):
1. All data encrypted client-side before upload
2. Server stores encrypted blobs keyed by device ID
3. Other devices pull encrypted blobs, decrypt locally
4. Conflict resolution: last-write-wins with local backup

### 95. 🔴 CRDT-Based Real-Time Sync
**Issue:** Simple sync (last-write-wins) loses concurrent edits.
**Fix:** Use CRDTs (Conflict-Free Replicated Data Types) via `@liveblocks/yjs` or `automerge`. Allows real-time collaboration and offline edits that merge automatically.

---

## 🌐 Integration & APIs (96-110)

### 96. 🟢 Clipboard API for Drafts
**Issue:** User must manually copy generated drafts.
**Fix:** Add a "Copy to Clipboard" button next to generated drafts in MailDetail and ChatPanel.
```typescript
await navigator.clipboard.writeText(draftBody);
```

### 97. 🟢 Share API
**Issue:** No way to share emails outside the app.
**Fix:** Use Web Share API:
```typescript
if (navigator.share) {
  await navigator.share({ title: email.subject, text: email.body });
}
```

### 98. 🟢 Quick Actions from OS Notifications
**Issue:** No way to act on notifications.
**Fix:** When using as PWA, add notification actions: "Reply", "Mark Read", "Archive".

### 99. 🟡 LinkedIn Profile Integration
**Issue:** User must manually copy-paste LinkedIn profiles for resume analysis.
**Fix:** Add a "Import from LinkedIn" button that accepts a LinkedIn profile URL. Use a local puppeteer-like scraper or prompt the user to paste profile HTML.

### 100. 🟡 Indeed/Glassdoor Job Import
**Issue:** User must manually copy job descriptions.
**Fix:** Add a browser bookmarklet that extracts job details from Indeed/Glassdoor/LinkedIn pages and injects them into SherwinMail via URL parameters.

### 101. 🟡 Calendar Integration
**Issue:** Scheduling emails requires manual date/time entry.
**Fix:** Add a local calendar view. Parse dates from emails ("Tuesday at 2pm") and offer to add to calendar. Use `ics` format for export.

### 102. 🟡 Nodemailer SMTP Send
**Issue:** The app can't send emails.
**Fix:** Create `src/app/api/send/route.ts`:
```typescript
import nodemailer from "nodemailer";
export async function POST(req: Request) {
  const { host, port, secure, user, pass, to, subject, text } = await req.json();
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.sendMail({ from: user, to, subject, text });
  return Response.json({ ok: true });
}
```

### 103. 🟡 IMAP/POP3 Email Receiving
**Issue:** Emails are manually created. No incoming email from real accounts.
**Fix:** Add `src/app/api/receive/route.ts` using IMAP. Fetch emails from a configured account. Parse and store in the local email list. Poll every N minutes or use IDLE push.

### 104. 🟡 Multiple Email Accounts
**Issue:** Single email identity.
**Fix:** Allow multiple SMTP/IMAP configurations. Show sender selection in compose. Route replies through the correct account.

### 105. 🟡 Webhook Endpoints
**Issue:** No way for external services to trigger actions in SherwinMail.
**Fix:** Add webhook receiver:
```
POST /api/webhook/inbound-email → creates a new email in inbox
POST /api/webhook/calendar-event → creates a scheduling draft
```
Useful for Zapier/Make/IFTTT integrations.

### 106. 🟡 OAuth2 for Gmail/Outlook
**Issue:** SMTP with username/password is increasingly blocked by Google/Microsoft.
**Fix:** Implement OAuth2 flow for Gmail and Outlook:
```typescript
// Redirect to Google OAuth
window.location.href = `https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=https://mail.google.com/&response_type=code`;
// Exchange code for tokens via /api/auth/google/callback
// Store refresh token encrypted, access token in memory
```

### 107. 🟡 Grammarly/LanguageTool Integration
**Issue:** Generated drafts may have grammar issues.
**Fix:** Add a "Check Grammar" button that sends draft text through LanguageTool's public API (self-hosted or public). Highlight issues inline.

### 108. 🟡 Self-Hosted Web Search Backend
**Issue:** `/api/search` uses an external search API.
**Fix:** Allow configuration of a self-hosted search backend (SearXNG, Mojeek). User privacy is preserved when both the AI and search run locally.

### 109. 🟡 Zapier/Make.com Integration
**Issue:** No workflow automation.
**Fix:** Expose public actions via webhook:
- `Create draft` → webhook → SherwinMail
- `Send email` → webhook → SherwinMail
- `Search emails` → webhook → SherwinMail
Status: design webhook format, implement handlers.

### 110. 🔴 Full Gmail/Outlook/ProtonMail Sync
**Issue:** Isolated email system. No connection to real email accounts.
**Fix:** Bidirectional sync via IMAP/Gmail API/Graph API:
- Pull emails → local IndexedDB
- Push sent emails → remote server
- Handle deletions, flag changes, folder moves
- Conflict resolution: remote wins for flags, local wins for drafts

---

## 🚀 Distribution & Deployment (111-120)

### 111. 🟢 GitHub Actions CI
**Issue:** No CI pipeline.
**Fix:** `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

### 112. 🟢 Dependabot Configuration
**Issue:** Dependencies are manually updated.
**Fix:** `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      minor-patch:
        update-types: ["minor", "patch"]
```

### 113. 🟢 Prettier Code Formatting
**Issue:** No automatic formatting.
**Fix:** Add `.prettierrc` and `npm run format` script. Enforce in CI.

### 114. 🟡 Docker Development Environment
**Issue:** Setting up the dev environment requires Node.js, npm, and manual steps.
**Fix:** `Dockerfile` + `docker-compose.yml`:
```yaml
version: "3"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development
```

### 115. 🟡 Static Export for Any Hosting
**Issue:** Currently configured for Vercel. Not portable.
**Fix:** enable `output: "export"` in `next.config.ts` for a fully static build. Deployable to Netlify, GitHub Pages, S3, or any static file server.

### 116. 🟠 Electron Desktop App
**Issue:** Browser tabs have limited GPU context persistence and no system tray.
**Fix:** Wrap with Electron:
```bash
npx create-next-app -e with-electron
```
Benefits: dedicated GPU context, system tray, native notifications, auto-start, offline PWA without browser, custom protocol (`sherwinmail://`).

### 117. 🟠 Tauri Desktop App
**Issue:** Electron is heavy (~150 MB).
**Fix:** Rewrite desktop wrapper in Tauri (Rust backend, web frontend). Bundle size ~5 MB. Better performance, smaller memory footprint.

### 118. 🟠 iOS/Android WebView Wrapper
**Issue:** No mobile app.
**Fix:** Create a simple native wrapper (Swift for iOS, Kotlin for Android) that opens the PWA in a full-screen WebView. Add share intent to receive text from other apps.

### 119. 🟠 Chrome Extension (Side Panel)
**Issue:** Users want AI drafting while browsing LinkedIn/Indeed.
**Fix:** Build a Chrome Extension with side panel:
- Opens SherwinMail in an `iframe` or standalone popup
- Context menu: "Send to SherwinMail" on any text selection
- Auto-detect job pages and extract company/role

### 120. 🔴 Firefox Add-on + Safari Extension
**Issue:** Chrome-only limits reach.
**Fix:** Port the extension to Firefox (WebExtensions API) and Safari (Xcode project). Maintain a shared core with platform-specific wrappers.

---

## 📊 Analytics & Feedback (121-128)

### 121. 🟢 Error Reporting with User Consent
**Issue:** Errors are invisible unless the user opens DevTools.
**Fix:** Add an opt-in error reporter that captures runtime errors and shows a "Send report" dialog. No PII included. Store reports in IndexedDB for user review.

### 122. 🟢 Usage Statistics (Local Only)
**Issue:** No insight into how the app is being used.
**Fix:** Track anonymous usage stats locally:
- Emails sent/drafted per day
- Most used AI features
- Model load times
- Error rates
Show in a "Insights" dashboard. All data stays on device.

### 123. 🟡 User Feedback Inbox
**Issue:** No way for users to report issues or suggestions.
**Fix:** Add a "Send Feedback" button in settings. Creates a draft email addressed to the developer's configured address. App includes system info (browser, GPU, model).

### 124. 🟡 Automated Bug Reproduction
**Issue:** Bug reports lack context.
**Fix:** Add a "Record Bug" feature: captures recent actions, console logs, and app state as a JSON blob. User can download and share.

### 125. 🟡 Session Replay (Local)
**Issue:** Can't see what led to an error.
**Fix:** Record a session replay as a sequence of state snapshots (not video). Store last 100 actions. On error, save replay for developer inspection.

### 126. 🟡 Model Performance Benchmarks
**Issue:** No data on which models perform best for which tasks.
**Fix:** Add a benchmark mode:
- Test each model on: draft quality score, speed (tokens/sec), VRAM usage, JSON reliability
- Display results in a comparison table
- Auto-recommend the best model for the user's hardware + workload

### 127. 🟡 A/B Testing Framework
**Issue:** Can't measure if new features improve user outcomes.
**Fix:** Add a local A/B testing system:
- Define experiments in a config file
- Randomly assign users to control/treatment groups (seeded by device ID)
- Track key metrics (drafts created, emails sent, time in app)
- Show results dashboard (all local, no server)

### 128. 🟡 User Onboarding Flow (Interactive Tutorial)
**Issue:** New users see a blank workspace with no guidance.
**Fix:** Build an interactive tutorial overlay:
1. "This is your inbox" → highlights MailList
2. "Click here to compose" → points to Compose button
3. "Try asking the AI" → triggers a sample chat
4. "Configure your provider" → points to Settings
Progress persisted. Option to skip.

---

## 🧪 Testing & Quality (129-140)

### 129. 🟢 Add Vitest Configuration
**Files:** `vitest.config.ts`
**Fix:**
```typescript
import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  test: { environment: "jsdom", globals: true },
  resolve: { alias: { "@": path.resolve("./src") } },
});
```

### 130. 🟡 Unit Test: Tool Registry
**Test:** Every tool executor with valid and invalid args.
**Files:** `src/utils/__tests__/tools.test.ts`
**Cases:**
- `create_draft` with valid email → draft added
- `create_draft` with missing `to` → error message
- `search_emails` with matching/non-matching queries
- `navigate_to` with invalid folder → error
- `parseToolCall` with JSON, markdown, and plain text

### 131. 🟡 Unit Test: Model Catalog
**Test:** Tier assignment and preset functions.
**Files:** `src/utils/__tests__/aiService.test.ts`
**Cases:**
- Every model has a valid `tier`
- `getTierForVram` returns correct tier at boundary values
- `getDefaultModelForTier` returns a model within the tier
- `getModelsByTier` excludes models from other tiers

### 132. 🟡 Unit Test: WebGPU Detection
**Test:** Detection pipeline with mocked WebGPU APIs.
**Files:** `src/utils/__tests__/webgpu.test.ts`
**Cases:**
- `navigator.gpu` exists → returns supported
- `navigator.gpu` missing → returns `supported: false`
- Adapter request fails → graceful error
- shader-f16 missing → feature reported

### 133. 🟡 Unit Test: Browser Detection
**Test:** User agent parsing.
**Files:** `src/utils/__tests__/browser.test.ts`
**Cases:**
- Chrome, Firefox, Safari, Edge, Brave, Opera
- Unknown browser → fallback label

### 134. 🟡 Integration Test: Email CRUD
**Test:** Full email lifecycle through Zustand stores.
**Files:** `src/stores/__tests__/emailStore.test.ts`
**Cases:**
- Create draft → appears in list
- Update draft → fields change
- Delete draft → removed from list
- Switch folder → filtered list

### 135. 🟡 Integration Test: SMTP Store
**Test:** Provider presets and connection test.
**Files:** `src/stores/__tests__/smtpStore.test.ts`
**Cases:**
- Select ProtonMail → server: 127.0.0.1, port: 1025
- Select Gmail → server: smtp.gmail.com, port: 587
- Save and test → loading state transitions

### 136. 🟡 Component Test: MailList
**Test:** Rendering email list with various states.
**Files:** `src/components/__tests__/MailList.test.tsx`
**Cases:**
- Empty list → "No emails" message
- List with emails → renders correctly
- Search filter → filters displayed emails
- Click on email → calls onSelect

### 137. 🟡 Component Test: ChatPanel
**Test:** Chat interface and tool integration.
**Files:** `src/components/__tests__/ChatPanel.test.tsx`
**Cases:**
- Send message → adds user message
- AI responds → adds assistant message
- Tool call detected → shows summary
- Web search trigger → shows searching indicator

### 138. 🟡 E2E Test: Full Draft + Send Flow
**Test:** Complete user journey.
**Files:** `e2e/draft-and-send.spec.ts` (Playwright)
**Cases:**
- Navigate to inbox
- Click compose
- Fill draft
- Generate AI pitch
- Review and send
- Verify draft moves to Sent

### 139. 🟡 E2E Test: Model Loading
**Test:** Model loading flow.
**Files:** `e2e/model-loading.spec.ts`
**Cases:**
- Open chat without provider → prompt to configure
- Load mock assistant → fallback mode active
- Try loading WebGPU model → progress bar shown

### 140. 🟡 Performance Test: Email List Rendering
**Test:** 1000 email render performance.
**Files:** `e2e/performance.spec.ts`
**Cases:**
- Load 1000 emails
- Measure initial render time (< 500ms)
- Measure search filter time (< 50ms)
- Measure scroll FPS (> 30fps)

---

## 🌍 Internationalization (141-146)

### 141. 🟡 i18n Framework
**Issue:** English-only UI.
**Fix:** Add `next-intl` or `react-i18next`:
```bash
npm install next-intl
```
```typescript
// messages/en.json
{ "sidebar.inbox": "Inbox", "chat.input.placeholder": "Ask me anything..." }
```

### 142. 🟡 Right-to-Left (RTL) Support
**Issue:** Arabic, Hebrew, Persian users can't use the app.
**Fix:** Add `dir="rtl"` support. Flip layout: sidebar on the right, text alignment, icon order. CSS logical properties (`margin-inline-start` instead of `margin-left`).

### 143. 🟡 Date/Time Formatting by Locale
**Issue:** Dates are in US format (Apr 5, 2026).
**Fix:** Use `Intl.DateTimeFormat` with user's locale:
```typescript
new Intl.DateTimeFormat(navigator.language, { dateStyle: "medium" }).format(new Date());
```

### 144. 🟡 AI Prompt Translation
**Issue:** System prompts are in English. AI responds in English.
**Fix:** Add a language parameter to AI calls. Prepend "Respond in {language}" to system prompts. Translate UI strings via i18n.

### 145. 🟡 Multi-Language Draft Templates
**Issue:** Outreach templates are English-only.
**Fix:** Provide template sets per language. Allow users to select output language for AI-generated drafts.

### 146. 🟡 Keyboard Shortcut Localization
**Issue:** `Ctrl+` shortcuts assume QWERTY layout.
**Fix:** For AZERTY (French), use `Ctrl+Z` for undo (same position as `Ctrl+Y` on QWERTY). Detect keyboard layout via `navigator.keyboard.getLayoutMap()`.

---

## 🛠️ Developer Experience (147-155)

### 147. 🟢 Hot Module Replacement for Stores
**Issue:** Changing Zustand store code requires full page reload.
**Fix:** Ensure Zustand stores support HMR via `replaceReducer` pattern.

### 148. 🟢 VS Code Debugger Config
**Issue:** No preconfigured debugger.
**Fix:** `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: Debug",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    }
  ]
}
```

### 149. 🟢 ESLint Plugin for Import Order
**Issue:** Imports are unordered.
**Fix:** Add `eslint-plugin-import` with groups: `react` → `next` → `@/*` → `./`.

### 150. 🟢 Pre-commit Hooks
**Issue:** Lint/type errors can be committed.
**Fix:** Add `husky` + `lint-staged`:
```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.json": ["prettier --write"]
}
```

### 151. 🟡 OpenAPI/Swagger for API Routes
**Issue:** `/api/extract` and `/api/search` have no documentation.
**Fix:** Add JSDoc comments or an OpenAPI spec file:
```typescript
/**
 * POST /api/extract
 * Extracts text from a PDF file
 * Request: multipart/form-data with "file" field
 * Response: { text: string, pages: number, words: number }
 */
```

### 152. 🟡 API Route Tests
**Issue:** No tests for API routes.
**Fix:** Use Vitest with `next-test-utils`:
```typescript
import { createRequest } from "next-test-utils";
const req = createRequest("http://localhost/api/extract", {
  method: "POST",
  body: formData,
});
const res = await POST(req);
expect(res.status).toBe(200);
```

### 153. 🟡 Database Schema Documentation
**Issue:** IndexedDB schema is ad-hoc.
**Fix:** Maintain a schema definition file:
```typescript
/** @schema 1.0.0 */
export const SCHEMA = {
  emails: {
    keyPath: "id",
    indexes: { status: "status", date: "date", from: "from", subject: "subject" },
  },
  drafts: {
    keyPath: "id",
    indexes: { updatedAt: "updatedAt" },
  },
};
```

### 154. 🟡 Automated Changelog Generation
**Issue:** No changelog.
**Fix:** Use `standard-version` or `semantic-release` to generate CHANGELOG.md from conventional commits.

### 155. 🟡 Contributor Guide
**Issue:** No onboarding for new contributors.
**Fix:** Create `CONTRIBUTING.md` covering: setup, code style, PR workflow, testing guidelines, architecture overview.

---

## 💎 Moonshots (156-165)

### 156. 💎 Local Voice Clone for AI Outreach
**Issue:** Emails are text. Voice outreach is more personal.
**Fix:** Use a local TTS model (e.g., `xtts` via WebAssembly) to generate voice recordings of outreach messages. User records 30 seconds of their voice → AI generates personalized voice messages.

### 157. 💎 Real-Time Translation During Chat
**Issue:** AI only responds in one language.
**Fix:** Add a local NMT model (e.g., `M2M-100` via WebLLM or ONNX). Translate user input to English → process → translate back to user's language. All local, no data leaves.

### 158. 💎 AI Negotiation Agent
**Issue:** The AI can draft emails but can't handle negotiations.
**Fix:** Build a negotiation loop: AI receives a reply, analyzes it for sentiment/key points, drafts a counter-proposal, user approves. Used for salary negotiation, contract terms, scheduling conflicts.

### 159. 💎 Automated Job Application Pipeline
**Issue:** Manual process: find job → write email → apply → track.
**Fix:** Full pipeline:
1. User pastes a job URL
2. AI extracts company, role, requirements
3. AI searches for mutual connections (if LinkedIn connected)
4. AI generates outreach + cover letter + resume tweaks
5. User reviews and sends
6. AI tracks application status and follows up

### 160. 💎 Peer-to-Peer Email via WebRTC
**Issue:** SMTP requires a server. What if two SherwinMail users could email directly?
**Fix:** Use WebRTC with a signaling server. When both users have SherwinMail open, establish a direct P2P connection. Emails transfer directly, encrypted, with no intermediate server.

### 161. 💎 Decentralized Identity (DID) for Email
**Issue:** Email identity is tied to SMTP credentials.
**Fix:** Implement W3C Decentralized Identifiers. Users control their own identity via a local keypair. Emails are signed with the private key. Recipients verify with the public key on a blockchain or DHT.

### 162. 💎 On-Device Federated Learning
**Issue:** The AI doesn't improve with use.
**Fix:** Implement federated learning: user corrections (edits to AI drafts) become training data. A local training loop fine-tunes the model. Only model updates (gradients, not data) would be shared if aggregation is opted in.

### 163. 💎 Visual Email Campaign Designer
**Issue:** Power users want visual automation.
**Fix:** Drag-and-drop campaign builder:
```
[Trigger: Email Received from X]
  → [Condition: Contains "meeting"]
    → [Action: Create Draft Reply]
      → [Action: Suggest Times from Calendar]
  → [Condition: Contains "invoice"]
    → [Action: Forward to Accounting]
```
Export as JSON automation rules.

### 164. 💎 AR/VR Email Workspace
**Issue:** Flat 2D interface.
**Fix:** WebXR-based 3D email workspace. Emails float as cards in 3D space. Gesture to organize. AI assistant as a 3D avatar. Vision: a "Minority Report" interface for email.

### 165. 💎 Neural Interface (BCI) Integration
**Issue:** Keyboard/mouse are slow.
**Fix:** Integrate with consumer BCI devices (Muse, Neurosity). Detect intent (want to reply, want to delete) from brain signals. AI drafts based on thought patterns. Far future, but the app architecture supports the plug-in model.

---

## 📋 Summary by Impact & Effort

| Category | 🟢 Quick Wins | 🟡 Moderate | 🟠 Large | 🔴 Transformative | 💎 Moonshot |
|----------|:---:|:---:|:---:|:---:|:---:|
| Performance | 3 | 5 | 4 | 1 | 1 |
| Security & Privacy | 3 | 5 | 4 | 1 | 2 |
| UX & Accessibility | 10 | 6 | 1 | 0 | 0 |
| AI/ML | 3 | 7 | 2 | 2 | 3 |
| Architecture | 4 | 5 | 5 | 1 | 0 |
| Data & Storage | 0 | 7 | 1 | 1 | 1 |
| Integration | 3 | 6 | 3 | 1 | 0 |
| Distribution | 3 | 1 | 3 | 1 | 0 |
| Analytics | 2 | 2 | 3 | 0 | 0 |
| Testing | 1 | 6 | 2 | 0 | 0 |
| i18n | 0 | 4 | 1 | 0 | 0 |
| Dev Experience | 4 | 2 | 0 | 0 | 0 |
| Moonshots | 0 | 0 | 0 | 0 | 10 |
| **Total** | **36** | **56** | **29** | **8** | **17** |

**146 recommendations total (36 quick wins, 56 moderate, 29 large, 8 transformative, 17 moonshots)**

---

## Top 10 Most Impactful Next Steps

| Rank | Recommendation | Effort | Impact | Why |
|:----:|---------------|--------|--------|-----|
| 1 | **Real SMTP Send** (#102) | 🟡 | 🔥 | Core feature gap — email client that can't send email |
| 2 | **Keyboard Shortcuts** (#31) | 🟢 | 🔥 | Most requested UX improvement |
| 3 | **Error Boundaries** (#6 in priorities) | 🟢 | 🔥 | One crash shouldn't kill the whole app |
| 4 | **GPU-Aware Model Auto-Select** | 🟢 | 🔥 | All data exists, just needs wiring |
| 5 | **NLP Command Parser** (#51) | 🟢 | 🔥 | Makes tool system work with small models |
| 6 | **IndexedDB Migration** (#86) | 🟠 | 🔥 | Unlocks everything below |
| 7 | **PWA + Offline** (#43) | 🟡 | 🔥 | Installable, works offline |
| 8 | **Drag-and-Drop Folders** (#32) | 🟢 | 🔥 | Visual organization |
| 9 | **Undo/Redo** (#35) | 🟡 | 🔥 | Safety net for email ops |
| 10 | **Agentic Loop** (#57) | 🟠 | 🔥 | One command → multi-step task completion |

---

*Generated 2026-07-03. This is a living document — add new ideas as they emerge.*
