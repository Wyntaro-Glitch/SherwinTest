"use client";

import { useState, useEffect, useCallback } from "react";
import { SystemTaskStatus } from "@/types";

const STORAGE_KEY = "sherwin_system_tasks";

function loadTasks(): SystemTaskStatus[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) try { return JSON.parse(raw); } catch { /* fall through */ }
  return [
    { id: "housekeeping", label: "Housekeeping", description: "Clean up old drafts, compress storage, remove orphaned data", lastRun: null, status: "idle" },
    { id: "sync", label: "Sync & Backup", description: "Sync localStorage drafts to IndexedDB, verify integrity", lastRun: null, status: "idle" },
    { id: "health-check", label: "Health Check", description: "Verify AI provider connection, check GPU status, test storage", lastRun: null, status: "idle" },
    { id: "error-scan", label: "Error Scan", description: "Scan for corrupted data, broken references, missing models", lastRun: null, status: "idle" },
  ];
}

function saveTasks(tasks: SystemTaskStatus[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export default function SystemTaskScheduler() {
  const [tasks, setTasks] = useState<SystemTaskStatus[]>([]);

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const runTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, status: "running" as const } : t);
      saveTasks(next);
      return next;
    });

    // Simulate task execution
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const now = new Date().toLocaleString();
    const success = Math.random() > 0.15;

    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              lastRun: now,
              status: (success ? "success" : "error") as "success" | "error",
              errorMessage: success ? undefined : "Simulated error — check logs for details.",
            }
          : t
      );
      saveTasks(next);
      return next;
    });
  }, []);

  const runAll = useCallback(async () => {
    for (const task of tasks) {
      if (task.status !== "running") {
        await runTask(task.id);
      }
    }
  }, [tasks, runTask]);

  const getStatusIcon = (status: SystemTaskStatus["status"]) => {
    switch (status) {
      case "running": return <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />;
      case "success": return <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
      case "error": return <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>;
      default: return <div className="w-3.5 h-3.5 rounded-full bg-slate-700" />;
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">System Tasks</h3>
          <p className="text-xs text-slate-500">Scheduled maintenance and self-healing operations.</p>
        </div>
        <button
          onClick={runAll}
          disabled={tasks.some((t) => t.status === "running")}
          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Run All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
              task.status === "error"
                ? "bg-rose-950/10 border-rose-900/30"
                : "bg-slate-950/40 border-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0">{getStatusIcon(task.status)}</div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{task.label}</p>
                <p className="text-[10px] text-slate-500">{task.description}</p>
                {task.lastRun && (
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">Last: {task.lastRun}</p>
                )}
                {task.errorMessage && (
                  <p className="text-[9px] text-rose-400 mt-0.5">{task.errorMessage}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => runTask(task.id)}
              disabled={task.status === "running"}
              className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0"
            >
              {task.status === "running" ? "..." : "Run"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
