"use client";

import { ReactNode, useEffect } from "react";

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  details?: string;
  actions?: { label: string; onClick: () => void; variant?: "primary" | "secondary" }[];
  children?: ReactNode;
}

export default function ErrorModal({ open, onClose, title, description, details, actions, children }: ErrorModalProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>

        {/* Details */}
        {details && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all">{details}</pre>
          </div>
        )}

        {/* Custom children */}
        {children}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  action.variant === "primary" || !action.variant
                    ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {action.label}
              </button>
            ))}
            <button onClick={onClose} className="py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
