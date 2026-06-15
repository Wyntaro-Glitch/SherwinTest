import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types";
import { aiService, AVAILABLE_MODELS, ModelOption } from "@/utils/aiService";

export default function ChatPanel() {
  const [model, setModel] = useState<string>("mock-assistant");
  const [statusText, setStatusText] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isEngineLoaded, setIsEngineLoaded] = useState(aiService.isEngineActive());
  const [isInitializing, setIsInitializing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your privacy-centric AI outreach assistant. How can I help you draft your outreach templates today?",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Load selected WebLLM model
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
          text: `Successfully loaded model: **${
            AVAILABLE_MODELS.find((m) => m.id === model)?.name || model
          }**. I am now running 100% locally in your browser.`,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: any) {
      console.error(e);
      setStatusText(`Error loading model: ${e?.message || e}. Using offline rule simulator.`);
      setIsEngineLoaded(true); // fallbacks active
    } finally {
      setIsInitializing(false);
    }
  };

  // Run chat request
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputValue;
    if (!messageText.trim()) return;

    if (!textToSend) setInputValue("");

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);

    // Create temporary AI message container
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      sender: "assistant",
      text: "",
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, aiMessage]);

    try {
      await aiService.getChatCompletion(updatedMessages, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: chunk } : msg))
        );
      });
    } catch (e: any) {
      console.error(e);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: `Sorry, I encountered an error during generation: ${e?.message || e}` }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick suggestions
  const suggestions = [
    "Draft a pitch for a Next.js Developer role",
    "List high-converting cold subject lines",
    "Help me write a follow-up email",
  ];

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden">
      
      {/* Model Selection Header */}
      <div className="p-4 border-b border-slate-900 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono font-bold text-slate-500 uppercase">
            Active Model:
          </label>
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setIsEngineLoaded(false); // require reloading when model option changes
            }}
            disabled={isInitializing}
            className="bg-slate-900 text-slate-355 border border-slate-850 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 max-w-xs truncate"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.size})
              </option>
            ))}
          </select>
        </div>

        {!isEngineLoaded && (
          <button
            onClick={handleLoadModel}
            disabled={isInitializing}
            className="py-1.5 px-4 bg-indigo-500 hover:bg-indigo-650 text-white disabled:opacity-40 rounded-xl font-bold text-xs tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isInitializing ? "Downloading..." : "Load Engine"}
          </button>
        )}
      </div>

      {/* Initialize Download progress indicator */}
      {isInitializing && (
        <div className="p-4 bg-slate-900/40 border-b border-slate-900 flex flex-col gap-2 shrink-0">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-400 font-semibold truncate max-w-md">{statusText}</span>
            <span className="text-indigo-400 font-bold">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <p className="text-[9px] text-slate-500 leading-normal font-mono">
            First load requires downloading weights (cached in browser storage). Downloading Llama/Qwen models uses significant bandwidth.
          </p>
        </div>
      )}

      {/* Messages Thread area */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div key={msg.id} className={`flex flex-col max-w-[80%] ${isUser ? "self-end items-end" : "self-start items-start"}`}>
              <span className="text-[9px] font-mono text-slate-600 mb-1">
                {isUser ? "You" : "SherwinMail Assistant"} &bull; {msg.timestamp}
              </span>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  isUser
                    ? "bg-indigo-500/10 text-slate-100 border border-indigo-500/20 rounded-tr-sm"
                    : "bg-slate-900/60 text-slate-200 border border-slate-850 rounded-tl-sm font-sans"
                }`}
              >
                {msg.text || (isGenerating && msg.id === messages[messages.length - 1].id ? (
                  <div className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                ) : (
                  "..."
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      {messages.length === 1 && (
        <div className="px-6 py-2 flex flex-wrap gap-2 shrink-0">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              disabled={isGenerating || !isEngineLoaded}
              className="px-3 py-1.5 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:border-slate-900 disabled:text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/80 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={
              isEngineLoaded
                ? "Send a message to the AI assistant..."
                : "Please load the AI engine first to chat..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isGenerating || !isEngineLoaded}
            className="w-full pl-4 pr-12 py-3 bg-slate-900/60 border border-slate-850 focus:border-indigo-500 rounded-2xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isGenerating || !isEngineLoaded || !inputValue.trim()}
            className="absolute right-2.5 p-2 bg-indigo-500 hover:bg-indigo-650 disabled:bg-slate-900 text-white disabled:text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}
