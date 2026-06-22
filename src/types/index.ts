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

export type MailFolder = "home" | "inbox" | "draft" | "sent" | "chat" | "settings" | "profile";

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  resumeText: string;
  experience: string;
  skills: string[];
}
