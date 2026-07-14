import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

interface WorkerMessage {
  type: "init" | "chat" | "cancel";
  id: string;
  payload?: {
    modelId?: string;
    messages?: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
    systemPrompt?: string;
    imageBase64?: string;
  };
}

interface WorkerResponse {
  type: "progress" | "chunk" | "done" | "error";
  id: string;
  data?: {
    text?: string;
    percent?: number;
    content?: string;
    message?: string;
  };
}

let handler: WebWorkerMLCEngineHandler;
let currentEngine: unknown = null;
let currentModelId = "";
let abortController: AbortController | null = null;

function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

try {
  handler = new WebWorkerMLCEngineHandler();

  self.onmessage = async (msg: MessageEvent<WorkerMessage>) => {
    const { type, id, payload } = msg.data;

    switch (type) {
      case "init": {
        if (!payload?.modelId) {
          postResponse({ type: "error", id, data: { message: "No model ID provided" } });
          return;
        }

        if (payload.modelId === "mock-assistant") {
          currentModelId = "mock-assistant";
          currentEngine = null;
          postResponse({ type: "done", id, data: { message: "Mock assistant ready" } });
          return;
        }

        if (currentModelId === payload.modelId && currentEngine) {
          postResponse({ type: "done", id, data: { message: "Already loaded" } });
          return;
        }

        try {
          abortController = new AbortController();
          postResponse({ type: "progress", id, data: { text: "Initializing WebGPU device...", percent: 10 } });

          const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

          const engine = await CreateMLCEngine(payload.modelId, {
            initProgressCallback: (report: { text: string; progress: number }) => {
              const percent = Math.round(report.progress * 90) + 10;
              postResponse({ type: "progress", id, data: { text: report.text, percent } });
            },
          });

          if (abortController?.signal.aborted) {
            postResponse({ type: "error", id, data: { message: "Initialization cancelled" } });
            return;
          }

          currentEngine = engine;
          currentModelId = payload.modelId;
          postResponse({ type: "done", id, data: { message: `Model ${payload.modelId} loaded` } });
        } catch (e: unknown) {
          currentEngine = null;
          currentModelId = "";
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("index_kernel") || msg.includes("ShaderModule") || msg.includes("shader")) {
            postResponse({
              type: "error",
              id,
              data: {
                message:
                  "Your GPU driver doesn't support a required feature (shader-f16). " +
                  "Try: (1) Update your GPU drivers, (2) In Brave, enable brave://flags/#enable-unsafe-webgpu " +
                  "(keep Vulkan flag disabled — it causes black screens on Linux), " +
                  "(3) If using Linux, try Chrome or Edge which have better WebGPU support.",
              },
            });
          } else {
            postResponse({ type: "error", id, data: { message: msg } });
          }
        }
        break;
      }

      case "chat": {
        if (!payload?.messages) {
          postResponse({ type: "error", id, data: { message: "No messages provided" } });
          return;
        }

        if (currentModelId === "mock-assistant" || !currentEngine) {
          const lastMsg = payload.messages[payload.messages.length - 1];
          const userText = typeof lastMsg?.content === "string" ? lastMsg.content : "";
          const reply = generateMockResponse(userText);
          const words = reply.split(" ");
          let currentText = "";
          for (let i = 0; i < words.length; i++) {
            currentText += (i === 0 ? "" : " ") + words[i];
            postResponse({ type: "chunk", id, data: { content: currentText } });
            await new Promise((r) => setTimeout(r, 35));
          }
          postResponse({ type: "done", id, data: { content: reply } });
          return;
        }

        try {
          abortController = new AbortController();

          const systemPrompt = payload.systemPrompt ||
            "You are a professional outreach assistant. If any context (Names, Companies, Dates, Jobs) is missing, strictly use [BRACKETS] e.g., [Hiring Manager Name] or [Company Name]. Do not hallucinate or make up details.";

          const mlcMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
            { role: "system", content: systemPrompt },
            ...payload.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ];

          const engine = currentEngine as {
            chatCompletion: (opts: {
              messages: typeof mlcMessages;
              stream: boolean;
            }) => AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>;
          };

          const response = engine.chatCompletion({
            messages: mlcMessages,
            stream: true,
          });

          let fullText = "";
          for await (const chunk of response) {
            if (abortController?.signal.aborted) break;
            const delta = chunk.choices[0]?.delta?.content || "";
            fullText += delta;
            postResponse({ type: "chunk", id, data: { content: fullText } });
          }

          postResponse({ type: "done", id, data: { content: fullText } });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          postResponse({ type: "error", id, data: { message: msg } });
        }
        break;
      }

      case "cancel": {
        abortController?.abort();
        abortController = null;
        postResponse({ type: "done", id, data: { message: "Cancelled" } });
        break;
      }
    }
  };

  console.log("[AI Worker] Initialized and listening for messages.");
} catch (error) {
  console.error("[AI Worker] Failed to initialize worker handler:", error);
}

function generateMockResponse(userMessage: string): string {
  const text = userMessage.toLowerCase();

  if (text.includes("hello") || text.includes("hi ") || text.includes("hey")) {
    return `Hello! I am your offline AI Email Orchestrator.

Since WebGPU hardware acceleration is not running or active, I am running in Rule-based Simulation mode. I can help you draft cold outreach messages based on job descriptions.

Try asking me: "Draft an email for a React developer position."`;
  }

  if (text.includes("draft") || text.includes("email") || text.includes("job")) {
    return `I would be happy to draft an outreach template for you!

Here is a structured draft based on standard email rules:

Subject: Application for [Job Title] - [Your Name]

Dear [Hiring Manager Name],

I am writing to express my interest in the [Job Title] role at [Company Name].

Based on my background in [Your Key Skill] and experience delivering robust technical solutions, I am eager to discuss how I can contribute to your team. I appreciate the focus on technical excellence at [Company Name] and would love to support your mission.

Please let me know if we can schedule a brief conversation to discuss my qualifications.

Best regards,
[Your Name]
[Your Email]`;
  }

  if (text.includes("clear") || text.includes("reset")) {
    return "Conversation context has been cleared. How can I help you draft your next email?";
  }

  return `I received your message: "${userMessage}".

I am currently running in Offline Smart Fallback mode. I can assist in generating structured email templates with [Brackets] for personalization.

To create a new email draft:
1. Go to the "Inbox" or "Drafts" folder.
2. Click the "+ Compose" button.
3. Fill in details and click "Generate AI Pitch" to apply smart placeholders.`;
}
