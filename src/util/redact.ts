const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{10,}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g,
  /\bANTHROPIC_API_KEY[=:]\s*\S+/gi,
  /\bOPENAI_API_KEY[=:]\s*\S+/gi,
];

/** Strip API keys / tokens from error messages before printing. */
export function redactSecrets(message: string): string {
  let out = message;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}
