"use client";

import { useState } from "react";

const STORAGE_KEY = "sherwin_privacy_banner_dismissed";

export default function PrivacyBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <div className="bg-emerald-950/30 border-b border-emerald-900/40 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 text-xs">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </span>
        <span className="text-emerald-300 font-semibold">Zero-Data-Transfer Policy:</span>
        <span className="text-slate-400">
          All AI processing runs 100% locally in your browser. <strong className="text-slate-300">No data ever leaves your PC.</strong>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss privacy banner"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
