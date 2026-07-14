"use client";

import { useState, useEffect, useCallback } from "react";
import { AIProviderConfig, AIProviderType } from "@/types";
import {
  getProviderConfig,
  setProviderConfig,
  checkProvider,
  autoDetectProvider,
  ProviderCapabilities,
  VISION_MODEL_PRESETS,
  matchPresetToInstalled,
} from "@/utils/aiProvider";
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
  const [ollamaInstalledModels, setOllamaInstalledModels] = useState<string[]>([]);
  const [lmStudioInstalledModels, setLmStudioInstalledModels] = useState<string[]>([]);

  const update = useCallback((partial: Partial<AIProviderConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      setProviderConfig(next);
      return next;
    });
  }, []);

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
    if (provider === "ollama") {
      setOllamaStatus(result);
      setOllamaInstalledModels(result.models);
    }
    if (provider === "lmstudio") {
      setLmStudioStatus(result);
      setLmStudioInstalledModels(result.models);
    }
    if (provider === "webgpu") setWebgpuStatus(result);
    if (result.available && result.models.length > 0) {
      if (provider === "webgpu") {
        const savedModel = config.model || result.models[0];
        setPendingModel(savedModel);
        update({ provider });
      } else {
        update({
          provider,
          model: result.models[0],
          ollamaModel: provider === "ollama" ? result.models[0] : undefined,
          lmStudioModel: provider === "lmstudio" ? result.models[0] : undefined,
        });
      }
    }
    setChecking(false);
  };

  const handleSelectPreset = useCallback(
    (presetIndex: number, provider: "ollama" | "lmstudio") => {
      const preset = VISION_MODEL_PRESETS[presetIndex];
      const installed = provider === "ollama" ? ollamaInstalledModels : lmStudioInstalledModels;
      const { matched, matchedModel } = matchPresetToInstalled(preset, installed, provider);

      const modelToUse = matched ? matchedModel! : (provider === "ollama" ? preset.ollamaModels[0] : preset.lmStudioModels[0]);

      update({
        provider,
        model: modelToUse,
        ollamaModel: provider === "ollama" ? modelToUse : undefined,
        lmStudioModel: provider === "lmstudio" ? modelToUse : undefined,
      });
    },
    [ollamaInstalledModels, lmStudioInstalledModels, update]
  );

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const provider = config.provider;
      const result = await checkProvider(provider);
      if (cancelled) return;
      setChecking(false);
      if (provider === "ollama") {
        setOllamaStatus(result);
        setOllamaInstalledModels(result.models);
      }
      if (provider === "lmstudio") {
        setLmStudioStatus(result);
        setLmStudioInstalledModels(result.models);
      }
      if (provider === "webgpu") setWebgpuStatus(result);
      if (result.available && result.models.length > 0) {
        if (provider === "webgpu") {
          setPendingModel(config.model || result.models[0]);
          update({ provider });
        } else {
          update({
            provider,
            model: result.models[0],
            ollamaModel: provider === "ollama" ? result.models[0] : undefined,
            lmStudioModel: provider === "lmstudio" ? result.models[0] : undefined,
          });
        }
      }
    }
    check();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PROVIDERS: { id: AIProviderType; label: string; desc: string; status: ProviderCapabilities | null }[] = [
    { id: "ollama", label: "Ollama", desc: "Local Ollama (localhost:11434)", status: ollamaStatus },
    { id: "lmstudio", label: "LM Studio", desc: "Local LM Studio (localhost:1234)", status: lmStudioStatus },
    { id: "webgpu", label: "WebGPU", desc: "Browser GPU acceleration", status: webgpuStatus },
    { id: "api", label: "API Key", desc: "Remote LLM provider", status: null },
  ];

  const installedModels = config.provider === "ollama" ? ollamaInstalledModels : lmStudioInstalledModels;

  const parseVramGB = (vram: string): number => {
    const match = vram.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const getVramWarning = (vramRequired: string): { level: "none" | "low" | "medium" | "high"; message: string } => {
    const gb = parseVramGB(vramRequired);
    if (gb <= 2) return { level: "none", message: "" };
    if (gb <= 3.5) return { level: "low", message: `Needs ~${vramRequired} VRAM. Works on most dedicated GPUs.` };
    if (gb <= 5) return { level: "medium", message: `Needs ~${vramRequired} VRAM. Requires a dedicated GPU (GTX 1060+ / M1+).` };
    return { level: "high", message: `Needs ~${vramRequired} VRAM. Requires a high-end GPU (RTX 3080+ / M1 Pro+). May fail on integrated graphics.` };
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">AI Provider</h3>
          <p className="text-xs text-slate-500">Choose how to run AI inference. All local presets support images &amp; PDFs.</p>
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

      {/* Ollama / LM Studio Vision Presets */}
      {(config.provider === "ollama" || config.provider === "lmstudio") && (
        <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
              Vision Model Preset — {config.provider === "ollama" ? "Ollama" : "LM Studio"}
            </label>
            {installedModels.length > 0 && (
              <span className="text-[9px] text-emerald-400">{installedModels.length} model{installedModels.length !== 1 ? "s" : ""} detected</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VISION_MODEL_PRESETS.map((preset, i) => {
              const { matched, matchedModel } = matchPresetToInstalled(preset, installedModels, config.provider as "ollama" | "lmstudio");
              const isSelected = config.model === (matchedModel || (config.provider === "ollama" ? preset.ollamaModels[0] : preset.lmStudioModels[0]));

              return (
                <button
                  key={preset.tier}
                  onClick={() => handleSelectPreset(i, config.provider as "ollama" | "lmstudio")}
                  disabled={checking}
                  className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                      : "bg-slate-950/60 border-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{preset.icon}</span>
                    {matched ? (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-800/50 text-emerald-400 font-bold">
                        Installed
                      </span>
                    ) : (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-500">
                        Not found
                      </span>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? "text-indigo-400" : "text-slate-200"}`}>
                      {preset.label}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{preset.vramRequired} VRAM</p>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed">{preset.description}</p>
                  {matched && matchedModel && (
                    <p className="text-[8px] text-emerald-400/80 font-mono truncate">{matchedModel}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preset.capabilities.map((cap) => (
                      <span key={cap} className="text-[7px] px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                        {cap}
                      </span>
                    ))}
                  </div>
                  {(() => {
                    const warning = getVramWarning(preset.vramRequired);
                    if (warning.level === "none") return null;
                    const dotColor = warning.level === "high" ? "bg-rose-500" : "bg-amber-500";
                    return (
                      <div className="flex items-start gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 ${dotColor}`} />
                        <p className="text-[8px] text-slate-500 leading-relaxed">{warning.message}</p>
                      </div>
                    );
                  })()}
                </button>
              );
            })}
          </div>

          <div className="text-[9px] text-slate-600 leading-relaxed">
            <p>All presets include <span className="text-amber-400/80">vision capabilities</span> for reading images &amp; PDFs.</p>
            <p className="mt-0.5">
              {installedModels.length === 0
                ? "No models detected. Start your server and pull a model first."
                : `Your installed models: ${installedModels.slice(0, 5).join(", ")}${installedModels.length > 5 ? ` +${installedModels.length - 5} more` : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* WebGPU Model Selector */}
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
          </div>
          {(() => {
            const selectedModel = getModelsByCategory("text-fast")
              .concat(getModelsByCategory("text-smart"), getModelsByCategory("text-powerful"), getModelsByCategory("vision"))
              .find((m) => m.id === pendingModel);
            if (!selectedModel) return null;
            const warning = getVramWarning(selectedModel.vramRequired);
            if (warning.level === "none") return null;
            const colors = {
              low: "bg-slate-800/50 border-slate-700 text-slate-400",
              medium: "bg-amber-950/30 border-amber-900/50 text-amber-400",
              high: "bg-rose-950/30 border-rose-900/50 text-rose-400",
            };
            return (
              <div className={`mt-2 p-2.5 rounded-lg border text-[10px] leading-relaxed ${colors[warning.level]}`}>
                {warning.level === "high" && <span className="font-bold">⚠ </span>}
                {warning.message}
              </div>
            );
          })()}
        </div>
      )}

      {/* API Key Config */}
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
