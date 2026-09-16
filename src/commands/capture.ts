import path from "node:path";
import { startCaptureServer } from "../capture/server.js";

export interface CaptureCommandOptions {
  outDir?: string;
  port?: number;
  host?: string;
  openBrowser?: boolean;
  /** When true, exit after the first upload. */
  once?: boolean;
}

export async function runCapture(options: CaptureCommandOptions = {}): Promise<string> {
  const outDir = path.resolve(options.outDir ?? "recordings");
  const once = options.once !== false;

  const server = await startCaptureServer({
    outDir,
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.host !== undefined ? { host: options.host } : {}),
  });

  console.log(`Voicewire capture listening at ${server.url}`);
  console.log(`Recordings will be saved under ${outDir}`);
  console.log("Open the URL in a browser, record, then Stop & upload.");

  if (options.openBrowser !== false) {
    try {
      const open = (await import("open")).default;
      await open(server.url);
    } catch {
      // Browser open is best-effort (headless CI / remote VMs).
    }
  }

  try {
    const filePath = await server.waitForRecording();
    console.log(`Saved recording: ${filePath}`);
    return filePath;
  } finally {
    if (once) {
      await server.close();
    }
  }
}
