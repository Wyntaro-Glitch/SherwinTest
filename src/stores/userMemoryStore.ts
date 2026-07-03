"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Memory {
  key: string;
  value: string;
  category: "personal" | "preference" | "context" | "fact";
  updatedAt: string;
}

interface UserMemoryStore {
  memories: Memory[];
  setMemory: (key: string, value: string, category?: Memory["category"]) => void;
  getMemory: (key: string) => string | undefined;
  deleteMemory: (key: string) => void;
  clearAllMemories: () => void;
  getAllMemoriesFormatted: () => string;
}

export const useUserMemoryStore = create<UserMemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],

      setMemory: (key, value, category = "fact") =>
        set((s) => {
          const existing = s.memories.findIndex((m) => m.key === key);
          const entry: Memory = { key, value, category, updatedAt: new Date().toISOString() };
          const memories =
            existing >= 0
              ? s.memories.map((m, i) => (i === existing ? entry : m))
              : [...s.memories, entry];
          return { memories };
        }),

      getMemory: (key) => get().memories.find((m) => m.key === key)?.value,

      deleteMemory: (key) =>
        set((s) => ({ memories: s.memories.filter((m) => m.key !== key) })),

      clearAllMemories: () => set({ memories: [] }),

      getAllMemoriesFormatted: () => {
        const m = get().memories;
        if (m.length === 0) return "";
        return (
          "--- User Memory ---\n" +
          m
            .sort((a, b) => a.category.localeCompare(b.category))
            .map((mem) => `[${mem.category}] ${mem.key}: ${mem.value}`)
            .join("\n")
        );
      },
    }),
    { name: "sherwin_user_memory" }
  )
);
