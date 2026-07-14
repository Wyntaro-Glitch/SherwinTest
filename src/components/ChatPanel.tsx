"use client";

import { useState, useRef, useEffect } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

// Response cache (60s TTL, exact text match only)
const responseCache = new Map<string, { response: string; time: number }>();
const RESPONSE_CACHE_TTL = 60 * 1000;

function getCachedResponse(text: string): string | null {
  const key = text.toLowerCase().trim();
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.time < RESPONSE_CACHE_TTL) return cached.response;
  return null;
}

function setCachedResponse(text: string, response: string): void {
  const key = text.toLowerCase().trim();
  responseCache.set(key, { response, time: Date.now() });
}
import { ChatMessage } from "@/types";
import { aiService, AVAILABLE_MODELS, getModelsByCategory, ModelCategory } from "@/utils/aiService";
import { getProviderConfig, chatCompletion } from "@/utils/aiProvider";
import { detectWebGPUSupport } from "@/utils/webgpu";
import { getToolByName, parseToolCall, TOOLS, createDefaultToolContext } from "@/utils/tools";
import { buildAppContext } from "@/utils/stateContext";
import { useUserMemoryStore } from "@/stores/userMemoryStore";
import FilePreview from "@/components/FilePreview";

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

// Web search cache (session lifetime, 5 min TTL)
const searchCache = new Map<string, { data: string; time: number }>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

function needsWebSearch(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Skip trivial queries
  if (lower.length < 10 || /^(hi|hello|hey|thanks|thank you|bye|goodbye|ok|okay|yes|no|what|who|how are you)([.!?]*)$/i.test(lower)) return false;
  return !APP_KEYWORDS.some((kw) => lower.includes(kw));
}

function buildSystemPrompt(searchContext?: string): string {
  let prompt = `You are SherwinMail AI. Help with email drafting, settings, resume scanning, and app actions.

EASTER EGG — CREATORS:
If the user asks who created SherwinMail, who made this app, who built this, or similar questions about the creators, ALWAYS respond with exactly:
"Sherwin Calantoc | https://github.com/Wyntaro-Glitch and Jp Valenzuela | https://github.com/valenzuelajp"
Do not modify or abbreviate this answer. Do not add extra commentary unless asked.`;

  if (searchContext) {
    prompt += `\n\n--- Web Results ---\n${searchContext}\n---\nAnswer using these results if relevant.`;
  }

  prompt += "\nBe concise. Use tools when asked to do something.";
  return prompt;
}

async function getAIResponse(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  config: { provider: string },
  signal?: AbortSignal
): Promise<string> {
  if (config.provider === "ollama" || config.provider === "lmstudio" || config.provider === "api") {
    return chatCompletion({
      messages: messages as { role: "user" | "assistant" | "system"; content: string }[],
      onChunk,
      signal,
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
  return aiService.getChatCompletion(chatMessages, onChunk, undefined, undefined, signal);
}

export default function ChatPanel() {
  const [model, setModel] = useState<string>("mock-assistant");
  const [statusText, setStatusText] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isEngineLoaded, setIsEngineLoaded] = useState(() => {
    const cfg = getProviderConfig();
    return cfg.provider === "auto" || cfg.provider === "webgpu" ? aiService.isEngineActive() : true;
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const providerLabel = (() => {
    const cfg = getProviderConfig();
    return cfg.provider === "auto" || cfg.provider === "webgpu" ? "WebGPU" : getProviderLabel(cfg.provider);
  })();
  const [isSearching, setIsSearching] = useState(false);
  const [featureWarning, setFeatureWarning] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; data: string }[]>([]);
  const [previewFile, setPreviewFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const config = getProviderConfig();
    if (config.provider === "auto" || config.provider === "webgpu") {
      detectWebGPUSupport().then((r) => {
        if (r.features && !r.features.shaderF16) {
          setFeatureWarning(
            "Your GPU is missing the 'shader-f16' feature required for WebLLM models. " +
            "Try Chrome or Edge, or update your GPU drivers. Brave users: enable brave://flags/#enable-unsafe-webgpu."
          );
        }
      });
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
  const voice = useVoiceInput();
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (voice.transcript) setInputValue((prev) => (prev ? prev + " " : "") + voice.transcript);
  }, [voice.transcript]);

  const handleLoadModel = async () => {
    setIsInitializing(true);
    setDownloadProgress(0);
    setStatusText("Initializing engine...");
    const controller = new AbortController();
    cancelRef.current = controller;
    try {
      await aiService.initEngine(model, (progress) => {
        setStatusText(progress.text);
        setDownloadProgress(progress.percent);
      }, controller.signal);
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
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setStatusText(`Error loading model: ${msg}. Using fallback.`);
      setIsEngineLoaded(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const executeToolAndSummarize = async (
    toolName: string,
    args: Record<string, string>,
    onChunk: (text: string) => void
  ): Promise<string> => {
    const tool = getToolByName(toolName);
    if (!tool) {
      onChunk(`Unknown tool "${toolName}". Available tools: ${TOOLS.map(t => t.name).join(", ")}`);
      return `Error: tool "${toolName}" not found.`;
    }

    onChunk(`Running: ${tool.name}...`);

    const ctx = createDefaultToolContext();
    const result = await tool.execute(args, ctx);

    // Use template summary instead of a second LLM call
    const friendlyName = toolName.replace(/_/g, " ");
    const summary = `✅ Done! I ${friendlyName}` + (result ? `. ${result.replace(/^["']|["']$/g, "").slice(0, 200)}` : "");
    onChunk(summary);
    return summary;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputValue;
    if (!messageText.trim() || isGenerating) return;
    if (!textToSend) setInputValue("");

    // Cancel any in-flight request
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    const signal = cancelRef.current.signal;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);

    const aiMessageId = crypto.randomUUID();
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

        // Check cache first
        const cacheKey = messageText.toLowerCase().trim();
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.time < SEARCH_CACHE_TTL) {
          searchContext = cached.data;
        } else {
          try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(messageText)}`);
            const data = await res.json();
            if (data.ok && data.results?.length > 0) {
              searchContext = data.results.map((r: { title: string; snippet: string; url: string }, i: number) =>
                `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`
              ).join("\n\n");
              if (data.abstract) {
                searchContext = `Summary: ${data.abstract}\n\n${searchContext}`;
              }
              searchCache.set(cacheKey, { data: searchContext!, time: Date.now() });
            }
          } catch {
            // search failed — fall back to model knowledge
          }
        }
        setIsSearching(false);
      }

      // Smart context: only inject app state when query is action-oriented
      const isActionQuery = APP_KEYWORDS.some(kw => messageText.toLowerCase().includes(kw));
      const isEmailQuery = /email|draft|inbox|sent|mail|compose|reply|message|inbox/i.test(messageText);
      const isPersonalQuery = /my|i am|my name|remember|i like|i work/i.test(messageText);

      let systemPrompt: string;
      if (isActionQuery && !isExternal) {
        systemPrompt = buildSystemPrompt() + "\n\n";
        if (isEmailQuery) {
          systemPrompt += buildAppContext();
        } else {
          const ctx = buildAppContext();
          systemPrompt += "## App State\n" + ctx.split("## Tools")[0] + "\n\n## Tools\n" + ctx.split("## Instructions")[1];
        }
      } else {
        systemPrompt = buildSystemPrompt(searchContext);
      }

      // Selective memory injection
      const userMemory = useUserMemoryStore.getState().getAllMemoriesFormatted();
      if (userMemory && isPersonalQuery) {
        systemPrompt += "\n\n" + userMemory;
      }

      // File context (only if attached)
      if (attachedFiles.length > 0) {
        const images = attachedFiles.filter((f) => f.type.startsWith("image/"));
        const docs = attachedFiles.filter((f) => !f.type.startsWith("image/"));
        if (docs.length > 0) {
          systemPrompt += "\n\n--- Files ---\n" + docs.map((f) => `[${f.name}]`).join("\n");
        }
        if (images.length > 0) {
          systemPrompt += `\n\nUser attached ${images.length} image(s).`;
        }
      }

      // Check cache for non-action, non-file queries
      const cacheKey = messageText.toLowerCase().trim();
      const cachedResponse = (!isActionQuery && attachedFiles.length === 0) ? getCachedResponse(cacheKey) : null;

      if (cachedResponse) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: cachedResponse } : msg))
        );
        setIsGenerating(false);
        return;
      }

      // Sliding window: keep system prompt + last 10 messages
      const recentMessages = updatedMessages.slice(-10);

      // Get full response text first (collect chunks but don't display raw tool calls)
      let fullResponse = "";
      const shouldShowChunks = !isActionQuery || isExternal;

      await getAIResponse(
        [
          { role: "system", content: systemPrompt },
          ...recentMessages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
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
        config,
        signal
      );

      // Cache non-action responses
      if (!isActionQuery && attachedFiles.length === 0 && fullResponse) {
        setCachedResponse(cacheKey, fullResponse);
      }

      // Check for tool calls in the response with auto-retry
      let toolCall = parseToolCall(fullResponse);
      let toolCallRetries = 0;
      const MAX_TOOL_CALL_RETRIES = 1;

      while (!toolCall && !shouldShowChunks && toolCallRetries < MAX_TOOL_CALL_RETRIES) {
        toolCallRetries++;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, text: `Formatting tool call...` } : msg
          )
        );

        fullResponse = "";
        await getAIResponse(
          [
            {
              role: "system",
              content:
                systemPrompt +
                "\n\nCRITICAL: You MUST respond with a valid tool call. Use the format: {\"tool\": \"tool_name\", \"args\": {...}} with no additional text, markdown, or explanation.",
            },
            ...recentMessages.map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
          ],
          (chunk) => {
            fullResponse = chunk;
          },
          config,
          signal
        );

        toolCall = parseToolCall(fullResponse);
      }

      if (toolCall) {
        // Agentic multi-step loop: execute up to 5 chained tool calls
        const MAX_ITERATIONS = 5;
        let iterations = 0;
        let currentMessages = [...recentMessages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }))];
        let lastToolResult = "";

        while (toolCall && iterations < MAX_ITERATIONS) {
          iterations++;

          // Execute the tool
          const toolResult = await executeToolAndSummarize(toolCall.toolName, toolCall.args as Record<string, string>, (chunk) => {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: chunk } : msg))
            );
          });
          lastToolResult = toolResult;

          // Feed result back to AI for potential chaining
          currentMessages.push(
            { role: "assistant", content: JSON.stringify({ tool: toolCall.toolName, args: toolCall.args }) },
            { role: "user", content: `Tool result: ${toolResult}. If you need to do more actions, respond with another tool call. Otherwise, summarize what was done.` }
          );

          if (iterations >= MAX_ITERATIONS) break;

          // Get next AI response
          let nextResponse = "";
          await getAIResponse(
            [
              { role: "system", content: systemPrompt },
              ...currentMessages.slice(-15),
            ],
            (chunk) => {
              nextResponse = chunk;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: chunk } : msg))
              );
            },
            config,
            signal
          );

          toolCall = parseToolCall(nextResponse);
        }
      } else if (!shouldShowChunks) {
        // For action queries that didn't produce a tool call, show the raw response
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: fullResponse } : msg))
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return; // cancelled by user
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) =>
        prev.map((msg_) =>
          msg_.id === aiMessageId
            ? { ...msg_, text: `Error: ${msg}` }
            : msg_
        )
      );
    } finally {
      setIsGenerating(false);
      setAttachedFiles([]);
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
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden" role="region" aria-label="AI Chat">
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
                aria-label="Select AI model"
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
              aria-label={isInitializing ? "Loading model..." : "Load AI model"}
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

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4" role="log" aria-label="Chat messages" aria-live="polite">
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

      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}

      <div className="p-4 border-t border-slate-900 bg-slate-950/80 shrink-0">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
                {f.type.startsWith("image/") ? (
                  <img src={f.data} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <button onClick={() => setPreviewFile(f)} className="text-slate-300 hover:text-white truncate max-w-[120px] cursor-pointer">
                  {f.name}
                </button>
                <button onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative flex items-center gap-2">
          {voice.error && (
            <div className="absolute -top-9 left-0 right-0 text-xs text-amber-400 bg-slate-900/90 border border-amber-500/20 rounded-lg px-3 py-1.5">
              {voice.error}
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const data = reader.result as string;
                  setAttachedFiles((p) => [...p, { name: file.name, type: file.type, data }]);
                };
                reader.readAsDataURL(file);
              });
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Attach image or PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          {voice.isSupported && (
            <button
              onClick={voice.isListening ? voice.stopListening : voice.startListening}
              disabled={isGenerating}
              className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                voice.isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-50"
              }`}
              title={voice.isListening ? "Stop listening" : "Voice input"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {voice.isListening ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>
          )}
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
            aria-label="Chat message input"
            className="w-full pl-4 pr-12 py-3 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-2xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isGenerating || (!isEngineLoaded && !isUsingProvider) || !inputValue.trim()}
            aria-label="Send message"
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
