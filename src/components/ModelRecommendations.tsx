"use client";

import { useState } from "react";
import {
  PRESET_TIERS,
  getModelsByTier,
  getDefaultModelForTier,
  type HardwareTier,
  type ModelOption,
} from "@/utils/aiService";

const OLLAMA_MODEL_MAP: Record<string, string> = {
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC": "qwen2.5:0.5b",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "qwen2.5:1.5b",
  "Phi-3.5-vision-instruct-q4f16_1-MLC": "llava-phi3.5",
  "Phi-3.5-mini-instruct-q4f16_1-MLC": "phi3.5",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": "llama3.2:3b",
  "Qwen3-4B-q4f16_1-MLC": "qwen3:4b",
  "Llama-3-8B-Instruct-q4f16_1-MLC-1k": "llama3:8b",
};

const LM_STUDIO_MODEL_MAP: Record<string, string> = {
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC": "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
  "Phi-3.5-vision-instruct-q4f16_1-MLC": "microsoft/Phi-3.5-vision-instruct-GGUF",
  "Phi-3.5-mini-instruct-q4f16_1-MLC": "microsoft/Phi-3.5-mini-instruct-GGUF",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": "meta-llama/Llama-3.2-3B-Instruct-GGUF",
  "Qwen3-4B-q4f16_1-MLC": "Qwen/Qwen3-4B-GGUF",
  "Llama-3-8B-Instruct-q4f16_1-MLC-1k": "meta-llama/Llama-3-8B-Instruct-GGUF",
};

async function isLocalServerRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function tryProtocol(url: string) {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => document.body.removeChild(iframe), 3000);
}

async function openOllama(modelId: string) {
  const ollamaName = OLLAMA_MODEL_MAP[modelId];
  if (!ollamaName) return;
  const command = `ollama pull ${ollamaName}`;
  await navigator.clipboard.writeText(command).catch(() => {});

  // Check if Ollama server is running
  const running = await isLocalServerRunning(11434);

  if (running) {
    // Ollama is running — try to pull via API
    try {
      await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ollamaName, stream: false }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      // Pull started — API may timeout but download continues in background
    }
  } else {
    // Try protocol handlers to open the app
    tryProtocol(`ollama://pull?model=${encodeURIComponent(ollamaName)}`);
    tryProtocol(`ollama://`);
  }

  // Always open the model page for reference
  window.open(`https://ollama.com/library/${ollamaName.split(":")[0]}`, "_blank");
}

async function openLMStudio(modelId: string) {
  const hfRepo = LM_STUDIO_MODEL_MAP[modelId];
  if (!hfRepo) return;
  const searchQuery = hfRepo.split("/").pop() || hfRepo;

  // Check if LM Studio server is running
  const running = await isLocalServerRunning(1234);

  if (running) {
    // LM Studio is already open — open its search page in the app
    window.open(`https://lmstudio.ai/search?q=${encodeURIComponent(searchQuery)}`, "_blank");
    return;
  }

  // Try multiple protocol variations to open LM Studio
  tryProtocol(`lmstudio://app/search?query=${encodeURIComponent(searchQuery)}`);
  tryProtocol(`lms://app/search?query=${encodeURIComponent(searchQuery)}`);
  tryProtocol(`lm-studio://app/search?query=${encodeURIComponent(searchQuery)}`);

  // Open the web page as fallback
  window.open(`https://lmstudio.ai/search?q=${encodeURIComponent(searchQuery)}`, "_blank");
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    "text-fast": "bg-emerald-500/10 border-emerald-800/50 text-emerald-400",
    "text-smart": "bg-blue-500/10 border-blue-800/50 text-blue-400",
    "text-powerful": "bg-purple-500/10 border-purple-800/50 text-purple-400",
    vision: "bg-amber-500/10 border-amber-800/50 text-amber-400",
    fallback: "bg-slate-500/10 border-slate-700 text-slate-400",
  };
  const labels: Record<string, string> = {
    "text-fast": "Fast",
    "text-smart": "Smart",
    "text-powerful": "Powerful",
    vision: "Vision",
    fallback: "Fallback",
  };
  return (
    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-bold ${styles[category] || styles.fallback}`}>
      {labels[category] || category}
    </span>
  );
}

function ModelCard({
  model,
  isDefault,
}: {
  model: ModelOption;
  isDefault: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
      isDefault
        ? "bg-indigo-500/5 border-indigo-500/30"
        : "bg-slate-950/40 border-slate-800"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200 truncate">{model.name}</span>
            <CategoryBadge category={model.category} />
            {isDefault && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold">
                DEFAULT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">{model.size}</span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-500">VRAM: {model.vramRequired}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => openOllama(model.id)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
          title={`Open Ollama app & pull ${OLLAMA_MODEL_MAP[model.id] || "..."}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Ollama
        </button>
        <button
          onClick={() => openLMStudio(model.id)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
          title={`Open LM Studio app & search for ${LM_STUDIO_MODEL_MAP[model.id]?.split("/").pop() || "..."}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          LM Studio
        </button>
      </div>
    </div>
  );
}

export default function ModelRecommendations() {
  const [activeTier, setActiveTier] = useState<HardwareTier>("medium");

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold text-white mb-1">AI Model Recommendations</h3>
        <p className="text-xs text-slate-500">
          Choose the tier that matches your GPU VRAM. Vision models can read images &amp; PDFs.
        </p>
      </div>

      {/* Tier Tabs */}
      <div className="flex gap-2">
        {PRESET_TIERS.map((preset) => (
          <button
            key={preset.tier}
            onClick={() => setActiveTier(preset.tier)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTier === preset.tier
                ? "bg-indigo-500/15 border border-indigo-500 text-indigo-400"
                : "bg-slate-950/60 border border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
            <span className="text-[9px] font-mono text-slate-500">{preset.minVram}+ VRAM</span>
          </button>
        ))}
      </div>

      {/* Active Tier Content */}
      {PRESET_TIERS.filter((p) => p.tier === activeTier).map((preset) => {
        const models = getModelsByTier(preset.tier);
        const defaultModel = getDefaultModelForTier(preset.tier);
        const visionModels = models.filter((m) => m.category === "vision");

        return (
          <div key={preset.tier} className="flex flex-col gap-3">
            {/* Tier Header */}
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{preset.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{preset.label}</p>
                    <p className="text-[10px] text-slate-500">{preset.description}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
                  {preset.minVram}+ VRAM
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Default: <span className="text-indigo-400 font-semibold">{defaultModel.name}</span>
                {" "}— {defaultModel.description}
              </p>
              {visionModels.length > 0 && (
                <p className="text-[10px] text-emerald-400/80">
                  📷 Vision-capable — can read images &amp; PDFs
                </p>
              )}
            </div>

            {/* Model List */}
            <div className="flex flex-col gap-2">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isDefault={model.id === defaultModel.id}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Info Footer */}
      <div className="text-[10px] text-slate-500 bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1">
        <p className="font-semibold text-slate-400">How download works:</p>
        <p>
          <span className="text-slate-300 font-semibold">Ollama</span> — Opens the Ollama desktop app via protocol handler. The pull command is also copied to your clipboard as backup. Paste it in your terminal if needed.
        </p>
        <p>
          <span className="text-slate-300 font-semibold">LM Studio</span> — Opens the LM Studio desktop app and searches for the model. Download directly in the app.
        </p>
        <p className="text-slate-600 mt-1">
          If the desktop app doesn&apos;t open, make sure it&apos;s installed and running. All models run locally on your hardware — no data leaves your device.
        </p>
      </div>
    </div>
  );
}
