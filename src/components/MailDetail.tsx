import { useState, useEffect, useRef } from "react";
import { Email } from "@/types";
import { aiService } from "@/utils/aiService";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";

interface MailDetailProps {
  email: Email | null;
  onUpdateEmail: (updated: Email) => void;
  onDeleteEmail: (id: string) => void;
  onReply: (replyTo: Email) => void;
}

export default function MailDetail({
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailIdRef = useRef<string | undefined>(undefined);
  const toRef = useRef(to);
  const subjectRef = useRef(subject);
  const bodyRef = useRef(body);

  // Keep refs in sync
  toRef.current = to;
  subjectRef.current = subject;
  bodyRef.current = body;

  // Sync state with selected email draft
  useEffect(() => {
    if (email && email.status === "draft") {
      setTo(email.to);
      setSubject(email.subject);
      setBody(email.body);
      emailIdRef.current = email.id;
    }
  }, [email?.id]);

  if (!email) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center text-center p-8 select-none">
        <svg className="w-16 h-16 text-slate-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5"
          />
        </svg>
        <h3 className="text-sm font-semibold text-slate-400">No message selected</h3>
        <p className="text-xs text-slate-600 mt-1">Select an email from the list or compose a new draft.</p>
      </div>
    );
  }

  // Handle draft field changes & auto-save (debounced 500ms)
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

  // Run AI generation from Job description
  const handleAIGenerate = async () => {
    if (!jobText.trim()) return;
    setIsGenerating(true);

    const config = getProviderConfig();
    if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
      try {
        let draft = "";
        await chatCompletion({
          messages: [
            { role: "system", content: "You are a professional outreach assistant. Generate a concise cold email draft based on the job description and subject line. Use [BRACKETS] for missing personal details. Never hallucinate names or companies." },
            { role: "user", content: `Job Description: ${jobText}\n\nSubject: ${subject}\n\nGenerate the full email body.` },
          ],
          onChunk: (chunk) => { draft = chunk; },
        });
        setBody(draft);
        onUpdateEmail({ ...email, body: draft });
      } catch (e: any) {
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
        onUpdateEmail({
          ...email,
          body: generatedBody,
        });
        setIsGenerating(false);
      }, 800);
    }
  };

  // Mock send email
  const handleSend = () => {
    onUpdateEmail({
      ...email,
      to,
      subject,
      body,
      status: "sent",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    });
  };

  // Editable draft view
  if (email.status === "draft") {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto">
        {/* Header bar */}
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full">
            Draft Composer
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onDeleteEmail(email.id)}
              className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
              title="Delete Draft"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 p-6 flex flex-col md:flex-row gap-6">
          
          {/* Main Email Fields */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">
                To (Recipient Email)
              </label>
              <input
                type="email"
                placeholder="recruiter@company.com"
                value={to}
                onChange={(e) => handleFieldChange("to", e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Application for Software Engineer role"
                value={subject}
                onChange={(e) => handleFieldChange("subject", e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-[10px] font-mono text-slate-500 uppercase font-semibold mb-1">
                Email Body
              </label>
              <textarea
                placeholder="Write your email here, or use the AI generator on the right to build a template..."
                value={body}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                className="w-full flex-1 min-h-[300px] bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-xl p-4 text-sm text-slate-200 focus:outline-none transition-colors font-sans resize-none leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-slate-500">
                Draft auto-saved
              </span>
              <button
                onClick={handleSend}
                className="py-2.5 px-6 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs tracking-wider rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Send Message
              </button>
            </div>
          </div>

          {/* Job Description Sidebar Input (AI contextual helper) */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                AI Pitch Builder
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal">
                Paste the Job Description to automatically draft an email pitch using standard bracket identifiers.
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-[180px]">
              <textarea
                placeholder="Job Description:\nReact Developer at Vercel\nLooking for experience in React, TypeScript, Next.js.\nContact: hiring@vercel.com"
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                className="w-full flex-1 bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl p-3 text-[11px] text-slate-350 focus:outline-none transition-colors font-mono resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !jobText.trim()}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:border-slate-900 rounded-xl font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  Extracting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                  Generate AI Pitch
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Read-only folder messages (Inbox / Sent)
  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto">
      {/* Action Header */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <div className="flex gap-2">
          {email.status === "inbox" && (
            <button
              onClick={() => onReply(email)}
              className="py-1.5 px-4 bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Reply
            </button>
          )}
        </div>
        <button
          onClick={() => onDeleteEmail(email.id)}
          className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-rose-450 rounded-lg transition-colors cursor-pointer"
          title="Delete Email"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Message Content */}
      <div className="p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
            {email.subject || "(No Subject)"}
          </h2>
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-350">
                From: <strong className="text-slate-200">{email.from}</strong>
              </span>
              <span className="text-slate-400">
                To: {email.to}
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[10px] shrink-0">
              {email.date}
            </span>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="border-t border-slate-900"></div>

        {/* Email body text */}
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
          {email.body}
        </div>
      </div>
    </div>
  );
}
