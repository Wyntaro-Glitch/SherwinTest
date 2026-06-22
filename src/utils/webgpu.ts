/**
 * WebGPU Hardware Detection Utility
 */

import { detectBrowser, BrowserDetectionResult } from "./browser";

export interface WebGPUDetectionResult {
  supported: boolean;
  adapterCreated: boolean;
  deviceCreated: boolean;
  gpuInfo?: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  };
  limits?: {
    maxBufferSize: number;
    maxStorageBufferBindingSize: number;
    maxComputeWorkgroupStorageSize: number;
    maxComputeInvocationsPerWorkgroup: number;
  };
  features?: {
    shaderF16: boolean;
    missingFeatures: string[];
  };
  browser?: BrowserDetectionResult;
  error?: string;
}

export interface ModelTierSuggestion {
  tier: "Tiny" | "Small" | "Medium" | "Large";
  modelId: string;
  modelName: string;
  description: string;
  visionModelId?: string;
  visionModelName?: string;
  visionDescription?: string;
}

export function suggestModelTier(limits?: WebGPUDetectionResult["limits"]): ModelTierSuggestion {
  if (!limits) {
    return {
      tier: "Tiny",
      modelId: "mock-assistant",
      modelName: "Offline Rule-based Assistant",
      description: "No GPU limits detected — fallback to rule-based mode.",
    };
  }

  const maxBufGB = limits.maxBufferSize / (1024 * 1024 * 1024);

  if (maxBufGB < 1) {
    return {
      tier: "Tiny",
      modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
      modelName: "Qwen 2.5 (0.5B)",
      description: "Limited GPU memory — using smallest model for reliable performance.",
    };
  }

  if (maxBufGB < 3) {
    return {
      tier: "Small",
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      modelName: "Qwen 2.5 (1.5B)",
      description: "Balanced speed and quality for drafting and chat.",
    };
  }

  if (maxBufGB < 5) {
    return {
      tier: "Medium",
      modelId: "Phi-3.5-mini-instruct-q4f16_1-MLC",
      modelName: "Phi-3.5 Mini (3.8B)",
      description: "High-quality text model with smart reasoning.",
      visionModelId: "Phi-3.5-vision-instruct-q4f16_1-MLC",
      visionModelName: "Phi-3.5 Vision (4.2B)",
      visionDescription: "Adds ability to read images (resumes, screenshots, JDs). Requires ~4 GB VRAM.",
    };
  }

  return {
    tier: "Large",
    modelId: "Phi-3.5-vision-instruct-q4f16_1-MLC",
    modelName: "Phi-3.5 Vision (4.2B)",
    description: "Best overall — reads images + smart text generation.",
    visionModelId: "Llama-3-8B-Instruct-q4f16_1-MLC-1k",
    visionModelName: "Llama 3 (8B)",
    visionDescription: "Maximum text quality if vision not needed (requires 6.5 GB VRAM).",
  };
}

export async function detectWebGPUSupport(): Promise<WebGPUDetectionResult> {
  const result: WebGPUDetectionResult = {
    supported: false,
    adapterCreated: false,
    deviceCreated: false,
  };

  if (typeof window === "undefined") {
    return { ...result, error: "WebGPU can only be detected in the browser." };
  }

  result.browser = await detectBrowser();

  if (!navigator.gpu) {
    return { ...result, error: "WebGPU is not supported or is disabled in your browser." };
  }

  result.supported = true;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        ...result,
        error: "WebGPU is supported by the browser, but failed to request a hardware adapter. Your GPU driver may not support WebGPU.",
      };
    }

    result.adapterCreated = true;

    // Retrieve GPU details
    let info: any = {};
    if ("info" in adapter) {
      info = (adapter as any).info;
    } else if (typeof (adapter as any).requestAdapterInfo === "function") {
      try {
        info = await (adapter as any).requestAdapterInfo();
      } catch (e) {
        console.warn("Failed to request adapter info:", e);
      }
    }

    result.gpuInfo = {
      vendor: info.vendor || "Unknown Vendor",
      architecture: info.architecture || "Unknown Architecture",
      device: info.device || "Unknown GPU",
      description: info.description || "No description available",
    };

    // Retrieve relevant GPU limits
    result.limits = {
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxComputeWorkgroupStorageSize: adapter.limits.maxComputeWorkgroupStorageSize,
      maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
    };

    // Check required features (shader-f16 is needed by WebLLM models)
    const adapterFeatures = adapter.features as Set<string>;
    const hasShaderF16 = adapterFeatures.has("shader-f16");
    const missingFeatures: string[] = [];
    if (!hasShaderF16) missingFeatures.push("shader-f16");

    result.features = {
      shaderF16: hasShaderF16,
      missingFeatures,
    };

    // Attempt to request device with required features to verify full driver support
    try {
      const device = await adapter.requestDevice({
        requiredFeatures: hasShaderF16 ? (["shader-f16"] as any) : [],
      });
      if (device) {
        result.deviceCreated = true;
        device.destroy();
      }
    } catch (deviceError: any) {
      result.error = `Failed to create WebGPU device: ${deviceError?.message || deviceError}`;
    }
  } catch (adapterError: any) {
    result.error = `WebGPU adapter error: ${adapterError?.message || adapterError}`;
  }

  return result;
}
