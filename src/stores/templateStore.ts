"use client";

import { create } from "zustand";
import { EmailTemplate } from "@/utils/db";
import {
  getAllTemplates,
  saveTemplate as dbSaveTemplate,
  deleteTemplate as dbDeleteTemplate,
} from "@/utils/db";

interface TemplateStore {
  templates: EmailTemplate[];
  isLoading: boolean;
  loadTemplates: () => Promise<void>;
  addTemplate: (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateTemplate: (template: EmailTemplate) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
  templates: [],
  isLoading: false,

  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const templates = await getAllTemplates();
      set({ templates, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addTemplate: async (data) => {
    const now = new Date().toISOString();
    const template: EmailTemplate = {
      ...data,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    await dbSaveTemplate(template);
    set({ templates: [template, ...get().templates] });
  },

  updateTemplate: async (template) => {
    const updated = { ...template, updatedAt: new Date().toISOString() };
    await dbSaveTemplate(updated);
    set({
      templates: get().templates.map((t) => (t.id === updated.id ? updated : t)),
    });
  },

  removeTemplate: async (id) => {
    await dbDeleteTemplate(id);
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },
}));
