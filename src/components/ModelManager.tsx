"use client";

import { useState, useCallback } from "react";
import { useModelStore, type DownloadStatus } from "@/stores/modelStore";
import { AVAILABLE_MODELS, type ModelOption, type ModelCategory } from "@/utils/aiService";
import { aiService } from "@/utils/aiService";

const categoryLabels: Record<ModelCategory, string> = {
  "text-fast": "Fast",
  "text-smart": "Smart",
  "text-powerful": "Powerful",
  vision: "Vision",
  fallback: "Fallback",
};

const categoryColors: Record<ModelCategory, string> = {
  "text-fast": "border-emerald-800/50 text-emerald-400 bg-emerald-950/20",
  "text-smart": "border-blue-800/50 text-blue-400 bg-blue-950/20",
  "text-powerful": "border-purple-800/50 text-purple-400 bg-purple-950/20",
  vision: "border-amber-800/50 text-amber-400 bg-amber-950/20",
  fallback: "border-slate-800 text-slate-400 bg-slate-950",
};

function statusIcon(status: DownloadStatus): string {
  switch (status) {
    case "ready": return "●";
    case "downloading": return "◉";
    case "error": return "✕";
    case "deleting": return "◌";
    default: return "○";
  }
}

function statusColor(status: DownloadStatus): string {
  switch (status) {
    case "ready": return "text-emerald-400";
    case "downloading": return "text-indigo-400 animate-pulse";
    case "error": return "text-rose-400";
    case "deleting": return "text-amber-400 animate-pulse";
    default: return "text-slate-500";
  }
}

export default function ModelManager() {
  const {
    models,
    activeModelId,
    initModel,
    setDownloadProgress,
    setDownloadReady,
    setDownloadError,
    setActiveModel,
    removeModel,
  } = useModelStore();

  const [filter, setFilter] = useState<ModelCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleDownload = useCallback(async (model: ModelOption) => {
    if (model.id === "mock-assistant") {
      setDownloadReady(model.id);
      setActiveModel(model.id);
      return;
    }

    initModel(model.id);

    try {
      const success = await aiService.initEngine(model.id, (progress) => {
        setDownloadProgress(model.id, progress.percent);
      });

      if (success) {
        setDownloadReady(model.id);
        setActiveModel(model.id);
      } else {
        setDownloadError(model.id, "Failed to load model");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setDownloadError(model.id, msg);
    }
  }, [initModel, setDownloadProgress, setDownloadReady, setDownloadError, setActiveModel]);

  const handleDelete = useCallback((modelId: string) => {
    removeModel(modelId);
    // In a real app we'd clear the IndexedDB cache here
    setTimeout(() => {
      useModelStore.getState().removeModel(modelId);
    }, 500);
  }, [removeModel]);

  const filteredModels = AVAILABLE_MODELS.filter(
    (m) => filter === "all" || m.category === filter
  );

  const readyCount = Object.values(models).filter((m) => m.status === "ready").length;
  const downloadingCount = Object.values(models).filter((m) => m.status === "downloading").length;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Model Download Manager</h3>
          <p className="text-xs text-slate-500">
            {readyCount} downloaded · {downloadingCount} in progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ModelCategory | "all")}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Models</option>
            <option value="text-fast">Fast</option>
            <option value="text-smart">Smart</option>
            <option value="text-powerful">Powerful</option>
            <option value="vision">Vision</option>
            <option value="fallback">Fallback</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filteredModels.map((model) => {
          const entry = models[model.id];
          const status = entry?.status || "idle";
          const progress = entry?.progress || 0;
          const isActive = activeModelId === model.id;
          const isExpanded = expanded === model.id;

          return (
            <div
              key={model.id}
              className={`border rounded-xl transition-all ${
                isActive
                  ? "bg-indigo-950/30 border-indigo-800/50"
                  : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
              }`}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : model.id)}
              >
                <span className={`text-sm ${statusColor(status)}`}>
                  {statusIcon(status)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {model.name}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${categoryColors[model.category]}`}>
                      {categoryLabels[model.category]}
                    </span>
                    {isActive && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-800/50 text-indigo-400">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">{model.size}</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">{model.vramRequired} VRAM</span>
                  </div>
                </div>

                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {status === "downloading" && (
                <div className="px-3 pb-3">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">
                    {Math.round(progress)}% — {entry?.error || "Downloading..."}
                  </p>
                </div>
              )}

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-900 mt-0 pt-3">
                  <p className="text-[10px] text-slate-500 mb-2">{model.description}</p>
                  <p className="text-[9px] text-slate-600 mb-3">Best for: {model.recommendedFor}</p>

                  <div className="flex gap-2">
                    {status === "idle" || status === "error" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(model);
                        }}
                        className="py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        {status === "error" ? "Retry Download" : "Download"}
                      </button>
                    ) : status === "ready" ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModel(model.id);
                          }}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            isActive
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-800/50"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                          }`}
                        >
                          {isActive ? "Active" : "Set Active"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(model.id);
                          }}
                          className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </>
                    ) : status === "downloading" ? (
                      <span className="text-[10px] text-indigo-400 font-mono">
                        Downloading...
                      </span>
                    ) : null}
                  </div>

                  {entry?.error && (
                    <p className="text-[9px] text-rose-400 mt-2 font-mono break-all">
                      {entry.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
        <p className="font-semibold text-slate-400 mb-1">Storage</p>
        <p>Models are cached in your browser via WebGPU. Downloaded models persist across sessions but are not uploaded anywhere — all inference runs locally on your device.</p>
      </div>
    </div>
  );
}
