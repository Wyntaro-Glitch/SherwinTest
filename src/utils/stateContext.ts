import { useEmailStore } from "@/stores/emailStore";
import { TOOLS } from "@/utils/tools";

export function buildAppContext(): string {
  const state = useEmailStore.getState();
  const emails = state.emails.slice(0, 8); // reduced from 15

  const emailList = emails.map((e) =>
    `[${e.id}] ${e.status.toUpperCase()} | ${e.subject?.slice(0, 40) || "(no subject)"} | ${e.from}${e.isRead ? "" : " [UNREAD]"}`
  ).join("\n");

  const inboxUnread = state.emails.filter((e) => e.status === "inbox" && !e.isRead).length;

  return `## App State
View: ${state.currentFolder} | Inbox: ${state.emails.filter(e => e.status === "inbox").length} (${inboxUnread} unread) | Drafts: ${state.emails.filter(e => e.status === "draft").length} | Sent: ${state.emails.filter(e => e.status === "sent").length}

${emailList ? `Emails:\n${emailList}` : "No emails."}

## Tools
${TOOLS.map((t) =>
  `- ${t.name}: ${t.description}`
).join("\n")}

## Instructions
- To DO something → call the right tool with {"tool": "...", "args": {...}}. One at a time.
- To answer → respond normally.
- After a tool call, say what happened.`;
  const emails = state.emails.slice(0, 30);

  const emailList = emails.map((e) =>
    `[${e.id}] ${e.status.toUpperCase()} | ${e.subject || "(no subject)"} | ${e.from} → ${e.to} | ${e.date}${e.isRead ? "" : " [UNREAD]"}`
  ).join("\n");

  const inboxUnread = state.emails.filter((e) => e.status === "inbox" && !e.isRead).length;
  const draftCount = state.emails.filter((e) => e.status === "draft").length;
  const sentCount = state.emails.filter((e) => e.status === "sent").length;

  return `## Application State
Current view: ${state.currentFolder}
Inbox: ${state.emails.filter(e => e.status === "inbox").length} total, ${inboxUnread} unread
Drafts: ${draftCount}
Sent: ${sentCount}

${emailList ? `Emails:\n${emailList}` : "No emails."}

## Available Tools
You can control this application by calling tools. Respond with a JSON tool call in this exact format:
{"tool": "tool_name", "args": {"param1": "value1"}}

${TOOLS.map((t) =>
  `- ${t.name}: ${t.description}
  Parameters: ${t.parameters.map((p) => `${p.name} (${p.type})${p.required ? " *required" : ""}: ${p.description}`).join(", ")}`
).join("\n")}

## Instructions
- If the user asks you to DO something (create, send, navigate, delete, update, search), call the appropriate tool.
- If the user asks a question, answer normally without a tool call.
- Call only ONE tool at a time. Wait for the result before calling another.
- After a tool executes, summarize what happened in plain language.`;
}
