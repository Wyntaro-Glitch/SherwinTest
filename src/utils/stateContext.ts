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
}
