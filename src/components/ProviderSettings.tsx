"use client";

import { useState } from "react";
import { AIProviderConfig, AIProviderType } from "@/types";
import { getProviderConfig, setProviderConfig, checkProvider, autoDetectProvider, ProviderCapabilities } from "@/utils/aiProvider";
import { getModelsByCategory } from "@/utils/aiService";

export default function ProviderSettings() {
  const [config, setConfig] = useState<AIProviderConfig>(() => getProviderConfig());
  const [ollamaStatus, setOllamaStatus] = useState<ProviderCapabilities | null>(null);
  const [lmStudioStatus, setLmStudioStatus] = useState<ProviderCapabilities | null>(null);
  const [webgpuStatus, setWebgpuStatus] = useState<ProviderCapabilities | null>(null);
  const [checking, setChecking] = useState(false);
  const [apiKey, setApiKey] = useState(() => getProviderConfig().apiKey || "");
  const [baseUrl, setBaseUrl] = useState(() => getProviderConfig().baseUrl || "");
  const [pendingModel, setPendingModel] = useState(() => getProviderConfig().model);

  const update = (partial: Partial<AIProviderConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    setProviderConfig(next);
  };

  const handleAutoDetect = async () => {
    setChecking(true);
    const result = await autoDetectProvider();
    if (result) {
      setConfig(result.config);
      setProviderConfig(result.config);
    }
    setChecking(false);
  };

  const handleCheckProvider = async (provider: AIProviderType) => {
    setChecking(true);
    const result = await checkProvider(provider);
    if (provider === "ollama") setOllamaStatus(result);
    if (provider === "lmstudio") setLmStudioStatus(result);
    if (provider === "webgpu") setWebgpuStatus(result);
    if (result.available && result.models.length > 0) {
      if (provider === "webgpu") {
        const savedModel = config.model || result.models[0];
        setPendingModel(savedModel);
        update({ provider });
      } else {
        update({ provider, model: result.models[0], ollamaModel: provider === "ollama" ? result.models[0] : undefined, lmStudioModel: provider === "lmstudio" ? result.models[0] : undefined });
      }
    }
    setChecking(false);
  };

  const PROVIDERS: { id: AIProviderType; label: string; desc: string; status: ProviderCapabilities | null }[] = [
    { id: "ollama", label: "Ollama", desc: "Local Ollama (localhost:11434)", status: ollamaStatus },
    { id: "lmstudio", label: "LM Studio", desc: "Local LM Studio (localhost:1234)", status: lmStudioStatus },
    { id: "webgpu", label: "WebGPU", desc: "Browser GPU acceleration", status: webgpuStatus },
    { id: "api", label: "API Key", desc: "Remote LLM provider", status: null },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">AI Provider</h3>
          <p className="text-xs text-slate-500">Choose how to run AI inference.</p>
        </div>
        <button
          onClick={handleAutoDetect}
          disabled={checking}
          className="py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          {checking ? "Scanning..." : "Auto Detect"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {PROVIDERS.map((p) => {
          const isActive = config.provider === p.id;
          const isAvailable = p.status?.available;
          return (
            <button
              key={p.id}
              onClick={() => {
                if (p.id === "api") {
                  update({ provider: "api", model: config.model || "gpt-4o-mini" });
                } else {
                  handleCheckProvider(p.id);
                }
              }}
              disabled={checking}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer disabled:opacity-60 ${
                isActive
                  ? "bg-indigo-500/10 border-indigo-500"
                  : "bg-slate-950/60 border-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isAvailable === true ? "bg-emerald-500" : isAvailable === false ? "bg-slate-600" : "bg-slate-700"}`} />
                <div className="text-left">
                  <p className="text-xs font-bold text-white">{p.label}</p>
                  <p className="text-[10px] text-slate-500">{p.desc}</p>
                  {p.status?.error && (
                    <p className="text-[9px] text-rose-400 mt-0.5">{p.status.error}</p>
                  )}
                </div>
              </div>
              {isActive && (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>

      {config.provider === "webgpu" && (
        <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Model</label>
            <span className="text-[9px] text-slate-600">VRAM &amp; capability rating</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pendingModel}
              onChange={(e) => setPendingModel(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <optgroup label="── Fast & Light ──">
                {getModelsByCategory("text-fast").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size}) — {m.description}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Smart & Balanced ──">
                {getModelsByCategory("text-smart").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size}, VRAM: {m.vramRequired}) — {m.description}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Powerful Text ──">
                {getModelsByCategory("text-powerful").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size}, VRAM: {m.vramRequired}) — {m.description}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Vision (Reads Images) ──">
                {getModelsByCategory("vision").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.size}, VRAM: {m.vramRequired}) — {m.description}
                  </option>
                ))}
              </optgroup>
            </select>
            {pendingModel !== config.model && (
              <button
                onClick={() => {
                  update({ model: pendingModel });
                  setPendingModel(pendingModel);
                }}
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold transition-colors cursor-pointer shrink-0"
              >
                Apply
              </button>
            )}
          </div>
          <div className="text-[9px] text-slate-600 leading-relaxed">
            {getModelsByCategory("vision")[0] && (
              <p className="text-amber-400/80">★ Recommended: <span className="text-slate-400">{getModelsByCategory("vision")[0].name}</span> — reads images for resume scanning (4+ GB VRAM)</p>
            )}
            {getModelsByCategory("text-smart")[0] && (
              <p className="text-indigo-400/80">▸ Best text-only: <span className="text-slate-400">{getModelsByCategory("text-smart")[0].name}</span> — great for drafting &amp; analysis (3.5+ GB VRAM)</p>
            )}
            <p className="text-slate-600">▸ Need less VRAM? Pick a <span className="text-slate-500">Fast</span> model for quick responses.</p>
          </div>
        </div>
      )}

      {config.provider === "api" && (
        <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">API Key</label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); update({ apiKey: e.target.value }); }}
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Base URL</label>
            <input
              type="text"
              placeholder="https://api.openai.com"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); update({ baseUrl: e.target.value }); }}
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Model</label>
            <input
              type="text"
              placeholder="gpt-4o-mini"
              value={config.model || ""}
              onChange={(e) => update({ model: e.target.value })}
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500 bg-slate-950/30 p-3 rounded-xl border border-slate-900">
        <p className="font-semibold text-slate-400 mb-1">Auto-Detect Priority:</p>
        <p>WebGPU → Ollama (localhost:11434) → LM Studio (localhost:1234)</p>
      </div>
    </div>
  );
}
