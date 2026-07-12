"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Rule } from "@/types/rule";

interface RuleStore {
  rules: Rule[];
  addRule: (rule: Rule) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  getEnabledRules: () => Rule[];
}

export const useRuleStore = create<RuleStore>()(
  persist(
    (set, get) => ({
      rules: [],

      addRule: (rule) => set((s) => ({ rules: [...s.rules, rule] })),

      updateRule: (id, updates) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      toggleRule: (id) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
        })),

      getEnabledRules: () => get().rules.filter((r) => r.enabled),
    }),
    { name: "sherwin_rules" }
  )
);
