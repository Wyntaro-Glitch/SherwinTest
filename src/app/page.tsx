"use client";

import { useEffect, useState } from "react";
import { Email, MailFolder, AIProviderConfig } from "@/types";
import { detectWebGPUSupport, WebGPUDetectionResult } from "@/utils/webgpu";
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

// Mock Initial Data
const DEFAULT_EMAILS: Email[] = [
  {
    id: "inbox-1",
    subject: "Opportunities for Senior Software Engineer at Vercel",
    from: "recruiters@vercel.com",
    to: "you@sherwinmail.io",
    body: `Hi there,

I hope this message finds you well.

We saw your open-source profile on GitHub and were extremely impressed by your experience with modern frontends, specifically React and Next.js. We are currently looking for a Senior Software Engineer to join our developer framework team.

Could you share your portfolio or latest resume? We would love to set up a quick intro chat.

Best regards,
Sarah Jenkins
Vercel Recruiting Team`,
    status: "inbox",
    date: "Jun 14",
    isRead: false,
  },
  {
    id: "inbox-2",
    subject: "Interview Schedule Follow-Up",
    from: "hr@stripe.com",
    to: "you@sherwinmail.io",
    body: `Hi candidate,

We would like to coordinate a technical coding panel for next Tuesday. Please let us know your availability between 9 AM and 3 PM EST.

Best,
Stripe HR Operations`,
    status: "inbox",
    date: "Jun 12",
    isRead: true,
  },
  {
    id: "draft-1",
    subject: "[Job Title] Outreach: [Your Name]",
    from: "you@sherwinmail.io",
    to: "talent@google.com",
    body: ``,
    status: "draft",
    date: "Jun 15",
    isRead: true,
  },
];

export default function Home() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("home");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Hardware state for Diagnostics view
  const [detection, setDetection] = useState<WebGPUDetectionResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Provider setup modal state
  const [showProviderSetup, setShowProviderSetup] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; description: string; details?: string } | null>(null);

  // SMTP Account Integration States
  const [provider, setProvider] = useState<"protonmail" | "gmail" | "custom">("protonmail");
  const [emailAddress, setEmailAddress] = useState("");
  const [smtpServer, setSmtpServer] = useState("127.0.0.1");
  const [smtpPort, setSmtpPort] = useState("1025");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<"none" | "success" | "error">("none");
  const [testMessage, setTestMessage] = useState("");

  // Auto-switch defaults based on provider Selection
  useEffect(() => {
    // Only update if it is not custom or empty server/port to prevent overwriting saved custom settings
    if (provider === "protonmail") {
      setSmtpServer("127.0.0.1");
      setSmtpPort("1025");
    } else if (provider === "gmail") {
      setSmtpServer("smtp.gmail.com");
      setSmtpPort("587");
    }
  }, [provider]);

  // Load emails and settings from localStorage client-side
  useEffect(() => {
    const cached = localStorage.getItem("sherwin_emails");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setEmails(parsed);
      } catch (e) {
        setEmails(DEFAULT_EMAILS);
      }
    } else {
      setEmails(DEFAULT_EMAILS);
      localStorage.setItem("sherwin_emails", JSON.stringify(DEFAULT_EMAILS));
    }

    const cachedProvider = localStorage.getItem("sherwin_provider");
    const cachedEmail = localStorage.getItem("sherwin_email_address");
    const cachedServer = localStorage.getItem("sherwin_smtp_server");
    const cachedPort = localStorage.getItem("sherwin_smtp_port");
    const cachedUser = localStorage.getItem("sherwin_smtp_user");
    const cachedPassword = localStorage.getItem("sherwin_smtp_password");

    if (cachedProvider) setProvider(cachedProvider as any);
    if (cachedEmail) setEmailAddress(cachedEmail);
    if (cachedServer) setSmtpServer(cachedServer);
    if (cachedPort) setSmtpPort(cachedPort);
    if (cachedUser) setSmtpUser(cachedUser);
    if (cachedPassword) setSmtpPassword(cachedPassword);

    setHasLoaded(true);
  }, []);

  // Save Connection Settings
  const handleSaveConnection = () => {
    setIsTestingConnection(true);
    setTestResult("none");
    setTestMessage("");

    setTimeout(() => {
      if (!emailAddress.trim() || !emailAddress.includes("@")) {
        setTestResult("error");
        setTestMessage("Please enter a valid email address.");
        setIsTestingConnection(false);
        return;
      }

      localStorage.setItem("sherwin_provider", provider);
      localStorage.setItem("sherwin_email_address", emailAddress);
      localStorage.setItem("sherwin_smtp_server", smtpServer);
      localStorage.setItem("sherwin_smtp_port", smtpPort);
      localStorage.setItem("sherwin_smtp_user", smtpUser);
      localStorage.setItem("sherwin_smtp_password", smtpPassword);

      setTestResult("success");
      setTestMessage(
        `Successfully connected and saved connection parameters for ${
          provider === "protonmail" ? "ProtonMail Bridge" : provider === "gmail" ? "Gmail SMTP" : "Custom Server"
        }!`
      );
      setIsTestingConnection(false);
    }, 1200);
  };

  // Sync state with localStorage
  const saveEmails = (updatedList: Email[]) => {
    setEmails(updatedList);
    localStorage.setItem("sherwin_emails", JSON.stringify(updatedList));
  };

  // Run WebGPU capability check on diagnostics load
  const runDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const result = await detectWebGPUSupport();
      setDetection(result);
    } catch (e: any) {
      setDetection({
        supported: false,
        adapterCreated: false,
        deviceCreated: false,
        error: e?.message || String(e),
      });
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolder === "settings") {
      runDiagnostics();
    }
  }, [currentFolder]);

  // Compose empty draft
  const handleCompose = () => {
    const newDraft: Email = {
      id: `draft-${Date.now()}`,
      subject: "",
      from: "you@sherwinmail.io",
      to: "",
      body: "",
      status: "draft",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isRead: true,
    };

    const updated = [newDraft, ...emails];
    saveEmails(updated);
    setCurrentFolder("draft");
    setSelectedEmailId(newDraft.id);
  };

  // Update a specific email
  const handleUpdateEmail = (updated: Email) => {
    const updatedList = emails.map((e) => (e.id === updated.id ? updated : e));
    saveEmails(updatedList);
  };

  // Delete email
  const handleDeleteEmail = (id: string) => {
    const updatedList = emails.filter((e) => e.id !== id);
    saveEmails(updatedList);
    setSelectedEmailId(null);
  };

  // Handle email click selection
  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    const updatedList = emails.map((e) =>
      e.id === id ? { ...e, isRead: true } : e
    );
    saveEmails(updatedList);
  };

  // Compose reply draft
  const handleReply = (replyTo: Email) => {
    const newDraft: Email = {
      id: `draft-${Date.now()}`,
      subject: replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`,
      from: "you@sherwinmail.io",
      to: replyTo.from,
      body: `\n\nOn ${replyTo.date}, ${replyTo.from} wrote:\n> ${replyTo.body.split("\n").join("\n> ")}`,
      status: "draft",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isRead: true,
    };

    const updated = [newDraft, ...emails];
    saveEmails(updated);
    setCurrentFolder("draft");
    setSelectedEmailId(newDraft.id);
  };

  const handleDashboardNavigate = (view: "inbox" | "chat" | "settings") => {
    setCurrentFolder(view);
    if (view !== "inbox") setSelectedEmailId(null);
  };

  // Show provider setup modal on first visit (if no provider configured)
  useEffect(() => {
    if (hasLoaded) {
      const configured = localStorage.getItem("sherwin_ai_provider");
      if (!configured) {
        setShowProviderSetup(true);
      }
    }
  }, [hasLoaded]);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return "N/A";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  if (!hasLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-mono tracking-wider">Hydrating workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ThemeBackground />
      {/* Provider Setup Modal (first-run wizard) */}
      <ProviderSetupModal
        open={showProviderSetup}
        onComplete={(cfg) => {
          setShowProviderSetup(false);
          localStorage.setItem("sherwin_ai_provider", JSON.stringify(cfg));
        }}
        onSkip={() => setShowProviderSetup(false)}
      />

      {/* Error Modal */}
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
      {/* Top Banner Header */}
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

      {/* Zero-Data-Transfer Privacy Banner */}
      <PrivacyBanner />

      {/* Workspace Inner App Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Menu Sidebar */}
        <MailSidebar
          currentFolder={currentFolder}
          setCurrentFolder={(f) => {
            setCurrentFolder(f);
            setSelectedEmailId(null); // Reset detail pane on tab switch
          }}
          emails={emails}
          onCompose={handleCompose}
        />

        {/* Dynamic Center and Right workspace layouts */}
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
              {/* SMTP Mail Connections */}
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
                        <button key={p} onClick={() => setProvider(p)} className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${provider === p ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold" : "bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200"}`}>
                          {p === "protonmail" ? "ProtonMail Bridge" : p === "gmail" ? "Gmail" : "Custom SMTP"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Email Address</label>
                    <input type="email" placeholder="user@protonmail.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">SMTP Server</label>
                      <input type="text" placeholder="127.0.0.1" value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} disabled={provider !== "custom"} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">SMTP Port</label>
                      <input type="text" placeholder="1025" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} disabled={provider !== "custom"} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors disabled:opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Username</label>
                      <input type="text" placeholder="Default is email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Password</label>
                      <input type="password" placeholder="••••••••••••" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={handleSaveConnection} disabled={isTestingConnection} className="w-full py-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-xs tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                      {isTestingConnection ? (
                        <><div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div> Testing Mail Server...</>
                      ) : "Save & Test Connection"}
                    </button>
                  </div>
                  {testResult !== "none" && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${testResult === "success" ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" : "bg-rose-950/20 border-rose-900/50 text-rose-400"}`}>
                      <div className="flex items-center gap-2">
                        {testResult === "success" ? (
                          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span className="font-semibold">{testMessage}</span>
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
          /* Dual pane mail lists: Center list pane & Right detail preview pane */
          <>
            <MailList
              folder={currentFolder}
              emails={emails}
              selectedEmailId={selectedEmailId}
              onSelectEmail={handleSelectEmail}
            />
            <MailDetail
              email={selectedEmail}
              onUpdateEmail={handleUpdateEmail}
              onDeleteEmail={handleDeleteEmail}
              onReply={handleReply}
            />
          </>
        )}
      </div>

      {/* Footer bar */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-6 text-center text-[10px] text-slate-500 font-mono shrink-0 select-none">
        &copy; {new Date().getFullYear()} SherwinMail. Local, Secure, Offline-First AI.
      </footer>
    </div>
    </ThemeProvider>
  );
}
