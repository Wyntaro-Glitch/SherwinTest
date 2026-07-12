import { useState, useEffect, useRef, memo } from "react";
import { Email, EmailTone } from "@/types";
import { aiService } from "@/utils/aiService";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";
import { useSmtpStore } from "@/stores/smtpStore";
import { useToastStore } from "@/stores/toastStore";
import { useEmailStore } from "@/stores/emailStore";
import { useTemplateStore } from "@/stores/templateStore";
import { addAuditEntry } from "@/utils/db";

const TONE_PROMPTS: Record<EmailTone, string> = {
  formal: "Write in a professional, courteous tone with standard business letter structure.",
  direct: "Write concisely and directly. Get straight to the point with clear action items.",
  creative: "Write with personality and flair. Use engaging language that stands out.",
};

interface MailDetailProps {
  email: Email | null;
  onUpdateEmail: (updated: Email) => void;
  onDeleteEmail: (id: string) => void;
  onReply: (replyTo: Email) => void;
}

function scanBrackets(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1, -1)))] : [];
}

const MailDetail = memo(function MailDetail({
  email,
  onUpdateEmail,
  onDeleteEmail,
  onReply,
}: MailDetailProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [jobText, setJobText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<EmailTone>("formal");
  const [isSending, setIsSending] = useState(false);
  const [showBracketWarning, setShowBracketWarning] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [isUploadingJD, setIsUploadingJD] = useState(false);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailIdRef = useRef<string | undefined>(undefined);
  const toRef = useRef(to);
  const subjectRef = useRef(subject);
  const bodyRef = useRef(body);
  const originalBodyRef = useRef("");

  const smtp = useSmtpStore();
  const { templates, loadTemplates } = useTemplateStore();
  const labels = useEmailStore((s) => s.labels);
  const addLabelToEmail = useEmailStore((s) => s.addLabelToEmail);
  const removeLabelFromEmail = useEmailStore((s) => s.removeLabelFromEmail);

  toRef.current = to;
  subjectRef.current = subject;
  bodyRef.current = body;

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (email && email.status === "draft") {
      setTo(email.to);
      setSubject(email.subject);
      setBody(email.body);
      originalBodyRef.current = email.body;
      emailIdRef.current = email.id;
    }
  }, [email?.id]);

  // Draft auto-recovery: warn before navigating away with unsaved changes
  useEffect(() => {
    const hasChanges = body !== originalBodyRef.current || subject !== (email?.subject || "") || to !== (email?.to || "");
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [body, subject, to, email?.subject, email?.to]);

  const bracketWarnings = scanBrackets(body);
  const hasBrackets = bracketWarnings.length > 0;

  if (!email) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center text-center p-8 select-none">
        <svg className="w-16 h-16 text-slate-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-400">No message selected</h3>
        <p className="text-xs text-slate-600 mt-1">Select an email from the list or compose a new draft.</p>
      </div>
    );
  }

  const handleFieldChange = (field: "to" | "subject" | "body", value: string) => {
    if (field === "to") setTo(value);
    if (field === "subject") setSubject(value);
    if (field === "body") setBody(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const currentId = email?.id;
    debounceRef.current = setTimeout(() => {
      if (emailIdRef.current === currentId) {
        onUpdateEmail({
          ...email!,
          to: toRef.current,
          subject: subjectRef.current,
          body: bodyRef.current,
        });
      }
    }, 500);
  };

  const handleAIGenerate = async () => {
    if (!jobText.trim()) return;
    setIsGenerating(true);

    const config = getProviderConfig();
    if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
      try {
        let draft = "";
        await chatCompletion({
          messages: [
            { role: "system", content: `You are a professional outreach assistant. ${TONE_PROMPTS[tone]} Generate a concise cold email draft based on the job description and subject line. Use [BRACKETS] for missing personal details. Never hallucinate names or companies.` },
            { role: "user", content: `Job Description: ${jobText}\n\nSubject: ${subject}\n\nGenerate the full email body.` },
          ],
          onChunk: (chunk) => { draft = chunk; },
        });
        setBody(draft);
        onUpdateEmail({ ...email, body: draft });
      } catch (e: unknown) {
        console.error("AI provider draft failed:", e);
        const fallback = aiService.generateDraftFromJob(jobText, subject);
        setBody(fallback);
        onUpdateEmail({ ...email, body: fallback });
      } finally {
        setIsGenerating(false);
      }
    } else {
      setTimeout(() => {
        const generatedBody = aiService.generateDraftFromJob(jobText, subject);
        setBody(generatedBody);
        onUpdateEmail({ ...email, body: generatedBody });
        setIsGenerating(false);
      }, 800);
    }
  };

  const handleSend = async () => {
    if (hasBrackets) {
      setShowBracketWarning(true);
      return;
    }
    await actualSend();
  };

  const actualSend = async () => {
    setShowBracketWarning(false);
    setIsSending(true);

    const sentDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    if (smtp.smtpServer && smtp.emailAddress && smtp.smtpPassword) {
      try {
        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: smtp.smtpServer,
            port: smtp.smtpPort,
            user: smtp.smtpUser || smtp.emailAddress,
            pass: smtp.smtpPassword,
            from: smtp.emailAddress,
            to,
            subject,
            text: body,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          onUpdateEmail({ ...email, to, subject, body, status: "sent", date: sentDate });
          useToastStore.getState().addToast({ message: "Email sent successfully!", variant: "success" });
          await addAuditEntry({ timestamp: new Date().toISOString(), action: "send", details: `Sent to ${to}: "${subject}"` });
        } else {
          useToastStore.getState().addToast({ message: `Send failed: ${data.error}`, variant: "error" });
        }
      } catch {
        onUpdateEmail({ ...email, to, subject, body, status: "sent", date: sentDate });
        useToastStore.getState().addToast({ message: "Email marked as sent (SMTP unreachable)", variant: "warning" });
      }
    } else {
      onUpdateEmail({ ...email, to, subject, body, status: "sent", date: sentDate });
      useToastStore.getState().addToast({ message: "Email sent (no SMTP configured)", variant: "info" });
    }

    setIsSending(false);
    await addAuditEntry({ timestamp: new Date().toISOString(), action: "send", details: `Sent to ${to}: "${subject}"` });
  };

  const handleSaveAsTemplate = async () => {
    if (!subject.trim() && !body.trim()) return;
    const name = prompt("Template name:");
    if (!name) return;
    await useTemplateStore.getState().addTemplate({
      name,
      category: "custom",
      subject,
      body,
    });
    useToastStore.getState().addToast({ message: `Template "${name}" saved!`, variant: "success" });
  };

  const handleApplyTemplate = (tpl: { subject: string; body: string }) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    onUpdateEmail({ ...email, subject: tpl.subject, body: tpl.body });
    setShowTemplates(false);
  };

  const handleJDFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingJD(true);
    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setJobText(text);
      } else if (file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/extract", { method: "POST", body: formData });
        const data = await res.json();
        if (data.text) {
          setJobText(data.text);
        } else {
          useToastStore.getState().addToast({ message: "Failed to extract text from PDF", variant: "error" });
        }
      } else {
        useToastStore.getState().addToast({ message: "Unsupported file type. Use .txt or .pdf", variant: "error" });
      }
    } catch {
      useToastStore.getState().addToast({ message: "Failed to read file", variant: "error" });
    }
    setIsUploadingJD(false);
    if (jdFileRef.current) jdFileRef.current.value = "";
  };

  const handleToneGenerate = async () => {
    if (!body.trim()) return;
    setIsGenerating(true);
    const config = getProviderConfig();
    if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
      try {
        let newBody = "";
        await chatCompletion({
          messages: [
            { role: "system", content: `Rewrite the following email in a ${tone} tone. Keep the same meaning but adjust style. Use [BRACKETS] for any missing details.` },
            { role: "user", content: body },
          ],
          onChunk: (chunk) => { newBody = chunk; },
        });
        setBody(newBody);
        onUpdateEmail({ ...email, body: newBody });
      } catch {
        useToastStore.getState().addToast({ message: "Tone regeneration failed", variant: "error" });
      }
    } else {
      const prefixes: Record<EmailTone, string> = {
        formal: "Dear [Hiring Manager],\n\n",
        direct: "Hi there,\n\n",
        creative: "Hey [Hiring Manager]!\n\n",
      };
      const suffixes: Record<EmailTone, string> = {
        formal: "\n\nBest regards,\n[Your Name]",
        direct: "\n\nBest,\n[Your Name]",
        creative: "\n\nCheers,\n[Your Name] ✨",
      };
      const newBody = prefixes[tone] + body + suffixes[tone];
      setBody(newBody);
      onUpdateEmail({ ...email, body: newBody });
    }
    setIsGenerating(false);
  };

  if (email.status === "draft") {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full">
            Draft Composer
          </span>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(!showTemplates)} className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer" title="Templates">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            </button>
            <button onClick={() => setShowLabelPicker(!showLabelPicker)} className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-amber-400 rounded-lg transition-colors cursor-pointer" title="Labels">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </button>
            <button onClick={handleSaveAsTemplate} className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer" title="Save as Template">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>
            <button onClick={() => onDeleteEmail(email.id)} className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer" title="Delete Draft">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className="p-4 border-b border-slate-900 bg-slate-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Templates</span>
              <button onClick={() => setShowTemplates(false)} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">Close</button>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No templates saved yet.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {templates.map((tpl) => (
                  <button key={tpl.id} onClick={() => handleApplyTemplate(tpl)} className="text-left p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                    <p className="text-xs font-semibold text-slate-200">{tpl.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{tpl.subject || tpl.body.slice(0, 60)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showLabelPicker && (
          <div className="p-4 border-b border-slate-900 bg-slate-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Labels</span>
              <button onClick={() => setShowLabelPicker(false)} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer">Close</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const isActive = (email.labels || []).includes(label.id);
                return (
                  <button
                    key={label.id}
                    onClick={() => {
                      if (isActive) removeLabelFromEmail(email.id, label.id);
                      else addLabelToEmail(email.id, label.id);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer"
                    style={{
                      borderColor: isActive ? label.color : "rgb(30 41 59)",
                      backgroundColor: isActive ? `${label.color}20` : "transparent",
                      color: isActive ? label.color : "rgb(148 163 184)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(email.labels || []).length > 0 && !showLabelPicker && (
          <div className="px-4 pt-3 flex flex-wrap gap-1.5">
            {(email.labels || []).map((labelId) => {
              const label = labels.find((l) => l.id === labelId);
              if (!label) return null;
              return (
                <span key={labelId} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border" style={{ borderColor: `${label.color}40`, backgroundColor: `${label.color}15`, color: label.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex-1 p-6 flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">To (Recipient Email)</label>
              <input type="email" placeholder="recruiter@company.com" value={to} onChange={(e) => handleFieldChange("to", e.target.value)} className="w-full bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Subject</label>
              <input type="text" placeholder="Application for Software Engineer role" value={subject} onChange={(e) => handleFieldChange("subject", e.target.value)} className="w-full bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors" />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Tone:</label>
              {(["formal", "direct", "creative"] as EmailTone[]).map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${tone === t ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" : "bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300"}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
              {body.trim() && (
                <button onClick={handleToneGenerate} disabled={isGenerating} className="ml-auto px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-emerald-800/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-40">
                  {isGenerating ? "Regenerating..." : `Rewrite in ${tone}`}
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">Email Body</label>
              <textarea
                placeholder="Write your email here, or use the AI generator on the right to build a template..."
                value={body}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                className="w-full flex-1 min-h-[300px] bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl p-4 text-sm text-slate-200 focus:outline-none transition-colors font-sans resize-none leading-relaxed"
              />
            </div>

            {hasBrackets && (
              <div className="p-3 rounded-xl border border-amber-900/50 bg-amber-950/20 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  {bracketWarnings.length} placeholder{bracketWarnings.length > 1 ? "s" : ""} detected
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {bracketWarnings.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30 text-amber-300 font-mono text-[10px]">
                      [{b}]
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-slate-500">Draft auto-saved</span>
              <button onClick={handleSend} disabled={isSending || !to.trim()} className="py-2.5 px-6 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs tracking-wider rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                {isSending ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Pitch Builder</h3>
                <div className="flex gap-1">
                  <input ref={jdFileRef} type="file" accept=".txt,.pdf" className="hidden" onChange={handleJDFileUpload} />
                  <button onClick={() => jdFileRef.current?.click()} disabled={isUploadingJD} className="p-1 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded transition-colors cursor-pointer disabled:opacity-40" title="Upload JD file">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Paste or upload the Job Description to automatically draft an email pitch.</p>
              {isUploadingJD && <p className="text-[10px] text-indigo-400 mt-1">Extracting text from file...</p>}
            </div>
            <div className="flex-1 flex flex-col min-h-[180px]">
              <textarea placeholder={"Job Description:\nReact Developer at Vercel\nLooking for experience in React, TypeScript, Next.js.\nContact: hiring@vercel.com"} value={jobText} onChange={(e) => setJobText(e.target.value)} className="w-full flex-1 bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl p-3 text-[11px] text-slate-350 focus:outline-none transition-colors font-mono resize-none leading-relaxed" />
            </div>
            <button onClick={handleAIGenerate} disabled={isGenerating || !jobText.trim()} className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:border-slate-900 rounded-xl font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {isGenerating ? (
                <><div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Extracting...</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Generate AI Pitch
                </>
              )}
            </button>
          </div>
        </div>

        {showBracketWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBracketWarning(false)}>
            <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Placeholders Detected</h3>
                  <p className="text-xs text-slate-400">Your email contains {bracketWarnings.length} unfilled placeholder{bracketWarnings.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {bracketWarnings.map((b, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30 text-amber-300 font-mono text-[10px]">[{b}]</span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowBracketWarning(false)} className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={actualSend} className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">Send Anyway</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <div className="flex gap-2">
          {email.status === "inbox" && (
            <button onClick={() => onReply(email)} className="py-1.5 px-4 bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              Reply
            </button>
          )}
        </div>
        <button onClick={() => onDeleteEmail(email.id)} className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-rose-450 rounded-lg transition-colors cursor-pointer" title="Delete Email">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight leading-snug">{email.subject || "(No Subject)"}</h2>
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-350">From: <strong className="text-slate-200">{email.from}</strong></span>
              <span className="text-slate-400">To: {email.to}</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px] shrink-0">{email.date}</span>
          </div>
          {(email.labels || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(email.labels || []).map((labelId) => {
                const label = labels.find((l) => l.id === labelId);
                if (!label) return null;
                return (
                  <span key={labelId} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border" style={{ borderColor: `${label.color}40`, backgroundColor: `${label.color}15`, color: label.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-slate-900"></div>
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">{email.body}</div>
      </div>
    </div>
  );
});

export default MailDetail;
