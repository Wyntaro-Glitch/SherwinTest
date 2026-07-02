"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types";
import { aiService, AVAILABLE_MODELS, getModelsByCategory, ModelCategory } from "@/utils/aiService";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";
import { detectWebGPUSupport } from "@/utils/webgpu";
import { getToolByName, parseToolCall, TOOLS } from "@/utils/tools";
import { buildAppContext } from "@/utils/stateContext";

function getProviderLabel(type: string): string {
  switch (type) {
    case "ollama": return "Ollama";
    case "lmstudio": return "LM Studio";
    case "api": return "API Key";
    case "webgpu": return "WebGPU";
    default: return "Mock";
  }
}

const APP_KEYWORDS = [
  "email", "draft", "inbox", "sent", "outreach", "pitch", "template",
  "sherwinmail", "sherwin", "settings", "provider", "model", "webgpu",
  "ollama", "lm studio", "theme", "appearance", "privacy", "resume",
  "cv", "scanner", "dashboard", "mail", "compose", "reply",
  "smtp", "account", "connection", "task", "scheduler",
];

function needsWebSearch(text: string): boolean {
  const lower = text.toLowerCase();
  return !APP_KEYWORDS.some((kw) => lower.includes(kw));
}

function buildSystemPrompt(searchContext?: string): string {
  let prompt = `You are the SherwinMail AI assistant — a privacy-focused, offline-first email outreach and resume optimization platform.

You can help users with:
- Drafting and optimizing cold outreach emails
- Resume/CV analysis and improvement (via the Resume Scanner)
- App settings: AI providers (Ollama, LM Studio, API Key, WebGPU), themes (Dark, Light, Cyberpunk, Sakura, Forest, Ocean), SMTP connections, system tasks
- General email productivity tips`;

  if (searchContext) {
    prompt += `\n\n--- Web Search Results ---\n${searchContext}\n---\n\nThe user's question is NOT about the app. Use the search results above to answer their question. If the search results don't contain enough information, use your own knowledge.`;
  } else {
    prompt += `\n\nThe user is asking about the app. Answer using your knowledge of SherwinMail's features and tools.`;
  }

  prompt += `\n\nBe concise, helpful, and accurate. If you're unsure about something, say so rather than making it up.`;
  return prompt;
}

async function getAIResponse(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  config: { provider: string }
): Promise<string> {
  if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
    return chatCompletion({
      messages: messages as { role: "user" | "assistant" | "system"; content: string }[],
      onChunk,
    });
  }
  const chatMessages: ChatMessage[] = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: m.role === "user" ? "user" : "assistant",
      text: m.content,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }));
  return aiService.getChatCompletion(chatMessages, onChunk);
}

export default function ChatPanel() {
  const [model, setModel] = useState<string>("mock-assistant");
  const [statusText, setStatusText] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isEngineLoaded, setIsEngineLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [providerLabel, setProviderLabel] = useState("Mock");
  const [isSearching, setIsSearching] = useState(false);
  const [featureWarning, setFeatureWarning] = useState("");

  useEffect(() => {
    const config = getProviderConfig();
    if (config.provider === "auto" || config.provider === "webgpu") {
      setIsEngineLoaded(aiService.isEngineActive());
      setProviderLabel("WebGPU");
      detectWebGPUSupport().then((r) => {
        if (r.features && !r.features.shaderF16) {
          setFeatureWarning(
            "Your GPU is missing the 'shader-f16' feature required for WebLLM models. " +
            "Try Chrome or Edge, or update your GPU drivers. Brave users: enable brave://flags/#enable-unsafe-webgpu."
          );
        }
      });
    } else {
      setProviderLabel(getProviderLabel(config.provider));
      setIsEngineLoaded(true);
    }
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hi! I'm the SherwinMail assistant. I can help with email drafts, settings, themes, resume scanning — and I can also take actions for you like creating drafts, navigating folders, searching emails, and more. Try asking me to do something!",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleLoadModel = async () => {
    setIsInitializing(true);
    setDownloadProgress(0);
    setStatusText("Initializing engine...");
    try {
      await aiService.initEngine(model, (progress) => {
        setStatusText(progress.text);
        setDownloadProgress(progress.percent);
      });
      setIsEngineLoaded(true);
      setStatusText("Model loaded successfully!");
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: "assistant",
          text: `Loaded **${(() => { const m = AVAILABLE_MODELS.find((m) => m.id === model); return m ? `${m.name} (${m.description})` : model; })()}**. Running 100% locally.`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: any) {
      console.error(e);
      setStatusText(`Error loading model: ${e?.message || e}. Using fallback.`);
      setIsEngineLoaded(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const executeToolAndSummarize = async (
    toolName: string,
    args: Record<string, any>,
    onChunk: (text: string) => void
  ): Promise<string> => {
    const tool = getToolByName(toolName);
    if (!tool) {
      onChunk(`Unknown tool "${toolName}". Available tools: ${TOOLS.map(t => t.name).join(", ")}`);
      return `Error: tool "${toolName}" not found.`;
    }

    // Show what's happening
    onChunk(`Running: ${tool.name}...`);

    const result = await tool.execute(args);

    // Get the AI to summarize
    const config = getProviderConfig();
    const summaryMessages = [
      { role: "system" as const, content: `You are a helpful assistant. A tool "${toolName}" was executed with these arguments: ${JSON.stringify(args)}.\n\nThe tool returned: ${result}\n\nSummarize what happened in a friendly, concise way for the user. Do not mention JSON or tool calls.` },
      { role: "user" as const, content: "What happened?" },
    ];

    let summary = "";
    if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
      await chatCompletion({
        messages: summaryMessages,
        onChunk: (chunk) => { summary = chunk; onChunk(chunk); },
      });
    } else {
      const mockMessages: ChatMessage[] = [
        { id: "sys-summary", sender: "assistant", text: "", timestamp: "" },
        { id: "user-summary", sender: "user", text: "What happened?", timestamp: "" },
      ];
      summary = await aiService.getChatCompletion(mockMessages, (chunk) => {
        onChunk(chunk);
      }, undefined, summaryMessages[0].content);
    }

    return summary || result;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputValue;
    if (!messageText.trim() || isGenerating) return;
    if (!textToSend) setInputValue("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);

    const aiMessageId = `ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        sender: "assistant",
        text: "",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    try {
      const config = getProviderConfig();
      const isExternal = needsWebSearch(messageText);
      let searchContext: string | undefined;

      if (isExternal) {
        setIsSearching(true);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, text: "Searching the web..." } : m
          )
        );

        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(messageText)}`);
          const data = await res.json();
          if (data.ok && data.results?.length > 0) {
            searchContext = data.results.map((r: any, i: number) =>
              `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`
            ).join("\n\n");
            if (data.abstract) {
              searchContext = `Summary: ${data.abstract}\n\n${searchContext}`;
            }
          }
        } catch {
          // search failed — fall back to model knowledge
        }
        setIsSearching(false);
      }

      // Build system prompt with app context + tools for action-oriented queries
      const isActionQuery = APP_KEYWORDS.some(kw => messageText.toLowerCase().includes(kw));
      let systemPrompt: string;
      if (isActionQuery && !isExternal) {
        systemPrompt = buildSystemPrompt() + "\n\n" + buildAppContext();
      } else {
        systemPrompt = buildSystemPrompt(searchContext);
      }

      // Get full response text first (collect chunks but don't display raw tool calls)
      let fullResponse = "";
      const shouldShowChunks = !isActionQuery || isExternal;

      await getAIResponse(
        [
          { role: "system", content: systemPrompt },
          ...updatedMessages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
        ],
        (chunk) => {
          fullResponse = chunk;
          // Only stream visible content for non-action queries
          if (shouldShowChunks) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: chunk } : msg))
            );
          }
        },
        config
      );

      // Check for tool calls in the response
      const toolCall = parseToolCall(fullResponse);

      if (toolCall) {
        // Execute the tool and stream the summary
        await executeToolAndSummarize(toolCall.toolName, toolCall.args, (chunk) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: chunk } : msg))
          );
        });
      } else if (!shouldShowChunks) {
        // For action queries that didn't produce a tool call, show the raw response
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: fullResponse } : msg))
        );
      }
    } catch (e: any) {
      console.error(e);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: `Error: ${e?.message || e}` }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestions = [
    "Create a draft to hiring@company.com about the React position",
    "How does the Resume Scanner work?",
    "What themes are available?",
    "What is 1+1?",
  ];

  const isUsingProvider = ["ollama", "lmstudio", "api"].includes(getProviderConfig().provider);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Provider:</span>
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
            {providerLabel}
          </span>
          {isUsingProvider && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block"></span>
              Connected
            </span>
          )}
          {isSearching && (
            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              Searching web...
            </span>
          )}
        </div>

        {!isUsingProvider && !isEngineLoaded && (
          <div className="flex items-center gap-2">
            <div className="relative group">
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); }}
                disabled={isInitializing}
                className="bg-slate-900 text-slate-300 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer min-w-[180px]"
              >
                <optgroup label="── Fast & Light ──">
                  {getModelsByCategory("text-fast").map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                  ))}
                </optgroup>
                <optgroup label="── Smart & Balanced ──">
                  {getModelsByCategory("text-smart").map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                  ))}
                </optgroup>
                <optgroup label="── Powerful Text ──">
                  {getModelsByCategory("text-powerful").map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                  ))}
                </optgroup>
                <optgroup label="── Vision (Reads Images) ──">
                  {getModelsByCategory("vision").map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                  ))}
                </optgroup>
                <optgroup label="── Fallback ──">
                  {getModelsByCategory("fallback").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="absolute top-full mt-1 right-0 w-64 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl hidden group-hover:block z-50">
                {(() => {
                  const m = AVAILABLE_MODELS.find(m => m.id === model);
                  if (!m) return null;
                  const categoryLabels: Record<ModelCategory, { label: string; color: string }> = {
                    "text-fast": { label: "Fast & Light", color: "text-sky-400" },
                    "text-smart": { label: "Smart & Balanced", color: "text-indigo-400" },
                    "text-powerful": { label: "Powerful", color: "text-violet-400" },
                    "vision": { label: "Vision", color: "text-emerald-400" },
                    "fallback": { label: "Fallback", color: "text-slate-500" },
                  };
                  const cat = categoryLabels[m.category];
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                        <span className="text-[10px] text-slate-600">{m.size}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-semibold">{m.name}</p>
                      <p className="text-[10px] text-slate-400">{m.description}</p>
                      <p className="text-[9px] text-slate-500">VRAM: {m.vramRequired} &middot; {m.recommendedFor}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
            <button
              onClick={handleLoadModel}
              disabled={isInitializing}
              className="py-1.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-40 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              {isInitializing ? "Loading..." : "Load Engine"}
            </button>
          </div>
        )}

        {featureWarning && (
          <div className="px-4 pb-3 shrink-0">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-[10px] text-amber-300 leading-relaxed">
              ⚠ {featureWarning}
            </div>
          </div>
        )}
      </div>

      {isInitializing && (
        <div className="p-4 bg-slate-900/40 border-b border-slate-900 flex flex-col gap-2 shrink-0">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-400 font-semibold truncate max-w-md">{statusText}</span>
            <span className="text-indigo-400 font-bold">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div key={msg.id} className={`flex flex-col max-w-[80%] ${isUser ? "self-end items-end" : "self-start items-start"}`}>
              <span className="text-[9px] font-mono text-slate-600 mb-1">
                {isUser ? "You" : "SherwinMail Assistant"} &bull; {msg.timestamp}
              </span>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                isUser
                  ? "bg-indigo-500/10 text-slate-100 border border-indigo-500/20 rounded-tr-sm"
                  : "bg-slate-900/60 text-slate-200 border border-slate-800 rounded-tl-sm"
              }`}>
                {msg.text || (isGenerating && msg.id === messages[messages.length - 1].id ? (
                  <div className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                ) : "...")}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-6 py-2 flex flex-wrap gap-2 shrink-0">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              disabled={isGenerating || !isEngineLoaded && !isUsingProvider}
              className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:border-slate-900 disabled:text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-slate-900 bg-slate-950/80 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={
              isEngineLoaded || isUsingProvider
                ? "Ask me to do something — create a draft, search emails, navigate..."
                : "Load WebGPU engine or configure a provider in Settings..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isGenerating || (!isEngineLoaded && !isUsingProvider)}
            className="w-full pl-4 pr-12 py-3 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-2xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isGenerating || (!isEngineLoaded && !isUsingProvider) || !inputValue.trim()}
            className="absolute right-2.5 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white disabled:text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
