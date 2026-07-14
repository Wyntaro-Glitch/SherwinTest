import { Email, MailFolder, ThemeName } from "@/types";
import { useEmailStore } from "@/stores/emailStore";
import { useSmtpStore } from "@/stores/smtpStore";
import { useRuleStore } from "@/stores/ruleStore";
import { aiService } from "@/utils/aiService";
import { parseNlpCommand } from "./nlpParser";
import { evaluateAllRules } from "./ruleEngine";
import { Rule, RuleCondition } from "@/types/rule";

export interface ToolContext {
  getEmails: () => Email[];
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setCurrentFolder: (folder: MailFolder) => void;
  setSelectedEmailId: (id: string | null) => void;
  getSmtp: () => { smtpServer: string; smtpPort: string; smtpUser: string; smtpPassword: string; emailAddress: string; provider: string };
  getRules: () => Rule[];
  addRule: (rule: Rule) => void;
}

export function createDefaultToolContext(): ToolContext {
  return {
    getEmails: () => useEmailStore.getState().emails,
    addEmail: (email) => useEmailStore.getState().addEmail(email),
    updateEmail: (id, updates) => useEmailStore.getState().updateEmail(id, updates),
    deleteEmail: (id) => useEmailStore.getState().deleteEmail(id),
    setCurrentFolder: (folder) => useEmailStore.getState().setCurrentFolder(folder),
    setSelectedEmailId: (id) => useEmailStore.getState().setSelectedEmailId(id),
    getSmtp: () => {
      const s = useSmtpStore.getState();
      return { smtpServer: s.smtpServer, smtpPort: s.smtpPort, smtpUser: s.smtpUser, smtpPassword: s.smtpPassword, emailAddress: s.emailAddress, provider: s.provider };
    },
    getRules: () => useRuleStore.getState().rules,
    addRule: (rule) => useRuleStore.getState().addRule(rule),
  };
}

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
  execute: (args: Record<string, string>, ctx: ToolContext) => Promise<string>;
}

function extractJobTitle(text: string): string | null {
  const match = text.match(/(?:job title|role|position|looking for a|seeking a)\s*:\s*([^\n,.]+)/i);
  return match ? match[1].trim() : null;
}

export const TOOLS: Tool[] = [
  {
    name: "create_draft",
    description: "Create a new email draft in the drafts folder",
    parameters: [
      { name: "to", type: "string", description: "Recipient email address", required: true },
      { name: "subject", type: "string", description: "Email subject line", required: true },
      { name: "body", type: "string", description: "Email body content", required: true },
    ],
    execute: async ({ to, subject, body }, ctx) => {
      const draft: Email = {
        id: `draft-${Date.now()}`,
        subject, to, body,
        from: "you@sherwinmail.io",
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      ctx.addEmail(draft);
      ctx.setCurrentFolder("draft");
      ctx.setSelectedEmailId(draft.id);
      return `Created draft to ${to} with subject "${subject}". Navigated to Drafts folder.`;
    },
  },
  {
    name: "reply_to_email",
    description: "Create a reply to an existing email. Finds the email by searching subject or sender.",
    parameters: [
      { name: "emailQuery", type: "string", description: "Search term to find the email (sender name, subject keyword, or partial match)", required: true },
      { name: "body", type: "string", description: "Reply body content", required: true },
    ],
    execute: async ({ emailQuery, body }, ctx) => {
      const emails = ctx.getEmails();
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
      ctx.addEmail(reply);
      ctx.setCurrentFolder("draft");
      ctx.setSelectedEmailId(reply.id);
      return `Created reply to ${original.from} about "${original.subject}". Navigated to Drafts folder.`;
    },
  },
  {
    name: "send_email",
    description: "Send a draft email by finding it via subject keyword or recipient",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the draft (subject keyword or recipient)", required: true },
    ],
    execute: async ({ query }, ctx) => {
      const emails = ctx.getEmails();
      const smtp = ctx.getSmtp();
      const q = query.toLowerCase();
      const draft = emails.find(e => e.status === "draft" && (
        e.subject.toLowerCase().includes(q) ||
        e.to.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      ));
      if (!draft) return `Error: no draft found matching "${query}".`;

      const sentDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      ctx.updateEmail(draft.id, { status: "sent", date: sentDate });

      if (smtp.smtpServer && smtp.emailAddress) {
        try {
          const res = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: smtp.smtpServer,
              port: smtp.smtpPort,
              user: smtp.smtpUser || smtp.emailAddress,
              pass: smtp.smtpPassword,
              from: smtp.emailAddress,
              to: draft.to,
              subject: draft.subject,
              text: draft.body,
            }),
          });
          const data = await res.json();
          if (data.ok) {
            return `Sent email to ${draft.to} with subject "${draft.subject}" via SMTP.`;
          }
          return `Draft marked as sent, but SMTP delivery failed: ${data.error}. The email was not actually delivered.`;
        } catch {
          return `Draft marked as sent, but SMTP server unreachable. The email was not actually delivered.`;
        }
      }

      return `Draft marked as sent (no SMTP configured — email was not actually delivered). Configure SMTP in Settings to send real emails.`;
    },
  },
  {
    name: "navigate_to",
    description: "Navigate to a different folder or view in the application",
    parameters: [
      { name: "folder", type: "string", description: "Target: inbox, draft, sent, chat, resume, settings, ai-models, home", required: true },
    ],
    execute: async ({ folder }, ctx) => {
      const validFolders: MailFolder[] = ["inbox", "draft", "sent", "chat", "resume", "settings", "ai-models", "home"];
      const f = folder.toLowerCase() as MailFolder;
      if (!validFolders.includes(f)) return `Error: invalid folder "${folder}". Valid: ${validFolders.join(", ")}`;
      ctx.setCurrentFolder(f);
      return `Navigated to ${f}.`;
    },
  },
  {
    name: "search_emails",
    description: "Search across all emails by keyword and return results",
    parameters: [
      { name: "query", type: "string", description: "Search keyword or phrase", required: true },
    ],
    execute: async ({ query }, ctx) => {
      const emails = ctx.getEmails();
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
    description: "Get the current application state summary",
    parameters: [],
    execute: async (_, ctx) => {
      const emails = ctx.getEmails();
      const smtp = ctx.getSmtp();
      const inboxUnread = emails.filter(e => e.status === "inbox" && !e.isRead).length;
      const draftCount = emails.filter(e => e.status === "draft").length;
      const sentCount = emails.filter(e => e.status === "sent").length;
      return [
        `Inbox: ${emails.filter(e => e.status === "inbox").length} (${inboxUnread} unread)`,
        `Drafts: ${draftCount}`,
        `Sent: ${sentCount}`,
        `Total emails: ${emails.length}`,
        `SMTP configured: ${smtp.emailAddress ? "yes (" + smtp.provider + ")" : "no"}`,
      ].join("\n");
    },
  },
  {
    name: "delete_email",
    description: "Delete an email or draft by searching for it",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the email to delete (subject, sender, or keyword)", required: true },
    ],
    execute: async ({ query }, ctx) => {
      const emails = ctx.getEmails();
      const q = query.toLowerCase();
      const target = emails.find(e =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      );
      if (!target) return `Error: no email found matching "${query}".`;
      ctx.deleteEmail(target.id);
      return `Deleted email "${target.subject || "(no subject)"}" from ${target.from}.`;
    },
  },
  {
    name: "update_draft",
    description: "Update fields of an existing draft found by search",
    parameters: [
      { name: "query", type: "string", description: "Search term to find the draft (subject or recipient)", required: true },
      { name: "to", type: "string", description: "New recipient email (optional)" },
      { name: "subject", type: "string", description: "New subject line (optional)" },
      { name: "body", type: "string", description: "New body content (optional)" },
    ],
    execute: async ({ query, ...fields }, ctx) => {
      const emails = ctx.getEmails();
      const q = query.toLowerCase();
      const draft = emails.find(e => e.status === "draft" && (
        e.subject.toLowerCase().includes(q) || e.to.toLowerCase().includes(q)
      ));
      if (!draft) return `Error: no draft found matching "${query}".`;
      const updates: Partial<Email> = {};
      if (fields.to) updates.to = fields.to;
      if (fields.subject) updates.subject = fields.subject;
      if (fields.body) updates.body = fields.body;
      ctx.updateEmail(draft.id, updates);
      const changed = Object.keys(updates).join(", ");
      return `Updated draft "${draft.subject}": ${changed} changed.`;
    },
  },
  {
    name: "change_setting",
    description: "Change an application setting",
    parameters: [
      { name: "setting", type: "string", description: "Setting name: theme (dark/light/cyberpunk/sakura/forest/ocean)", required: true },
      { name: "value", type: "string", description: "New value for the setting", required: true },
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
    description: "Parse a job description and create a complete outreach draft in one step",
    parameters: [
      { name: "jobDescription", type: "string", description: "The full job description text", required: true },
      { name: "recipientEmail", type: "string", description: "Recipient email address", required: true },
      { name: "companyName", type: "string", description: "Company name (optional)" },
      { name: "hiringManager", type: "string", description: "Hiring manager name (optional)" },
    ],
    execute: async ({ jobDescription, recipientEmail, companyName, hiringManager }, ctx) => {
      const title = extractJobTitle(jobDescription) || "[Job Title]";
      const subject = `Application for ${companyName ? companyName + " - " : ""}${title} position`;
      let body = aiService.generateDraftFromJob(jobDescription);

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
      ctx.addEmail(draft);
      ctx.setCurrentFolder("draft");
      ctx.setSelectedEmailId(draft.id);
      return `Created outreach draft to ${recipientEmail} about ${companyName || "the position"}. Navigate to Drafts to review and send. Use update_draft if you need to make changes.`;
    },
  },
  {
    name: "create_rule",
    description: "Create an automation rule that triggers actions when emails match conditions",
    parameters: [
      { name: "name", type: "string", description: "A short human-readable name for the rule", required: true },
      { name: "field", type: "string", description: "Field to match: from, subject, body, to", required: true },
      { name: "operator", type: "string", description: "Match type: contains, not_contains, equals, starts_with, ends_with, matches (regex)", required: true },
      { name: "value", type: "string", description: "Value to match against", required: true },
      { name: "actionType", type: "string", description: "Action: create_draft, mark_read, star, delete, send_notification", required: true },
      { name: "actionParams", type: "string", description: "JSON string of action params, e.g. {\"to\":\"someone@email.com\",\"subject\":\"Auto reply\"}" },
    ],
    execute: async ({ name, field, operator, value, actionType, actionParams }, ctx) => {
      const validFields = ["from", "subject", "body", "to"];
      const validOps = ["contains", "not_contains", "equals", "starts_with", "ends_with", "matches"];
      const validActions = ["create_draft", "mark_read", "star", "delete", "send_notification"];

      if (!validFields.includes(field)) return `Error: invalid field "${field}". Use: ${validFields.join(", ")}`;
      if (!validOps.includes(operator)) return `Error: invalid operator "${operator}". Use: ${validOps.join(", ")}`;
      if (!validActions.includes(actionType)) return `Error: invalid action "${actionType}". Use: ${validActions.join(", ")}`;

      let params: Record<string, string> = {};
      if (actionParams) {
        try { params = JSON.parse(actionParams); } catch { return `Error: actionParams must be valid JSON.`; }
      }

      const condition: RuleCondition = { field: field as RuleCondition["field"], operator: operator as RuleCondition["operator"], value };
      const rule: Rule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        conditions: [condition],
        logic: "all",
        action: { type: actionType as Rule["action"]["type"], params },
        enabled: true,
        createdAt: new Date().toISOString(),
        triggerCount: 0,
      };

      ctx.addRule(rule);
      return `Rule "${name}" created: when [${field} ${operator} "${value}"] → [${actionType}]. It's now active and will trigger on matching incoming emails.`;
    },
  },
  {
    name: "list_rules",
    description: "List all automation rules and their status",
    parameters: [],
    execute: async (_, ctx) => {
      const rules = ctx.getRules();
      if (rules.length === 0) return "No rules configured. Use create_rule to set up automation.";
      return rules.map((r) =>
        `${r.enabled ? "✓" : "✗"} "${r.name}" — if [${r.conditions[0].field} ${r.conditions[0].operator} "${r.conditions[0].value}"] → [${r.action.type}] (triggered ${r.triggerCount}x)`
      ).join("\n");
    },
  },
  {
    name: "run_rules",
    description: "Manually run all enabled rules against current inbox emails",
    parameters: [],
    execute: async () => {
      const triggered = evaluateAllRules();
      if (triggered.length === 0) return "No rules were triggered. No matching emails found.";
      return `Rules triggered: ${triggered.join(", ")}. Check your inbox/drafts for results.`;
    },
  },
];

export function getToolByName(name: string): Tool | undefined {
  return TOOLS.find((t) => t.name === name);
}

export function parseToolCall(text: string): { toolName: string; args: Record<string, unknown> } | null {
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

  // NLP regex fallback for natural language commands
  return parseNlpCommand(text);
}
