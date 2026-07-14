"use client";

import { getAllTemplates, getAllLabels, saveAllLabels, EmailTemplate, Label } from "./db";
import { getAllEmails, saveAllEmails } from "./db";
import { Email } from "@/types";

interface SettingsExport {
  version: 1;
  exportedAt: string;
  stores: Record<string, unknown>;
  templates: EmailTemplate[];
  labels: Label[];
  emails: Email[];
}

const ZUSTAND_KEYS = [
  "sherwin_model_store",
  "sherwin_smtp",
  "sherwin_user_memory",
  "sherwin_tutorial",
  "sherwin_rules",
] as const;

function readZustandStore(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed;
  } catch {
    return null;
  }
}

function writeZustandStore(key: string, data: unknown): void {
  if (!data) return;
  localStorage.setItem(key, JSON.stringify({ state: data, version: 0 }));
}

export async function exportSettings(): Promise<Blob> {
  const stores: Record<string, unknown> = {};
  for (const key of ZUSTAND_KEYS) {
    stores[key] = readZustandStore(key);
  }

  const settings: SettingsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
    templates: await getAllTemplates(),
    labels: await getAllLabels(),
    emails: await getAllEmails(),
  };

  return new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
}

export async function importSettings(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as SettingsExport;

    if (!data.version || !data.stores) {
      return { success: false, message: "Invalid settings file format." };
    }

    // Restore Zustand stores (skip SMTP to protect passwords)
    for (const key of ZUSTAND_KEYS) {
      if (key === "sherwin_smtp") continue; // never overwrite SMTP credentials
      if (data.stores[key]) {
        writeZustandStore(key, data.stores[key]);
      }
    }

    // Restore IndexedDB data
    if (data.templates?.length) {
      const { saveTemplate } = await import("./db");
      for (const t of data.templates) {
        await saveTemplate(t);
      }
    }
    if (data.labels?.length) {
      await saveAllLabels(data.labels);
    }
    if (data.emails?.length) {
      await saveAllEmails(data.emails);
    }

    return { success: true, message: "Settings imported successfully. Please reload the page." };
  } catch (e) {
    return { success: false, message: `Import failed: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
