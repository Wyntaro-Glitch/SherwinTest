"use client";

import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // ? — show shortcuts (always works)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        shortcuts["?"]?.();
        return;
      }

      // Escape — close modal/detail (always works)
      if (e.key === "Escape" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        shortcuts["Escape"]?.();
        return;
      }

      // Ctrl+N — new draft (global)
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        shortcuts["Ctrl+N"]?.();
        return;
      }

      // / — focus search (only when not in an input)
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        shortcuts["/"]?.();
        return;
      }

      // R — reply (only when not in an input)
      if (e.key === "r" && !e.ctrlKey && !e.metaKey && !isInput) {
        e.preventDefault();
        shortcuts["r"]?.();
        return;
      }

      // Ctrl+Enter — send/submit (only when in an input)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && isInput) {
        e.preventDefault();
        shortcuts["Ctrl+Enter"]?.();
        return;
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        shortcuts["Ctrl+Z"]?.();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
}
