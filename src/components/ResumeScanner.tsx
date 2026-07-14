"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MessageContentPart } from "@/types";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";
import { ResumePDFDownload } from "./ResumePDF";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContentPart[];
  timestamp: string;
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function buildSystemPrompt(resumeText: string): string {
  return `You are a senior resume writer and career development expert specializing in ATS-optimized resumes.

The user has uploaded the following resume content. Use your knowledge of their industry, role, and current market trends to help them improve it.

Current resume content:
---
${resumeText}
---

ATS COMPATIBILITY RULES (MUST FOLLOW):
- Use single-column layout with standard section headings: "Professional Summary", "Work Experience", "Skills", "Education", "Certifications"
- Never use creative headings like "My Journey" or "What I Bring"
- Use standard sans-serif formatting
- No tables, columns, text boxes, or graphics
- Include keywords from the user's target role/industry naturally throughout

ACHIEVEMENT-DRIVEN CONTENT RULES:
- Every bullet point MUST follow the Action + Context + Result formula
- Start with a strong action verb (e.g., "Drove", "Resolved", "Built", "Reduced", "Increased", "Led", "Implemented")
- Quantify 60-80% of bullet points with specific metrics: numbers, percentages, dollar amounts, or volume
- If exact numbers are unavailable, use estimates ("approximately", "over") or proxies (volume handled, frequency)
- Weak: "Responsible for sales" → Strong: "Drove a 25% increase in monthly sales by optimizing product displays"
- Weak: "Managed customer support" → Strong: "Resolved 40+ requests per day with a 96% satisfaction rating"

PROFESSIONAL SUMMARY RULES:
- 3-5 sentences connecting past experience to target role
- Include 2-3 primary skills as keywords
- End with value proposition

SKILLS SECTION RULES:
- Group related skills for readability
- Include both technical and soft skills
- Mirror keywords from target job descriptions
- Use industry-standard terminology

Your responsibilities:
- Analyze the resume for structure, gaps, grammar, and ATS compatibility
- Rewrite all bullet points using the Action + Context + Result formula with quantified achievements
- Ensure every section uses standard ATS headings
- Integrate relevant industry keywords naturally
- Use [BRACKETS] only for truly unknown personal details (phone, email, address)
- Never hallucinate job titles, companies, or credentials the user hasn't provided
- Preserve the user's actual experience and achievements — enhance, don't fabricate

When the user asks you to "auto-generate" or "update" the resume, produce a complete ATS-optimized version with these sections:
1. Professional Summary (3-5 sentences, keyword-rich)
2. Skills (grouped by category, matching target role keywords)
3. Work Experience (reverse-chronological, achievement-driven bullets with metrics)
4. Projects (if applicable, with technical details)
5. Education (degree, school, dates)
6. Certifications (with issuing organizations)`;
}

export default function ResumeScanner() {
  const [resumeContent, setResumeContent] = useState("");
  const [sourceType, setSourceType] = useState<"none" | "pdf" | "image" | "text">("none");
  const [sourceFileName, setSourceFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // AI chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Upload your resume (PDF or image) and I'll analyze it. Then we can chat about improvements, or click **Auto-Generate** to have me create a fully updated version. *(Requires Ollama, LM Studio, or API Key provider)*",
      timestamp: formatTime(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [isWebGPUBlocked, setIsWebGPUBlocked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const config = getProviderConfig();
    const blocked = config.provider === "webgpu";
    setIsWebGPUBlocked(blocked);
    setIsProviderReady(config.provider !== "auto" && !blocked);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const runAnalysis = async (resumeText: string, fileName: string, extra?: string) => {
    if (!resumeText.trim() || isWebGPUBlocked) return;
    const wordCount = resumeText.split(/\s+/).filter(Boolean).length;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: extra || "Analyze my resume — identify strengths, gaps, ATS issues, and suggest specific improvements.",
      timestamp: formatTime(),
    };

    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: aiId, role: "assistant", content: "", timestamp: formatTime() }]);
    setIsGenerating(true);

    try {
      let full = "";
      let lastUpdate = 0;
      const analysisPrompt = buildSystemPrompt(resumeText) +
        `\n\nThe user just uploaded "${fileName}" (${wordCount} words). ` +
        "Provide a brief analysis: structure, strengths, gaps, and 2-3 specific improvements.";

      await chatCompletion({
        messages: [
          { role: "system", content: analysisPrompt },
          { role: "user", content: "Analyze my resume." },
        ],
        onChunk: (chunk) => {
          full = chunk;
          const now = Date.now();
          if (now - lastUpdate > 100) {
            lastUpdate = now;
            setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: full } : m)));
          }
        },
      });

      setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: full } : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: "Analysis unavailable — check your AI provider settings." } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError("");
    setSourceFileName(file.name);
    setIsUploading(true);

    try {
      if (file.type === "application/pdf") {
        await handlePdfUpload(file);
      } else if (file.type.startsWith("image/")) {
        await handleImageUpload(file);
      } else {
        setUploadError("Unsupported file type. Please upload a PDF or image.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.ok) {
        setUploadError(data.error || "Failed to extract PDF text.");
        setIsUploading(false);
        return;
      }

      setResumeContent(data.text);
      setSourceType("pdf");
      await runAnalysis(data.text, file.name, `I uploaded my resume "${file.name}" (${data.wordCount} words, ${data.pageCount} page(s)). Analyze it and suggest improvements.`);

      // Auto-generate enhanced version after analysis
      if (data.text.trim()) {
        setTimeout(() => autoGenerateFromText(data.text), 500);
      }
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "PDF upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (file: File): Promise<void> => {
    if (isWebGPUBlocked) {
      setUploadError("Image OCR requires Ollama, LM Studio, or an API Key provider. Upload a PDF instead, or switch providers in Settings.");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setImagePreview(base64);

        const msgContent: MessageContentPart[] = [
          { type: "text", text: "Extract the full text from this resume image verbatim — no commentary, no analysis, just the raw text." },
          { type: "image_url", image_url: { url: base64 } },
        ];

        const msgId = `img-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: msgId, role: "user", content: msgContent, timestamp: formatTime() },
        ]);
        setIsGenerating(true);

        try {
          let extractedText = "";

          await chatCompletion({
            messages: [
              { role: "system", content: "Extract all text from the resume image verbatim. Return nothing but the extracted text — no commentary, no analysis." },
              { role: "user", content: msgContent },
            ],
            onChunk: (chunk) => { extractedText = chunk; },
          });

          setResumeContent(extractedText);
          setSourceType("image");
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: msgContent } : m));

          await runAnalysis(extractedText, file.name);
        } catch (e: unknown) {
          setUploadError(`Vision extraction failed: ${e instanceof Error ? e.message : String(e)}. Try uploading a PDF instead.`);
        } finally {
          setIsGenerating(false);
          resolve();
        }
      };
      reader.onerror = () => {
        setUploadError("Failed to read image file.");
        setIsUploading(false);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputValue;
    if (!messageText.trim() || isGenerating || isWebGPUBlocked) return;
    if (!textToSend) setInputValue("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: formatTime(),
    };

    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: aiId, role: "assistant", content: "", timestamp: formatTime() }]);
    setIsGenerating(true);

    try {
      let full = "";
      let lastUpdate = 0;
      await chatCompletion({
        messages: [
          { role: "system", content: buildSystemPrompt(resumeContent) },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: messageText },
        ],
        onChunk: (chunk) => {
          full = chunk;
          const now = Date.now();
          if (now - lastUpdate > 100) {
            lastUpdate = now;
            setMessages((prev) =>
              prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
            );
          }
        },
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
      );
    } catch (e: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: `Error: ${e instanceof Error ? e.message : String(e)}. Check your AI provider settings.` } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const autoGenerateFromText = async (text: string) => {
    if (!text.trim() || isWebGPUBlocked) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: "Auto-generate a completely updated and polished version of my resume based on my background and current industry standards.",
      timestamp: formatTime(),
    };

    const aiId = `ai-${Date.now()}`;
    const aiMsg: ChatMessage = { id: aiId, role: "assistant", content: "", timestamp: formatTime() };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setIsGenerating(true);

    try {
      let full = "";
      let lastUpdate = 0;
      const autoPrompt = buildSystemPrompt(text) + `
Now produce the COMPLETE updated resume. Follow these formatting rules exactly:

1. Use ONLY these section headings (in this order): Professional Summary, Skills, Work Experience, Projects, Education, Certifications
2. Every bullet point must use the Action + Context + Result formula with a quantified metric
3. Work Experience must be in reverse-chronological order (newest first)
4. Keep the resume to 1 page if possible, 2 pages maximum
5. Use clean plain text formatting — no markdown, no tables, no special characters
6. Each section title should be on its own line, followed by a blank line
7. For Work Experience, format each entry as: "Job Title, Company (Dates)" followed by bullet points
8. For Education, format as: "School Name" on one line, "Degree, Dates" on the next
9. Preserve all original content — enhance the writing, don't remove sections`;

      await chatCompletion({
        messages: [
          { role: "system", content: autoPrompt },
          { role: "user", content: "Generate the full enhanced resume with all sections improved." },
        ],
        onChunk: (chunk) => {
          full = chunk;
          const now = Date.now();
          if (now - lastUpdate > 100) {
            lastUpdate = now;
            setMessages((prev) =>
              prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
            );
          }
        },
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
      );
    } catch (e: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: `Error: ${e instanceof Error ? e.message : String(e)}` } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    await autoGenerateFromText(resumeContent);
  };

  const latestAiOutput = useMemo(
    () => [...messages].reverse().find(
      (m) => m.role === "assistant" && typeof m.content === "string" && m.content.length > 100
    ),
    [messages]
  );

  const acceptLatestOutput = () => {
    if (latestAiOutput && typeof latestAiOutput.content === "string") {
      setResumeContent(latestAiOutput.content);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="flex-1 bg-slate-950 flex overflow-hidden">
      {/* Left: Upload + Editor */}
      <div className="w-3/5 flex flex-col border-r border-slate-900 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-900 bg-slate-950 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">Resume Scanner</h2>
            {sourceType !== "none" && (
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {sourceType === "pdf" ? "PDF" : "Image"} loaded
              </span>
            )}
          </div>
          {resumeContent && (
            <div className="flex items-center gap-2">
              <ResumePDFDownload
                resumeText={resumeContent}
                fileName={`${sourceFileName.replace(/\.pdf$/i, "") || "resume"}-enhanced.pdf`}
              />
              <button
                onClick={acceptLatestOutput}
                disabled={!latestAiOutput}
                className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors disabled:opacity-30 cursor-pointer"
              >
                Apply AI Output to Editor
              </button>
            </div>
          )}
        </div>

        {/* Upload zone or editor */}
        <div className="flex-1 overflow-y-auto p-4">
          {!resumeContent ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="h-full border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors p-8"
            >
              <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-300">Drop your resume here</p>
                <p className="text-xs text-slate-600 mt-1">Supports PDF, PNG, JPG, WebP</p>
              </div>
              <span className="text-[10px] text-slate-700 font-mono">or click to browse</span>
              {isUploading && <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              {uploadError && <p className="text-xs text-rose-400 text-center">{uploadError}</p>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
            </div>
          ) : (
            <div className="flex flex-col h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {sourceFileName} &mdash; {resumeContent.split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  onClick={() => { setResumeContent(""); setSourceType("none"); setSourceFileName(""); setImagePreview(""); }}
                  className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Remove & re-upload
                </button>
              </div>
              {imagePreview && (
                <div className="rounded-xl overflow-hidden border border-slate-800 max-h-48">
                  <img src={imagePreview} alt="Uploaded resume" className="w-full h-full object-contain bg-slate-900" />
                </div>
              )}
              <textarea
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                className="flex-1 w-full bg-slate-900/40 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none transition-colors resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Chat */}
      <div className="w-2/5 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="p-4 border-b border-slate-900 bg-slate-950 shrink-0 flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            AI Resume Assistant
          </span>
          <button
            onClick={handleAutoGenerate}
            disabled={!resumeContent.trim() || isGenerating || !isProviderReady}
            className="text-[10px] font-bold px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
          >
            Auto-Generate
          </button>
        </div>

        {isWebGPUBlocked && (
          <div className="px-4 pt-3 shrink-0">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-[10px] text-amber-300 leading-relaxed">
              ⚠ Resume AI analysis needs more power than WebGPU can provide.{' '}
              <span className="text-slate-400">
                Switch to <strong className="text-slate-300">Ollama</strong> or <strong className="text-slate-300">LM Studio</strong> in Settings to use the Resume Scanner.
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const displayText = typeof msg.content === "string" ? msg.content : "[Image content]";
            return (
              <div key={msg.id} className={`flex flex-col max-w-[90%] ${isUser ? "self-end items-end" : "self-start items-start"}`}>
                <span className="text-[9px] font-mono text-slate-600 mb-0.5 px-1">
                  {isUser ? "You" : "Assistant"} &bull; {msg.timestamp}
                </span>
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-indigo-500/10 text-slate-100 border border-indigo-500/20 rounded-tr-sm"
                    : "bg-slate-900/60 text-slate-300 border border-slate-800 rounded-tl-sm"
                }`}>
                  {displayText || (isGenerating && msg === messages[messages.length - 1] ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : "")}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={
                resumeContent
                  ? "Ask me to improve your resume..."
                  : "Upload a resume first to start chatting..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
              }}
              disabled={isGenerating || !resumeContent.trim() || !isProviderReady}
              className="flex-1 pl-3 pr-3 py-2 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors disabled:opacity-40"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputValue.trim() || !resumeContent.trim() || !isProviderReady}
              className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
