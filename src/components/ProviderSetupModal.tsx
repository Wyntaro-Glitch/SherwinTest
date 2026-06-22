"use client";

import { useState } from "react";
import { AIProviderConfig, AIProviderType } from "@/types";
import { setProviderConfig, checkProvider, autoDetectProvider } from "@/utils/aiProvider";

interface ProviderSetupModalProps {
  open: boolean;
  onComplete: (config: AIProviderConfig) => void;
  onSkip: () => void;
}

export default function ProviderSetupModal({ open, onComplete, onSkip }: ProviderSetupModalProps) {
  const [step, setStep] = useState<"choose" | "ollama" | "lmstudio" | "api">("choose");
  const [checking, setChecking] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com");
  const [model, setModel] = useState("gpt-4o-mini");

  if (!open) return null;

  const handleAutoDetect = async () => {
    setChecking(true);
    const result = await autoDetectProvider();
    setChecking(false);
    if (result) {
      onComplete(result.config);
    } else {
      setStep("choose");
    }
  };

  const handleSelectProvider = async (provider: AIProviderType) => {
    if (provider === "ollama" || provider === "lmstudio") {
      setChecking(true);
      const cap = await checkProvider(provider);
      setChecking(false);
      if (cap.available && cap.models.length > 0) {
        const config: AIProviderConfig = {
          provider,
          model: cap.models[0],
          ollamaModel: provider === "ollama" ? cap.models[0] : undefined,
          lmStudioModel: provider === "lmstudio" ? cap.models[0] : undefined,
        };
        setProviderConfig(config);
        onComplete(config);
      } else {
        setStep(provider);
      }
    } else if (provider === "api") {
      setStep("api");
    }
  };

  const handleApiConfirm = () => {
    if (!apiKey.trim()) return;
    const config: AIProviderConfig = { provider: "api", model, apiKey, baseUrl };
    setProviderConfig(config);
    onComplete(config);
  };

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onSkip}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-300 font-semibold">Scanning for AI providers...</p>
          <p className="text-xs text-slate-500">Checking WebGPU, Ollama, and LM Studio...</p>
        </div>
      </div>
    );
  }

  if (step === "api") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStep("choose")} />
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-white">Connect API Provider</h3>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">API Key</label>
            <input type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Base URL</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Model</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleApiConfirm} disabled={!apiKey.trim()} className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">Connect</button>
            <button onClick={() => setStep("choose")} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="text-base font-bold text-white">Choose AI Provider</h3>
          <p className="text-xs text-slate-500 mt-1">SherwinMail needs an AI backend to generate emails. Select one.</p>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={handleAutoDetect} className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500 rounded-xl transition-all cursor-pointer group">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.27 15" /></svg>
            </div>
            <div className="text-left flex-1">
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Auto Detect</p>
              <p className="text-[10px] text-slate-500">Try WebGPU → Ollama → LM Studio</p>
            </div>
          </button>

          <ProviderOption icon="🦙" label="Ollama" desc="Local inference (localhost:11434)" onClick={() => handleSelectProvider("ollama")} />
          <ProviderOption icon="🤖" label="LM Studio" desc="Local inference (localhost:1234)" onClick={() => handleSelectProvider("lmstudio")} />
          <ProviderOption icon="🔑" label="API Key" desc="OpenAI, Anthropic, or compatible" onClick={() => handleSelectProvider("api")} />
        </div>

        <button onClick={onSkip} className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer self-center">
          Skip — use mock assistant
        </button>
      </div>
    </div>
  );
}

function ProviderOption({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer group">
      <span className="text-xl">{icon}</span>
      <div className="text-left flex-1">
        <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
      <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </button>
  );
}
