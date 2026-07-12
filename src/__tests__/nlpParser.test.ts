import { describe, it, expect } from "vitest";
import { parseNlpCommand } from "@/utils/nlpParser";

describe("parseNlpCommand", () => {
  describe("navigate", () => {
    it("parses 'go to sent'", () => {
      const r = parseNlpCommand("go to sent");
      expect(r).toEqual({ toolName: "navigate", args: { folder: "sent" } });
    });

    it("parses 'inbox'", () => {
      const r = parseNlpCommand("inbox");
      expect(r).toEqual({ toolName: "navigate", args: { folder: "inbox" } });
    });

    it("parses 'show settings'", () => {
      const r = parseNlpCommand("show settings");
      expect(r).toEqual({ toolName: "navigate", args: { folder: "settings" } });
    });

    it("parses 'open drafts'", () => {
      const r = parseNlpCommand("open drafts");
      expect(r).toEqual({ toolName: "navigate", args: { folder: "drafts" } });
    });
  });

  describe("create_draft", () => {
    it("parses email + subject", () => {
      const r = parseNlpCommand("draft an email to alice@example.com about the meeting");
      expect(r).toEqual({
        toolName: "create_draft",
        args: { to: "alice@example.com", subject: "the meeting" },
      });
    });

    it("parses compose", () => {
      const r = parseNlpCommand("compose email to bob@test.com regarding project update");
      expect(r?.toolName).toBe("create_draft");
      expect(r?.args.to).toBe("bob@test.com");
    });

    it("parses body", () => {
      const r = parseNlpCommand('draft email to x@y.com saying "hello there"');
      expect(r?.args.body).toBe("hello there");
    });
  });

  describe("search_emails", () => {
    it("parses search query", () => {
      const r = parseNlpCommand("search emails for invoice");
      expect(r).toEqual({ toolName: "search_emails", args: { query: "invoice" } });
    });

    it("parses find", () => {
      const r = parseNlpCommand("find emails about project");
      expect(r?.toolName).toBe("search_emails");
    });
  });

  describe("send_email", () => {
    it("parses send", () => {
      const r = parseNlpCommand("send the email to alice@example.com");
      expect(r?.toolName).toBe("send_email");
    });
  });

  describe("update_draft", () => {
    it("parses update", () => {
      const r = parseNlpCommand("update draft about project");
      expect(r?.toolName).toBe("update_draft");
    });
  });

  describe("delete_email", () => {
    it("parses delete", () => {
      const r = parseNlpCommand("delete email about spam");
      expect(r?.toolName).toBe("delete_email");
    });
  });

  describe("mark_read/unread", () => {
    it("parses mark as read", () => {
      const r = parseNlpCommand("mark email as read");
      expect(r?.toolName).toBe("mark_read");
    });

    it("parses mark as unread", () => {
      const r = parseNlpCommand("mark email as unread");
      expect(r?.toolName).toBe("mark_unread");
    });
  });

  describe("star/unstar", () => {
    it("parses star", () => {
      const r = parseNlpCommand("star email about invoice");
      expect(r?.toolName).toBe("star_email");
    });

    it("parses unstar", () => {
      const r = parseNlpCommand("unstar the email");
      expect(r?.toolName).toBe("unstar_email");
    });
  });

  describe("reply_email", () => {
    it("parses reply", () => {
      const r = parseNlpCommand("reply to the last email");
      expect(r?.toolName).toBe("reply_email");
    });
  });

  describe("returns null for unknown", () => {
    it("returns null for gibberish", () => {
      const r = parseNlpCommand("asdfghjkl");
      expect(r).toBeNull();
    });

    it("returns null for greeting", () => {
      const r = parseNlpCommand("hello how are you");
      expect(r).toBeNull();
    });
  });
});
