"use client";

import { useTheme } from "./ThemeProvider";
import { ThemeName } from "@/types";

const THEMES: { id: ThemeName; label: string; desc: string; icon: string }[] = [
  { id: "dark", label: "OLED Dark", desc: "True black, saves battery", icon: "⬛" },
  { id: "light", label: "Light", desc: "Clean and bright", icon: "☀️" },
  { id: "cyberpunk", label: "Cyberpunk", desc: "Neon glow", icon: "⚡" },
  { id: "sakura", label: "Sakura", desc: "Cherry blossom pink", icon: "🌸" },
  { id: "forest", label: "Forest", desc: "Earthy greens", icon: "🌲" },
  { id: "ocean", label: "Ocean", desc: "Deep blues", icon: "🌊" },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div>
        <h3 className="text-base font-bold text-white mb-1">Appearance</h3>
        <p className="text-xs text-slate-500">Choose your color theme. OLED Dark uses true black for AMOLED screens.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
              theme === t.id
                ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                : "bg-slate-950/60 border-slate-900 hover:border-slate-700"
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className={`text-xs font-bold ${theme === t.id ? "text-indigo-400" : "text-slate-300"}`}>
              {t.label}
            </span>
            <span className="text-[9px] text-slate-500 text-center">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
