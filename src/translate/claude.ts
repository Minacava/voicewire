import { redactSecrets } from "../util/redact.js";

export interface ClaudeTranslateOptions {
  apiKey?: string;
  model?: string;
  text: string;
  sourceLang?: string;
  targetLang: string;
  fetchImpl?: typeof fetch;
}

export interface ClaudeTranslateResult {
  text: string;
  model: string;
}

const DEFAULT_MODEL = "claude-3-5-haiku-latest";

function buildSystemPrompt(sourceLang: string | undefined, targetLang: string): string {
  const from = sourceLang?.trim() || "auto-detected source language";
  return [
    "You are a precise translation engine.",
    `Translate the user message from ${from} into ${targetLang}.`,
    "Return only the translation — no quotes, labels, or commentary.",
    "Preserve meaning, tone, and proper nouns when appropriate.",
  ].join(" ");
}

/**
 * Translate text with Anthropic Claude Messages API.
 */
export async function translateWithClaude(
  options: ClaudeTranslateOptions,
): Promise<ClaudeTranslateResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY. Set it in your environment or .env file.");
  }

  const model =
    options.model?.trim() ||
    process.env.VOICEWIRE_CLAUDE_MODEL?.trim() ||
    DEFAULT_MODEL;

  const system = buildSystemPrompt(options.sourceLang, options.targetLang);
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: options.text }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Claude request failed: ${redactSecrets(msg)}`);
  }

  const body = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    throw new Error(`Claude API error (${response.status}): ${redactSecrets(detail)}`);
  }

  const textOut = body.content?.find((c) => c.type === "text")?.text?.trim();
  if (!textOut) {
    throw new Error("Claude returned an empty translation.");
  }

  return { text: textOut, model };
}
