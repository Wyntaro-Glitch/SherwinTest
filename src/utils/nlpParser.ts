interface NlpResult {
  toolName: string;
  args: Record<string, any>;
}

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w{2,}/g;

function extractEmail(text: string): string | undefined {
  const m = text.match(EMAIL_RE);
  return m ? m[0] : undefined;
}

function extractSubject(text: string): string | undefined {
  const patterns = [
    /(?:about|regarding|re:|on the topic of|subject(?:\s+is)?|with subject)\s+["""]?([^""",]+)["""]?/i,
    /draft(?:\s+an?\s+email)?(?:\s+to\s+\S+)?\s+(?:about|regarding|on)\s+(.+)/i,
    /compose\s+(?:an?\s+email\s+)?(?:to\s+\S+\s+)?(?:about|regarding)\s+(.+)/i,
    /send\s+(?:an?\s+email\s+)?(?:to\s+\S+\s+)?(?:about|regarding)\s+(.+)/i,
    /with\s+subject\s+["""]?([^""",]+)["""]?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/["""]$/, "");
  }
  return undefined;
}

function extractBody(text: string): string | undefined {
  const patterns = [
    /(?:saying|body|content|message|text)\s*[:=]\s*["""]([^""]+)["""]?/i,
    /(?:saying|body|content|message)\s+["""]?([^"""]+)["""]?$/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/["""]$/, "");
  }
  return undefined;
}

function extractQuery(text: string): string | undefined {
  const patterns = [
    /(?:for|about|search(?:ing)?\s+(?:for)?)\s+["""]?([^"""]+)["""]?/i,
    /(?:query|find)\s+["""]?([^"""]+)["""]?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/["""]$/, "");
  }
  return undefined;
}

function extractFolder(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(sent|outbox|outbox)\b/.test(lower)) return "sent";
  if (/\b(draft|drafts|compose|composing)\b/.test(lower)) return "drafts";
  if (/\b(trash|deleted|bin)\b/.test(lower)) return "trash";
  if (/\b(settings|config|configure|preferences)\b/.test(lower)) return "settings";
  return "inbox";
}

export function parseNlpCommand(text: string): NlpResult | null {
  const lower = text.toLowerCase().trim();

  // --- navigate ---
  if (/^(go\s+to|open|show|display|navigate?\s+to)\s+(inbox|sent|drafts?|trash|settings)/i.test(lower) ||
      /^(inbox|sent|drafts?|trash|settings)$/i.test(lower)) {
    return { toolName: "navigate", args: { folder: extractFolder(text) } };
  }

  // --- update_draft (check before create_draft) ---
  if (/\b(update|edit|modify|change|revise)\b.*\b(draft|email|mail|message)\b/i.test(lower)) {
    const query = extractQuery(text) || text;
    const body = extractBody(text);
    const args: Record<string, any> = { query };
    if (body) args.body = body;
    return { toolName: "update_draft", args };
  }

  // --- mark_read / mark_unread (check before create_draft) ---
  if (/\bmark\b.*\b(as\s+)?(?:read|unread)\b/i.test(lower)) {
    const isUnread = /\bunread\b/.test(lower);
    const query = extractQuery(text) || text;
    return { toolName: isUnread ? "mark_unread" : "mark_read", args: { query } };
  }

  // --- create_draft ---
  if (/\b(draft|compose|write|create)\b.*\b(email|mail|message)\b/i.test(lower) ||
      /\b(draft|compose|write)\b/i.test(lower)) {
    const to = extractEmail(text);
    const subject = extractSubject(text);
    const body = extractBody(text);
    const args: Record<string, any> = {};
    if (to) args.to = to;
    if (subject) args.subject = subject;
    if (body) args.body = body;
    return { toolName: "create_draft", args };
  }

  // --- search_emails ---
  if (/\b(search|find|look\s+up|query|grep)\b.*\b(email|mail|message|inbox)\b/i.test(lower) ||
      /\b(search|find)\b/i.test(lower)) {
    const query = extractQuery(text);
    return { toolName: "search_emails", args: { query: query || text } };
  }

  // --- send_email ---
  if (/\b(send|deliver|dispatch|fire\s+off)\b.*\b(email|mail|message)\b/i.test(lower)) {
    const query = extractEmail(text) || extractQuery(text) || text;
    return { toolName: "send_email", args: { query } };
  }

  // --- delete_email ---
  if (/\b(delete|remove|trash|bin|discard)\b.*\b(email|mail|message|draft)\b/i.test(lower)) {
    const query = extractQuery(text) || text;
    return { toolName: "delete_email", args: { query } };
  }

  // --- star / unstar ---
  if (/\b(star|unstar|flag|unflag|pin|unpin)\b/i.test(lower)) {
    const isUnstar = /\b(unstar|unflag|unpin)\b/.test(lower);
    const query = extractQuery(text) || text;
    return { toolName: isUnstar ? "unstar_email" : "star_email", args: { query } };
  }

  // --- reply ---
  if (/\b(reply|respond|answer)\b.*\b(to|email|mail|message)\b/i.test(lower)) {
    const query = extractQuery(text) || text;
    const body = extractBody(text);
    const args: Record<string, any> = { query };
    if (body) args.body = body;
    return { toolName: "reply_email", args };
  }

  // --- schedule ---
  if (/\b(schedule|send\s+later|remind|timer|delay)\b/i.test(lower)) {
    const when = text.match(/\b(?:at|on|for|in)\s+(.+?)(?:\s*$)/i);
    return { toolName: "schedule_send", args: { query: text, time: when ? when[1].trim() : "later" } };
  }

  // --- view / show single email ---
  if (/\b(view|open|read|show|display)\b.*\b(email|mail|message)\b/i.test(lower)) {
    const query = extractQuery(text) || text;
    return { toolName: "view_email", args: { query } };
  }

  return null;
}
