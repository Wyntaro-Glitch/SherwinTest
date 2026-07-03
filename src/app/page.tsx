"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { detectWebGPUSupport } from "@/utils/webgpu";
import { useEmailStore } from "@/stores/emailStore";
import { useSmtpStore } from "@/stores/smtpStore";
import { useToastStore } from "@/stores/toastStore";
import { useUserMemoryStore } from "@/stores/userMemoryStore";
import { PRESET_TIERS, getModelsByTier, getDefaultModelForTier } from "@/utils/aiService";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import MailSidebar from "@/components/MailSidebar";
import MailList from "@/components/MailList";
import MailDetail from "@/components/MailDetail";
import PrivacyBanner from "@/components/PrivacyBanner";
import ThemeProvider from "@/components/ThemeProvider";
import ProviderSettings from "@/components/ProviderSettings";
import AppearanceSettings from "@/components/AppearanceSettings";
import ProviderSetupModal from "@/components/ProviderSetupModal";
import ErrorModal from "@/components/ErrorModal";
import ThemeBackground from "@/components/ThemeBackground";
import Toast from "@/components/Toast";

// Lazy-loaded conditionally rendered views
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), { ssr: false });
const ResumeScanner = dynamic(() => import("@/components/ResumeScanner"), { ssr: false });
const PrivacyDashboard = dynamic(() => import("@/components/PrivacyDashboard"), { ssr: false });
const SystemTaskScheduler = dynamic(() => import("@/components/SystemTaskScheduler"), { ssr: false });
const ErrorMonitor = dynamic(() => import("@/components/ErrorMonitor"), { ssr: false });

export default function Home() {
  const {
    emails,
    currentFolder,
    selectedEmailId,
    undoDescription,
    setCurrentFolder,
    setSelectedEmailId,
    selectEmail,
    composeDraft,
    updateEmail,
    deleteEmail,
    replyToEmail,
    undoEmailAction,
    clearUndo,
  } = useEmailStore();

  const smtp = useSmtpStore();

  const [showProviderSetup, setShowProviderSetup] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("sherwin_ai_provider");
    }
    return false;
  });
  const [errorModal, setErrorModal] = useState<{ title: string; description: string; details?: string } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const runDiagnostics = useCallback(async () => {
    try {
      await detectWebGPUSupport();
    } catch {
      // diagnostics are informational only
    }
  }, []);

  useEffect(() => {
    if (currentFolder === "settings") {
      runDiagnostics();
    }
  }, [currentFolder, runDiagnostics]);

  // Auto-clear undo toast after 5s
  useEffect(() => {
    if (undoDescription) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => clearUndo(), 5000);
    }
    return () => { if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current); };
  }, [undoDescription]);

  const handleDashboardNavigate = (view: "inbox" | "chat" | "settings") => {
    setCurrentFolder(view);
    if (view !== "inbox") setSelectedEmailId(null);
  };

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  const handleSendSelected = () => {
    if (selectedEmail && selectedEmail.status === "draft") {
      updateEmail(selectedEmail.id, {
        status: "sent",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      });
      useToastStore.getState().addToast({ message: "Email sent!", variant: "success" });
    }
  };

  useKeyboardShortcuts({
    "Ctrl+N": composeDraft,
    Escape: () => setSelectedEmailId(null),
    "/": () => {
      const input = document.querySelector<HTMLInputElement>("input[type='text'], input[type='search']");
      input?.focus();
    },
    "r": () => {
      const email = emails.find((e) => e.id === selectedEmailId);
      if (email && email.status === "inbox") replyToEmail(email);
    },
    "Ctrl+Enter": handleSendSelected,
    "Ctrl+Z": undoEmailAction,
    "?": () => setShowShortcuts((p) => !p),
  });

  return (
    <ThemeProvider>
      <ThemeBackground />
      <ProviderSetupModal
        open={showProviderSetup}
        onComplete={(cfg) => {
          setShowProviderSetup(false);
          localStorage.setItem("sherwin_ai_provider", JSON.stringify(cfg));
        }}
        onSkip={() => setShowProviderSetup(false)}
      />

      <ErrorModal
        open={errorModal !== null}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title || ""}
        description={errorModal?.description || ""}
        details={errorModal?.details}
        actions={[
          { label: "Try Again", onClick: () => setErrorModal(null), variant: "primary" },
        ]}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-4">Keyboard Shortcuts</h3>
            <div className="flex flex-col gap-2">
              {[
                ["Ctrl+N", "New draft"],
                ["Ctrl+Enter", "Send email"],
                ["Ctrl+Z", "Undo last action"],
                ["R", "Reply to selected email"],
                ["Escape", "Close detail panel"],
                ["/?", "Focus search / Show help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{desc}</span>
                  <kbd className="font-mono text-[10px] bg-slate-950 border border-slate-700 rounded-md px-2 py-0.5 text-indigo-400">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {undoDescription && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
          <span className="text-xs text-slate-300">{undoDescription}</span>
          <button
            onClick={() => { undoEmailAction(); clearUndo(); }}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}

      <Toast />

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden h-screen selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shrink-0 select-none">
        <button
          onClick={() => { setCurrentFolder("home"); setSelectedEmailId(null); }}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-white text-base tracking-wider">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              SherwinMail
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">
              Privacy AI Email Orchestrator
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] font-mono text-amber-400 border border-amber-900/50 rounded-full px-3 py-0.5 bg-amber-950/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Offline
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-500 border border-slate-900 rounded-full px-3 py-0.5 bg-slate-900/50">
            Local Workspace Active
          </span>
        </div>
      </header>

      <PrivacyBanner />

      <div className="flex-1 flex overflow-hidden">
        <MailSidebar
          currentFolder={currentFolder}
          setCurrentFolder={(f) => {
            setCurrentFolder(f);
            setSelectedEmailId(null);
          }}
          emails={emails}
          onCompose={composeDraft}
          onMoveEmail={(id, folder) => updateEmail(id, { status: folder })}
        />

        {currentFolder === "home" ? (
          <ErrorBoundary label="Dashboard">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
              <PrivacyDashboard onNavigate={handleDashboardNavigate} />
            </Suspense>
          </ErrorBoundary>
        ) : currentFolder === "resume" ? (
          <ErrorBoundary label="Resume Scanner">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
              <ResumeScanner />
            </Suspense>
          </ErrorBoundary>
        ) : currentFolder === "chat" ? (
          <ErrorBoundary label="Chat Panel">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
              <ChatPanel />
            </Suspense>
          </ErrorBoundary>
        ) : currentFolder === "settings" ? (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col gap-8">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-8">
              <ErrorBoundary label="Provider Settings">
                <ProviderSettings />
              </ErrorBoundary>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Mail Provider Integration</h3>
                  <p className="text-xs text-slate-500">Connect your email accounts for sending.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Account Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["protonmail", "gmail", "custom"] as const).map((p) => (
                        <button key={p} onClick={() => smtp.setProvider(p)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${smtp.provider === p ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold" : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200"}`}>
                          {p === "protonmail" ? "ProtonMail Bridge" : p === "gmail" ? "Gmail" : "Custom SMTP"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Email Address</label>
                    <input type="email" placeholder="user@protonmail.com" value={smtp.emailAddress} onChange={(e) => smtp.setEmailAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">SMTP Server</label>
                      <input type="text" placeholder="127.0.0.1" value={smtp.smtpServer} onChange={(e) => smtp.setSmtpServer(e.target.value)} disabled={smtp.provider !== "custom"} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">SMTP Port</label>
                      <input type="text" placeholder="1025" value={smtp.smtpPort} onChange={(e) => smtp.setSmtpPort(e.target.value)} disabled={smtp.provider !== "custom"} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors disabled:opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Username</label>
                      <input type="text" placeholder="Default is email" value={smtp.smtpUser} onChange={(e) => smtp.setSmtpUser(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Password</label>
                      <input type="password" placeholder="••••••••••••" value={smtp.smtpPassword} onChange={(e) => smtp.setSmtpPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={() => smtp.saveAndTest()} disabled={smtp.isTestingConnection} className="w-full py-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-xs tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                      {smtp.isTestingConnection ? (
                        <><div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div> Testing Mail Server...</>
                      ) : "Save & Test Connection"}
                    </button>
                  </div>
                  {smtp.testResult !== "none" && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${smtp.testResult === "success" ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" : "bg-rose-950/20 border-rose-900/50 text-rose-400"}`}>
                      <div className="flex items-center gap-2">
                        {smtp.testResult === "success" ? (
                          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span className="font-semibold">{smtp.testMessage}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <AppearanceSettings />
              <Suspense fallback={null}><ErrorMonitor /></Suspense>
              <Suspense fallback={null}><SystemTaskScheduler /></Suspense>

              {/* Model Recommendations */}
              <DynamicModelRecommendations />

              {/* User Memory Management */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">AI Memory</h3>
                    <p className="text-xs text-slate-500">Information the AI knows about you. This helps personalize responses.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const name = prompt("What would you like the AI to know about you? (e.g., name, role, interests)");
                          if (name) {
                            const [key, ...rest] = name.split(":");
                            useUserMemoryStore.getState().setMemory(
                              key.trim().toLowerCase().replace(/\s+/g, "_"),
                              rest.join(":").trim() || name.trim(),
                              "personal"
                            );
                          }
                        }
                      }}
                      className="py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Add Memory
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete all AI memories? This cannot be undone.")) {
                          useUserMemoryStore.getState().clearAllMemories();
                        }
                      }}
                      className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <UserMemoryList />
              </div>

              {/* Reset Settings */}
              <div className="bg-slate-900/60 border border-rose-900/30 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Danger Zone</h3>
                  <p className="text-xs text-slate-500">Destructive actions that reset your data.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      if (confirm("Reset all settings to defaults? Your emails will be preserved.")) {
                        localStorage.removeItem("sherwin_ai_provider");
                        localStorage.removeItem("sherwin_smtp");
                        localStorage.removeItem("sherwin_smtp_encrypted");
                        localStorage.removeItem("sherwin_smtp_key");
                        localStorage.removeItem("sherwin_user_memory");
                        localStorage.removeItem("sherwin_system_tasks");
                      }
                    }}
                    className="py-2 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-900/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Settings
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete ALL data including emails? This cannot be undone.")) {
                        localStorage.clear();
                      }
                    }}
                    className="py-2 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-900/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Factory Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MailList
              folder={currentFolder}
              emails={emails}
              selectedEmailId={selectedEmailId}
              onSelectEmail={selectEmail}
            />
            <MailDetail
              email={selectedEmail}
              onUpdateEmail={(updated) => updateEmail(updated.id, updated)}
              onDeleteEmail={(id) => deleteEmail(id)}
              onReply={(replyTo) => replyToEmail(replyTo)}
            />
          </>
        )}
      </div>

      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-6 text-center text-[10px] text-slate-500 font-mono shrink-0 select-none">
        &copy; {new Date().getFullYear()} SherwinMail. Press <kbd className="text-indigo-400">?</kbd> for keyboard shortcuts.
      </footer>
    </div>
    </ThemeProvider>
  );
}

function UserMemoryList() {
  const { memories, deleteMemory } = useUserMemoryStore();

  if (memories.length === 0) {
    return <p className="text-xs text-slate-500 italic">No memories yet. Click "Add Memory" to teach the AI about yourself.</p>;
  }

  const categories = [...new Set(memories.map((m) => m.category))] as Array<"personal" | "preference" | "context" | "fact">;
  const catLabels: Record<string, string> = { personal: "Personal", preference: "Preferences", context: "Context", fact: "Facts" };

  return (
    <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
      {categories.map((cat) => (
        <div key={cat}>
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-1.5">{catLabels[cat] || cat}</p>
          <div className="flex flex-col gap-1">
            {memories
              .filter((m) => m.category === cat)
              .map((m) => (
                <div key={m.key} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-semibold">{m.key.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.value}</p>
                    <p className="text-[8px] text-slate-600 font-mono">{new Date(m.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteMemory(m.key)}
                    className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ml-2 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DynamicModelRecommendations() {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white mb-1">Model Recommendations</h3>
        <p className="text-xs text-slate-500">Choose the tier that matches your GPU VRAM. Vision models can read images &amp; PDFs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESET_TIERS.map((preset) => {
          const models = getModelsByTier(preset.tier);
          const visionModels = models.filter((m) => m.category === "vision");
          return (
            <div key={preset.tier} className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{preset.icon}</span>
                <span className="text-xs font-bold text-slate-200">{preset.label}</span>
                <span className="text-[9px] font-mono text-slate-500">{preset.minVram}+ VRAM</span>
              </div>
              <p className="text-[10px] text-slate-500">{preset.description}</p>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-[10px] font-semibold text-slate-300">Default: {getDefaultModelForTier(preset.tier).name}</p>
                <div className="flex flex-wrap gap-1">
                  {models.map((m) => (
                    <span
                      key={m.id}
                      className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                        m.category === "vision"
                          ? "border-emerald-800/50 text-emerald-400 bg-emerald-950/20"
                          : "border-slate-800 text-slate-400 bg-slate-950"
                      }`}
                    >
                      {m.name}{m.category === "vision" ? " 📷" : ""}
                    </span>
                  ))}
                </div>
              </div>
              {visionModels.length > 0 && (
                <p className="text-[9px] text-emerald-400/80 mt-1">
                  📷 Vision-capable — can read images &amp; PDFs
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
        <p className="font-semibold text-slate-400 mb-1">🔍 How this helps:</p>
        <p>Models tagged with <span className="text-emerald-400">📷</span> can analyze images, screenshots, and PDF content directly. Pick a tier matching your VRAM for best performance. Low-spec models work on integrated GPUs; high-spec delivers maximum quality.</p>
      </div>
    </div>
  );
}
