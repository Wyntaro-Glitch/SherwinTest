# SherwinMail Development Plan

## 🎯 Mission Statement: Your Data, Your PC
SherwinMail is a Privacy-Engineered Career Assistant. We provide the power of AI job application orchestration without sacrificing user privacy. Our core philosophy is autonomy: the AI runs locally, data stays on the user's PC, and the system acts as a trusted anchor for professional correspondence.

## 🚀 Detailed Roadmap

### Phase 1: Project Setup & Privacy Diagnostics
- Establish Next.js App Router structure.
- Implement WebGPU capability detection.
- Develop a "Privacy & Hardware Dashboard" that greets the user by verifying their GPU support before AI initialization.
- Create a clear "Zero-Data-Transfer" policy banner within the UI to reassure users from the start.

### Phase 2: Knowledge Extraction & User Context
- Create a Next.js API Route (`/api/extract`) for local PDF parsing using `pdf-parse`.
- Develop a "User Profile" module (local JSON storage) where users save their resume and experience.
- Implement context-aware extraction that takes the uploaded Job Description and matches it against the user's locally saved profile.
- Add client-side PDF preview to allow users to verify file content before extraction.

### Phase 3: AI Orchestration & Safety
- Offload `AIService` logic to a Web Worker for 60 FPS UI responsiveness.
- Map hardware adapter limits to specific model tiers (Auto-select: Tiny/Small/Medium).
- Implement strict "bracket identifier" logic to ensure placeholders (like `[Company Name]`) are mandatory when details are missing.
- Add a "Hallucination Scanner" UI component that automatically highlights any `[...]` brackets in the generated draft.
- Provide a "Model Download Manager" to show progress and cached status.

### Phase 4: SMTP & Email Orchestration
- Secure SMTP settings in local storage with encryption.
- Create a side-by-side view (Job Description context vs. Generated Email) for easy verification.
- Implement a "Local Template Library" so users can save and reuse their own "winning" email structures.
- Integrate `nodemailer` for backend dispatching.
- Add an "Email Variations" feature to toggle the tone (Formal, Direct, Creative) before finalizing.

### Phase 5: Scalability & Advanced Features
- Integrate IndexedDB for offline persistence of application history.
- Implement model weight caching to avoid re-downloads across browser sessions.
- Perform a thorough audit of Web Worker communication to eliminate data-transfer bottlenecks.
- Create a "Fine-Tuning Hook" UI to allow users to upload past successful emails to create a personalized, local context (RAG - Retrieval-Augmented Generation) for the AI.

## 🚀 Advanced Website Optimization Strategy
- **PWA Conversion**: Implement `next-pwa` to enable true offline functionality and Service Worker caching.
- **Bundle Optimization**: Integrate `@next/bundle-analyzer` to minimize the footprint of AI library imports.
- **Lazy Loading**: Use `React.Suspense` and dynamic imports to defer AI service loading until the user explicitly clicks "Compose."
- **Asset Preloading**: Preload critical UI components to reduce LCP (Largest Contentful Paint).
- **Token Streaming**: Refine token streaming from Web Worker to UI to ensure smooth, non-blocking text generation.

## 🛠️ Technical Considerations
- **Privacy**: All AI processing MUST remain client-side.
- **Hardware Fallbacks**: Provide a clear UI to select alternative hardware or lighter models if GPU detection fails.
- **Performance**: Maintain 60 FPS by ensuring all heavy computation is off-main-thread.
- **Error Handling**: Graceful fallback to rule-based generation when WebGPU is unavailable.



# SherwinMail Project Instructions & Standards

## 🎯 Project Vision
A privacy-first, offline-capable AI email orchestrator running entirely in the browser using WebGPU.

## 🏗️ Architectural Principles
1. **Privacy First:** All AI inference MUST happen client-side via WebLLM/WebGPU. No user data should be sent to external LLM providers.
2. **Local Infrastructure:** Since the app is self-hosted or run locally, "backend" services (Next.js API routes) are considered part of the local environment and are acceptable for tasks like PDF parsing or SMTP sending.
3. **Responsive Performance:** Heavy computations (AI) should ideally run in Web Workers to keep the UI at 60fps.
4. **Safety & Accuracy:** The AI must use the "Bracket System" (`[Placeholder]`) for any missing information to prevent hallucinations in professional correspondence.

## 🛠️ Tech Stack Standards
- **Framework:** Next.js 15 (App Router).
- **Styling:** Tailwind CSS.
- **AI:** `@mlc-ai/web-llm` for WebGPU inference.
- **PDF:** `pdf-parse` for server-side text extraction.
- **Email:** `nodemailer` for SMTP orchestration.

## 📋 Phase Recommendations & Guidelines

### Phase 1: WebGPU & AI Core
- **Workerization:** Offload `AIService` to a Web Worker.
- **Hardware Intelligence:** Use adapter limits to auto-select the best model tier (Tiny/Small/Medium).

### Phase 2: Knowledge Extraction
- **API Route Parsing:** Use `src/app/api/extract/route.ts` for PDF processing.
- **Chunking/Cleaning:** Implement utilities to strip headers/footers from JDs to save context tokens.

### Phase 3: AI Personalization
- **Strict Prompting:** Maintain a library of system prompts that enforce the bracket rule.
- **Visual Validation:** Implement a UI that scans drafts for `[...]` and highlights them.

### Phase 4: Delivery
- **Secure Storage:** Store SMTP configuration in encrypted `localStorage` or session-based state.
- **Drafting UX:** Always allow manual editing before sending.

### Phase 5: Scalability & Advanced Features
- **Session Persistence:** Implement IndexedDB for offline storage of drafts and email logs.
- **Model Fine-Tuning:** Explore client-side LoRA fine-tuning for specific writing styles.
- **Cache Management:** Use Cache API for model weight persistence to avoid re-downloading on refresh.

## 🚀 Performance Optimization Strategy
To ensure a high-performance experience, apply the following:
1. **Lazy Loading:** Dynamically import the `@mlc-ai/web-llm` library only when the user navigates to the AI composer.
2. **Model Caching:** Utilize the browser's Cache API to store large model weights locally, preventing repeated downloads.
3. **Chunked Processing:** Stream AI output tokens directly to the UI to minimize perceived latency.
4. **Main Thread Offloading:** Move ALL AI inference and heavy data processing to a Dedicated Web Worker to maintain a consistent 60 FPS UI.
5. **Memory Management:** Explicitly call `engine.destroy()` or clear WebGPU buffers when navigating away from the chat interface to prevent memory leaks.
