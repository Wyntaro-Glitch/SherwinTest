"use client";

import { create } from "zustand";

export interface AppError {
  id: string;
  message: string;
  source: string;
  timestamp: string;
  autoFixable: boolean;
  autoFixAction?: () => Promise<string>;
  fixed: boolean;
}

interface ErrorMonitorStore {
  errors: AppError[];
  addError: (error: Omit<AppError, "id" | "timestamp" | "fixed">) => void;
  autoFix: (id: string) => Promise<string>;
  dismissError: (id: string) => void;
  clearAll: () => void;
}

let errCounter = 0;

export const useErrorMonitorStore = create<ErrorMonitorStore>((set, get) => ({
  errors: [],

  addError: (error) => {
    const id = `err-${++errCounter}`;
    set((s) => ({
      errors: [
        ...s.errors,
        { ...error, id, timestamp: new Date().toISOString(), fixed: false },
      ],
    }));
  },

  autoFix: async (id) => {
    const error = get().errors.find((e) => e.id === id);
    if (!error || !error.autoFixable || !error.autoFixAction) {
      return "Cannot auto-fix this error.";
    }
    const result = await error.autoFixAction();
    set((s) => ({
      errors: s.errors.map((e) => (e.id === id ? { ...e, fixed: true } : e)),
    }));
    return result;
  },

  dismissError: (id) =>
    set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),

  clearAll: () => set({ errors: [] }),
}));
