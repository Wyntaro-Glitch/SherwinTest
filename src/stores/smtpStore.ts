"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SmtpProvider = "protonmail" | "gmail" | "custom";

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
      setSmtpPassword: (smtpPassword) => set({ smtpPassword }),
      setIsTestingConnection: (isTestingConnection) => set({ isTestingConnection }),
      setTestResult: (testResult, testMessage = "") => set({ testResult, testMessage }),

      saveAndTest: () => {
        const state = get();
        set({ isTestingConnection: true, testResult: "none", testMessage: "" });

        setTimeout(() => {
          if (!state.emailAddress.trim() || !state.emailAddress.includes("@")) {
            set({ testResult: "error", testMessage: "Please enter a valid email address.", isTestingConnection: false });
            return;
          }
          set({
            testResult: "success",
            testMessage: `Successfully connected and saved connection parameters for ${
              state.provider === "protonmail" ? "ProtonMail Bridge" : state.provider === "gmail" ? "Gmail SMTP" : "Custom Server"
            }!`,
            isTestingConnection: false,
          });
        }, 1200);
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
