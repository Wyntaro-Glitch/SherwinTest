"use client";

import { create } from "zustand";
import { Email, MailFolder } from "@/types";
import {
  getAllEmails,
  saveAllEmails,
  saveEmail,
  deleteEmailFromDB,
  getAllLabels,
  saveAllLabels,
  migrateEmailsFromLocalStorage,
} from "@/utils/db";

const DEFAULT_LABELS = [
  { id: "label-important", name: "Important", color: "#f59e0b" },
  { id: "label-work", name: "Work", color: "#3b82f6" },
  { id: "label-personal", name: "Personal", color: "#10b981" },
  { id: "label-followup", name: "Follow Up", color: "#ef4444" },
];

const DEFAULT_EMAILS: Email[] = [
  {
    id: "inbox-1",
    subject: "Opportunities for Senior Software Engineer at Vercel",
    from: "recruiters@vercel.com",
    to: "you@sherwinmail.io",
    body: `Hi there,

I hope this message finds you well.

We saw your open-source profile on GitHub and were extremely impressed by your experience with modern frontends, specifically React and Next.js. We are currently looking for a Senior Software Engineer to join our developer framework team.

Could you share your portfolio or latest resume? We would love to set up a quick intro chat.

Best regards,
Sarah Jenkins
Vercel Recruiting Team`,
    status: "inbox",
    date: "Jun 14",
    isRead: false,
  },
  {
    id: "inbox-2",
    subject: "Interview Schedule Follow-Up",
    from: "hr@stripe.com",
    to: "you@sherwinmail.io",
    body: `Hi candidate,

We would like to coordinate a technical coding panel for next Tuesday. Please let us know your availability between 9 AM and 3 PM EST.

Best,
Stripe HR Operations`,
    status: "inbox",
    date: "Jun 12",
    isRead: true,
  },
  {
    id: "draft-1",
    subject: "[Job Title] Outreach: [Your Name]",
    from: "you@sherwinmail.io",
    to: "talent@google.com",
    body: ``,
    status: "draft",
    date: "Jun 15",
    isRead: true,
  },
];

interface UndoEntry {
  emails: Email[];
  description: string;
}

interface EmailStore {
  emails: Email[];
  currentFolder: MailFolder;
  selectedEmailId: string | null;
  undoStack: UndoEntry[];
  undoDescription: string | null;
  labels: { id: string; name: string; color: string }[];
  isLoaded: boolean;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setEmails: (emails: Email[]) => void;
  setCurrentFolder: (folder: MailFolder) => void;
  setSelectedEmailId: (id: string | null) => void;
  composeDraft: () => void;
  replyToEmail: (replyTo: Email) => void;
  selectEmail: (id: string) => void;
  undoEmailAction: () => void;
  clearUndo: () => void;
  addLabelToEmail: (emailId: string, labelId: string) => void;
  removeLabelFromEmail: (emailId: string, labelId: string) => void;
  addLabel: (name: string, color: string) => void;
  removeLabel: (id: string) => void;
  loadFromDB: () => Promise<void>;
}

export function getThread(emailId: string): Email[] {
  const state = useEmailStore.getState();
  const email = state.emails.find((e) => e.id === emailId);
  if (!email) return [];
  const normalized = normalizeSubject(email.subject);
  return state.emails
    .filter((e) => normalizeSubject(e.subject) === normalized)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re:\s*|Fwd:\s*|\[.*?\]\s*)*/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(emails: Email[]) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveAllEmails(emails).catch((e) => console.error("Failed to save emails to IndexedDB:", e));
  }, 300);
}

export const useEmailStore = create<EmailStore>()((set, get) => ({
  emails: DEFAULT_EMAILS,
  currentFolder: "home",
  selectedEmailId: null,
  undoStack: [],
  undoDescription: null,
  labels: DEFAULT_LABELS,
  isLoaded: false,

  loadFromDB: async () => {
    try {
      await migrateEmailsFromLocalStorage();
      const [emails, labels] = await Promise.all([getAllEmails(), getAllLabels()]);
      set({
        emails: emails.length > 0 ? emails : DEFAULT_EMAILS,
        labels: labels.length > 0 ? labels : DEFAULT_LABELS,
        isLoaded: true,
      });
      if (emails.length === 0) {
        await saveAllEmails(DEFAULT_EMAILS);
        await saveAllLabels(DEFAULT_LABELS);
      }
    } catch (e) {
      console.error("Failed to load from IndexedDB:", e);
      set({ isLoaded: true });
    }
  },

  addEmail: (email) => {
    const newEmails = [email, ...get().emails];
    set({
      emails: newEmails,
      undoStack: [...get().undoStack, { emails: get().emails, description: `Add "${email.subject || "draft"}"` }].slice(-20),
      undoDescription: `Add "${email.subject || "draft"}"`,
    });
    saveEmail(email).catch((e) => console.error("Failed to save email:", e));
  },

  updateEmail: (id, updates) => {
    const prev = get().emails.find((e) => e.id === id);
    if (!prev) return;
    const updated = { ...prev, ...updates };
    const newEmails = get().emails.map((e) => (e.id === id ? updated : e));
    set({
      emails: newEmails,
      undoStack: [...get().undoStack, { emails: get().emails, description: `Update "${prev.subject || "draft"}"` }].slice(-20),
      undoDescription: `Update "${prev.subject || "draft"}"`,
    });
    saveEmail(updated).catch((e) => console.error("Failed to save email:", e));
  },

  deleteEmail: (id) => {
    const prev = get().emails.find((e) => e.id === id);
    const newEmails = get().emails.filter((e) => e.id !== id);
    set({
      emails: newEmails,
      selectedEmailId: get().selectedEmailId === id ? null : get().selectedEmailId,
      undoStack: [...get().undoStack, { emails: get().emails, description: `Delete "${prev?.subject || "email"}"` }].slice(-20),
      undoDescription: `Delete "${prev?.subject || "email"}"`,
    });
    deleteEmailFromDB(id).catch((e) => console.error("Failed to delete email from DB:", e));
  },

  setEmails: (emails) => {
    set({ emails });
    debouncedSave(emails);
  },

  setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmailId: null }),

  setSelectedEmailId: (id) => set({ selectedEmailId: id }),

  composeDraft: () => {
    const newDraft: Email = {
      id: `draft-${Date.now()}`,
      subject: "",
      from: "you@sherwinmail.io",
      to: "",
      body: "",
      status: "draft",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isRead: true,
    };
    const newEmails = [newDraft, ...get().emails];
    set({
      emails: newEmails,
      currentFolder: "draft",
      selectedEmailId: newDraft.id,
      undoStack: [...get().undoStack, { emails: get().emails, description: "New draft" }].slice(-20),
      undoDescription: "New draft",
    });
    saveEmail(newDraft).catch((e) => console.error("Failed to save draft:", e));
  },

  replyToEmail: (replyTo) => {
    const newDraft: Email = {
      id: `draft-${Date.now()}`,
      subject: replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`,
      from: "you@sherwinmail.io",
      to: replyTo.from,
      body: `\n\nOn ${replyTo.date}, ${replyTo.from} wrote:\n> ${replyTo.body.split("\n").join("\n> ")}`,
      status: "draft",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isRead: true,
    };
    const newEmails = [newDraft, ...get().emails];
    set({
      emails: newEmails,
      currentFolder: "draft",
      selectedEmailId: newDraft.id,
      undoStack: [...get().undoStack, { emails: get().emails, description: `Reply to "${replyTo.subject}"` }].slice(-20),
      undoDescription: `Reply to "${replyTo.subject}"`,
    });
    saveEmail(newDraft).catch((e) => console.error("Failed to save reply draft:", e));
  },

  selectEmail: (id) =>
    set((s) => {
      const updated = s.emails.map((e) => (e.id === id ? { ...e, isRead: true } : e));
      const email = updated.find((e) => e.id === id);
      if (email) saveEmail(email).catch(() => {});
      return { selectedEmailId: id, emails: updated };
    }),

  undoEmailAction: () =>
    set((s) => {
      if (s.undoStack.length === 0) return {};
      const prev = s.undoStack[s.undoStack.length - 1];
      debouncedSave(prev.emails);
      return {
        emails: prev.emails,
        undoStack: s.undoStack.slice(0, -1),
        undoDescription: null,
      };
    }),

  clearUndo: () => set({ undoDescription: null }),

  addLabelToEmail: (emailId, labelId) => {
    const newEmails = get().emails.map((e) =>
      e.id === emailId ? { ...e, labels: [...new Set([...(e.labels || []), labelId])] } : e
    );
    set({ emails: newEmails });
    const email = newEmails.find((e) => e.id === emailId);
    if (email) saveEmail(email).catch(() => {});
  },

  removeLabelFromEmail: (emailId, labelId) => {
    const newEmails = get().emails.map((e) =>
      e.id === emailId ? { ...e, labels: (e.labels || []).filter((l) => l !== labelId) } : e
    );
    set({ emails: newEmails });
    const email = newEmails.find((e) => e.id === emailId);
    if (email) saveEmail(email).catch(() => {});
  },

  addLabel: (name, color) => {
    const newLabel = { id: `label-${Date.now()}`, name, color };
    const newLabels = [...get().labels, newLabel];
    set({ labels: newLabels });
    saveAllLabels(newLabels).catch(() => {});
  },

  removeLabel: (id) => {
    const newLabels = get().labels.filter((l) => l.id !== id);
    const newEmails = get().emails.map((e) => ({
      ...e,
      labels: (e.labels || []).filter((l) => l !== id),
    }));
    set({ labels: newLabels, emails: newEmails });
    saveAllLabels(newLabels).catch(() => {});
    debouncedSave(newEmails);
  },
}));
