"use client";

import { useEffect, useState } from "react";
import { detectWebGPUSupport, suggestModelTier, WebGPUDetectionResult } from "@/utils/webgpu";
import BrowserWebGPUHelp from "./BrowserWebGPUHelp";

interface PrivacyDashboardProps {
  onNavigate: (view: "inbox" | "chat" | "settings") => void;
}

export default function PrivacyDashboard({ onNavigate }: PrivacyDashboardProps) {
  const [detection, setDetection] = useState<WebGPUDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const result = await detectWebGPUSupport();
        if (!cancelled) setDetection(result);
      } catch {
        if (!cancelled) {
          setDetection({
            supported: false,
            adapterCreated: false,
            deviceCreated: false,
            error: "Detection failed unexpectedly.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const suggestion = detection?.limits ? suggestModelTier(detection.limits) : null;

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return "N/A";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 bg-slate-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 sm:p-10 flex flex-col gap-8">

        {/* Hero Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Your Privacy, Your PC</h2>
              <p className="text-xs text-slate-400 font-mono">
                SherwinMail runs entirely in-browser. Zero data leaves your machine.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-1">Zero-Data-Transfer Policy</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All AI inference using <strong className="text-slate-300">@mlc-ai/web-llm</strong> executes locally on your GPU via WebGPU.
                Your resume, job descriptions, email drafts, and SMTP credentials are processed on your device and
                stored only in browser storage (localStorage / IndexedDB).
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  No external LLM API calls — AI runs 100% on-device
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  PDF extraction via local Next.js API route — no third-party services
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  SMTP credentials encrypted in localStorage — never transmitted externally
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Hardware & Model Tier Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Hardware Diagnostics & Model Tier
          </h3>

          {loading ? (
            <div className="py-6 flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 font-mono">Detecting GPU capabilities...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Status indicator */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                detection?.deviceCreated
                  ? "bg-emerald-950/20 border-emerald-900/50"
                  : "bg-amber-950/20 border-amber-900/50"
              }`}>
                {detection?.deviceCreated ? (
                  <>
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">WebGPU Active</p>
                      <p className="text-[10px] text-slate-500 font-mono">GPU acceleration available for local AI</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full bg-amber-500 shadow-md shadow-amber-500/50"></div>
                    <div>
                      <p className="text-xs font-semibold text-white">WebGPU Unavailable</p>
                      <p className="text-[10px] text-amber-400 font-mono">
                        {detection?.error || "GPU acceleration not detected — fallback to rule-based mode"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* GPU Info */}
              {detection?.gpuInfo && (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/45 p-4 rounded-xl border border-slate-900">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">GPU Device</span>
                    <span className="text-slate-200 font-semibold truncate">{detection.gpuInfo.device}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Vendor</span>
                    <span className="text-slate-200 font-semibold">{detection.gpuInfo.vendor}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Architecture</span>
                    <span className="text-slate-200 font-semibold">{detection.gpuInfo.architecture}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-500">Max Buffer</span>
                    <span className="text-slate-200 font-semibold">{formatBytes(detection.limits?.maxBufferSize)}</span>
                  </div>
                  {detection.features && (
                    <div className="col-span-2 flex items-center gap-1 text-[11px] font-mono">
                      <span className={detection.features.shaderF16 ? "text-emerald-400" : "text-rose-400"}>
                        {detection.features.shaderF16 ? "✓" : "✗"}
                      </span>
                      <span className={detection.features.shaderF16 ? "text-slate-300" : "text-rose-300"}>
                        shader-f16
                      </span>
                      <span className="text-slate-500">
                        {detection.features.shaderF16 ? "supported" : "not supported — models cannot load"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Model Tier Suggestion */}
              {suggestion && (
                <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-indigo-300">
                        Recommended Tier: <span className="text-white">{suggestion.tier}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{suggestion.description}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Model: <span className="text-slate-300">{suggestion.modelName}</span>
                      </p>
                    </div>
                  </div>
                  {suggestion.visionModelId && (
                    <div className="flex items-start gap-3 pl-1 border-t border-indigo-900/30 pt-3">
                      <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-emerald-300">
                          Vision Model Available
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{suggestion.visionDescription}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">
                          Model: <span className="text-slate-400">{suggestion.visionModelName}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback notice */}
              {!detection?.deviceCreated && (
                <div className="bg-amber-950/10 border border-amber-900/40 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-amber-300">Running in Fallback Mode</p>
                  <p>The AI assistant will use rule-based template generation instead of local LLM inference. All core features remain available.</p>
                </div>
              )}

              {!detection?.deviceCreated && <BrowserWebGPUHelp />}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate("inbox")}
            className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Go to Inbox</p>
              <p className="text-[10px] text-slate-500">View and manage emails</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("chat")}
            className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Open AI Chat</p>
              <p className="text-[10px] text-slate-500">Draft emails with AI assistance</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="flex items-center gap-3 p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Configure Email</p>
              <p className="text-[10px] text-slate-500">Set up SMTP connection</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
