import { AIProviderConfig, AIProviderType, MessageContentPart } from "@/types";

export interface ProviderCapabilities {
  available: boolean;
  models: string[];
  error?: string;
}

interface ChatRequest {
  messages: { role: "user" | "assistant" | "system"; content: string | MessageContentPart[] }[];
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

const PROVIDER_STORAGE_KEY = "sherwin_ai_provider";

function getStoredConfig(): AIProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConfig(config: AIProviderConfig) {
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(config));
}

export function getProviderConfig(): AIProviderConfig {
  return getStoredConfig() ?? { provider: "auto", model: "" };
}

export function setProviderConfig(config: AIProviderConfig) {
  saveConfig(config);
}

async function checkOllama(): Promise<ProviderCapabilities> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { available: false, models: [], error: `Ollama responded ${res.status}` };
    const data = await res.json();
    const models: string[] = (data.models || []).map((m: any) => m.name);
    return { available: models.length > 0, models };
  } catch (e: any) {
    return { available: false, models: [], error: e?.message || "Ollama unreachable" };
  }
}

async function checkLMStudio(): Promise<ProviderCapabilities> {
  try {
    const res = await fetch("http://localhost:1234/v1/models", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { available: false, models: [], error: `LM Studio responded ${res.status}` };
    const data = await res.json();
    const models: string[] = (data.data || []).map((m: any) => m.id);
    return { available: models.length > 0, models };
  } catch (e: any) {
    return { available: false, models: [], error: e?.message || "LM Studio unreachable" };
  }
}

async function checkWebGPU(): Promise<ProviderCapabilities> {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    return { available: false, models: [], error: "WebGPU not supported" };
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { available: false, models: [], error: "No GPU adapter found" };
    await adapter.requestDevice();
    return {
      available: true,
      models: [
        "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        "Phi-3.5-mini-instruct-q4f16_1-MLC",
        "Phi-3.5-vision-instruct-q4f16_1-MLC",
        "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        "Qwen3-4B-q4f16_1-MLC",
        "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
      ],
    };
  } catch (e: any) {
    return { available: false, models: [], error: e?.message || "WebGPU device creation failed" };
  }
}

export async function checkProvider(provider: AIProviderType): Promise<ProviderCapabilities> {
  switch (provider) {
    case "ollama": return checkOllama();
    case "lmstudio": return checkLMStudio();
    case "webgpu": return checkWebGPU();
    case "api":
      return { available: true, models: ["gpt-4o", "gpt-4o-mini", "claude-3-opus", "claude-3-sonnet"] };
    default:
      return { available: false, models: [] };
  }
}

export async function autoDetectProvider(): Promise<{ config: AIProviderConfig; capabilities: ProviderCapabilities } | null> {
  const checks: AIProviderType[] = ["webgpu", "ollama", "lmstudio"];
  for (const p of checks) {
    const cap = await checkProvider(p);
    if (cap.available && cap.models.length > 0) {
      const config: AIProviderConfig = { provider: p, model: cap.models[0] };
      saveConfig(config);
      return { config, capabilities: cap };
    }
  }
  return null;
}

function buildApiUrl(config: AIProviderConfig): string | null {
  if (config.provider === "ollama") return "http://localhost:11434/v1/chat/completions";
  if (config.provider === "lmstudio") return "http://localhost:1234/v1/chat/completions";
  if (config.provider === "api" && config.baseUrl) return `${config.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  return null;
}

export async function chatCompletion(req: ChatRequest): Promise<string> {
  const config = getProviderConfig();
  const url = buildApiUrl(config);
  if (!url) throw new Error("No API endpoint configured for this provider.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

  const body = JSON.stringify({
    model: config.model || config.ollamaModel || config.lmStudioModel || "gpt-4o-mini",
    messages: req.messages,
    stream: true,
  });

  const res = await fetch(url, { method: "POST", headers, body, signal: req.signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Provider error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body stream");

  const decoder = new TextDecoder();
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          full += delta;
          req.onChunk(full);
        } catch {
          // skip malformed json lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return full;
}
