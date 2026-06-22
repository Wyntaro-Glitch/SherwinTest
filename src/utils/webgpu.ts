/**
 * WebGPU Hardware Detection Utility
 */

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
  error?: string;
}

export interface ModelTierSuggestion {
  tier: "Tiny" | "Small" | "Medium";
  modelId: string;
  modelName: string;
  description: string;
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
      modelName: "Qwen 2.5 (0.5B Instruct - Fast)",
      description: "Limited GPU memory — using smallest model for reliable performance.",
    };
  }

  if (maxBufGB < 4) {
    return {
      tier: "Small",
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      modelName: "Qwen 2.5 (1.5B Instruct - Balanced)",
      description: "Sufficient memory for balanced performance and quality.",
    };
  }

  return {
    tier: "Medium",
    modelId: "Llama-3-8B-Instruct-q4f16_1-MLC",
    modelName: "Llama 3 (8B Instruct - Heavy)",
    description: "Ample GPU memory — full-capability model recommended.",
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

    // Attempt to request device to verify full driver support
    try {
      const device = await adapter.requestDevice();
      if (device) {
        result.deviceCreated = true;
        device.destroy(); // Clean up immediately after detection
      }
    } catch (deviceError: any) {
      result.error = `Failed to create WebGPU device: ${deviceError?.message || deviceError}`;
    }
  } catch (adapterError: any) {
    result.error = `WebGPU adapter error: ${adapterError?.message || adapterError}`;
  }

  return result;
}
