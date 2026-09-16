export interface WhisperTranscribeOptions {
  apiKey?: string;
  model?: string;
  language?: string;
  prompt?: string;
  /** Absolute or relative path to an audio file (webm, wav, mp3, m4a, …). */
  filePath: string;
  fetchImpl?: typeof fetch;
}

export interface WhisperResult {
  text: string;
  model: string;
}

const DEFAULT_MODEL = "whisper-1";

/**
 * Transcribe an audio file with OpenAI Whisper.
 * Uses multipart upload to POST /v1/audio/transcriptions.
 */
export async function transcribeWithWhisper(
  options: WhisperTranscribeOptions,
): Promise<WhisperResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Set it in your environment or .env file.");
  }

  const model =
    options.model?.trim() ||
    process.env.VOICEWIRE_WHISPER_MODEL?.trim() ||
    DEFAULT_MODEL;

  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const bytes = await readFile(options.filePath);
  const filename = path.basename(options.filePath);

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)]), filename);
  form.append("model", model);
  if (options.language) form.append("language", options.language);
  if (options.prompt) form.append("prompt", options.prompt);

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Whisper request failed: ${msg}`);
  }

  const body = (await response.json()) as { text?: string; error?: { message?: string } };
  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    throw new Error(`Whisper API error (${response.status}): ${detail}`);
  }

  const text = body.text?.trim();
  if (!text) {
    throw new Error("Whisper returned an empty transcript.");
  }

  return { text, model };
}
