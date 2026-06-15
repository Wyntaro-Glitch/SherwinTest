export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  status: "inbox" | "draft" | "sent";
  date: string;
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export type MailFolder = "inbox" | "draft" | "sent" | "chat" | "settings";
