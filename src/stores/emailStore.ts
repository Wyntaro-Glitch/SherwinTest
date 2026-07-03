"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Email, MailFolder } from "@/types";

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
}

export const useEmailStore = create<EmailStore>()(
  persist(
    (set) => ({
      emails: DEFAULT_EMAILS,
      currentFolder: "home",
      selectedEmailId: null,
      undoStack: [],
      undoDescription: null,

      addEmail: (email) =>
        set((s) => ({
          emails: [email, ...s.emails],
          undoStack: [...s.undoStack, { emails: s.emails, description: `Add "${email.subject || "draft"}"` }].slice(-20),
          undoDescription: `Add "${email.subject || "draft"}"`,
        })),

      updateEmail: (id, updates) =>
        set((s) => {
          const prev = s.emails.find((e) => e.id === id);
          if (!prev) return {};
          return {
            emails: s.emails.map((e) => (e.id === id ? { ...e, ...updates } : e)),
            undoStack: [...s.undoStack, { emails: s.emails, description: `Update "${prev.subject || "draft"}"` }].slice(-20),
            undoDescription: `Update "${prev.subject || "draft"}"`,
          };
        }),

      deleteEmail: (id) =>
        set((s) => {
          const prev = s.emails.find((e) => e.id === id);
          return {
            emails: s.emails.filter((e) => e.id !== id),
            selectedEmailId: s.selectedEmailId === id ? null : s.selectedEmailId,
            undoStack: [...s.undoStack, { emails: s.emails, description: `Delete "${prev?.subject || "email"}"` }].slice(-20),
            undoDescription: `Delete "${prev?.subject || "email"}"`,
          };
        }),

      setEmails: (emails) => set({ emails }),

      setCurrentFolder: (folder) =>
        set({ currentFolder: folder, selectedEmailId: null }),

      setSelectedEmailId: (id) => set({ selectedEmailId: id }),

      composeDraft: () =>
        set((s) => {
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
          return {
            emails: [newDraft, ...s.emails],
            currentFolder: "draft",
            selectedEmailId: newDraft.id,
            undoStack: [...s.undoStack, { emails: s.emails, description: "New draft" }].slice(-20),
            undoDescription: "New draft",
          };
        }),

      replyToEmail: (replyTo) =>
        set((s) => {
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
          return {
            emails: [newDraft, ...s.emails],
            currentFolder: "draft",
            selectedEmailId: newDraft.id,
            undoStack: [...s.undoStack, { emails: s.emails, description: `Reply to "${replyTo.subject}"` }].slice(-20),
            undoDescription: `Reply to "${replyTo.subject}"`,
          };
        }),

      selectEmail: (id) =>
        set((s) => ({
          selectedEmailId: id,
          emails: s.emails.map((e) =>
            e.id === id ? { ...e, isRead: true } : e
          ),
        })),

      undoEmailAction: () =>
        set((s) => {
          if (s.undoStack.length === 0) return {};
          const prev = s.undoStack[s.undoStack.length - 1];
          return {
            emails: prev.emails,
            undoStack: s.undoStack.slice(0, -1),
            undoDescription: null,
          };
        }),

      clearUndo: () => set({ undoDescription: null }),
    }),
    {
      name: "sherwin_emails",
      partialize: (state) => ({ emails: state.emails }),
    }
  )
);
