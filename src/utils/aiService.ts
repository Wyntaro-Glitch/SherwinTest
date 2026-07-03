import { ChatMessage } from "@/types";

export type ModelCategory = "text-fast" | "text-smart" | "text-powerful" | "vision" | "fallback";
export type HardwareTier = "low" | "medium" | "high";

export interface ModelOption {
  id: string;
  name: string;
  size: string;
  vramRequired: string;
  category: ModelCategory;
  description: string;
  recommendedFor: string;
  tier: HardwareTier | "fallback";
}

export interface TierPreset {
  tier: HardwareTier;
  label: string;
  description: string;
  minVram: string;
  icon: string;
  defaultModelId: string;
  availableModelIds: string[];
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 (0.5B)",
    size: "0.35 GB",
    vramRequired: "1.2 GB",
    category: "text-fast",
    description: "Fastest option, best for simple chat & drafting",
    recommendedFor: "Low VRAM (< 2 GB) or quick responses",
    tier: "low",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 (1.5B)",
    size: "0.98 GB",
    vramRequired: "2.2 GB",
    category: "text-smart",
    description: "Good balance of speed and quality for drafting",
    recommendedFor: "General use — email drafting, JD analysis",
    tier: "low",
  },
  {
    id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Vision (4.2B)",
    size: "3.9 GB",
    vramRequired: "4 GB",
    category: "vision",
    description: "Can read images — resumes, screenshots, JDs",
    recommendedFor: "Resume scanning, image-based content",
    tier: "medium",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Mini (3.8B)",
    size: "2.2 GB",
    vramRequired: "3.5 GB",
    category: "text-smart",
    description: "Proven small model, great for drafting & analysis",
    recommendedFor: "High-quality drafting & JD analysis",
    tier: "medium",
  },
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 (3B)",
    size: "1.8 GB",
    vramRequired: "3 GB",
    category: "text-smart",
    description: "Modern architecture, strong for its size",
    recommendedFor: "Balanced smart drafting",
    tier: "medium",
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    name: "Qwen 3 (4B)",
    size: "2.5 GB",
    vramRequired: "3.5 GB",
    category: "text-powerful",
    description: "Good reasoning with larger context window",
    recommendedFor: "Complex multi-step drafting",
    tier: "medium",
  },
  {
    id: "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
    name: "Llama 3 (8B)",
    size: "4.7 GB",
    vramRequired: "6.5 GB",
    category: "text-powerful",
    description: "Best text-only quality, highest VRAM needed",
    recommendedFor: "Maximum quality, complex multi-step tasks",
    tier: "high",
  },
  {
    id: "mock-assistant",
    name: "Offline Rule-based Assistant",
    size: "0 MB",
    vramRequired: "0 GB",
    category: "fallback",
    description: "No GPU needed — basic template generation",
    recommendedFor: "When no WebGPU is available",
    tier: "fallback",
  },
];

export const PRESET_TIERS: TierPreset[] = [
  {
    tier: "low",
    label: "Low Spec",
    description: "Integrated GPUs, older laptops, < 3 GB VRAM",
    minVram: "0 GB",
    icon: "💻",
    defaultModelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    availableModelIds: [
      "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    ],
  },
  {
    tier: "medium",
    label: "Medium Spec",
    description: "GTX 1060+, RTX 2060+, M1/M2 Macs, 3-6 GB VRAM",
    minVram: "3 GB",
    icon: "⚡",
    defaultModelId: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    availableModelIds: [
      "Phi-3.5-mini-instruct-q4f16_1-MLC",
      "Llama-3.2-3B-Instruct-q4f16_1-MLC",
      "Qwen3-4B-q4f16_1-MLC",
      "Phi-3.5-vision-instruct-q4f16_1-MLC",
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    ],
  },
  {
    tier: "high",
    label: "High Spec",
    description: "RTX 3080+, M1 Pro/Max/Ultra, 6+ GB VRAM",
    minVram: "6 GB",
    icon: "🚀",
    defaultModelId: "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
    availableModelIds: [
      "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
      "Phi-3.5-vision-instruct-q4f16_1-MLC",
      "Qwen3-4B-q4f16_1-MLC",
      "Phi-3.5-mini-instruct-q4f16_1-MLC",
      "Llama-3.2-3B-Instruct-q4f16_1-MLC",
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    ],
  },
];

export function getModelsByCategory(category: ModelCategory): ModelOption[] {
  return AVAILABLE_MODELS.filter((m) => m.category === category);
}

export function getRecommendedModel(vramGB: number): ModelOption {
  if (vramGB >= 6) return AVAILABLE_MODELS.find((m) => m.id === "Llama-3-8B-Instruct-q4f16_1-MLC-1k")!;
  if (vramGB >= 4) return AVAILABLE_MODELS.find((m) => m.id === "Phi-3.5-mini-instruct-q4f16_1-MLC")!;
  if (vramGB >= 2) return AVAILABLE_MODELS.find((m) => m.id === "Qwen2.5-1.5B-Instruct-q4f16_1-MLC")!;
  return AVAILABLE_MODELS.find((m) => m.id === "Qwen2.5-0.5B-Instruct-q4f16_1-MLC")!;
}

export function getTierForVram(vramGB: number): HardwareTier {
  if (vramGB >= 6) return "high";
  if (vramGB >= 3) return "medium";
  return "low";
}

export function getPresetForTier(tier: HardwareTier): TierPreset {
  return PRESET_TIERS.find((p) => p.tier === tier)!;
}

export function getModelsByTier(tier: HardwareTier | "fallback"): ModelOption[] {
  if (tier === "fallback") return AVAILABLE_MODELS.filter((m) => m.tier === "fallback");
  const preset = PRESET_TIERS.find((p) => p.tier === tier);
  if (!preset) return [];
  return preset.availableModelIds
    .map((id) => AVAILABLE_MODELS.find((m) => m.id === id))
    .filter((m): m is ModelOption => m !== undefined);
}

export function getDefaultModelForTier(tier: HardwareTier): ModelOption {
  const preset = PRESET_TIERS.find((p) => p.tier === tier);
  if (!preset) return AVAILABLE_MODELS[0];
  return AVAILABLE_MODELS.find((m) => m.id === preset.defaultModelId) || AVAILABLE_MODELS[0];
}

export class AIService {
  private engine: any | null = null;
  private currentModelId: string = "";
  private isInitializing = false;

  constructor() {}

  // Initialize WebLLM Engine
  async initEngine(
    modelId: string,
    onProgress: (progress: { text: string; percent: number }) => void
  ): Promise<boolean> {
    if (modelId === "mock-assistant") {
      this.currentModelId = modelId;
      this.engine = null;
      return true;
    }

    if (this.currentModelId === modelId && this.engine) {
      return true;
    }

    this.isInitializing = true;
    try {
      // Import WebLLM dynamically to avoid server-side build issues
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

      onProgress({ text: "Initializing WebGPU device...", percent: 10 });
      
      this.engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          // report.progress is between 0 and 1
          const percent = Math.round(report.progress * 90) + 10;
          onProgress({ text: report.text, percent });
        },
      });

      this.currentModelId = modelId;
      return true;
    } catch (e: any) {
      console.error("WebLLM Engine failed to load:", e);
      const msg = e?.message || String(e);
      if (msg.includes("index_kernel") || msg.includes("ShaderModule") || msg.includes("shader")) {
        this.currentModelId = "mock-assistant";
        this.engine = null;
        throw new Error(
          "Your GPU driver doesn't support a required feature (shader-f16). " +
          "Try: (1) Update your GPU drivers, (2) In Brave, enable brave://flags/#enable-unsafe-webgpu " +
          "(keep Vulkan flag disabled — it causes black screens on Linux), " +
          "(3) If using Linux, try Chrome or Edge which have better WebGPU support."
        );
      }
      this.currentModelId = "mock-assistant";
      this.engine = null;
      throw new Error(e?.message || String(e));
    } finally {
      this.isInitializing = false;
    }
  }

  // Check if LLM Engine is loaded
  isEngineActive(): boolean {
    return this.engine !== null || this.currentModelId === "mock-assistant";
  }

  getCurrentModel(): string {
    return this.currentModelId || "None Selected";
  }

  isVisionModel(): boolean {
    return this.currentModelId.includes("vision") || this.currentModelId.includes("vl");
  }

  // Chat completion supporting streaming chunks and vision
  async getChatCompletion(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    imageBase64?: string,
    systemPrompt?: string,
  ): Promise<string> {
    const lastUserMessage = messages[messages.length - 1]?.text || "";

    if (this.currentModelId === "mock-assistant" || !this.engine) {
      return this.runMockCompletion(lastUserMessage, onChunk);
    }

    try {
      const mlcMessages: any[] = [
        {
          role: "system",
          content: systemPrompt || "You are a professional outreach assistant. If any context (Names, Companies, Dates, Jobs) is missing, strictly use [BRACKETS] e.g., [Hiring Manager Name] or [Company Name]. Do not hallucinate or make up details.",
        },
      ];

      const lastId = messages.length > 0 ? messages[messages.length - 1].id : "";
      for (const m of messages) {
        if (m.sender === "user" && imageBase64 && m.id === lastId) {
          mlcMessages.push({
            role: "user",
            content: [
              { type: "text", text: m.text },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          });
        } else {
          mlcMessages.push({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          });
        }
      }

      const response = this.engine.chatCompletion({
        messages: mlcMessages,
        stream: true,
      });

      let fullText = "";
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta?.content || "";
        fullText += delta;
        onChunk(fullText);
      }
      return fullText;
    } catch (e) {
      console.error("Stream failed. Falling back to rule-based engine.", e);
      return this.runMockCompletion(lastUserMessage, onChunk);
    }
  }

  // Generate automated outreach email template from job text using mock simulator
  generateDraftFromJob(jobText: string, subject: string): string {
    // Extraction rules
    const titleRegex = /(?:job title|role|position|looking for a|seeking a)\s*:\s*([^\n,.]+)/i;
    const companyRegex = /(?:company|organization|at|client)\s*:\s*([^\n,.]+)/i;
    const contactRegex = /(?:contact|hiring manager|recruiter|write to|apply to)\s*:\s*([^\n,.]+)/i;

    const titleMatch = jobText.match(titleRegex);
    const companyMatch = jobText.match(companyRegex);
    const contactMatch = jobText.match(contactRegex);

    // Default parameters with [Brackets] if missing
    const jobTitle = titleMatch ? titleMatch[1].trim() : "[Job Title]";
    const companyName = companyMatch ? companyMatch[1].trim() : "[Company Name]";
    const contactName = contactMatch ? contactMatch[1].trim() : "[Hiring Manager Name]";

    // Detect skills
    const skillsList: string[] = [];
    ["react", "next.js", "typescript", "tailwind", "node.js", "python", "vulkan", "webgpu", "rust"].forEach((skill) => {
      if (jobText.toLowerCase().includes(skill)) {
        skillsList.push(skill.toUpperCase());
      }
    });

    const skillsString = skillsList.length > 0 ? skillsList.join(", ") : "[Required Skills]";

    return `Dear ${contactName},

I recently reviewed the opening for the ${jobTitle} position at ${companyName} and wanted to express my strong interest.

With a solid background in software development and specific hands-on experience in ${skillsString}, I am confident in my ability to contribute effectively to your engineering team. In my previous roles, I have specialized in building responsive frontend applications and high-performance services that align closely with the requirements outlined in your job description.

I would welcome the opportunity to discuss how my skillset and background align with ${companyName}'s current goals. 

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Contact Information]`;
  }

  // Smart Simulator for Chat Messages
  private async runMockCompletion(
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const text = userMessage.toLowerCase();
    let reply = "";

    if (text.includes("hello") || text.includes("hi ") || text.includes("hey")) {
      reply = `Hello! I am your offline AI Email Orchestrator. 

Since WebGPU hardware acceleration is not running or active, I am running in Rule-based Simulation mode. I can help you draft cold outreach messages based on job descriptions.

Try asking me: "Draft an email for a React developer position."`;
    } else if (text.includes("draft") || text.includes("email") || text.includes("job")) {
      // Simulate draft template generation
      reply = `I would be happy to draft an outreach template for you! 

Here is a structured draft based on standard email rules:

Subject: Application for [Job Title] - [Your Name]

Dear [Hiring Manager Name],

I am writing to express my interest in the [Job Title] role at [Company Name]. 

Based on my background in [Your Key Skill] and experience delivering robust technical solutions, I am eager to discuss how I can contribute to your team. I appreciate the focus on technical excellence at [Company Name] and would love to support your mission.

Please let me know if we can schedule a brief conversation to discuss my qualifications.

Best regards,
[Your Name]
[Your Email]`;
    } else if (text.includes("clear") || text.includes("reset")) {
      reply = "Conversation context has been cleared. How can I help you draft your next email?";
    } else {
      reply = `I received your message: "${userMessage}".

I am currently running in Offline Smart Fallback mode. I can assist in generating structured email templates with [Brackets] for personalization. 

To create a new email draft:
1. Go to the "Inbox" or "Drafts" folder.
2. Click the "+ Compose" button.
3. Fill in details and click "Generate AI Pitch" to apply smart placeholders.`;
    }

  // Simulate streaming response
  const words = reply.split(" ");
  let currentText = "";
  for (let i = 0; i < words.length; i++) {
    currentText += (i === 0 ? "" : " ") + words[i];
    onChunk(currentText);
    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  return reply;
}
}

// Singleton helper instance
export const aiService = new AIService();
