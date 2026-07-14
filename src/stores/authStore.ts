"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  name: string;
  email: string;
  passwordHash: string;
  verified: boolean;
  createdAt: number;
}

interface AuthState {
  users: AuthUser[];
  currentUser: Omit<AuthUser, "passwordHash"> | null;
  pendingVerification: { email: string; code: string } | null;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  verify: (email: string, code: string) => { ok: boolean; error?: string };
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "sherwinmail_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      pendingVerification: null,

      register: async (name, email, password) => {
        const { users } = get();
        const normalizedEmail = email.toLowerCase().trim();

        if (users.find((u) => u.email === normalizedEmail)) {
          return { ok: false, error: "An account with this email already exists." };
        }

        const passwordHash = await hashPassword(password);
        const code = generateCode();

        const newUser: AuthUser = {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          verified: false,
          createdAt: Date.now(),
        };

        set({
          users: [...users, newUser],
          pendingVerification: { email: normalizedEmail, code },
        });

        return { ok: true, code };
      },

      verify: (email, code) => {
        const { users, pendingVerification } = get();
        const normalizedEmail = email.toLowerCase().trim();

        if (!pendingVerification || pendingVerification.email !== normalizedEmail) {
          return { ok: false, error: "No pending verification found." };
        }

        if (pendingVerification.code !== code) {
          return { ok: false, error: "Invalid verification code." };
        }

        const updatedUsers = users.map((u) =>
          u.email === normalizedEmail ? { ...u, verified: true } : u
        );

        const verifiedUser = updatedUsers.find((u) => u.email === normalizedEmail);

        set({
          users: updatedUsers,
          pendingVerification: null,
          currentUser: verifiedUser
            ? { name: verifiedUser.name, email: verifiedUser.email, verified: true, createdAt: verifiedUser.createdAt }
            : null,
        });

        return { ok: true };
      },

      login: async (email, password) => {
        const { users } = get();
        const normalizedEmail = email.toLowerCase().trim();
        const user = users.find((u) => u.email === normalizedEmail);

        if (!user) {
          return { ok: false, error: "No account found with this email." };
        }

        if (!user.verified) {
          const code = generateCode();
          set({ pendingVerification: { email: normalizedEmail, code } });
          return { ok: false, error: "Account not verified. A new verification code has been generated." };
        }

        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
          return { ok: false, error: "Incorrect password." };
        }

        set({
          currentUser: { name: user.name, email: user.email, verified: true, createdAt: user.createdAt },
        });

        return { ok: true };
      },

      logout: () => {
        set({ currentUser: null });
      },
    }),
    {
      name: "sherwinmail_auth",
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
      }),
    }
  )
);
