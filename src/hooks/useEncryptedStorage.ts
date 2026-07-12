"use client";

import { useState, useEffect, useCallback } from "react";
import { encryptPassword, decryptPassword } from "@/utils/encryption";

export function useEncryptedStorage(key: string) {
  const [value, setValue] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const decrypted = await decryptPassword(raw);
          if (!cancelled) setValue(decrypted);
        }
      } catch {
        // If decryption fails (e.g. key mismatch from new session), clear stale data
        localStorage.removeItem(key);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [key]);

  const set = useCallback(
    async (plaintext: string) => {
      setValue(plaintext);
      if (!plaintext) {
        localStorage.removeItem(key);
        return;
      }
      const encrypted = await encryptPassword(plaintext);
      localStorage.setItem(key, encrypted);
    },
    [key]
  );

  const remove = useCallback(() => {
    setValue("");
    localStorage.removeItem(key);
  }, [key]);

  return { value, isLoaded, set, remove };
}
