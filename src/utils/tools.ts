import { Email, MailFolder, ThemeName } from "@/types";
import { useEmailStore } from "@/stores/emailStore";
import { useSmtpStore } from "@/stores/smtpStore";
import { aiService } from "@/utils/aiService";

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: Record<string, any>) => Promise<string>;
}

function extractJobTitle(text: string): string | null {
  const match = text.match(/(?:job title|role|position|looking for a|seeking a)\s*:\s*([^\n,.]+)/i);
  return match ? match[1].trim() : null;
}

export const TOOLS: Tool[] = [
  {
    name: "create_draft",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Create draft",
    parameters: [
      { name: "to", type: "string", description: "To", required: true },
      { name: "subject", type: "string", description: "Subject", required: true },
      { name: "body", type: "string", description: "Body", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Create a new email draft in the drafts folder",
    parameters: [
      { name: "to", type: "string", description: "Recipient email address", required: true },
      { name: "subject", type: "string", description: "Email subject line", required: true },
      { name: "body", type: "string", description: "Email body content", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ to, subject, body }) => {
      const draft: Email = {
        id: `draft-${Date.now()}`,
        subject, to, body,
        from: "you@sherwinmail.io",
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      useEmailStore.getState().addEmail(draft);
      useEmailStore.getState().setCurrentFolder("draft");
      useEmailStore.getState().setSelectedEmailId(draft.id);
      return `Created draft to ${to} with subject "${subject}". Navigated to Drafts folder.`;
    },
  },
  {
    name: "reply_to_email",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Reply to an email",
    parameters: [
      { name: "emailQuery", type: "string", description: "Find email by sender/subject", required: true },
      { name: "body", type: "string", description: "Body", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Create a reply to an existing email. Finds the email by searching subject or sender.",
    parameters: [
      { name: "emailQuery", type: "string", description: "Search term to find the email (sender name, subject keyword, or partial match)", required: true },
      { name: "body", type: "string", description: "Reply body content", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ emailQuery, body }) => {
      const emails = useEmailStore.getState().emails;
      const query = emailQuery.toLowerCase();
      const original = emails.find(e =>
        e.from.toLowerCase().includes(query) ||
        e.subject.toLowerCase().includes(query) ||
        e.body.toLowerCase().includes(query)
      );
      if (!original) return `Error: no email found matching "${emailQuery}". Try searching with a different term.`;

      const reply: Email = {
        id: `draft-${Date.now()}`,
        subject: original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`,
        to: original.from,
        from: "you@sherwinmail.io",
        body: `${body}\n\nOn ${original.date}, ${original.from} wrote:\n> ${original.body.split("\n").join("\n> ")}`,
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      useEmailStore.getState().addEmail(reply);
      useEmailStore.getState().setCurrentFolder("draft");
      useEmailStore.getState().setSelectedEmailId(reply.id);
      return `Created reply to ${original.from} about "${original.subject}". Navigated to Drafts folder.`;
    },
  },
  {
    name: "send_email",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Send a draft",
    parameters: [
      { name: "query", type: "string", description: "Find draft by subject/recipient", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Send a draft email by finding it via subject keyword or recipient",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the draft (subject keyword or recipient)", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ query }) => {
      const emails = useEmailStore.getState().emails;
      const q = query.toLowerCase();
      const draft = emails.find(e => e.status === "draft" && (
        e.subject.toLowerCase().includes(q) ||
        e.to.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      ));
      if (!draft) return `Error: no draft found matching "${query}".`;
      useEmailStore.getState().updateEmail(draft.id, {
        status: "sent",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      });
      return `Sent email to ${draft.to} with subject "${draft.subject}".`;
    },
  },
  {
    name: "navigate_to",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Navigate to a folder",
    parameters: [
      { name: "folder", type: "string", description: "inbox/draft/sent/chat/resume/settings/home", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Navigate to a different folder or view in the application",
    parameters: [
      { name: "folder", type: "string", description: "Target: inbox, draft, sent, chat, resume, settings, home", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ folder }) => {
      const validFolders: MailFolder[] = ["inbox", "draft", "sent", "chat", "resume", "settings", "home"];
      const f = folder.toLowerCase() as MailFolder;
      if (!validFolders.includes(f)) return `Error: invalid folder "${folder}". Valid: ${validFolders.join(", ")}`;
      useEmailStore.getState().setCurrentFolder(f);
      return `Navigated to ${f}.`;
    },
  },
  {
    name: "search_emails",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Search emails by keyword",
    parameters: [
      { name: "query", type: "string", description: "Keyword or phrase", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Search across all emails by keyword and return results",
    parameters: [
      { name: "query", type: "string", description: "Search keyword or phrase", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ query }) => {
      const emails = useEmailStore.getState().emails;
      const q = query.toLowerCase();
      const results = emails.filter(e =>
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q)
      );
      if (results.length === 0) return `No emails found matching "${query}".`;
      return results.map(e =>
        `[${e.status.toUpperCase()}] ${e.subject || "(no subject)"} — ${e.from} → ${e.to} (${e.date})${e.isRead ? "" : " [UNREAD]"}`
      ).join("\n");
    },
  },
  {
    name: "get_app_state",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Get app state summary",
=======
=======
>>>>>>> Stashed changes
    description: "Get the current application state summary",
>>>>>>> Stashed changes
    parameters: [],
    execute: async () => {
      const state = useEmailStore.getState();
      const smtp = useSmtpStore.getState();
      const inboxUnread = state.emails.filter(e => e.status === "inbox" && !e.isRead).length;
      const draftCount = state.emails.filter(e => e.status === "draft").length;
      const sentCount = state.emails.filter(e => e.status === "sent").length;
      return [
        `Current view: ${state.currentFolder}`,
        `Inbox: ${state.emails.filter(e => e.status === "inbox").length} (${inboxUnread} unread)`,
        `Drafts: ${draftCount}`,
        `Sent: ${sentCount}`,
        `Total emails: ${state.emails.length}`,
        `SMTP configured: ${smtp.emailAddress ? "yes (" + smtp.provider + ")" : "no"}`,
      ].join("\n");
    },
  },
  {
    name: "delete_email",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Delete an email",
    parameters: [
      { name: "query", type: "string", description: "Find email by subject/sender/keyword", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Delete an email or draft by searching for it",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the email to delete (subject, sender, or keyword)", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ query }) => {
      const emails = useEmailStore.getState().emails;
      const q = query.toLowerCase();
      const target = emails.find(e =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      );
      if (!target) return `Error: no email found matching "${query}".`;
      useEmailStore.getState().deleteEmail(target.id);
      return `Deleted email "${target.subject || "(no subject)"}" from ${target.from}.`;
    },
  },
  {
    name: "update_draft",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Update a draft",
    parameters: [
      { name: "query", type: "string", description: "Find draft by subject/recipient", required: true },
      { name: "to", type: "string", description: "New to" },
      { name: "subject", type: "string", description: "New subject" },
      { name: "body", type: "string", description: "New body" },
=======
=======
>>>>>>> Stashed changes
    description: "Update fields of an existing draft found by search",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the draft (subject or recipient)", required: true },
      { name: "to", type: "string", description: "New recipient email (optional)" },
      { name: "subject", type: "string", description: "New subject line (optional)" },
      { name: "body", type: "string", description: "New body content (optional)" },
>>>>>>> Stashed changes
    ],
    execute: async ({ query, ...fields }) => {
      const emails = useEmailStore.getState().emails;
      const q = query.toLowerCase();
      const draft = emails.find(e => e.status === "draft" && (
        e.subject.toLowerCase().includes(q) || e.to.toLowerCase().includes(q)
      ));
      if (!draft) return `Error: no draft found matching "${query}".`;
      const updates: Partial<Email> = {};
      if (fields.to) updates.to = fields.to;
      if (fields.subject) updates.subject = fields.subject;
      if (fields.body) updates.body = fields.body;
      useEmailStore.getState().updateEmail(draft.id, updates);
      const changed = Object.keys(updates).join(", ");
      return `Updated draft "${draft.subject}": ${changed} changed.`;
    },
  },
  {
    name: "change_setting",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Change a setting",
    parameters: [
      { name: "setting", type: "string", description: "theme", required: true },
      { name: "value", type: "string", description: "Value", required: true },
=======
=======
>>>>>>> Stashed changes
    description: "Change an application setting",
    parameters: [
      { name: "setting", type: "string", description: "Setting name: theme (dark/light/cyberpunk/sakura/forest/ocean)", required: true },
      { name: "value", type: "string", description: "New value for the setting", required: true },
>>>>>>> Stashed changes
    ],
    execute: async ({ setting, value }) => {
      const s = setting.toLowerCase();
      const v = value.toLowerCase();

      if (s === "theme") {
        const validThemes: ThemeName[] = ["dark", "light", "cyberpunk", "sakura", "forest", "ocean"];
        if (!validThemes.includes(v as ThemeName)) {
          return `Invalid theme "${value}". Valid: ${validThemes.join(", ")}`;
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("sherwin_theme", v);
          document.documentElement.setAttribute("data-theme", v);
        }
        return `Theme changed to ${v}.`;
      }

      return `Setting "${setting}" is not yet configurable through AI. Try: theme`;
    },
  },
  {
    name: "generate_and_create_draft",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    description: "Generate draft from job description",
    parameters: [
      { name: "jobDescription", type: "string", description: "Job description text", required: true },
      { name: "recipientEmail", type: "string", description: "To", required: true },
      { name: "companyName", type: "string", description: "Company" },
      { name: "hiringManager", type: "string", description: "Hiring manager" },
=======
=======
>>>>>>> Stashed changes
    description: "Parse a job description and create a complete outreach draft in one step",
    parameters: [
      { name: "jobDescription", type: "string", description: "The full job description text", required: true },
      { name: "recipientEmail", type: "string", description: "Recipient email address", required: true },
      { name: "companyName", type: "string", description: "Company name (optional)" },
      { name: "hiringManager", type: "string", description: "Hiring manager name (optional)" },
>>>>>>> Stashed changes
    ],
    execute: async ({ jobDescription, recipientEmail, companyName, hiringManager }) => {
      const title = extractJobTitle(jobDescription) || "[Job Title]";
      const subject = `Application for ${companyName ? companyName + " - " : ""}${title} position`;
      let body = aiService.generateDraftFromJob(jobDescription, subject);

      if (companyName) body = body.replace(/\[Company Name\]/g, companyName);
      if (hiringManager) body = body.replace(/\[Hiring Manager Name\]/g, hiringManager);

      const draft: Email = {
        id: `draft-${Date.now()}`,
        subject,
        to: recipientEmail,
        from: "you@sherwinmail.io",
        body,
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      useEmailStore.getState().addEmail(draft);
      useEmailStore.getState().setCurrentFolder("draft");
      useEmailStore.getState().setSelectedEmailId(draft.id);
      return `Created outreach draft to ${recipientEmail} about ${companyName || "the position"}. Navigate to Drafts to review and send. Use update_draft if you need to make changes.`;
    },
  },
];

export function getToolByName(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseToolCall(text: string): { toolName: string; args: Record<string, any> } | null {
  // Try JSON format: {"tool": "tool_name", "args": {...}}
  const jsonMatch = text.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\s*\}/);
  if (jsonMatch) {
    try {
      return { toolName: jsonMatch[1], args: JSON.parse(jsonMatch[2]) };
    } catch {
      return null;
    }
  }

  // Try markdown code block: ```json\n{"tool": "...", "args": {...}}\n```
  const mdMatch = text.match(/```(?:json)?\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\s*\}\s*\n?\s*```/);
  if (mdMatch) {
    try {
      return { toolName: mdMatch[1], args: JSON.parse(mdMatch[2]) };
    } catch {
      return null;
    }
  }

  return null;
}
