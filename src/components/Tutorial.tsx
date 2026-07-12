"use client";

import { useTutorialStore } from "@/stores/tutorialStore";

interface Step {
  title: string;
  body: string;
  highlight?: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    icon: "📬",
    title: "Welcome to SherwinMail",
    body: "A privacy-centric AI email assistant. Everything runs locally — your data never leaves your device.",
  },
  {
    icon: "🤖",
    title: "Choose Your AI Provider",
    body: "Go to Settings to pick an AI provider. WebGPU runs in your browser (no server needed). Ollama and LM Studio run on your machine. API Key connects to OpenAI-compatible endpoints.",
    highlight: "settings",
  },
  {
    icon: "✉️",
    title: "Compose & Manage Emails",
    body: "Click the chat icon and ask the AI to draft emails, search your inbox, or navigate folders. Try: \"Draft an email to alice@example.com about our meeting\"",
    highlight: "chat",
  },
  {
    icon: "🎤",
    title: "Voice Input",
    body: "Click the microphone button in the chat to dictate messages. Your speech is transcribed locally using the Web Speech API.",
  },
  {
    icon: "⚡",
    title: "NLP Commands",
    body: "Talk naturally — the AI understands commands like \"go to sent\", \"search emails for invoice\", \"star the last email\", even without perfect JSON formatting.",
  },
  {
    icon: "🔔",
    title: "SMTP Setup",
    body: "Configure SMTP in Settings to send real emails. Supports ProtonMail Bridge, Gmail, and any custom SMTP server. Passwords are encrypted with AES-256-GCM.",
    highlight: "settings",
  },
  {
    icon: "⚙️",
    title: "Automation Rules",
    body: "Create if-this-then-that rules via chat. Try: \"Create a rule: when subject contains 'urgent' → send notification\". Rules run automatically on incoming emails.",
  },
  {
    icon: "🚀",
    title: "You're All Set!",
    body: "Start chatting with the AI to explore all features. You can replay this tutorial anytime from Settings.",
  },
];

export default function Tutorial() {
  const { completed, currentStep, setStep, complete } = useTutorialStore();

  if (completed) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step counter */}
          <div className="text-xs text-slate-500 mb-4">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          {/* Icon */}
          <div className="text-4xl mb-4">{step.icon}</div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-3">{step.title}</h2>

          {/* Body */}
          <p className="text-slate-300 text-sm leading-relaxed mb-8">{step.body}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>

            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-indigo-500" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                onClick={complete}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={() => setStep(currentStep + 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <div className="px-8 pb-6">
          <button
            onClick={complete}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
