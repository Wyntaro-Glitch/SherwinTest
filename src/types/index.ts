export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  status: "inbox" | "draft" | "sent";
  date: string;
  isRead: boolean;
  labels?: string[];
  threadId?: string;
  parentEmailId?: string;
}

export type EmailLabel = {
  id: string;
  name: string;
  color: string;
};

export type EmailTone = "formal" | "direct" | "creative";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export type MailFolder = "home" | "inbox" | "draft" | "sent" | "chat" | "settings" | "profile" | "resume";

export type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  resumeText: string;
  experience: string;
  skills: string[];
}

export type AIProviderType = "auto" | "webgpu" | "ollama" | "lmstudio" | "api";

export interface AIProviderConfig {
  provider: AIProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  ollamaModel?: string;
  lmStudioModel?: string;
}

export type ThemeName = "dark" | "light" | "cyberpunk" | "sakura" | "forest" | "ocean";

export interface SystemTaskStatus {
  id: string;
  label: string;
  description: string;
  lastRun: string | null;
  status: "idle" | "running" | "success" | "error";
  errorMessage?: string;
}
