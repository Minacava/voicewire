import path from "node:path";
import { transcribeWithWhisper } from "../stt/whisper.js";

export interface TranscribeCommandOptions {
  language?: string;
  model?: string;
  prompt?: string;
  json?: boolean;
}

export async function runTranscribe(
  file: string,
  options: TranscribeCommandOptions = {},
): Promise<string> {
  const filePath = path.resolve(file);
  const result = await transcribeWithWhisper({
    filePath,
    ...(options.language ? { language: options.language } : {}),
    ...(options.model ? { model: options.model } : {}),
    ...(options.prompt ? { prompt: options.prompt } : {}),
  });

  if (options.json) {
    console.log(JSON.stringify({ text: result.text, model: result.model, file: filePath }, null, 2));
  } else {
    console.log(result.text);
  }

  return result.text;
}
