# SherwinMail Development Plan

## 🎯 Current Status
- [x] **Phase 1: Project Setup & WebGPU Detection**
    - Next.js App Router structure established.
    - WebGPU capability detection implemented in `src/utils/webgpu.ts`.
    - Initial AI service scaffolded in `src/utils/aiService.ts`.
    - Dashboard UI components created (`MailList`, `MailDetail`, `ChatPanel`).

## 🚀 Immediate Roadmap

### Phase 2: PDF-to-Text Extraction (Current)
- [ ] **Backend Integration**: Create a Next.js Server Action or API Route to handle PDF parsing using `pdf-parse`.
- [ ] **Upload Interface**: Add a file upload component to the dashboard to accept Job Description PDFs.
- [ ] **Text Processing**: Implement a utility to clean and prepare extracted text for the AI model.
- [ ] **Validation**: Test with various PDF layouts to ensure consistent extraction.

### Phase 3: WebLLM Integration & Prompt Engineering
- [ ] **Model Loading**: Optimize model selection based on detected VRAM.
- [ ] **System Prompting**: Implement the "bracket identifier" logic to prevent hallucinations.
- [ ] **Context Injection**: Feed extracted PDF text into the AI prompt for personalized drafting.
- [ ] **UI Feedback**: Add loading states and progress bars for model initialization and text generation.

### Phase 4: SMTP & Email Orchestration
- [ ] **SMTP Configuration**: Create a secure way to store/input SMTP credentials (e.g., local storage or encrypted session).
- [ ] **Email Drafting**: Allow users to edit generated drafts before sending.
- [ ] **Send Functionality**: Integrate a backend service to dispatch emails via SMTP.

## 🛠️ Technical Considerations
- **Privacy**: Ensure all AI processing remains client-side.
- **Performance**: Use Web Workers for AI tasks to keep the UI responsive.
- **Error Handling**: Graceful fallbacks for browsers without WebGPU or insufficient VRAM.
