#!/usr/bin/env node
import { config as loadDotenv } from "dotenv";
import { Command } from "commander";
import path from "node:path";
import { runCapture } from "./commands/capture.js";
import { runTranscribe } from "./commands/transcribe.js";
import { runTranslate } from "./commands/translate.js";
import { runPipeline } from "./commands/run.js";
import { getPackageVersion } from "./version.js";
import { redactSecrets } from "./util/redact.js";

loadDotenv({ path: path.join(process.cwd(), ".env"), quiet: true });

const program = new Command();

program
  .name("voicewire")
  .description(
    "CLI for browser mic capture, Whisper speech-to-text, and Claude translation.",
  )
  .version(getPackageVersion());

program
  .command("capture")
  .description("Open a local browser page to record microphone audio")
  .option("--out-dir <path>", "Directory for recordings", "recordings")
  .option("--port <number>", "Local HTTP port", "8787")
  .option("--host <host>", "Bind host", "127.0.0.1")
  .option("--no-open", "Do not auto-open a browser tab")
  .action(async (opts: { outDir: string; port: string; host: string; open?: boolean }) => {
    const port = Number(opts.port);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error(`Invalid port: ${opts.port}`);
    }
    await runCapture({
      outDir: opts.outDir,
      port,
      host: opts.host,
      openBrowser: opts.open !== false,
      once: true,
    });
  });

program
  .command("transcribe")
  .description("Transcribe an audio file with OpenAI Whisper")
  .argument("<file>", "Path to audio file (webm, wav, mp3, m4a, …)")
  .option("--language <code>", "Hint language for Whisper (e.g. en, es)")
  .option("--model <id>", "Whisper model id (default: whisper-1)")
  .option("--prompt <text>", "Optional Whisper prompt")
  .option("--json", "Print JSON instead of plain text", false)
  .action(
    async (
      file: string,
      opts: { language?: string; model?: string; prompt?: string; json?: boolean },
    ) => {
      await runTranscribe(file, {
        ...(opts.language ? { language: opts.language } : {}),
        ...(opts.model ? { model: opts.model } : {}),
        ...(opts.prompt ? { prompt: opts.prompt } : {}),
        json: Boolean(opts.json),
      });
    },
  );

program
  .command("translate")
  .description("Translate text with Claude (argument or stdin)")
  .argument("[text]", "Text to translate (omit to read stdin)")
  .requiredOption("--to <lang>", "Target language (e.g. es, fr, en)")
  .option("--from <lang>", "Source language hint")
  .option("--model <id>", "Claude model id")
  .option("--json", "Print JSON instead of plain text", false)
  .action(
    async (
      text: string | undefined,
      opts: { to: string; from?: string; model?: string; json?: boolean },
    ) => {
      let input = text;
      if (!input || input === "-") {
        input = await readStdin();
      }
      await runTranslate(input, opts.to, {
        ...(opts.from ? { sourceLang: opts.from } : {}),
        ...(opts.model ? { model: opts.model } : {}),
        json: Boolean(opts.json),
      });
    },
  );

program
  .command("run")
  .description("Capture (or use --file) → Whisper → Claude in one pass")
  .requiredOption("--to <lang>", "Target language for Claude")
  .option("--from <lang>", "Source language hint")
  .option("--file <path>", "Skip capture and transcribe this audio file")
  .option("--out-dir <path>", "Directory for new recordings", "recordings")
  .option("--port <number>", "Capture server port", "8787")
  .option("--host <host>", "Capture bind host", "127.0.0.1")
  .option("--no-open", "Do not auto-open a browser tab")
  .option("--whisper-model <id>", "Whisper model override")
  .option("--claude-model <id>", "Claude model override")
  .option("--json", "Print final JSON result", false)
  .action(
    async (opts: {
      to: string;
      from?: string;
      file?: string;
      outDir: string;
      port: string;
      host: string;
      open?: boolean;
      whisperModel?: string;
      claudeModel?: string;
      json?: boolean;
    }) => {
      const port = Number(opts.port);
      if (!Number.isFinite(port) || port <= 0) {
        throw new Error(`Invalid port: ${opts.port}`);
      }
      await runPipeline({
        targetLang: opts.to,
        ...(opts.from ? { sourceLang: opts.from } : {}),
        ...(opts.file ? { audioFile: opts.file } : {}),
        outDir: opts.outDir,
        port,
        host: opts.host,
        openBrowser: opts.open !== false,
        ...(opts.whisperModel ? { whisperModel: opts.whisperModel } : {}),
        ...(opts.claudeModel ? { claudeModel: opts.claudeModel } : {}),
        json: Boolean(opts.json),
      });
    },
  );

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${redactSecrets(message)}`);
    process.exitCode = 1;
  }
}

void main();
