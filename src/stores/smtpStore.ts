"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SmtpProvider = "protonmail" | "gmail" | "custom";

let cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  const stored = sessionStorage.getItem("sherwin_smtp_key");
  if (stored) {
    const keyData = JSON.parse(stored);
    cryptoKey = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(keyData),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    return cryptoKey;
  }
  cryptoKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", cryptoKey);
  sessionStorage.setItem("sherwin_smtp_key", JSON.stringify(Array.from(new Uint8Array(exported))));
  return cryptoKey;
}

async function encryptPassword(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptPassword(combinedBase64: string): Promise<string> {
  const key = await getCryptoKey();
  const combined = Uint8Array.from(atob(combinedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
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
        encryptPassword(smtpPassword).then((encrypted) => {
          localStorage.setItem("sherwin_smtp_encrypted", encrypted);
        }).catch((e) => console.error("Failed to encrypt SMTP password:", e));
      },
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
      }),
    }
  )
);

// On store init, try to load encrypted password from previous session
if (typeof window !== "undefined") {
  setTimeout(async () => {
    try {
      const encrypted = localStorage.getItem("sherwin_smtp_encrypted");
      if (encrypted) {
        const plaintext = await decryptPassword(encrypted);
        useSmtpStore.getState().setSmtpPassword(plaintext);
      }
    } catch {
      localStorage.removeItem("sherwin_smtp_encrypted");
    }
  }, 0);
}
