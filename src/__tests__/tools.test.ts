import { describe, it, expect } from "vitest";
import { parseToolCall } from "@/utils/tools";

describe("parseToolCall", () => {
  it("parses valid JSON tool call", () => {
    const r = parseToolCall('{"tool": "navigate", "args": {"folder": "inbox"}}');
    expect(r).toEqual({ toolName: "navigate", args: { folder: "inbox" } });
  });

  it("parses markdown-wrapped JSON", () => {
    const input = '```json\n{"tool": "create_draft", "args": {"to": "a@b.com"}}\n```';
    const r = parseToolCall(input);
    expect(r).toEqual({ toolName: "create_draft", args: { to: "a@b.com" } });
  });

  it("parses JSON with extra text around it", () => {
    const r = parseToolCall('Here is the tool call: {"tool": "send_email", "args": {"query": "test"}} done.');
    expect(r).toEqual({ toolName: "send_email", args: { query: "test" } });
  });

  it("returns null for plain text with no tool call or command", () => {
    const r = parseToolCall("The weather is nice today.");
    expect(r).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const r = parseToolCall('{"tool": "navigate", "args": {broken}}');
    expect(r).toBeNull();
  });

  it("falls back to NLP parser for natural language", () => {
    const r = parseToolCall("go to sent");
    expect(r).toEqual({ toolName: "navigate", args: { folder: "sent" } });
  });

  it("falls back to NLP for draft commands", () => {
    const r = parseToolCall("draft an email to alice@example.com about the meeting");
    expect(r?.toolName).toBe("create_draft");
  });
});
