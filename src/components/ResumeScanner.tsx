"use client";

import { useState, useRef, useEffect } from "react";
import { MessageContentPart } from "@/types";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";

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
  return `You are a senior resume writer and career development expert.

The user has uploaded the following resume content. Use your knowledge of their industry, role, and current market trends to help them improve it.

Current resume content:
---
${resumeText}
---

Your responsibilities:
- Analyze the resume for structure, gaps, grammar, and ATS compatibility
- Suggest improvements with strong action verbs and quantified achievements
- Generate complete updated versions when asked
- Use [BRACKETS] only for truly unknown personal details (phone, email, address)
- Never hallucinate job titles, companies, or credentials the user hasn't provided

When the user asks you to "auto-generate" or "update" the resume, produce a complete polished version with:
1. Professional Summary
2. Skills (relevant to their field, including current keywords)
3. Professional Experience (with action verbs and metrics)
4. Education
5. Certifications (if applicable)`;
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
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: "assistant", content: "", timestamp: formatTime() },
    ]);

    try {
      let full = "";
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
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: full } : m)));
        },
      });
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
    } catch (e: any) {
      setUploadError(e?.message || "PDF upload failed.");
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
        } catch (e: any) {
          setUploadError(`Vision extraction failed: ${e?.message || e}. Try uploading a PDF instead.`);
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

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: "assistant", content: "", timestamp: formatTime() },
    ]);

    try {
      let full = "";
      await chatCompletion({
        messages: [
          { role: "system", content: buildSystemPrompt(resumeContent) },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: messageText },
        ],
        onChunk: (chunk) => {
          full = chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
          );
        },
      });
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: `Error: ${e?.message || e}. Check your AI provider settings.` } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!resumeContent.trim() || isGenerating || isWebGPUBlocked) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: "Auto-generate a completely updated and polished version of my resume based on my background and current industry standards.",
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const aiId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: "assistant", content: "", timestamp: formatTime() },
    ]);

    try {
      let full = "";
      const autoPrompt = buildSystemPrompt(resumeContent) + "\n\nNow produce the COMPLETE updated resume in a polished, ATS-optimized format.";

      await chatCompletion({
        messages: [
          { role: "system", content: autoPrompt },
          { role: "user", content: "Generate the full updated resume with all sections." },
        ],
        onChunk: (chunk) => {
          full = chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
          );
        },
      });
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: `Error: ${e?.message || e}` } : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptLatestOutput = () => {
    const lastAi = [...messages].reverse().find((m) => m.role === "assistant" && typeof m.content === "string" && m.content.length > 100);
    if (lastAi && typeof lastAi.content === "string") {
      setResumeContent(lastAi.content);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const latestAiOutput = [...messages].reverse().find(
    (m) => m.role === "assistant" && typeof m.content === "string" && m.content.length > 100
  );

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
            <button
              onClick={acceptLatestOutput}
              disabled={!latestAiOutput}
              className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors disabled:opacity-30 cursor-pointer"
            >
              Apply AI Output to Editor
            </button>
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
