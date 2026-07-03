"use client";

import { useState, useEffect } from "react";
import { detectBrowser, getFlagsInstructions, BrowserDetectionResult } from "@/utils/browser";

export default function BrowserWebGPUHelp() {
  const [browser, setBrowser] = useState<BrowserDetectionResult | null>(null);

  useEffect(() => {
    detectBrowser().then(setBrowser).catch(() => setBrowser(null));
  }, []);

  if (!browser) return null;

  const instructions = getFlagsInstructions(browser);
  if (!instructions) return null;

  const browserIcon = () => {
    switch (browser.name) {
      case "brave":
        return "🦁";
      case "chrome":
        return "🌐";
      case "edge":
        return "🔷";
      case "firefox":
        return "🦊";
      case "safari":
        return "🧭";
      case "opera":
        return "🔴";
      default:
        return "🌍";
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-xs space-y-3 mt-3">
      <div className="flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">{browserIcon()}</span>
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-slate-200">
            WebGPU is{" "}
            <span className="text-amber-400">not available</span>
            {" "}on <span className="text-white">{browser.label}</span>
          </p>
          <p className="text-slate-400 leading-relaxed">
            {browser.name === "brave"
              ? "Brave blocks WebGPU by default for fingerprinting protection. Enable it with these steps:"
              : browser.name === "firefox"
                ? "WebGPU is experimental in Firefox. Enable it manually:"
                : browser.name === "safari"
                  ? "WebGPU is experimental in Safari. Enable it in the Develop menu:"
                  : "WebGPU may need to be enabled manually:"}
          </p>
          <ol className="flex flex-col gap-1.5 list-decimal list-inside text-slate-300">
            {instructions.steps.map((step, i) => (
              <li key={i} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
            ))}
          </ol>
          {instructions.linuxNote && (
            <p className="text-amber-400/80 bg-amber-950/20 border border-amber-900/30 rounded-lg p-2.5 mt-1 leading-relaxed">
              {instructions.linuxNote.split("\n").map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </p>
          )}
          {browser.webgpuFlagsUrl && (
            <div className="pt-1">
              <a
                href={browser.webgpuFlagsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open {browser.webgpuFlagsUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
