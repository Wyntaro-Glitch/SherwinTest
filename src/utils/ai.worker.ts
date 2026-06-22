import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * AI Worker Entry Point
 * 
 * This worker handles all LLM inference to keep the main thread responsive.
 */

// Hook up the worker handler to the global scope
let handler: WebWorkerMLCEngineHandler;

try {
  handler = new WebWorkerMLCEngineHandler();
  
  self.onmessage = (msg: MessageEvent) => {
    handler.onmessage(msg);
  };
  
  console.log("[AI Worker] Initialized and listening for messages.");
} catch (error) {
  console.error("[AI Worker] Failed to initialize worker handler:", error);
}
