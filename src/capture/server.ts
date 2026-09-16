import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export interface CaptureServerOptions {
  /** Directory where uploaded recordings are written. */
  outDir: string;
  /** Port to listen on (default 8787). */
  port?: number;
  host?: string;
  /** Called once when a recording is uploaded. */
  onRecording?: (filePath: string) => void | Promise<void>;
}

export interface CaptureServer {
  url: string;
  port: number;
  close: () => Promise<void>;
  /** Resolves with the saved file path when the browser uploads audio. */
  waitForRecording: () => Promise<string>;
}

function publicDir(): string {
  // In dist layout: dist/capture/server.js → dist/public
  // In src (tsx) layout we also copy public next to dist after build.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "public");
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function send(res: ServerResponse, status: number, body: string | Buffer, type: string): void {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

/**
 * Local HTTP server that serves a browser mic-capture page and accepts uploads.
 * Browsers can use getUserMedia on http://localhost; the CLI has no mic in remote VMs.
 */
export async function startCaptureServer(options: CaptureServerOptions): Promise<CaptureServer> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const outDir = path.resolve(options.outDir);
  await mkdir(outDir, { recursive: true });

  let resolveRecording: ((filePath: string) => void) | undefined;
  let rejectRecording: ((err: Error) => void) | undefined;
  const recordingPromise = new Promise<string>((resolve, reject) => {
    resolveRecording = resolve;
    rejectRecording = reject;
  });

  const assets = publicDir();

  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${host}:${port}`);

      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = await readFile(path.join(assets, "index.html"));
        send(res, 200, html, "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/app.js") {
        const js = await readFile(path.join(assets, "app.js"));
        send(res, 200, js, "text/javascript; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/health") {
        send(res, 200, JSON.stringify({ ok: true }), "application/json");
        return;
      }

      if (req.method === "POST" && url.pathname === "/upload") {
        const body = await readBody(req);
        if (body.length === 0) {
          send(res, 400, JSON.stringify({ error: "empty body" }), "application/json");
          return;
        }

        const extRaw = url.searchParams.get("ext") ?? "webm";
        const ext = extRaw.replace(/[^a-z0-9]/gi, "") || "webm";
        const filePath = path.join(outDir, `capture-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
        await writeFile(filePath, body);

        send(res, 200, JSON.stringify({ ok: true, path: filePath }), "application/json");

        if (options.onRecording) {
          await options.onRecording(filePath);
        }
        resolveRecording?.(filePath);
        return;
      }

      send(res, 404, "Not found", "text/plain; charset=utf-8");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send(res, 500, JSON.stringify({ error: message }), "application/json");
      rejectRecording?.(err instanceof Error ? err : new Error(message));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  const boundPort =
    typeof address === "object" && address !== null ? address.port : port;

  return {
    url: `http://${host}:${boundPort}/`,
    port: boundPort,
    waitForRecording: () => recordingPromise,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
