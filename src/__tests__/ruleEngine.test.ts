import { describe, it, expect, beforeEach } from "vitest";
import { useRuleStore } from "@/stores/ruleStore";
import { useEmailStore } from "@/stores/emailStore";
import { processEmail } from "@/utils/ruleEngine";
import { Rule } from "@/types/rule";

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: `rule-${Date.now()}`,
    name: "Test Rule",
    conditions: [{ field: "from", operator: "contains", value: "spam" }],
    logic: "all",
    action: { type: "mark_read", params: {} },
    enabled: true,
    createdAt: new Date().toISOString(),
    triggerCount: 0,
    ...overrides,
  };
}

describe("ruleEngine", () => {
  beforeEach(() => {
    useRuleStore.setState({ rules: [] });
    useEmailStore.setState({
      emails: [
        {
          id: "test-1",
          subject: "Meeting",
          from: "alice@example.com",
          to: "me@test.com",
          body: "Let's meet",
          status: "inbox",
          date: "Jul 10",
          isRead: false,
        },
        {
          id: "test-2",
          subject: "Spam offer",
          from: "spam@promo.com",
          to: "me@test.com",
          body: "Buy now!",
          status: "inbox",
          date: "Jul 10",
          isRead: false,
        },
      ],
    });
  });

  it("triggers when condition matches", () => {
    const rule = makeRule({
      conditions: [{ field: "from", operator: "contains", value: "spam" }],
    });
    useRuleStore.getState().addRule(rule);

    const triggered = processEmail(useEmailStore.getState().emails[1]);
    expect(triggered).toContain("Test Rule");
  });

  it("does not trigger when condition doesn't match", () => {
    const rule = makeRule({
      conditions: [{ field: "from", operator: "contains", value: "spam" }],
    });
    useRuleStore.getState().addRule(rule);

    const triggered = processEmail(useEmailStore.getState().emails[0]);
    expect(triggered).toHaveLength(0);
  });

  it("does not trigger disabled rules", () => {
    const rule = makeRule({
      enabled: false,
      conditions: [{ field: "from", operator: "contains", value: "spam" }],
    });
    useRuleStore.getState().addRule(rule);

    const triggered = processEmail(useEmailStore.getState().emails[1]);
    expect(triggered).toHaveLength(0);
  });

  it("supports multiple conditions with 'any' logic", () => {
    const rule = makeRule({
      name: "Any match",
      logic: "any",
      conditions: [
        { field: "from", operator: "contains", value: "alice" },
        { field: "subject", operator: "contains", value: "Spam" },
      ],
    });
    useRuleStore.getState().addRule(rule);

    const triggered = processEmail(useEmailStore.getState().emails[0]);
    expect(triggered).toContain("Any match");
  });

  it("supports 'matches' operator with regex", () => {
    const rule = makeRule({
      conditions: [{ field: "from", operator: "matches", value: "^spam.*\\.com$" }],
    });
    useRuleStore.getState().addRule(rule);

    const triggered = processEmail(useEmailStore.getState().emails[1]);
    expect(triggered).toContain("Test Rule");
  });

  it("increments trigger count", () => {
    const rule = makeRule();
    useRuleStore.getState().addRule(rule);

    processEmail(useEmailStore.getState().emails[1]);

    const updated = useRuleStore.getState().rules[0];
    expect(updated.triggerCount).toBe(1);
    expect(updated.lastTriggered).toBeDefined();
  });
});
