"use client";

import { useCallback, useEffect, useState } from "react";
import { detectWebGPUSupport } from "@/utils/webgpu";
import { useEmailStore } from "@/stores/emailStore";
import { useSmtpStore } from "@/stores/smtpStore";
import MailSidebar from "@/components/MailSidebar";
import MailList from "@/components/MailList";
import MailDetail from "@/components/MailDetail";
import ChatPanel from "@/components/ChatPanel";
import PrivacyBanner from "@/components/PrivacyBanner";
import PrivacyDashboard from "@/components/PrivacyDashboard";
import ThemeProvider from "@/components/ThemeProvider";
import ProviderSettings from "@/components/ProviderSettings";
import AppearanceSettings from "@/components/AppearanceSettings";
import SystemTaskScheduler from "@/components/SystemTaskScheduler";
import ProviderSetupModal from "@/components/ProviderSetupModal";
import ErrorModal from "@/components/ErrorModal";
import ResumeScanner from "@/components/ResumeScanner";
import ThemeBackground from "@/components/ThemeBackground";

export default function Home() {
  const {
    emails,
    currentFolder,
    selectedEmailId,
    setCurrentFolder,
    setSelectedEmailId,
    selectEmail,
    composeDraft,
    updateEmail,
    deleteEmail,
    replyToEmail,
  } = useEmailStore();

  const smtp = useSmtpStore();

  const [showProviderSetup, setShowProviderSetup] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("sherwin_ai_provider");
    }
    return false;
  });
  const [errorModal, setErrorModal] = useState<{ title: string; description: string; details?: string } | null>(null);

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

  const handleDashboardNavigate = (view: "inbox" | "chat" | "settings") => {
    setCurrentFolder(view);
    if (view !== "inbox") setSelectedEmailId(null);
  };

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

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
        <span className="text-[10px] font-mono text-slate-500 border border-slate-900 rounded-full px-3 py-0.5 bg-slate-900/50">
          Local Workspace Active
        </span>
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
        />

        {currentFolder === "home" ? (
          <PrivacyDashboard onNavigate={handleDashboardNavigate} />
        ) : currentFolder === "resume" ? (
          <ResumeScanner />
        ) : currentFolder === "chat" ? (
          <ChatPanel />
        ) : currentFolder === "settings" ? (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col gap-8">
            <div className="max-w-6xl w-full mx-auto flex flex-col gap-8">
              <ProviderSettings />
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
              <SystemTaskScheduler />
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
        &copy; {new Date().getFullYear()} SherwinMail. Local, Secure, Offline-First AI.
      </footer>
    </div>
    </ThemeProvider>
  );
}
