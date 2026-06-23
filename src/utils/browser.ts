export type BrowserName = "brave" | "chrome" | "edge" | "firefox" | "safari" | "opera" | "unknown";

export interface BrowserDetectionResult {
  name: BrowserName;
  label: string;
  webgpuFlagsUrl?: string;
}

function getUA(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

async function isBrave(): Promise<boolean> {
  try {
    const brave = (navigator as any).brave;
    if (brave && typeof brave.isBrave === "function") {
      return await brave.isBrave();
    }
  } catch {}
  return / braves/i.test(getUA()) || /brave browser/i.test(getUA());
}

export async function detectBrowser(): Promise<BrowserDetectionResult> {
  if (typeof window === "undefined") {
    return { name: "unknown", label: "Server (SSR)" };
  }

  const ua = getUA();

  const brave = await isBrave();
  if (brave) {
    return {
      name: "brave",
      label: "Brave",
      webgpuFlagsUrl: "brave://flags/#enable-unsafe-webgpu",
    };
  }

  if (/opr|opera/i.test(ua)) {
    return {
      name: "opera",
      label: "Opera",
      webgpuFlagsUrl: "opera://flags/#enable-unsafe-webgpu",
    };
  }

  if (/edg/i.test(ua)) {
    return {
      name: "edge",
      label: "Microsoft Edge",
      webgpuFlagsUrl: "edge://flags/#enable-unsafe-webgpu",
    };
  }

  if (/firefox|fxios/i.test(ua)) {
    return {
      name: "firefox",
      label: "Firefox",
      webgpuFlagsUrl: "about:config",
    };
  }

  if (/chrome|chromium|crios/i.test(ua)) {
    return {
      name: "chrome",
      label: "Google Chrome",
      webgpuFlagsUrl: "chrome://flags/#enable-unsafe-webgpu",
    };
  }

  if (/safari/i.test(ua)) {
    return {
      name: "safari",
      label: "Safari",
    };
  }

  return { name: "unknown", label: "Unknown Browser" };
}

export function getFlagsInstructions(browser: BrowserDetectionResult): {
  steps: string[];
  linuxNote?: string;
} | null {
  switch (browser.name) {
    case "brave":
      return {
        steps: [
          `Open a new tab and go to \`brave://flags\``,
          `Search for **"WebGPU"**`,
          `Set **"Unsafe WebGPU"** → **Enabled**`,
          `Click **Relaunch** at the bottom`,
        ],
        linuxNote:
          "On Linux, also enable the Vulkan flag: set **Vulkan** → **Enabled** before relaunching, or launch Brave from terminal with:\n`brave-browser --enable-unsafe-webgpu --enable-features=Vulkan`",
      };
    case "chrome":
      return {
        steps: [
          `Open a new tab and go to \`chrome://flags/#enable-unsafe-webgpu\``,
          `Set **"Unsafe WebGPU"** → **Enabled**`,
          `(Linux only) Also set **Vulkan** → **Enabled**`,
          `Click **Relaunch** at the bottom`,
        ],
      };
    case "edge":
      return {
        steps: [
          `Open a new tab and go to \`edge://flags/#enable-unsafe-webgpu\``,
          `Set **"Unsafe WebGPU"** → **Enabled**`,
          `Click **Relaunch** at the bottom`,
        ],
      };
    case "firefox":
      return {
        steps: [
          `Open a new tab and go to \`about:config\``,
          `Search for \`dom.webgpu.enabled\``,
          `Set it to **true**`,
          `Restart Firefox`,
        ],
      };
    case "safari":
      return {
        steps: [
          `Open **Safari Settings** → **Advanced**`,
          `Enable **"Show Develop menu in menu bar"**`,
          `Go to **Develop** → **Experimental Features**`,
          `Enable **"WebGPU"**`,
        ],
      };
    default:
      return null;
  }
}
