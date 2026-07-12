import { Email } from "@/types";
import { Rule, RuleCondition } from "@/types/rule";
import { useRuleStore } from "@/stores/ruleStore";
import { useEmailStore } from "@/stores/emailStore";

function matchCondition(fieldValue: string, cond: RuleCondition): boolean {
  const v = fieldValue.toLowerCase();
  const target = cond.value.toLowerCase();

  switch (cond.operator) {
    case "contains":
      return v.includes(target);
    case "not_contains":
      return !v.includes(target);
    case "equals":
      return v === target;
    case "starts_with":
      return v.startsWith(target);
    case "ends_with":
      return v.endsWith(target);
    case "matches":
      try {
        return new RegExp(cond.value, "i").test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateRule(rule: Rule, email: Email): boolean {
  if (!rule.enabled) return false;

  const results = rule.conditions.map((cond) => {
    const fieldValue = email[cond.field] ?? "";
    return matchCondition(fieldValue, cond);
  });

  return rule.logic === "all" ? results.every(Boolean) : results.some(Boolean);
}

function executeAction(rule: Rule, email: Email): void {
  const emailStore = useEmailStore.getState();

  switch (rule.action.type) {
    case "create_draft": {
      const to = rule.action.params.to || email.from;
      const subject = rule.action.params.subject
        ? `Re: ${rule.action.params.subject}`
        : `Re: ${email.subject}`;
      const body = rule.action.params.body || `Hi,\n\nThanks for your email regarding "${email.subject}".\n\nBest regards`;
      const draft: Email = {
        id: `rule-draft-${Date.now()}`,
        subject,
        from: emailStore.emails.find((e) => e.status === "sent")?.from || "",
        to,
        body,
        status: "draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isRead: true,
      };
      emailStore.addEmail(draft);
      break;
    }
    case "mark_read":
      emailStore.updateEmail(email.id, { isRead: true });
      break;
    case "star":
      emailStore.updateEmail(email.id, { isRead: true });
      break;
    case "delete":
      emailStore.deleteEmail(email.id);
      break;
    case "move_to_folder":
      break;
    case "send_notification":
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(rule.name, { body: rule.action.params.message || `Rule matched: ${email.subject}` });
      }
      break;
  }
}

export function processEmail(email: Email): string[] {
  const triggered: string[] = [];
  const rules = useRuleStore.getState().getEnabledRules();

  for (const rule of rules) {
    if (evaluateRule(rule, email)) {
      executeAction(rule, email);
      useRuleStore.getState().updateRule(rule.id, {
        lastTriggered: new Date().toISOString(),
        triggerCount: rule.triggerCount + 1,
      });
      triggered.push(rule.name);
    }
  }

  return triggered;
}

export function evaluateAllRules(): string[] {
  const emails = useEmailStore.getState().emails.filter((e) => e.status === "inbox");
  const triggered: string[] = [];

  for (const email of emails) {
    triggered.push(...processEmail(email));
  }

  return triggered;
}
