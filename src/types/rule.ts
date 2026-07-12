export interface RuleCondition {
  field: "from" | "subject" | "body" | "to";
  operator: "contains" | "not_contains" | "equals" | "starts_with" | "ends_with" | "matches";
  value: string;
}

export interface RuleAction {
  type: "create_draft" | "mark_read" | "star" | "move_to_folder" | "delete" | "send_notification";
  params: Record<string, string>;
}

export interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  logic: "all" | "any";
  action: RuleAction;
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}
