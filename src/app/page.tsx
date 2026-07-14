"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { detectWebGPUSupport } from "@/utils/webgpu";
import { exportSettings, importSettings, downloadBlob } from "@/utils/settingsExport";
import ModelRecommendations from "@/components/ModelRecommendations";
import { useEmailStore } from "@/stores/emailStore";
import { useSmtpStore } from "@/stores/smtpStore";
import { useToastStore } from "@/stores/toastStore";
import { useUserMemoryStore } from "@/stores/userMemoryStore";
import { useTutorialStore } from "@/stores/tutorialStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useUserProfileStore } from "@/stores/userProfileStore";
import { useAuthStore } from "@/stores/authStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import MailSidebar from "@/components/MailSidebar";
import PrivacyBanner from "@/components/PrivacyBanner";
import ThemeProvider from "@/components/ThemeProvider";
import ProviderSetupModal from "@/components/ProviderSetupModal";
import ErrorModal from "@/components/ErrorModal";
import ThemeBackground from "@/components/ThemeBackground";
import Toast from "@/components/Toast";
import Tutorial from "@/components/Tutorial";

// Lazy-loaded conditionally rendered views
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), { ssr: false });
const ResumeScanner = dynamic(() => import("@/components/ResumeScanner"), { ssr: false });
const PrivacyDashboard = dynamic(() => import("@/components/PrivacyDashboard"), { ssr: false });
const SystemTaskScheduler = dynamic(() => import("@/components/SystemTaskScheduler"), { ssr: false });
const ErrorMonitor = dynamic(() => import("@/components/ErrorMonitor"), { ssr: false });
const MailList = dynamic(() => import("@/components/MailList"), { ssr: false });
const MailDetail = dynamic(() => import("@/components/MailDetail"), { ssr: false });
const ProviderSettings = dynamic(() => import("@/components/ProviderSettings"), { ssr: false });
const AppearanceSettings = dynamic(() => import("@/components/AppearanceSettings"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const {
    emails,
    currentFolder,
    selectedEmailId,
    undoDescription,
    isLoaded,
    setCurrentFolder,
    setSelectedEmailId,
    selectEmail,
    composeDraft,
    updateEmail,
    deleteEmail,
    replyToEmail,
    undoEmailAction,
    clearUndo,
    loadFromDB,
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
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser, router]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    const oauthState = params.get("oauth_state");
    const oauthError = params.get("oauth_error");

    if (oauthSuccess === "google" && oauthState) {
      try {
        const parsed = JSON.parse(atob(oauthState));
        useSmtpStore.getState().connectOAuth(parsed);
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        // invalid state — ignore
      }
    }

    if (oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
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
  }, [undoDescription, clearUndo]);

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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading SherwinMail...</p>
          </div>
        </div>
      )}
      <ErrorBoundary label="ThemeBackground"><ThemeBackground /></ErrorBoundary>
      <Tutorial />
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

      <ErrorBoundary label="Toast"><Toast /></ErrorBoundary>

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
          <span className="text-[10px] font-semibold text-indigo-400">
            Welcome, {currentUser.name}
          </span>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-[10px] font-semibold text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      <ErrorBoundary label="PrivacyBanner"><PrivacyBanner /></ErrorBoundary>

      <div className="flex-1 flex overflow-hidden">
      <ErrorBoundary label="MailSidebar">
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
      </ErrorBoundary>

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
        ) : currentFolder === "ai-models" ? (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col gap-8">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-8">
              <ErrorBoundary label="AI Provider">
                <Suspense fallback={null}><ProviderSettings /></Suspense>
              </ErrorBoundary>
              <ErrorBoundary label="AI Model Recommendations">
                <Suspense fallback={null}><ModelRecommendations /></Suspense>
              </ErrorBoundary>
            </div>
          </div>
        ) : currentFolder === "settings" ? (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col gap-8">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-8">
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

                  {smtp.connectedVia === "oauth" && smtp.oauth ? (
                    <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <span className="text-sm font-semibold text-indigo-300">Connected via Google OAuth</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Account:</span> {smtp.oauth.email}
                        {smtp.oauth.name && <span className="text-slate-600"> ({smtp.oauth.name})</span>}
                      </div>
                      <button
                        onClick={() => { smtp.disconnectOAuth(); }}
                        className="self-start py-1.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <>
                      {smtp.provider === "gmail" && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/auth/google?check=1");
                              const data = await res.json();
                              if (data.configured) {
                                window.location.href = "/api/auth/google";
                              } else {
                                useToastStore.getState().addToast({
                                  message: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local — see .env.example",
                                  variant: "error",
                                });
                              }
                            } catch {
                              window.location.href = "/api/auth/google";
                            }
                          }}
                          className="flex items-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all group w-full cursor-pointer"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Sign in with Google</span>
                            <span className="text-[10px] text-slate-400">OAuth 2.0 — no password stored locally</span>
                          </div>
                        </button>
                      )}

                      {smtp.provider === "protonmail" && (
                        <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-xs font-semibold text-slate-300">ProtonMail Bridge Required</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Install ProtonMail Bridge, enable Bridge mode, and configure the IMAP/SMTP credentials below. Bridge runs locally at 127.0.0.1:1025.
                          </p>
                        </div>
                      )}

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
                    </>
                  )}

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
              <ErrorBoundary label="Appearance Settings"><Suspense fallback={null}><AppearanceSettings /></Suspense></ErrorBoundary>
              <ErrorBoundary label="User Profile"><UserProfileSection /></ErrorBoundary>
              <ErrorBoundary label="Template Library"><TemplateLibrarySection /></ErrorBoundary>
              <ErrorBoundary label="Error Monitor"><Suspense fallback={null}><ErrorMonitor /></Suspense></ErrorBoundary>
              <ErrorBoundary label="Task Scheduler"><Suspense fallback={null}><SystemTaskScheduler /></Suspense></ErrorBoundary>

              {/* Replay Tutorial */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Tutorial</h3>
                  <p className="text-xs text-slate-500">Replay the interactive onboarding walkthrough.</p>
                </div>
                <button
                  onClick={() => {
                    useTutorialStore.getState().reset();
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Replay Tutorial
                </button>
              </div>



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

              {/* Import / Export Settings */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Backup & Restore</h3>
                  <p className="text-xs text-slate-500">Export or import your settings, templates, emails, and rules.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const blob = await exportSettings();
                        downloadBlob(blob, `sherwinmail-backup-${new Date().toISOString().slice(0, 10)}.json`);
                        useToastStore.getState().addToast({ message: "Settings exported", variant: "success" });
                      } catch (e) {
                        useToastStore.getState().addToast({ message: `Export failed: ${e instanceof Error ? e.message : "Unknown error"}`, variant: "error" });
                      }
                    }}
                    className="py-2 px-4 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-900/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Export Settings
                  </button>
                  <label className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                    Import Settings
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const result = await importSettings(file);
                        useToastStore.getState().addToast({ message: result.message, variant: result.success ? "success" : "error" });
                        if (result.success) setTimeout(() => window.location.reload(), 1500);
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-600">SMTP passwords are excluded from exports for security.</p>
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
          <ErrorBoundary label="MailList">
            <Suspense fallback={<div className="w-80 bg-slate-950 border-r border-slate-900 flex items-center justify-center text-slate-500 text-xs">Loading mail...</div>}>
              <MailList
                folder={currentFolder}
                emails={emails}
                selectedEmailId={selectedEmailId}
                onSelectEmail={selectEmail}
              />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary label="MailDetail">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Loading...</div>}>
              <MailDetail
                email={selectedEmail}
                onUpdateEmail={(updated) => updateEmail(updated.id, updated)}
                onDeleteEmail={(id) => deleteEmail(id)}
                onReply={(replyTo) => replyToEmail(replyTo)}
              />
            </Suspense>
          </ErrorBoundary>
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
    return <p className="text-xs text-slate-500 italic">No memories yet. Click &quot;Add Memory&quot; to teach the AI about yourself.</p>;
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

function UserProfileSection() {
  const { profile, loadProfile, saveProfile } = useUserProfileStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [skills, setSkills] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile && !initializedRef.current) {
      initializedRef.current = true;
      setName(profile.name);
      setEmail(profile.email);
      setTitle(profile.title);
      setCompany(profile.company);
      setSkills(profile.skills.join(", "));
    }
  }, [profile]);

  const handleSave = async () => {
    await saveProfile({
      name,
      email,
      title,
      company,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setEditing(false);
    useToastStore.getState().addToast({ message: "Profile saved!", variant: "success" });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white mb-1">User Profile</h3>
          <p className="text-xs text-slate-500">Your information used by AI for personalized drafts.</p>
        </div>
        <button onClick={() => setEditing(!editing)} className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer">
          {editing ? "Cancel" : "Edit Profile"}
        </button>
      </div>
      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Job Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Software Engineer" className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Company</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Skills (comma-separated)</label>
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Next.js" className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
          </div>
          <button onClick={handleSave} className="py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start">
            Save Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Name</p>
            <p className="text-slate-200 font-semibold mt-0.5">{profile?.name || "Not set"}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Email</p>
            <p className="text-slate-200 font-semibold mt-0.5">{profile?.email || "Not set"}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Title</p>
            <p className="text-slate-200 font-semibold mt-0.5">{profile?.title || "Not set"}</p>
          </div>
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3">
            <p className="text-[10px] font-mono text-slate-500 uppercase">Company</p>
            <p className="text-slate-200 font-semibold mt-0.5">{profile?.company || "Not set"}</p>
          </div>
          {(profile?.skills?.length ?? 0) > 0 && (
            <div className="col-span-2 bg-slate-950/40 border border-slate-900 rounded-xl p-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-1">Skills</p>
              <div className="flex flex-wrap gap-1">
                {profile!.skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-900/30 text-indigo-400 text-[10px] font-semibold">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateLibrarySection() {
  const { templates, loadTemplates, removeTemplate } = useTemplateStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete template "${name}"?`)) {
      await removeTemplate(id);
      useToastStore.getState().addToast({ message: `Template "${name}" deleted`, variant: "info" });
    }
  };

  const handleApplyTemplate = (tpl: { subject: string; body: string }) => {
    navigator.clipboard.writeText(`Subject: ${tpl.subject}\n\n${tpl.body}`);
    useToastStore.getState().addToast({ message: "Template copied to clipboard!", variant: "success" });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white mb-1">Template Library</h3>
        <p className="text-xs text-slate-500">Saved email templates for quick reuse. Create templates from the draft composer.</p>
      </div>
      {templates.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-slate-500 italic">No templates saved yet.</p>
          <p className="text-[10px] text-slate-600 mt-1">Use the bookmark icon in the draft composer to save templates.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedTemplate(selectedTemplate === tpl.id ? null : tpl.id)}>
                <p className="text-xs font-semibold text-slate-200 truncate">{tpl.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{tpl.subject || tpl.body.slice(0, 80)}</p>
                <p className="text-[8px] text-slate-600 font-mono mt-0.5">{tpl.category} | {new Date(tpl.updatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <button onClick={() => handleApplyTemplate(tpl)} className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer" title="Copy to clipboard">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
                <button onClick={() => handleDelete(tpl.id, tpl.name)} className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer" title="Delete template">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
