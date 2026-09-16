import { translateWithClaude } from "../translate/claude.js";

export interface TranslateCommandOptions {
  sourceLang?: string;
  model?: string;
  json?: boolean;
}

export async function runTranslate(
  text: string,
  targetLang: string,
  options: TranslateCommandOptions = {},
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Nothing to translate — pass text or pipe stdin.");
  }

  const result = await translateWithClaude({
    text: trimmed,
    targetLang,
    ...(options.sourceLang ? { sourceLang: options.sourceLang } : {}),
    ...(options.model ? { model: options.model } : {}),
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          translation: result.text,
          model: result.model,
          targetLang,
          sourceLang: options.sourceLang ?? null,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(result.text);
  }

  return result.text;
}
