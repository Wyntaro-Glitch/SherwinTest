"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { encryptPassword } from "@/utils/encryption";

type SmtpProvider = "protonmail" | "gmail" | "custom";

interface SendResult {
  ok: boolean;
  error?: string;
}

interface SmtpStore {
  provider: SmtpProvider;
  emailAddress: string;
  smtpServer: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  isTestingConnection: boolean;
  testResult: "none" | "success" | "error";
  testMessage: string;
  setProvider: (provider: SmtpProvider) => void;
  setEmailAddress: (email: string) => void;
  setSmtpServer: (server: string) => void;
  setSmtpPort: (port: string) => void;
  setSmtpUser: (user: string) => void;
  setSmtpPassword: (password: string) => void;
  setIsTestingConnection: (testing: boolean) => void;
  setTestResult: (result: "none" | "success" | "error", message?: string) => void;
  saveAndTest: () => void;
  sendEmail: (to: string, subject: string, text: string) => Promise<SendResult>;
}

export const useSmtpStore = create<SmtpStore>()(
  persist(
    (set, get) => ({
      provider: "protonmail",
      emailAddress: "",
      smtpServer: "127.0.0.1",
      smtpPort: "1025",
      smtpUser: "",
      smtpPassword: "",
      isTestingConnection: false,
      testResult: "none",
      testMessage: "",

      setProvider: (provider) => {
        set(() => {
          if (provider === "protonmail") return { provider, smtpServer: "127.0.0.1", smtpPort: "1025" };
          if (provider === "gmail") return { provider, smtpServer: "smtp.gmail.com", smtpPort: "587" };
          return { provider };
        });
      },
      setEmailAddress: (emailAddress) => set({ emailAddress }),
      setSmtpServer: (smtpServer) => set({ smtpServer }),
      setSmtpPort: (smtpPort) => set({ smtpPort }),
      setSmtpUser: (smtpUser) => set({ smtpUser }),
      setSmtpPassword: (smtpPassword) => {
        set({ smtpPassword });
        encryptPassword(smtpPassword)
          .then((encrypted) => {
            localStorage.setItem("sherwin_smtp_encrypted", encrypted);
          })
          .catch((e) => console.error("Failed to encrypt SMTP password:", e));
      },
      setIsTestingConnection: (isTestingConnection) => set({ isTestingConnection }),
      setTestResult: (testResult, testMessage = "") => set({ testResult, testMessage }),

      saveAndTest: () => {
        const state = get();
        set({ isTestingConnection: true, testResult: "none", testMessage: "" });

        if (!state.emailAddress.trim() || !state.emailAddress.includes("@")) {
          set({ testResult: "error", testMessage: "Please enter a valid email address.", isTestingConnection: false });
          return;
        }

        get().sendEmail(
          state.emailAddress,
          "SherwinMail — Connection Test",
          "This is a test email from SherwinMail. If you received this, your SMTP connection is working correctly."
        ).then((result) => {
          if (result.ok) {
            set({
              testResult: "success",
              testMessage: `Successfully connected and sent test email via ${
                state.provider === "protonmail" ? "ProtonMail Bridge" : state.provider === "gmail" ? "Gmail SMTP" : "Custom Server"
              }!`,
              isTestingConnection: false,
            });
          } else {
            set({
              testResult: "error",
              testMessage: `Connection failed: ${result.error}`,
              isTestingConnection: false,
            });
          }
        });
      },

      sendEmail: async (to, subject, text) => {
        const state = get();
        try {
          const res = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: state.smtpServer,
              port: state.smtpPort,
              user: state.smtpUser || state.emailAddress,
              pass: state.smtpPassword,
              from: state.emailAddress,
              to,
              subject,
              text,
            }),
          });
          const data = await res.json();
          return data as SendResult;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : "Network error" };
        }
      },
    }),
    {
      name: "sherwin_smtp",
      partialize: (state) => ({
        provider: state.provider,
        emailAddress: state.emailAddress,
        smtpServer: state.smtpServer,
        smtpPort: state.smtpPort,
        smtpUser: state.smtpUser,
        smtpPassword: state.smtpPassword,
      }),
    }
  )
);
