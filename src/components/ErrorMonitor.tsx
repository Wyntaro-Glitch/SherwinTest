"use client";

import { useErrorMonitorStore } from "@/stores/errorMonitorStore";
import { useState } from "react";

export default function ErrorMonitor() {
  const { errors, autoFix, dismissError, clearAll } = useErrorMonitorStore();
  const [fixingId, setFixingId] = useState<string | null>(null);

  if (errors.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">
            Issues ({errors.length})
          </h3>
          <p className="text-xs text-slate-500">Auto-detected problems that can be fixed.</p>
        </div>
        <button
          onClick={clearAll}
          className="py-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
        >
          Dismiss All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {errors.map((err) => (
          <div
            key={err.id}
            className={`flex items-start justify-between p-3 rounded-xl border text-xs transition-colors ${
              err.fixed
                ? "bg-emerald-950/10 border-emerald-900/30"
                : "bg-rose-950/10 border-rose-900/30"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {err.fixed ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span className={`font-semibold ${err.fixed ? "text-emerald-300" : "text-rose-300"}`}>
                  {err.source}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{err.message}</span>
              </div>
              <p className="text-[9px] text-slate-600 font-mono mt-1">{err.timestamp}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {err.autoFixable && !err.fixed && (
                <button
                  onClick={async () => {
                    setFixingId(err.id);
                    await autoFix(err.id);
                    setFixingId(null);
                  }}
                  disabled={fixingId === err.id}
                  className="py-1 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {fixingId === err.id ? "Fixing..." : "Auto-Fix"}
                </button>
              )}
              <button
                onClick={() => dismissError(err.id)}
                className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-500 rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
