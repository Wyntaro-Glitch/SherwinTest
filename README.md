# SherwinMail: Privacy-Centric AI Email Orchestrator

## 🌟 Overview
SherwinMail is a high-performance, offline-first web application designed to automate professional email outreach. By leveraging **WebGPU**, the application runs powerful AI models directly within the browser, ensuring total privacy and eliminating the need for external servers or local installations like Ollama.

Users can upload Job Description PDFs, and the system intelligently extracts the text to draft personalized emails. If information is missing, the AI uses a strict "bracket identifier" system to ensure no data is hallucinated.

---

## 🛠️ Core Features
- **In-Browser Local AI (WebGPU):** Automatically detects your system's GPU capabilities and selects the optimal model (e.g., Llama 3, Phi-3, or Gemma) to run entirely within the browser tab.
- **Offline Capability:** Once the models are cached, the application functions perfectly without an internet connection.
- **Smart PDF Extraction:** Automatically parses raw text from uploaded job descriptions using `pdf-parse`.
- **Hallucination Protection:** Uses specialized system prompts to force the AI to use `[Placeholders]` for missing details like [Hiring Manager Name] or [Company Name].
- **Email Integration:** Connects via SMTP to draft and send responses directly from the dashboard.

---

## 🏗️ Technical Architecture

### 1. Hybrid AI Strategy (In-Browser GPU)
Instead of a backend API, SherwinMail uses **WebLLM** to talk to your hardware:
1. **Detection:** Checks `navigator.gpu` for WebGPU support.
2. **Auto-Selection:** Chooses a model based on available VRAM (e.g., 8B models for high-end GPUs, 3B models for integrated graphics).
3. **Execution:** Runs the model in a Web Worker to keep the UI smooth.

### 2. PDF Text Extraction (Backend/API Route)
```javascript
const fs = require('fs');
const pdf = require('pdf-parse');

async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        return data.text; // Clean text for the AI
    } catch (error) {
        console.error("Error parsing PDF:", error);
        throw error;
    }
}
```

### 3. AI Prompt Template (The "Bracket" Rule)
The AI is fed a strict **System Prompt** to ensure accuracy:
```text
You are a professional Email Assistant. 
Analyze the provided Job Description: {{job_text}}
Draft an email for the subject: {{subject}}

STRICT RULES:
- Use the Job Description for personalization.
- If any info (Names, Companies, Dates) is missing, use [BRACKETS], e.g., [Company Name].
- DO NOT invent facts.
```

---

## 🚀 Tech Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS.
- **AI Library:** `@mlc-ai/web-llm` (WebGPU interface).
- **PDF Parsing:** `pdf-parse`.
- **Communication:** Web Workers (for non-blocking AI execution).
- **Deployment:** Vercel or local hosting (fully functional as a PWA).

---

## 📅 Roadmap
1. **Phase 1:** Setup Next.js and WebGPU hardware detection. (Complete)
2. **Phase 2:** Implement PDF-to-Text extraction utility. (Next)
3. **Phase 3:** Integrate WebLLM for in-browser email generation.
4. **Phase 4:** Add SMTP support for one-click email sending.

---

## 🚀 How to Run (Windows & Linux)

### 1. Prerequisites
Ensure you have **Node.js** installed on your system:
- **Windows**: Download and run the installer from [nodejs.org](https://nodejs.org/).
- **Linux**: Install via your package manager or `fnm`/`nvm`.
  ```bash
  # Example for Ubuntu/Debian
  sudo apt update && sudo apt install nodejs npm
  ```

### 2. Installation
Clone this repository and install the dependencies:
```bash
npm install
```

### 3. Run Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Build for Production
To build and run the optimized production bundle:
```bash
npm run build
npm run start
```

---

## 💻 WebGPU Support Guide

Since the AI models run entirely in your browser, **WebGPU must be supported and enabled**.

### Google Chrome / Microsoft Edge / Brave Browser
- **Windows**: WebGPU is enabled by default in Chromium-based browsers (Chrome 113+, Edge 113+, Brave).
- **Linux**: Chromium-based browsers may require flags depending on your graphics drivers.
  1. Navigate to `chrome://flags` (or `brave://flags` in Brave).
  2. Search for **"Vulkan"** and set it to **Enabled**.
  3. Search for **"Unsafe WebGPU"** and set it to **Enabled**.
  4. Restart your browser.
- **Brave Shields Note**: Brave's built-in Fingerprinting Protection can block WebGPU queries. If diagnostics show WebGPU is inactive, click the Brave Shields icon in the address bar and set Fingerprinting Protection to **Standard** (not Strict) or temporarily disable Shields for the dashboard.

### Mozilla Firefox
- **Windows & Linux**: Firefox support for WebGPU is currently in testing:
  1. Open Firefox and navigate to `about:config`.
  2. Search for `dom.webgpu.enabled` and set it to `true`.
  3. Search for `gfx.webgpu.force-enabled` and set it to `true`.
  4. Restart Firefox.

### Troubleshooting & Common Errors

Here are the most common issues encountered during setup and how to resolve them:

#### 1. Error: `WebGPU is supported by the browser, but failed to request a hardware adapter.`
* **Cause**: The browser has the WebGPU API available, but it cannot establish a connection with your GPU hardware. This is common on Linux or in Brave Browser.
* **Solutions**:
  * **Brave Shields (Fingerprinting Block)**: Brave's Shields treat GPU queries as a fingerprinting attempt and block them. Click the **Shields logo** (lion icon) in the address bar next to `localhost:3000` and turn Shields **OFF** for the site, or change **Fingerprinting Protection** to **Standard** (Strict will block it).
  * **Graphics Acceleration Disabled**: In Brave/Chrome, go to **Settings > System** and ensure **"Use graphics acceleration when available"** is enabled. Restart the browser.
  * **Missing Vulkan Drivers (Linux)**: Ensure you have the appropriate Vulkan drivers installed for your GPU (Mesa, NVIDIA, etc.):
    ```bash
    # Ubuntu/Debian Intel/AMD drivers
    sudo apt install mesa-vulkan-drivers
    
    # Ubuntu/Debian NVIDIA drivers
    sudo apt install nvidia-driver-535  # or latest version
    ```
  * **Chrome/Brave Flags**: Go to `chrome://flags` (or `brave://flags`), search for **Vulkan** and set it to **Enabled**, and search for **Unsafe WebGPU** and set it to **Enabled**.

#### 2. Error: `Failed to create WebGPU device`
* **Cause**: The adapter was found, but the driver failed to initialize the GPU compute context.
* **Solutions**:
  * Ensure your GPU drivers are updated to the latest version.
  * On Linux Wayland/Mesa systems, force the Vulkan backend by starting the browser from the terminal:
    ```bash
    # Chrome / Chromium
    google-chrome --enable-features=Vulkan,UseOzonePlatform --ozone-platform=wayland
    
    # Brave Browser
    brave-browser --enable-features=Vulkan,UseOzonePlatform --ozone-platform=wayland
    ```
    If using X11 instead of Wayland, omit the Ozone parameters:
    ```bash
    brave-browser --enable-features=Vulkan
    ```

#### 3. Error: `WebGPU is not supported or is disabled in your browser.`
* **Cause**: You are using an outdated or unsupported browser, or WebGPU is disabled via browser configuration.
* **Solutions**:
  * Use a modern version of Chrome, Edge, Brave, or Firefox.
  * In Firefox, ensure `dom.webgpu.enabled` and `gfx.webgpu.force-enabled` are set to `true` in `about:config`.

