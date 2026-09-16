import path from "node:path";
import { runCapture } from "./capture.js";
import { runTranscribe } from "./transcribe.js";
import { runTranslate } from "./translate.js";

export interface RunPipelineOptions {
  targetLang: string;
  sourceLang?: string;
  outDir?: string;
  port?: number;
  host?: string;
  openBrowser?: boolean;
  audioFile?: string;
  whisperModel?: string;
  claudeModel?: string;
  json?: boolean;
}

export interface PipelineResult {
  audioFile: string;
  transcript: string;
  translation: string;
}

/**
 * Full CLI pipeline: browser capture (optional) → Whisper → Claude.
 */
export async function runPipeline(options: RunPipelineOptions): Promise<PipelineResult> {
  let audioFile = options.audioFile ? path.resolve(options.audioFile) : undefined;

  if (!audioFile) {
    audioFile = await runCapture({
      ...(options.outDir ? { outDir: options.outDir } : {}),
      ...(options.port !== undefined ? { port: options.port } : {}),
      ...(options.host ? { host: options.host } : {}),
      ...(options.openBrowser !== undefined ? { openBrowser: options.openBrowser } : {}),
      once: true,
    });
  }

  console.error("Transcribing with Whisper…");
  const transcript = await runTranscribe(audioFile, {
    ...(options.whisperModel ? { model: options.whisperModel } : {}),
    json: false,
  });

  console.error(`Translating to ${options.targetLang} with Claude…`);
  const translation = await runTranslate(transcript, options.targetLang, {
    ...(options.sourceLang ? { sourceLang: options.sourceLang } : {}),
    ...(options.claudeModel ? { model: options.claudeModel } : {}),
    json: false,
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          audioFile,
          transcript,
          translation,
          targetLang: options.targetLang,
        },
        null,
        2,
      ),
    );
  }

  return { audioFile, transcript, translation };
}
